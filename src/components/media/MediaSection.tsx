import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { MediaItem, ViewMode } from '../../types';
import { SafeImage } from '../common/SafeImage';
import {
  Play,
  Pause,
  Music,
  Film,
  Trash2,
  Plus,
  Disc3,
  Upload,
  Download,
  CheckSquare,
  Square,
  Columns,
  Grid3X3,
  List,
  LayoutGrid,
} from 'lucide-react';

export const MediaSection: React.FC = () => {
  const {
    media,
    setMedia,
    currentUser,
    uploadFile,
    viewModes,
    setViewMode,
    systemSettings,
    deviceMode,
  } = useApp();

  const [currentPlaying, setCurrentPlaying] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New Media Form state
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newType, setNewType] = useState<'audio' | 'video'>('audio');
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  // Batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const currentViewMode: ViewMode = viewModes['media'] || 'original';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlay = (item: MediaItem) => {
    if (currentPlaying?.id === item.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentPlaying(item);
      setIsPlaying(true);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === media.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(media.map(m => m.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`确认批量删除选中的 ${selectedIds.length} 个音视频吗？`)) {
      setMedia(prev => prev.filter(m => !selectedIds.includes(m.id)));
      setSelectedIds([]);
    }
  };

  const handleBatchDownload = () => {
    if (selectedIds.length === 0) return;
    const exportData = media.filter(m => selectedIds.includes(m.id));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fox3_media_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4');
    const uploaded = await uploadFile(file);

    const newItem: MediaItem = {
      id: `media-${Date.now()}`,
      type: isVideo ? 'video' : 'audio',
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: currentUser?.username || 'fox',
      src: uploaded.url,
      cover: isVideo
        ? 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
      duration: '03:45',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setMedia(prev => [newItem, ...prev]);
    setIsUploading(false);
  };

  const handleDeleteMedia = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确认删除该音视频吗？')) {
      setMedia(prev => prev.filter(m => m.id !== id));
      if (currentPlaying?.id === id) {
        setCurrentPlaying(null);
        setIsPlaying(false);
      }
    }
  };

  // Get layout class
  const getLayoutClass = () => {
    if (deviceMode === 'mobile') {
      return 'grid grid-cols-1 gap-4';
    }

    switch (currentViewMode) {
      case 'big':
        return 'grid grid-cols-1 gap-6';
      case 'medium':
        return 'grid grid-cols-1 md:grid-cols-2 gap-5';
      case 'small':
        return 'space-y-3';
      case 'original':
      default:
        return 'grid grid-cols-1 md:grid-cols-2 gap-5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-sky-500 animate-spin-slow" />
            <span>影音天地 (Native Audio / Video Streaming)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            原生流媒体多媒体中心，支持音频流、高品质视频上传与自适应播放
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('media', 'big')}
              title="大图巨幕"
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'big' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-xs' : 'text-slate-400'}`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('media', 'medium')}
              title="双列网格"
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'medium' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-xs' : 'text-slate-400'}`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('media', 'small')}
              title="小图列表"
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'small' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-xs' : 'text-slate-400'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('media', 'original')}
              title="原布局"
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'original' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-xs' : 'text-slate-400'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsUploading(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-md transition"
            >
              <Upload className="w-4 h-4" />
              <span>上传音视频</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Operations Bar */}
      {currentUser?.role === 'admin' && (
        <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
          systemSettings.transparentCards
            ? 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-white/20'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium hover:text-sky-500"
            >
              {selectedIds.length === media.length && media.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-sky-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>全选 ({selectedIds.length}/{media.length})</span>
            </button>

            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1 text-rose-500 hover:text-rose-600 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>批量删除 ({selectedIds.length})</span>
                </button>
                <button
                  onClick={handleBatchDownload}
                  className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>批量导出元数据</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Active Player Box */}
      {currentPlaying && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden animate-in fade-in">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-lg border border-white/10 shrink-0">
              <SafeImage
                src={currentPlaying.cover}
                alt={currentPlaying.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-3 w-full">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 text-xs font-semibold">
                {currentPlaying.type === 'audio' ? <Music className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                <span>{currentPlaying.type === 'audio' ? '正在播放音频' : '正在播放视频'}</span>
              </div>

              <h3 className="text-xl md:text-2xl font-bold font-serif-sc">{currentPlaying.title}</h3>
              <p className="text-xs text-slate-400">{currentPlaying.artist}</p>

              {/* HTML5 Player */}
              {currentPlaying.type === 'audio' ? (
                <audio
                  src={currentPlaying.src}
                  controls
                  autoPlay
                  className="w-full mt-4 filter invert contrast-150 brightness-150"
                />
              ) : (
                <video
                  src={currentPlaying.src}
                  controls
                  autoPlay
                  className="w-full max-h-80 rounded-xl mt-4 bg-black"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Cards Grid */}
      <div className={getLayoutClass()}>
        {media.map(item => {
          const isSelected = selectedIds.includes(item.id);

          // Small Detail List View
          if (currentViewMode === 'small') {
            return (
              <div
                key={item.id}
                onClick={() => togglePlay(item)}
                className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between gap-4 cursor-pointer transition hover:shadow-md ${
                  isSelected ? 'ring-2 ring-sky-500' : ''
                } ${
                  systemSettings.transparentCards
                    ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={e => handleToggleSelect(item.id, e)}
                      className="p-1 text-slate-400 hover:text-sky-500 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                    <SafeImage src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                        {item.type}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                  <span className="font-mono">{item.duration}</span>
                  <button className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                    {currentPlaying?.id === item.id && isPlaying ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          }

          // Card View
          return (
            <div
              key={item.id}
              onClick={() => togglePlay(item)}
              className={`group cursor-pointer rounded-2xl p-4 border shadow-sm hover:shadow-lg transition-all duration-300 flex items-center gap-4 ${
                isSelected ? 'ring-2 ring-sky-500' : ''
              } ${
                systemSettings.transparentCards
                  ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {currentUser?.role === 'admin' && (
                <button
                  onClick={e => handleToggleSelect(item.id, e)}
                  className="p-1 text-slate-400 hover:text-sky-500 shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-sky-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              )}

              <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                <SafeImage
                  src={item.cover}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {currentPlaying?.id === item.id && isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                  {item.type}
                </span>
                <h4 className="text-sm font-bold font-serif-sc text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-500 transition">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">{item.artist}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">时长: {item.duration}</span>
              </div>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={e => handleDeleteMedia(item.id, e)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                  title="删除媒体"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload Media Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold font-serif-sc text-slate-900 dark:text-slate-100 mb-4">
              上传音频或视频文件
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              支持 MP3, WAV, MP4, WebM 等流媒体格式，直传 Cloudflare R2 对象存储与本地安全缓存。
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-sky-300 dark:border-sky-900/60 rounded-2xl p-8 text-center cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-8 h-8 text-sky-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                点击选择音视频文件
              </span>
              <span className="text-[10px] text-slate-400">
                .mp3, .wav, .mp4, .webm
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleMediaFileUpload}
              accept="audio/*,video/*"
              className="hidden"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsUploading(false)}
                className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
