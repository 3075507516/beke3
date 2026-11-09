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
    <div className="w-full bg-[#f4ecdf] border-b-2 border-[#b09f80] text-[#3d2e20] font-sans antialiased shadow-inner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Retro Alert Bar matching the reference red banner */}
        <div className="mb-3 px-4 py-2.5 rounded-lg bg-[#b52d24] text-white border-2 border-[#7e1710] shadow-[0_2px_4px_rgba(0,0,0,0.25)] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200 animate-bounce" />
            <span className="font-semibold tracking-wide">
              {channelConnected
                ? '【运行正常】Cloudflare D1 关系型数据库与 R2 对象存储通道运行就绪'
                : '【状态提示】当前运行在本地离线/本地存储模式，配置 Cloudflare D1/R2 后可激活全网无感同步'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] opacity-90 hidden sm:inline">
              容量已用: {usedMb} MB
            </span>
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[11px] border border-white/40 font-bold active:translate-y-0.5"
            >
              {panelOpen ? '收起控制台' : '展开控制台'}
            </button>
          </div>
        </div>

        {/* Retro Skeuomorphic Control Deck */}
        {panelOpen && (
          <div className="bg-[#ede4d3] border-2 border-[#c5b79d] rounded-xl p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#c8bc9f]">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#8b4d1b]" />
                <span className="font-serif font-bold text-sm tracking-wide text-[#422e1b]">
                  {systemSettings.siteName} 经典控制中枢 (cPanel Control Console)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dfd2be] border border-[#a89578] font-mono text-[#5b4329]">
                  v3.8.0
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#69543e]">通道:</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                  channelConnected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${channelConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {channelConnected ? '实时在线 (ACTIVE)' : '未连接 (DISCONNECTED)'}
                </span>
              </div>
            </div>

            {/* Skeuomorphic 3D Icon Grid */}
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
                        ? 'bg-gradient-to-b from-[#e38c36] to-[#b35a14] text-white border-[#7a3909] shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_6px_rgba(0,0,0,0.25)]'
                        : 'bg-gradient-to-b from-[#faf6ee] to-[#e4d8c6] text-[#3c2a1a] border-[#bdae95] shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-[#eae0cf] active:translate-y-0.5'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg mb-1.5 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'bg-white/20'
                        : 'bg-gradient-to-b from-[#f2e7d6] to-[#d6c5ad] border border-[#ab997e] shadow-inner text-[#854516]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-serif">{item.label}</span>
                    <span className={`text-[10px] mt-0.5 leading-tight ${
                      isActive ? 'text-amber-100' : 'text-[#7e6950]'
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
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-gradient-to-b from-[#df9344] to-[#b35e18] text-white border-2 border-[#7a3909] shadow-[0_4px_10px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95 transition"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
};
