# fox3 - 次世代现代化全能个人博客与数字知识库系统

> **fox3** 是一款响应式个人博客与数字资产管理网站。已发布的博客、书架、相册/媒体、产品目录、站点链接和公开外观设置以 Cloudflare D1 为权威数据源；所有设备和访客可读取/刷新，只有管理员会话可发布。浏览器不再以 localStorage 作为这些核心内容的来源；未登录设备在内存中显示数据库内容，附件本体放 R2/兼容对象存储。邮件、订单、聊天等私人数据不进入公开站点内容 API；WebDAV 备份属于独立链路。必须正确绑定 Pages Functions 与 D1。

---

## 🌟 核心特性概览

* **极速现代化架构**：基于 React 19、TypeScript、Vite 与 Tailwind CSS，采用极简毛玻璃卡片质感，自适应电脑宽屏与手机竖屏。
* **全新统一重构登录与鉴权系统**：
  * 支持用户名/密码注册与邮箱验证码注册；推荐邮箱注册，忘记密码时可用注册邮箱验证码重置。
  * 账户资料与 PBKDF2 密码哈希写入 Cloudflare D1（`DB`）；数据库缺失或写入失败会明确报错，不会创建只在本机存在的假账号。
  * 管理员用户名默认 `fox`；管理员自行设定至少 6 个字符的 `ADMIN_PASSWORD`，可使用数字、字母、符号或组合；另须独立配置至少 32 个字符的 `ADMIN_SESSION_SECRET`。没有固定默认密码，Cloudflare 变量只能在 Dashboard 修改。
* **角色界面与管理员 API 会话**：
  * 已实现的 Cloudflare Functions 管理 API 会校验由 `ADMIN_SESSION_SECRET` 签名的管理员会话；相关服务端操作不能仅凭前端隐藏界面获得授权。
  * 前端包含用户角色显示及部分按角色显示的界面，但这不等于所有博客、书架、相册、影音等内容都具有后端逐条权限控制。请勿把当前应用当作具备完整多用户内容权限隔离的可信后端。
* **16 款系统级怀旧与现代设计主题中心**：
  * 内置 16 款主题：微软 Windows 98 怀旧、麦金塔 Classic Platinum、赛博朋克霓虹、北欧极简原木、复古皮质笔记本、工程架构蓝图、现代流体玻璃、极光玻璃、新野兽派、柔雾粉彩、编辑部留白，以及珍珠雾白、鼠尾草工坊、陶土暖意、海岸蓝调、丝绒梅紫。
  * 彻底移除夜间深色模式强制覆盖。
* **网站图床与网址导航中枢 (Sites & Image Host Hub)**：
  * 管理员专属板块，支持快捷添加和管理网站与图床，默认集成高速公共图床 (`https://img.001315.xyz/`)，提供海报卡片和完整网址详细列表两种查看方式。
  * 支持单个/批量导入导出书签，导出 Netscape HTML（浏览器可导入）或 TXT，支持浏览器书签 HTML、TXT、JSON 文件导入。
* **低流量图片图库**：
  * 新上传图片生成最长边 480px 的 WebP 缩略图供列表加载；原始图片单独保留，点开预览才加载原图。
  * 预览支持触摸屏双指缩放和拖动，也提供放大、缩小、重置按钮；详细列表显示真实像素尺寸，旧图在首次打开原图预览时自动补录尺寸。
  * 小列表可切换“完整显示/填满画幅”；如果对象存储不可用、仅在本机 IndexedDB 回退，则不能跨设备读取原图或缩略图。
* **站内邮件中枢（发信区 / 收信区双分区）与注册验证码**：
  * 邮件中枢设置抽屉严格划分为 **「一、发信区（发送邮件设置 & 发信说明）」** 与 **「二、收信区（接收邮件设置 & Resend / IMAP 收信说明）」**，互不干扰、一目了然。
  * 发信支持 Resend API、SendCloud API、Brevo API、SendGrid API 以及阿里云邮箱/腾讯企业邮箱免费版等 SMTP 通道。
  * 收信同时支持两种方式：**方式 A：Resend Receiving + Webhook 实时入库（自动推送）** 与 **方式 B：阿里云邮箱 / 腾讯企业邮箱免费版 / 通用 IMAP 主动拉取收信**（支持 Node 全栈服务器/Docker/本地直连 TLS IMAP，以及通过 `IMAP_BRIDGE_URL` 为 Cloudflare Pages 接入远程 IMAP 桥接）。
  * 前台邮件设置保存在当前浏览器本机，适合本机/手动发信测试；注册验证码及服务端业务邮件使用部署环境变量/Secrets（Cloudflare Pages Variables & Secrets / `.env`）。
* **流量与上传性能极限优化**：
  * 全局图片采用懒加载 (`loading="lazy"`) 与异步解码 (`decoding="async"`)；
  * 标签页处于后台隐藏状态时（Page Visibility API）立即暂停网络长轮询与同步，彻底杜绝无操作流量浪费。
  * 文件上传采用进度展示；超过 80 MiB 时通过 8 MiB 分块直写 R2，避免单次 Pages/Workers 请求体限制。R2 服务单对象上限 5 TiB；但本项目当前最多 10,000 个 8 MiB 分块，因此应用有效上限为 78.125 GiB（约 83.9 GB）。断线后暂不支持续传，且仍受账号配额、浏览器和网络影响。
* **独立外部翻译 API 配置**：
  * 快速在线互译助手自带独立的“保存外部翻译 API 配置”按键，配置即时生效并持久化。
* **备份区 (WebDAV)**：
  * 浏览器端直接访问 WebDAV，适合小型结构化数据/文本备份；当前没有大型媒体的可靠分块续传保障，跨域、服务器限制和单次传输时限都会影响可用性。大型图片/视频可能超时、卡住或失败，不应视为可靠的大文件灾备通道。
