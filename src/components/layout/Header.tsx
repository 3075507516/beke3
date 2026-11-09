import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Image,
  Film,
  ShoppingBag,
  Mail,
  Settings,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Smartphone,
  Monitor,
  ShieldAlert,
  RotateCw,
  Bookmark,
  Cloud,
  Globe,
  Palette,
} from 'lucide-react';
import { SafeImage } from '../common/SafeImage';
import { Locale } from '../../utils/i18n';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuth: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAuth,
  darkMode,
  setDarkMode,
}) => {
  const {
    currentUser,
    setCurrentUser,
    systemSettings,
    deviceMode,
    setDeviceMode,
    syncState,
    triggerManualSync,
    locale,
    setLocale,
    t,
    channelConnected,
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check admin privileges
  const isAdmin = currentUser?.role === 'admin';

  // Check privacy restriction: if guest and hideNonBlogForGuests is true
  const isGuestRestricted = !currentUser && systemSettings.hideNonBlogForGuests;

  // Minimalist section is completely removed.
  // Mail, Settings, and NutStore WebDAV (backup) are strictly Admin-only.
  const navItems = [
    { id: 'blog', label: t('nav.blog'), icon: BookOpen },
    { id: 'bookmarks', label: t('nav.bookmarks'), icon: Bookmark },
    { id: 'books', label: t('nav.books'), icon: BookOpen, restricted: true },
    { id: 'gallery', label: t('nav.gallery'), icon: Image, restricted: true },
    { id: 'media', label: t('nav.media'), icon: Film, restricted: true },
    { id: 'shop', label: t('nav.shop'), icon: ShoppingBag, restricted: true },
    { id: 'backup', label: t('nav.backup'), icon: Cloud, adminOnly: true },
    { id: 'mail', label: t('nav.mail'), icon: Mail, adminOnly: true },
    { id: 'settings', label: t('nav.settings'), icon: Settings, adminOnly: true },
    { id: 'guide', label: t('nav.guide'), icon: HelpCircle },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    if (item.restricted && isGuestRestricted) {
      return false;
    }
    return true;
  });

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const toggleDeviceMode = () => {
    // Isolated toggle between responsive and mobile
    setDeviceMode(deviceMode === 'mobile' ? 'responsive' : 'mobile');
  };

  const cycleLocale = () => {
    const list: Locale[] = ['zh-CN', 'zh-TW', 'en-US', 'ko-KR', 'ar-SA', 'hi-IN'];
    const nextIdx = (list.indexOf(locale) + 1) % list.length;
    setLocale(list[nextIdx]);
  };

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800">
      {/* Top Banner with Site Identity & Collapsible trigger */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('blog')}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-sky-500/20 shadow-sm">
              <SafeImage
                src={systemSettings.avatarUrl || '/images/hero-default.jpg'}
                alt={systemSettings.siteName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-sky-500 via-indigo-500 to-rose-500 bg-clip-text text-transparent">
                {systemSettings.siteName}
              </span>
              <span className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">
                Cloudflare Native • fox3
              </span>
            </div>
          </div>

          {/* Desktop Navigation Items (when not collapsed) */}
          {!isCollapsed && (
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
              {filteredNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Real-time Sync Indicator & Manual Sync Button */}
            <button
              onClick={() => triggerManualSync()}
              disabled={syncState.isSyncing}
              title={`${syncState.message} (${t('common.refresh')})`}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg border transition border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncState.isSyncing
                    ? 'bg-amber-400 animate-ping'
                    : channelConnected
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-rose-500'
                }`}
              />
              <RotateCw className={`w-3 h-3 ${syncState.isSyncing ? 'animate-spin text-amber-500' : channelConnected ? 'text-emerald-500' : 'text-rose-400'}`} />
              <span className="hidden xl:inline text-[10px]">
                {syncState.isSyncing ? t('common.syncing') : channelConnected ? t('common.realtimeSync') : t('common.offline')}
              </span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={cycleLocale}
              title={`切换语言 (当前: ${locale})`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-mono">
                {locale === 'zh-CN'
                  ? '简'
                  : locale === 'zh-TW'
                    ? '繁'
                    : locale === 'en-US'
                      ? 'EN'
                      : locale === 'ko-KR'
                        ? '한국어'
                        : locale === 'ar-SA'
                          ? 'العربية'
                          : 'हिन्दी'}
              </span>
            </button>

            {/* Device Mode Switcher (Independent phone view vs responsive) */}
            <button
              onClick={toggleDeviceMode}
              title={`界面模式: ${deviceMode === 'mobile' ? t('header.mobileView') : t('header.desktopView')}`}
              className={`p-2 rounded-lg transition ${
                deviceMode === 'mobile'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {deviceMode === 'mobile' ? (
                <Smartphone className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title="切换深色/浅色模式"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Collapse / Expand Header Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? t('header.expand') : t('header.collapse')}
              className="p-2 rounded-lg transition text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* User Auth Info / Login */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
                <span className="hidden sm:inline-block text-xs font-medium text-slate-700 dark:text-slate-200">
                  {currentUser.username} {isAdmin && <span className="text-[10px] text-sky-500 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded ml-1 font-semibold">{t('header.adminBadge')}</span>}
                </span>
                <button
                  onClick={handleLogout}
                  title={t('header.logout')}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm transition bg-sky-500 hover:bg-sky-600 text-white"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('header.login')}</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Quick Section Selection Sub-Bar right under Header */}
        {!isCollapsed && (
          <div className="py-2 border-t flex items-center justify-between gap-2 overflow-x-auto no-scrollbar border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider mr-1 text-slate-400 dark:text-slate-500">
                {t('header.quickJump')}:
              </span>
              {filteredNavItems.map(item => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={`sub-${item.id}`}
                    onClick={() => setCurrentTab(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-sm font-semibold'
                        : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
              <span>{t('header.channelStatus')}:</span>
              <span className={`inline-flex items-center gap-1 font-medium ${
                channelConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  channelConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`} />
                {channelConnected ? t('header.channelOnline') : t('header.channelOffline')}
              </span>
            </div>
          </div>
        )}

        {/* Guest privacy notification bar if non-blog items hidden */}
        {isGuestRestricted && (
          <div className="py-1 px-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200/50 dark:border-amber-900/50 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              {t('privacy.guestNotice')}
            </span>
            <button
              onClick={onOpenAuth}
              className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100"
            >
              {t('privacy.loginNow')}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-1 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
