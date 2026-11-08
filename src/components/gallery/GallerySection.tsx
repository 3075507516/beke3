import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Photo } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { Image as ImageIcon, Plus, Trash2, X, ZoomIn, Eye } from 'lucide-react';

export const GallerySection: React.FC = () => {
  const { photos, setPhotos, currentUser, uploadFile } = useApp();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploaded = await uploadFile(file);
    const newPhoto: Photo = {
      id: `photo-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      url: uploaded.url,
      category: '个人相册',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPhotos(prev => [newPhoto, ...prev]);
  };

  const handleDeletePhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确认删除此照片吗？')) {
      setPhotos(prev => prev.filter(p => p.id !== id));
      if (selectedPhoto?.id === id) setSelectedPhoto(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-rose-500" />
            <span>光影相册</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            捕捉生活精彩瞬间与风光缩影，支持高清原图预览与云端持久化
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>上传相片</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadPhoto}
              accept="image/*"
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {photos.map(photo => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 aspect-[4/3]"
          >
            <SafeImage
              src={photo.url}
              alt={photo.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
              <span className="text-xs font-semibold text-white drop-shadow">
                {photo.title}
              </span>
              <span className="text-[10px] text-white/70">
                {photo.category} • {new Date(photo.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>

            {/* Admin Delete Action */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={e => handleDeletePhoto(photo.id, e)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                title="删除相片"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in cursor-zoom-out"
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            onClick={e => e.stopPropagation()}
            className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl cursor-default"
          >
            <SafeImage
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="mt-3 text-center text-white">
              <h3 className="text-base font-bold font-serif-sc">{selectedPhoto.title}</h3>
              {selectedPhoto.description && (
                <p className="text-xs text-white/70 mt-1">{selectedPhoto.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
