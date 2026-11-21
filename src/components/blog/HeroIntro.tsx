import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';
import { Sparkles, Camera, HardDrive, Compass, Edit3, Check, X } from 'lucide-react';

export const HeroIntro: React.FC = () => {
  const { systemSettings, updateSystemSettings, currentUser, uploadFile, deviceMode } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const heroSrc = systemSettings.heroIntroImage || '/images/hero-default.jpg';

  const [isEditingText, setIsEditingText] = useState(false);
  const [editTitle, setEditTitle] = useState(systemSettings.heroTitle || '探索数字世界与全栈极简之美');
  const [editSubtitle, setEditSubtitle] = useState(
    systemSettings.heroSubtitle ||
      '融合 D1 + R2 + 邮件中枢与 WebDAV 容灾备份的现代化全栈博客系统'
  );
  const [editBadge, setEditBadge] = useState(systemSettings.heroBadge || '✨ 数字化知识库 & 个人空间');
  const [naturalRatio, setNaturalRatio] = useState<number>(16 / 9);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    setNaturalRatio(16 / 9);
  }, [heroSrc]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const isPortraitLayout = deviceMode === 'mobile' || isMobileViewport;
  const isPortraitImage = naturalRatio < 1.05;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (Number.isFinite(ratio) && ratio > 0.2 && ratio < 5) {
        setNaturalRatio(ratio);
      }
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    updateSystemSettings({ heroIntroImage: res.url });
  };

  const handleSaveText = () => {
    updateSystemSettings({
      heroTitle: editTitle,
      heroSubtitle: editSubtitle,
      heroBadge: editBadge,
    });
    setIsEditingText(false);
  };

  const handleCancelText = () => {
    setEditTitle(systemSettings.heroTitle || '探索数字世界与全栈极简之美');
    setEditSubtitle(systemSettings.heroSubtitle || '');
    setEditBadge(systemSettings.heroBadge || '');
    setIsEditingText(false);
  };

  const renderContent = (compact = false) => (
    <div className={`w-full flex flex-col justify-between ${compact ? 'px-5 py-5' : 'px-8 py-10 lg:px-12 lg:py-14'}`}>
      <div className="max-w-3xl space-y-3.5">
        {isEditingText ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/80 shrink-0">徽标标语:</span>
            <input
              type="text"
              value={editBadge}
              onChange={e => setEditBadge(e.target.value)}
              className="flex-1 px-2.5 py-1 rounded-lg text-xs bg-black/60 text-white border border-white/20 focus:outline-none focus:border-sky-400"
            />
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{systemSettings.heroBadge || '✨ 数字化知识库 & 个人空间'}</span>
          </div>
        )}

        {isEditingText ? (
          <div>
            <label className="block text-xs text-white/80 mb-1">主标题:</label>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-lg md:text-2xl font-bold bg-black/60 text-white border border-white/20 focus:outline-none focus:border-sky-400"
            />
          </div>
        ) : (
          <h1 className={`${compact ? 'text-2xl sm:text-3xl' : 'text-3xl lg:text-5xl'} font-black font-serif-sc tracking-tight text-white leading-tight drop-shadow-md`}>
            {systemSettings.heroTitle || '探索数字世界与全栈极简之美'}
          </h1>
        )}

        {isEditingText ? (
          <div>
            <label className="block text-xs text-white/80 mb-1">简介描述:</label>
            <textarea
              value={editSubtitle}
              onChange={e => setEditSubtitle(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-xs md:text-sm bg-black/60 text-white border border-white/20 focus:outline-none focus:border-sky-400"
            />
          </div>
        ) : (
          <p className={`${compact ? 'text-xs sm:text-sm' : 'text-sm lg:text-base'} text-slate-100/90 leading-relaxed font-normal max-w-2xl drop-shadow`}>
            {systemSettings.heroSubtitle ||
              '融合 D1 + R2 + 邮件中枢与 WebDAV 容灾备份的现代化全栈博客系统'}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-white/90 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-sm">
            <HardDrive className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>真实存储用量请查看管理员设置</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-white/90 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-sm">
            <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>D1 + R2 原生无感同步</span>
          </div>
        </div>
      </div>

      {currentUser?.role === 'admin' && (
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          {isEditingText ? (
            <>
              <button
                onClick={handleSaveText}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl backdrop-blur-md shadow-md transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>保存文字</span>
              </button>
              <button
                onClick={handleCancelText}
                className="flex items-center gap-1 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-semibold rounded-xl backdrop-blur-md transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>取消</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditingText(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-xl backdrop-blur-md border border-white/30 shadow-md transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-300" />
              <span>自定义介绍文字</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-xl backdrop-blur-md border border-white/30 shadow-md transition"
            title="更换首页介绍区照片"
          >
            <Camera className="w-3.5 h-3.5 text-sky-300" />
            <span>更换首页介绍区照片</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleHeroImageUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      )}
    </div>
  );

  // Mobile / portrait viewport: stack intact aspect-matched photo above gradient card so nothing is cropped
  if (isPortraitLayout) {
    return (
      <div className="mb-8 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl bg-slate-950 transition-all duration-300">
        <div
          className="relative w-full max-h-[70vh] bg-slate-950 flex items-center justify-center overflow-hidden"
          style={{ aspectRatio: String(naturalRatio) }}
        >
          <SafeImage
            src={heroSrc}
            alt="Hero Banner"
            onLoad={handleImageLoad}
            className="w-full h-full bg-slate-950"
            imageClassName="object-contain object-center"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>
        <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          {renderContent(true)}
        </div>
      </div>
    );
  }

  // Desktop viewport with portrait image: split framing so vertical photos stay uncropped and prominent
  if (isPortraitImage) {
    return (
      <div className="relative mb-8 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl bg-slate-950 grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,42%)] items-center transition-all duration-300">
        <div className="relative z-10">{renderContent(false)}</div>
        <div
          className="relative w-full h-full max-h-[540px] bg-slate-950 flex items-center justify-center overflow-hidden"
          style={{ aspectRatio: String(naturalRatio) }}
        >
          <SafeImage
            src={heroSrc}
            alt="Hero Banner"
            onLoad={handleImageLoad}
            className="w-full h-full bg-slate-950"
            imageClassName="object-contain object-center"
          />
        </div>
      </div>
    );
  }

  // Desktop viewport with landscape image: match natural ratio cleanly within responsive bounds
  return (
    <div
      className="relative mb-8 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl transition-all duration-300 min-h-[340px] max-h-[560px] flex items-center bg-slate-950"
      style={{ aspectRatio: String(Math.max(1.45, Math.min(2.5, naturalRatio))) }}
    >
      <div className="absolute inset-0 z-0">
        <SafeImage
          src={heroSrc}
          alt="Hero Banner"
          onLoad={handleImageLoad}
          className="w-full h-full bg-slate-950"
          imageClassName="object-contain lg:object-cover object-center filter brightness-[0.88] dark:brightness-[0.48] transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-transparent backdrop-blur-[1px]" />
      </div>
      <div className="relative z-10 w-full">{renderContent(false)}</div>
    </div>
  );
};
