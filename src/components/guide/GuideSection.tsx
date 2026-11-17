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
          实际存储位置：浏览器 localStorage 保存博客/邮件列表/订单/系统设置及前台邮箱配置；IndexedDB 缓存本机文件。Cloudflare D1 保存注册账户、验证码/限流、管理员共享同步 JSON 与文件回退表；R2 Bucket 保存上传文件对象；KV 仅用于兼容回退/短期记录，存在日写入额度限制。前台邮箱密码保留在当前浏览器，不上传同步且未加密。未绑定相应资源时不能把本地回退视为云端持久化；本项目没有接入 Supabase、腾讯 COS 或阿里 OSS 适配器。
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
          <span>腾讯云 EdgeOne / 轻量服务器静态部署（COS 未接入）</span>
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
          <span>阿里云 ESA / ECS 静态部署（OSS 未接入）</span>
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
              <span>阿里云部署说明（OSS 服务端对象存储后备）</span>
            </h3>
            <p className="text-xs text-slate-500">
              可将前端静态页面放到 OSS/ESA 或 ECS；纯静态托管不会自动运行 Cloudflare Pages Functions、D1/R2/KV，也不会执行下方 OSS 适配器。账户、验证码发信及云同步 API 仍需 Pages Functions 运行环境。
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
              阿里云 OSS 对象存储后备（由 Cloudflare Pages Functions 调用）
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Pages Functions 已提供 OSS Signature V4 对象接口适配器。文件首先使用 Cloudflare R2；R2 不可用时才尝试 OSS。访问密钥只在 Cloudflare Pages 的 Functions Variables/Secrets 配置，不要写入网页代码或公开仓库。
            </p>
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono space-y-1">
              <p>设置 <code>OBJECT_STORAGE_PROVIDER=oss</code>、<code>OSS_ACCESS_KEY_ID</code>、<code>OSS_ACCESS_KEY_SECRET</code>、<code>OSS_REGION</code>（例如 <code>cn-hangzhou</code>）与 <code>OSS_BUCKET</code>。</p>
              <p>文件顺序为 R2 → OSS → D1（≤1 MiB）/KV（≤18 MiB）/易失内存（≤4 MiB）。连通灯会发起只读 Bucket 请求；D1 账户、验证码和同步数据不会迁移到 OSS。</p>
              <p>OSS 静态托管只提供前端；请勿在浏览器客户端或公开静态资源中嵌入任何云存储密钥。</p>
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
            <span>邮箱区 (邮件中枢与 Resend Receiving) 使用说明</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p><b>1. 发信通道：</b>推荐 Resend API（HTTPS），也支持 SMTP、Brevo API、SendGrid API；前台配置保存在本浏览器，验证码应使用 Cloudflare Pages 后台 Secret。Resend API 连接检查只读域名信息，不发邮件；真实测试投递需使用单独的测试邮件按钮。目前服务器收件箱入站 webhook 使用 Resend Receiving，不要把其他发件服务商误认为也已配置入站接收。</p>
            <p><b>2. 注册验证码：</b>验证码由服务端生成和验证；Cloudflare 部署需绑定 D1 并配置可用的后台邮件发送通道。后台配置状态与前台配置分开测试。</p>
            <p><b>3. 获取 <code>RESEND_API_KEY</code>：</b>登录 resend.com，进入左侧菜单 API Keys，点 Create API Key，选好权限和域名，创建后立即复制。</p>
            <p><b>4. 获取 <code>RESEND_WEBHOOK_SECRET</code> 和配置 Webhook URL：</b>进入 Webhooks，创建一个新的 Webhook。Endpoint / URL 填你的 Pages Functions 地址，例如 <code className="break-all">https://你的项目名.pages.dev/api/webhook</code>；选择监听事件 <code>email.received</code>。创建成功后，Resend 返回的 signing secret 就是 <code>RESEND_WEBHOOK_SECRET</code>。接口也兼容旧地址 <code className="break-all">/api/mail/webhook</code>。</p>
            <p><b>5. 配置接收域名 / MX：</b>在 Domains 里添加你的域名，然后去域名 DNS 管理后台添加 Resend 给出的记录。如果要收邮件，需要在域名详情里开启 Receiving，并按 Resend 提示配置 MX 记录。</p>
            <p><b>注意：</b>Webhook URL 不是 Resend 给你的，而是你自己 Pages Functions 的接口地址。<code>RESEND_API_KEY</code> 和 <code>RESEND_WEBHOOK_SECRET</code> 都只在创建时完整显示一次，丢了通常需要重新生成。这些密钥不要放到前端代码或公开仓库里，建议放在 Cloudflare Pages 的环境变量 / Secrets 中。收件正文会经 webhook 验签后由 Receiving API 拉取并保存到 D1；还需绑定名称为 <code>DB</code> 的 D1。仅把邮件转发到外部邮箱不会让来信进入本站。</p>
            <p><b>6. 站内信：</b>管理员可在邮件中枢查看服务器收件箱、撰写和回复；发送及收件箱 API 需有效管理员会话。注册邮箱回信优先从 D1 用户记录解析；本机发件历史保存在浏览器，Resend 收件正文保存在 D1。</p>
          </div>
        </div>
      </div>
    </div>
  );
};
