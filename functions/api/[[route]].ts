// Cloudflare Pages Functions API Handler
// Routes: /api/*

interface Env {
  DB?: any;        // Cloudflare D1 Database binding
  R2_BUCKET?: any; // Cloudflare R2 Bucket binding
  KV?: any;        // Cloudflare KV Namespace binding
}

export const onRequest = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');

  // CORS Headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Health check & genuine connectivity status indicator
  // Displays online (channelOnline: true) ONLY when DB or R2_BUCKET is actually bound
  if (path === '/status' || path === '') {
    const hasD1 = Boolean(env.DB);
    const hasR2 = Boolean(env.R2_BUCKET);
    const hasKV = Boolean(env.KV);
    const channelOnline = hasD1 || hasR2;

    return new Response(JSON.stringify({
      success: true,
      status: channelOnline ? 'online' : 'offline',
      channelOnline,
      version: '3.8.0',
      cloudServices: {
        d1: hasD1,
        r2: hasR2,
        kv: hasKV,
      },
      message: channelOnline
        ? 'Cloudflare D1/R2 服务通道已正常在线'
        : '未检测到 D1/R2 绑定，当前运行在本地离线/本地存储模式',
      timestamp: Date.now(),
    }), {
      headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
    });
  }

  // Cross-device sync store & retrieve (/api/sync/:key)
  // Allows device A to push records, and device B to poll updates in real-time
  if (path.startsWith('/sync/')) {
    const syncKey = path.replace('/sync/', '');
    // If KV is available, store in KV; if D1 is available, query/update D1; fallback gracefully
    if (request.method === 'GET') {
      if (env.KV) {
        const val = await env.KV.get(`fox3_sync_${syncKey}`);
        return new Response(JSON.stringify({
          success: true,
          data: val ? JSON.parse(val) : null,
          fromCloud: true,
        }), {
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        success: false,
        fromCloud: false,
        message: 'KV not bound for cross-device sync. Using local cache.',
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      const payload = await request.json();
      if (env.KV) {
        await env.KV.put(`fox3_sync_${syncKey}`, JSON.stringify(payload), { expirationTtl: 86400 * 30 });
        return new Response(JSON.stringify({
          success: true,
          syncedToCloud: true,
          timestamp: Date.now(),
        }), {
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        syncedToCloud: false,
        message: 'KV not bound on host. Synced locally.',
        timestamp: Date.now(),
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  // Cloudflare R2 Upload Handler (Images, Videos, Ebooks)
  if (path === '/upload' && request.method === 'POST') {
    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({
        success: false,
        fallbackToLocal: true,
        message: 'R2 binding not configured on this host. Use fallback storage.',
      }), {
        status: 200,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file uploaded' }), {
          status: 400,
          headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
        });
      }

      const key = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      await env.R2_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: {
          originalName: encodeURIComponent(file.name),
          uploadedAt: String(Date.now()),
        }
      });

      const publicUrl = `/api/files/${key}`;
      return new Response(JSON.stringify({
        success: true,
        key,
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type
      }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'R2 upload failed' }), {
        status: 500,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  // Cloudflare R2 File Access & Stream
  if (path.startsWith('/files/')) {
    const key = path.replace('/files/', '');
    if (!env.R2_BUCKET) {
      return new Response('R2 not enabled', { status: 404 });
    }
    const object = await env.R2_BUCKET.get(key);
    if (!object) {
      return new Response('File not found', { status: 404 });
    }
    const responseHeaders = new Headers(headers);
    object.writeHttpMetadata(responseHeaders);
    responseHeaders.set('etag', object.httpEtag);
    return new Response(object.body, { headers: responseHeaders });
  }

  // D1 Database query proxy
  if (path === '/d1/query' && request.method === 'POST') {
    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, fallbackToLocal: true }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
    try {
      const { sql, params = [] } = await request.json() as any;
      const stmt = env.DB.prepare(sql).bind(...params);
      const result = await stmt.all();
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ message: 'fox3 Cloudflare API Ready' }), {
    headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json' }
  });
};
