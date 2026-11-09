import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';
import { Post } from '../../types';
import {
  Bookmark,
  Calendar,
  Eye,
  Trash2,
  ExternalLink,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface BookmarksSectionProps {
  onSelectPost?: (post: Post) => void;
}

export const BookmarksSection: React.FC<BookmarksSectionProps> = ({ onSelectPost }) => {
  const { posts, toggleBookmark, systemSettings } = useApp();
  const bookmarkedPosts = posts.filter(p => !p.deleted && p.isBookmarked);

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
            <Bookmark className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>博客收藏夹 (Favorites & Bookmarks)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            您珍藏与特别标记的博客文章，随时重温与快速查阅
          </p>
        </div>

        <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
          共收藏 {bookmarkedPosts.length} 篇
        </span>
      </div>

      {bookmarkedPosts.length === 0 ? (
        <div className={`py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 ${
          systemSettings.transparentCards ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-white dark:bg-slate-900'
        }`}>
          <Bookmark className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">收藏夹暂无内容</h3>
          <p className="text-xs text-slate-400 mt-1">
            在博文详情页或列表页点击“书签”按钮，即可快速加入收藏。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bookmarkedPosts.map(post => (
            <div
              key={post.id}
              className={`rounded-3xl overflow-hidden border shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                systemSettings.transparentCards
                  ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="h-44 w-full relative overflow-hidden">
                  <SafeImage
                    src={post.cover}
                    alt={post.title}
                    className="w-full h-full object-cover transition duration-500 hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => toggleBookmark(post.id)}
                      className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-amber-400 backdrop-blur-sm transition"
                      title="取消收藏"
                    >
                      <Bookmark className="w-4 h-4 fill-amber-400" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="text-[10px] px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-sm font-medium">
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {post.summary}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-2 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>

                <span className="flex items-center gap-1 text-[11px]">
                  <Eye className="w-3.5 h-3.5" />
                  {post.views}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
