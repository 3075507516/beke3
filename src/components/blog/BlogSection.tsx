import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Post } from '../../types';
import { SafeImage } from '../common/SafeImage';
import {
  Search,
  Tag,
  Clock,
  Eye,
  Heart,
  Bookmark,
  Share2,
  PlusCircle,
  Edit3,
  Trash2,
  Check,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

export const BlogSection: React.FC = () => {
  const { posts, setPosts, currentUser, uploadFile } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activePost, setActivePost] = useState<Post | null>(null);

  // Editor modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<Post>>({
    title: '',
    summary: '',
    content: '',
    category: '技术架构',
    tags: ['fox3'],
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    author: currentUser?.username || 'fox',
  });

  const categories = ['all', ...Array.from(new Set(posts.map(p => p.category)))];

  const filteredPosts = posts.filter(post => {
    const matchesCat = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesQuery =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery && !post.deleted;
  });

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPosts(prev =>
      prev.map(p => (p.id === id ? { ...p, likes: p.likes + 1 } : p))
    );
    if (activePost && activePost.id === id) {
      setActivePost(prev => (prev ? { ...prev, likes: prev.likes + 1 } : null));
    }
  };

  const handleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPosts(prev =>
      prev.map(p => (p.id === id ? { ...p, isBookmarked: !p.isBookmarked } : p))
    );
    if (activePost && activePost.id === id) {
      setActivePost(prev => (prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null));
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确认删除这篇文章吗？')) {
      setPosts(prev => prev.filter(p => p.id !== id));
      if (activePost?.id === id) setActivePost(null);
    }
  };

  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost.title || !editingPost.content) return;

    if (editingPost.id) {
      // Update
      setPosts(prev =>
        prev.map(p =>
          p.id === editingPost.id
            ? ({
                ...p,
                ...editingPost,
                updatedAt: Date.now(),
              } as Post)
            : p
        )
      );
      if (activePost?.id === editingPost.id) {
        setActivePost({ ...activePost, ...editingPost } as Post);
      }
    } else {
      // Create new
      const newP: Post = {
        id: `post-${Date.now()}`,
        title: editingPost.title || '无标题文章',
        summary: editingPost.summary || editingPost.content.substring(0, 120),
        content: editingPost.content,
        category: editingPost.category || '默认分类',
        tags: editingPost.tags || ['fox3'],
        cover:
          editingPost.cover ||
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        author: currentUser?.username || 'fox',
        views: 1,
        likes: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPosts(prev => [newP, ...prev]);
    }
    setIsEditing(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadFile(file);
    setEditingPost(prev => ({ ...prev, cover: res.url }));
  };

  // Full Post Reading View
  if (activePost) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <button
          onClick={() => setActivePost(null)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回博文列表</span>
        </button>

        <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-sm">
          {/* Article Header */}
          <div className="space-y-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full text-xs font-semibold">
                {activePost.category}
              </span>
              {activePost.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="text-2xl md:text-4xl font-bold font-serif-sc text-slate-900 dark:text-slate-100 leading-tight">
              {activePost.title}
            </h1>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <div className="flex items-center gap-4">
                <span>作者: {activePost.author}</span>
                <span>
                  发布于:{' '}
                  {new Date(activePost.createdAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {activePost.views} 次浏览
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={e => handleLike(activePost.id, e)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>{activePost.likes}</span>
                </button>
                <button
                  onClick={e => handleBookmark(activePost.id, e)}
                  className={`p-1.5 rounded-lg border transition ${
                    activePost.isBookmarked
                      ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Article Cover */}
          <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden mb-8 shadow-sm">
            <SafeImage
              src={activePost.cover}
              alt={activePost.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Body */}
          <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed font-sans space-y-4 whitespace-pre-wrap">
            {activePost.content}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search, Filter Bar and Post Creation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索文章、标签或关键词..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'all' ? '全部专栏' : cat}
            </button>
          ))}
        </div>

        {/* Admin New Post Button */}
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingPost({
                title: '',
                summary: '',
                content: '',
                category: '技术架构',
                tags: ['fox3'],
                cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
                author: currentUser.username,
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>发布新博文</span>
          </button>
        )}
      </div>

      {/* Posts Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map(post => (
          <div
            key={post.id}
            onClick={() => {
              // Increase view count
              setPosts(prev =>
                prev.map(p => (p.id === post.id ? { ...p, views: p.views + 1 } : p))
              );
              setActivePost({ ...post, views: post.views + 1 });
            }}
            className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Cover Image */}
              <div className="relative w-full h-48 overflow-hidden">
                <SafeImage
                  src={post.cover}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium rounded-lg">
                  {post.category}
                </span>
              </div>

              {/* Text Info */}
              <div className="p-5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {new Date(post.createdAt).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span>{post.author}</span>
                </div>

                <h3 className="text-base font-bold font-serif-sc text-slate-800 dark:text-slate-100 group-hover:text-rose-500 transition line-clamp-2">
                  {post.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {post.summary}
                </p>
              </div>
            </div>

            {/* Footer Metrics & Actions */}
            <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {post.views}
                </span>
                <button
                  onClick={e => handleLike(post.id, e)}
                  className="flex items-center gap-1 hover:text-rose-500 transition"
                >
                  <Heart className="w-3.5 h-3.5" />
                  {post.likes}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {currentUser?.role === 'admin' && (
                  <>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingPost(post);
                        setIsEditing(true);
                      }}
                      title="编辑文章"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-500"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => handleDelete(post.id, e)}
                      title="删除文章"
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <span className="text-rose-500 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center">
                  阅读 <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Article Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold font-serif-sc text-slate-900 dark:text-slate-100 mb-6">
              {editingPost.id ? '编辑博文' : '撰写全新博文'}
            </h3>

            <form onSubmit={handleSavePost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  文章标题
                </label>
                <input
                  type="text"
                  value={editingPost.title || ''}
                  onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                  placeholder="例如：fox3 部署指南与性能调优"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    所属分类
                  </label>
                  <input
                    type="text"
                    value={editingPost.category || ''}
                    onChange={e => setEditingPost({ ...editingPost, category: e.target.value })}
                    placeholder="技术架构 / 部署指南 / 随想"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    标签 (逗号隔开)
                  </label>
                  <input
                    type="text"
                    value={editingPost.tags?.join(', ') || ''}
                    onChange={e =>
                      setEditingPost({
                        ...editingPost,
                        tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Cloudflare, D1, R2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Cover Image Uploader */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  文章封面图片
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                    <SafeImage
                      src={editingPost.cover || ''}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl cursor-pointer transition">
                    上传本地封面
                    <input
                      type="file"
                      onChange={handleCoverUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={editingPost.cover || ''}
                    onChange={e => setEditingPost({ ...editingPost, cover: e.target.value })}
                    placeholder="或粘贴图片 URL"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  简明概要
                </label>
                <input
                  type="text"
                  value={editingPost.summary || ''}
                  onChange={e => setEditingPost({ ...editingPost, summary: e.target.value })}
                  placeholder="展示在列表中的核心一句话概括"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  正文内容 (支持 Markdown 与排版)
                </label>
                <textarea
                  rows={8}
                  value={editingPost.content || ''}
                  onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
                  placeholder="在这里输入文章 Markdown 格式正文..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
                >
                  保存文章
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
