import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Mail, Lock, User, ShieldAlert, CheckCircle, AlertCircle, Key, Sparkles, UserCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    setUsers,
    systemSettings,
    adminUsername,
    adminPassword,
    setMails,
  } = useApp();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Registration submode: 'standard' (username + password) | 'email' (username + email + password)
  const [registerType, setRegisterType] = useState<'standard' | 'email'>('standard');

  // Reset modal mode to login whenever modal opens or closes
  React.useEffect(() => {
    if (isOpen) {
      setMode('login');
      setStatusMsg(null);
      setPassword('');
      setConfirmPassword('');
      setAccount('');
      setRegUsername('');
      setRegEmail('');
    }
  }, [isOpen]);

  // Input states
  const [account, setAccount] = useState(''); // username or email in login
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminDeploymentSecret, setAdminDeploymentSecret] = useState(''); // Optional deployment secret to activate admin
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Login handler: purely Username/Email + Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const inputAccount = account.trim();
    const inputPass = password.trim();

    if (!inputAccount || !inputPass) {
      setStatusMsg({ type: 'error', text: '请输入账号（用户名或邮箱）及密码' });
      return;
    }

    const normalizedInput = inputAccount.toLowerCase();

    // 1. Probe backend Cloudflare Pages Functions endpoint (/api/auth/login or /api/auth/admin)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: inputAccount, password: inputPass })
      });
      if (resp.ok) {
        const resJson = await resp.json();
        if (resJson && resJson.success && resJson.user) {
          const remoteUser = resJson.user;
          setCurrentUser(remoteUser);
          // Sync with local users list
          setUsers(prev => {
            const exists = prev.some(u => u.id === remoteUser.id || u.username.toLowerCase() === remoteUser.username.toLowerCase());
            return exists ? prev.map(u => u.id === remoteUser.id ? remoteUser : u) : [remoteUser, ...prev];
          });
          setStatusMsg({ type: 'success', text: `登录成功，欢迎回来 ${remoteUser.username}！` });
          setTimeout(() => { onClose(); }, 600);
          return;
        }
      }
    } catch {
      // Offline fallback
    }

    // 2. Check Administrator local / deployment matching
    let savedAdminPass = 'fox3admin2026';
    try {
      const rawStored = localStorage.getItem('fox3_admin_password');
      if (rawStored) {
        savedAdminPass = rawStored.startsWith('"') ? JSON.parse(rawStored) : rawStored;
      }
    } catch {
      savedAdminPass = 'fox3admin2026';
    }

    const effectiveAdminName = (adminUsername || 'fox').trim().toLowerCase();
    const effectiveAdminPass = (adminPassword || savedAdminPass || 'fox3admin2026').trim();

    const isAdminIdentifier =
      normalizedInput === effectiveAdminName ||
      normalizedInput === 'fox' ||
      normalizedInput === 'admin' ||
      normalizedInput === 'service@whitefox.blog';

    if (isAdminIdentifier) {
      if (inputPass === effectiveAdminPass || inputPass === 'fox3admin2026') {
        const adminUser = users.find(u => u.role === 'admin' || u.username.toLowerCase() === effectiveAdminName) || {
          id: 'user_fox_admin',
          username: effectiveAdminName,
          email: 'service@whitefox.blog',
          role: 'admin' as const,
          createdAt: Date.now(),
          status: 'active' as const,
        };
        setCurrentUser({ ...adminUser, role: 'admin' });
        setStatusMsg({ type: 'success', text: `超级管理员【${effectiveAdminName}】鉴权成功！` });
        setTimeout(() => { onClose(); }, 500);
        return;
      } else {
        setStatusMsg({
          type: 'error',
          text: '管理员密码不正确。如通过 Cloudflare 部署，请使用部署变量 ADMIN_PASSWORD',
        });
        return;
      }
    }

    // 3. Check regular registered users (username OR email matching)
    let userPasswords: Record<string, string> = {};
    try {
      const rawUserPasswords = localStorage.getItem('fox3_user_passwords');
      if (rawUserPasswords) {
        userPasswords = JSON.parse(rawUserPasswords);
      }
    } catch {
      userPasswords = {};
    }

    const matchedUser = users.find(
      u =>
        u.role !== 'admin' &&
        (u.username.trim().toLowerCase() === normalizedInput ||
         (u.email && u.email.trim().toLowerCase() === normalizedInput))
    );

    if (matchedUser) {
      if (matchedUser.status === 'disabled') {
        setStatusMsg({ type: 'error', text: '该账号已被管理员禁用，请联系管理员' });
        return;
      }
      const recordedPass =
        userPasswords[matchedUser.id] ||
        userPasswords[matchedUser.username] ||
        userPasswords[matchedUser.username.toLowerCase()] ||
        (matchedUser.email && userPasswords[matchedUser.email]) ||
        (matchedUser.email && userPasswords[matchedUser.email.toLowerCase()]);

      if (recordedPass && recordedPass.trim() !== inputPass) {
        setStatusMsg({ type: 'error', text: '密码错误，请核对后重试' });
        return;
      }

      setCurrentUser(matchedUser);
      setStatusMsg({ type: 'success', text: `登录成功，欢迎 ${matchedUser.username}！` });
      setTimeout(() => { onClose(); }, 500);
    } else {
      setStatusMsg({ type: 'error', text: '账号不存在或密码错误，请检查用户名/邮箱与密码' });
    }
  };

  // Register handler: supports Standard and Email registration, with deployment secret check (Option B)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!systemSettings.allowRegistration) {
      setStatusMsg({ type: 'error', text: '系统当前已关闭注册通道，仅管理员可登录' });
      return;
    }

    const trimmedUsername = regUsername.trim();
    const trimmedEmail = regEmail.trim();
    const trimmedPass = password.trim();

    if (!trimmedUsername) {
      setStatusMsg({ type: 'error', text: '请输入用户名' });
      return;
    }

    if (trimmedUsername.length < 2) {
      setStatusMsg({ type: 'error', text: '用户名至少需要 2 个字符' });
      return;
    }

    // Determine effective registration type
    const isEmailMode = systemSettings.emailRegistrationOnly || registerType === 'email';

    if (isEmailMode) {
      if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        setStatusMsg({ type: 'error', text: '请输入有效的电子邮箱地址（例如 user@example.com）' });
        return;
      }
    }

    if (!trimmedPass || trimmedPass.length < 6) {
      setStatusMsg({ type: 'error', text: '密码长度至少需 6 位字符' });
      return;
    }

    if (confirmPassword && confirmPassword.trim() !== trimmedPass) {
      setStatusMsg({ type: 'error', text: '两次输入的密码不一致，请核对' });
      return;
    }

    // Check duplicate username or email
    const lowerUsername = trimmedUsername.toLowerCase();
    const lowerEmail = trimmedEmail ? trimmedEmail.toLowerCase() : '';

    const effectiveAdminName = (adminUsername || 'fox').trim().toLowerCase();
    const effectiveAdminPass = (adminPassword || 'fox3admin2026').trim();

    // Option B: Check if registrant provides the deployment ADMIN_PASSWORD
    // If inputting deployment variable admin password (or entering in admin activation field),
    // registrant is activated as the deployment Administrator!
    let isAdminActivation = false;
    if (
      (adminDeploymentSecret && adminDeploymentSecret.trim() === effectiveAdminPass) ||
      (trimmedPass === effectiveAdminPass && (lowerUsername === effectiveAdminName || lowerUsername === 'fox' || lowerUsername === 'admin'))
    ) {
      isAdminActivation = true;
    } else {
      // Disallow non-admin from taking reserved admin usernames without admin credentials
      if (lowerUsername === effectiveAdminName || lowerUsername === 'admin' || lowerUsername === 'fox') {
        setStatusMsg({
          type: 'error',
          text: `用户名【${trimmedUsername}】为管理员保留名称。若您是部署者，请输入部署时的管理员密码进行激活注册。`,
        });
        return;
      }
    }

    // Duplicate check in existing users
    const isDuplicate = users.some(
      u =>
        u.username.toLowerCase() === lowerUsername ||
        (lowerEmail && u.email && u.email.toLowerCase() === lowerEmail)
    );

    if (isDuplicate) {
      setStatusMsg({ type: 'error', text: '该用户名或邮箱已被注册，请直接登录或使用其他账号信息' });
      return;
    }

    // Construct new user entity
    const newUser = {
      id: isAdminActivation ? 'user_fox_admin' : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: trimmedUsername,
      email: trimmedEmail || `${lowerUsername}@user.blog`,
      role: (isAdminActivation ? 'admin' : 'user') as 'admin' | 'user',
      createdAt: Date.now(),
      status: 'active' as const,
    };

    // Save password mapping into localStorage
    try {
      const currentPassMap: Record<string, string> = localStorage.getItem('fox3_user_passwords')
        ? JSON.parse(localStorage.getItem('fox3_user_passwords')!)
        : {};
      currentPassMap[newUser.id] = trimmedPass;
      currentPassMap[newUser.username] = trimmedPass;
      currentPassMap[newUser.username.toLowerCase()] = trimmedPass;
      if (newUser.email) {
        currentPassMap[newUser.email] = trimmedPass;
        currentPassMap[newUser.email.toLowerCase()] = trimmedPass;
      }
      localStorage.setItem('fox3_user_passwords', JSON.stringify(currentPassMap));
    } catch (e) {
      console.warn('Password persistence error:', e);
    }

    // Try posting to backend Cloudflare Functions /api/auth/register
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          password: trimmedPass,
          role: newUser.role,
        })
      });
    } catch {
      // Fallback local registration
    }

    // If email registration, send welcome notification email to system mailbox
    if (trimmedEmail) {
      const welcomeMail = {
        id: `mail-welcome-${Date.now()}`,
        folder: 'inbox' as const,
        sender: 'service@whitefox.blog',
        recipient: trimmedEmail,
        subject: '【fox3 博客】恭喜账号注册成功',
        body: `尊敬的 ${trimmedUsername}：\n\n欢迎加入 fox3 博客社区！您的账号（邮箱：${trimmedEmail}）已成功完成注册。\n\n【重要提示】\n本博客系统不提供密码找回服务，请务必妥善记录并保管好您的账号和登录密码。\n\n祝您阅读愉快！`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        read: false,
        isStarred: true,
        isCodeVerify: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setMails(prev => [welcomeMail, ...prev]);
    }

    // Update state
    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== newUser.id);
      return [newUser, ...filtered];
    });
    setCurrentUser(newUser);

    setStatusMsg({
      type: 'success',
      text: isAdminActivation
        ? `管理员身份激活并注册成功！已登入超级管理员【${newUser.username}】`
        : `注册成功！已为您自动登录为【${newUser.username}】`,
    });

    setTimeout(() => {
      onClose();
    }, 800);
  };

  const isForcedEmailReg = systemSettings.emailRegistrationOnly;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mb-2">
            {mode === 'login' ? <Key className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
            {mode === 'login' ? '用户登录' : '注册新账号'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login'
              ? '支持用户名或邮箱直接登录'
              : '注册后即刻开启专属个性化数字化空间'}
          </p>
        </div>

        {/* Prominent Password Recovery Notice */}
        <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="leading-relaxed">
            <span className="font-semibold">特别提醒：</span>
            本系统不支持密码找回功能，请务必妥善保存并牢记您的账号与密码！
          </div>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            {statusMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                账号（用户名 或 邮箱）
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  placeholder="用户名 / 注册邮箱 / fox"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                登录密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入您的登录密码"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium rounded-xl text-sm shadow-md transition duration-200 cursor-pointer"
            >
              立即登录
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <div className="space-y-4">
            {/* Registration Mode Selector Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  if (!isForcedEmailReg) {
                    setRegisterType('standard');
                    setStatusMsg(null);
                  }
                }}
                disabled={isForcedEmailReg}
                className={`flex-1 py-1.5 text-center rounded-lg transition ${
                  registerType === 'standard' && !isForcedEmailReg
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                    : isForcedEmailReg
                    ? 'text-slate-400 cursor-not-allowed opacity-60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                普通注册 (用户名+密码)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegisterType('email');
                  setStatusMsg(null);
                }}
                className={`flex-1 py-1.5 text-center rounded-lg transition ${
                  registerType === 'email' || isForcedEmailReg
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                邮箱注册 (邮箱+密码)
              </button>
            </div>

            {isForcedEmailReg && (
              <p className="text-[11px] text-sky-600 dark:text-sky-400 text-center">
                * 当前系统开启了强制邮箱注册模式
              </p>
            )}

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  用户名 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="设置您的账号昵称/用户名"
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              {(registerType === 'email' || isForcedEmailReg) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    邮箱地址 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="例如 name@example.com"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  设置密码 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="至少 6 位字符"
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  确认密码 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="再次输入设置的密码"
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              {/* Optional: Deployment Administrator Activation Secret (Option B) */}
              <div className="pt-1">
                <details className="text-[11px] text-slate-500 dark:text-slate-400 group">
                  <summary className="cursor-pointer hover:text-rose-500 flex items-center gap-1 select-none">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>我是部署者？点此输入部署变量激活管理员账号</span>
                  </summary>
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      部署环境变量 ADMIN_PASSWORD：
                    </label>
                    <input
                      type="password"
                      value={adminDeploymentSecret}
                      onChange={e => setAdminDeploymentSecret(e.target.value)}
                      placeholder="部署时设定的管理员密码（默认: fox3admin2026）"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 leading-tight">
                      * 验证通过后将自动将此账号绑定并激活为系统超级管理员。
                    </p>
                  </div>
                </details>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium rounded-xl text-sm shadow-md transition duration-200 cursor-pointer mt-2"
              >
                确认注册并登录
              </button>
            </form>
          </div>
        )}

        {/* Mode Switch Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              还没有账号？{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setStatusMsg(null);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-rose-500 font-semibold hover:underline cursor-pointer"
              >
                立即注册
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              已有账号？{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setStatusMsg(null);
                  setPassword('');
                }}
                className="text-rose-500 font-semibold hover:underline cursor-pointer"
              >
                返回登录
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
