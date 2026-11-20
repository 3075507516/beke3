/* Cloudflare Pages/Workers payment adapters. Configure every credential as a secret binding.
 * No client-side return URL is treated as proof of payment. Callers must reconcile the returned
 * webhook amount/currency against their persisted order before fulfillment. Not production-tested.
 */
export type PaymentProvider = 'alipay' | 'wechat' | 'stripe' | 'paypal';
export type PaymentOrder = {
  id: string; amountMinor: number; currency: string; productName: string; quantity: number;
  providerOrderId?: string; providerPaymentId?: string;
};
export type PaymentEnv = Record<string, string | undefined>;
export type WebhookResult = {
  eventId: string; orderId: string;
  status: 'paid' | 'failed' | 'cancelled' | 'refunded' | 'refund_pending' | 'ignored';
  paymentId?: string; amountMinor?: number; currency?: string; raw?: any;
};
const enc = new TextEncoder();
const MAX_BODY = 1024 * 1024;
const timeoutMs = 15000;
function required(env: PaymentEnv, name: string): string {
  const v = env[name]?.trim(); if (!v) throw new Error(`Missing required payment configuration: ${name}`); return v;
}
function assertOrder(o: PaymentOrder): void {
  if (!o || !o.id || !Number.isSafeInteger(o.amountMinor) || o.amountMinor <= 0 || !o.currency || !o.productName || !Number.isSafeInteger(o.quantity) || o.quantity < 1) throw new Error('Invalid order: expected id, positive integer amountMinor/quantity, currency and productName');
}
function asBuffer(a: Uint8Array): ArrayBuffer { return a.slice().buffer as ArrayBuffer; }
function b64bytes(s: string): Uint8Array { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }
function b64(a: ArrayBuffer | Uint8Array): string { const u = a instanceof Uint8Array ? a : new Uint8Array(a); let s=''; for (const x of u) s += String.fromCharCode(x); return btoa(s); }
function pemBytes(pem: string): Uint8Array { const clean = pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, ''); return b64bytes(clean); }
async function importPrivate(pem: string, alg: 'RSASSA-PKCS1-v1_5'|'RSA-PSS' = 'RSASSA-PKCS1-v1_5'): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', asBuffer(pemBytes(pem)), { name: alg, hash: 'SHA-256' }, false, ['sign']);
}
async function importPublic(pem: string): Promise<CryptoKey> {
  const der=pemBytes(pem);
  try { return await crypto.subtle.importKey('spki', asBuffer(der), {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']); }
  catch { // X.509 certificate: extract SubjectPublicKeyInfo DER (bounded basic DER traversal).
    const cert=der; let i=0; if(cert[i++]!==0x30) throw new Error('Unsupported platform certificate/key format');
    const len=readDerLen(cert,i); i+=len.bytes; if(cert[i++]!==0x30) throw new Error('Unsupported platform certificate/key format');
    const tbsLen=readDerLen(cert,i); i+=tbsLen.bytes; const end=i+tbsLen.value; if(cert[i]===0xa0){const x=readDerLen(cert,i+1);i+=1+x.bytes+x.value;}
    i+=3; // serial, signature and issuer are traversed below by generic TLV
    let pos=i; for(let n=0;n<3;n++){const x=readDerLen(cert,pos+1);pos+=1+x.bytes+x.value;}
    const validity=readDerLen(cert,pos+1);pos+=1+validity.bytes+validity.value;
    const subject=readDerLen(cert,pos+1);pos+=1+subject.bytes+subject.value;
    if(cert[pos]!==0x30 || pos>=end) throw new Error('Unsupported platform certificate/key format');
    const spkiStart=pos, spkiLen=readDerLen(cert,pos+1); const spkiEnd=pos+1+spkiLen.bytes+spkiLen.value;
    return crypto.subtle.importKey('spki', asBuffer(cert.slice(spkiStart,spkiEnd)), {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false,['verify']);
  }
}
function readDerLen(a: Uint8Array, p: number): {value:number;bytes:number} { const n=a[p]; if(n<128)return {value:n,bytes:1}; const k=n&127;if(k<1||k>4)throw new Error('Unsupported DER length');let v=0;for(let j=0;j<k;j++)v=v*256+a[p+1+j];return {value:v,bytes:k+1}; }
async function rsaSign(message: string, key: CryptoKey): Promise<string> { return b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(message))); }
async function rsaVerify(message:string, signature:string, key:CryptoKey):Promise<boolean>{try{return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,asBuffer(b64bytes(signature)),enc.encode(message));}catch{return false;}}
async function hmac(keyBytes: Uint8Array, data: string): Promise<string> { const key=await crypto.subtle.importKey('raw',asBuffer(keyBytes),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(data))); }
async function hmacHex(keyBytes: Uint8Array, data: string): Promise<string> { const key=await crypto.subtle.importKey('raw',asBuffer(keyBytes),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(data))),b=>b.toString(16).padStart(2,'0')).join(''); }
function equal(a:string,b:string):boolean { if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0; }
async function request(url:string, init:RequestInit):Promise<Response>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetch(url,{...init,signal:controller.signal});}catch(e){if((e as any)?.name==='AbortError')throw new Error('Payment provider request timed out');throw new Error('Payment provider request failed');}finally{clearTimeout(timer);}}
async function responseJson(r:Response, provider:string):Promise<any>{const text=await r.text();if(text.length>MAX_BODY)throw new Error(`${provider} response too large`);let obj:any;try{obj=JSON.parse(text);}catch{throw new Error(`${provider} returned an invalid response`);}if(!r.ok)throw new Error(`${provider} request failed (${r.status}): ${safeMessage(obj)}`);return obj;}
function safeMessage(o:any):string {const s=String(o?.error?.message||o?.message||o?.details?.[0]?.description||o?.msg||'provider error').replace(/[\r\n]/g,' ').slice(0,180);return s;}
async function readBody(request:Request,rawBody?:string):Promise<string>{if(rawBody!==undefined){if(rawBody.length>MAX_BODY)throw new Error('Webhook body exceeds size limit');return rawBody;}const n=Number(request.headers.get('content-length')||0);if(n>MAX_BODY)throw new Error('Webhook body exceeds size limit');const t=await request.text();if(t.length>MAX_BODY)throw new Error('Webhook body exceeds size limit');return t;}
function minorToDecimal(minor:number,currency:string):string {const digits=['JPY','KRW','VND'].includes(currency.toUpperCase())?0:3; // provider amounts use currency exponent below
  const exp=currencyExponent(currency);return (minor/10**exp).toFixed(exp);}
