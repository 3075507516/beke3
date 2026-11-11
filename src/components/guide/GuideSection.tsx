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
          <span>fox3 博客全平台极速部署指引与 D1 / R2 / WebDAV 使用说明</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          本项目依赖 Cloudflare D1 和 R2。D1 用于存储文章、评论、分类、标签、文件元数据等结构化数据；R2 用于存储图片、视频、音频和附件等大文件实体。KV 仅用于缓存和配置，不作为主数据存储。如果未配置 D1 或 R2，系统将无感降级至本地持久化。在腾讯云和阿里云环境下，可通过环境变量接入对应数据库与存储桶，实现全平台统一体验。
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
          <span>腾讯云 EdgeOne / 轻量服务器部署与 COS 存储绑定</span>
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
          <span>阿里云 ESA / ECS 部署与 OSS 存储绑定</span>
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
          <span>Vercel / Docker / VPS / 1Panel 极速部署</span>
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
              <span>Cloudflare 后台绑定 D1 数据库、R2 存储桶与 KV 变量</span>
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

            {/* Admin Environment Variables */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                4. 部署密码与管理员账号环境变量 (Environment Variables)
              </h5>
              <p className="text-xs text-slate-500 mb-2">
                在 <b>Settings</b> -&gt; <b>Environment variables</b> 中添加生产部署密码与管理员用户名：
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
                    <span className="text-slate-500 dark:text-slate-400 ml-2">生产环境唯一超级管理员登录密码（建议配置强密码，部署时后台环境变量优先鉴权，前端设置区亦可实时修改）</span>
                  </div>
                </div>
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
              <span>腾讯云 EdgeOne / 轻量应用服务器部署指南与 COS 存储接入</span>
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
              腾讯云 COS 对象存储环境变量绑定说明
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              在轻量服务器部署时，可通过 <code>.env</code> 文件或环境变量传入腾讯云 COS 凭证：
            </p>
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono space-y-1">
              <p>TENCENT_COS_SECRET_ID=AKIDxxxxxxxxxxxxxxxx</p>
              <p>TENCENT_COS_SECRET_KEY=xxxxxxxxxxxxxxxxxxxx</p>
              <p>TENCENT_COS_BUCKET=fox3-1250000000</p>
              <p>TENCENT_COS_REGION=ap-guangzhou</p>
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
              <span>阿里云 ESA / OSS 静态网站与 ECS 部署指南与 OSS 存储接入</span>
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

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              阿里云 OSS 环境变量绑定说明
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              在 ECS 或容器部署时，可通过环境变量配置阿里云 OSS：
            </p>
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono space-y-1">
              <p>ALIYUN_OSS_ACCESS_KEY_ID=LTAIxxxxxxxxxxxxxx</p>
              <p>ALIYUN_OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx</p>
              <p>ALIYUN_OSS_BUCKET=fox3-bucket</p>
              <p>ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Shop Guide */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
            <Layers className="w-5 h-5" />
            <span>商业区 (商品与全渠道支付网关) 使用说明</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p><b>1. 展台与商品管理：</b>管理员可在商品区创建多个展示区（数字文创、定制硬件、云服务等），每个商品支持上传和删除多张图片并自动轮播。</p>
            <p><b>2. 订单提交与信息收集：</b>用户下单时需选择购买数量，并必须填写<b>联系人姓名、电话、邮箱与详细收件地址</b>。提交后订单状态分为“待支付”和“已支付”，支持库存自动扣减与优惠券抵扣（如 FOX3）。</p>
            <p><b>3. 支付网关预留接口：</b>仅管理员可见支付设置，支持 <b>PayPal、万里汇 (WorldFirst)、微信支付、支付宝、Stripe、USDT 与银联</b>。可填入各渠道的商户号、API Key 或收款二维码。</p>
            <p><b>4. 展台实时咨询窗口：</b>用户点击“商品展台聊天”即可呼出对话框，向站长进行售前与售后咨询，管理员可在后台与用户实时沟通。</p>
          </div>
        </div>

        {/* Mail Guide */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
            <Key className="w-5 h-5" />
            <span>邮箱区 (邮件中枢与 Cloudflare Routing) 使用说明</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p><b>1. 第三方邮件 API 保存：</b>支持 Resend、SendGrid、Mailgun、Amazon SES、Brevo、Postmark 及专用企业 SMTP 服务器配置，一键点击“保存邮箱配置”持久化。</p>
            <p><b>2. 验证码自动回复：</b>开启“注册验证码自动应答回复”后，系统将在接收到注册邮件请求时秒级生成 6 位安全验证码并自动回信。</p>
            <p><b>3. 收信与 Cloudflare Routing：</b>支持 Cloudflare Email Routing 边缘路由地址和管理员私人转发邮箱设定，预留 Webhook 和 IMAP 轮询接口。</p>
            <p><b>4. 额度风控与信件管理：</b>内置单日 3,000 封发信限制开关；当总信件数达 3,000 封时将自动触发橙色醒目预警。管理员可进行站内写信、回复、批量移入回收站和彻底删除。</p>
          </div>
        </div>
      </div>
    </div>
  );
};
