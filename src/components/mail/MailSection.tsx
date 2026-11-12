import React, { useState } from 'react';
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

  // Accurate connection indicators for Outbound & Inbound
  const isOutboundConnected = Boolean(
    (formSettings.provider === 'smtp' && formSettings.smtpHost && formSettings.smtpUser && formSettings.smtpPass && formSettings.smtpPass !== '********') ||
    (formSettings.provider !== 'smtp' && formSettings.apiKey && formSettings.apiKey !== '********' && !formSettings.apiKey.includes('demo') && formSettings.apiKey.length >= 8)
  );

  const isInboundConnected = Boolean(
    (formSettings.inboundMethod === 'cf_routing' && formSettings.cfEmailRouting?.routingAddress && formSettings.cfEmailRouting?.forwardTo) ||
    (formSettings.inboundMethod === 'imap_pop3' && formSettings.imapConfig?.host && formSettings.imapConfig?.user && formSettings.imapConfig?.pass && formSettings.imapConfig?.pass !== '********') ||
    (formSettings.inboundMethod === 'webhook' && formSettings.cfEmailRouting?.webhookUrl)
  );

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
    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          recipientIdentity: replyIdentity || undefined,
          subject,
          text: body,
          type: replyIdentity ? 'admin_reply' : 'manual',
          clientEmailSettings: emailSettings,
        })
      });
      const result = await response.json();
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
            <span>站内邮件管理中枢 & Cloudflare Email Routing</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            支持 Resend SMTP/API、Brevo 与 SendGrid 发信，含验证码模板和收发限制设置
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Real-time Status Indicators Lamp in Header */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                isOutboundConnected
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOutboundConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>发信: {isOutboundConnected ? '已配置' : '未配置'}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                isInboundConnected
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isInboundConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>收信: {isInboundConnected ? '已配置' : '未配置'}</span>
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
              <p><b>1. SMTP 设置：</b>Resend 默认使用 <code>smtp.resend.com</code>、端口 <code>465</code>、<b>SSL</b>、用户名 <code>resend</code>，密码填写 Resend API Key；发件域名必须先在 Resend 验证。</p>
              <p><b>2. 线上部署：</b>SMTP 密码/API Key 不写入浏览器存储，仅在当前页面会话内保留。给所有访客提供注册邮件时，请在 Cloudflare Pages Functions 设置 <code>SMTP_HOST</code>、<code>SMTP_PORT</code>、<code>SMTP_SECURITY</code>、<code>SMTP_USER</code>、<code>SMTP_PASS</code>、<code>MAIL_SENDER</code>，并绑定 KV 验证码存储。</p>
              <p><b>3. 全站验证码定制：</b>可设置 <code>VERIFY_CODE_LENGTH</code>、<code>VERIFY_EMAIL_SUBJECT</code>、<code>VERIFY_EMAIL_TEMPLATE</code>。模板变量：{'{{code}}'}、{'{{username}}'}、{'{{email}}'}。回复邮件采用注册用户数据库中的真实邮箱。</p>
              <p><b>4. 收信路由：</b>Cloudflare Email Routing 需在 Cloudflare 域名后台单独开启并设置转发目标；当前收信设置区只保存转发/IMAP 配置，不代表已成功收件。</p>
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
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isOutboundConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {isOutboundConnected ? '● 发信参数已填写' : '○ 发信参数未填写'}
                </span>
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

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200">注册验证码邮件内容</h5>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">邮件主题（变量：{'{{code}}'}、{'{{username}}'}、{'{{email}}'}）</label>
                  <input
                    type="text"
                    value={formSettings.verificationEmailSubject || '【fox3 博客】注册验证码：{{code}}'}
                    onChange={e => setFormSettings({ ...formSettings, verificationEmailSubject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">验证码位数（默认 6 位）</label>
                  <select
                    value={formSettings.verificationCodeLength || 6}
                    onChange={e => setFormSettings({ ...formSettings, verificationCodeLength: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                  >
                    {[4, 5, 6, 7, 8].map(length => <option key={length} value={length}>{length} 位数字</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">回复正文（变量：{'{{code}}'}、{'{{username}}'}、{'{{email}}'}）</label>
                  <textarea
                    rows={5}
                    value={formSettings.verificationEmailTemplate || ''}
                    onChange={e => setFormSettings({ ...formSettings, verificationEmailTemplate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                  />
                  <p className="text-[10px] text-slate-400">验证码由服务端随机生成，验证后即失效。默认模板说明验证码 10 分钟有效。</p>
                </div>
              </div>
            </div>

            {/* Cloudflare Email Routing & Inbound Routing */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  收信通道方式 & Cloudflare Email Routing (Inbound)
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isInboundConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {isInboundConnected ? '● 收信参数已填写' : '○ 收信参数未填写'}
                </span>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  收信服务与加密方式 <span className="text-rose-500 font-bold">[必填]</span>
                </label>
                <select
                  value={formSettings.inboundMethod || 'cf_routing'}
                  onChange={e => setFormSettings({ ...formSettings, inboundMethod: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="cf_routing">Cloudflare Email Routing (TLS 边缘邮件路由 / 官方免运维)</option>
                  <option value="imap_pop3">IMAP / POP3 (SSL/TLS 993 加密专用通道)</option>
                  <option value="webhook">HTTPS Webhook 安全回调接收 (端到端加密)</option>
                </select>
              </div>

              {formSettings.inboundMethod === 'imap_pop3' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">
                        IMAP 服务器地址 <span className="text-rose-500 font-bold">[必填]</span>
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
                        收信端口 <span className="text-rose-500 font-bold">[必填]</span>
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
                        IMAP 账号 <span className="text-rose-500 font-bold">[必填]</span>
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
                        IMAP 授权码 / 密码 <span className="text-rose-500 font-bold">[必填]</span>
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
                    自动化 Webhook 回调地址 (HTTP POST) <span className="text-rose-500 font-bold">[必填]</span>
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

              {/* Switches & Limits */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div>
                    <span className="text-xs text-slate-700 dark:text-slate-200 font-medium block">
                      发信配额与风控限制开关 <span className="text-slate-400">[可选]</span>
                    </span>
                    <span className="text-[10px] text-slate-400">单日上限: {formSettings.maxDailyEmails || 3000} 封 (防恶意刷信)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSettings.rateLimitEnabled}
                    onChange={e => setFormSettings({ ...formSettings, rateLimitEnabled: e.target.checked })}
                    className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div>
                    <span className="text-xs text-slate-700 dark:text-slate-200 font-medium block">
                      注册验证码自动应答回复 <span className="text-slate-400">[可选]</span>
                    </span>
                    <span className="text-[10px] text-slate-400">收到新注册邮件时自动生成6位验证码并秒级回信</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSettings.autoReplyEnabled}
                    onChange={e => setFormSettings({ ...formSettings, autoReplyEnabled: e.target.checked })}
                    className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Explicit Save Configuration Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400">
              非密钥设置保存到本地；密码/API Key 仅在当前页面会话内保留，不写入备份或浏览器存储。
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
