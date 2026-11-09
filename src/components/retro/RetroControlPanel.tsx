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
  Cloud,
  Bookmark,
  AlertTriangle,
  HardDrive,
  ArrowUp,
  Server,
} from 'lucide-react';

interface RetroControlPanelProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const RetroControlPanel: React.FC<RetroControlPanelProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const {
    currentUser,
    systemSettings,
    channelConnected,
    t,
  } = useApp();

  const [panelOpen, setPanelOpen] = useState(true);
  const isAdmin = currentUser?.role === 'admin';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Nav buttons inspired by reference classic control panel
  const modules = [
    { id: 'blog', label: t('nav.blog'), icon: BookOpen, desc: '文章资讯与日记' },
    { id: 'bookmarks', label: t('nav.bookmarks'), icon: Bookmark, desc: '常用网站与收藏' },
    { id: 'books', label: t('nav.books'), icon: HardDrive, desc: 'EPUB/PDF 在线阅读', restricted: true },
    { id: 'gallery', label: t('nav.gallery'), icon: Image, desc: '相册与多视图浏览', restricted: true },
    { id: 'media', label: t('nav.media'), icon: Film, desc: '流媒体点播与播放', restricted: true },
    { id: 'shop', label: t('nav.shop'), icon: ShoppingBag, desc: '商品与订单结算', restricted: true },
    { id: 'backup', label: t('nav.backup'), icon: Cloud, desc: '坚果云 WebDAV 容灾', adminOnly: true },
    { id: 'mail', label: t('nav.mail'), icon: Mail, desc: '邮件中心与回信', adminOnly: true },
    { id: 'settings', label: t('nav.settings'), icon: Settings, desc: '系统设置与外观', adminOnly: true },
    { id: 'guide', label: t('nav.guide'), icon: HelpCircle, desc: '部署与环境文档' },
  ];

  const visibleModules = modules.filter(m => {
    if (m.adminOnly && !isAdmin) return false;
    if (m.restricted && !currentUser && systemSettings.hideNonBlogForGuests) return false;
    return true;
  });

  const usedMb = ((systemSettings.usedCapacityBytes || 0) / 1024 / 1024).toFixed(1);

  return (
    <div className="w-full bg-[#ffffff] border-b border-slate-200 text-slate-800 font-sans antialiased shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Retro Alert Bar matching classic white/clean styling */}
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 animate-bounce" />
            <span className="font-semibold tracking-wide">
              {channelConnected
                ? '【运行正常】Cloudflare D1 关系型数据库与 R2 对象存储通道运行就绪'
                : '【状态提示】当前运行在本地离线/本地存储模式，配置 Cloudflare D1/R2 后可激活全网无感同步'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              容量已用: {usedMb} MB
            </span>
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-[11px] border border-slate-200 font-medium transition active:translate-y-0.5 shadow-xs"
            >
              {panelOpen ? '收起控制台' : '展开控制台'}
            </button>
          </div>
        </div>

        {/* Retro Clean White Control Deck */}
        {panelOpen && (
          <div className="bg-[#ffffff] border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-sm tracking-wide text-slate-800">
                  {systemSettings.siteName} 经典控制台 (cPanel Console)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-slate-600">
                  v3.8.0
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">服务通道:</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                  channelConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${channelConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {channelConnected ? '实时在线 (ACTIVE)' : '未连接 (DISCONNECTED)'}
                </span>
              </div>
            </div>

            {/* Clean White Button Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {visibleModules.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={`retro-panel-${item.id}`}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center group border ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-sm ring-1 ring-sky-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:border-slate-300 active:translate-y-0.5'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg mb-1.5 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className={`text-[10px] mt-0.5 leading-tight ${
                      isActive ? 'text-sky-600' : 'text-slate-400'
                    }`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Retro Return to Top Button */}
      <button
        onClick={scrollToTop}
        title="返回顶部"
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-lg hover:scale-105 active:scale-95 transition"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
};
