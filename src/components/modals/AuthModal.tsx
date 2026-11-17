import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Mail, Lock, User, CheckCircle, AlertCircle, Key, Sparkles, UserCheck, KeyRound } from 'lucide-react';
import { hashPassword, verifyPassword } from '../../utils/password';
import { clearAdminSessionToken, setAdminSessionToken } from '../../utils/adminSession';
import { clearUserSessionToken, setUserSessionToken } from '../../utils/userSession';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

async function readApiJson(response: Response, endpointLabel: string): Promise<any> {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    const contentType = response.headers.get('content-type') || '未知';
    const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim();
    const excerpt = body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#\d+;|&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
    const detail = title || excerpt || '响应内容为空';
    throw new Error(`${endpointLabel}返回非 JSON（HTTP ${response.status}，${contentType}）：${detail}`);
  }
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
    updateAdminPassword,
    setMails,
    emailSettings,
  } = useApp();

  // Mode: 'login' | 'register' | 'reset-password' | 'reset-admin'
  const [mode, setMode] = useState<'login' | 'register' | 'reset-password' | 'reset-admin'>('login');
  // Registration submode: 'standard' (username + password) | 'email' (username + email + password)
  const [registerType, setRegisterType] = useState<'standard' | 'email'>('standard');

  // Input states
  const [account, setAccount] = useState(''); // username or email in login
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [sentCodeLength, setSentCodeLength] = useState(emailSettings.verificationCodeLength || 6);
  const [countdown, setCountdown] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetCountdown, setResetCountdown] = useState(0);
  const [deploymentSecret, setDeploymentSecret] = useState(''); // Secret to reset or authenticate admin
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Countdown timer for email verification code
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resetCountdown > 0) {
      timer = setTimeout(() => setResetCountdown(resetCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resetCountdown]);

  // Reset modal mode to login whenever modal opens or closes
  React.useEffect(() => {
    if (isOpen) {
      setMode('login');
      setRegisterType(systemSettings.emailRegistrationOnly ? 'email' : 'standard');
      setStatusMsg(null);
      setPassword('');
      setConfirmPassword('');
      setAccount('');
      setRegUsername('');
      setRegEmail('');
      setVerificationCode('');
      setSentCode(null);
      setSentCodeLength(emailSettings.verificationCodeLength || 6);
      setCountdown(0);
      setResetEmail('');
      setResetCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setResetCountdown(0);
      setDeploymentSecret('');
      setNewAdminPassword('');
    }
  }, [isOpen, systemSettings.emailRegistrationOnly]);

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
    const configuredAdminName = (adminUsername || 'fox').trim().toLowerCase();
    const isAdminAccount = normalizedInput === configuredAdminName || normalizedInput === 'fox' || normalizedInput === 'admin' || normalizedInput === 'service@whitefox.blog';

    // 1. Probe backend Cloudflare Pages Functions endpoint (/api/auth/login or /api/auth/admin)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: inputAccount, password: inputPass })
      });
      const resJson = await resp.json();
      if (!resp.ok && isAdminAccount && resJson?.message) {
        setStatusMsg({ type: 'error', text: resJson.message });
        return;
      }
      if (resp.ok) {
        if (resJson && resJson.success && resJson.user) {
          const remoteUser = resJson.user;
          if (remoteUser.role === 'admin') {
            if (!resJson.sessionToken) {
              setStatusMsg({ type: 'error', text: '管理员登录未取得服务端授权会话，请检查部署端 ADMIN_PASSWORD 和 Functions 配置。' });
              return;
            }
            setAdminSessionToken(resJson.sessionToken);
            clearUserSessionToken();
          } else {
            clearAdminSessionToken();
            if (!resJson.userSessionToken) {
              setStatusMsg({ type: 'error', text: '用户登录未取得服务端会话，无法安全同步个人文件；请更新部署后重试。' });
              return;
            }
            setUserSessionToken(resJson.userSessionToken);
          }
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

    // A production browser must never turn an offline API error into administrator access.
    if (isAdminAccount) {
      const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const localAdminPass = (adminPassword || '').trim();
      if (isLocalDevelopment && localAdminPass.length >= 6 && inputPass === localAdminPass) {
        clearAdminSessionToken();
        clearUserSessionToken();
        const adminUser = users.find(u => u.role === 'admin' || u.username.toLowerCase() === configuredAdminName) || {
          id: 'user_fox_admin',
          username: configuredAdminName,
          email: 'service@whitefox.blog',
          role: 'admin' as const,
          createdAt: Date.now(),
          status: 'active' as const,
        };
        setCurrentUser({ ...adminUser, role: 'admin' });
        setStatusMsg({ type: 'success', text: `本地开发管理员【${configuredAdminName}】登录成功。` });
        setTimeout(() => { onClose(); }, 500);
        return;
      }
      setStatusMsg({ type: 'error', text: '管理员远端验证失败。请确认 Cloudflare Pages Functions 已部署，并在后台配置 ADMIN_PASSWORD；本机开发登录仅使用已设置的管理员登录密码。' });
      return;
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

      if (!recordedPass) {
        setStatusMsg({ type: 'error', text: '该账号没有可验证的本地密码记录，请通过已配置的云端登录服务验证或重新注册。' });
        return;
      }

      if (!(await verifyPassword(recordedPass, inputPass))) {
        setStatusMsg({ type: 'error', text: '密码错误，请核对后重试' });
        return;
      }

      if (recordedPass && !recordedPass.startsWith('pbkdf2$')) {
        const upgraded = await hashPassword(inputPass);
        for (const key of [matchedUser.id, matchedUser.username, matchedUser.username.toLowerCase(), matchedUser.email, matchedUser.email.toLowerCase()]) {
          if (key && userPasswords[key] === recordedPass) userPasswords[key] = upgraded;
        }
        localStorage.setItem('fox3_user_passwords', JSON.stringify(userPasswords));
      }

      clearAdminSessionToken();
      clearUserSessionToken();
      setCurrentUser(matchedUser);
      setStatusMsg({ type: 'success', text: `本机登录成功，欢迎 ${matchedUser.username}；此账号没有服务端会话，个人文件不会跨设备同步。` });
      setTimeout(() => { onClose(); }, 500);
    } else {
      setStatusMsg({ type: 'error', text: '账号不存在或密码错误，请检查用户名/邮箱与密码' });
    }
  };

  // Send a real verification email; the code stays in the backend KV store.
  const handleSendVerificationCode = async () => {
    const trimmedEmail = regEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setStatusMsg({ type: 'error', text: '请输入有效的邮箱地址' });
      return;
    }

    setStatusMsg({ type: 'success', text: '正在向您的邮箱投递验证码，请稍候...' });

    try {
      const resp = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          username: regUsername.trim(),
        }),
      });
      const data = await readApiJson(resp, '验证码发送接口');
      if (resp.ok && data?.success && data?.externalDispatched) {
        setSentCode('sent');
        setSentCodeLength(Number(data.codeLength) || emailSettings.verificationCodeLength || 6);
        setCountdown(60);
        setStatusMsg({
          type: 'success',
          text: `验证码已发送至您的邮箱【${trimmedEmail}】，请查收邮件。`,
        });
      } else {
        setSentCode(null);
        setStatusMsg({ type: 'error', text: data?.error || '邮件发送失败，请检查发信通道配置后重试。' });
      }
    } catch (error: any) {
      setSentCode(null);
      setStatusMsg({ type: 'error', text: error?.message || '邮件服务暂不可用，请稍后重试。' });
    }
  };

  const handleSendResetCode = async () => {
    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setStatusMsg({ type: 'error', text: '请输入有效的邮箱地址' });
      return;
    }
    setStatusMsg({ type: 'success', text: '正在向您的邮箱投递验证码，请稍候...' });
    try {
      const resp = await fetch('/api/auth/reset/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await readApiJson(resp, '密码重置验证码发送接口');
      if (!resp.ok || !data?.success) {
        setStatusMsg({ type: 'error', text: data?.error || data?.message || '验证码发送失败，请稍后重试。' });
        return;
      }
      setResetCountdown(60);
      setStatusMsg({ type: 'success', text: data.message || '若该邮箱已注册，验证码将发送至邮箱。' });
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error?.message || '无法连接密码重置服务，请稍后重试。' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const email = resetEmail.trim();
    const code = resetCode.trim();
    const newPassword = resetNewPassword.trim();
    const confirmNewPassword = resetConfirmPassword.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setStatusMsg({ type: 'error', text: '请输入有效的邮箱地址' });
      return;
    }
    if (!code) {
      setStatusMsg({ type: 'error', text: '请输入邮箱验证码' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: '新密码长度至少需 6 位字符' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setStatusMsg({ type: 'error', text: '两次输入的新密码不一致，请核对' });
      return;
    }
    try {
      const resp = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await readApiJson(resp, '密码重置接口');
      if (!resp.ok || !data?.success) {
        setStatusMsg({ type: 'error', text: data?.error || '密码重置失败，请检查验证码后重试。' });
        return;
      }
      setResetCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setMode('login');
      setStatusMsg({ type: 'success', text: '密码已重置成功，请使用新密码登录。' });
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error?.message || '无法连接密码重置服务，请稍后重试。' });
    }
  };

  // Reset or specify admin password via deployment variable secret
  const handleResetAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const inputSecret = deploymentSecret.trim();
    const newPass = newAdminPassword.trim();
    const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (!isLocalDevelopment) {
      setStatusMsg({ type: 'error', text: '生产管理员密码由管理员自行设定，并仅能在 Cloudflare Dashboard → Pages → Settings → Variables and Secrets 中修改 ADMIN_PASSWORD，然后重新部署。未配置密码时管理员登录会被拒绝，不提供免密默认登录。' });
      return;
    }

    if (!newPass || newPass.length < 6) {
      setStatusMsg({ type: 'error', text: '新管理员登录密码至少需要 6 个字符' });
      return;
    }

    const effectiveAdminPass = (adminPassword || '').trim();
    const verified = effectiveAdminPass ? inputSecret === effectiveAdminPass : inputSecret === '';

    if (!verified) {
      setStatusMsg({ type: 'error', text: '当前本机管理员密码不正确' });
      return;
    }

    // Apply new admin password
    updateAdminPassword(newPass);
    const effectiveAdminName = (adminUsername || 'fox').trim().toLowerCase();
    const adminUser = users.find(u => u.role === 'admin' || u.username.toLowerCase() === effectiveAdminName) || {
      id: 'user_fox_admin',
      username: effectiveAdminName,
      email: 'service@whitefox.blog',
      role: 'admin' as const,
      createdAt: Date.now(),
      status: 'active' as const,
    };
    setCurrentUser({ ...adminUser, role: 'admin' });
    setStatusMsg({ type: 'success', text: '本机开发管理员密码已更新；此密码不会修改 Cloudflare 部署密码。' });
    setTimeout(() => { onClose(); }, 700);
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

    if (systemSettings.emailRegistrationOnly && registerType !== 'email') {
      setStatusMsg({ type: 'error', text: '当前系统已开启仅限邮箱注册，账号注册通道已关闭，请使用邮箱注册！' });
      return;
    }

    if (isEmailMode) {
      if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        setStatusMsg({ type: 'error', text: '当前模式仅限邮箱注册，请输入有效的电子邮箱地址（例如 user@example.com）' });
        return;
      }
      if (!sentCode) {
        setStatusMsg({ type: 'error', text: '请先点击“获取验证码”，并输入邮件中收到的验证码。' });
        return;
      }
      const expectedLength = sentCodeLength || 6;
      if (!verificationCode || verificationCode.trim().length !== expectedLength) {
        setStatusMsg({ type: 'error', text: `请输入收到的 ${expectedLength} 位邮箱验证码` });
        return;
      }
      try {
        const verificationResp = await fetch('/api/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, code: verificationCode.trim() }),
        });
        const verificationData = await readApiJson(verificationResp, '邮箱验证码验证接口');
        if (!verificationResp.ok || !verificationData?.success) {
          setStatusMsg({ type: 'error', text: verificationData?.error || '验证码不正确或已过期，请重新获取' });
          return;
        }
      } catch {
        setStatusMsg({ type: 'error', text: '无法连接验证码服务，请确认服务已部署后重试。' });
        return;
      }
    }

    if (!trimmedPass || trimmedPass.length < 6) {
      setStatusMsg({ type: 'error', text: '密码长度至少需 6 位字符' });
      return;
    }

    if (confirmPassword.trim() !== trimmedPass) {
      setStatusMsg({ type: 'error', text: '两次输入的密码不一致，请核对' });
      return;
    }

    // Check duplicate username or email
    const lowerUsername = trimmedUsername.toLowerCase();
    const lowerEmail = trimmedEmail ? trimmedEmail.toLowerCase() : '';

    const effectiveAdminName = (adminUsername || 'fox').trim().toLowerCase();

    // Option A: Strictly disallow registering reserved administrator names
    if (lowerUsername === effectiveAdminName || lowerUsername === 'admin' || lowerUsername === 'fox') {
      setStatusMsg({
        type: 'error',
        text: `用户名【${trimmedUsername}】为系统超级管理员保留名称，不允许注册。管理员请直接使用部署变量密码登录。`,
      });
      return;
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

    let newUser: {
      id: string;
      username: string;
      email: string;
      role: 'user';
      createdAt: number;
      status: 'active';
    };
    try {
      const registerResp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail,
          password: trimmedPass,
          verificationCode: trimmedEmail ? verificationCode.trim() : undefined,
        }),
      });
      const registerData = await readApiJson(registerResp, '账号注册接口');
      if (!registerResp.ok || !registerData?.success || !registerData?.user) {
        setStatusMsg({ type: 'error', text: registerData?.error || '注册失败，请稍后重试。' });
        return;
      }
      const serverUser = registerData.user;
      if (!serverUser.id || !serverUser.username || !serverUser.createdAt) {
        setStatusMsg({ type: 'error', text: '注册服务返回的用户信息不完整，请稍后重试。' });
        return;
      }
      newUser = {
        id: String(serverUser.id),
        username: String(serverUser.username),
        email: String(serverUser.email || ''),
        role: 'user',
        createdAt: Number(serverUser.createdAt),
        status: 'active',
      };
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error?.message || '无法连接注册服务，注册已中止。' });
      return;
    }

    // Save password mapping into localStorage
    try {
      const currentPassMap: Record<string, string> = localStorage.getItem('fox3_user_passwords')
        ? JSON.parse(localStorage.getItem('fox3_user_passwords')!)
        : {};
      const passwordHash = await hashPassword(trimmedPass);
      currentPassMap[newUser.id] = passwordHash;
      currentPassMap[newUser.username] = passwordHash;
      currentPassMap[newUser.username.toLowerCase()] = passwordHash;
      if (newUser.email) {
        currentPassMap[newUser.email] = passwordHash;
        currentPassMap[newUser.email.toLowerCase()] = passwordHash;
      }
      localStorage.setItem('fox3_user_passwords', JSON.stringify(currentPassMap));
    } catch (e) {
      console.warn('Password persistence error:', e);
      setStatusMsg({ type: 'error', text: '注册已由服务器处理，但无法保存本地密码映射，因此未自动登录。请尝试直接登录。' });
      return;
    }

    // If email registration, send welcome notification email to system mailbox
    if (trimmedEmail) {
      const welcomeMail = {
        id: `mail-welcome-${Date.now()}`,
        folder: 'inbox' as const,
        sender: 'service@whitefox.blog',
        recipient: trimmedEmail,
        subject: '【fox3 博客】恭喜账号注册成功',
        body: `尊敬的 ${newUser.username}：\n\n欢迎加入 fox3 博客社区！您的账号（邮箱：${newUser.email}）已成功完成注册。\n\n【重要提示】\n如忘记密码，您可以使用邮箱验证码重置登录密码，请确保能够访问注册邮箱。\n\n祝您阅读愉快！`,
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
      text: `注册成功！已为您自动登录为【${newUser.username}】`,
    });

    setTimeout(() => {
      onClose();
    }, 400);
  };

  const isForcedEmailReg = systemSettings.emailRegistrationOnly;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="auth-modal-panel relative flex flex-col w-full max-w-md max-h-[calc(100dvh-1rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1">
        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mb-2">
            {mode === 'login' ? <Key className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
            {mode === 'login' ? '用户登录' : mode === 'reset-password' ? '邮箱验证码重置密码' : mode === 'reset-admin' ? '管理员密码管理' : '注册新账号'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login'
              ? '支持用户名或邮箱直接登录'
              : mode === 'reset-password'
                ? '通过注册邮箱验证码安全重置登录密码'
                : mode === 'reset-admin'
                  ? '管理员登录密码与会话密钥相互独立'
                  : '注册后即刻开启专属个性化数字化空间'}
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

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(account.includes('@') ? account.trim() : '');
                  setMode('reset-password');
                  setStatusMsg(null);
                }}
                className="text-xs text-rose-500 font-semibold hover:underline cursor-pointer"
              >
                忘记密码？邮箱验证码重置
              </button>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('reset-admin');
                  setStatusMsg(null);
                  setPassword('');
                }}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
              >
                超级管理员登录问题？查看部署端 ADMIN_PASSWORD 设置说明
              </button>
            </div>
          </form>
        ) : mode === 'reset-admin' ? (
          /* RESET / SPECIFY ADMIN PASSWORD FORM */
          <form onSubmit={handleResetAdminPassword} className="space-y-4">
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/50 text-xs text-sky-800 dark:text-sky-300">
              <span className="font-semibold">管理员密码管理：</span>
              生产管理员自行设定至少 6 个字符的登录密码，可使用纯数字、字母、符号或组合；仅在 Cloudflare Pages → Settings → Variables and Secrets 中设置或修改 Secret <code>ADMIN_PASSWORD</code>，随后重新部署。本页仅允许 localhost 开发环境设置本机密码。<code>ADMIN_SESSION_SECRET</code> 是另一个独立的会话签名密钥，至少 32 个字符，不是登录密码长度要求。
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                本机当前密码（首次设置可留空）
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={deploymentSecret}
                  onChange={e => setDeploymentSecret(e.target.value)}
                  placeholder="当前本机密码；首次设置可留空"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                指定本机开发管理员密码 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  placeholder="至少 6 个字符，可自选数字或其他字符"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-xl text-sm shadow-md transition duration-200 cursor-pointer"
            >
              重置并立即登录管理员
            </button>
          </form>
        ) : mode === 'reset-password' ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs leading-relaxed text-sky-800 dark:text-sky-200">
              请输入注册时绑定的邮箱。为保护账号隐私，系统会统一提示；只有已注册邮箱且邮件服务可用时才会实际发送验证码。
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">注册邮箱</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSendResetCode()}
                  disabled={resetCountdown > 0}
                  className="shrink-0 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-semibold disabled:opacity-50"
                >
                  {resetCountdown > 0 ? `${resetCountdown}s 后重试` : '获取验证码'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">邮箱验证码</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value.trim())}
                  placeholder="输入收到的验证码"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">设置新密码（至少 6 个字符）</label>
              <input
                type="password"
                value={resetNewPassword}
                onChange={e => setResetNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">确认新密码</label>
              <input
                type="password"
                value={resetConfirmPassword}
                onChange={e => setResetConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl text-sm shadow-md">
              确认重置密码
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs leading-relaxed text-sky-800 dark:text-sky-200">
              <b>推荐使用邮箱注册：</b>验证并绑定可访问的邮箱后，可通过邮箱验证码找回并重置密码。普通用户名注册未绑定真实邮箱，无法自助找回密码。
            </div>
            {/* Registration Mode Selector Tabs */}
            {!isForcedEmailReg ? (
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterType('standard');
                    setStatusMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-center rounded-lg transition ${
                    registerType === 'standard'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
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
                    registerType === 'email'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  邮箱注册 (邮箱+密码)
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-center">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  当前系统已开启【仅限邮箱注册】，普通账号无法注册
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  新用户必须通过有效电子邮箱与密码完成实名注册
                </p>
              </div>
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
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      邮箱地址 <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
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
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={countdown > 0}
                        className={`px-3 py-2 text-xs font-medium rounded-xl border shrink-0 transition cursor-pointer ${
                          countdown > 0
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                            : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                        }`}
                      >
                        {countdown > 0 ? `${countdown}s 后重新获取` : '获取验证码'}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">注册验证码使用 Cloudflare Pages 后台发信环境变量；本浏览器保存的 SMTP/API 密钥不会随验证码请求发送。</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      邮箱验证码 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        maxLength={sentCodeLength || 6}
                        value={verificationCode}
                        onChange={e => setVerificationCode(e.target.value.trim())}
                        placeholder={`请输入收到的 ${sentCodeLength || 6} 位验证码`}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                  </div>
                </>
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

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-sm transition duration-200 cursor-pointer"
                >
                  关闭
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium rounded-xl text-sm shadow-md transition duration-200 cursor-pointer"
                >
                  确认注册并登录
                </button>
              </div>
            </form>
          </div>
        )}

        </div>
        {/* Mode Switch Footer remains visible while the form above scrolls on phones. */}
        <div className="shrink-0 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          {mode === 'login' ? (
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>还没有账号？</span>
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
            </div>
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
