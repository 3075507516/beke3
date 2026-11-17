import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle, BookOpen, CheckCircle, Cloud, Database, Download, FileArchive,
  FileText, HardDrive, Image as ImageIcon, Loader2, RefreshCw, RotateCcw,
  Save, ShieldCheck, Trash2, Upload, Video,
} from 'lucide-react';
import { WebDavBackupItem } from '../../types';
import { listWebDavFiles } from '../../utils/webdav';

function FileKindIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-fuchsia-500" />;
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext || '')) return <Video className="w-5 h-5 text-purple-500" />;
  if (['epub', 'pdf', 'mobi', 'azw3', 'txt'].includes(ext || '')) return <BookOpen className="w-5 h-5 text-amber-500" />;
  if (ext === 'zip') return <FileArchive className="w-5 h-5 text-sky-500" />;
  return <FileText className="w-5 h-5 text-slate-500" />;
}

export const WebDavBackupSection: React.FC = () => {
  const {
    webDavConfig, updateWebDavConfig, webDavBackups, setWebDavBackups,
    performBackup, performRestore, deleteWebDavBackup, currentUser,
    systemSettings, testWebDavConnection, webDavConnectionState, transferProgress, uploadWebDavRawFile, downloadWebDavRawFile,
  } = useApp();
  const [formConfig, setFormConfig] = useState(webDavConfig);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [backupScope, setBackupScope] = useState<'full' | 'posts' | 'books' | 'media' | 'settings'>('full');
  const rawFileInput = React.useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => setFormConfig(webDavConfig), [webDavConfig]);
  const refreshRemoteFiles = useCallback(async (config = formConfig) => {
    const connected = await testWebDavConnection(config);
    if (!connected) throw new Error('WebDAV 连通性验证失败，请检查服务地址、账号、应用密码及服务端部署');
    const items = await listWebDavFiles(config);
    setWebDavBackups(items);
    return items;
  }, [formConfig, setWebDavBackups, testWebDavConnection]);
  useEffect(() => {
    if (webDavConfig.serverUrl && webDavConfig.username && webDavConfig.password && webDavConfig.password !== '********') {
      void refreshRemoteFiles(webDavConfig).catch(error => setActionError(error?.message || '无法读取 WebDAV 远端文件'));
    }
    // Load the actual remote directory once on entering the page; never infer connectivity from filled fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveConfig = async () => {
    updateWebDavConfig(formConfig);
    setActionMessage(null);
    setActionError(null);
    if (!(await testWebDavConnection(formConfig))) {
      setActionError('配置已保存到本机，但远端 WebDAV 验证失败；状态灯不会显示已连接。');
      return;
    }
    try {
      const files = await listWebDavFiles(formConfig);
      setWebDavBackups(files);
      setActionMessage(`WebDAV 已验证并读取远端目录，共 ${files.length} 个文件。`);
    } catch (error: any) {
      setActionError(error?.message || '已连通，但无法读取远端目录');
    }
  };
  const handleRefresh = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const files = await refreshRemoteFiles();
      setActionMessage(`远端目录已刷新，共 ${files.length} 个文件。`);
    } catch (error: any) { setActionError(error?.message || '刷新 WebDAV 目录失败'); }
    finally { setBusy(false); }
  };
  const handleBackup = async () => {
    if (!isAdmin || busy) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await performBackup(backupScope);
      const files = await listWebDavFiles(webDavConfig);
      setWebDavBackups(files);
      setActionMessage('备份已由 WebDAV 服务器确认接收。');
    } catch (error: any) {
      setActionError(error?.name === 'AbortError' ? '备份已停止；请刷新目录确认远端文件状态。' : error?.message || 'WebDAV 备份失败');
    } finally { setBusy(false); }
  };
  const handleRawFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    let uploaded = 0;
    try {
      for (const file of files) {
        await uploadWebDavRawFile(file);
        uploaded += 1;
      }
      const remote = await listWebDavFiles(webDavConfig);
      setWebDavBackups(remote);
      setActionMessage(`已将 ${uploaded} 个原格式文件上传至 WebDAV；远端目录已重新读取。`);
    } catch (error: any) {
      setActionError(error?.name === 'AbortError' ? `传输已停止；${uploaded} 个文件已完成，请刷新目录核对。` : error?.message || `上传中断；${uploaded} 个文件已完成，请刷新目录核对。`);
    } finally { setBusy(false); }
  };
  const handleRestore = async (item: WebDavBackupItem) => {
    if (!window.confirm(`将从远端下载并恢复“${item.name}”中的数据，继续吗？`)) return;
    setBusy(true);
    setActionError(null);
    const success = await performRestore(item.id);
    if (success) setActionMessage(`已从 ${item.name} 恢复快照数据。`);
    else setActionError('恢复失败；请查看错误提示并确认文件属于 fox3 备份格式。');
    setBusy(false);
  };
  const handleDelete = async (item: WebDavBackupItem) => {
    if (!window.confirm(`确定从 WebDAV 远端永久删除“${item.name}”吗？`)) return;
    setBusy(true);
    setActionError(null);
    const success = await deleteWebDavBackup(item.id);
    if (success) setActionMessage(`已从 WebDAV 远端删除 ${item.name}。`);
    else setActionError('远端删除失败；文件列表已保留。');
    setBusy(false);
  };
  const handleDownload = async (item: WebDavBackupItem) => {
    setBusy(true);
    setActionError(null);
    try {
      const blob = await downloadWebDavRawFile(item.path || item.name);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setActionMessage(`已下载远端原文件：${item.name}`);
    } catch (error: any) { setActionError(error?.name === 'AbortError' ? '原文件下载已停止。' : error?.message || '远端文件下载失败'); }
    finally { setBusy(false); }
  };
  const configMatchesSaved = ['serverUrl', 'backupPath', 'username', 'password', 'port'].every(key =>
    String((formConfig as any)[key] ?? '') === String((webDavConfig as any)[key] ?? '')
  );
  const connectionLabel = webDavConnectionState.status === 'connected'
    ? configMatchesSaved ? `已验证连通 · ${new Date(webDavConnectionState.checkedAt).toLocaleTimeString()}` : '配置已修改，需保存并重新验证'
    : webDavConnectionState.status === 'checking' ? '正在验证…'
      : webDavConnectionState.status === 'error' ? '未连通：验证失败' : '未验证';
  const connected = webDavConnectionState.status === 'connected' && configMatchesSaved;

  return (
    <div className="space-y-6">
      <section className={`p-5 rounded-3xl border shadow-sm ${systemSettings.transparentCards ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20' : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'}`}>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Cloud className="w-5 h-5 text-sky-500" />WebDAV 远端备份与文件管理</h2>
            <p className="text-xs text-slate-500 mt-1">连接状态由真实服务端认证请求决定；仅管理员可执行远端操作。</p>
          </div>
          <span className={`inline-flex items-center gap-2 h-fit rounded-full px-3 py-1.5 text-xs font-semibold ${connected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : webDavConnectionState.status === 'checking' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : webDavConnectionState.status === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />{connectionLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <label className="text-xs text-slate-500">WebDAV 地址
            <input value={formConfig.serverUrl} onChange={e => setFormConfig({ ...formConfig, serverUrl: e.target.value })} placeholder="https://dav.example.com/dav/" className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-100" />
          </label>
          <label className="text-xs text-slate-500">备份目录
            <input value={formConfig.backupPath} onChange={e => setFormConfig({ ...formConfig, backupPath: e.target.value })} placeholder="/fox3_backup/" className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-100" />
          </label>
          <label className="text-xs text-slate-500">账号
            <input value={formConfig.username} onChange={e => setFormConfig({ ...formConfig, username: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100" />
          </label>
          <label className="text-xs text-slate-500">应用专用密码
            <input type="password" value={formConfig.password} onChange={e => setFormConfig({ ...formConfig, password: e.target.value })} autoComplete="new-password" className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100" />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-[11px] text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" />凭据仅保存在本浏览器，并通过管理员认证的 HTTPS API 使用；不要在共享设备保存密码。</p>
          <div className="flex gap-2">
            <button onClick={() => void handleSaveConfig()} disabled={!isAdmin || busy} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="w-4 h-4" />保存并验证</button>
            <button onClick={() => void handleRefresh()} disabled={!isAdmin || busy} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />刷新远端</button>
          </div>
        </div>
      </section>

      {(actionMessage || actionError) && <div role={actionError ? 'alert' : 'status'} className={`rounded-2xl border p-3 text-xs ${actionError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>{actionError || actionMessage}</div>}

      <section className={`rounded-3xl border shadow-sm overflow-hidden ${systemSettings.transparentCards ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-white/20' : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'}`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-3">
          <div><h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2"><HardDrive className="w-4 h-4 text-sky-500" />远端文件（{webDavBackups.length}）</h3><p className="text-[11px] text-slate-500 mt-1">列表来自 WebDAV PROPFIND，不是浏览器里的模拟记录。</p></div>
          {isAdmin && <div className="flex gap-2 items-center">
            <input ref={rawFileInput} type="file" multiple className="hidden" onChange={event => void handleRawFileUpload(event)} />
            <button onClick={() => rawFileInput.current?.click()} disabled={busy || !connected} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 disabled:opacity-50"><Upload className="w-4 h-4" />上传原文件</button>
            <select value={backupScope} onChange={e => setBackupScope(e.target.value as typeof backupScope)} className="rounded-xl border bg-white dark:bg-slate-800 px-2 py-2 text-xs"><option value="posts">文字：文章</option><option value="settings">文字：设置</option><option value="books">书籍资料</option><option value="media">照片与影音元数据</option><option value="full">全站 JSON 快照</option></select>
            <button onClick={() => void handleBackup()} disabled={busy || !connected} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Database className="w-4 h-4" />{busy && transferProgress.type === 'backup' ? '备份中…' : '开始备份'}</button>
          </div>}
        </div>
        <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-200 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>建议先备份文字、文章与设置。浏览器到边缘函数的 WebDAV 代理目前单文件上限 25 MiB，不支持断点续传；图片、视频等大文件容易超时或卡住；可通过“上传原文件”手动上传 不超过 25 MiB 文件，但不会自动从站内资源抓取打包。当前生成的是 fox3 JSON 数据快照，媒体文件本体若只存于本机/外部 URL，不会自动打包进快照。</span></div>
        {webDavBackups.length === 0 ? <div className="py-12 text-center text-xs text-slate-400">远端目录为空或尚未成功刷新。填写配置后点击“保存并验证”或“刷新远端”。</div> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {webDavBackups.map(item => {
              const ext = item.name.split('.').pop()?.toUpperCase() || 'FILE';
              const isNativeBackup = /\.json$/i.test(item.name);
              return <div key={item.id || item.name} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0"><FileKindIcon name={item.name} /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{item.name}</p><span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300">.{ext}</span></div><p className="mt-1 text-[11px] text-slate-500">原文件格式 · {(item.size / 1024).toFixed(1)} KiB · {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '远端未提供时间'}</p><p className="text-[10px] text-slate-400 font-mono truncate">{item.path}</p></div></div>
                <div className="flex gap-2 self-end md:self-center">
                  <button onClick={() => void handleDownload(item)} disabled={busy || !connected} title="下载原文件" className="rounded-lg p-2 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-40"><Download className="w-4 h-4" /></button>
                  {isNativeBackup && <button onClick={() => void handleRestore(item)} disabled={busy || !isAdmin || !connected} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"><RotateCcw className="w-3.5 h-3.5" />恢复</button>}
                  {isAdmin && <button onClick={() => void handleDelete(item)} disabled={busy || !connected} title="从远端删除" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>;
            })}
          </div>
        )}
      </section>
      {webDavConnectionState.status === 'checking' && <div className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{webDavConnectionState.message}</div>}
      {webDavConnectionState.status === 'connected' && <div className="text-xs text-emerald-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" />最后验证：{new Date(webDavConnectionState.checkedAt).toLocaleString()}</div>}
    </div>
  );
};
