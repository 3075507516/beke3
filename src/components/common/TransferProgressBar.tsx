import React from 'react';
import { useApp } from '../../context/AppContext';
import { UploadCloud, DownloadCloud, Database, RefreshCw } from 'lucide-react';

export const TransferProgressBar: React.FC = () => {
  const { transferProgress } = useApp();

  if (!transferProgress.active) {
    return null; // strictly appear only during operations
  }

  const getIcon = () => {
    switch (transferProgress.type) {
      case 'upload':
        return <UploadCloud className="w-5 h-5 text-rose-500 animate-bounce" />;
      case 'download':
        return <DownloadCloud className="w-5 h-5 text-blue-500 animate-bounce" />;
      case 'backup':
        return <Database className="w-5 h-5 text-emerald-500 animate-pulse" />;
      case 'restore':
        return <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />;
    }
  };

  const getTitle = () => {
    switch (transferProgress.type) {
      case 'upload':
        return '文件上传中...';
      case 'download':
        return '文件下载中...';
      case 'backup':
        return '数据备份至坚果云中...';
      case 'restore':
        return '数据备份还原中...';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {getTitle()}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {transferProgress.fileName || '正在处理数据流'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-rose-500">
            {Math.round(transferProgress.percent)}%
          </span>
          {transferProgress.speed && (
            <p className="text-[10px] text-slate-400">{transferProgress.speed}</p>
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
  );
};
