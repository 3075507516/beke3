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
} from 'lucide-react';

export const GuideSection: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<'cf' | 'zip' | 'tencent' | 'aliyun'>('cf');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
        <h2 className="text-xl md:text-2xl font-bold font-serif-sc text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-rose-500" />
          <span>fox3 博客全平台极速部署指引与 D1 / R2 使用说明</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          本项目依赖 Cloudflare D1 和 R2。D1 用于存储文章、评论、分类、标签、文件元数据等结构化数据；R2 用于存储图片、视频、音频和附件等大文件实体。KV 仅用于缓存和配置。本指南提供 Cloudflare Pages Git 拉取部署（首选优先）、一键上传 ZIP 文件部署、腾讯云与阿里云服务器部署的完整步骤。
        </p>
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
          <span>Cloudflare Pages Git 一键拉取部署 (首选优先)</span>
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
          <span>Pages 一键上传文件部署 (获取上传包说明)</span>
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
          <span>腾讯云 EdgeOne / 轻量服务器部署</span>
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
          <span>阿里云 ESA / ECS 部署</span>
        </button>
      </div>

      {/* TAB CONTENT: Cloudflare Pages Git Pull Deploy */}
      {activePlatform === 'cf' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-rose-500" />
              <span>Cloudflare Pages 连接 Git 仓库自动构建部署与 D1 / R2 绑定</span>
            </h3>
            <p className="text-xs text-slate-500">
              只需将代码提交至 GitHub / GitLab，Cloudflare Pages 将在您推送代码时全自动触发构建并全球分发。
            </p>
          </div>

          {/* Step 1: Git Connect */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>创建 Cloudflare Pages 应用</span>
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
              <span>构建与输出参数配置 (Build Settings)</span>
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
              <span>Cloudflare 后台绑定 D1 数据库、R2 存储桶与 KV</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              部署完成后，进入项目页面点击 <b>Settings</b> -&gt; <b>Functions</b>，向下滚动到 <b>Bindings (绑定)</b>：
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
              适合无需配置 Git 账号的免代码一键交付，直接将打包好的静态 ZIP 文件拖拽至 Cloudflare Pages 控制台即可极速上线！
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
              <li>填写项目名称（如 <code>fox3</code>），将生成的 <code>dist</code> 文件夹直接拖拽入页面。</li>
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
              <span>腾讯云 EdgeOne / 轻量应用服务器部署指南</span>
            </h3>
            <p className="text-xs text-slate-500">
              支持腾讯云 EdgeOne Pages 托管与腾讯云轻量服务器（Lighthouse / CVM）使用 Nginx + Node.js 托管。
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
              <span>阿里云 ESA / OSS 静态网站与 ECS 部署指南</span>
            </h3>
            <p className="text-xs text-slate-500">
              支持阿里云边缘安全加速 ESA Pages、阿里云 OSS 静态网站托管或 ECS 云服务器托管。
            </p>
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
        </div>
      )}
    </div>
  );
};
