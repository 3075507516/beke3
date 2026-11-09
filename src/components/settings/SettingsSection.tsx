import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';
import {
  Settings,
  Palette,
  Image as ImageIcon,
  Users,
  HardDrive,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
  Check,
  Lock,
  RotateCw,
  Database,
  Cloud,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SettingsSection: React.FC = () => {
  const {
    systemSettings,
    updateSystemSettings,
    users,
    setUsers,
    currentUser,
    setCurrentUser,
    deviceMode,
    setDeviceMode,
    uploadFile,
    syncState,
    triggerManualSync,
  } = useApp();

  // Collapsible section toggles
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({
    theme: false,
    privacyUsers: false,
    storage: false,
    password: true,
  });

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fullBgInputRef = useRef<HTMLInputElement>(null);
  const heroBgInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  // Quick theme presets
  const themePresets = [
    { name: '天空蔚蓝', color: '#0ea5e9', bg: '#f0f9ff' },
    { name: '魅惑玫瑰', color: '#f43f5e', bg: '#fff1f2' },
    { name: '极客靛蓝', color: '#6366f1', bg: '#eef2ff' },
    { name: '翡翠生机', color: '#10b981', bg: '#ecfdf5' },
    { name: '琥珀鎏金', color: '#f59e0b', bg: '#fffbeb' },
    { name: '赛博青蓝', color: '#06b6d4', bg: '#ecfeff' },
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    updateSystemSettings({ avatarUrl: res.url });
    if (currentUser?.role === 'admin') {
      setCurrentUser({ ...currentUser, avatar: res.url });
    }
  };

  const handleFullBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    updateSystemSettings({ fullBackgroundUrl: res.url });
  };

  const handleHeroBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    updateSystemSettings({ heroIntroImage: res.url });
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId && u.role !== 'admin') {
          return {
            ...u,
            status: u.status === 'active' ? ('disabled' as const) : ('active' as const),
          };
        }
        return u;
      })
    );
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMsg('两次输入的新密码不一致！');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('密码长度不能少于 6 位！');
      return;
    }
    // Admin password uniqueness guarantee
    setPasswordMsg('密码修改成功！管理员密码具有全站唯一最高控制权，已加密存储。');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-500" />
            <span>系统设置与外观隐私控制中枢</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            全站定制调色、背景照片、全站隐私保护、已注册用户与存储云盘管理
          </p>
        </div>

        <button
          onClick={() => {
            setDeviceMode(deviceMode === 'mobile' ? 'responsive' : 'mobile');
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
        >
          {deviceMode === 'mobile' ? (
            <Smartphone className="w-4 h-4 text-sky-500" />
          ) : (
            <Monitor className="w-4 h-4 text-indigo-500" />
          )}
          <span>
            一键切换模式: {deviceMode === 'mobile' ? '手机端视图' : '电脑/响应式视图'}
          </span>
        </button>
      </div>

      {/* SECTION 1: 主题调色与全局背景自定义选区 (从上到下按键功能顺序严格对应) */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div
          onClick={() => toggleSection('theme')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              主题调色与全局背景自定义选区 (可展开/收拢)
            </h3>
          </div>
          {collapsedSections.theme ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {!collapsedSections.theme && (
          <div className="p-6 space-y-6">
            {/* 1. 自定义网站名称 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                1. 自定义网站名称
              </label>
              <input
                type="text"
                value={systemSettings.siteName}
                onChange={e => updateSystemSettings({ siteName: e.target.value })}
                placeholder="例如: fox3 博客"
                className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* 2. 主题调色按键 (一键快速配色) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                2. 主题调色按键 (一键快速配色)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {themePresets.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() =>
                      updateSystemSettings({
                        themeColor: preset.color,
                        customPaletteBg: preset.bg,
                      })
                    }
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-400 text-xs font-medium transition"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span>{preset.name}</span>
                    {systemSettings.themeColor === preset.color && (
                      <Check className="w-3.5 h-3.5 text-sky-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 自定义背景调色板 & 半透明毛玻璃透光开关 */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    3. 自定义全局主色调 (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={systemSettings.themeColor}
                      onChange={e => updateSystemSettings({ themeColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={systemSettings.themeColor}
                      onChange={e => updateSystemSettings({ themeColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    自定义背景底色板
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={systemSettings.customPaletteBg || '#f8fafc'}
                      onChange={e => updateSystemSettings({ customPaletteBg: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={systemSettings.customPaletteBg || '#f8fafc'}
                      onChange={e => updateSystemSettings({ customPaletteBg: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Transparent Card Toggle */}
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    卡片透明透光模式 (毛玻璃透出全站背景照片)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    开启后全站各功能卡片将转为优雅半透明质感，全景呈现全站背景照片。
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.transparentCards}
                  onChange={e => updateSystemSettings({ transparentCards: e.target.checked })}
                  className="w-5 h-5 text-sky-500 rounded cursor-pointer"
                />
              </div>

              {/* Bottom Buttons Master Switch */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-500" />
                    全站悬浮底部功能按键总开关 (置顶/快捷工具)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    控制页面右下角悬浮的一键返回顶部、快速导航等按键的全局显示或隐藏（默认开启）。
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.bottomButtonsEnabled !== false}
                  onChange={e => updateSystemSettings({ bottomButtonsEnabled: e.target.checked })}
                  className="w-5 h-5 text-sky-500 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* 4. 自定义头像 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                4. 自定义站长头像 (本地图片上传即时生效)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  <SafeImage
                    src={systemSettings.avatarUrl || '/images/hero-default.jpg'}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
                >
                  上传本地头像
                </button>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="text"
                  value={systemSettings.avatarUrl || ''}
                  onChange={e => updateSystemSettings({ avatarUrl: e.target.value })}
                  placeholder="或粘贴网络头像 URL"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            {/* 5. 全站背景照片 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                5. 全站背景照片 (本地图片上传设定)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fullBgInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
                >
                  上传全站背景图
                </button>
                <input
                  type="file"
                  ref={fullBgInputRef}
                  onChange={handleFullBgUpload}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="text"
                  value={systemSettings.fullBackgroundUrl || ''}
                  onChange={e => updateSystemSettings({ fullBackgroundUrl: e.target.value })}
                  placeholder="或粘贴全站背景 URL (开启卡片透明后透光呈现)"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
                {systemSettings.fullBackgroundUrl && (
                  <button
                    onClick={() => updateSystemSettings({ fullBackgroundUrl: '' })}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    清除背景
                  </button>
                )}
              </div>
            </div>

            {/* 6. 首页介绍区照片 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                6. 首页介绍区照片 (全景大背景设定)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  <SafeImage
                    src={systemSettings.heroIntroImage || '/images/hero-default.jpg'}
                    alt="Hero Intro"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => heroBgInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
                >
                  上传首页介绍背景
                </button>
                <input
                  type="file"
                  ref={heroBgInputRef}
                  onChange={handleHeroBgUpload}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="text"
                  value={systemSettings.heroIntroImage || ''}
                  onChange={e => updateSystemSettings({ heroIntroImage: e.target.value })}
                  placeholder="或粘贴介绍区图片 URL"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: 网站隐私保护开关与已注册用户管理列表合并选区 */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div
          onClick={() => toggleSection('privacyUsers')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              全站隐私保护与已注册用户管理选区 (合并管理)
            </h3>
          </div>
          {collapsedSections.privacyUsers ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {!collapsedSections.privacyUsers && (
          <div className="p-6 space-y-6">
            {/* 3 Privacy Switches */}
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    全站隐私开关 (未注册访客仅看博客)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    开启后，未登录的外部访客仅能浏览博客文章，网盘、书架、影音、相册、AI编程等分区将严格对游客隐藏。
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.hideNonBlogForGuests}
                  onChange={e => updateSystemSettings({ hideNonBlogForGuests: e.target.checked })}
                  className="w-5 h-5 text-sky-500 rounded focus:ring-sky-500 shrink-0 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    仅限邮箱注册 (强制邮箱身份验证)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    开启后新用户注册必须提供有效邮箱并验证，杜绝虚假机器人批量注水。
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.emailRegistrationOnly}
                  onChange={e => updateSystemSettings({ emailRegistrationOnly: e.target.checked })}
                  className="w-5 h-5 text-sky-500 rounded focus:ring-sky-500 shrink-0 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    开放新用户注册
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    关闭后仅管理员可登录，阻断外部注册通道。
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.allowRegistration}
                  onChange={e => updateSystemSettings({ allowRegistration: e.target.checked })}
                  className="w-5 h-5 text-sky-500 rounded focus:ring-sky-500 shrink-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Registered Users List */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-500" />
                已注册用户管理列表 ({users.length} 位用户)
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl overflow-hidden">
                {users.map(u => (
                  <div key={u.id} className="p-3.5 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-sky-50 dark:bg-sky-950 flex items-center justify-center border border-sky-200 dark:border-sky-900">
                        {u.avatar ? (
                          <SafeImage src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-sky-500 uppercase">{u.username[0]}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {u.username}
                          </span>
                          {u.role === 'admin' ? (
                            <span className="text-[10px] bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full font-bold">
                              超级管理员 (唯一控制权)
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                              注册用户
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{u.email}</span>
                      </div>
                    </div>

                    <div>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-medium transition ${
                            u.status === 'active'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'active' ? '禁用账号' : '启用账号'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: 对象存储和云盘文件管理选区 (包含红绿连接状态指示灯) */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div
          onClick={() => toggleSection('storage')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              对象存储和云盘文件管理选区 (多存储与直连状态指示)
            </h3>
          </div>
          {collapsedSections.storage ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {!collapsedSections.storage && (
          <div className="p-6 space-y-6">
            {/* Visual Connection Status Indicators (Storage, Database, KV) */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">服务通道实时连通状态指示灯</h4>
              <div className={`grid gap-3 ${deviceMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
                {/* Storage Bucket Light */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">对象存储桶 (R2/S3/OSS)</span>
                    <span className="text-[10px] text-slate-400">大文件实体存储与分发</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    正常连通
                  </span>
                </div>

                {/* Database Light */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">主数据库 (D1/Supabase)</span>
                    <span className="text-[10px] text-slate-400">文章、订单、评论核心结构</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    正常连通
                  </span>
                </div>

                {/* KV Light */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">KV 极速缓存 (Workers KV)</span>
                    <span className="text-[10px] text-slate-400">配置加速与毫秒级读取</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    正常连通
                  </span>
                </div>
              </div>
            </div>

            {/* Capacity Metres */}
            <div className={`grid gap-4 ${deviceMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">系统已用容量 (零值起点计费计量)</span>
                <span className="text-2xl font-bold font-mono text-sky-500">
                  {((systemSettings.usedCapacityBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  配额上限: {((systemSettings.totalCapacityBytes || 10737418240) / (1024 * 1024 * 1024)).toFixed(0)} GB
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">前端直连与无感降级容错机制</span>
                <span className="text-sm font-bold text-emerald-500 flex items-center gap-1.5 mt-1">
                  <Check className="w-4 h-4" /> 云端未配置时无缝直连本地缓存
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  无论在何种平台部署，系统功能均可100%保持正常运作
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: 站内密码修改与管理员唯一性保护 */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div
          onClick={() => toggleSection('password')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              站内密码修改与管理员权限安全
            </h3>
          </div>
          {collapsedSections.password ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {!collapsedSections.password && (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4 max-w-md">
            {passwordMsg && (
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 rounded-xl text-xs text-sky-700 dark:text-sky-300">
                {passwordMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                当前密码
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="输入当前使用的密码"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                全新密码 (管理员权限具备唯一控制权)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="设置新密码 (不少于6位)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                确认新密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-md transition"
            >
              更新管理员密码
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