function currencyExponent(c:string):number {return ['JPY','KRW','VND'].includes(c.toUpperCase())?0:['BHD','KWD','OMR','JOD','TND'].includes(c.toUpperCase())?3:2;}
function decimalToMinor(s:string,currency:string):number {if(!/^\d+(?:\.\d+)?$/.test(s))throw new Error('Invalid provider amount');const exp=currencyExponent(currency), parts=s.split('.');if((parts[1]?.length||0)>exp)throw new Error('Provider amount has excess precision');const n=Number(s)*10**exp;if(!Number.isSafeInteger(Math.round(n))||Math.abs(n-Math.round(n))>1e-7)throw new Error('Invalid provider amount');return Math.round(n);}
function safeOrigin(origin:string):URL {try{const u=new URL(origin);if(u.protocol!=='https:'&&u.hostname!=='localhost')throw new Error();return u;}catch{throw new Error('A valid HTTPS origin is required');}}

export async function createPayment(provider:PaymentProvider, order:PaymentOrder, env:PaymentEnv, origin:string):Promise<{redirectUrl?:string;qrCode?:string;providerOrderId?:string}>{
  assertOrder(order);const base=safeOrigin(origin);
  if(provider==='stripe'){
    const secret=required(env,'STRIPE_SECRET_KEY');const currency=(env.STRIPE_CURRENCY||order.currency).toLowerCase();
    if(order.currency.toUpperCase()!=='CNY'&&currency.toUpperCase()==='CNY')throw new Error('Stripe CNY conversion must be performed explicitly before createPayment');
    if(currency.toUpperCase()!==order.currency.toUpperCase())throw new Error('Stripe currency must match the server order currency; convert the persisted order before calling');
    const form=new URLSearchParams();form.set('mode','payment');form.set('success_url',new URL(`/?paymentOrder=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`,base).toString());form.set('cancel_url',new URL(`/?paymentCancel=${encodeURIComponent(order.id)}`,base).toString());form.set('metadata[order_id]',order.id);form.set('client_reference_id',order.id);form.set('line_items[0][quantity]',String(order.quantity));form.set('line_items[0][price_data][currency]',currency);form.set('line_items[0][price_data][unit_amount]',String(order.amountMinor));form.set('line_items[0][price_data][product_data][name]',order.productName);
    const r=await request('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});const j=await responseJson(r,'Stripe');if(!j.url||!j.id)throw new Error('Stripe response missing checkout URL');return {redirectUrl:j.url,providerOrderId:j.id};
  }
  if(provider==='paypal'){
    const token=await paypalToken(env),api=paypalBase(env),currency=order.currency.toUpperCase();const j=await responseJson(await request(`${api}/v2/checkout/orders`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','PayPal-Request-Id':order.id},body:JSON.stringify({intent:'CAPTURE',purchase_units:[{reference_id:order.id,invoice_id:order.id,custom_id:order.id,description:order.productName,amount:{currency_code:currency,value:minorToDecimal(order.amountMinor,currency)}}],application_context:{return_url:new URL(`/?paymentOrder=${encodeURIComponent(order.id)}`,base).toString(),cancel_url:new URL(`/?paymentCancel=${encodeURIComponent(order.id)}`,base).toString()}})}),'PayPal');const approve=j.links?.find((x:any)=>x.rel==='approve'||x.rel==='payer-action')?.href;if(!j.id||!approve)throw new Error('PayPal response missing approval URL');return {redirectUrl:approve,providerOrderId:j.id};
  }
  if(provider==='alipay'){
    const appId=required(env,'ALIPAY_APP_ID'),privateKey=await importPrivate(required(env,'ALIPAY_PRIVATE_KEY'));const params:Record<string,string>={app_id:appId,method:'alipay.trade.precreate',format:'JSON',charset:'utf-8',sign_type:'RSA2',timestamp:new Date().toISOString().replace('T',' ').slice(0,19),version:'1.0',biz_content:JSON.stringify({out_trade_no:order.id,total_amount:minorToDecimal(order.amountMinor,order.currency),subject:order.productName,product_code:'FACE_TO_FACE_PAYMENT'})};if(env.ALIPAY_PID)params.p_pid=env.ALIPAY_PID;params.sign=await rsaSign(Object.keys(params).sort().filter(k=>params[k]!==''&&params[k]!=null).map(k=>`${k}=${params[k]}`).join('&'),privateKey);const form=new URLSearchParams(params);const gateway=env.ALIPAY_GATEWAY||'https://openapi.alipay.com/gateway.do';if(!gateway.startsWith('https://'))throw new Error('Alipay gateway must use HTTPS');const j=await responseJson(await request(gateway,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=utf-8'},body:form}),'Alipay');const data=j.alipay_trade_precreate_response;if(data?.code!=='10000'||!data.qr_code)throw new Error(`Alipay precreate failed: ${safeMessage(data)}`);return {qrCode:data.qr_code,providerOrderId:order.id};
  }
  if(provider==='wechat'){
    const notify=required(env,'WECHAT_NOTIFY_URL');if(!notify.startsWith('https://'))throw new Error('WECHAT_NOTIFY_URL must be public HTTPS');const mch=required(env,'WECHAT_MCHID'),appid=required(env,'WECHAT_APPID'),serial=required(env,'WECHAT_SERIAL_NO'),key=await importPrivate(required(env,'WECHAT_PRIVATE_KEY'));const body=JSON.stringify({appid,mchid:mch,description:order.productName,out_trade_no:order.id,notify_url:notify,amount:{total:order.amountMinor,currency:order.currency.toUpperCase()}});const path='/v3/pay/transactions/native',ts=String(Math.floor(Date.now()/1000)),nonce=crypto.randomUUID().replace(/-/g,'');const signature=await rsaSign(`POST\n${path}\n${ts}\n${nonce}\n${body}\n`,key);const auth=`WECHATPAY2-SHA256-RSA2048 mchid="${mch}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${serial}",signature="${signature}"`;const j=await responseJson(await request(`https://api.mch.weixin.qq.com${path}`,{method:'POST',headers:{Authorization:auth,'Accept':'application/json','Content-Type':'application/json'},body}),'WeChat Pay');if(!j.code_url)throw new Error('WeChat Pay response missing QR code URL');return {qrCode:j.code_url,providerOrderId:order.id};
  }
  throw new Error(`Unsupported payment provider: ${provider}`);
}
function paypalBase(env:PaymentEnv):string {const b=env.PAYPAL_API_BASE||'https://api-m.sandbox.paypal.com';if(!b.startsWith('https://'))throw new Error('PayPal API base must use HTTPS');return b.replace(/\/$/,'');}
async function paypalToken(env:PaymentEnv):Promise<string>{const id=required(env,'PAYPAL_CLIENT_ID'),secret=required(env,'PAYPAL_CLIENT_SECRET');const auth=btoa(`${id}:${secret}`);const j=await responseJson(await request(`${paypalBase(env)}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'}),'PayPal');if(!j.access_token)throw new Error('PayPal authentication failed');return j.access_token;}

export async function capturePayPalOrder(paypalOrderId:string,env:PaymentEnv):Promise<{status:'COMPLETED'|'PENDING'|'DECLINED'|string,paymentId?:string,amountMinor?:number,currency?:string}>{
  if(!paypalOrderId)throw new Error('PayPal order ID is required');
  try{
    const token=await paypalToken(env),api=paypalBase(env);
    const r=await request(`${api}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','PayPal-Request-Id':`capture-${paypalOrderId}`},body:'{}'});
    if(r.status!==200&&r.status!==201)throw new Error('PayPal capture request failed');
    const j=await responseJson(r,'PayPal'),capture=j.purchase_units?.[0]?.payments?.captures?.[0];
    if(!capture||typeof capture.status!=='string')throw new Error('PayPal capture response is incomplete');
    const amount=capture.amount;
    return {status:capture.status,paymentId:typeof capture.id==='string'?capture.id:undefined,amountMinor:amount?.value!=null&&amount?.currency_code?decimalToMinor(String(amount.value),String(amount.currency_code)):undefined,currency:typeof amount?.currency_code==='string'?amount.currency_code:undefined};
  }catch{
    throw new Error('PayPal capture request failed');
  }
}

export async function verifyPaymentWebhook(provider:PaymentProvider, req:Request, rawBody:string|undefined, env:PaymentEnv):Promise<WebhookResult>{
  const body=await readBody(req,rawBody);
  if(provider==='stripe'){
    const secret=required(env,'STRIPE_WEBHOOK_SECRET'),header=req.headers.get('Stripe-Signature')||'';let t='',sigs:string[]=[];for(const part of header.split(',')){const [k,v]=part.split('=',2);if(k==='t')t=v||'';if(k==='v1'&&v)sigs.push(v);}if(!/^\d+$/.test(t)||!sigs.length||Math.abs(Date.now()/1000-Number(t))>300)throw new Error('Invalid or expired Stripe webhook signature');const expected=await hmacHex(enc.encode(secret),`${t}.${body}`);if(!sigs.some(s=>/^[0-9a-f]{64}$/.test(s)&&equal(s,expected)))throw new Error('Invalid Stripe webhook signature');let e:any;try{e=JSON.parse(body);}catch{throw new Error('Invalid Stripe webhook JSON');}const o=e.data?.object||{},type=e.type||'';let status:WebhookResult['status']='ignored';if(type==='checkout.session.completed'&&o.payment_status==='paid'||type==='checkout.session.async_payment_succeeded')status='paid';else if(type==='checkout.session.async_payment_failed')status='failed';else if(type==='checkout.session.expired')status='cancelled';else if(type==='charge.refunded')status=o.refunded?'refunded':'refund_pending';else if(type==='refund.updated'||type==='refund.created')status=o.status==='succeeded'?'refunded':o.status==='failed'?'failed':'refund_pending';const pi=typeof o.payment_intent==='string'?o.payment_intent:o.payment_intent?.id;const charge=type.startsWith('charge.')?o.id:undefined;return {eventId:String(e.id||''),orderId:String(o.metadata?.order_id||o.client_reference_id||o.metadata?.orderId||''),status,paymentId:pi||charge,amountMinor:typeof o.amount_total==='number'?o.amount_total:typeof o.amount==='number'?o.amount:undefined,currency:o.currency?.toUpperCase(),raw:e};
  }
  if(provider==='paypal'){
    let e:any;try{e=JSON.parse(body);}catch{throw new Error('Invalid PayPal webhook JSON');}const token=await paypalToken(env),headers=req.headers;const transmission={auth_algo:headers.get('paypal-auth-algo'),cert_url:headers.get('paypal-cert-url'),transmission_id:headers.get('paypal-transmission-id'),transmission_sig:headers.get('paypal-transmission-sig'),transmission_time:headers.get('paypal-transmission-time'),webhook_id:required(env,'PAYPAL_WEBHOOK_ID'),webhook_event:e};if(Object.values(transmission).some(v=>!v))throw new Error('Missing PayPal webhook signature headers');const vr=await responseJson(await request(`${paypalBase(env)}/v1/notifications/verify-webhook-signature`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(transmission)}),'PayPal');if(vr.verification_status!=='SUCCESS')throw new Error('Invalid PayPal webhook signature');const type=e.event_type||'',r=e.resource||{},related=r.supplementary_data?.related_ids||{},unit=r.purchase_units?.[0]||r.purchase_units?.[0];let status:WebhookResult['status']='ignored';if(type==='CHECKOUT.ORDER.APPROVED')status='ignored';if(type==='PAYMENT.CAPTURE.COMPLETED'&&r.status==='COMPLETED')status='paid';else if(type==='PAYMENT.CAPTURE.DENIED')status='failed';else if(type==='CHECKOUT.ORDER.VOIDED')status='cancelled';else if(type==='PAYMENT.CAPTURE.REFUNDED')status='refunded';else if(type==='PAYMENT.CAPTURE.PENDING')status='ignored';const amt=r.amount||r.seller_receivable_breakdown?.gross_amount;return {eventId:String(e.id||''),orderId:String(r.invoice_id||r.custom_id||unit?.invoice_id||unit?.custom_id||related.order_id||related.capture_id||''),status,paymentId:String(r.id||related.capture_id||''),amountMinor:amt?.value?decimalToMinor(String(amt.value),String(amt.currency_code||'USD')):undefined,currency:amt?.currency_code,raw:e};
  }
  if(provider==='alipay'){
    if(!req.headers.get('content-type')?.toLowerCase().includes('application/x-www-form-urlencoded'))throw new Error('Alipay webhook must be form-urlencoded');const p=new URLSearchParams(body),obj:Record<string,string>={};for(const [k,v] of p)obj[k]=v;const sign=obj.sign,signType=obj.sign_type;if(!sign||signType!=='RSA2')throw new Error('Missing Alipay RSA2 signature');delete obj.sign;delete obj.sign_type;const canonical=Object.keys(obj).sort().filter(k=>obj[k]!==''&&obj[k]!=null).map(k=>`${k}=${obj[k]}`).join('&');if(!await rsaVerify(canonical,sign,await importPublic(required(env,'ALIPAY_PUBLIC_KEY'))))throw new Error('Invalid Alipay webhook signature');if(obj.app_id!==required(env,'ALIPAY_APP_ID'))throw new Error('Alipay app_id mismatch');const st=obj.trade_status;const status:WebhookResult['status']=st==='TRADE_SUCCESS'||st==='TRADE_FINISHED'?'paid':st==='TRADE_CLOSED'?'cancelled':'ignored';return {eventId:`${obj.trade_no||''}:${obj.out_trade_no||''}:${st||''}`,orderId:obj.out_trade_no||'',status,paymentId:obj.trade_no,amountMinor:obj.total_amount?decimalToMinor(obj.total_amount,obj.currency||'CNY'):undefined,currency:(obj.currency||'CNY').toUpperCase(),raw:obj};
  }
  if(provider==='wechat'){
    const ts=req.headers.get('Wechatpay-Timestamp')||'',nonce=req.headers.get('Wechatpay-Nonce')||'',sig=req.headers.get('Wechatpay-Signature')||'';if(!/^\d+$/.test(ts)||Math.abs(Date.now()/1000-Number(ts))>300)throw new Error('Invalid or expired WeChat Pay timestamp');const canonical=`${ts}\n${nonce}\n${body}\n`;if(!await rsaVerify(canonical,sig,await importPublic(required(env,'WECHAT_PLATFORM_CERT'))))throw new Error('Invalid WeChat Pay webhook signature');let e:any;try{e=JSON.parse(body);}catch{throw new Error('Invalid WeChat Pay webhook JSON');}if(!e.resource||e.resource.algorithm!=='AEAD_AES_256_GCM')throw new Error('Unsupported WeChat Pay resource algorithm');const rawKey=enc.encode(required(env,'WECHAT_API_V3_KEY'));if(rawKey.length!==32)throw new Error('WECHAT_API_V3_KEY must be exactly 32 bytes');const k=await crypto.subtle.importKey('raw',asBuffer(rawKey),'AES-GCM',false,['decrypt']);const cipher=b64bytes(e.resource.ciphertext);let plain:string;try{plain=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:asBuffer(enc.encode(e.resource.nonce)),additionalData:asBuffer(enc.encode(e.resource.associated_data||''))},k,asBuffer(cipher)));}catch{throw new Error('WeChat Pay resource decryption failed');}const r=JSON.parse(plain);const eventType=String(e.event_type||''),st=String(r.trade_state||r.refund_status||r.status||'');let status:WebhookResult['status']='ignored';if(eventType==='PAYMENT.SUCCESS'&&st==='SUCCESS'||!eventType&&st==='SUCCESS')status='paid';else if(eventType==='REFUND.SUCCESS'&&st==='SUCCESS')status='refunded';else if(eventType==='REFUND.ABNORMAL')status='refund_pending';else if(eventType==='REFUND.CLOSED')status='failed';else if(eventType==='PAYMENT.CLOSED'||eventType==='PAYMENT.REVOKED'||!eventType&&(st==='CLOSED'||st==='REVOKED'))status='cancelled';else if(eventType==='PAYMENT.PAYERROR'||!eventType&&st==='PAYERROR')status='failed';const refund=eventType.startsWith('REFUND.');const orderId=String(r.out_trade_no||'');return {eventId:String(e.id||`${eventType}:${r.refund_id||r.transaction_id||''}:${orderId}:${st}`),orderId,status,paymentId:refund?r.refund_id:r.transaction_id,amountMinor:refund?(typeof r.amount?.refund==='number'?r.amount.refund:undefined):(typeof r.amount?.total==='number'?r.amount.total:undefined),currency:r.amount?.currency,raw:{event:e,resource:r}};
  }
  throw new Error(`Unsupported payment provider: ${provider}`);
}

export async function refundPayment(provider:PaymentProvider,order:PaymentOrder,reason:string,env:PaymentEnv):Promise<{status:'refunded'|'refund_pending';refundId?:string}>{
  assertOrder(order);const why=(reason||'Customer requested refund').slice(0,200);
  if(provider==='stripe'){
    const secret=required(env,'STRIPE_SECRET_KEY'),id=order.providerPaymentId;if(!id)throw new Error('Stripe refund requires providerPaymentId (PaymentIntent or Charge)');const f=new URLSearchParams({reason:'requested_by_customer'});if(id.startsWith('ch_'))f.set('charge',id);else f.set('payment_intent',id);f.set('metadata[order_id]',order.id);const j=await responseJson(await request('https://api.stripe.com/v1/refunds',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':`refund-${order.id}`},body:f}),'Stripe');return {status:j.status==='succeeded'?'refunded':'refund_pending',refundId:j.id};
  }
  if(provider==='paypal'){
    const capture=order.providerPaymentId;if(!capture)throw new Error('PayPal refund requires capture ID in providerPaymentId');const token=await paypalToken(env),j=await responseJson(await request(`${paypalBase(env)}/v2/payments/captures/${encodeURIComponent(capture)}/refund`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','PayPal-Request-Id':`refund-${order.id}`},body:JSON.stringify({note_to_payer:why})}),'PayPal');return {status:j.status==='COMPLETED'?'refunded':'refund_pending',refundId:j.id};
  }
  if(provider==='alipay'){
    const params:Record<string,string>={app_id:required(env,'ALIPAY_APP_ID'),method:'alipay.trade.refund',format:'JSON',charset:'utf-8',sign_type:'RSA2',timestamp:new Date().toISOString().replace('T',' ').slice(0,19),version:'1.0',biz_content:JSON.stringify({out_trade_no:order.id,refund_amount:minorToDecimal(order.amountMinor,order.currency),refund_reason:why,out_request_no:`refund-${order.id}`})};params.sign=await rsaSign(Object.keys(params).sort().filter(k=>params[k]!==''&&params[k]!=null).map(k=>`${k}=${params[k]}`).join('&'),await importPrivate(required(env,'ALIPAY_PRIVATE_KEY')));const gateway=env.ALIPAY_GATEWAY||'https://openapi.alipay.com/gateway.do';if(!gateway.startsWith('https://'))throw new Error('Alipay gateway must use HTTPS');const j=await responseJson(await request(gateway,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=utf-8'},body:new URLSearchParams(params)}),'Alipay');const r=j.alipay_trade_refund_response;if(r?.code==='10000'&&r.fund_change==='Y')return {status:'refunded',refundId:r.trade_no||r.out_request_no};if(r?.code==='10000'&&r.fund_change==='N')return {status:'refund_pending',refundId:r.trade_no||r.out_request_no};throw new Error(`Alipay refund failed: ${safeMessage(r)}`);
  }
  if(provider==='wechat'){
    const notify=required(env,'WECHAT_NOTIFY_URL');if(!notify.startsWith('https://'))throw new Error('WECHAT_NOTIFY_URL must be public HTTPS');const mch=required(env,'WECHAT_MCHID'),serial=required(env,'WECHAT_SERIAL_NO'),key=await importPrivate(required(env,'WECHAT_PRIVATE_KEY'));const transactionId=order.providerPaymentId, merchantOrderId=order.id;const body=JSON.stringify({transaction_id:transactionId||undefined,out_trade_no:transactionId?undefined:merchantOrderId,out_refund_no:`refund-${order.id}`,reason:why,notify_url:notify,amount:{refund:order.amountMinor,total:order.amountMinor,currency:order.currency.toUpperCase()}});const path='/v3/refund/domestic/refunds',ts=String(Math.floor(Date.now()/1000)),nonce=crypto.randomUUID().replace(/-/g,'');const signature=await rsaSign(`POST\n${path}\n${ts}\n${nonce}\n${body}\n`,key);const auth=`WECHATPAY2-SHA256-RSA2048 mchid="${mch}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${serial}",signature="${signature}"`;const j=await responseJson(await request(`https://api.mch.weixin.qq.com${path}`,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body}),'WeChat Pay');return {status:j.status==='SUCCESS'?'refunded':'refund_pending',refundId:j.refund_id};
  }
  throw new Error(`Unsupported payment provider: ${provider}`);
}
