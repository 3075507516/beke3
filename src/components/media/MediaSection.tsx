import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MediaItem } from '../../types';
import { SafeImage } from '../common/SafeImage';
import {
  Play,
  Pause,
  Music,
  Film,
  Volume2,
  Trash2,
  Plus,
  Disc3,
} from 'lucide-react';

export const MediaSection: React.FC = () => {
  const { media, setMedia, currentUser } = useApp();
  const [currentPlaying, setCurrentPlaying] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = (item: MediaItem) => {
    if (currentPlaying?.id === item.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentPlaying(item);
      setIsPlaying(true);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-rose-500 animate-spin-slow" />
            <span>影音天地</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            原生流媒体播放中心，支持音频流与高清视频点播播放
          </p>
        </div>
      </div>

      {/* Active Player Box */}
      {currentPlaying && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden animate-in fade-in">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-lg border border-white/10 shrink-0">
              <SafeImage
                src={currentPlaying.cover}
                alt={currentPlaying.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-3 w-full">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-semibold">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {media.map(item => (
          <div
            key={item.id}
            onClick={() => togglePlay(item)}
            className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 flex items-center gap-4"
          >
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                {item.type}
              </span>
              <h4 className="text-sm font-bold font-serif-sc text-slate-800 dark:text-slate-100 truncate group-hover:text-rose-500 transition">
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
        ))}
      </div>
    </div>
  );
};
