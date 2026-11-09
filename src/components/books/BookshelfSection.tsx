import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Book, ViewMode } from '../../types';
import { SafeImage } from '../common/SafeImage';
import {
  BookOpen,
  Plus,
  Upload,
  Maximize2,
  Minimize2,
  X,
  Trash2,
  BookMarked,
  Download,
  CheckSquare,
  Square,
  Columns,
  Grid3X3,
  List,
  LayoutGrid,
} from 'lucide-react';

export const BookshelfSection: React.FC = () => {
  const {
    books,
    setBooks,
    currentUser,
    uploadFile,
    startTransfer,
    updateTransferPercent,
    finishTransfer,
    viewModes,
    setViewMode,
    systemSettings,
  } = useApp();

  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const currentViewMode: ViewMode = viewModes['books'] || 'original';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBookFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toUpperCase() || 'TXT';
    const format = ['EPUB', 'PDF', 'TXT', 'MOBI', 'AZW3'].includes(ext)
      ? (ext as any)
      : 'TXT';

    const uploaded = await uploadFile(file);

    let textContent = `已载入电子书: ${file.name}\n\n格式: ${format}\n文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB\n\n【第一章 数字化知识探索】\n在无边界的数字世界中，阅读是一场跨越维度的深邃旅程。无论通过 EPUB 还是 PDF，文字赋予思想以力量。\n\n【第二章 自由与创作】\n追求极简主义的人，把复杂性隐入底层，把优雅与克制留给读者。`;
    if (file.type.includes('text') || ext === 'TXT') {
      try {
        const text = await file.text();
        if (text) textContent = text.substring(0, 50000);
      } catch {
        // Fallback
      }
    }

    const createdBook: Book = {
      id: `book-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: currentUser?.username || 'fox',
      format,
      cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
      description: `本地上传书籍：${file.name}`,
      fileSize: file.size,
      fileUrl: uploaded.url,
      content: textContent,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setBooks(prev => [createdBook, ...prev]);
    setIsUploading(false);
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === books.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(books.map(b => b.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`确认批量删除选中的 ${selectedIds.length} 本书籍吗？`)) {
      setBooks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setSelectedIds([]);
    }
  };

  const handleBatchDownload = () => {
    if (selectedIds.length === 0) return;
    const exportBooks = books.filter(b => selectedIds.includes(b.id));
    const blob = new Blob([JSON.stringify(exportBooks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fox3_books_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确认下架并删除该书籍吗？')) {
      setBooks(prev => prev.filter(b => b.id !== id));
      if (readingBook?.id === id) setReadingBook(null);
    }
  };

  const handleDownload = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransfer('download', `${book.title}.${book.format.toLowerCase()}`);
    let p = 25;
    const interval = setInterval(() => {
      p += 35;
      if (p >= 100) {
        clearInterval(interval);
        finishTransfer();
        // File download trigger
        const link = document.createElement('a');
        link.href = book.fileUrl || '#';
        link.download = `${book.title}.${book.format.toLowerCase()}`;
        link.click();
      } else {
        updateTransferPercent(p);
      }
    }, 120);
  };

  // Full Screen Mobile / Desktop Reader Modal
  if (readingBook) {
    return (
      <div
        className={`fixed inset-0 z-50 bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex flex-col transition-all duration-300 ${
          isFullScreen ? 'p-0' : 'p-2 sm:p-6 md:p-10'
        }`}
      >
        <div className="flex-1 bg-white dark:bg-stone-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800">
          {/* Reader Top Bar - with mobile safe area support */}
          <div className="safe-top px-4 py-3 bg-white/95 dark:bg-stone-900/95 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setReadingBook(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-sm font-bold truncate max-w-xs sm:max-w-md font-serif-sc">
                  {readingBook.title}
                </h3>
                <span className="text-[10px] text-sky-500 font-medium uppercase tracking-wider">
                  [{readingBook.format}] • {readingBook.author}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Download book file button */}
              <button
                onClick={e => handleDownload(readingBook, e)}
                title="下载书籍原文件"
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">下载</span>
              </button>

              {/* Font Sizer */}
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1 text-xs">
                <button
                  onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                  className="px-2 py-0.5 rounded hover:bg-white dark:hover:bg-stone-700"
                >
                  A-
                </button>
                <span className="px-1 text-[11px] font-mono">{fontSize}px</span>
                <button
                  onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                  className="px-2 py-0.5 rounded hover:bg-white dark:hover:bg-stone-700"
                >
                  A+
                </button>
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? '退出全屏' : '全屏沉浸阅读'}
                className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition"
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Reader Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-12 md:p-16 max-w-3xl mx-auto w-full">
            <div
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
              className="font-serif-sc space-y-6 text-stone-800 dark:text-stone-200 select-text whitespace-pre-wrap leading-relaxed"
            >
              {readingBook.content ||
                `${readingBook.title}\n\n该书籍文件格式为 [${readingBook.format}]，已就绪可供下载或云端解析。在手机端或电脑端均支持全屏沉浸式无干扰阅读体验。`}
            </div>
          </div>

          {/* Reader Bottom Bar */}
          <div className="safe-bottom px-6 py-2 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
            <span>格式: {readingBook.format} • {(readingBook.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            <span>已读进度: {readingBook.progress || 25}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Get layout grid class
  const getLayoutClass = () => {
    switch (currentViewMode) {
      case 'big':
        return 'grid grid-cols-1 sm:grid-cols-2 gap-6';
      case 'medium':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5';
      case 'small':
        return 'space-y-3';
      case 'original':
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        systemSettings.transparentCards
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-sky-500" />
            <span>云端书架 (支持 EPUB / PDF / TXT / MOBI / AZW3)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            支持多格式电子书在线章节阅读、手机沉浸全屏阅读、原书下载与本地高可用
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('books', 'big')}
              title="大图封面"
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'big' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-xs' : 'text-slate-400'}`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('books', 'medium')}
              title="中图网格"
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'medium' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-xs' : 'text-slate-400'}`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('books', 'small')}
              title="小图详情列表"
              className={`p-1.5 rounded-lg transition ${currentViewMode === 'small' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-xs' : 'text-slate-400'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('books', 'original')}
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
              <Plus className="w-4 h-4" />
              <span>上传电子书</span>
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
              {selectedIds.length === books.length && books.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-sky-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>全选 ({selectedIds.length}/{books.length})</span>
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

      {/* Bookshelf Grid View */}
      <div className={getLayoutClass()}>
        {books.map(book => {
          const isSelected = selectedIds.includes(book.id);

          // Small Detail List View
          if (currentViewMode === 'small') {
            return (
              <div
                key={book.id}
                onClick={() => setReadingBook(book)}
                className={`p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center justify-between gap-4 cursor-pointer transition hover:shadow-md ${
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
                      onClick={e => handleToggleSelect(book.id, e)}
                      className="p-1 text-slate-400 hover:text-sky-500 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0">
                    <SafeImage src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                        {book.format}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {book.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{book.author}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={e => handleDownload(book, e)}
                    className="p-2 text-slate-400 hover:text-sky-500"
                    title="下载书籍"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-sky-500 font-medium hidden sm:inline">在线阅读</span>
                </div>
              </div>
            );
          }

          // Card View
          return (
            <div
              key={book.id}
              onClick={() => setReadingBook(book)}
              className={`group cursor-pointer rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                isSelected ? 'ring-2 ring-sky-500' : ''
              } ${
                systemSettings.transparentCards
                  ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <SafeImage
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold rounded">
                  {book.format}
                </span>

                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <button
                    onClick={e => handleDownload(book, e)}
                    className="p-1 bg-black/60 hover:bg-sky-600 text-white rounded transition"
                    title="下载电子书文件"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={e => handleDeleteBook(book.id, e)}
                      className="p-1 bg-black/60 hover:bg-rose-600 text-white rounded transition"
                      title="删除书籍"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3">
                <h4 className="text-xs font-bold font-serif-sc text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-500 transition">
                  {book.title}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{book.author}</p>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{(book.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                  <span className="text-sky-500 font-medium">开始阅读</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Book Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold font-serif-sc text-slate-900 dark:text-slate-100 mb-4">
              上传并添加多格式电子书
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              支持 EPUB, PDF, TXT, MOBI, AZW3 等电子书格式。文件自动同步至 Cloudflare R2 / 本地安全库。
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-sky-300 dark:border-sky-900/60 rounded-2xl p-8 text-center cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-8 h-8 text-sky-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                点击选择电子书文件
              </span>
              <span className="text-[10px] text-slate-400">
                .epub, .pdf, .txt, .mobi, .azw3
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBookFileUpload}
              accept=".epub,.pdf,.txt,.mobi,.azw3"
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
