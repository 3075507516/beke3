import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Image,
  Film,
  HardDrive,
  ShoppingBag,
  Mail,
  Settings,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Smartphone,
  Monitor,
  ShieldAlert,
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
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check privacy restriction: if guest and hideNonBlogForGuests is true
  const isGuestRestricted = !currentUser && systemSettings.hideNonBlogForGuests;

  const navItems = [
    { id: 'blog', label: '博客', icon: BookOpen },
    { id: 'books', label: '书架', icon: BookOpen, restricted: true },
    { id: 'gallery', label: '相册', icon: Image, restricted: true },
    { id: 'media', label: '影音', icon: Film, restricted: true },
    { id: 'drive', label: '网盘', icon: HardDrive, restricted: true },
    { id: 'shop', label: '商品', icon: ShoppingBag, restricted: true },
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-all duration-300">
      {/* Top Banner with Site Identity & Collapsible trigger */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('blog')}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-rose-500/20 shadow-sm shadow-rose-500/10">
              <SafeImage
                src={systemSettings.avatarUrl || ''}
                alt={systemSettings.siteName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                {systemSettings.siteName}
              </span>
              <span className="block text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Cloudflare Native
              </span>
            </div>
          </div>

          {/* Desktop Navigation Items (when not collapsed) */}
          {!isCollapsed && (
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Device Mode Switcher */}
            <button
              onClick={toggleDeviceMode}
              title={`界面模式: ${deviceMode === 'responsive' ? '响应式自适应' : deviceMode === 'mobile' ? '手机端模拟' : '电脑端模拟'}`}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {deviceMode === 'mobile' ? (
                <Smartphone className="w-4 h-4 text-rose-500" />
              ) : deviceMode === 'desktop' ? (
                <Monitor className="w-4 h-4 text-blue-500" />
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
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <span className="hidden sm:inline-block text-xs font-medium text-slate-700 dark:text-slate-200">
                  {currentUser.username} {currentUser.role === 'admin' && <span className="text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded ml-1 font-semibold">管理员</span>}
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-medium shadow-sm transition"
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
