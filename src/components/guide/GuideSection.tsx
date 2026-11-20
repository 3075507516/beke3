import React, { useState } from 'react';
import {
  HelpCircle,
  Cloud,
  Database,
  HardDrive,
  Server,
  Upload,
  CheckCircle,
  Copy,
  ChevronRight,
  ExternalLink,
  Layers,
  Key,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { translateInline } from '../../utils/i18n';
import { SiteOwnerChat } from './SiteOwnerChat';

export const GuideSection: React.FC = () => {
  const { locale } = useApp();
  const tx = (source: string) => translateInline(locale, source);
  const [activePlatform, setActivePlatform] = useState<'cf' | 'zip' | 'tencent' | 'aliyun'>('cf');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Deployment guide intro and persistent site-owner support chat */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 font-serif-sc text-xl font-bold text-slate-900 dark:text-slate-100 md:text-2xl"><HelpCircle className="h-6 w-6 text-rose-500"/><span>{tx('fox3 博客全平台极速部署指引与 D1 / R2 / WebDAV 使用说明')}</span></h2>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tx('部署存储概览：D1 保存博客、账户和媒体目录；R2/COS/OSS/S3 保存文件本体。成功上传到对象存储的图片和视频可跨设备查看；仅保存到 IndexedDB 的回退文件只在本机可用。电子书正文按需读取原文件，不写入 D1。')}</p>
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">Policies/法律页面内容为政策草稿，不是自动代写的有效法律意见；发布前请按主体、真实服务及适用法律审查。</p>
        </div>
        <SiteOwnerChat />
      </div>

      {/* Platform Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActivePlatform('cf')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activePlatform === 'cf'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>{tx('Cloudflare Pages Git 一键拉取部署 (首选优先)')}</span>
        </button>

        <button
          onClick={() => setActivePlatform('zip')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activePlatform === 'zip'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>{tx('Pages 一键上传文件部署 (获取上传包说明)')}</span>
        </button>

        <button
          onClick={() => setActivePlatform('tencent')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activePlatform === 'tencent'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>{tx('腾讯云 EdgeOne / 轻量服务器静态部署（COS 未接入）')}</span>
        </button>

        <button
          onClick={() => setActivePlatform('aliyun')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activePlatform === 'aliyun'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>{tx('阿里云 ESA Pages GitHub 自动部署')}</span>
        </button>

        <button
          onClick={() => setActivePlatform('others' as any)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            (activePlatform as string) === 'others'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>{tx('Vercel / Docker / VPS / 1Panel 极速部署')}</span>
        </button>
      </div>

      {/* TAB CONTENT: Cloudflare Pages Git Pull Deploy */}
      {activePlatform === 'cf' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-rose-500" />
              <span>{tx('Cloudflare Pages 连接 Git 仓库自动构建部署与 D1 / R2 绑定')}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {tx('只需将代码提交至 GitHub / GitLab，Cloudflare Pages 将在您推送代码时全自动触发构建并全球分发。')}
            </p>
          </div>

          {/* Step 1: Git Connect */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>{tx('创建 Cloudflare Pages 应用')}</span>
            </h4>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
              <li>登录进入 Cloudflare Dashboard 控制台，点击左侧导航栏中的 <b>Workers & Pages</b>。</li>
              <li>点击 <b>Create application</b>，切换标签至 <b>Pages</b>，选择 <b>Connect to Git</b>。</li>
              <li>授权并选择包含本项目的 <b>fox3</b> Git 仓库。</li>
            </ol>
          </div>

          {/* Step 2: Build Configurations */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>{tx('构建与输出参数配置 (Build Settings)')}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-sans">Framework preset</span>
                <span className="font-bold text-rose-500">Vite</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-sans">Build command</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">npm run build</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-sans">Build output directory</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">dist</span>
              </div>
            </div>
          </div>

          {/* Step 3: D1 & R2 Cloud Bindings */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              <span>{tx('Cloudflare 后台绑定 D1 数据库、R2 存储桶与 KV 变量')}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {tx('部署完成后，进入项目页面点击 Settings -> Functions，向下滚动到 Bindings (绑定)：')}
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <b className="text-slate-800 dark:text-slate-100">D1 Database 绑定：</b>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    变量名称填写为 <code className="text-rose-500 font-mono font-bold">DB</code>，选择创建的 fox3-d1 数据库。
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard('DB', 'd1_var')}
                  className="px-2.5 py-1 text-slate-400 hover:text-rose-500 rounded border text-[11px]"
                >
                  {copiedKey === 'd1_var' ? '已复制' : '复制变量名'}
                </button>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <b className="text-slate-800 dark:text-slate-100">R2 Bucket 绑定：</b>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    变量名称填写为 <code className="text-rose-500 font-mono font-bold">R2_BUCKET</code>，选择创建的 fox3-media 存储桶。
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard('R2_BUCKET', 'r2_var')}
                  className="px-2.5 py-1 text-slate-400 hover:text-rose-500 rounded border text-[11px]"
                >
                  {copiedKey === 'r2_var' ? '已复制' : '复制变量名'}
                </button>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <b className="text-slate-800 dark:text-slate-100">KV Namespace 绑定：</b>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    变量名称填写为 <code className="text-rose-500 font-mono font-bold">KV</code>，选择创建的 fox3-kv 空间。
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard('KV', 'kv_var')}
                  className="px-2.5 py-1 text-slate-400 hover:text-rose-500 rounded border text-[11px]"
                >
                  {copiedKey === 'kv_var' ? '已复制' : '复制变量名'}
                </button>
              </div>
            </div>

            {/* Admin Environment Variables */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                4. 部署密码与管理员账号环境变量 (Environment Variables)
              </h5>
              <p className="text-xs text-slate-500 mb-2">
                管理员自行设定至少 6 个字符的登录密码（可使用数字、字母、符号或组合），并在 <b>Settings</b> -&gt; <b>Variables and Secrets</b> 中配置；网站前台不能修改 Cloudflare 部署变量：
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <code className="text-rose-500 font-mono font-bold">ADMIN_USERNAME</code>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">唯一超级管理员用户名（默认为 <code>fox</code>，受系统级唯一性严格保护）</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <code className="text-rose-500 font-mono font-bold">ADMIN_PASSWORD</code>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">管理员自选的生产登录密码（至少 6 个字符，可用纯数字或其他字符）；仅在 Cloudflare Pages Secret 中修改，未配置时管理员登录会被拒绝</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <code className="text-rose-500 font-mono font-bold">ADMIN_SESSION_SECRET</code>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">必须独立配置至少 32 个字符的高熵随机会话签名 Secret；此项不是登录密码，不能用 ADMIN_PASSWORD 替代</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 p-3 text-xs leading-relaxed text-sky-800 dark:text-sky-200">
                普通用户建议使用真实可访问的邮箱注册。邮箱验证码校验通过后，账户资料和密码哈希写入 D1（绑定名 DB）；忘记密码可通过邮箱验证码重置，重置服务依赖 D1 与已配置的后台邮件发信变量。未绑定邮箱的账号不能自助找回密码。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Direct ZIP Upload Package Instructions */}
      {activePlatform === 'zip' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-rose-500" />
              <span>Pages 一键直接上传文件部署与获取上传包方式</span>
            </h3>
            <p className="text-xs text-slate-500">
              此 ZIP 只包含静态前端资源，适用于预览/纯静态功能。它不包含 Pages Functions 及 D1/R2/KV 绑定；账户、验证码邮件、后台邮件、跨设备站点内容（D1 binding 必须名为 DB）和远程文件服务需要另行部署 Functions 并绑定资源。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              第一步：如何获取上传部署包？
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              在本地或开发环境的终端中，运行内置的打包命令：
            </p>
            <div className="p-3 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono flex items-center justify-between">
              <code>npm run build</code>
              <button
                onClick={() => copyToClipboard('npm run build', 'build_cmd')}
                className="text-slate-400 hover:text-white"
              >
                {copiedKey === 'build_cmd' ? '已复制' : '复制命令'}
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              运行完成后，脚本会在项目根目录自动打包生成预备好的上传包：
              <code className="text-rose-500 font-bold ml-1 font-mono">dist-upload.zip</code> 或{' '}
              <code className="text-rose-500 font-bold ml-1 font-mono">dist/</code> 文件夹。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              第二步：在 Cloudflare Pages 控制台拖拽上传
            </h4>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
              <li>打开 Cloudflare 控制台 -&gt; <b>Workers & Pages</b> -&gt; <b>Create application</b>。</li>
              <li>选择 <b>Pages</b>，然后选择 <b>Direct Upload (直接上传)</b>。</li>
              <li>填写项目名称（如 <code>fox3</code>），上传 <code>dist</code> 静态文件；此方式不会把仓库根目录的 <code>functions/</code> 路由一并部署。</li>
              <li>点击 <b>Deploy site</b>，几秒内即可全球上线并获得 <code>*.pages.dev</code> 免费公网域名！</li>
            </ol>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Tencent Cloud */}
      {activePlatform === 'tencent' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              <span>腾讯云部署说明（COS 服务端对象存储后备）</span>
            </h3>
            <p className="text-xs text-slate-500">
              可将前端静态页面部署到 EdgeOne 或轻量服务器；纯静态托管不会自动提供 Cloudflare Pages Functions、D1/R2/KV，也不会运行本文介绍的 COS 适配器。本站账户、邮件验证码、后台邮件与站点内容数据库 API 仍需部署 Pages Functions；跨设备内容必须配置 D1 binding `DB`。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              方案 A：腾讯云 EdgeOne Pages 静态托管
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              在 EdgeOne 控制台进入 Pages 服务，绑定 Git 仓库，构建目录指定为 <code>dist</code>，享受中国大陆顶级全站加速与防御能力。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              腾讯云 COS 对象存储后备（由 Cloudflare Pages Functions 调用）
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Pages Functions 已提供腾讯 COS S3-compatible 对象接口适配器。文件首先写入/读取 Cloudflare R2；R2 不可用时才尝试 COS。COS 配置只在 Cloudflare Pages 的 Functions Variables/Secrets 中填写，不要放进前端设置、构建参数或公开仓库。
            </p>
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono space-y-1">
              <p>设置 <code>OBJECT_STORAGE_PROVIDER=cos</code>、<code>COS_SECRET_ID</code>、<code>COS_SECRET_KEY</code>、<code>COS_REGION</code>（例如 <code>ap-guangzhou</code>）与 <code>COS_BUCKET</code>。</p>
              <p><code>COS_BUCKET</code> 必须填写带 APPID 的完整桶名（例如 <code>mybucket-1250000000</code>）。未单独适配的平台可选择 <code>OBJECT_STORAGE_PROVIDER=s3</code>，并提供 HTTPS <code>S3_ENDPOINT</code>、地域、桶名和 SigV4 凭据；通用接口要求兼容 path-style 请求。文件顺序为 R2 → 已选对象桶 → D1（≤1 MiB）/KV（≤18 MiB）/易失内存（≤4 MiB）；对象存储状态灯会执行只读连通探测。</p>
              <p>EdgeOne/OSS 静态部署仅提供前端，不会自动执行 Pages Functions；D1 中的账户和博客共享数据不会迁移到 COS。</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{tx('普通文件上传接口允许单文件最大 90 MiB；浏览器上传等待上限约 10 分钟，不支持断点续传。大文件跨设备可用必须成功保存到 R2/COS/OSS/S3；若仅回退到 IndexedDB，只在原设备可访问。')}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              方案 B：腾讯云轻量服务器 Nginx 配置
            </h4>
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono space-y-1">
              <p>server &#123;</p>
              <p className="pl-4">listen 80;</p>
              <p className="pl-4">server_name yourdomain.com;</p>
              <p className="pl-4">root /var/www/fox3/dist;</p>
              <p className="pl-4">index index.html;</p>
              <p className="pl-4">location / &#123;</p>
              <p className="pl-8">try_files $uri $uri/ /index.html;</p>
              <p className="pl-4">&#125;</p>
              <p>&#125;</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Aliyun */}
      {activePlatform === 'aliyun' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-orange-500" />
              <span>{tx('阿里云部署说明（ESA Pages GitHub 自动构建 + OSS 后备）')}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {tx('阿里云 ESA Pages 可从 GitHub 拉取仓库并自动构建、发布 Vite 前端静态文件；纯静态托管不会自动运行 Cloudflare Pages Functions、D1/R2/KV，也不会执行下方 OSS 适配器。账户、验证码发信及云同步 API 仍需兼容的服务端运行环境。')}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-900 dark:bg-orange-950/20">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{tx('阿里云 ESA Pages GitHub 仓库拉取部署')}</h4>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{tx('此配置运行 Vite 构建并发布 dist/，并为前端单页路由启用 index.html 回退。')}</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <li>{tx('在阿里云控制台开通 ESA，进入 Pages，连接 GitHub 并选择本仓库和生产分支。')}</li>
              <li>{tx('仓库根目录的 esa.jsonc 已提供 npm install、npm run build、dist 静态目录和单页应用回退配置；保存后推送即可触发自动构建。')}</li>
              <li>{tx('首次可在 ESA Pages 控制台检查构建日志和预览；之后向所选生产分支推送代码，ESA 会重新拉取构建。')}</li>
            </ol>
            <p className="text-xs font-semibold leading-relaxed text-rose-700 dark:text-rose-300">{tx('重要限制：阿里云 ESA 静态 Pages 只负责构建和提供前端文件，不会自动运行本项目的 Cloudflare Pages Functions、D1、R2 或 KV。')}</p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{tx('如需账户、跨设备同步、订单支付、收件 Webhook、文件上传和管理员 API，必须另行部署兼容的服务端 API 与数据库；仅静态部署这些功能不会工作。')}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <a className="inline-flex items-center gap-1 text-sky-600 hover:underline dark:text-sky-400" href="https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/connect-pages-to-github" target="_blank" rel="noreferrer">ESA 从 GitHub 连接 Pages <ExternalLink className="h-3 w-3" /></a>
              <a className="inline-flex items-center gap-1 text-sky-600 hover:underline dark:text-sky-400" href="https://help.aliyun.com/document_detail/2980182.html" target="_blank" rel="noreferrer">esa.jsonc 配置说明 <ExternalLink className="h-3 w-3" /></a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              阿里云 OSS 静态托管快速指引
            </h4>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
              <li>在阿里云控制台创建 Bucket，权限设置为“公共读”。</li>
              <li>在基础设置中开启“静态页面”，默认首页设置为 <code>index.html</code>，404 错误页设置为 <code>index.html</code>。</li>
              <li>将 <code>dist/</code> 下所有编译生成的文件上传至该存储桶。</li>
              <li>绑定您的独立域名并申请免费 SSL 证书，享受高可用全球分发！</li>
            </ol>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              阿里云 OSS 对象存储后备（由 Cloudflare Pages Functions 调用）
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Pages Functions 已提供 OSS Signature V4 对象接口适配器。文件首先使用 Cloudflare R2；R2 不可用时才尝试 OSS。访问密钥只在 Cloudflare Pages 的 Functions Variables/Secrets 配置，不要写入网页代码或公开仓库。
            </p>
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono space-y-1">
              <p>设置 <code>OBJECT_STORAGE_PROVIDER=oss</code>、<code>OSS_ACCESS_KEY_ID</code>、<code>OSS_ACCESS_KEY_SECRET</code>、<code>OSS_REGION</code>（例如 <code>cn-hangzhou</code>）与 <code>OSS_BUCKET</code>。</p>
              <p>文件顺序为 R2 → OSS → D1（≤1 MiB）/KV（≤18 MiB）/易失内存（≤4 MiB）。连通灯会发起只读 Bucket 请求；D1 账户、验证码和同步数据不会迁移到 OSS。</p>
              <p>OSS 静态托管只提供前端；请勿在浏览器客户端或公开静态资源中嵌入任何云存储密钥。</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{tx('普通文件上传接口允许单文件最大 90 MiB；浏览器上传等待上限约 10 分钟，不支持断点续传。大文件跨设备可用必须成功保存到 R2/COS/OSS/S3；若仅回退到 IndexedDB，只在原设备可访问。')}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Vercel, Docker, VPS, 1Panel */}
      {(activePlatform as string) === 'others' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-500" />
              <span>Vercel / Docker / VPS 独立服务器 / 1Panel 面板一键部署指南</span>
            </h3>
            <p className="text-xs text-slate-500">
              项目自带 <code>vercel.json</code>、<code>Dockerfile</code>、<code>docker-compose.yml</code> 与 <code>nginx.conf</code>，全平台无缝兼容。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              1. Vercel 一键拉取部署
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              在 Vercel 导入 Git 仓库，Framework Preset 选择 <b>Vite</b>，根目录留空，构建命令 <code>npm run build</code>，输出目录 <code>dist</code>，仓库内已包含 <code>vercel.json</code> 自动处理单页 SPA 路由。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              2. Docker & docker-compose 一键启动
            </h4>
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono space-y-1">
              <p># 克隆仓库并启动容器</p>
              <p>git clone &lt;repo-url&gt; && cd fox3</p>
              <p>docker-compose up -d --build</p>
              <p># 访问 http://&lt;你的IP&gt;:8080 即可直接使用！</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              3. 1Panel 面板极速部署说明
            </h4>
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
              <li>在 1Panel 面板中选择 <b>网站</b> -&gt; <b>创建网站</b> -&gt; <b>静态网站</b> 或 <b>反向代理</b>。</li>
              <li>将项目打包出的 <code>dist/</code> 静态文件上传至站点根目录，或使用 1Panel 的 <b>容器编排</b> 粘贴仓库自带的 <code>docker-compose.yml</code>。</li>
              <li>在站点配置中开启 HTTPS，一键完成部署。</li>
            </ol>
          </div>
        </div>
      )}

      {/* Commercial (Shop) & Mail Usage Guides */}
      <section className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/20">
        <h3 className="mb-3 font-bold text-rose-800 dark:text-rose-200">{tx('支付接入：商户注册、服务端变量与回调验证（正式接入清单）')}</h3>
        <div className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <p>{tx('开始前准备：企业/个体户营业执照、法人身份证和结算账户。网站必须启用 HTTPS；中国大陆服务器需完成 ICP 备案，微信 PC 网站支付要求使用已备案域名。')}</p>
          <p>{tx('支付宝：在支付宝开放平台/商家中心完成主体认证，开通电脑网站支付和手机网站支付，取得 APPID、设置应用私钥与支付宝公钥，并配置异步通知地址。')}</p>
          <p>{tx('微信支付：在微信支付商户平台申请商户号，申请 Native（PC 扫码）或 H5 支付，准备 APIv3 密钥、商户 API 证书私钥、平台证书及 HTTPS 回调 URL。')}</p>
          <p>{tx('Stripe：注册账户并取得 Secret Key；在 Stripe Dashboard 创建 Webhook，保存 signing secret，并订阅成功、异步失败/过期及退款事件。')}</p>
          <p>{tx('PayPal：注册企业账户并创建 REST 应用，取得 Client ID、Secret 和 Webhook ID；先完整测试 Sandbox，再切换正式 API。')}</p>
          <p>{tx('在 Cloudflare Pages → Settings → Variables and Secrets 中配置网关 Secrets，并绑定 D1（DB）；按顺序执行 migrations/0002_commerce.sql 和 migrations/0003_order_trash.sql 后重新部署。状态灯只表示服务端读到了变量，不代表密钥正确或商户已通过收款实测。')}</p>
          <p>{tx('安全回调流程：用户付款 → 支付平台向 notify_url POST 订单号、金额、状态和签名 → 后端验签 → 核对订单与金额 → 更新 D1 并返回成功。验签失败必须返回错误且不更新订单；重复通知必须幂等，不能依据前端跳转判断到账。')}</p>
          <p className="font-medium">{tx('本项目已实现支付宝、微信支付、Stripe 与 PayPal 的服务端支付/回调适配。万里汇（WorldFirst）目前没有接入本项目订单创建、回调验签和退款流程，不能只配置变量后启用。')}</p>
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Shop Guide */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
            <Layers className="w-5 h-5" />
            <span>商业区 (商品与全渠道支付网关) 使用说明</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p><b>1. 展台与商品管理：</b>管理员可创建商品展台、管理商品图片与自定义分类；订单由后端数据库创建并持久化。支付生产部署必须使用 Cloudflare Pages + Pages Functions + D1（binding 名称 <code>DB</code>），按顺序执行 <code>migrations/0002_commerce.sql</code>、<code>migrations/0003_order_trash.sql</code>。已有 0002 的数据库只需在部署新版前运行 0003。D1 持久保存订单、站内会话、消息、通知和可编辑法律页面；订单删除进入回收站，付款记录不会物理删除；网站内容 D1 与 WebDAV 备份严格分离。</p>
            <p><b>2. 商户开户与资质：</b>准备企业/个体户营业执照、法人身份证、结算账户。支付宝申请电脑网站支付、手机网站支付；微信支付商户平台申请 PC 网站支付（Native/H5），PC 接入要求备案域名；Stripe 注册账户取得 Publishable/Secret Key（本项目仅由服务器使用 Secret，Publishable key 目前不参与结账）；PayPal 企业账户创建应用取得 Client ID/Secret。国内服务器须完成 ICP 备案；全程必须 HTTPS。商户资格、币种及结算以账户审核和实测为准，本代码不提供 FX，也不承诺审批或平台实际收款。</p>
            <p><b>3. Pages Secrets（仅服务端）：</b>Alipay：<code>ALIPAY_APP_ID</code>、<code>ALIPAY_PRIVATE_KEY</code>（PKCS#8）、<code>ALIPAY_PUBLIC_KEY</code>，可选 <code>ALIPAY_PID</code>、<code>ALIPAY_GATEWAY</code>；WeChat：<code>WECHAT_MCHID</code>、<code>WECHAT_APPID</code>、<code>WECHAT_SERIAL_NO</code>、<code>WECHAT_PRIVATE_KEY</code>（PKCS#8）、<code>WECHAT_API_V3_KEY</code>（32 ASCII bytes）、<code>WECHAT_PLATFORM_CERT</code>、<code>WECHAT_NOTIFY_URL=https://你的域名/api/payments/webhook/wechat</code>；Stripe：<code>STRIPE_SECRET_KEY</code>、<code>STRIPE_WEBHOOK_SECRET</code>；PayPal：<code>PAYPAL_CLIENT_ID</code>、<code>PAYPAL_CLIENT_SECRET</code>、<code>PAYPAL_WEBHOOK_ID</code>、<code>PAYPAL_API_BASE</code>（默认 Sandbox，正式为 <code>https://api-m.paypal.com</code>）。付款密钥绝不写入前端、localStorage、D1 或仓库。</p>
            <p><b>4. Webhook 配置：</b>服务端 endpoints：<code>/api/payments/webhook/alipay</code>、<code>/api/payments/webhook/wechat</code>、<code>/api/payments/webhook/stripe</code>、<code>/api/payments/webhook/paypal</code>。支付宝配置异步通知，微信配置回调。Stripe Dashboard 监听 <code>checkout.session.completed</code>、<code>checkout.session.async_payment_succeeded</code>、<code>checkout.session.async_payment_failed</code>、<code>checkout.session.expired</code>、<code>charge.refunded</code>、<code>refund.updated</code>；PayPal 至少订阅 <code>PAYMENT.CAPTURE.COMPLETED</code>、<code>PAYMENT.CAPTURE.DENIED</code>、<code>PAYMENT.CAPTURE.REFUNDED</code>。</p>
            <p><b>5. Webhook 六步：</b>①用户付款；②平台 POST 到 notify_url，提供订单号/金额/状态/签名；③后端验签；④验签通过后核订单与金额，更新订单/会员并持久化，再返回成功；⑤验签失败返回错误且不更新订单；⑥重复回调幂等。最终支付以验签的服务端异步回调为准，不依据前端跳转。</p>
            <p><b>6. 订单生命周期：</b>正常、失败、取消、重复回调、退款均由后端状态处理。订单先写入 D1；即使支付渠道创建失败，也会保留为未支付/失败状态。每笔订单创建时管理员都会收到明确标注未支付的站内通知和邮件，异步回调验签成功后再收到已支付通知和邮件；默认邮件收件人为验证码邮件通道的 <code>MAIL_SENDER</code>，也可设置独立接收地址。用户可删除自己的订单，管理员可管理所有订单；删除进入回收站，可恢复，不删除支付审计记录。用户取消只取消未支付订单；PayPal 回跳后服务端执行 capture，但 paid 仍等待 Webhook；Stripe/PayPal 支持异步结果。订单区的管理员确认发货按钮始终可见，但只有验签已支付订单才可发货；确认后用户看到已发货。管理员可原路退款并通过订单对话按钮快速联系客户。</p>
            <p><b>7. 测试与上线：</b>先用各渠道沙箱/测试密钥验证成功、失败、取消、重复回调、退款及 D1 状态，再检查回调可达、验签和幂等后切换正式密钥。本指南不表示已做商户生产实测。政策页包含主页/价格（商城）/退款/隐私/服务条款/联系方式，站长可在网站法律与联系页编辑并保存至 D1；当前为政策草稿，发布前按主体、真实服务与适用法律审查，不构成法律意见。</p>
            <p><b>8. 展台咨询：</b>用户可向站长发起售前与售后咨询，管理员可在后台沟通。</p>
          </div>
        </div>

        {/* Mail Guide */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
            <Key className="w-5 h-5" />
            <span>邮箱区 (邮件中枢与 Resend Receiving) 使用说明</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>{tx('1. 发信通道：推荐 Resend API（HTTPS），也支持通用 SMTP、Brevo API、SendGrid API 和 SendCloud API。阿里云 DirectMail、腾讯云 SES 可在服务商已开通 SMTP、提供有效参数且部署网络可连通时，选择通用 SMTP 使用；本仓库没有为它们单独适配 HTTP API。SendCloud API 需要单独配置 SENDCLOUD_API_USER、SENDCLOUD_API_KEY，并将 MAIL_PROVIDER 设为 sendcloud；免费额度与发送权限以服务商实际账号状态为准。')}</p>
            <p>{tx('2. 前台与后台配置：前台发信设置只保存在当前浏览器，不会配置全站服务器。注册验证码和后台自动邮件必须在 Cloudflare Pages 后台 Variables/Secrets 配置通道凭据及 MAIL_SENDER，并重新部署；前台配置与后台配置应分开测试。')}</p>
            <p>{tx('3. 注册验证码：验证码由服务端生成并校验；Cloudflare 部署需绑定 D1，并配置可用的后台发信通道。可选设置 VERIFY_CODE_LENGTH、VERIFY_EMAIL_SUBJECT、VERIFY_EMAIL_TEMPLATE；模板变量为 {{code}}、{{username}}、{{email}}。')}</p>
            <p>{tx('4. 获取 RESEND_API_KEY：登录 resend.com，进入左侧 API Keys，点击 Create API Key，选择所需权限和域名后创建并立即复制。不要将密钥放在前端代码或公开仓库。')}</p>
            <p>{tx('5. 获取 RESEND_WEBHOOK_SECRET 并配置 Webhook：在 Resend Webhooks 创建 Webhook；Endpoint / URL 填写你自己的 Pages Functions 地址，例如 https://你的项目名.pages.dev/api/webhook，监听 email.received。创建后复制 signing secret，保存为 RESEND_WEBHOOK_SECRET；接口也兼容旧路径 /api/mail/webhook。')}</p>
            <p>{tx('6. 配置收件域名和 MX：在 Domains 添加域名；如需接收邮件，在域名详情启用 Receiving，并按 Resend 指示在域名 DNS 后台配置 MX 记录。')}</p>
            <p>{tx('重要：Webhook URL 是你自己的 Pages Functions 接口，不是 Resend 提供的地址。RESEND_API_KEY 与 RESEND_WEBHOOK_SECRET 通常只在创建时完整显示一次，丢失后需重新生成。Webhook 验签通过后，服务端用 RESEND_API_KEY 调 Receiving API 取回正文并存入绑定名为 DB 的 D1；普通转发到个人邮箱不会把来信导入本站。')}</p>
            <p>{tx('7. 站内邮件：管理员可在邮件中枢查看服务器收件箱、撰写和回复；发送及收件箱 API 需有效管理员会话。回复注册邮箱时优先从 D1 用户记录解析地址；前台/本机发件历史保存在浏览器，Resend 来信正文保存在 D1。')}</p>
            <p>{tx('Resend API 域名连接检查只读域名信息，不会发送邮件；本页不显示独立的 Resend 检查按钮。要验证真实投递，请使用单独的测试邮件按钮。')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
