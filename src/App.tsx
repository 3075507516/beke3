import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { HeroIntro } from './components/blog/HeroIntro';
import { BlogSection } from './components/blog/BlogSection';
import { BookmarksSection } from './components/bookmarks/BookmarksSection';
import { BookshelfSection } from './components/books/BookshelfSection';
import { GallerySection } from './components/gallery/GallerySection';
import { MediaSection } from './components/media/MediaSection';
import { MailSection } from './components/mail/MailSection';
import { ShopSection } from './components/shop/ShopSection';
import { WebDavBackupSection } from './components/backup/WebDavBackupSection';
import { SettingsSection } from './components/settings/SettingsSection';
import { GuideSection } from './components/guide/GuideSection';
import { AuthModal } from './components/modals/AuthModal';
import { TransferProgressBar } from './components/common/TransferProgressBar';
import { RetroControlPanel } from './components/retro/RetroControlPanel';

const MainLayout: React.FC = () => {
  const { systemSettings, currentUser, deviceMode, themeMode, t } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('blog');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'admin';
  const isRetro = themeMode === 'retro';

  // Sync dark class on root html (only in modern mode)
  useEffect(() => {
    if (isRetro) {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('retro-theme');
    } else {
      document.body.classList.remove('retro-theme');
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode, isRetro]);

  // If non-admin tries to access admin-only tabs (mail, settings, backup), redirect safely to blog
  useEffect(() => {
    if (!isAdmin && ['mail', 'settings', 'backup'].includes(currentTab)) {
      setCurrentTab('blog');
    }
  }, [isAdmin, currentTab]);

  // Privacy protection: if guest and restricted, redirect to blog
  useEffect(() => {
    if (
      !currentUser &&
      systemSettings.hideNonBlogForGuests &&
      ['books', 'gallery', 'media', 'shop', 'backup'].includes(currentTab)
    ) {
      setCurrentTab('blog');
    }
  }, [currentUser, systemSettings.hideNonBlogForGuests, currentTab]);

  // Container styling based on deviceMode (responsive vs mobile simulation)
  const getContainerClasses = () => {
    if (deviceMode === 'mobile') {
      return 'max-w-[420px] mx-auto my-4 px-3 sm:px-4 py-4 shadow-2xl rounded-[36px] overflow-hidden border-[8px] border-slate-900 bg-white dark:bg-slate-900 min-h-[844px] transition-all duration-300';
    }
    return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6';
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 relative flex flex-col justify-between ${
        isRetro
          ? 'bg-[#ffffff] text-slate-800 selection:bg-sky-500 selection:text-white'
          : ''
      }`}
      style={{
        backgroundColor: isRetro
          ? '#ffffff'
          : systemSettings.customPaletteBg || (darkMode ? '#020617' : '#f8fafc'),
        backgroundImage: isRetro
          ? undefined
          : systemSettings.fullBackgroundUrl
            ? `url(${systemSettings.fullBackgroundUrl})`
            : undefined,
        backgroundSize: systemSettings.fullBackgroundUrl && !isRetro ? 'cover' : undefined,
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Global Background overlay if custom background photo is provided and not in isolated retro mode */}
      {!isRetro && systemSettings.fullBackgroundUrl && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] pointer-events-none z-0" />
      )}

      <div className="relative z-10 flex flex-col flex-1">
        {/* Navigation Header: in retro mode, only show if user wants or keep separate */}
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenAuth={() => setIsAuthOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Retro Control Deck: strictly visible ONLY in retro mode, cleanly isolated */}
        {isRetro && (
          <RetroControlPanel currentTab={currentTab} onSelectTab={setCurrentTab} />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${getContainerClasses()}`}>
          {/* Hero Section shown on standard blog */}
          {currentTab === 'blog' && <HeroIntro />}

          {/* Tab Views */}
          {currentTab === 'blog' && <BlogSection />}
          {currentTab === 'bookmarks' && <BookmarksSection />}
          {currentTab === 'books' && <BookshelfSection />}
          {currentTab === 'gallery' && <GallerySection />}
          {currentTab === 'media' && <MediaSection />}
          {currentTab === 'shop' && <ShopSection />}
          {currentTab === 'backup' && isAdmin && <WebDavBackupSection />}
          {currentTab === 'mail' && isAdmin && <MailSection />}
          {currentTab === 'settings' && isAdmin && (
            <div className="space-y-6">
              <SettingsSection />
              <WebDavBackupSection />
            </div>
          )}
          {currentTab === 'guide' && <GuideSection />}
        </main>

        {/* Global Footer */}
        <footer className={`relative z-10 border-t py-6 text-center text-xs ${
          isRetro
            ? 'border-[#b09f80] bg-[#e8dec8]/90 text-[#594735]'
            : 'border-slate-200/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md text-slate-500 dark:text-slate-400'
        }`}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span>&copy; {new Date().getFullYear()} <b>{systemSettings.siteName}</b> (fox3). All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>依托 Cloudflare D1 + R2 原生构建</span>
              <span>•</span>
              <button
                onClick={() => setCurrentTab('guide')}
                className="hover:underline transition text-sky-600 dark:text-sky-400 font-medium"
              >
                全平台部署指引
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Modals & Notifications */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <TransferProgressBar />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