* **三语界面**：
  * 语言选择限定为简体中文、繁體中文与 English；旧版保存的其它语言值会自动归一化到简体中文。
  * 导航、常用表单与本轮部署/图片/邮件新增控件按语言切换。系统界面翻译不翻译用户撰写的博客、商品、政策或邮件正文；仍有未接入字典的旧版硬编码说明可能保留中文。
  * 可在顶部导航下拉选择语言，不是循环切换。

---

## 🚀 全平台部署指南

### 1. Cloudflare Pages 一键拉取部署 (首选推荐 ⭐⭐⭐⭐⭐)

1. Fork 或推送本项目至您的 GitHub / GitLab 仓库。
2. 登录 Cloudflare Dashboard 控制台，进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3. 选择 `fox3` 仓库，配置构建参数：
   * **Framework preset**: `Vite`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
4. 部署成功后，进入 **Settings** -> **Bindings**（或旧版 UI 的 **Functions**）绑定资源（详见下方专门章节）：
   * **D1 Database 绑定**：推荐变量名 `DB`（后端亦支持别名与特征自动识别）；用于公开站点内容主库、用户账户/密码重置、验证码及限流记录、邮件收件箱、订单与客服对话回收站。
   * **R2 Bucket 绑定**：推荐变量名 `R2_BUCKET`（兼容 `R2`、`BUCKET` 等别名与自动探测）；用于全站大文件分块直传与读取。
   * **KV Namespace 绑定**：推荐变量名 `KV`（兼容 `FOX3_KV` 等别名与自动探测）；作为短期缓存、验证码与兼容层。
   * **环境变量设置 (Environment Variables & Secrets)**：
     * `ADMIN_USERNAME`：自定义管理员账号名（默认 `fox`）。
     * `ADMIN_PASSWORD`：管理员登录密码，至少 6 个字符（数字、字母、符号或其组合）；未设置时管理员登录被拒绝。
     * `ADMIN_SESSION_SECRET`：独立配置的至少 32 个字符高熵随机 Secret，用于签发/验证最长 7 天的 HMAC API 会话。
     * **重要**：添加或修改任意 Binding / Variable 后，**必须重新触发一次 Deployments（Retry deployment 或重新推送/上传）**，新绑定才会在运行时 `env` 中生效。

#### 🔧 Cloudflare Dashboard 绑定连接（KV / D1 / R2）解锁与排错必读

1. **为什么之前 Dashboard 里的 Bindings 会变灰或绑定不上？**
   * 只要仓库根目录存在 `wrangler.toml`，Cloudflare Pages 会进入“Wrangler 托管模式”，**强行锁定后台的 `Settings -> Bindings` 界面**并覆盖你在控制台手动添加的 D1 / R2 / KV。
   * 最新版已将根目录 `wrangler.toml` 移除并改名为 `wrangler.example.toml`（且加入 `.gitignore`）。无论 Git 拉取部署还是 Direct Upload 上传部署，Cloudflare Dashboard 的 Bindings 界面现已**完全解锁可编辑**。
2. **如何正确绑定（推荐标准变量名）**：
   * 进入 Pages 项目 -> **Settings** -> **Bindings** -> **Add**：
     * **D1 database**：Variable name 填 `DB` -> 选择你的 D1 数据库。
     * **R2 bucket**：Variable name 填 `R2_BUCKET` -> 选择你的 R2 存储桶。
     * **KV namespace**：Variable name 填 `KV` -> 选择你的 KV 命名空间。
   * 保存后前往 **Deployments** 对最新部署点击 **... -> Retry deployment**，使绑定正式注入线上环境。
3. **自动容错识别**：
   * 后端 `resolveCloudflareBindings()` 除了匹配 `DB`、`R2_BUCKET`、`KV`，还支持常见大小写别名（如 `D1`、`DATABASE`、`R2`、`BUCKET`、`FOX3_KV`）及 Duck-Type 接口探测。即使你在 Dashboard 里填了其他变量名，只要绑定了对应资源，系统也会自动连接并在管理员「存储状态」显示绿灯及探测结果。
4. **纯本地 Wrangler CLI 用户**：
   * 如需本地运行 `npx wrangler pages dev dist`，可将 `wrangler.example.toml` 临时复制为 `wrangler.toml` 使用（`.gitignore` 已忽略，切勿提交到仓库以免再次锁定控制台）。

### 2. 阿里云 ESA Pages 从 GitHub 拉取部署（前端静态版）

仓库根目录已提交 [`esa.jsonc`](./esa.jsonc)：运行 `npm install`、`npm run build`，发布 `dist/`，并使用 `index.html` 作为单页应用路由回退。

1. 在阿里云开通 **边缘安全加速 ESA** 和 Pages 服务，进入 ESA 控制台的 **Pages**。
2. 选择从 **GitHub** 连接仓库并授权；选择对应仓库和生产分支。生产分支推送后会触发拉取、构建和部署。
3. 读取仓库根目录的 `esa.jsonc` 配置；如果控制台要求手动设置，构建命令为 `npm run build`，静态产物目录为 `dist`，单页应用未找到路由应回退 `index.html`。首次部署后检查构建日志和预览，并按需绑定 ESA 域名/HTTPS。
4. 后续向所选分支提交并推送代码，检查 ESA 新构建状态；Node/npm 依赖安装与 Vite 构建必须成功，构建失败可在 ESA Pages 构建日志查看详细错误。

**功能边界（重要）：**本项目的前端文件可以由 ESA Pages 构建和分发，但 [`esa.jsonc`](./esa.jsonc) 只配置前端静态资产，并未迁移 `functions/` 的 Cloudflare Pages Functions，也不会自动提供 Cloudflare D1、R2 或 KV。前端 API 使用 `/api/*` 相对路径；仅把前端部署到 ESA 时，登录/注册、D1 跨设备内容同步、下单支付、订单/客服、邮件 Webhook、服务端上传与管理员 API **不会自动工作**。要启用这些功能，请采用 Cloudflare Pages 全栈部署或 Docker / Node 全栈部署，或为 ESA 配置后端反向代理。

