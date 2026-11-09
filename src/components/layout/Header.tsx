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
  Sparkles,
  Bookmark,
  Cloud,
} from 'lucide-react';
import { SafeImage } from '../common/SafeImage';

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
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check privacy restriction: if guest and hideNonBlogForGuests is true
  const isGuestRestricted = !currentUser && systemSettings.hideNonBlogForGuests;

  const navItems = [
    { id: 'minimalist', label: '极简A', icon: Sparkles, badge: 'A' },
    { id: 'blog', label: '博客', icon: BookOpen },
    { id: 'bookmarks', label: '收藏', icon: Bookmark },
    { id: 'books', label: '书架', icon: BookOpen, restricted: true },
    { id: 'gallery', label: '相册', icon: Image, restricted: true },
    { id: 'media', label: '影音', icon: Film, restricted: true },
    { id: 'shop', label: '商品', icon: ShoppingBag, restricted: true },
    { id: 'backup', label: '坚果云容灾', icon: Cloud, restricted: true },
    { id: 'mail', label: '邮箱中枢', icon: Mail, adminOnly: true },
    { id: 'settings', label: '设置', icon: Settings, adminOnly: true },
    { id: 'guide', label: '部署指南', icon: HelpCircle },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && currentUser?.role !== 'admin') {
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
    if (deviceMode === 'responsive') setDeviceMode('mobile');
    else if (deviceMode === 'mobile') setDeviceMode('desktop');
    else setDeviceMode('responsive');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800 transition-all duration-300">
      {/* Top Banner with Site Identity & Collapsible trigger */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('blog')}>
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-sky-500/20 shadow-sm shadow-sky-500/10">
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
              <span className="block text-[10px] text-slate-400 font-mono tracking-wider uppercase">
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
                    {item.badge && (
                      <span className="ml-0.5 text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-900 font-bold">
                        {item.badge}
                      </span>
                    )}
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
              title={`${syncState.message} (点击立即同步)`}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncState.isSyncing
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <RotateCw className={`w-3 h-3 ${syncState.isSyncing ? 'animate-spin text-amber-500' : 'text-slate-400'}`} />
              <span className="hidden xl:inline text-[10px]">
                {syncState.isSyncing ? '同步中' : '实时同步'}
              </span>
            </button>

            {/* Device Mode Switcher */}
            <button
              onClick={toggleDeviceMode}
              title={`界面模式: ${deviceMode === 'responsive' ? '响应式自适应' : deviceMode === 'mobile' ? '手机端模拟' : '电脑端模拟'}`}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {deviceMode === 'mobile' ? (
                <Smartphone className="w-4 h-4 text-sky-500" />
              ) : deviceMode === 'desktop' ? (
                <Monitor className="w-4 h-4 text-indigo-500" />
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
              title={isCollapsed ? '展开页眉' : '收拢页眉'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* User Auth Info / Login */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
                <span className="hidden sm:inline-block text-xs font-medium text-slate-700 dark:text-slate-200">
                  {currentUser.username} {currentUser.role === 'admin' && <span className="text-[10px] text-sky-500 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded ml-1 font-semibold">管理员</span>}
                </span>
                <button
                  onClick={handleLogout}
                  title="退出登录"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-medium shadow-sm transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>登录 / 注册</span>
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
          <div className="py-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mr-1">
                快速选区:
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
              <span>状态:</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                D1/R2 在线
              </span>
            </div>
          </div>
        )}

        {/* Guest privacy notification bar if non-blog items hidden */}
        {isGuestRestricted && (
          <div className="py-1 px-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200/50 dark:border-amber-900/50 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              全站隐私保护已生效：未登录访客仅可浏览博客文章。
            </span>
            <button
              onClick={onOpenAuth}
              className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100"
            >
              立即登录开启全部专区
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 space-y-1">
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
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
