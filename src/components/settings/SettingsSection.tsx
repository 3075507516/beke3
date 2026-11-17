import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';
import { loadLocalStorage, saveLocalStorage } from '../../utils/storage';
import {
  Settings,
  Palette,
  Image as ImageIcon,
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
  Sun,
  Moon,
  Save,
  FolderSync,
  FileArchive,
  RotateCcw,
  Trash2,
  ShieldCheck,
  CheckCircle,
  Globe,
  Calendar as CalendarIcon,
  Languages,
  Clock,
} from 'lucide-react';
import { WebDavBackupItem, GlobalThemeMode } from '../../types';
import { listWebDavFiles } from '../../utils/webdav';

export const SettingsSection: React.FC = () => {
  const {
    systemSettings,
    updateSystemSettings,
    currentUser,
    setCurrentUser,
    deviceMode,
    setDeviceMode,
    uploadFile,
    t,
    syncState,
    triggerManualSync,
    channelConnected,
    cloudServicesStatus,
    refreshChannelStatus,
    showToast,
  } = useApp();

  const {
    webDavConfig,
    updateWebDavConfig,
    webDavBackups,
    setWebDavBackups,
    trashItems,
    restoreFromTrash,
    permanentDeleteFromTrash,
    emptyTrash,
    performBackup,
    performRestore,
    testWebDavConnection,
    webDavConnectionState,
    deleteWebDavBackup,
    themeMode,
    setThemeMode,
  } = useApp();

  // In-page translator state with custom API support
  const [translateSource, setTranslateSource] = useState('zh');
  const [translateTarget, setTranslateTarget] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [translateConfig, setTranslateConfig] = useState<{
    engine: 'free' | 'custom';
    apiUrl: string;
    apiKey: string;
  }>(() => loadLocalStorage('fox3_translate_config', {
    engine: 'free',
    apiUrl: 'https://api.mymemory.translated.net/get',
    apiKey: '',
  }));

  const [translateDraft, setTranslateDraft] = useState(translateConfig);
  const [isTranslateSaved, setIsTranslateSaved] = useState(false);

  const handleSaveTranslateConfig = () => {
    setTranslateConfig(translateDraft);
    saveLocalStorage('fox3_translate_config', translateDraft);
    setIsTranslateSaved(true);
    showToast('外部翻译 API 配置已成功保存并即时生效！', 'success');
    setTimeout(() => setIsTranslateSaved(false), 2000);
  };

  // Timezone options
  const timezoneOptions = [
    { label: '北京时间 / 中国标准时间 (UTC+8)', value: 'Asia/Shanghai' },
    { label: '世界标准时间 (UTC)', value: 'UTC' },
    { label: '东京时间 (UTC+9)', value: 'Asia/Tokyo' },
    { label: '伦敦时间 (UTC+0 / GMT)', value: 'Europe/London' },
    { label: '纽约时间 (UTC-5 / EST)', value: 'America/New_York' },
    { label: '洛杉矶时间 (UTC-8 / PST)', value: 'America/Los_Angeles' },
  ];

  // Collapsible section toggles: default to collapsed (true = collapsed, false = open)
  // State is persisted in localStorage so user preferences are remembered!
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>(() => {
    const saved = loadLocalStorage<{ [key: string]: boolean }>('fox3_settings_collapsed_state', {
      theme: true,
      themeCenter: true,
      privacy: true,
      storage: true,
      webdav: true,
      password: true,
    });
    return { ...saved, privacy: saved.privacy ?? saved.privacyUsers ?? true };
  });

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveLocalStorage('fox3_settings_collapsed_state', next);
      return next;
    });
  };

  // WebDAV form state inside merged panel - Keep in sync with webDavConfig
  const [formConfig, setFormConfig] = useState(webDavConfig);
  useEffect(() => {
    setFormConfig(webDavConfig);
  }, [webDavConfig]);

  const [isSaved, setIsSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [backupScope, setBackupScope] = useState<'full' | 'posts' | 'books' | 'media' | 'settings'>('full');

  // A filled form is not a connection: only successful authenticated PROPFIND marks green.
  const isWebDavVerified = webDavConnectionState.status === 'connected';

  const handleSaveWebDavConfig = async () => {
    updateWebDavConfig(formConfig);
    setIsSaved(true);
    setActionMessage('配置已保存到当前浏览器，正在验证 WebDAV 服务器…');
    const connected = await testWebDavConnection(formConfig);
    if (!connected) {
      setActionMessage('配置已保存到本机，但远端连通验证失败；检查服务地址、账号、应用密码和 HTTPS 部署。');
    } else {
      try {
        const files = await listWebDavFiles(formConfig);
        setWebDavBackups(files);
        setActionMessage(`WebDAV 已验证并读到 ${files.length} 个远端文件。`);
      } catch (error: any) {
        setActionMessage(error?.message || 'WebDAV 已连接，但读取远端列表失败。');
      }
    }
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setActionMessage('正在向 WebDAV 服务端发起真实认证请求…');
    const connected = await testWebDavConnection(formConfig);
    setTestingConnection(false);
    if (!connected) {
      setActionMessage('WebDAV 连通性验证失败；状态灯显示未连接。');
      return;
    }
    try {
      const files = await listWebDavFiles(formConfig);
      setWebDavBackups(files);
      setActionMessage(`连接验证成功，已从远端读取 ${files.length} 个文件。`);
    } catch (error: any) { setActionMessage(error?.message || '连接成功，但远端目录读取失败。'); }
  };

  const handleQuickTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);

    try {
      // 1. If custom API is configured and enabled
      if (translateConfig.engine === 'custom' && translateConfig.apiUrl) {
        const res = await fetch(translateConfig.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(translateConfig.apiKey ? { Authorization: `Bearer ${translateConfig.apiKey}` } : {}),
          },
          body: JSON.stringify({
            q: sourceText,
            source: translateSource,
            target: translateTarget,
            format: 'text',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const translated = data?.translatedText || data?.choices?.[0]?.message?.content || data?.result;
          if (translated) {
            setTranslatedText(translated);
            setIsTranslating(false);
            return;
          }
        }
      }

      // 2. Public high-availability free translator API (MyMemory)
      const langPair = `${translateSource}|${translateTarget}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sourceText)}&langpair=${langPair}`;
      const apiRes = await fetch(url).catch(() => null);

      if (apiRes && apiRes.ok) {
        const json = await apiRes.json();
        if (json?.responseData?.translatedText) {
          setTranslatedText(json.responseData.translatedText);
          setIsTranslating(false);
          return;
        }
      }

      // 3. Fallback dictionary
      const basicDictZhToEn: Record<string, string> = {
        'fox3': 'fox3',
        '博客': 'Blog',
        '你好': 'Hello',
        '世界': 'World',
        '欢迎': 'Welcome',
        '部署': 'Deploy',
        '设置': 'Settings',
        'WebDAV': 'NutStore',
        '文章': 'Post',
        '书架': 'Bookshelf',
        '相册': 'Gallery',
        '影音': 'Media',
        '商品': 'Shop',
        '邮箱': 'Mail',
        '订单': 'Orders',
        '密码': 'Password',
        '管理员': 'Administrator',
      };
      const basicDictEnToZh: Record<string, string> = {
        'fox3': 'fox3',
        'blog': '博客',
        'hello': '你好',
        'world': '世界',
        'welcome': '欢迎',
        'deploy': '部署',
        'settings': '设置',
        'nutstore': 'WebDAV',
        'post': '文章',
        'bookshelf': '书架',
        'gallery': '相册',
        'media': '影音',
        'shop': '商品',
        'mail': '邮箱',
        'order': '订单',
        'password': '密码',
        'admin': '管理员',
      };

      const lower = sourceText.toLowerCase().trim();
      if (translateTarget === 'zh' && basicDictEnToZh[lower]) {
        setTranslatedText(basicDictEnToZh[lower]);
      } else if (translateTarget === 'en' && basicDictZhToEn[sourceText.trim()]) {
        setTranslatedText(basicDictZhToEn[sourceText.trim()]);
      } else {
        setTranslatedText(translateTarget === 'en' ? `[EN Translation]: ${sourceText}` : `[中文翻译]: ${sourceText}`);
      }
    } catch {
      setTranslatedText(translateTarget === 'en' ? `[EN]: ${sourceText}` : `[ZH]: ${sourceText}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      await performBackup(backupScope);
      const files = await listWebDavFiles(webDavConfig);
      setWebDavBackups(files);
      setActionMessage('备份已由 WebDAV 服务器确认接收并重新读取远端目录。');
    } catch (error: any) { setActionMessage(error?.message || 'WebDAV 备份失败，未标记为成功。'); }
  };

  const handleRestoreBackup = async (item: WebDavBackupItem) => {
    if (!window.confirm(`确定要从备份包【${item.name}】选择还原系统数据吗？`)) return;
    const success = await performRestore(item.id);
    setActionMessage(success ? `数据已从 WebDAV 文件【${item.name}】恢复。` : '恢复失败；请确认这是本站生成的 fox3 JSON 快照。');
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm('确认从 WebDAV 远端永久删除该文件吗？')) return;
    const success = await deleteWebDavBackup(id);
    setActionMessage(success ? '远端文件已成功删除。' : '远端删除失败；列表未移除。');
  };

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fullBgInputRef = useRef<HTMLInputElement>(null);
  const heroBgInputRef = useRef<HTMLInputElement>(null);

  const { adminUsername, adminPassword, updateAdminPassword, updateAdminUsername } = useApp();

  // Password & Username change state
  const [customAdminName, setCustomAdminName] = useState(adminUsername);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  useEffect(() => {
    setCustomAdminName(adminUsername);
  }, [adminUsername]);

  // Comprehensive Nostalgic & Distinct Aesthetic Themes (16 Full Themes)
  const aestheticThemes: {
    id: GlobalThemeMode;
    name: string;
    icon: string;
    color: string;
    bg: string;
    desc: string;
  }[] = [
    { id: 'modern', name: '现代流体玻璃', icon: '✨', color: '#0ea5e9', bg: '#f8fafc', desc: '极简现代流体设计、优雅微投影与半透明层次' },
    { id: 'win98', name: '微软 Windows 98 怀旧', icon: '🪟', color: '#000080', bg: '#008080', desc: '经典青绿视窗桌面、3D 凸面控制按钮与复古边框' },
    { id: 'mac-classic', name: '麦金塔 Classic Platinum', icon: '🍏', color: '#333333', bg: '#7b8893', desc: '早期 Mac 经典质感金属灰底色与条纹浮雕视窗' },
    { id: 'terminal', name: 'Matrix 极客终端', icon: '💻', color: '#22c55e', bg: '#050d08', desc: '黑客绿字控制台、荧光字符与高对比黑底' },
    { id: 'parchment', name: '复古报纸羊皮纸', icon: '📜', color: '#8c7853', bg: '#f4ecd8', desc: '古典衬线排版、米黄做旧纸质触感与墨水印迹' },
    { id: 'gameboy', name: '8-Bit 掌机像素', icon: '🎮', color: '#306230', bg: '#8bac0f', desc: '复古 GameBoy 四色点阵绿屏与怀旧像素边框' },
    { id: 'cyberpunk', name: '赛博朋克霓虹', icon: '⚡', color: '#f72585', bg: '#0d0221', desc: '夜之城暗紫底色、高饱和荧光粉青双色光晕' },
    { id: 'steampunk', name: '蒸汽朋克黄铜', icon: '⚙️', color: '#d4af37', bg: '#2b1d0c', desc: '复古机械黄铜齿轮金棕、古典雕纹边饰' },
    { id: 'nordic', name: '北欧极简原木', icon: '❄️', color: '#5e81ac', bg: '#eceff4', desc: '冷淡雪原灰蓝、舒缓柔和的纯净自然极简' },
    { id: 'leather', name: '复古皮质笔记本', icon: '📔', color: '#cdaa7d', bg: '#3d2314', desc: '深褐皮革压纹质感、手工书缝纫边与暖调内页' },
    { id: 'blueprint', name: '工程架构蓝图', icon: '📐', color: '#328cc1', bg: '#0b3c5d', desc: '经典建筑施工深蓝背景、白色线框坐标网格' },
    { id: 'aurora-glass', name: '极光玻璃', icon: '🌌', color: '#14b8a6', bg: '#102a43', desc: '深海蓝渐层、青绿极光与通透玻璃层' },
    { id: 'neo-brutal', name: '新野兽派', icon: '🟨', color: '#facc15', bg: '#fff7d6', desc: '高对比原色、粗黑描边与硬朗投影' },
    { id: 'soft-pastel', name: '柔雾粉彩', icon: '🌷', color: '#c084fc', bg: '#fbf5ff', desc: '低饱和薰衣草、奶油白和柔和圆角' },
    { id: 'midnight-luxe', name: '午夜奢华', icon: '🌙', color: '#d6b36a', bg: '#111318', desc: '午夜墨色、香槟金点缀与精致衬线字' },
    { id: 'editorial', name: '编辑部留白', icon: '📰', color: '#c2410c', bg: '#f7f5f0', desc: '纸本文字排版、克制橘红与清晰分隔线' },
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

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!isLocalDevelopment) {
      setPasswordMsg('生产管理员自行选择至少 6 个字符的登录密码（可为数字或任意字符），仅在 Cloudflare Pages → Settings → Variables and Secrets 设置 ADMIN_PASSWORD 后重新部署。本页不能修改部署 Secret；ADMIN_SESSION_SECRET 是独立且至少 32 字符的会话密钥。');
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMsg('两次输入的新密码不一致，请重新核对！');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('密码长度不能少于 6 位！');
      return;
    }

    // Verify current admin password
    const validCurrent = adminPassword || '';
    if (currentPassword !== validCurrent) {
      setPasswordMsg('当前密码输入不正确，请重新输入！');
      return;
    }

    // Apply update and guarantee uniqueness
    updateAdminPassword(newPassword);
    if (customAdminName && customAdminName.trim() !== adminUsername) {
      updateAdminUsername(customAdminName.trim());
    }
    setPasswordMsg(`本机开发管理员密码已更新；不会修改 Cloudflare 部署 Secret。`);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordMsg(null), 5000);
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
            全站定制调色、夜间模式、背景照片、隐私保护与存储云盘管理
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              {deviceMode === 'mobile' ? '手机端视图' : '电脑/响应式视图'}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 1: 主题调色与全局背景自定义选区 (从上到下按键功能顺序严格对应) */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!collapsedSections.theme}
          onClick={() => toggleSection('theme')}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleSection('theme');
            }
          }}
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
            {/* 1. 自定义网站名称 与 全站时区设定 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. {t('settings.siteName')}
                </label>
                <input
                  type="text"
                  value={systemSettings.siteName}
                  onChange={e => updateSystemSettings({ siteName: e.target.value })}
                  placeholder="fox3"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>全站时区设定 (Timezone)</span>
                </label>
                <select
                  value={systemSettings.timezone || 'Asia/Shanghai'}
                  onChange={e => updateSystemSettings({ timezone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {timezoneOptions.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. 深度定制与全站怀旧/风格主题中心 (16 款独立风格主题) */}
            <div>
              <button type="button" aria-expanded={!collapsedSections.themeCenter} onClick={() => toggleSection('themeCenter')} className="w-full flex items-center justify-between mb-2 rounded-xl p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Palette className="w-4 h-4 text-sky-500" />2. 怀旧与设计风格主题中心 (16 款)</span>
                {collapsedSections.themeCenter ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
              </button>
              {!collapsedSections.themeCenter && <>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-sky-500" />
                  <span>2. 怀旧与设计风格主题中心 (已内置 16 款独立风格主题)</span>
                </label>
                <span className="text-[11px] text-slate-400">深度重塑界面边框、质感、阴影与系统气质</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                {aestheticThemes.map(theme => {
                  const isCurrent = themeMode === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setThemeMode(theme.id);
                        updateSystemSettings({
                          themeColor: theme.color,
                          customPaletteBg: theme.bg,
                        });
                      }}
                      className={`flex flex-col justify-between p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        isCurrent
                          ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/80 dark:bg-sky-950/50 shadow-md scale-[1.01]'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{theme.icon}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {theme.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-inner border border-black/10"
                            style={{ backgroundColor: theme.color }}
                            title="主色"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-inner border border-black/10"
                            style={{ backgroundColor: theme.bg }}
                            title="背景底色"
                          />
                          {isCurrent && <Check className="w-4 h-4 text-sky-500 shrink-0 ml-1" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {theme.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
              </>}
            </div>

            {/* 3. 自定义背景调色板 & 半透明毛玻璃透光开关 */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    3. {t('settings.bgColor')} (主色调)
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
                    {t('settings.bgColor')} (背景底色)
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
            </div>

            {/* 4. 自定义头像 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                4. {t('settings.avatar')} (本地图片上传即时生效)
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
                5. {t('settings.siteBg')} (本地图片上传设定)
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
                6. {t('settings.heroBg')} (仅首页介绍区)
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
                  更换首页介绍区照片
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

      {/* SECTION 2: 网站隐私与邮箱注册开关 */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div
          onClick={() => toggleSection('privacy')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              全站隐私与注册设置
            </h3>
          </div>
          {collapsedSections.privacy ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {!collapsedSections.privacy && (
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
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">普通用户管理自己的照片、视频和电子书</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">开启后，已登录普通用户可上传内容，并编辑/删除标记为本人所有的内容；管理员始终可管理全部内容。当前所有权标记在前端维护，不构成后端安全边界。</p>
                </div>
                <input type="checkbox" checked={Boolean(systemSettings.allowUserMediaManagement)} onChange={e => updateSystemSettings({ allowUserMediaManagement: e.target.checked })} className="w-5 h-5 text-sky-500 rounded focus:ring-sky-500 shrink-0 cursor-pointer" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    仅限邮箱注册 (强制邮箱身份验证)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    开启后普通账号注册通道将关闭，新用户注册必须提供有效邮箱地址。
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.emailRegistrationOnly}
                  onChange={e => updateSystemSettings({ emailRegistrationOnly: e.target.checked })}
                  className="w-5 h-5 text-sky-500 rounded focus:ring-sky-500 shrink-0 cursor-pointer"
                />
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
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-500">
                  实时连通探测（R2 列表、D1 查询、KV 读取及已配置 COS/OSS Bucket）
                </h4>
                <button
                  type="button"
                  onClick={() => refreshChannelStatus()}
                  className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>刷新连通状态</span>
                </button>
              </div>

              <div className={`grid gap-3 ${deviceMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}`}>
                {/* Storage Bucket Light */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Cloudflare R2 存储桶</span>
                    <span className="text-[10px] text-slate-400">灯亮表示 bucket.list 探测成功</span>
                  </div>
                  {cloudServicesStatus.r2 ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      探测成功 (R2)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      探测失败 / 未绑定
                    </span>
                  )}
                </div>

                {/* Database Light */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Cloudflare D1 数据库</span>
                    <span className="text-[10px] text-slate-400">灯亮表示 SELECT 1 查询成功</span>
                  </div>
                  {cloudServicesStatus.d1 ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      查询成功 (D1)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      探测失败 / 未绑定
                    </span>
                  )}
                </div>

                {/* KV Light */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Cloudflare Workers KV</span>
                    <span className="text-[10px] text-slate-400">仅做 KV get 读取探测，不代表写入配额可用</span>
                  </div>
                  {cloudServicesStatus.kv ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      读取成功 (KV)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      探测失败 / 未绑定
                    </span>
                  )}
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">COS / OSS / S3-compatible</span>
                    <span className="text-[10px] text-slate-400">Pages Functions 的只读 Bucket 探测</span>
                  </div>
                  {cloudServicesStatus.objectStorage ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {cloudServicesStatus.objectStorageProvider?.toUpperCase()} 已连通
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      未配置 / 探测失败
                    </span>
                  )}
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
                <span className="text-xs text-slate-400 block mb-1">本机数据与服务端能力边界</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
                  <Check className="w-4 h-4" /> 本机内容保存在浏览器；云服务需单独配置
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  注册、验证码邮件、共享同步和远程文件依赖 Cloudflare Functions 与相应 D1/R2 绑定；纯静态托管不提供这些 API。
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: WebDAV 容灾备份与恢复中心 (两个区完美合并为一个优雅选区) */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div
          onClick={() => toggleSection('webdav')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              WebDAV 容灾备份与恢复配置中心 (合并选区)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                isWebDavVerified
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isWebDavVerified ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {isWebDavVerified ? '已验证连通' : webDavConnectionState.status === 'checking' ? '正在验证' : webDavConnectionState.status === 'unknown' ? '未验证' : '验证失败'}
            </span>
            {collapsedSections.webdav ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>

        {!collapsedSections.webdav && (
          <div className="p-6 space-y-6">
            {/* Action Feedback Message */}
            {actionMessage && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{actionMessage}</span>
                </div>
                <button onClick={() => setActionMessage(null)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400">关闭</button>
              </div>
            )}

            {/* Form Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-sky-500" />
                WebDAV 接入参数设定
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">WebDAV 服务地址 (Host)</label>
                  <input
                    type="text"
                    value={formConfig.serverUrl}
                    placeholder="https://dav.jianguoyun.com/dav/"
                    onChange={e => setFormConfig({ ...formConfig, serverUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">服务端口 (Port，默认 443)</label>
                  <input
                    type="text"
                    value={formConfig.port ?? 443}
                    placeholder="443"
                    onChange={e => setFormConfig({ ...formConfig, port: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">WebDAV 账号 (User)</label>
                  <input
                    type="text"
                    value={formConfig.username}
                    placeholder="user@example.com"
                    onChange={e => setFormConfig({ ...formConfig, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">WebDAV 应用授权密码 (Password)</label>
                  <input
                    type="password"
                    value={formConfig.password}
                    placeholder="输入第三方应用授权密码"
                    onChange={e => setFormConfig({ ...formConfig, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  在 WebDAV 服务商网页后台“账户信息 - 安全设置 - 第三方应用管理”中生成专属应用密码。
                </p>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSaveWebDavConfig}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaved ? '配置已保存！' : '保存 WebDAV 配置'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? '连接测试中...' : '重新检测连接'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Backup Action Controls */}
            <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">选择性实时备份到 WebDAV</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">生成本站 JSON 数据快照；媒体文件本体不会自动打包。单文件上限 25 MiB，图片/视频容易超时，建议优先备份文字与设置。</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={backupScope}
                  onChange={e => setBackupScope(e.target.value as any)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-700 dark:text-slate-200"
                >
                  <option value="full">全站 JSON 快照（媒体元数据）</option>
                  <option value="posts">仅文章博客库 (Posts)</option>
                  <option value="books">仅电子书架库 (Books)</option>
                  <option value="media">照片与影音元数据 (Media)</option>
                  <option value="settings">仅全站设置 (Settings)</option>
                </select>

                <button
                  type="button"
                  onClick={handleCreateBackup}
                  disabled={!isWebDavVerified || testingConnection}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{t('action.backupNow')}</span>
                </button>
              </div>
            </div>

            {/* Visualized NutStore Remote Backup File List */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <FolderSync className="w-4 h-4 text-sky-500" />
                  WebDAV 远程快照归档 ({webDavBackups.length} 份)
                </span>
                <span className="text-slate-400 text-[11px]">可选择还原与容灾恢复</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {webDavBackups.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    暂无 WebDAV 备份快照，配置后点击上方“发起备份”即可创建。
                  </div>
                ) : (
                  webDavBackups.map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center shrink-0">
                          <FileArchive className="w-4 h-4 text-sky-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">
                              {item.name}
                            </h5>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                              {item.type || 'full'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                            <span>大小: {(item.size / 1024).toFixed(1)} KB</span>
                            <span>时间: {new Date(item.updatedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/\.json$/i.test(item.name) && <button
                          onClick={() => handleRestoreBackup(item)}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-xl transition border border-emerald-200/50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('action.restoreBackup')}</span>
                        </button>}
                        <button
                          onClick={() => handleDeleteBackup(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: 全站回收站 (收纳所有删除的文件、邮件、信息、博客) */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div
          onClick={() => toggleSection('trash')}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              全站回收站管理中心 (收纳博客、文件、邮件、信息与快照)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-mono">
              {trashItems.length} 项已删除
            </span>
            {collapsedSections.trash ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>

        {!collapsedSections.trash && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                误删文件与信息可在此一键还原恢复；或彻底清空回收站释放空间。
              </span>
              {trashItems.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('确认清空回收站的所有内容吗？此操作不可逆！')) {
                      emptyTrash();
                    }
                  }}
                  className="px-3 py-1 bg-rose-500 text-white text-xs font-medium rounded-xl hover:bg-rose-600 transition"
                >
                  清空回收站
                </button>
              )}
            </div>

            {trashItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                回收站为空，暂无已删除内容。
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl overflow-hidden">
                {trashItems.map(item => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {item.originType}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{item.preview || '无预览内容'}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        删除时间: {new Date(item.deletedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => restoreFromTrash(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100"
                        title="还原项目"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>还原</span>
                      </button>
                      <button
                        onClick={() => permanentDeleteFromTrash(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="彻底粉碎删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 6: 站内密码修改与管理员唯一性保护 */}
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
                管理员用户名（本机开发偏好；生产环境由 Cloudflare ADMIN_USERNAME 决定）
              </label>
              <input
                type="text"
                value={customAdminName}
                onChange={e => setCustomAdminName(e.target.value)}
                placeholder="fox"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                当前密码
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder={adminPassword ? '输入当前使用的密码' : '首次设置时可留空'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                required={Boolean(adminPassword)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              本机开发管理员密码（至少 6 个字符；可使用数字或任意字符；生产环境在 Pages Secret 设置 ADMIN_PASSWORD）
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="设置新密码（至少 6 个字符；仅 localhost 有效）"
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
              更新本机管理员密码
            </button>
          </form>
        )}
      </div>

      {/* SECTION 7: 设置器底部日历与在线翻译工具组件 */}
      <div className={`p-6 rounded-3xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        {/* Interactive Calendar Widget */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-sky-500" />
              <span>智能实时日历 (当前时区: {systemSettings.timezone || 'Asia/Shanghai'})</span>
            </h4>
            <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-bold">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            {/* Simple Elegant Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
              <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: 35 }).map((_, i) => {
                const dayNum = i - 2; // Offset for demo month layout
                const isToday = dayNum === new Date().getDate();
                const isValidDay = dayNum > 0 && dayNum <= 31;
                return (
                  <div
                    key={i}
                    className={`py-2 rounded-xl transition ${
                      isToday
                        ? 'bg-sky-500 text-white font-bold shadow-md'
                        : isValidDay
                        ? 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    {isValidDay ? dayNum : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Online Translation Widget */}
        <div className="space-y-3 flex flex-col min-h-[50vh] md:min-h-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-emerald-500" />
              <span>快速在线互译助手 (即时翻译引擎)</span>
            </h4>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setShowApiSettings(!showApiSettings)}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <span>⚙️ API 配置</span>
              </button>
              <div className="flex items-center gap-1">
                <select
                  value={translateSource}
                  onChange={e => setTranslateSource(e.target.value)}
                  className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
                <span>➔</span>
                <select
                  value={translateTarget}
                  onChange={e => setTranslateTarget(e.target.value)}
                  className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex-1 flex flex-col">
            {/* API Settings Panel (Foldable) */}
            {showApiSettings && (
              <div className="p-3.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    外部通用翻译 API 配置
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={translateDraft.engine === 'free'}
                        onChange={() => setTranslateDraft(prev => ({ ...prev, engine: 'free' }))}
                      />
                      <span>免费高可用通道</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={translateDraft.engine === 'custom'}
                        onChange={() => setTranslateDraft(prev => ({ ...prev, engine: 'custom' }))}
                      />
                      <span>自定义翻译 API (DeepL/OpenAI/自建)</span>
                    </label>
                  </div>
                </div>

                {translateDraft.engine === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">
                        翻译接口 URL (POST 请求)
                      </span>
                      <input
                        type="text"
                        value={translateDraft.apiUrl}
                        placeholder="https://api.deepl.com/v2/translate 或 https://api.openai.com/v1/chat/completions"
                        onChange={e => setTranslateDraft(prev => ({ ...prev, apiUrl: e.target.value }))}
                        className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">
                        API Key (身份凭证密钥)
                      </span>
                      <input
                        type="password"
                        value={translateDraft.apiKey}
                        placeholder="Bearer token 或 sk-..."
                        onChange={e => setTranslateDraft(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400">
                    支持标准 JSON 格式与通用翻译代理，保存后站内即刻生效
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveTranslateConfig}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isTranslateSaved ? '已保存！' : '保存外部翻译 API 配置'}</span>
                  </button>
                </div>
              </div>
            )}

            <textarea
              rows={5}
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              placeholder="在此输入需要快速翻译的文字..."
              className="w-full min-h-[22vh] md:min-h-24 px-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400">
                {translateConfig.engine === 'custom' ? '已挂载自定义翻译 API' : '实时公共在线与词库互译通道'}
              </span>
              <button
                type="button"
                onClick={handleQuickTranslate}
                disabled={isTranslating}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                {isTranslating ? '正在翻译...' : '立即翻译'}
              </button>
            </div>
            {translatedText && (
              <div className="p-3 min-h-[18vh] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 font-mono whitespace-pre-wrap break-words">
                {translatedText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