官方说明： [连接 Pages 到 GitHub](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/connect-pages-to-github) · [esa.jsonc 配置说明](https://help.aliyun.com/document_detail/2980182.html)。

---

### 管理员登录与云端 API 权限

Cloudflare Pages Functions / Node 服务端从部署环境读取至少 6 字符的 `ADMIN_PASSWORD` 和独立的至少 32 字符 `ADMIN_SESSION_SECRET`；登录签发最长 7 天的签名会话，相关 API 验证签名及有效期。前端保存令牌，并会在应用启动、网络恢复或切回前台时检查会话。缺少有效密码或会话密钥时不能完成管理员登录。生产值应在 Cloudflare Pages Variables and Secrets 配置，前端设置不能更改平台 Secret。此鉴权只保护代码中明确校验会话的管理 API。纯静态部署没有后端运行时，无法提供这些 API。

---

### 3. Cloudflare Pages 直接上传部署 (Direct Upload / CLI)

`npm run build` 会在 `dist/` 目录自动生成前端静态产物，以及 Cloudflare Pages Advanced Mode 所需的 **`dist/_worker.js`**（含 D1/R2/KV/支付/邮件全部 `/api/*` 路由）与 **`dist/_routes.json`**（同时在根目录打包干净、无冗余源文件的 `dist-upload.zip`），使 Direct Upload 上传部署与 Git 部署拥有 **100% 相同的全栈后端能力**：
1. 在本地或当前运行环境执行构建与打包：
   ```bash
   npm run build
   ```
   > 提示：若当前处于本在线开发服务器运行中，也可直接访问 `/dist-upload.zip` 或 `/api/download/pages-zip` 下载最新打包好的上传压缩包，**无需手工再 zip**。
2. 登录 Cloudflare Dashboard，进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Use direct upload**（直接上传）。
3. 填写项目名，直接拖入整个 `dist/` 文件夹或选择下载的 **`dist-upload.zip`** 点击 Deploy（注意：不要把外层项目源码压缩上传，只上传 `dist` 产物或 `dist-upload.zip`）。
4. **重要**：上传部署完成后，进入该项目的 **Settings -> Bindings** 分别添加 `DB`（D1）、`R2_BUCKET`（R2）、`KV`，并在 **Variables & Secrets** 填好 `ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET` 等变量；**保存后务必在 Deployments 页面再次重新上传/触发一次部署**，所有绑定和环境变量才会生效！
5. 命令行用户亦可使用：`npx wrangler pages deploy dist --project-name=<你的项目名>`。

---

### 4. Vercel 一键拉取部署

1. 在 Vercel 控制台点击 **Add New Project**，导入 Git 仓库。
2. Framework Preset 选择 **Vite**，Build Command 填 `npm run build`，Output Directory 填 `dist`。
3. `vercel.json` 设置 `npm run build` 与 `dist` 输出，并将非静态路径回退到 `index.html`。其中 `/api/status` 规则只是路由/响应头配置，并未实现本项目 Cloudflare Pages Functions；此部署不提供本项目账户、验证码邮件、云同步或文件 API。

---

### 5. Docker & docker-compose 一键全栈容器化部署

本项目已升级为全栈 Node 22 + 内置持久化 SQLite/R2 兼容层的多阶段构建 `Dockerfile` 与 `docker-compose.yml`（默认持久化数据卷 `fox3_data:/app/.data`）：

```bash
# 1. 克隆代码
git clone <your-repo-url> && cd fox3

# 2. (可选) 设置环境变量，例如管理员密码与会话密钥
export ADMIN_PASSWORD="your-strong-password"
export ADMIN_SESSION_SECRET="your-at-least-32-chars-random-secret-key"

# 3. 一键构建并启动
docker-compose up -d --build

# 4. 访问站点
http://<你的服务器IP>:8080
```

---

### 6. 腾讯云 (EdgeOne / 轻量服务器) 部署

* **EdgeOne Pages**：绑定 Git 仓库，构建目录填写 `dist`，享受中国大陆顶尖边缘加速。
* **轻量服务器 (Lighthouse / CVM)**：
  将 `dist/` 目录拷贝至 `/var/www/fox3/dist`，使用项目内置的 `nginx.conf` 启动 Nginx 服务。

---

### 7. 阿里云 (ESA / OSS / ECS) 部署

* **阿里云 OSS 静态网站托管**：创建公共读 Bucket，将 `dist/` 内文件全部上传，静态页面默认首页和 404 均设置为 `index.html`。
* **阿里云 ECS**：配合 Docker 或 Nginx 进行静态托管。

---

### 8. 1Panel 面板极速部署

1. 打开 1Panel 后台，进入 **网站** -> **创建网站** -> **静态网站**。
2. 上传 `dist/` 目录文件至网站根目录。
3. 或进入 **容器** -> **编排**，直接粘贴本项目 `docker-compose.yml` 一键创建。

---

## 🔑 环境变量与绑定参数一览表

| 变量名 / 绑定键 | 平台 / 类型 | 实际用途 | 建议 |
| :--- | :--- | :--- | :--- |
| `DB` | Cloudflare Pages D1 Binding | 已发布站点内容主库（`fox3_site_content`）、注册用户媒体目录（`fox3_user_media`）、用户/验证码与限流、Resend 收件箱、文件回退表及管理员私有记事本（`fox3_admin_notebook`）、旧版私有同步 | 必须绑定；站点内容不使用 KV 替代 |
| `R2_BUCKET` | Cloudflare Pages R2 Binding | 文件上传对象与下载读取 | 推荐 |
| `KV` | Cloudflare Pages KV Binding | 旧版私有同步/验证码等兼容回退；不是站点内容数据库 | 可选 |
| `ADMIN_USERNAME` | Pages Environment Variable | 管理员账号名，默认 `fox` | 推荐设置 |
| `ADMIN_PASSWORD` | Pages Secret | 管理员自行设定的登录密码；至少 6 个字符，字符类型不限。未设置则管理员登录被拒绝 | 必须设置 |
| `ADMIN_SESSION_SECRET` | Pages Secret | 独立 HMAC 会话签名密钥；至少 32 个字符；不以管理员密码回退 | 必须单独设置 |
| `MAIL_PROVIDER` | Pages Environment Variable | `resend`、`sendcloud`、`smtp`、`brevo` 或 `sendgrid` | 按后端凭据选择；验证码和业务邮件以服务端配置为准 |
| `RESEND_API_KEY` | Pages Secret | Resend HTTPS API 凭据；用于后端发信和取回收件正文 | Resend 主通道必填；权限需覆盖域名读取与 Receiving |
| `MAIL_SENDER` | Pages Environment Variable | 后台发件人，例如 `Fox3 <no-reply@verified-domain>`；Resend 要求使用已验证且启用发送的域名 | 必填 |
| `RESEND_WEBHOOK_SECRET` | Pages Secret | Resend `email.received` webhook 的 Signing Secret（`whsec_...`） | 启用站内收件必填 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURITY` / `SMTP_USER` / `SMTP_PASS` | Pages Variables/Secrets | 可选 SMTP 备用通道；Resend SMTP 示例：`smtp.resend.com` / `465` / `ssl` / `resend` / Resend API Key | 仅选择 SMTP 时使用；密码用 Secret |
| `BREVO_API_KEY` / `SENDGRID_API_KEY` / `MAIL_API_KEY` | Pages Secret | Brevo、SendGrid API 凭据；`MAIL_API_KEY` 是 Resend 兼容别名 | 仅选对应 API 通道时使用 |
| `SENDCLOUD_API_USER` | Pages Environment Variable / Secret | SendCloud 触发邮件账号 API_USER | 选择 `MAIL_PROVIDER=sendcloud` 时必填 |
| `SENDCLOUD_API_KEY` | Pages Secret | SendCloud 发信 API_KEY | 选择 `MAIL_PROVIDER=sendcloud` 时必填；不要提交到仓库 |
| `VERIFY_CODE_LENGTH` / `VERIFY_EMAIL_SUBJECT` / `VERIFY_EMAIL_TEMPLATE` | Pages Environment Variables | 后台注册验证码位数、主题和模板 | 可选 |
| `OBJECT_STORAGE_PROVIDER` | Pages Environment Variable | 可选 `cos`、`oss` 或 `s3`；未设置时根据已完整配置的凭据选择 | R2 仍是文件主存储；外部对象存储仅作后备 |
| `COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_REGION` / `COS_BUCKET` | Pages Variables/Secrets | 腾讯 COS SecretId/SecretKey、地域（如 `ap-guangzhou`）、完整桶名（如 `mybucket-1250000000`） | 选择 COS 后配置；SecretId/SecretKey 设为 Secrets |
| `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` / `OSS_REGION` / `OSS_BUCKET` | Pages Variables/Secrets | 阿里 OSS AccessKey ID/Secret、地域（如 `cn-hangzhou`）、Bucket 名称 | 选择 OSS 后配置；AccessKey 设为 Secrets |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_REGION` / `S3_BUCKET` / `S3_ENDPOINT` | Pages Variables/Secrets | 通用 AWS SigV4 S3-compatible endpoint、地域、Bucket 与密钥 | 为未单独适配的平台提供对象存储后备；需支持 path-style 请求 |

### 站点内容数据库与跨设备刷新

Cloudflare Pages 项目必须部署 `functions/api/[[route]].ts` Functions，并在生产/预览环境绑定一个 D1 数据库，binding 名称必须为 `DB`。核心公开站点内容存入 `fox3_site_content`；无管理员身份的所有设备都可通过 `GET /api/site-content` 读取最新已发布内容和使用顶部刷新按钮，管理员修改内容后自动写入 D1。访客不能写入内容。管理员记事本单独写入 `fox3_admin_notebook`，由签名管理员会话保护，不进入公开站点内容 API。接口只公开白名单字段：文章/管理员书籍/照片/媒体/产品目录/站点链接与公开外观设置；订单、邮件、聊天、账户、管理员/邮件/支付/WebDAV 凭据不进入公开 API。管理员开启“注册用户文件管理”后，已登录注册用户可将本人书籍/照片/音视频目录通过独立的签名会话写入 `fox3_user_media`；这些媒体条目会公开展示，但 API 只允许账户所有者更新/删除自己的条目。文件本体存对象存储，D1 只保存轻量目录元数据；EPUB/TXT 正文不进入同步快照，阅读时从云文件按需读取。

新部署可在绑定 D1 后按需预建表（应用也会在首次 API 请求时自动执行幂等 `CREATE TABLE IF NOT EXISTS` 与 `ALTER TABLE` 迁移）：

```bash
npx wrangler d1 execute <你的数据库名称> --remote --file=migrations/0001_site_content.sql
npx wrangler d1 execute <你的数据库名称> --remote --file=migrations/0002_commerce.sql
npx wrangler d1 execute <你的数据库名称> --remote --file=migrations/0003_order_trash.sql
npx wrangler d1 execute <你的数据库名称> --remote --file=migrations/0004_chat_trash.sql
```

本地 D1 用 `--local`。旧版本管理员共享快照会在新表为空时被服务端读取并严格筛选白名单，只将安全公开字段返回；管理员首次会话可把筛选后的内容迁入新表，旧私有同步记录不会作为公开接口返回。内容使用 revision 乐观锁，两个管理员设备同时编辑时，较旧版本的提交会得到冲突提示，需先刷新再编辑。包含 `dist/_worker.js` 的 Direct Upload 与 Git 部署均完整支持 Functions 和 D1；仅不包含 Worker 的纯静态托管无法使用服务端数据库。

顶部的刷新/同步按钮对所有人开放，执行的是公开站点内容读取，不会写入，也不会触碰 WebDAV 或管理员私有数据。设备前台时每分钟、重新聚焦/联网时会检查 D1 版本；若服务端版本没有改变，不会重载内容或额外写库。数据库不可用时界面会显示错误，不会把本机内容伪报为云端成功。

### 邮件中枢配置指南（发信区 / 收信区双分区 & Resend 完整流程）

后台邮件中枢已按 **「一、发信区」** 与 **「二、收信区」** 分为两个独立区块，同时支持前端测试配置与部署端 Secrets（`Variables and Secrets`）。

#### 一、发信区：发信通道与【Resend 发信详细流程】

后端与前台共同支持 **Resend API（HTTPS）**、**SendCloud API**、**Brevo API**、**SendGrid API**，以及 **阿里云邮箱（`smtp.qiye.aliyun.com` / `smtpdm.aliyun.com`）**、**腾讯企业邮箱免费版（`smtp.exmail.qq.com`）** 等通用 SMTP 通道。
* SendCloud 需要 `SENDCLOUD_API_USER`、`SENDCLOUD_API_KEY`、`MAIL_PROVIDER=sendcloud` 及合规发件人 `MAIL_SENDER`。
* 阿里云邮箱 / 腾讯企业邮箱开启客户端专用密码后，在发信区一键套用预设即可自动填充 SSL `465` 端口参数。
* 前台邮件配置仅保存在当前浏览器供“前台配置发送测试邮件”；注册验证码与订单/业务自动通知使用部署环境变量（`Variables and Secrets`）。

##### 📤 Resend 发信详细流程（逐步操作）
1. **添加并验证发信域名**：登录 [resend.com](https://resend.com) -> 左侧 **Domains** -> **Add Domain**，输入域名并在 DNS 服务商添加 Resend 提供的 **SPF (`TXT`)** 与 **DKIM (`TXT`)** 记录，等待状态变为绿色 **Verified**。
2. **创建 API Key**：左侧 **API Keys** -> **Create API Key** -> Permission 选择 **Sending access**（如需同时使用 Resend 收信则建议选 **Full access**）-> 立即复制 `re_...` 密钥。
3. **配置部署环境变量**：在 Cloudflare Pages **Settings -> Variables and Secrets**（或本地 `.env`）配置：
   * `MAIL_PROVIDER=resend`
   * `RESEND_API_KEY=re_xxxxxxxx`（Secret）
   * `MAIL_SENDER=Fox3 <no-reply@你的已验证域名>`（发信域必须与第 1 步 Verified 域名一致）
4. **重新部署并验证投递**：进入 **Deployments** 触发一次 **Retry deployment**（或点击发信区“发送真实测试邮件”测试前台配置 / “测试后台环境变量发信”测试生产环境），确认收到真实邮件且 API 返回邮件 ID。

#### 二、收信区：Resend 收信详细流程与 IMAP 主动拉取

站内收件箱支持两种互补收信方式，均统一入库至 D1 `fox3_inbound_emails` 供站长查阅与回复：

##### 📥 方式 A：Resend 收信详细流程（Receiving + Webhook 实时入库，逐步操作）
1. **开启域名 Receiving 并配置 MX**：进入 Resend **Domains** -> 打开目标收信域名 -> 开启 **Receiving** 开关（为避免影响原有企业邮箱收信，强烈建议单独使用子域名如 `mail.你的域名.com`）-> 按页面提示在 DNS 后台添加对应 **MX 记录** 并等待验证通过。
2. **创建 Webhook 订阅 `email.received`**：左侧 **Webhooks** -> **Add Webhook** -> Endpoint URL 填写你网站的公网接收地址：
   ```text
   https://<你的站点域名>/api/webhook
   ```
   （同样兼容 `/api/mail/webhook`）；事件必须勾选 **`email.received`**。
3. **保存 Signing Secret 与 API Key**：创建 Webhook 后立即复制 **`whsec_...`**；在 Cloudflare Pages **Settings -> Variables and Secrets**（或 `.env`）配置以下全部四项并**重新部署**：
   * `RESEND_WEBHOOK_SECRET=whsec_...`
   * `RESEND_API_KEY=re_...`（需含读取邮件正文权限）
   * `DB`（已绑定的 D1 数据库，收件正文与附件元数据写入 `fox3_inbound_emails`）
4. **发信验证收件入库**：使用任意外部邮箱向 `test@<你开启Receiving的域名>` 发送一封测试邮件 -> 在 Resend Webhooks **Logs** 确认 HTTP 状态为 `200 OK` -> 打开本站「邮件中枢 -> 收信箱」即可看到完整来信正文与附件信息。
> 说明：收件指示灯只检查服务端变量与 D1 是否齐备；请勿只做普通邮件转发，必须通过启用了 Receiving + MX 且推送到 `/api/webhook` 的链路才会同步正文。本站收件箱自动保留最近 500 封及 180 天内数据。

##### 📨 方式 B：IMAP 主动拉取收信（支持阿里云邮箱 / 腾讯企业邮箱免费版 / 通用 IMAP）
1. 在邮件中枢「二、收信区」点击 **“一键同步发信区的邮箱地址与授权码”**，或手动填写 IMAP 主机（如阿里云 `imap.qiye.aliyun.com:993`、腾讯企业邮箱 `imap.exmail.qq.com:993`）、账号及专用授权码。
2. **测试 IMAP 连接 & 立即拉取**：
   * **Docker / Node 全栈服务器 / 本地预览环境**：内置原生 TLS Socket（`server.ts`）直接连接上游 `993` IMAP 服务器，点击 **「立即拉取邮箱来信」** 即可把最新邮件同步入站。
   * **Cloudflare Pages 部署**：由于 Cloudflare Workers 默认限制出站直连非 HTTP 原始 IMAP `993` 端口，可在服务端环境变量配置 `IMAP_BRIDGE_URL`（指向本仓库自带 `server.ts` `/api/mail/imap-bridge` 或外部 HTTP-IMAP 桥接服务）+ `IMAP_BRIDGE_TOKEN` 即可无痛启用；也可直接使用上方的 **Resend Receiving + Webhook（纯 HTTPS，无需桥接）**。

#### 三、注册验证码

验证码由服务端安全生成并由服务端校验，注册访客不能通过前端指定验证码值。Cloudflare 部署必须绑定名为 `DB` 的 D1，并配置任意一个已验证通过的后端发信服务商、`MAIL_SENDER` 及对应密钥。可选变量：`VERIFY_CODE_LENGTH`、`VERIFY_EMAIL_SUBJECT`、`VERIFY_EMAIL_TEMPLATE`；模板变量为 `{{code}}`、`{{username}}`、`{{email}}`。应分别测试前台配置与后台环境变量配置。

### 商户支付与部署指南（Cloudflare Pages + Functions + D1）

本项目支付支持部署在 **Cloudflare Pages（Git 或 Direct Upload `dist/_worker.js`）+ D1** 或 **Docker / Node 全栈服务器**。新安装可按顺序执行 `migrations/0001_site_content.sql`、`migrations/0002_commerce.sql`、`migrations/0003_order_trash.sql`、`migrations/0004_chat_trash.sql`（首次 API 请求亦会自动安全补齐缺失列与索引）。D1 持久保存订单、站内客服会话、客服回收站、消息、通知及可编辑法律页面；网站内容数据库与 WebDAV 备份严格分离。支付接口初始化失败时，已创建的订单仍保存在 D1 并显示未支付/失败，不会丢失。

* **订单回收站 & 站内客服对话回收站**：删除订单与删除站内客服对话均会安全移入各自的可恢复回收站，管理员可在后台查看「对话回收站」、一键 **恢复对话**、单条 **彻底删除** 或 **清空回收站**；如同一用户重新发起咨询，已软删除的会话会自动恢复并保持对话连续。
* **新订单通知**：每笔订单创建后会生成管理员站内消息并尝试发送邮件，默认收件地址为服务端 `MAIL_SENDER`，也可在商城订单区设置专用管理员收件邮箱。服务端异步回调验签成功后会再生成已支付通知与邮件。全站及所有支付通知 URL 必须使用 HTTPS。

**商户资质准备：**通常需准备企业/个体户营业执照、法人身份证、结算账户，并按各支付机构要求提交网站、经营类目和补充材料。商户可用资格、支持币种、结算周期及最终到账以账户审核和实测为准；本代码没有提供 FX/汇率兑换，不承诺支付账户审批或平台实际收款。

**平台开户与产品开通：**
1. **支付宝**：在支付宝开放平台/商家平台完成主体认证，创建应用并申请开通“电脑网站支付”和“手机网站支付”，按平台要求配置应用公钥、支付宝公钥及异步通知地址。
2. **微信支付**：在微信支付商户平台申请商户号并开通 PC 网站支付（Native 扫码支付；如业务需要另申请 H5 支付）。按平台流程配置商户 API 证书/私钥、API v3 密钥和回调 URL；PC 网站接入使用已备案域名。
3. **Stripe**：注册并完成 Stripe 账户启用，在 Dashboard 获取 Publishable Key 与 Secret Key。本项目结账只从服务器使用 Secret Key；Publishable Key 目前不参与结账，不要因拿到该 Key 而把 Secret Key 放进浏览器。
4. **PayPal**：创建并完成 PayPal 企业账户，建立 REST 应用并取得 Client ID 与 Secret；先用 Sandbox 凭据验证，正式环境另行切换。

**仅在 Cloudflare Pages Settings → Variables and Secrets → Secrets 配置下列密钥/凭据**，按实际部署环境设置，绝不写付款密钥到前端、`localStorage`、D1 或仓库：

- Alipay：`ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY`（PEM PKCS#8 `BEGIN PRIVATE KEY` 或 PKCS#1 `BEGIN RSA PRIVATE KEY`；都支持）、`ALIPAY_PUBLIC_KEY`；可选 `ALIPAY_PID`（作为 `biz_content.seller_id`）、`ALIPAY_NOTIFY_URL`、`ALIPAY_GATEWAY`。
- WeChat Pay：`WECHAT_MCHID`、`WECHAT_APPID`、`WECHAT_SERIAL_NO`、`WECHAT_PRIVATE_KEY`（PKCS#8）、`WECHAT_API_V3_KEY`（32 个 ASCII 字节）、`WECHAT_PLATFORM_CERT`、`WECHAT_NOTIFY_URL=https://你的域名/api/payments/webhook/wechat`。
- Stripe：`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`。
- PayPal：`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`、`PAYPAL_WEBHOOK_ID`、`PAYPAL_API_BASE`。默认 API base 是 Sandbox；正式环境使用 `https://api-m.paypal.com`。

商城的“支付接入指南与变量状态”窗口提供以上四个已实现渠道的 Pages Secret 配置教学，并只用绿/黄灯显示后端是否读到每项变量，不回传 Secret 值。状态灯不是商户认证或真实收款验证。万里汇（WorldFirst）目前没有本仓库支付创建、回调验签和退款适配器，因此不能选择用于结账；需另行开发并完成平台测试后再开放，不能只配置变量就宣称已接入。

四个异步回调 endpoint 为 `/api/payments/webhook/alipay`、`/api/payments/webhook/wechat`、`/api/payments/webhook/stripe`、`/api/payments/webhook/paypal`。在各平台把对应 HTTPS URL 配为通知地址：支付宝开启异步通知；微信配置支付回调；Stripe Dashboard Webhook 监听 `checkout.session.completed`、`checkout.session.async_payment_succeeded`、`checkout.session.async_payment_failed`、`checkout.session.expired`、`charge.refunded`、`refund.updated`；PayPal 至少订阅 `PAYMENT.CAPTURE.COMPLETED`、`PAYMENT.CAPTURE.DENIED`、`PAYMENT.CAPTURE.REFUNDED`。确认平台向部署 URL 实际投递并由服务端验签。

**Webhook 必须按以下 6 步处理：**
1. 用户付款。
2. 支付平台向 `notify_url` POST 通知，携带订单号、金额、状态和签名。
3. 后端验证签名。
4. 验签通过后再核对订单与金额，更新订单/会员并持久化，然后返回成功。
5. 验签失败则返回错误，不更新订单。
6. 重复回调按幂等方式处理，不重复发货或重复授予会员权益。

最终到账/支付成功以验签通过的服务端异步回调为准，不能依据前端跳转或用户返回页面判定。订单只能由后端数据库创建；支付 credentials 未配置或支付创建失败时，订单仍持久化并标为未支付/失败，提示检查配置，不会伪造成功。用户取消只取消未支付订单。PayPal 回跳后由服务端执行 capture，但订单仍须等 Webhook 才标记 paid；Stripe/PayPal 均可能异步完成。重复回调幂等；订单删除进入回收站并可恢复，支付审计记录保留；用户可对每笔订单发起客服对话。管理员订单视图每个订单均显示确认发货按钮，只有支付验签成功订单可发货，发货确认后用户看到已发货；管理员可原路退款，退款处理中等待渠道通知更新状态。每笔新订单会生成管理员站内通知并通过服务端验证码邮件共用的 `MAIL_SENDER` 默认发送邮件；付款验签后另发已支付通知/邮件。可选设置专用收件地址；邮件是否送达取决于配置的服务端 Secrets 和邮箱服务。

**建议上线检查：**先分别使用各平台沙箱/测试密钥完成下单、成功、失败、取消、重复通知及退款测试，检查签名验证、D1 状态、幂等和通知结果；确认回调公网可达、HTTPS 和密钥正确后，再按平台规则切换正式密钥并再次核实商户资格、币种和结算设置。本文不声称已经完成商户生产实测。

**代码审查记录：**支付宝预创建二维码使用 `FACE_TO_FACE_PAYMENT` 产品码；微信退款优先使用已验签回调保存的微信支付交易号，缺少该号时才使用商户订单号，并按微信接口提交原订单总额。参考 [微信支付退款申请 API](https://pay.weixin.qq.com/doc/v3/merchant/4012810597)。代码审阅、TypeScript 检查和本地构建不等于真实商户联调；在未配置各家真实商户资料、HTTPS 公网回调和证书前，不能保证账户审核、交易受理、退款到账或邮件送达。

**政策页：**站点提供主页/价格（商城）/退款/隐私/服务条款/联系方式页面；站长可在网站法律与联系页编辑并保存到 D1。当前内容是政策草稿，发布前须依据实际经营主体、真实服务和适用法律审查，不构成法律意见。

### WebDAV 备份与远端文件管理

在“备份区”配置 HTTPS WebDAV 服务地址、目录、账号和应用专用密码后，应用通过本站 Cloudflare Pages Functions 的 `/api/webdav/*` 代理执行 DAV 操作：服务端认证探测、`PROPFIND` 远端列表、`PUT` 上传、`GET` 下载和 `DELETE` 删除。连接状态灯只在服务端真实认证请求成功后转绿；远端文件列表直接从 WebDAV 读取，因此同一目录也可在 WebDAV 服务商界面查看。服务端代理要求有效管理员会话，静态 Direct Upload/Vercel 部署不提供该 Functions API。

当前本站生成的是带版本号的 fox3 JSON 数据快照；它能恢复应用记录/设置，但并不把照片、视频、书籍附件等二进制本体打包进 JSON。远端已有任意扩展名文件会按原文件名/格式列出，管理员也可手动上传不超过 25 MiB 的本地原格式文件，并从本站下载或删除；本站的“恢复”仅适用于本站格式的 JSON 快照，其他文件需下载后在对应功能中重新导入。目前代理单文件上限 25 MiB、无断点续传，浏览器到 Pages Functions/远端的网络时限也可能导致传输失败；先选择文章、文字与设置文件，图片/视频或大电子书容易卡住或超时，不应将其当作可靠的大型媒体灾备方案。WebDAV 凭据只保存在当前浏览器本机，不写入共享同步载荷；远端文件列表每次从 WebDAV 目录直接读取；备份文件与 WebDAV 元数据完全不进入站点内容数据库。换设备需再次配置凭据并重新读取 WebDAV 目录。

### 注册账户与密码重置

邮箱注册会先由 Pages Functions 发送并校验验证码，然后将用户资料与 PBKDF2 密码哈希写入 D1 的 `fox3_users`。必须为 Pages Functions 绑定名为 `DB` 的 D1 数据库；缺少 D1 或写入失败时，API 返回错误，前端不会创建仅在本机存在的假账号。建议注册时验证并绑定可长期访问的真实邮箱；忘记密码时可通过“邮箱验证码重置”流程接收 10 分钟有效验证码。未绑定有效邮箱的普通用户名账号不能自助找回。重置验证码保存在独立 `fox3_password_resets` 表中，并执行 IP/邮箱限流和尝试次数限制。

### 数据实际存储映射

- **浏览器内存/`localStorage`**：公开核心内容可从既有 localStorage 读取为启动缓存，并在数据库成功拉取后被 D1 最新版本覆盖；本地回写也仅作为可丢弃缓存，不是跨设备内容的权威来源。设备偏好与邮件/支付/WebDAV 配置仍留在本机浏览器；前台密钥未加密，不要在公用设备保存。
- **浏览器 IndexedDB**：浏览器本地文件/Blob 缓存与部分上传文件回退数据。清除浏览器站点数据会影响这些本机数据。
- **Cloudflare D1 (`DB`)**：`fox3_site_content` 是公开站点内容的规范主库，含 revision；`fox3_user_media` 保存注册用户媒体目录，按账户隔离并含 revision，公共页面只合并目录记录；`fox3_users` 保存注册账户和 PBKDF2 密码哈希；`fox3_email_verifications`、`fox3_password_resets`、`fox3_email_ip_rates` 用于注册/找回验证码及限流；`fox3_inbound_emails` 保存经过 Resend webhook 验签并拉取的来信正文和附件元数据；`fox3_admin_notebook` 保存仅管理员会话可读写的私有记事本；`fox3_sync` 仅是旧版管理员私有同步兼容表，不是网站公开内容主库；`fox3_files` 是无 R2 时的文件回退表。邮件凭据/WebDAV 凭据不在公开站点载荷中。
- **Cloudflare R2 (`R2_BUCKET`)**：上传文件对象首选，下载由 R2 流式返回。超过 80 MiB 的文件通过 8 MiB 分块上传，绕开单个 Pages/Workers 请求体大小限制；Cloudflare R2 服务自身上限为 5 TiB，但本项目当前最多 10,000 个 8 MiB 分块，应用有效单文件上限为 78.125 GiB（约 83.9 GB）；因此“无大小限制”不是字面无限，仍受配额、浏览器、网络及文件安全规则约束。断网后当前版本不会自动续传；失败分块不会自动重试。小文件使用单请求上传；超过 90 MB 的文件不适用于“影音天地”原生媒体上传说明，应使用相册/书架等共用文件上传入口。只有成功写入 R2/COS/OSS/S3 对象存储的文件才能可靠跨设备读取；网络或云存储失败时若回退到 IndexedDB，会明确提示并仅在当前设备可用。R2 不可用时可按 `OBJECT_STORAGE_PROVIDER` 选择服务端 Tencent COS、Alibaba OSS 或通用 AWS SigV4 S3-compatible 对象存储后备。COS/OSS/S3 密钥只配置在 Pages Functions Secrets，绝不写入浏览器；COS Bucket 要填写带 APPID 的完整桶名（`bucketname-APPID`），COS region 形如 `ap-guangzhou`；OSS region 形如 `cn-hangzhou`。通用 S3 需提供 HTTPS endpoint、地域、桶名及密钥，并使用适配器支持的 path-style 请求。外部对象存储仍由当前 Cloudflare Pages Functions 代为签名读写，不会自动迁移 D1 用户/博客数据，也不代表前端静态部署已带有后端 API。对象存储失败时，文件不超过 1 MiB 才可回退 D1 文件表；KV 回退上限为 18 MiB；最后的 Worker 内存回退仅适用于 4 MiB 以内文件。内存回退会在实例重启/切换后丢失，无法视为持久存储；D1/KV 回退也不是等价的大文件对象存储。超过可用后备容量时 API 返回 JSON 503，不会报告虚假成功。
- **Cloudflare KV (`KV`)**：仅作旧版管理员私有同步/验证码兼容回退及短期记录；公开站点内容不写 KV。成功发送邮件回执由 API 返回并保存在前端状态，不额外写 KV。
- **邮箱配置归属与收信范围**：前台邮件配置只保存在设置它的浏览器（本机存储且未加密）；前台配置只能用于管理员显式选择前台来源的手动邮件/本机测试或手动 IMAP 拉取，不会令验证码或后端自动触发的业务邮件生效。验证码与后端业务发信使用 Pages Functions / 服务端环境变量与 Secrets。站内收件箱支持 **Resend Receiving Webhook**（实时推送入库）与 **IMAP 主动拉取收信**（阿里云/腾讯企业邮箱免费版等）两种途径；同步后的来信正文和附件元数据统一保存在 D1 `fox3_inbound_emails`。
- **跨设备站点内容与权限边界**：需要 Cloudflare Pages Functions（含 Direct Upload 生成的 `dist/_worker.js`）或 Node/Docker 全栈运行环境，并正确绑定 `DB`。任何访客/设备可读和刷新白名单内已发布内容；管理员更改自动保存到 D1，并使用 revision 冲突保护。普通访客不能写入 D1。顶部按钮是手动重新读取，不执行管理员私有数据同步，也不操作 WebDAV。`BroadcastChannel` 仅用于同浏览器跨标签页。注册用户媒体同步需真实 D1 用户登录签发的 7 天 HMAC 会话，且管理员已开启 `allowUserMediaManagement`；服务器对媒体目录写入按 token 中的用户 ID 强制归属，普通访客/无会话本地账号不能写 D1。文件对象经 `/api/upload` 保存到 R2 或已配置的对象存储；若云上传失败而回退 IndexedDB，该文件仅在当前浏览器可用，不会伪报跨设备持久化。用户媒体目录在页面公开展示，但只有其所有者可通过应用界面管理/删除。

---

## 🛠️ 本地开发与构建命令

```bash
# 安装依赖
npm install

# 启动本地开发热更新服务器 (端口 3000)
npm run dev

# 编译代码并自动打包部署 zip 文件
npm run build

# 本地预览编译后的静态文件 (端口 4173)
npm run preview
```

---

## 📝 管理员账号

* **用户名**：默认为 `fox`，也可通过 `ADMIN_USERNAME` 配置。
* **密码**：没有固定的生产默认密码。Cloudflare Pages Functions 使用部署端至少 6 字符的 `ADMIN_PASSWORD` 与独立至少 32 字符的 `ADMIN_SESSION_SECRET`；应用页面不能更改 Cloudflare Secret。本地前端偏好并不等同于生产服务端凭据。
