import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { WebSiteItem } from '../../types';
import { SafeImage } from '../common/SafeImage';
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Upload,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Shield,
  Layers,
} from 'lucide-react';

export const SitesSection: React.FC = () => {
  const {
    websites,
    setWebsites,
    currentUser,
    systemSettings,
    uploadFile,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [siteTitle, setSiteTitle] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [sitePoster, setSitePoster] = useState('');
  const [siteDesc, setSiteDesc] = useState('');
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);

  const posterInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPoster(true);
    try {
      const res = await uploadFile(file);
      setSitePoster(res.url);
    } catch (err) {
      console.warn('Poster upload failed:', err);
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl.trim() || !siteTitle.trim()) return;

    let formattedUrl = siteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newSite: WebSiteItem = {
      id: `site-${Date.now()}`,
      title: siteTitle.trim(),
      url: formattedUrl,
      poster:
        sitePoster.trim() ||
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
      description: siteDesc.trim() || '无自定义说明',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setWebsites(prev => [newSite, ...prev]);
    setSiteTitle('');
    setSiteUrl('');
    setSitePoster('');
    setSiteDesc('');
    setIsModalOpen(false);
  };

  const handleDeleteSite = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定要移除站点【${title}】吗？`)) {
      setWebsites(prev => prev.filter(s => s.id !== id));
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-20 text-center space-y-3">
        <Shield className="w-12 h-12 mx-auto text-rose-500/80" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-serif-sc">
          管理员专属功能区
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          此专区为网站与图床集中管理功能区，仅超级管理员登录后方可查阅和维护。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header Card */}
      <div
        className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          systemSettings.transparentCards
            ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}
      >
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[10px] font-semibold mb-1 border border-rose-200/60 dark:border-rose-900/50">
            <Shield className="w-3 h-3" />
            <span>管理员专属专区</span>
          </div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-500" />
            <span>网站与图床中心 (Websites & Image Host Hub)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            可视化海报式汇聚展示任何互联网站点、自建图床与分发节点，支持一键安全跳转与说明备忘
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-md transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>添加新网站/图床</span>
        </button>
      </div>

      {/* Sites Grid Display as Posters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {websites.map(site => (
          <div
            key={site.id}
            className={`group rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${
              systemSettings.transparentCards
                ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* Poster Aspect Ratio Frame */}
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
              <SafeImage
                src={site.poster}
                alt={site.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />

              {/* Action floating buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="在新窗口打开站点"
                  className="p-2 rounded-xl bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {isAdmin && (
                  <button
                    onClick={(e) => handleDeleteSite(site.id, site.title, e)}
                    title="删除站点"
                    className="p-2 rounded-xl bg-black/40 hover:bg-rose-600/80 backdrop-blur-md text-white transition shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Title overlay on poster */}
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-base font-bold text-white font-serif-sc drop-shadow-md truncate">
                  {site.title}
                </h3>
              </div>
            </div>

            {/* URL & Description Area */}
            <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
              <div>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5 break-all"
                >
                  <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{site.url}</span>
                </a>

                {/* Custom description below address */}
                <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="whitespace-pre-wrap">{site.description}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>添加时间: {new Date(site.createdAt).toLocaleDateString()}</span>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-500 hover:text-sky-600 font-medium"
                >
                  <span>立即访问</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Website Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold font-serif-sc text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-500" />
                <span>添加新站点 / 图床</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                关闭
              </button>
            </div>

            <form onSubmit={handleAddSite} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                  站点名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={siteTitle}
                  onChange={e => setSiteTitle(e.target.value)}
                  placeholder="例如: 白狐图床中心 / 官方工具箱"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                  跳转地址 (URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={siteUrl}
                  onChange={e => setSiteUrl(e.target.value)}
                  placeholder="例如: https://img.001315.xyz/"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                  海报展示图 (Poster URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sitePoster}
                    onChange={e => setSitePoster(e.target.value)}
                    placeholder="https://... 或点击右侧上传海报"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    disabled={isUploadingPoster}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingPoster ? '上传中...' : '上传海报'}</span>
                  </button>
                  <input
                    type="file"
                    ref={posterInputRef}
                    onChange={handleUploadPoster}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                  自定义网站说明 (将显示在链接下方)
                </label>
                <textarea
                  rows={3}
                  value={siteDesc}
                  onChange={e => setSiteDesc(e.target.value)}
                  placeholder="输入站点的功能介绍、接口说明或专属使用备忘..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl shadow-xs transition"
                >
                  保存站点
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
