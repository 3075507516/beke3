import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MailMessage, User } from '../../types';
import { getAdminSessionToken } from '../../utils/adminSession';
import { translateInline } from '../../utils/i18n';
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
  ChevronDown,
  ChevronUp,
  Reply,
  KeyRound,
  Users,
  UserCheck,
  UserX,
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
    setUsers,
    moveToTrash,
    showToast,
    locale,
  } = useApp();
  const tx = (source: string) => translateInline(locale, source);

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
  const [backendMailProvider, setBackendMailProvider] = useState<string>('');
  const [inboundServerStatus, setInboundServerStatus] = useState<any>(null);
  const [inboxLoadError, setInboxLoadError] = useState('');
  const [isRefreshingInbox, setIsRefreshingInbox] = useState(false);
  const [imapTesting, setImapTesting] = useState(false);
  const [imapSyncing, setImapSyncing] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [registeredUsersLoading, setRegisteredUsersLoading] = useState(true);
  const [registeredUsersError, setRegisteredUsersError] = useState('');
  const [registeredUserActionId, setRegisteredUserActionId] = useState<string | null>(null);
  const [registeredUsersCollapsed, setRegisteredUsersCollapsed] = useState(() => {
    try { return localStorage.getItem('fox3_mail_users_collapsed') === 'true'; } catch { return false; }
  });
  const [registeredUsersQuery, setRegisteredUsersQuery] = useState('');
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
          setBackendMailProvider(String(data?.outbound?.provider || ''));
          setInboundServerStatus(data?.inbound || null);
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

  const refreshServerInbox = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;
    const token = getAdminSessionToken();
    if (!token) return;
    setIsRefreshingInbox(true);
    try {
      const response = await fetch('/api/mail/inbox', { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      const result = await readMailApiJson(response, '站内收件箱接口');
      if (!response.ok || !result?.success) throw new Error(result?.error || `读取收件箱失败 (HTTP ${response.status})`);
      setInboxLoadError('');
      const serverMails = Array.isArray(result?.mails) ? result.mails as MailMessage[] : [];
      setMails(previous => {
        const previousById = new Map(previous.map(mail => [mail.id, mail]));
        const fromServer = serverMails.map(mail => {
          const local = previousById.get(mail.id);
          return local ? { ...mail, folder: local.folder, read: local.read, isStarred: local.isStarred, deleted: local.deleted } : mail;
        });
        return [...fromServer, ...previous.filter(mail => !mail.id.startsWith('resend-inbound-') && !mail.id.startsWith('imap-inbound-'))];
      });
      const statusResponse = await fetch('/api/mail/status', { headers: { Accept: 'application/json' } });
      if (statusResponse.ok && (statusResponse.headers.get('content-type') || '').includes('application/json')) {
        const statusData = await statusResponse.json();
        setInboundServerStatus(statusData?.inbound || null);
      }
    } catch (error: any) {
      setInboxLoadError(error?.message || '暂时无法读取服务器收件箱');
    } finally {
      setIsRefreshingInbox(false);
    }
  }, [currentUser?.role, setMails]);

  useEffect(() => { void refreshServerInbox(); }, [refreshServerInbox]);

  const refreshRegisteredUsers = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;
    let token = '';
    try { token = getAdminSessionToken() || ''; } catch {}
    if (!token) {
      setRegisteredUsers([]);
      setRegisteredUsersError('缺少管理员会话。请通过已部署的管理员账号重新登录后刷新；不会显示本地缓存或示例账号。');
      return;
    }

    setRegisteredUsersLoading(true);
    setRegisteredUsersError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const result = await readMailApiJson(response, '已注册用户接口');
      if (response.status === 401) throw new Error('管理员会话无效或已过期（HTTP 401）。请重新登录管理员账号后重试。');
      if (response.status === 503) throw new Error(`账户服务暂不可用（HTTP 503）：${result?.error || '请检查 Pages Functions 与 D1 绑定 DB。'}`);
      if (!response.ok || result?.success !== true || !Array.isArray(result?.users)) {
        throw new Error(result?.error || result?.message || `读取 D1 用户失败（HTTP ${response.status}）。`);
      }
      const remoteUsers: User[] = result.users.map((item: any) => {
        const createdAtValue = item?.createdAt;
        const createdAt = typeof createdAtValue === 'number'
          ? createdAtValue
          : (Date.parse(String(createdAtValue || '')) || 0);
        return {
          id: String(item?.id ?? ''),
          username: String(item?.username ?? ''),
          email: String(item?.email ?? ''),
          role: item?.role === 'admin' ? 'admin' : 'user',
          createdAt,
          status: item?.status === 'disabled' ? 'disabled' : 'active',
        };
      });
      setRegisteredUsers(remoteUsers);
      setUsers(remoteUsers);
    } catch (error: any) {
      setRegisteredUsersError(error?.message || '读取 D1 用户失败，请稍后重试。');
    } finally {
      setRegisteredUsersLoading(false);
    }
  }, [currentUser?.role, setUsers]);

  useEffect(() => {
    if (currentUser?.role === 'admin') void refreshRegisteredUsers();
  }, [currentUser?.role, refreshRegisteredUsers]);

  const handleRegisteredUserStatus = async (user: User) => {
    if (user.role === 'admin') return;
    const status: User['status'] = user.status === 'active' ? 'disabled' : 'active';
    const token = getAdminSessionToken();
    if (!token) {
      setRegisteredUsersError('管理员会话已失效。请重新登录后再操作。');
      showToast('管理员会话已失效，请重新登录后再操作。', 'error');
      return;
    }
    setRegisteredUserActionId(user.id);
    setRegisteredUsersError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: user.id, status }),
      });
      const result = await readMailApiJson(response, '用户状态更新接口');
      if (response.status === 401) throw new Error('管理员会话无效或已过期（HTTP 401），请重新登录。');
      if (response.status === 503) throw new Error(`账户服务暂不可用（HTTP 503）：${result?.error || '请检查 D1 绑定 DB。'}`);
      if (!response.ok || result?.success !== true) throw new Error(result?.error || result?.message || `更新失败（HTTP ${response.status}）。`);
      setRegisteredUsers(previous => previous.map(item => item.id === user.id ? { ...item, status } : item));
      setUsers(previous => previous.map(item => item.id === user.id ? { ...item, status } : item));
      showToast(`已在 D1 中${status === 'active' ? '启用' : '禁用'}账号「${user.username}」。`, 'success');
    } catch (error: any) {
      const message = error?.message || '更新账号状态失败。';
      setRegisteredUsersError(message);
      showToast(message, 'error');
    } finally {
      setRegisteredUserActionId(null);
    }
  };

  const handleDeleteRegisteredUser = async (user: User) => {
    if (user.role === 'admin') return;
    if (!window.confirm(`确定从 D1 永久删除注册账号「${user.username}」（${user.email || '未填写邮箱'}）吗？此操作无法撤销。`)) return;
    const token = getAdminSessionToken();
    if (!token) {
      setRegisteredUsersError('管理员会话已失效。请重新登录后再操作。');
      showToast('管理员会话已失效，请重新登录后再操作。', 'error');
      return;
    }
    setRegisteredUserActionId(user.id);
    setRegisteredUsersError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: user.id }),
      });
      const result = await readMailApiJson(response, '用户删除接口');
      if (response.status === 401) throw new Error('管理员会话无效或已过期（HTTP 401），请重新登录。');
      if (response.status === 503) throw new Error(`账户服务暂不可用（HTTP 503）：${result?.error || '请检查 D1 绑定 DB。'}`);
      if (!response.ok || result?.success !== true) throw new Error(result?.error || result?.message || `删除失败（HTTP ${response.status}）。`);
      setRegisteredUsers(previous => previous.filter(item => item.id !== user.id));
      setUsers(previous => previous.filter(item => item.id !== user.id));
      showToast(`已从 D1 删除账号「${user.username}」。`, 'success');
    } catch (error: any) {
      const message = error?.message || '删除账号失败。';
      setRegisteredUsersError(message);
      showToast(message, 'error');
    } finally {
      setRegisteredUserActionId(null);
    }
  };

  // Filled parameters are never called connected until an actual test message succeeds.
  const frontendOutboundConfigured = Boolean(
    (formSettings.provider === 'smtp' && formSettings.smtpHost && formSettings.smtpUser && formSettings.smtpPass && formSettings.smtpPass !== '********') ||
    (formSettings.provider !== 'smtp' && formSettings.apiKey && formSettings.apiKey !== '********' && !formSettings.apiKey.includes('demo') && formSettings.apiKey.length >= 8 && (formSettings.provider !== 'sendcloud' || formSettings.apiUser?.trim()))
  ) && Boolean(formSettings.senderEmail);
  const frontendFingerprint = [formSettings.provider, formSettings.smtpHost, formSettings.smtpPort, formSettings.smtpSecurity, formSettings.smtpUser, formSettings.smtpPass, formSettings.apiUser, formSettings.apiKey, formSettings.senderEmail].join('|');
  const isFrontendConnected = frontendOutboundConfigured && frontendTestFingerprint === frontendFingerprint;
  const isFrontendTestFailed = frontendOutboundConfigured && frontendTestFailedFingerprint === frontendFingerprint;
  const isBackendConnected = backendMailConfigured === true && backendTestResult === true;
  const isBackendTestFailed = backendTestResult === false;
  const backendLightGreen = isBackendConnected;
  const backendLightRed = isBackendTestFailed || backendMailStatusAvailable === false || backendMailConfigured === false;
  const backendLightLabel = isBackendConnected ? '测试邮件已接受' : isBackendTestFailed ? '测试邮件失败' : backendMailStatusAvailable === null ? '检测中' : backendMailStatusAvailable === false ? '状态不可读取' : backendMailConfigured ? '参数已配置/待测试' : '未配置';
  const inboundServerReady = Boolean(inboundServerStatus?.configured);

  const handleTestMail = async (source: 'frontend' | 'backend') => {
    const token = getAdminSessionToken();
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

  const applyMailPreset = (preset: 'aliyun-qiye' | 'aliyun-personal' | 'tencent-exmail') => {
    const configs = {
      'aliyun-qiye': {
        label: '阿里云企业邮箱免费版',
        smtpHost: 'smtp.qiye.aliyun.com',
        smtpPort: 465,
        smtpSecurity: 'ssl' as const,
        imapHost: 'imap.qiye.aliyun.com',
        imapPort: 993,
      },
      'aliyun-personal': {
        label: '阿里云个人邮箱 (@aliyun.com)',
        smtpHost: 'smtp.aliyun.com',
        smtpPort: 465,
        smtpSecurity: 'ssl' as const,
        imapHost: 'imap.aliyun.com',
        imapPort: 993,
      },
      'tencent-exmail': {
        label: '腾讯企业邮箱免费版',
        smtpHost: 'smtp.exmail.qq.com',
        smtpPort: 465,
        smtpSecurity: 'ssl' as const,
        imapHost: 'imap.exmail.qq.com',
        imapPort: 993,
      },
    }[preset];

    setFormSettings(prev => ({
      ...prev,
      provider: 'smtp',
      smtpHost: configs.smtpHost,
      smtpPort: configs.smtpPort,
      smtpSecurity: configs.smtpSecurity,
      inboundMethod: 'imap_pop3',
      imapConfig: {
        host: configs.imapHost,
        port: configs.imapPort,
        user: prev.imapConfig?.user || prev.smtpUser || prev.senderEmail || '',
        pass: prev.imapConfig?.pass || prev.smtpPass || '',
        tls: true,
      },
    }));
    showToast(`已填入「${configs.label}」SMTP 发信与 IMAP 收信服务器参数，请补充邮箱账号和授权码。`, 'info');
  };

  const handleTestImap = async (source: 'frontend' | 'backend') => {
    const token = getAdminSessionToken();
    if (!token) {
      showToast('IMAP 测试需要管理员会话。', 'error');
      return;
    }
    setImapTesting(true);
    try {
      const response = await fetch('/api/mail/imap-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          source,
          imapConfig: source === 'frontend' ? formSettings.imapConfig : undefined,
        }),
      });
      const result = await readMailApiJson(response, 'IMAP 连接测试接口');
      if (!response.ok || !result?.success) throw new Error(result?.error || `IMAP 连接失败 (HTTP ${response.status})`);
      showToast(`IMAP 登录成功 (${result.host}:${result.port})，INBOX 共有 ${result.exists} 封邮件。`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'IMAP 连接测试失败', 'error');
    } finally {
      setImapTesting(false);
    }
  };

  const handleSyncImap = async (source: 'frontend' | 'backend') => {
    const token = getAdminSessionToken();
    if (!token) {
      showToast('拉取 IMAP 邮件需要管理员会话。', 'error');
      return;
    }
    setImapSyncing(true);
    try {
      const response = await fetch('/api/mail/imap-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          source,
          limit: 25,
          imapConfig: source === 'frontend' ? formSettings.imapConfig : undefined,
        }),
      });
      const result = await readMailApiJson(response, 'IMAP 收信同步接口');
      if (!response.ok || !result?.success) throw new Error(result?.error || `IMAP 拉取失败 (HTTP ${response.status})`);
      await refreshServerInbox();
      setActiveFolder('inbox');
      showToast(`IMAP 同步完成：读取 ${result.totalFetched} 封最新邮件，新导入 ${result.imported} 封到收件箱。`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'IMAP 同步邮件失败', 'error');
    } finally {
      setImapSyncing(false);
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
    const token = getAdminSessionToken();
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
            <span>站内邮件中枢（SMTP / IMAP / Resend）</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            支持阿里云企业邮箱免费版、阿里云个人邮箱、腾讯企业邮箱免费版 SMTP 发信与 IMAP 收信，以及 Resend Webhook 投递
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Real-time Status Indicators Lamp in Header */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium border ${isFrontendConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : isFrontendTestFailed || !frontendOutboundConfigured ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${isFrontendConnected ? 'bg-emerald-500' : isFrontendTestFailed || !frontendOutboundConfigured ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <span>前台: {isFrontendConnected ? '测试已接受' : isFrontendTestFailed ? '测试失败' : frontendOutboundConfigured ? '待实测' : '未配置'}</span>
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium border ${backendLightGreen ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : backendLightRed ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'}`}>
              <span className={`w-2 h-2 rounded-full ${backendLightGreen ? 'bg-emerald-500' : backendLightRed ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <span>后台: {backendLightLabel}</span>
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium border ${inboundServerReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'}`}>
              <span className={`w-2 h-2 rounded-full ${inboundServerReady ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>收件: {backendMailStatusAvailable === null ? '检测中' : backendMailStatusAvailable === false ? '状态不可读取' : inboundServerReady ? (inboundServerStatus?.imapConfigured ? 'IMAP / 服务端已就绪' : '服务端已就绪') : '未就绪/待配置'}</span>
            </span>
          </div>

          <button
            onClick={() => void refreshServerInbox()}
            disabled={isRefreshingInbox}
            title="刷新服务器收件箱"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
          >
            <RotateCcw className={`w-4 h-4 text-slate-500 ${isRefreshingInbox ? 'animate-spin' : ''}`} />
            <span>{isRefreshingInbox ? '刷新中…' : '刷新收件箱'}</span>
          </button>

          {(formSettings.imapConfig?.host && formSettings.imapConfig?.user && formSettings.imapConfig?.pass) || inboundServerStatus?.imapConfigured ? (
            <button
              onClick={() => void handleSyncImap(inboundServerStatus?.imapConfigured && (!formSettings.imapConfig?.host || settingsSource === 'backend') ? 'backend' : 'frontend')}
              disabled={imapSyncing}
              title="从邮箱 IMAP 拉取最新来信"
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 disabled:opacity-50 text-sky-700 dark:text-sky-300 text-xs font-medium rounded-xl transition"
            >
              <Inbox className={`w-4 h-4 ${imapSyncing ? 'animate-pulse' : ''}`} />
              <span>{imapSyncing ? '拉取中…' : '拉取 IMAP 来信'}</span>
            </button>
          ) : null}

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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>{tx('邮件中枢设置：发信区与收信区（已分区整理，方便阅读与操作）')}</span>
            </div>
            <button
              onClick={() => setShowConfig(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              收起设置
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* ==================== 区域一：发信区 (Outbound) ==================== */}
            <div className="space-y-4 rounded-2xl border-2 border-sky-200/80 dark:border-sky-900/60 bg-sky-50/15 dark:bg-sky-950/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 dark:border-sky-900/50 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>一、发信区（发送邮件设置 &amp; 发信说明）</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    用于站内写信/回信，以及注册验证码、订单与系统自动发信配置
                  </p>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${isFrontendConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isFrontendTestFailed || !frontendOutboundConfigured ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {isFrontendConnected ? '● 前台测试已接受' : isFrontendTestFailed ? '○ 前台测试失败' : frontendOutboundConfigured ? '● 前台参数已填写/待测试' : '○ 前台未配置'}
                </span>
              </div>

              {/* 发信凭据选择与真实投递测试 */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 space-y-2.5">
                <label className="block text-[11px] text-slate-600 dark:text-slate-300 font-semibold">普通站内写信 / 回信使用哪组发信凭据？</label>
                <select value={settingsSource} onChange={e => setSettingsSource(e.target.value as 'frontend' | 'backend')} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                  <option value="frontend">使用前台邮箱设置（本机浏览器保存）</option>
                  <option value="backend">使用 Cloudflare / 服务端环境变量（推荐生产使用）</option>
                </select>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={testingStatus || !frontendOutboundConfigured} onClick={() => handleTestMail('frontend')} className="px-3 py-1.5 rounded-lg bg-sky-600 disabled:opacity-40 text-white text-[11px] font-semibold">
                    {testingStatus ? tx('测试中…') : tx('发送前台测试邮件')}
                  </button>
                  <button type="button" disabled={testingStatus || !backendMailConfigured} onClick={() => handleTestMail('backend')} className="px-3 py-1.5 rounded-lg bg-indigo-600 disabled:opacity-40 text-white text-[11px] font-semibold">
                    {testingStatus ? tx('测试中…') : tx('发送后台测试邮件')}
                  </button>
                  <span className="self-center text-[10px] text-slate-500">测试邮件会真实发送至当前发件人地址；注册验证码及后台业务邮件固定读取服务端环境变量。</span>
                </div>
                <div className="text-[10px] text-slate-500">后台环境变量状态：{backendMailStatusAvailable === null ? '检测中…' : backendMailStatusAvailable === false ? '状态接口不可读取，无法判断后台是否配置' : isBackendTestFailed ? '实际测试邮件失败' : isBackendConnected ? '测试邮件已被服务商接受' : backendMailConfigured ? `已配置 (${backendMailProvider})，待发送测试邮件` : '未配置后台发信环境变量'}</div>
              </div>

              {/* 一键预设常见企业邮箱 */}
              <div className="p-3.5 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/30 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-sky-800 dark:text-sky-200">一键预设常用企业/免费邮箱（同时填充 SMTP 发信与下方收信区 IMAP）：</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => applyMailPreset('aliyun-qiye')} className="px-3 py-1.5 rounded-lg border border-sky-300 bg-white dark:bg-slate-900 hover:bg-sky-50 text-[11px] font-semibold text-sky-700 dark:text-sky-300">阿里云企业邮箱免费版 (qiye.aliyun.com)</button>
                  <button type="button" onClick={() => applyMailPreset('tencent-exmail')} className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white dark:bg-slate-900 hover:bg-emerald-50 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">腾讯企业邮箱免费版 (exmail.qq.com)</button>
                  <button type="button" onClick={() => applyMailPreset('aliyun-personal')} className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white dark:bg-slate-900 hover:bg-amber-50 text-[11px] font-semibold text-amber-700 dark:text-amber-300">阿里云个人邮箱 (aliyun.com)</button>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">提示：阿里云免费企业邮箱与腾讯企业邮箱免费版均需填写完整邮箱地址作为账号，并在对应邮箱后台安全中心开启“三方客户端安全密码 / 客户端授权码”。</p>
              </div>

              {/* 发信通道与参数表单 */}
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {tx('发信服务与加密方式')} <span className="text-rose-500 font-bold">[必填]</span>
                  </label>
                  <select
                    value={formSettings.provider}
                    onChange={e => setFormSettings({ ...formSettings, provider: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="resend">Resend API (HTTPS，推荐)</option>
                    <option value="smtp">SMTP (SSL 465 / STARTTLS 587，阿里云/腾讯企业邮箱通用)</option>
                    <option value="sendcloud">{tx('SendCloud API (国内服务，按账户额度)')}</option>
                    <option value="brevo">Brevo API (HTTPS)</option>
                    <option value="sendgrid">Twilio SendGrid API (HTTPS)</option>
                  </select>
                </div>

                {formSettings.provider === 'sendcloud' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{tx('SendCloud API_USER（触发邮件账号）')}</label>
                    <input type="text" value={formSettings.apiUser || ''} onChange={event => setFormSettings({ ...formSettings, apiUser: event.target.value })} placeholder={tx('从 SendCloud 控制台 API_USER 页面复制')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800" />
                    <p className="mt-1 text-[10px] text-slate-500">{tx('SendCloud API_USER 与 API_KEY 是两项独立凭据；免费额度、域名验证和发送权限由服务商账户决定。')}</p>
                  </div>
                )}

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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">
                          SMTP 发件服务器地址 <span className="text-rose-500 font-bold">[必填]</span>
                        </label>
                        <input
                          type="text"
                          value={formSettings.smtpHost}
                          onChange={e => setFormSettings({ ...formSettings, smtpHost: e.target.value })}
                          placeholder="smtp.qiye.aliyun.com 或 smtp.exmail.qq.com"
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
                          <option value="ssl">SSL / Implicit TLS (465)</option>
                          <option value="starttls">STARTTLS (587)</option>
                        </select>
                      </div>
                      <p className="self-end text-[10px] text-slate-400 pb-2">推荐 SSL 465；STARTTLS 通常使用 587。</p>
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
                          placeholder="admin@yourdomain.com 或 resend"
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
                          placeholder="客户端授权码或 Resend API Key"
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
                    placeholder="Fox3 <service@yourdomain.com>"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* 发信区专属说明书：Resend 发信详细流程 */}
              <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <h5 className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">Resend 发信详细流程（逐步操作指南）</h5>
                <ol className="list-decimal pl-4 space-y-1">
                  <li><b>域名认证（Domain DNS）</b>：登录 <code className="font-mono">resend.com</code> → <b>Domains</b> → Add Domain 添加你的发信域名，按提示在域名 DNS 后台添加 SPF（TXT）、DKIM（TXT）记录并点击 <b>Verify DNS Records</b> 至状态变为 Verified。</li>
                  <li><b>创建发信 API Key</b>：进入左侧 <b>API Keys</b> → <b>Create API Key</b>，权限选择 <i>Sending access</i> 或 <i>Full access</i>，创建后立即复制（<code className="font-mono">re_...</code>，仅显示一次）。</li>
                  <li><b>填写配置（二选一或同时设置）</b>：
                    <span className="block pl-2 mt-0.5 text-slate-500 dark:text-slate-400">
                      • <b>后台环境变量（用于注册验证码/订单通知/后台发信）</b>：在 Cloudflare Pages → Variables and Secrets 设置 <code className="font-mono">MAIL_PROVIDER=resend</code>、<code className="font-mono">RESEND_API_KEY=re_...</code>、<code className="font-mono">MAIL_SENDER=Fox3 &lt;no-reply@已验证域名&gt;</code> 并重新部署。<br/>
                      • <b>前台本机配置（用于手动写信快速测试）</b>：在上方服务下拉选择 <b>Resend API</b>，填入 API Key 与发信人地址并点击保存。
                    </span>
                  </li>
                  <li><b>验证发信</b>：点击上方“发送后台测试邮件”或“发送前台测试邮件”，确认发件人邮箱真实收到测试邮件即完成发信对接（若改走 SMTP，填写 <code className="font-mono">smtp.resend.com</code>、端口 <code className="font-mono">465</code> SSL、用户名 <code className="font-mono">resend</code>、密码填 API Key）。</li>
                </ol>
              </div>

              {/* 注册验证码配置说明 */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 space-y-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <h5 className="font-bold text-slate-700 dark:text-slate-200">注册验证码与自动邮件后端说明</h5>
                <p>验证码由服务端随机生成并存入 D1（<code className="font-mono">DB</code>）或 KV，支持 Cloudflare Variables/Secrets 自定义：<code className="font-mono">VERIFY_CODE_LENGTH</code>（默认 6，范围 4–8）、<code className="font-mono">VERIFY_EMAIL_SUBJECT</code>、<code className="font-mono">VERIFY_EMAIL_TEMPLATE</code>（可用变量 <code className="font-mono">{'{{code}}'}</code>、<code className="font-mono">{'{{username}}'}</code>、<code className="font-mono">{'{{email}}'}</code>）。阿里云 DirectMail、腾讯云 SES、Brevo、SendGrid、SendCloud 均可配置于后台环境变量用于注册发信。</p>
              </div>
            </div>

            {/* ==================== 区域二：收信区 (Inbound) ==================== */}
            <div className="space-y-4 rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/15 dark:bg-indigo-950/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                    <Inbox className="w-4 h-4" />
                    <span>二、收信区（接收邮件设置 &amp; Resend / IMAP 收信说明）</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    支持两种收信方案：1）Resend Receiving + Webhook 实时推送入库；2）阿里云/腾讯企业邮箱 IMAP 主动拉取收件箱
                  </p>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${inboundServerReady ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : backendMailStatusAvailable === null || backendMailStatusAvailable === false ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                  {backendMailStatusAvailable === null ? '○ 状态检测中' : backendMailStatusAvailable === false ? '○ 状态不可读取' : inboundServerReady ? `● 后台收件已就绪${inboundServerStatus?.imapConfigured ? ` (IMAP: ${inboundServerStatus.imapHost})` : ''}${inboundServerStatus?.resendConfigured ? ' (Resend Webhook)' : ''}` : '○ 后台收件未就绪（可使用下方前台 IMAP 拉取）'}
                </span>
              </div>

              {/* 收信区方式 1：Resend 收信详细流程 */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="font-bold text-indigo-800 dark:text-indigo-200 text-xs">方式 A：Resend 收信详细流程（Receiving + Webhook 逐步操作）</h5>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                    当前状态：{inboundServerStatus?.resendConfigured ? '已检测到 DB + RESEND_API_KEY + RESEND_WEBHOOK_SECRET' : '缺少 DB / RESEND_API_KEY / RESEND_WEBHOOK_SECRET 中一项或多项'}
                  </span>
                </div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li><b>开启域名 Receiving 并配置 MX</b>：在 Resend → <b>Domains</b> 进入域名详情，打开 <b>Receiving</b> 开关，并按 Resend 页面提供的收件 MX 主机与优先级，在域名 DNS 后台添加对应 <b>MX 记录</b>。（若主域名已绑定腾讯/阿里云个人邮箱 MX，建议在 Resend 添加专用子域名如 <code className="font-mono">inbox.yourdomain.com</code> 避免 MX 冲突。）</li>
                  <li><b>创建 Webhook 接收端</b>：进入 Resend → <b>Webhooks</b> → <b>Add Webhook</b>，Endpoint URL 填入你自己的站点公网 HTTPS 地址：<code className="font-mono font-semibold">https://你的域名/api/webhook</code>（同时兼容 <code className="font-mono">/api/mail/webhook</code>），订阅事件只勾选 <code className="font-mono font-semibold">email.received</code>。</li>
                  <li><b>保存 Webhook Signing Secret 并重新部署</b>：创建 Webhook 后复制右侧显示的 Signing Secret（格式 <code className="font-mono">whsec_...</code>），进入 Cloudflare Pages → Settings → Variables and Secrets：
                    <span className="block pl-2 mt-0.5 text-slate-500 dark:text-slate-400">
                      • Secret 1：<code className="font-mono">RESEND_WEBHOOK_SECRET=whsec_...</code>（用于 Svix 请求体签名与时间戳防重放校验）<br/>
                      • Secret 2：<code className="font-mono">RESEND_API_KEY=re_...</code>（权限需支持读取 Receiving，用于收到 Webhook 后拉取完整来信正文）<br/>
                      • Binding：确认已绑定 D1 数据库 <code className="font-mono">DB</code>（用于持久化写入 <code className="font-mono">fox3_inbound_emails</code> 表）。完成后重新部署一次项目。
                    </span>
                  </li>
                  <li><b>实测收信</b>：使用外部邮箱向你配置的 Resend 收件域名发信（如 <code className="font-mono">hello@你的收件域名</code>）；Resend 触发 Webhook 后，服务端自动拉取正文并保存至本站“收件箱”，点击顶部“刷新收件箱”即可阅读与回复。</li>
                </ol>
                <p className="text-[10px] text-slate-500">注：仅把邮件转发到管理员个人邮箱不会自动写入本站 D1 收件箱；如使用阿里云/腾讯企业邮箱，请直接配置下方 IMAP 收信拉取。</p>
              </div>

              {/* 收信区方式 2：IMAP 收件箱配置 */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">方式 B：IMAP 主动拉取收信配置（支持阿里云邮箱免费版 / 腾讯企业邮箱免费版）</span>
                  <button
                    type="button"
                    onClick={() => setFormSettings(prev => ({
                      ...prev,
                      imapConfig: {
                        host: prev.imapConfig?.host || (prev.smtpHost?.includes('exmail.qq.com') ? 'imap.exmail.qq.com' : prev.smtpHost?.includes('qiye.aliyun.com') ? 'imap.qiye.aliyun.com' : prev.smtpHost?.includes('aliyun.com') ? 'imap.aliyun.com' : ''),
                        port: prev.imapConfig?.port || 993,
                        user: prev.smtpUser || prev.senderEmail || '',
                        pass: prev.smtpPass || '',
                        tls: true,
                      }
                    }))}
                    className="text-[11px] font-semibold text-sky-600 hover:underline"
                  >
                    从发信区 SMTP 账号密码同步填入
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-500 mb-1">IMAP 收信服务器地址</label>
                    <input
                      type="text"
                      value={formSettings.imapConfig?.host || ''}
                      onChange={e => setFormSettings({ ...formSettings, imapConfig: { host: e.target.value, port: formSettings.imapConfig?.port || 993, user: formSettings.imapConfig?.user || '', pass: formSettings.imapConfig?.pass || '', tls: formSettings.imapConfig?.tls ?? true } })}
                      placeholder="imap.qiye.aliyun.com 或 imap.exmail.qq.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">IMAP 端口 (推荐 993 SSL)</label>
                    <input
                      type="number"
                      value={formSettings.imapConfig?.port || 993}
                      onChange={e => setFormSettings({ ...formSettings, imapConfig: { host: formSettings.imapConfig?.host || '', port: parseInt(e.target.value, 10) || 993, user: formSettings.imapConfig?.user || '', pass: formSettings.imapConfig?.pass || '', tls: (parseInt(e.target.value, 10) || 993) !== 143 } })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">IMAP 登录邮箱账号</label>
                    <input
                      type="text"
                      value={formSettings.imapConfig?.user || ''}
                      onChange={e => setFormSettings({ ...formSettings, imapConfig: { host: formSettings.imapConfig?.host || '', port: formSettings.imapConfig?.port || 993, user: e.target.value, pass: formSettings.imapConfig?.pass || '', tls: formSettings.imapConfig?.tls ?? true } })}
                      placeholder="admin@yourdomain.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">IMAP 密码 / 客户端授权码</label>
                    <input
                      type="password"
                      value={formSettings.imapConfig?.pass || ''}
                      onChange={e => setFormSettings({ ...formSettings, imapConfig: { host: formSettings.imapConfig?.host || '', port: formSettings.imapConfig?.port || 993, user: formSettings.imapConfig?.user || '', pass: e.target.value, tls: formSettings.imapConfig?.tls ?? true } })}
                      placeholder="邮箱密码或专用授权码"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={imapTesting || !formSettings.imapConfig?.host || !formSettings.imapConfig?.user || !formSettings.imapConfig?.pass}
                    onClick={() => void handleTestImap('frontend')}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 disabled:opacity-40 text-white text-[11px] font-semibold"
                  >
                    {imapTesting ? '连接中…' : '测试前台 IMAP 连接'}
                  </button>
                  <button
                    type="button"
                    disabled={imapSyncing || !formSettings.imapConfig?.host || !formSettings.imapConfig?.user || !formSettings.imapConfig?.pass}
                    onClick={() => void handleSyncImap('frontend')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 disabled:opacity-40 text-white text-[11px] font-semibold"
                  >
                    {imapSyncing ? '同步中…' : '立即拉取前台 IMAP 收件箱'}
                  </button>
                  {inboundServerStatus?.imapConfigured && (
                    <>
                      <button type="button" disabled={imapTesting} onClick={() => void handleTestImap('backend')} className="px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold disabled:opacity-40">
                        测试后台环境变量 IMAP
                      </button>
                      <button type="button" disabled={imapSyncing} onClick={() => void handleSyncImap('backend')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold disabled:opacity-40">
                        拉取后台环境变量 IMAP
                      </button>
                    </>
                  )}
                </div>

                <p className="text-[10px] text-slate-500">如使用后台环境变量配置 IMAP，请在 Cloudflare Pages / 服务端配置 <code className="font-mono">IMAP_HOST</code>、<code className="font-mono">IMAP_PORT=993</code>、<code className="font-mono">IMAP_USER</code>、<code className="font-mono">IMAP_PASS</code>（及 <code className="font-mono">DB</code>）。</p>
              </div>

              {inboxLoadError && (
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-[11px] text-rose-600 dark:text-rose-400">
                  收件箱读取提示：{inboxLoadError}
                </div>
              )}

              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <b className="text-slate-700 dark:text-slate-200">安全与限制：</b>
                SMTP 与 IMAP 连接均在服务端完成域名校验，禁止访问内网/回环地址；发信、拉取收件箱与测试操作均校验有效管理员会话。收件箱正文保存在 D1（保留最新 500 封、180 天内来信）。
              </div>
            </div>
          </div>

          {/* Explicit Save Configuration Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400">
              前台邮箱配置（含密码/API Key）将保存在此浏览器本机（localStorage，未加密且不跨设备同步；导出备份会排除密钥）。请勿在公用设备保存。
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  updateEmailSettings(formSettings);
                  setIsSaved(true);
                  showToast('邮箱配置已保存。发信与收信连通性以实际测试结果为准。', 'success');
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

      {currentUser?.role === 'admin' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              aria-expanded={!registeredUsersCollapsed}
              onClick={() => {
                const next = !registeredUsersCollapsed;
                setRegisteredUsersCollapsed(next);
                try { localStorage.setItem('fox3_mail_users_collapsed', String(next)); } catch {}
              }}
              className="min-w-0 flex-1 text-left"
            >
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <span>已注册用户管理</span>
                {registeredUsersCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">数据直接读取 Cloudflare D1；不会使用本地示例或缓存用户代替服务器结果。</p>
            </button>
            <button
              type="button"
              onClick={() => void refreshRegisteredUsers()}
              disabled={registeredUsersLoading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <RotateCcw className={`w-4 h-4 ${registeredUsersLoading ? 'animate-spin' : ''}`} />
              {registeredUsersLoading ? '加载中…' : '刷新用户'}
            </button>
          </div>

          {!registeredUsersCollapsed && <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={registeredUsersQuery}
                onChange={event => setRegisteredUsersQuery(event.target.value)}
                placeholder="搜索用户名或邮箱"
                aria-label="搜索注册用户用户名或邮箱"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300" aria-live="polite">
              {registeredUsersLoading ? '正在从 D1 加载账号…' : `D1 用户：${registeredUsers.length}，匹配：${registeredUsers.filter(user => `${user.username || ''} ${user.email || ''}`.toLocaleLowerCase().includes(registeredUsersQuery.trim().toLocaleLowerCase())).length}`}
            </div>
          </div>

          {registeredUsersError && (
            <div role="alert" className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs leading-relaxed text-rose-700 dark:text-rose-300">
              <b>无法读取或更新服务器账号：</b> {registeredUsersError}
            </div>
          )}

          {!registeredUsersLoading && !registeredUsersError && registeredUsers.length === 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
              D1 当前没有已注册账号。
            </div>
          )}

          {!registeredUsersLoading && registeredUsers.length > 0 && registeredUsers.filter(user => `${user.username || ''} ${user.email || ''}`.toLocaleLowerCase().includes(registeredUsersQuery.trim().toLocaleLowerCase())).length === 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
              没有找到匹配的用户名或邮箱。
            </div>
          )}

          {!registeredUsersLoading && registeredUsers.length > 0 && (
            <div className="space-y-3">
              {registeredUsers.filter(user => `${user.username || ''} ${user.email || ''}`.toLocaleLowerCase().includes(registeredUsersQuery.trim().toLocaleLowerCase())).map(user => (
                <article key={user.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 break-all">{user.username || '（无用户名）'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{user.role === 'admin' ? '管理员' : '普通用户'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>
                          {user.status === 'active' ? '已启用' : '已禁用'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 break-all">邮箱：{user.email || '未绑定邮箱'}</p>
                      <p className="text-[11px] text-slate-400">注册时间：{user.createdAt ? new Date(user.createdAt).toLocaleString() : '未知'}</p>
                    </div>
                    {user.role !== 'admin' && (
                      <div className="flex flex-wrap gap-2 sm:shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleRegisteredUserStatus(user)}
                          disabled={registeredUserActionId !== null}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 ${user.status === 'active' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'}`}
                        >
                          {user.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {user.status === 'active' ? '禁用账号' : '启用账号'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteRegisteredUser(user)}
                          disabled={registeredUserActionId !== null}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />删除
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          </>}
        </section>
      )}
    </div>
  );
};
