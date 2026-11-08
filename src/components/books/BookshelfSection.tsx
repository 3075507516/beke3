import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Book } from '../../types';
import { SafeImage } from '../common/SafeImage';
import {
  BookOpen,
  Plus,
  Upload,
  Maximize2,
  Minimize2,
  X,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookMarked,
} from 'lucide-react';

export const BookshelfSection: React.FC = () => {
  const { books, setBooks, currentUser, uploadFile, startTransfer, updateTransferPercent, finishTransfer } = useApp();
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [isUploading, setIsUploading] = useState(false);

  // New book state
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newFormat, setNewFormat] = useState<'EPUB' | 'PDF' | 'TXT' | 'MOBI' | 'AZW3'>('EPUB');
  const [newDesc, setNewDesc] = useState('');
  const [newCover, setNewCover] = useState('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBookFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Detect format from extension
    const ext = file.name.split('.').pop()?.toUpperCase() || 'TXT';
    const format = ['EPUB', 'PDF', 'TXT', 'MOBI', 'AZW3'].includes(ext)
      ? (ext as any)
      : 'TXT';

    const uploaded = await uploadFile(file);

    // Read initial text preview if text-based
    let textContent = `已载入文件: ${file.name}\n\n格式: ${format}\n大小: ${(file.size / 1024 / 1024).toFixed(2)} MB\n\n[fox3 全格式阅读器] 本书支持沉浸式阅读与移动端全屏浏览。`;
    if (file.type.includes('text') || ext === 'TXT') {
      try {
        const text = await file.text();
        if (text) textContent = text.substring(0, 50000);
      } catch (e) {
        // use fallback
      }
    }

    const createdBook: Book = {
      id: `book-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: currentUser?.username || '保罗',
      format,
      cover: newCover,
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
    let p = 20;
    const interval = setInterval(() => {
      p += 30;
      if (p >= 100) {
        clearInterval(interval);
        finishTransfer();
        // Trigger browser download if applicable
        const link = document.createElement('a');
        link.href = book.fileUrl || '#';
        link.download = `${book.title}.${book.format.toLowerCase()}`;
        link.click();
      } else {
        updateTransferPercent(p);
      }
    }, 150);
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
                <span className="text-[10px] text-rose-500 font-medium uppercase tracking-wider">
                  [{readingBook.format}] • {readingBook.author}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

              {/* Fullscreen Toggle - leaves status bar unobscured on mobile */}
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
                `${readingBook.title}\n\n该书籍文件格式为 [${readingBook.format}]，已就绪可供下载或云端离线解析。在手机端或电脑端均支持全屏沉浸式无干扰阅读体验。`}
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-rose-500" />
            <span>云端书架 (支持 EPUB / PDF / TXT / MOBI / AZW3)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            全面支持多格式电子书解析、移动端沉浸全屏阅读与本地离线高可用存储
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsUploading(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>上传新电子书</span>
          </button>
        )}
      </div>

      {/* Bookshelf Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {books.map(book => (
          <div
            key={book.id}
            onClick={() => setReadingBook(book)}
            className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            {/* Book Cover */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <SafeImage
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold rounded">
                {book.format}
              </span>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={e => handleDeleteBook(book.id, e)}
                  className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition"
                  title="删除书籍"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Book Meta */}
            <div className="p-3">
              <h4 className="text-xs font-bold font-serif-sc text-slate-800 dark:text-slate-100 truncate group-hover:text-rose-500 transition">
                {book.title}
              </h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{book.author}</p>

              {/* Progress bar */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>{(book.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                <span className="text-rose-500 font-medium">开始阅读</span>
              </div>
            </div>
          </div>
        ))}
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
              className="border-2 border-dashed border-rose-300 dark:border-rose-900/60 rounded-2xl p-8 text-center cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-8 h-8 text-rose-500" />
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
