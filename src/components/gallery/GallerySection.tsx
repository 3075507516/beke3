import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Photo, ViewMode } from '../../types';
import { SafeImage } from '../common/SafeImage';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  Download,
  CheckSquare,
  Square,
  Columns,
  Grid3X3,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import JSZip from 'jszip';

export const GallerySection: React.FC = () => {
  const {
    photos,
    setPhotos,
    currentUser,
    uploadFile,
    viewModes,
    setViewMode,
    startTransfer,
    updateTransferPercent,
    finishTransfer,
    systemSettings,
    deviceMode,
    t,
  } = useApp();

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentViewMode: ViewMode = viewModes['gallery'] || 'original';

  const currentPhotoIndex = selectedPhoto ? photos.findIndex(p => p.id === selectedPhoto.id) : -1;

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photos.length === 0 || currentPhotoIndex === -1) return;
    const prevIdx = (currentPhotoIndex - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[prevIdx]);
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photos.length === 0 || currentPhotoIndex === -1) return;
    const nextIdx = (currentPhotoIndex + 1) % photos.length;
    setSelectedPhoto(photos[nextIdx]);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploaded = await uploadFile(file);
      const newPhoto: Photo = {
        id: `photo-${Date.now()}-${i}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: uploaded.url,
        category: '相册精选',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPhotos(prev => [newPhoto, ...prev]);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === photos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map(p => p.id));
    }
  };

  const handleDeletePhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确认删除此照片吗？')) {
      setPhotos(prev => prev.filter(p => p.id !== id));
      if (selectedPhoto?.id === id) setSelectedPhoto(null);
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`确认删除选中的 ${selectedIds.length} 张照片吗？`)) {
      setPhotos(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    }
  };

  const handleDownloadSingle = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = `${photo.title}.jpg`;
    a.target = '_blank';
    a.click();
  };

  const handleBatchDownloadZip = async () => {
    if (selectedIds.length === 0) return;
    const targetPhotos = photos.filter(p => selectedIds.includes(p.id));
    startTransfer('download', `photos_batch_${targetPhotos.length}.zip`);

    const zip = new JSZip();
    for (let i = 0; i < targetPhotos.length; i++) {
      const p = targetPhotos[i];
      try {
        const resp = await fetch(p.url);
        const blob = await resp.blob();
        zip.file(`${i + 1}_${p.title.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_')}.jpg`, blob);
      } catch {
        // Text stub if CORS blocks cross-origin demo URLs
        zip.file(`${p.title}.txt`, `URL: ${p.url}\nTitle: ${p.title}`);
      }
      updateTransferPercent(Math.round(((i + 1) / targetPhotos.length) * 80));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    updateTransferPercent(100);
    finishTransfer();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `fox3_gallery_batch_${Date.now()}.zip`;
    link.click();
  };

  // Layout classes
  const getLayoutClass = () => {
    if (deviceMode === 'mobile') {
      switch (currentViewMode) {
        case 'big':
          return 'grid grid-cols-1 gap-4';
        case 'medium':
        case 'original':
        default:
          return 'grid grid-cols-2 gap-3';
        case 'small':
          return 'space-y-3';
      }
    }

    switch (currentViewMode) {
      case 'big':
        return 'grid grid-cols-1 sm:grid-cols-2 gap-6';
      case 'medium':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4';
      case 'small':
        return 'space-y-3';
      case 'original':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6';
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
            <ImageIcon className="w-5 h-5 text-rose-500" />
            <span>{t('nav.gallery')} (支持 4 种视图与批量处理)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            大图、中图网格、小图详情与原布局浏览，支持批量上传、ZIP 打包下载与删除
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('gallery', 'big')}
              title={t('views.big')}
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'big' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-xs' : 'text-slate-400'}`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('gallery', 'medium')}
              title={t('views.medium')}
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'medium' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-xs' : 'text-slate-400'}`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('gallery', 'small')}
              title={t('views.small')}
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'small' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-xs' : 'text-slate-400'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('gallery', 'original')}
              title={t('views.original')}
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'original' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-xs' : 'text-slate-400'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {currentUser?.role === 'admin' && (
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t('action.batchUpload')}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadPhoto}
                accept="image/*"
                multiple
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Batch Operations Bar */}
      <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        systemSettings.transparentCards
          ? 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium hover:text-rose-500"
          >
            {selectedIds.length === photos.length && photos.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-rose-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{t('action.selectAll')} ({selectedIds.length}/{photos.length})</span>
          </button>

          {selectedIds.length > 0 && (
            <>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1 text-rose-500 hover:text-rose-600 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('action.batchDelete')} ({selectedIds.length})</span>
                </button>
              )}
              <button
                onClick={handleBatchDownloadZip}
                className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('action.batchDownload')} ({selectedIds.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className={getLayoutClass()}>
        {photos.map(photo => {
          const isSelected = selectedIds.includes(photo.id);

          // Small list view
          if (currentViewMode === 'small') {
            return (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between gap-4 cursor-pointer transition hover:shadow-md ${
                  isSelected ? 'ring-2 ring-rose-500' : ''
                } ${
                  systemSettings.transparentCards
                    ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={e => handleToggleSelect(photo.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-500 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
                    <SafeImage src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {photo.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {new Date(photo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={e => handleDownloadSingle(photo, e)}
                    className="p-1.5 text-slate-400 hover:text-sky-500"
                    title="下载原图"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={e => handleDeletePhoto(photo.id, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Card or Original Grid
          return (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 aspect-[4/3] ${
                isSelected ? 'ring-4 ring-rose-500' : ''
              }`}
            >
              <SafeImage
                src={photo.url}
                alt={photo.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Selection Checkbox on Image */}
              <button
                onClick={e => handleToggleSelect(photo.id, e)}
                className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose-500 transition"
              >
                {isSelected ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-white/80" />}
              </button>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                <span className="text-xs font-semibold text-white drop-shadow truncate">
                  {photo.title}
                </span>
                <span className="text-[10px] text-white/70">
                  {photo.category} • {new Date(photo.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                <button
                  onClick={e => handleDownloadSingle(photo, e)}
                  className="p-1.5 bg-black/60 hover:bg-sky-600 text-white rounded-lg transition"
                  title="下载原图"
                >
                  <Download className="w-4 h-4" />
                </button>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={e => handleDeletePhoto(photo.id, e)}
                    className="p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-lg transition"
                    title="删除相片"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal with Next / Prev */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none"
        >
          {/* Top Controls */}
          <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
            <span className="text-xs text-white/70 font-mono">
              {currentPhotoIndex + 1} / {photos.length}
            </span>
            <button
              onClick={e => handleDownloadSingle(selectedPhoto, e)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="下载"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Left / Prev Arrow */}
          {photos.length > 1 && (
            <button
              onClick={handlePrevPhoto}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition hover:scale-110"
              title="上一张 (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Center Image Container */}
          <div
            onClick={e => e.stopPropagation()}
            className="max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col items-center justify-center cursor-default"
          >
            <SafeImage
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="mt-4 text-center text-white space-y-1">
              <h3 className="text-base font-bold font-serif-sc">{selectedPhoto.title}</h3>
              <p className="text-xs text-white/70">
                {selectedPhoto.category} • {new Date(selectedPhoto.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Right / Next Arrow */}
          {photos.length > 1 && (
            <button
              onClick={handleNextPhoto}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition hover:scale-110"
              title="下一张 (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
