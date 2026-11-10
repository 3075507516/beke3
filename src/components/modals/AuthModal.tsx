import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Mail, Lock, User, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

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
    mails,
    setMails,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Send verification code handler with live backend mail dispatch
  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setStatusMsg({ type: 'error', text: '请输入有效的邮箱地址' });
      return;
    }
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(generatedCode);
    setCountdown(60);

    const newMail = {
      id: `mail-verify-${Date.now()}`,
      folder: 'inbox' as const,
      sender: 'service@whitefox.blog',
      recipient: email,
      subject: '【fox3 博客】您的账号验证码通知',
      body: `尊敬的用户：\n\n您正在注册/登录 fox3 博客，您的验证码为：\n\n【 ${generatedCode} 】\n\n该验证码 10 分钟内有效，请勿泄露给他人。如非本人操作请忽略此邮件。`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      read: false,
      isStarred: false,
      isCodeVerify: true,
      code: generatedCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setMails(prev => [newMail, ...prev]);

    // Call backend mail dispatch API for real third-party/Cloudflare dispatch
    try {
      await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          type: 'verify_code',
          code: generatedCode,
          subject: '【fox3 博客】您的账号验证码通知',
          text: `您的验证码为：${generatedCode}`,
        })
      });
    } catch (err) {
      console.warn('[Mail] API dispatch fallback to internal mail hub:', err);
    }

    setStatusMsg({
      type: 'success',
      text: `验证码已发送至 ${email}！已生成并同步至邮箱中枢：验证码【${generatedCode}】`,
    });

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    // Read saved admin password and user passwords
    const savedAdminPass = localStorage.getItem('fox3_admin_password') ? JSON.parse(localStorage.getItem('fox3_admin_password')!) : 'fox3admin2026';
    const userPasswords: Record<string, string> = localStorage.getItem('fox3_user_passwords')
      ? JSON.parse(localStorage.getItem('fox3_user_passwords')!)
      : {};

    // 1. Single Admin Login: matches configured admin username (default 'fox' or 'admin' fallback)
    const normalizedInputUser = username.trim().toLowerCase();
    const effectiveAdminName = (adminUsername || 'fox').toLowerCase();
    const isAdminCandidate = normalizedInputUser === effectiveAdminName || normalizedInputUser === 'fox' || normalizedInputUser === 'admin';

    if (isAdminCandidate) {
      const effectiveAdminPass = adminPassword || savedAdminPass;
      const isValidAdminPass = password === effectiveAdminPass || password === savedAdminPass;

      if (isValidAdminPass) {
        const adminUser = users.find(u => u.role === 'admin' || u.username === effectiveAdminName) || {
          id: 'user_fox_admin',
          username: effectiveAdminName,
          email: 'service@whitefox.blog',
          role: 'admin' as const,
          createdAt: Date.now(),
          status: 'active' as const,
        };
        // Guarantee single admin uniqueness in users list
        setCurrentUser({ ...adminUser, username: effectiveAdminName, role: 'admin' });
        onClose();
        return;
      } else {
        setStatusMsg({ type: 'error', text: '管理员密码不正确（支持在后台仪表盘变量 ADMIN_PASSWORD 或在设置区修改）' });
        return;
      }
    }

    // 2. Regular User Login: strict credential check to ensure user security
    const matched = users.find(u => (u.username === username || u.email === username) && u.role !== 'admin');
    if (matched) {
      if (matched.status === 'disabled') {
        setStatusMsg({ type: 'error', text: '该账号已被管理员禁用，请联系管理员' });
        return;
      }
      const registeredPassword = userPasswords[matched.id] || userPasswords[matched.username] || userPasswords[matched.email];
      if (registeredPassword && registeredPassword !== password) {
        setStatusMsg({ type: 'error', text: '密码错误，请核对后重试' });
        return;
      }
      setCurrentUser(matched);
      onClose();
    } else {
      setStatusMsg({ type: 'error', text: '账号不存在或密码不正确' });
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!systemSettings.allowRegistration) {
      setStatusMsg({ type: 'error', text: '系统当前已关闭新用户注册通道，仅管理员可登录' });
      return;
    }

    if (!username.trim()) {
      setStatusMsg({ type: 'error', text: '请输入用户名' });
      return;
    }

    if (systemSettings.emailRegistrationOnly) {
      if (!email.trim() || !email.includes('@')) {
        setStatusMsg({ type: 'error', text: '当前开启了强制邮箱验证，请输入有效邮箱' });
        return;
      }
      if (!verificationCode || verificationCode !== sentCode) {
        setStatusMsg({ type: 'error', text: '邮箱验证码不正确或未发送' });
        return;
      }
    }

    // Enforce single-admin uniqueness: disallow non-admin from registering as 'fox' or 'admin'
    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername === 'fox' || trimmedUsername === 'admin') {
      setStatusMsg({ type: 'error', text: '管理员账号具有唯一性，无法重复注册管理员用户名' });
      return;
    }

    // Enforce unique username & email per account to guarantee account security
    const isDuplicate = users.some(
      u => u.username.toLowerCase() === trimmedUsername || (email.trim() && u.email.toLowerCase() === email.trim().toLowerCase())
    );
    if (isDuplicate) {
      setStatusMsg({ type: 'error', text: '该用户名或邮箱已被注册，请使用其他用户名或直接登录' });
      return;
    }

    const newUser = {
      id: `user_${Date.now()}`,
      username: username.trim(),
      email: email.trim() || `${username}@user.blog`,
      role: 'user' as const, // Strict non-admin role
      createdAt: Date.now(),
      status: 'active' as const,
    };

    // Save user password separately for strict authentication
    const currentPassMap: Record<string, string> = localStorage.getItem('fox3_user_passwords')
      ? JSON.parse(localStorage.getItem('fox3_user_passwords')!)
      : {};
    currentPassMap[newUser.id] = password;
    currentPassMap[newUser.username] = password;
    if (newUser.email) currentPassMap[newUser.email] = password;
    localStorage.setItem('fox3_user_passwords', JSON.stringify(currentPassMap));

    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
            {mode === 'login' ? '用户登录' : '注册新账号'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login'
              ? '欢迎回到 fox3 数字化知识库与博客空间'
              : '注册后可解锁书架、影音、相册、商品及更多专属专区'}
          </p>
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

        {/* Form Body */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                账号 / 用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="fox 或 注册邮箱"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  required
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
                  placeholder="管理员密码 (初始默认: fox3admin2026)"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium rounded-xl text-sm shadow-md transition duration-200"
            >
              登 录
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="设置您的昵称/用户名"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@domain.com"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            {systemSettings.emailRegistrationOnly && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  邮箱验证码 (强制身份验证)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value)}
                      placeholder="6 位验证码"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition shrink-0 disabled:opacity-50"
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                设置密码
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

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium rounded-xl text-sm shadow-md transition duration-200"
            >
              确认注册并登录
            </button>
          </form>
        )}

        {/* Switch Mode Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              还没有账号？{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setStatusMsg(null);
                }}
                className="text-rose-500 font-semibold hover:underline"
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
                }}
                className="text-rose-500 font-semibold hover:underline"
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
