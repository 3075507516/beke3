import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MailMessage } from '../../types';
import {
  Mail,
  Inbox,
  Send,
  Trash2,
  RotateCcw,
  Star,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Settings,
  ShieldCheck,
  ChevronRight,
  Reply,
  KeyRound,
} from 'lucide-react';

async function readMailApiJson(response: Response, label: string): Promise<any> {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    const contentType = response.headers.get('content-type') || '未知';
    const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim();
    const excerpt = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
    throw new Error(`${label}返回非 JSON（HTTP ${response.status}，${contentType}）：${title || excerpt || '响应内容为空'}`);
  }
}

export const MailSection: React.FC = () => {
  const {
    mails,
    setMails,
    emailSettings,
    updateEmailSettings,
    currentUser,
    users,
    moveToTrash,
    showToast,
  } = useApp();

  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
  const [selectedMail, setSelectedMail] = useState<MailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // Local draft of settings inside drawer
  const [formSettings, setFormSettings] = useState(emailSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [testingStatus, setTestingStatus] = useState(false);
  const [actionAlert, setActionAlert] = useState<string | null>(null);
  const [settingsSource, setSettingsSource] = useState<'frontend' | 'backend'>('frontend');
  const [backendMailConfigured, setBackendMailConfigured] = useState<boolean | null>(null);
  const [backendMailStatusAvailable, setBackendMailStatusAvailable] = useState<boolean | null>(null);
  const [frontendTestFingerprint, setFrontendTestFingerprint] = useState('');
  const [frontendTestFailedFingerprint, setFrontendTestFailedFingerprint] = useState('');
  const [backendTestResult, setBackendTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/mail/status', { headers: { Accept: 'application/json' } })
      .then(async response => {
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || !contentType.includes('application/json')) throw new Error('status unavailable');
        return response.json();
      })
      .then(data => {
        if (!cancelled) {
          setBackendMailConfigured(Boolean(data?.outbound?.configured));
          setBackendMailStatusAvailable(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendMailConfigured(null);
          setBackendMailStatusAvailable(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Filled parameters are never called connected until an actual test message succeeds.
  const frontendOutboundConfigured = Boolean(
    (formSettings.provider === 'smtp' && formSettings.smtpHost && formSettings.smtpUser && formSettings.smtpPass && formSettings.smtpPass !== '********') ||
    (formSettings.provider !== 'smtp' && formSettings.apiKey && formSettings.apiKey !== '********' && !formSettings.apiKey.includes('demo') && formSettings.apiKey.length >= 8)
  ) && Boolean(formSettings.senderEmail);
  const frontendFingerprint = [formSettings.provider, formSettings.smtpHost, formSettings.smtpPort, formSettings.smtpSecurity, formSettings.smtpUser, formSettings.smtpPass, formSettings.apiKey, formSettings.senderEmail].join('|');
  const isFrontendConnected = frontendOutboundConfigured && frontendTestFingerprint === frontendFingerprint;
  const isFrontendTestFailed = frontendOutboundConfigured && frontendTestFailedFingerprint === frontendFingerprint;
  const isBackendConnected = backendMailConfigured === true && backendTestResult === true;
  const isBackendTestFailed = backendTestResult === false;

  const inboundParametersConfigured = Boolean(
    (formSettings.inboundMethod === 'cf_routing' && formSettings.cfEmailRouting?.routingAddress && formSettings.cfEmailRouting?.forwardTo) ||
    (formSettings.inboundMethod === 'imap_pop3' && formSettings.imapConfig?.host && formSettings.imapConfig?.user && formSettings.imapConfig?.pass && formSettings.imapConfig?.pass !== '********') ||
    (formSettings.inboundMethod === 'webhook' && formSettings.cfEmailRouting?.webhookUrl)
  );

  const handleTestMail = async (source: 'frontend' | 'backend') => {
    const token = sessionStorage.getItem('fox3_admin_session');
    if (!token) {
      showToast('邮件连通测试需要通过已部署的管理员账号重新登录。', 'error');
      return;
    }
    setTestingStatus(true);
    if (source === 'backend') setBackendTestResult(null);
    try {
      const response = await fetch('/api/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source, clientEmailSettings: source === 'frontend' ? formSettings : undefined }),
      });
      const result = await readMailApiJson(response, '邮件连通测试接口');
      if (!response.ok || !result?.success) throw new Error(result?.error || `测试失败 (HTTP ${response.status})`);
      if (source === 'frontend') {
        setFrontendTestFingerprint(frontendFingerprint);
        setFrontendTestFailedFingerprint('');
      }
      else setBackendTestResult(true);
      showToast(`测试邮件已由 ${source === 'frontend' ? '前台配置' : '后台环境变量'}投递至发件地址 ${result.recipient}；请实际查收确认。`, 'success');
    } catch (error: any) {
      if (source === 'frontend') {
        setFrontendTestFingerprint('');
        setFrontendTestFailedFingerprint(frontendFingerprint);
      }
      else setBackendTestResult(false);
      showToast(error?.message || '邮件连通测试失败。', 'error');
    } finally {
      setTestingStatus(false);
    }
  };

  // New Compose state
  const [recipient, setRecipient] = useState('');
  const [replyIdentity, setReplyIdentity] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Selected for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredMails = mails.filter(m => {
    const matchesFolder = m.folder === activeFolder;
    const matchesQuery =
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesQuery && !m.deleted;
  });

  const totalMailCount = mails.filter(m => !m.deleted).length;
  const isOverQuota = totalMailCount >= 3000;

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMails.map(m => m.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (activeFolder === 'trash') {
      if (window.confirm('确定彻底清除选中的信件吗？')) {
        setMails(prev => prev.filter(m => !selectedIds.includes(m.id)));
        setSelectedIds([]);
        if (selectedMail && selectedIds.includes(selectedMail.id)) setSelectedMail(null);
      }
    } else {
      setMails(prev =>
        prev.map(m => (selectedIds.includes(m.id) ? { ...m, folder: 'trash' as const } : m))
      );
      setSelectedIds([]);
    }
  };

  const handleBatchRestore = () => {
    setMails(prev =>
      prev.map(m => (selectedIds.includes(m.id) ? { ...m, folder: 'inbox' as const } : m))
    );
    setSelectedIds([]);
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!recipient && !replyIdentity) || !subject || !body) return;

    const sender = emailSettings.senderEmail || 'service@whitefox.blog';
    const token = sessionStorage.getItem('fox3_admin_session');
    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          to: recipient,
          recipientIdentity: replyIdentity || undefined,
          subject,
          text: body,
          type: replyIdentity ? 'admin_reply' : 'manual',
          settingsSource,
          clientEmailSettings: settingsSource === 'frontend' ? formSettings : undefined,
        })
      });
      const result = await readMailApiJson(response, '邮件发送接口');
      if (!response.ok || !result?.success || !result?.externalDispatched) {
        throw new Error(result?.error || '邮件服务未确认投递，请检查发信设置。');
      }
      const deliveredTo = result.mailRecord?.recipient || recipient;
      const newMail: MailMessage = {
        id: result.mailRecord?.id || `mail-${Date.now()}`,
        folder: 'sent',
        sender,
        recipient: deliveredTo,
        subject,
        body,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        read: true,
        isStarred: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setMails(prev => [newMail, ...prev]);
      setIsComposing(false);
      setRecipient('');
      setReplyIdentity('');
      setSubject('');
      setBody('');
      setActiveFolder('sent');
      showToast(`邮件已实际发送至 ${deliveredTo}`, 'success');
    } catch (err: any) {
      showToast(err?.message || '邮件发送失败，请检查 SMTP/API 设置。', 'error');
    }
  };

  const handleReplyMail = async () => {
    if (!selectedMail) return;
    const identity = selectedMail.sender.trim();
    const senderEmail = identity.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
    const identityLower = identity.toLowerCase();
    const localUser = users.find(user =>
      user.role === 'user' && (
        user.id.toLowerCase() === identityLower ||
        user.username.trim().toLowerCase() === identityLower ||
        user.email.trim().toLowerCase() === identityLower ||
        (senderEmail && user.email.trim().toLowerCase() === senderEmail.toLowerCase())
      )
    );
    let registeredEmail = localUser?.email && !localUser.email.toLowerCase().endsWith('@user.blog')
      ? localUser.email
      : senderEmail;
    setReplyIdentity(localUser?.id || senderEmail || identity);
    setRecipient(registeredEmail);
    setSubject(`Re: ${selectedMail.subject}`);
    setBody(`\n\n--- 原始邮件内容 ---\n发件人: ${selectedMail.sender}\n时间: ${selectedMail.date}\n${selectedMail.body}`);
    setIsComposing(true);
  };

  return (
    <div className="space-y-6">
      {/* 3,000+ Emails Quota Alert Header */}
      {isOverQuota && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-200 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">邮箱容量提醒：</span>
            当前信件总数已超过 3,000 封预警限制（现有 {totalMailCount} 封）。建议及时归档或清理垃圾邮件箱，以防超出第三方 API 额度与数据库限制。
          </div>
        </div>
      )}

      {/* Main Mail Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-rose-500" />
            <span>站内邮件中枢（发信已接入 / 收信待接入）</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            支持 Resend SMTP/API、Brevo 与 SendGrid 发信，含验证码模板和收发限制设置
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Real-time Status Indicators Lamp in Header */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium border ${isFrontendConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : isFrontendTestFailed || !frontendOutboundConfigured ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isFrontendConnected ? 'bg-emerald-500' : isFrontendTestFailed || !frontendOutboundConfigured ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <span>前台: {isFrontendConnected ? '测试已接受' : isFrontendTestFailed ? '测试失败' : frontendOutboundConfigured ? '待实测' : '未配置'}</span>
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium border ${isBackendConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : isBackendTestFailed || backendMailStatusAvailable === false || backendMailConfigured === false ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500' : isBackendTestFailed || backendMailStatusAvailable === false || backendMailConfigured === false ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <span>后台: {isBackendConnected ? '测试已接受' : isBackendTestFailed ? '测试失败' : backendMailStatusAvailable === null ? '检测中' : backendMailStatusAvailable === false ? '状态不可读取' : backendMailConfigured ? '参数已配置/待测试' : '未配置'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium border bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>收信: 未接入</span>
            </span>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>邮件中枢设置</span>
          </button>

          <button
            onClick={() => {
              setRecipient('');
              setReplyIdentity('');
              setSubject('');
              setBody('');
              setIsComposing(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>撰写并发送信件</span>
          </button>
        </div>
      </div>

      {/* Cloudflare Routing & SMTP Settings Drawer */}
      {showConfig && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in">
          {/* Detailed Setup Guide Banner inside Section */}
          <div className="p-4 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-sky-800 dark:text-sky-200 text-sm">
              <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" />
              <span>站内发信与收信配置指南 & 后端环境变量说明</span>
            </div>
            <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
              <p><b>1. Resend SMTP 示例：</b>服务器 <code>smtp.resend.com</code>，端口 <code>465</code>，加密选 <b>SSL</b>，用户名填 <code>resend</code>，密码填 Resend API Key（通常以 <code>re_</code> 开头）；发件人必须使用已在 Resend 验证的域名邮箱。</p>
              <p><b>2. 前台与后台：</b>前台配置保存在当前浏览器本机，可在「前台/后台」选择实际发信源并分别发送测试邮件。后台环境变量优先服务注册验证码；请在 Cloudflare Pages 的 Functions Variables/Secrets 设置 <code>MAIL_PROVIDER</code>、<code>SMTP_HOST</code>、<code>SMTP_PORT</code>、<code>SMTP_SECURITY</code>、<code>SMTP_USER</code>、<code>SMTP_PASS</code>、<code>MAIL_SENDER</code>，并绑定 <code>DB</code>。密钥在本机浏览器存储中未加密，请只在可信管理员设备保存。</p>
              <p><b>3. 全站验证码：</b>可设置 <code>VERIFY_CODE_LENGTH</code>、<code>VERIFY_EMAIL_SUBJECT</code>、<code>VERIFY_EMAIL_TEMPLATE</code>；模板变量为 {'{{code}}'}、{'{{username}}'}、{'{{email}}'}。后台环境变量配置适用于访客注册，回信收件人由 D1 注册用户记录解析。</p>
              <p><b>4. 收信：</b>当前应用没有 IMAP 轮询、Email Routing 收件处理器或 Webhook 接收路由。这里仅保存收信参数，Cloudflare 转发到外部邮箱不等于邮件进入本站；收信灯不会显示已连通。</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>邮件服务提供商与收发限制参数设定</span>
            </div>
            <button
              onClick={() => setShowConfig(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              收起设置
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Third party API configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>发信通道设置 (Outbound)</span>
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isFrontendConnected ? 'bg-emerald-50 text-emerald-700' : isFrontendTestFailed || !frontendOutboundConfigured ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>
                  {isFrontendConnected ? '● 前台测试已接受' : isFrontendTestFailed ? '○ 前台测试失败' : frontendOutboundConfigured ? '● 前台参数已填写/待测试' : '○ 前台未配置'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-semibold">普通站内信使用哪组发信凭据？</label>
                <select value={settingsSource} onChange={e => setSettingsSource(e.target.value as 'frontend' | 'backend')} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
                  <option value="frontend">使用前台邮箱设置（本机保存）</option>
                  <option value="backend">使用 Cloudflare 后台环境变量</option>
                </select>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={testingStatus || !frontendOutboundConfigured} onClick={() => handleTestMail('frontend')} className="px-3 py-1.5 rounded-lg bg-sky-600 disabled:opacity-40 text-white text-[11px] font-semibold">
                    {testingStatus ? '测试中…' : '测试前台配置'}
                  </button>
                  <button type="button" disabled={testingStatus || !backendMailConfigured} onClick={() => handleTestMail('backend')} className="px-3 py-1.5 rounded-lg bg-indigo-600 disabled:opacity-40 text-white text-[11px] font-semibold">
                    {testingStatus ? '测试中…' : '测试后台配置'}
                  </button>
                  <span className="self-center text-[10px] text-slate-500">测试邮件仅发回该通道的发件地址；绿色仅代表邮件服务接受了测试投递。</span>
                </div>
                <div className="text-[10px] text-slate-500">后台环境变量状态：{backendMailStatusAvailable === null ? '检测中…' : backendMailStatusAvailable === false ? '状态接口不可读取，无法判断后台是否配置' : isBackendTestFailed ? '测试失败' : isBackendConnected ? '测试邮件已被服务商接受' : backendMailConfigured ? '参数已配置，尚未测试' : '未配置发信环境变量'}</div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  发信服务与加密方式 <span className="text-rose-500 font-bold">[必填]</span>
                </label>
                <select
                  value={formSettings.provider}
                  onChange={e => setFormSettings({ ...formSettings, provider: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="smtp">SMTP (SSL 465 / STARTTLS 587)</option>
                  <option value="resend">Resend API (HTTPS)</option>
                  <option value="brevo">Brevo API (HTTPS)</option>
                  <option value="sendgrid">Twilio SendGrid API (HTTPS)</option>
                </select>
              </div>

              {formSettings.provider !== 'smtp' ? (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    API Key / Access Token 密钥 <span className="text-rose-500 font-bold">[必填]</span>
                  </label>
                  <input
                    type="password"
                    value={formSettings.apiKey}
                    onChange={e => setFormSettings({ ...formSettings, apiKey: e.target.value })}
                    placeholder="re_xxxxxxxxxxxxxx 或 key-xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">
                        SMTP 发件服务器地址 <span className="text-rose-500 font-bold">[必填]</span>
                      </label>
                      <input
                        type="text"
                        value={formSettings.smtpHost}
                        onChange={e => setFormSettings({ ...formSettings, smtpHost: e.target.value })}
                        placeholder="smtp.resend.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        端口 (Port) <span className="text-rose-500 font-bold">[必填]</span>
                      </label>
                      <input
                        type="number"
                        value={formSettings.smtpPort || 465}
                        onChange={e => setFormSettings({ ...formSettings, smtpPort: parseInt(e.target.value) || 465 })}
                        placeholder="465"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        加密方式 <span className="text-rose-500 font-bold">[必填]</span>
                      </label>
                      <select
                        value={formSettings.smtpSecurity || 'ssl'}
                        onChange={e => setFormSettings({
                          ...formSettings,
                          smtpSecurity: e.target.value as 'ssl' | 'starttls',
                          smtpPort: e.target.value === 'ssl' ? 465 : 587,
                        })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                      >
                        <option value="ssl">SSL / Implicit TLS</option>
                        <option value="starttls">STARTTLS</option>
                      </select>
                    </div>
                    <p className="self-end text-[10px] text-slate-400 pb-2">Resend 推荐 SSL 465；STARTTLS 通常使用 587。</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        SMTP 账号 / 用户名 <span className="text-rose-500 font-bold">[必填]</span>
                      </label>
                      <input
                        type="text"
                        value={formSettings.smtpUser}
                        onChange={e => setFormSettings({ ...formSettings, smtpUser: e.target.value })}
                        placeholder="resend"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        SMTP 授权码 / 密码 <span className="text-rose-500 font-bold">[必填]</span>
                      </label>
                      <input
                        type="password"
                        value={formSettings.smtpPass}
                        onChange={e => setFormSettings({ ...formSettings, smtpPass: e.target.value })}
                        placeholder="Resend API Key（re_...）"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  发信人地址 (From Header) <span className="text-rose-500 font-bold">[必填]</span>
                </label>
                <input
                  type="text"
                  value={formSettings.senderEmail}
                  onChange={e => setFormSettings({ ...formSettings, senderEmail: e.target.value })}
                  placeholder="service@whitefox.blog"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30 space-y-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <h5 className="font-bold text-slate-700 dark:text-slate-200">注册验证码邮件（服务端生成与校验）</h5>
                  <p>验证码由 Pages Functions 安全随机生成并存入 D1/KV；注册访客的请求不会传入本机 SMTP 密钥、验证码位数或邮件正文。</p>
                  <p>如需自定义，请在 Cloudflare Pages 的 Functions Variables/Secrets 设置 <code>VERIFY_CODE_LENGTH</code>（默认 6，范围 4–8）、<code>VERIFY_EMAIL_SUBJECT</code> 和 <code>VERIFY_EMAIL_TEMPLATE</code>。模板变量：{'{{code}}'}、{'{{username}}'}、{'{{email}}'}；未设置时使用系统默认内容。</p>
                </div>
              </div>
            </div>

            {/* Cloudflare Email Routing & Inbound Routing */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  收信通道方式 & Cloudflare Email Routing (Inbound)
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${inboundParametersConfigured ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'}`}>
                  {inboundParametersConfigured ? '● 参数已填/本站未接收' : '○ 未配置/本站未接收'}
                </span>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  收信配置（当前仅保存，不实际收件）
                </label>
                <select
                  value={formSettings.inboundMethod || 'cf_routing'}
                  onChange={e => setFormSettings({ ...formSettings, inboundMethod: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="cf_routing">Cloudflare Email Routing（本站尚未接收入站邮件）</option>
                  <option value="imap_pop3">IMAP / POP3 参数（本站尚无轮询器）</option>
                  <option value="webhook">Webhook 参数（本站尚无接收路由）</option>
                </select>
              </div>

              {formSettings.inboundMethod === 'imap_pop3' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">
                        IMAP 服务器地址 <span className="text-slate-400">[仅保存，未接入]</span>
                      </label>
                      <input
                        type="text"
                        value={formSettings.imapConfig?.host || ''}
                        onChange={e =>
                          setFormSettings({
                            ...formSettings,
                            imapConfig: {
                              ...(formSettings.imapConfig || { host: '', port: 993, user: '', pass: '', tls: true }),
                              host: e.target.value,
                            },
                          })
                        }
                        placeholder="imap.exmail.qq.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        收信端口 <span className="text-slate-400">[仅保存，未接入]</span>
                      </label>
                      <input
                        type="number"
                        value={formSettings.imapConfig?.port || 993}
                        onChange={e =>
                          setFormSettings({
                            ...formSettings,
                            imapConfig: {
                              ...(formSettings.imapConfig || { host: '', port: 993, user: '', pass: '', tls: true }),
                              port: parseInt(e.target.value) || 993,
                            },
                          })
                        }
                        placeholder="993"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        IMAP 账号 <span className="text-slate-400">[仅保存，未接入]</span>
                      </label>
                      <input
                        type="text"
                        value={formSettings.imapConfig?.user || ''}
                        onChange={e =>
                          setFormSettings({
                            ...formSettings,
                            imapConfig: {
                              ...(formSettings.imapConfig || { host: '', port: 993, user: '', pass: '', tls: true }),
                              user: e.target.value,
                            },
                          })
                        }
                        placeholder="service@whitefox.blog"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        IMAP 授权码 / 密码 <span className="text-slate-400">[仅保存，未接入]</span>
                      </label>
                      <input
                        type="password"
                        value={formSettings.imapConfig?.pass || ''}
                        onChange={e =>
                          setFormSettings({
                            ...formSettings,
                            imapConfig: {
                              ...(formSettings.imapConfig || { host: '', port: 993, user: '', pass: '', tls: true }),
                              pass: e.target.value,
                            },
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : formSettings.inboundMethod === 'webhook' ? (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Webhook 地址 <span className="text-slate-400">[仅保存，本站没有接收路由]</span>
                  </label>
                  <input
                    type="text"
                    value={formSettings.cfEmailRouting.webhookUrl || '/api/mail/webhook'}
                    onChange={e =>
                      setFormSettings({
                        ...formSettings,
                        cfEmailRouting: {
                          ...formSettings.cfEmailRouting,
                          webhookUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="/api/mail/webhook 或 https://api.yourdomain.com/mail"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Cloudflare 路由公共收件地址 <span className="text-rose-500 font-bold">[必填]</span>
                    </label>
                    <input
                      type="text"
                      value={formSettings.cfEmailRouting.routingAddress}
                      onChange={e =>
                        setFormSettings({
                          ...formSettings,
                          cfEmailRouting: {
                            ...formSettings.cfEmailRouting,
                            routingAddress: e.target.value,
                          },
                        })
                      }
                      placeholder="contact@yourdomain.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      管理员专属目标接收邮箱 <span className="text-rose-500 font-bold">[必填]</span>
                    </label>
                    <input
                      type="text"
                      value={formSettings.cfEmailRouting.forwardTo}
                      onChange={e =>
                        setFormSettings({
                          ...formSettings,
                          cfEmailRouting: {
                            ...formSettings.cfEmailRouting,
                            forwardTo: e.target.value,
                          },
                        })
                      }
                      placeholder="admin@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>
                </>
              )}

              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <b className="text-slate-700 dark:text-slate-200">服务端风控：</b>
                注册验证码对邮箱和 IP 执行冷却并由服务端过期；邮件连通测试需要管理员会话。每日发信上限和收信轮询目前没有可配置实现，本机表单不会伪装这些能力。
              </div>
            </div>
          </div>

          {/* Explicit Save Configuration Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400">
              邮箱配置（含密码/API Key）将持久保存在此浏览器本机，采用浏览器本地存储，不加密且不会同步到其它设备；导出备份仍会排除密钥。请勿在公用设备保存。
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  updateEmailSettings(formSettings);
                  setIsSaved(true);
                  showToast('邮箱配置已保存。发信是否连通以实际发送结果为准。', 'success');
                  setTimeout(() => {
                    setIsSaved(false);
                    setShowConfig(false);
                  }, 1200);
                }}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSaved ? '已保存！' : '保存邮箱配置'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mailbox Layout (Folders + Mail list + Detail Pane) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
        {/* Left Navigation Folders */}
        <div className="md:col-span-3 border-r border-slate-100 dark:border-slate-800 p-4 space-y-1">
          <button
            onClick={() => {
              setActiveFolder('inbox');
              setSelectedIds([]);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeFolder === 'inbox'
                ? 'bg-rose-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              <span>收件箱</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
              {mails.filter(m => m.folder === 'inbox' && !m.deleted).length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveFolder('sent');
              setSelectedIds([]);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeFolder === 'sent'
                ? 'bg-rose-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>已发送</span>
            </div>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-200">
              {mails.filter(m => m.folder === 'sent' && !m.deleted).length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveFolder('trash');
              setSelectedIds([]);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeFolder === 'trash'
                ? 'bg-rose-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>信件回收站</span>
            </div>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-200">
              {mails.filter(m => m.folder === 'trash' && !m.deleted).length}
            </span>
          </button>
        </div>

        {/* Center / Right Mail Content */}
        <div className="md:col-span-9 flex flex-col">
          {/* Action Toolbar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && selectedIds.length === filteredMails.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-rose-500 rounded"
              />
              <span className="text-xs text-slate-400">全选</span>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                  {activeFolder === 'trash' ? (
                    <>
                      <button
                        onClick={handleBatchRestore}
                        className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-100 transition"
                      >
                        还原信件
                      </button>
                      <button
                        onClick={handleBatchDelete}
                        className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-lg hover:bg-rose-100 transition"
                      >
                        彻底删除
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleBatchDelete}
                      className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-lg hover:bg-rose-100 transition"
                    >
                      移入回收站
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索邮件主题或收发者..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Mail Items or Active Mail Reader */}
          {selectedMail ? (
            <div className="p-6 space-y-4 flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedMail(null)}
                  className="text-xs text-rose-500 font-semibold hover:underline"
                >
                  ← 返回邮件列表
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReplyMail}
                    className="flex items-center gap-1 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-lg hover:bg-rose-100 transition"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>站内回信</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedMail.subject}
                </h3>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>发件人: {selectedMail.sender} &bull; 收件人: {selectedMail.recipient}</span>
                  <span>{selectedMail.date}</span>
                </div>
              </div>

              {selectedMail.isCodeVerify && selectedMail.code && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-3">
                  <KeyRound className="w-5 h-5 text-rose-500" />
                  <div className="text-xs">
                    <span className="font-semibold text-rose-700 dark:text-rose-300">系统身份验证码：</span>
                    <span className="text-base font-bold font-mono tracking-widest text-rose-600 ml-2">
                      {selectedMail.code}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedMail.body}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto">
              {filteredMails.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  暂无相关信件
                </div>
              ) : (
                filteredMails.map(mail => (
                  <div
                    key={mail.id}
                    onClick={() => {
                      // Mark as read
                      setMails(prev =>
                        prev.map(m => (m.id === mail.id ? { ...m, read: true } : m))
                      );
                      setSelectedMail({ ...mail, read: true });
                    }}
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                      !mail.read ? 'bg-rose-50/30 dark:bg-rose-950/20 font-semibold' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(mail.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, mail.id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== mail.id));
                        }
                      }}
                      className="w-4 h-4 text-rose-500 rounded"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="truncate max-w-[200px] text-slate-800 dark:text-slate-200">
                          {activeFolder === 'sent' ? `收件: ${mail.recipient}` : `发件: ${mail.sender}`}
                        </span>
                        <span className="text-[11px] text-slate-400">{mail.date}</span>
                      </div>
                      <h4 className="text-xs truncate text-slate-900 dark:text-slate-100">
                        {mail.subject}
                      </h4>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Mail Modal */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold font-serif-sc text-slate-900 dark:text-slate-100 mb-4">
              站内向用户发送信件 / 自动回信
            </h3>

            <form onSubmit={handleSendMail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  收件人邮箱
                </label>
                <input
                  type="email"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder={replyIdentity ? '将使用注册用户资料中的真实邮箱' : 'recipient@example.com'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required={!replyIdentity}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  邮件主题
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="输入邮件标题"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  信件正文
                </label>
                <textarea
                  rows={6}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="输入信件详细正文..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsComposing(false);
                    setReplyIdentity('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
                >
                  确认发送
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
