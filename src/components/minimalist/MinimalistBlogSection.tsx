import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Post } from '../../types';
import {
  Sparkles,
  Calendar,
  Eye,
  Heart,
  Bookmark,
  Search,
  ArrowRight,
  BookOpen,
  ArrowLeft,
  Share2,
} from 'lucide-react';

export const MinimalistBlogSection: React.FC = () => {
  const { posts, toggleBookmark, systemSettings } = useApp();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const visiblePosts = posts.filter(p => !p.deleted);

  // Extract all unique tags
  const allTags = Array.from(new Set(visiblePosts.flatMap(p => p.tags || [])));

  const filteredPosts = visiblePosts.filter(post => {
    const matchTag = selectedTag === 'all' || post.tags.includes(selectedTag);
    const matchSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTag && matchSearch;
  });

  // Group posts by year/month for classic blog.zrf.me aesthetic
  const postsByYear: Record<string, Post[]> = {};
  filteredPosts.forEach(post => {
    const year = new Date(post.createdAt).getFullYear().toString();
    if (!postsByYear[year]) postsByYear[year] = [];
    postsByYear[year].push(post);
  });

  const sortedYears = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  if (selectedPost) {
    return (
      <div className={`max-w-3xl mx-auto py-8 px-4 sm:px-6 rounded-3xl border shadow-sm ${
        systemSettings.transparentCards
          ? 'bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        {/* Back button */}
        <button
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-500 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回极简目录 (Return to Index)</span>
        </button>

        <article className="space-y-6">
          <header className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono">{new Date(selectedPost.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="text-sky-600 dark:text-sky-400">{selectedPost.category}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {selectedPost.views} 次阅读
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {selectedPost.title}
            </h1>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedPost.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleBookmark(selectedPost.id)}
                  className={`p-2 rounded-xl transition ${
                    selectedPost.isBookmarked
                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title={selectedPost.isBookmarked ? '取消收藏' : '添加收藏'}
                >
                  <Bookmark className={`w-4 h-4 ${selectedPost.isBookmarked ? 'fill-amber-500' : ''}`} />
                </button>
              </div>
            </div>
          </header>

          <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-base sm:text-lg whitespace-pre-line">
            {selectedPost.content}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto py-8 px-4 sm:px-8 rounded-3xl border shadow-sm ${
      systemSettings.transparentCards
        ? 'bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-white/20'
        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
    }`}>
      {/* Header Styled after blog.zrf.me */}
      <div className="pb-8 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center font-mono font-bold text-xs">
              A
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-slate-100">
              极简博客模式 (Minimalist Index)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredPosts.length} 篇归档 • 实时同步自 D1 主库
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-serif leading-relaxed">
          纯粹、专注、无打扰的纯文字排版空间，摒弃冗余繁杂，重塑深度文字阅读体验。
        </p>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1 rounded-full text-xs transition ${
                selectedTag === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              全部 (All)
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition ${
                  selectedTag === tag
                    ? 'bg-sky-500 text-white font-medium'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索极简归档文章..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Grouped Article Archive Timeline */}
      <div className="py-6 space-y-10">
        {sortedYears.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-serif">
            未检索到相关极简博客文章
          </div>
        ) : (
          sortedYears.map(year => (
            <div key={year} className="space-y-4">
              <div className="text-xl sm:text-2xl font-mono font-bold text-slate-300 dark:text-slate-700">
                {year}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {postsByYear[year].map(post => {
                  const dateStr = new Date(post.createdAt)
                    .toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="group py-3.5 flex items-baseline justify-between gap-4 cursor-pointer hover:text-sky-600 transition"
                    >
                      <div className="flex items-baseline gap-4 min-w-0">
                        <span className="text-xs font-mono text-slate-400 group-hover:text-sky-500 shrink-0 w-16">
                          {dateStr}
                        </span>
                        <h3 className="text-sm sm:text-base font-serif font-medium text-slate-800 dark:text-slate-200 group-hover:text-sky-500 dark:group-hover:text-sky-400 truncate">
                          {post.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400 font-mono">
                        <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                          {post.category}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
