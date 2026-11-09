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
import { ArrowUp, Sparkles, Compass } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { systemSettings, currentUser, deviceMode, darkMode, themeMode, t } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('blog');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'admin';
  const isGuestRestricted = !currentUser && systemSettings.hideNonBlogForGuests;

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
      return 'max-w-[420px] w-full mx-auto my-6 px-3 py-4 shadow-2xl rounded-[40px] overflow-hidden border-[10px] border-slate-800 bg-slate-50 dark:bg-slate-900 min-h-[844px] transition-all duration-300 flex flex-col';
    }
    return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full';
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 relative flex flex-col justify-between ${
        themeMode === 'nostalgic' ? 'theme-nostalgic' : ''
      }`}
      style={{
        backgroundColor:
          themeMode === 'nostalgic'
            ? '#008080'
            : systemSettings.customPaletteBg || (darkMode ? '#020617' : '#f8fafc'),
        backgroundImage: systemSettings.fullBackgroundUrl
          ? `url(${systemSettings.fullBackgroundUrl})`
          : undefined,
        backgroundSize: systemSettings.fullBackgroundUrl ? 'cover' : undefined,
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Global Background overlay if custom background photo is provided */}
      {systemSettings.fullBackgroundUrl && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] pointer-events-none z-0" />
      )}

      <div className="relative z-10 flex flex-col flex-1">
        {/* Navigation Header */}
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

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
            </div>
          )}
          {currentTab === 'guide' && <GuideSection />}
        </main>

        {/* Global Footer */}
        <footer className="relative z-10 border-t py-6 text-center text-xs border-slate-200/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md text-slate-500 dark:text-slate-400">
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

      {/* Floating Bottom Quick Section Selector Bar (matching top quick jump tabs) */}
      {systemSettings.bottomButtonsEnabled !== false && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-auto">
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title="回到顶部"
              className="p-2 rounded-xl text-slate-500 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />
            {[
              { id: 'blog', label: t('nav.blog') },
              { id: 'bookmarks', label: t('nav.bookmarks') },
              ...(!isGuestRestricted ? [
                { id: 'books', label: t('nav.books') },
                { id: 'gallery', label: t('nav.gallery') },
                { id: 'media', label: t('nav.media') },
                { id: 'shop', label: t('nav.shop') },
              ] : []),
              ...(isAdmin ? [
                { id: 'backup', label: t('nav.backup') },
                { id: 'mail', label: t('nav.mail') },
                { id: 'settings', label: t('nav.settings') },
              ] : []),
              { id: 'guide', label: t('nav.guide') },
            ].map(sec => {
              const isActive = currentTab === sec.id;
              return (
                <button
                  key={`bottom-sec-${sec.id}`}
                  onClick={() => {
                    setCurrentTab(sec.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {sec.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
