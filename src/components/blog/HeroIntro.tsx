import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';
import { Sparkles, Camera, Upload, HardDrive, Compass } from 'lucide-react';

export const HeroIntro: React.FC = () => {
  const { systemSettings, updateSystemSettings, currentUser, uploadFile } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    updateSystemSettings({ heroIntroImage: res.url });
  };

  return (
    <div className="relative mb-8 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl transition-all duration-300">
      {/* Background Visualized Image with Dynamic Overlay */}
      <div className="absolute inset-0 z-0">
        <SafeImage
          src={systemSettings.heroIntroImage || ''}
          alt="Hero Banner"
          className="w-full h-full object-cover scale-105 filter blur-xs brightness-90 dark:brightness-50 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-white/40 dark:from-slate-950/95 dark:via-slate-950/80 dark:to-slate-950/40 backdrop-blur-[2px]" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 px-6 py-10 md:px-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{systemSettings.heroBadge || '✨ 数字化知识库 & 个人空间'}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black font-serif-sc tracking-tight text-slate-900 dark:text-white leading-tight">
            {systemSettings.heroTitle || '探索数字世界与全栈极简之美'}
          </h1>

          <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {systemSettings.heroSubtitle ||
              '融合 Cloudflare D1 + R2 + 邮件中枢与 WebDAV 容灾备份的下一代现代化博客系统'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <HardDrive className="w-3.5 h-3.5 text-rose-500" />
              <span>
                已用存储:{' '}
                {((systemSettings.usedCapacityBytes || 0) / (1024 * 1024)).toFixed(2)} MB /{' '}
                {((systemSettings.totalCapacityBytes || 10737418240) / (1024 * 1024 * 1024)).toFixed(0)} GB
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>D1 + R2 原生直连</span>
            </div>
          </div>
        </div>

        {/* Hero Image Visual Showcase & Admin Customizer */}
        <div className="relative group shrink-0">
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/80 dark:border-slate-800/80 transition-transform duration-300 group-hover:scale-102">
            <SafeImage
              src={systemSettings.heroIntroImage || ''}
              alt="Visual Intro Cover"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Admin Upload / Change Hero Image directly from Intro Section */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white text-xs font-medium rounded-xl backdrop-blur-md shadow-lg transition"
              title="自定义首页介绍区照片 (本地直传即时生效)"
            >
              <Camera className="w-3.5 h-3.5 text-rose-400" />
              <span>更换封面</span>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleHeroImageUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
