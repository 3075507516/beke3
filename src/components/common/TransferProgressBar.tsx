import React from 'react';
import { useApp } from '../../context/AppContext';
import { UploadCloud, DownloadCloud, Database, RefreshCw, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const TransferProgressBar: React.FC = () => {
  const { transferProgress, multiTransferProgress, toasts, dismissToast, cancelTransfer } = useApp();

  const isMulti = multiTransferProgress.active;
  const isSingle = transferProgress.active;

  const getIcon = (type: 'upload' | 'download' | 'backup' | 'restore') => {
    switch (type) {
      case 'upload':
        return <UploadCloud className="w-5 h-5 text-rose-500 animate-bounce" />;
      case 'download':
        return <DownloadCloud className="w-5 h-5 text-sky-500 animate-bounce" />;
      case 'backup':
        return <Database className="w-5 h-5 text-emerald-500 animate-pulse" />;
      case 'restore':
        return <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />;
    }
  };

  const getTitle = (type: 'upload' | 'download' | 'backup' | 'restore') => {
    switch (type) {
      case 'upload':
        return '文件上传中...';
      case 'download':
        return '文件下载中...';
      case 'backup':
        return '备份至 WebDAV 中...';
      case 'restore':
        return '备份还原中...';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {/* Toast Notifications List */}
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md animate-in slide-in-from-right-4 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/95 text-white border-emerald-400'
              : toast.type === 'error'
              ? 'bg-rose-500/95 text-white border-rose-400'
              : 'bg-slate-800/95 text-white border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-white" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-white" />}
            <span className="text-xs font-medium leading-snug line-clamp-2">{toast.message}</span>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 text-white/80 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* Multi-file Progress Display */}
      {isMulti && (
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {getIcon(multiTransferProgress.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {multiTransferProgress.type === 'upload' ? '多文件批量上传' : '多文件批量下载打包'}
                </h4>
                <span className="text-[11px] font-mono font-semibold text-sky-500">
                  {multiTransferProgress.currentIndex}/{multiTransferProgress.totalCount} 文件
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {multiTransferProgress.currentFileName || '正在处理传输流...'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-sky-500">
                {Math.round(multiTransferProgress.overallPercent)}%
              </span>
              {multiTransferProgress.speed && (
                <p className="text-[10px] text-slate-400">{multiTransferProgress.speed}</p>
              )}
            </div>
          </div>

          {/* Overall Progress Track */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-rose-500 rounded-full transition-all duration-200"
              style={{ width: `${multiTransferProgress.overallPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
            <span>总进度概览</span>
            <span>已完成 {Math.round(multiTransferProgress.overallPercent)}%</span>
          </div>
        </div>
      )}

      {/* Single File Transfer Progress Display */}
      {!isMulti && isSingle && (
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {getIcon(transferProgress.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {getTitle(transferProgress.type)}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {transferProgress.fileName || '正在处理数据流'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-rose-500">
                {Math.round(transferProgress.percent)}%
              </span>
              {transferProgress.speed && (
                <p className="text-[10px] text-slate-400">{transferProgress.speed}</p>
              )}
              {(transferProgress.type === 'backup' || transferProgress.type === 'restore' || transferProgress.type === 'download') && (
                <button type="button" onClick={cancelTransfer} className="mt-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">停止</button>
              )}
            </div>
          </div>

          {/* Progress Track */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-200"
              style={{ width: `${transferProgress.percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
