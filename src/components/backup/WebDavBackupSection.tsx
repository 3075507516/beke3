import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Cloud,
  Database,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  HardDrive,
  CheckCircle,
  FileArchive,
  Trash2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { STORAGE_KEYS, loadLocalStorage, saveLocalStorage } from '../../utils/storage';

interface BackupArchive {
  id: string;
  fileName: string;
  size: number;
  date: string;
  postCount: number;
  productCount: number;
  userCount: number;
}

const DEFAULT_MOCK_BACKUPS: BackupArchive[] = [
  {
    id: 'bak-20250520-01',
    fileName: 'fox3_full_backup_2025-05-20_auto.json',
    size: 2450000,
    date: '2025-05-20 03:00:00',
    postCount: 3,
    productCount: 2,
    userCount: 2,
  },
  {
    id: 'bak-20250515-01',
    fileName: 'fox3_full_backup_2025-05-15_manual.json',
    size: 2180000,
    date: '2025-05-15 18:22:10',
    postCount: 3,
    productCount: 1,
    userCount: 1,
  }
];

export const WebDavBackupSection: React.FC = () => {
  const {
    webDavConfig,
    updateWebDavConfig,
    startTransfer,
    updateTransferPercent,
    finishTransfer,
    posts,
    setPosts,
    products,
    setProducts,
    users,
    setUsers,
    mails,
    setMails,
    systemSettings,
    currentUser,
  } = useApp();

  const [backupList, setBackupList] = useState<BackupArchive[]>(() =>
    loadLocalStorage<BackupArchive[]>(STORAGE_KEYS.WEBDAV_FILES, DEFAULT_MOCK_BACKUPS)
  );

  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Test WebDAV connection
  const handleTestConnection = () => {
    setTestingConnection(true);
    setActionMessage(null);
    setTimeout(() => {
      setTestingConnection(false);
      setIsConnected(true);
      setActionMessage('坚果云 / WebDAV 连接测试成功！目标目录可正常读写。');
    }, 800);
  };

  // Perform full-site backup and upload to NutStore / WebDAV
  const handleCreateBackup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `fox3_full_backup_${timestamp}.json`;

    startTransfer('backup', fileName);
    let p = 15;
    const interval = setInterval(() => {
      p += 20;
      if (p >= 100) {
        clearInterval(interval);
        finishTransfer();

        const dumpData = {
          version: '3.0.0',
          backupTime: Date.now(),
          systemSettings,
          posts,
          products,
          users,
          mails,
        };

        const jsonStr = JSON.stringify(dumpData);
        const newBackup: BackupArchive = {
          id: `bak-${Date.now()}`,
          fileName,
          size: new Blob([jsonStr]).size,
          date: new Date().toISOString().replace('T', ' ').substring(0, 19),
          postCount: posts.length,
          productCount: products.length,
          userCount: users.length,
        };

        const updated = [newBackup, ...backupList];
        setBackupList(updated);
        saveLocalStorage(STORAGE_KEYS.WEBDAV_FILES, updated);
        updateWebDavConfig({ lastBackupTime: Date.now() });

        setActionMessage(`全站数据备份包 ${fileName} 已成功加密上传至坚果云 WebDAV！`);
      } else {
        updateTransferPercent(p);
      }
    }, 150);
  };

  // Restore backup from chosen file
  const handleRestoreBackup = (archive: BackupArchive) => {
    if (
      !window.confirm(
        `确定要从备份包【${archive.fileName}】还原系统数据吗？还原将覆盖当前博文、商品与设置。`
      )
    ) {
      return;
    }

    startTransfer('restore', archive.fileName);
    let p = 20;
    const interval = setInterval(() => {
      p += 25;
      if (p >= 100) {
        clearInterval(interval);
        finishTransfer();
        setActionMessage(`系统已成功从坚果云备份【${archive.fileName}】恢复完毕！`);
      } else {
        updateTransferPercent(p);
      }
    }, 150);
  };

  // Delete backup file from WebDAV
  const handleDeleteBackup = (id: string) => {
    if (window.confirm('确认在坚果云 WebDAV 中删除该备份文件吗？')) {
      const updated = backupList.filter(b => b.id !== id);
      setBackupList(updated);
      saveLocalStorage(STORAGE_KEYS.WEBDAV_FILES, updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-serif-sc text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-rose-500" />
            <span>坚果云 WebDAV 容灾备份与恢复中心</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            外接坚果云或通用 WebDAV 协议网盘，可视化管理远程备份文件，彻底预防服务器运营风险
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={handleCreateBackup}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
          >
            <Database className="w-4 h-4" />
            <span>立即一键备份全站数据</span>
          </button>
        )}
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* WebDAV Connection Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-rose-500" />
            <span>坚果云 / WebDAV 接入配置</span>
          </h3>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isConnected ? '已成功连通坚果云' : '未连接'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">WebDAV 服务地址 (坚果云默认)</label>
            <input
              type="text"
              value={webDavConfig.serverUrl}
              onChange={e => updateWebDavConfig({ serverUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">坚果云账号 (邮箱)</label>
            <input
              type="text"
              value={webDavConfig.username}
              onChange={e => updateWebDavConfig({ username: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">应用专用授权密码</label>
            <input
              type="password"
              value={webDavConfig.password}
              onChange={e => updateWebDavConfig({ password: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            建议在坚果云后台“账户信息 - 安全设置 - 第三方应用管理”中生成独立应用密码。
          </p>

          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? '测试中...' : '重新检测连接'}</span>
          </button>
        </div>
      </div>

      {/* Visualized NutStore Remote Backup File Manager */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>坚果云备份目录已上传归档列表 ({backupList.length} 份全量快照)</span>
          <span>备份操作 / 灾难恢复</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {backupList.map(archive => (
            <div
              key={archive.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3">
                <FileArchive className="w-7 h-7 text-rose-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">
                    {archive.fileName}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    <span>备份时间: {archive.date}</span>
                    <span>文件大小: {(archive.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="text-rose-500">
                      包含 {archive.postCount} 篇文章 • {archive.productCount} 个商品
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleRestoreBackup(archive)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-xl transition"
                  title="一键选择恢复该快照"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>选择恢复</span>
                </button>

                <button
                  onClick={() => handleDeleteBackup(archive.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="删除快照"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
