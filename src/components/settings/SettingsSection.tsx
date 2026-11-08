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
  Upload,
  Lock,
  UserCheck,
  MailCheck,
  UserX,
} from 'lucide-react';

export const SettingsSection: React.FC = () => {
  const {
    systemSettings,
    updateSystemSettings,
    users,
    setUsers,
    deviceMode,
    setDeviceMode,
    uploadFile,
  } = useApp();

  // Collapsible section toggles matching exact requirements
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({
    theme: false,
    privacy: false,
    users: false,
    storage: false,
  });

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fullBgInputRef = useRef<HTMLInputElement>(null);
  const heroBgInputRef = useRef<HTMLInputElement>(null);

  // Quick theme presets
  const themePresets = [
    { name: '魅惑玫瑰', color: '#f43f5e', bg: '#fff1f2' },
    { name: '极客靛蓝', color: '#6366f1', bg: '#eef2ff' },
    { name: '翡翠生机', color: '#10b981', bg: '#ecfdf5' },
    { name: '琥珀鎏金', color: '#f59e0b', bg: '#fffbeb' },
    { name: '赛博青蓝', color: '#06b6d4', bg: '#ecfeff' },
    { name: '深邃暗夜', color: '#475569', bg: '#f8fafc' },
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    updateSystemSettings({ avatarUrl: res.url });
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-rose-500" />
            <span>系统设置与外观隐私控制中枢</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            全站定制调色、背景照片、全站隐私防爬策略、已注册用户与存储云盘管理
          </p>
        </div>

        {/* One-click toggle device layout (Phone vs Desktop) */}
        <button
          onClick={() => {
            if (deviceMode === 'responsive') setDeviceMode('mobile');
            else if (deviceMode === 'mobile') setDeviceMode('desktop');
            else setDeviceMode('responsive');
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
        >
          {deviceMode === 'mobile' ? (
            <Smartphone className="w-4 h-4 text-rose-500" />
          ) : (
            <Monitor className="w-4 h-4 text-blue-500" />
          )}
          <span>
            一键切换模式: {deviceMode === 'responsive' ? '响应式' : deviceMode === 'mobile' ? '手机端' : '电脑端'}
          </span>
        </button>
      </div>

      {/* SECTION 1: 主题调色与全局背景自定义选区 (可打开和收拢) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <div
          onClick={() => toggleSection('theme')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              主题调色与全局背景自定义选区
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
                className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-400 text-xs font-medium transition"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span>{preset.name}</span>
                    {systemSettings.themeColor === preset.color && (
                      <Check className="w-3.5 h-3.5 text-rose-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 自定义背景调色板 */}
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

            {/* 4. 自定义头像 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                4. 自定义站长头像 (本地图片上传即时生效)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  <SafeImage
                    src={systemSettings.avatarUrl || ''}
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
                  placeholder="或粘贴全站背景 URL (留空则使用纯净极简底色)"
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
                6. 首页介绍区照片 (本地图片上传设定并即时呈现背景可视化)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                  <SafeImage
                    src={systemSettings.heroIntroImage || ''}
                    alt="Hero Intro"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => heroBgInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
                >
                  上传首页介绍封面
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

      {/* SECTION 2: 注册与隐私策略选区 (可打开和收拢) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <div
          onClick={() => toggleSection('privacy')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              注册和隐私区策略说明与控制
            </h3>
          </div>
          {collapsedSections.privacy ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {!collapsedSections.privacy && (
          <div className="p-6 space-y-4">
            {/* Switch 1: 全站隐私开关 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  全站隐私保护开关 (未注册访客仅看博客)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  开启后，未登录的外部访客仅能浏览博客文章，网盘、书架、影音、相册、AI编程等分区将严格对游客隐藏。
                </p>
              </div>
              <input
                type="checkbox"
                checked={systemSettings.hideNonBlogForGuests}
                onChange={e => updateSystemSettings({ hideNonBlogForGuests: e.target.checked })}
                className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500 shrink-0 cursor-pointer"
              />
            </div>

            {/* Switch 2: 仅限邮箱注册 */}
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
                className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500 shrink-0 cursor-pointer"
              />
            </div>

            {/* Switch 3: 开放新用户注册 */}
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
                className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500 shrink-0 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: 已注册用户管理列表选区 (可打开和收拢) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <div
          onClick={() => toggleSection('users')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              已注册用户管理列表选区 ({users.length} 位用户)
            </h3>
          </div>
          {collapsedSections.users ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {!collapsedSections.users && (
          <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
            {users.map(u => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-rose-50 dark:bg-rose-950 flex items-center justify-center border border-rose-200 dark:border-rose-900">
                    {u.avatar ? (
                      <SafeImage src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-rose-500 uppercase">{u.username[0]}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {u.username}
                      </span>
                      {u.role === 'admin' ? (
                        <span className="text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">
                          超级管理员
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

                <div className="flex items-center gap-2">
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
        )}
      </div>

      {/* SECTION 4: 对象存储和云盘文件管理选区 (可打开和收拢) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <div
          onClick={() => toggleSection('storage')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              对象存储和云盘文件管理选区
            </h3>
          </div>
          {collapsedSections.storage ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {!collapsedSections.storage && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">系统已用容量 (零值起点计费计量)</span>
                <span className="text-2xl font-bold font-mono text-rose-500">
                  {((systemSettings.usedCapacityBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  配额上限: {((systemSettings.totalCapacityBytes || 10737418240) / (1024 * 1024 * 1024)).toFixed(0)} GB
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">R2 存储桶状态</span>
                <span className="text-base font-bold text-emerald-500 flex items-center gap-1.5 mt-1">
                  <Check className="w-4 h-4" /> Cloudflare R2 双模自动流式托管已就绪
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  未配置密钥时自动转入 IndexedDB 零故障离线安全存储
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
