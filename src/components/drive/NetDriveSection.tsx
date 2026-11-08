import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CloudFile } from '../../types';
import {
  HardDrive,
  Upload,
  Download,
  Trash2,
  File,
  FileText,
  FileArchive,
  Image,
  Folder,
  CheckCircle,
  Database,
} from 'lucide-react';

export const NetDriveSection: React.FC = () => {
  const {
    files,
    setFiles,
    currentUser,
    uploadFile,
    startTransfer,
    updateTransferPercent,
    finishTransfer,
    systemSettings,
  } = useApp();

  const [activeFolder, setActiveFolder] = useState<string>('root');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadNetDriveFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploaded = await uploadFile(file);
    const newFile: CloudFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      url: uploaded.url,
      folder: activeFolder,
      provider: 'r2',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setFiles(prev => [newFile, ...prev]);
  };

  const handleDownloadFile = (file: CloudFile) => {
    startTransfer('download', file.name);
    let p = 15;
    const interval = setInterval(() => {
      p += 25;
      if (p >= 100) {
        clearInterval(interval);
        finishTransfer();
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        a.click();
      } else {
        updateTransferPercent(p);
      }
    }, 150);
  };

  const handleDeleteFile = (id: string) => {
    if (window.confirm('确认彻底删除该文件吗？')) {
      setFiles(prev => prev.filter(f => f.id !== id));
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image className="w-5 h-5 text-rose-500" />;
    if (type.includes('zip') || type.includes('tar') || type.includes('rar'))
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    if (type.includes('text') || type.includes('pdf'))
      return <FileText className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-rose-500" />
            <span>个人云盘 & 对象存储</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            原生无缝连接 Cloudflare R2 对象存储，支持大文件流式断点续传与安全直链下载
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            存储容量:{' '}
            <span className="font-semibold text-rose-500">
              {((systemSettings.usedCapacityBytes || 0) / (1024 * 1024)).toFixed(2)} MB
            </span>{' '}
            /{' '}
            <span>
              {((systemSettings.totalCapacityBytes || 10737418240) / (1024 * 1024 * 1024)).toFixed(0)} GB
            </span>
          </div>

          {currentUser?.role === 'admin' && (
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                <Upload className="w-4 h-4" />
                <span>上传文件至 R2</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadNetDriveFile}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Cloud File Table List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>文件名称 ({files.length} 个项目)</span>
          <div className="flex items-center gap-8">
            <span className="hidden sm:inline">存储源</span>
            <span>文件大小</span>
            <span>操作</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {files.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Folder className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              云盘目前为空。点击右上角“上传文件至 R2”开始使用！
            </div>
          ) : (
            files.map(file => (
              <div
                key={file.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-rose-500 transition">
                      {file.name}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {new Date(file.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-8 text-xs text-slate-500 shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-mono">
                    <Database className="w-3 h-3" />
                    Cloudflare R2
                  </span>
                  <span className="font-mono text-xs">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      title="带进度条极速下载"
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        title="删除文件"
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
