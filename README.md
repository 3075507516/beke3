# fox3 - 次世代现代化全能个人博客与数字知识库系统

> **fox3** 是一款响应式个人博客与数字资产管理前端。博客/设置数据默认保存在浏览器本机；Cloudflare D1/R2/KV 提供部分账户、共享同步和文件服务能力，必须正确绑定才可使用，不应将本地回退视为云端容灾。

---

## 🌟 核心特性概览

* **极速现代化架构**：基于 React 19、TypeScript、Vite 与 Tailwind CSS，采用极简毛玻璃卡片质感，自适应电脑宽屏与手机竖屏。
* **全新统一重构登录与鉴权系统**：
  * 默认用户名与密码注册，界面明示不支持密码找回。
  * 支持电子邮箱验证码注册，验证码严格真实发信且无前端泄露，注册面板自带“关闭”退出按键。
  * 管理员用户名默认 `fox`；生产管理员自行选择强密码，并在 Cloudflare Pages Secret 设置 `ADMIN_PASSWORD`。没有固定默认密码；若未配置该变量，管理员登录会被拒绝，不提供免密登录。Cloudflare 部署变量只能在 Dashboard 修改。
* **严格角色权限隔离与身份徽标**：
  * 普通注册用户仅能发布博文与删除自己发布的博文，禁止编辑他人内容及书架/相册/影音。
  * 博文详情与卡片高亮标注作者角色徽标，例如 `[用户名] (注册用户)` 与 `fox (超级管理员)`。
  * 【备份区】、【邮箱中枢】、【系统设置】及【网站图床】严格对非管理员隐藏，普通用户无权访问。
* **11 款系统级怀旧与设计风格主题中心**：
  * 内置微软 Windows 98 怀旧、麦金塔 Classic Platinum、Matrix 极客终端、复古报纸羊皮纸、8-Bit 掌机像素、赛博朋克霓虹、蒸汽朋克黄铜、北欧极简原木、复古皮质笔记本、工程架构蓝图、现代流体玻璃等 11 款独立完整主题（不仅是调色，深度重塑边框质感与系统气质）。
  * 彻底移除夜间深色模式强制覆盖。
* **网站图床与网址导航中枢 (Sites & Image Host Hub)**：
  * 管理员专属板块，支持快捷添加和管理网站与图床，默认集成高速公共图床 (`https://img.001315.xyz/`)，支持海报预览与一键跳转。
* **站内邮件发信与注册验证码**：
  * 默认优先使用 Resend Email API（HTTPS）发信，也兼容 SMTP、Brevo API、SendGrid API；实际投递仍取决于服务商账户、发件域名 DNS 和收件方策略。
  * Resend `email.received` webhook 经签名验证后会取回来信正文并写入 D1；需要在 Resend 配置 Receiving 域名/MX 与 webhook，并绑定 D1。
  * 后台 API 连接检查不会发送邮件；单独的“发送测试邮件”才会真实投递到发件地址。前台邮件密钥保存在本机浏览器且未加密。
* **流量与上传性能极限优化**：
  * 全局图片采用懒加载 (`loading="lazy"`) 与异步解码 (`decoding="async"`)；
  * 标签页处于后台隐藏状态时（Page Visibility API）立即暂停网络长轮询与同步，彻底杜绝无操作流量浪费。
  * 文件上传采用真正的 `XMLHttpRequest.upload.onprogress` 实时字节速率计算与 25 秒超时保护，彻底杜绝伪进度条卡住问题。
* **独立外部翻译 API 配置**：
  * 快速在线互译助手自带独立的“保存外部翻译 API 配置”按键，配置即时生效并持久化。
* **备份区 (WebDAV Disaster Recovery)**：
  * 支持标准 WebDAV 协议（服务器地址、端口默认 443、用户名、应用密码），一键全站结构化快照备份与精准回滚。
* **深层国际化多语言支持**：
  * 支持 **中文简体 (zh-CN)、中文繁体 (zh-TW)、英语 (en-US)、韩语 (ko-KR)、阿拉伯语 (ar-SA)、印地语 (hi-IN)**。
  * 覆盖全站导航、设置按键、详细说明与部署指南。

---

## 🚀 全平台部署指南

### 1. Cloudflare Pages 一键拉取部署 (首选推荐 ⭐⭐⭐⭐⭐)

1. Fork 或推送本项目至您的 GitHub / GitLab 仓库。
2. 登录 Cloudflare Dashboard 控制台，进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3. 选择 `fox3` 仓库，配置构建参数：
   * **Framework preset**: `Vite`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
4. 部署成功后，进入 **Settings** -> **Functions** -> **Bindings** 绑定资源：
   * **D1 Database 绑定**：变量名称填写 `DB`，存储注册账户与验证码/限流记录、共享同步 JSON，以及 Resend 收到的站内邮件正文；收件箱功能必须绑定。
   * **R2 Bucket 绑定**：变量名称填写 `R2_BUCKET`，用于应用文件上传；无 R2 时可回退 D1 文件表，超大/不适用场景不保证。
   * **KV Namespace 绑定**：变量名称填写 `KV`，仅作为兼容回退/临时数据层；正常验证码和共享同步优先使用 D1。KV 有日写入额度，绑定不代表写入额度充足。
   * **环境变量设置 (Environment Variables)**：
     * `ADMIN_USERNAME`：自定义管理员账号名（默认 `fox`）。
     * `ADMIN_PASSWORD`：由管理员自行选择的生产登录密码，至少 12 个字符，建议使用随机密码；仅在 Cloudflare Pages 的 Variables and Secrets 中设置或修改。
     * `ADMIN_SESSION_SECRET`：推荐必配的独立高熵随机 Secret，至少 32 个字符，用于签发/验证短期 API 会话。只有该变量未设置且 `ADMIN_PASSWORD` 长度至少 32 字符时，才允许后者作为签名密钥；设置了过短的会话 Secret 会 fail closed。
     * 邮件与收件变量：按下方“邮件配置”设置 Resend API Key、发件地址和 webhook 签名 Secret。

---

### 管理员登录与云端 API 权限

Cloudflare 部署时，管理员应自行选择并设置 `ADMIN_PASSWORD`（至少 12 字符），并应设置独立的 `ADMIN_SESSION_SECRET`（至少 32 个随机字符）。为向后兼容，仅在未设置会话 Secret 且 `ADMIN_PASSWORD` 至少 32 字符时才使用密码作为签名密钥。成功登录会签发 12 小时签名令牌，前端会定期向服务端验证；邮件发送与 D1 共享同步 API 均要求有效令牌。未配置管理员密码或有效签名密钥时，管理员登录会 fail closed；不会因未设置变量而允许免密直登。Cloudflare 部署变量只能在 Dashboard 修改，应用前台设置不能更改平台 Secret。纯静态部署没有 Cloudflare Functions，无法启用这些服务端权限与 API。

---

### 2. Cloudflare Pages 一键直接上传部署 (Direct Upload)

适合免 Git 仓库一键直接交付**静态前端**。该 ZIP 不包含 `functions/`，不会自动部署 Functions 或创建 D1/R2/KV 绑定；它不具备注册、验证码邮件、后台邮件、共享同步与远程文件 API：
1. 本地执行构建与打包命令：
   ```bash
   npm run build
   ```
2. 构建脚本会在根目录下自动生成 `dist-upload.zip` 与 `dist/` 编译输出目录。
3. 登录 Cloudflare Pages 控制台，选择 **Create application** -> **Pages** -> **Direct Upload**。
4. 填写项目名称（如 `fox3`），上传 `dist` 文件夹或静态上传包。要启用服务端功能，请改用上方 Git 集成部署并配置 Functions 与资源绑定。

---

### 3. Vercel 一键拉取部署

1. 在 Vercel 控制台点击 **Add New Project**，导入 Git 仓库。
2. Framework Preset 选择 **Vite**，Build Command 填 `npm run build`，Output Directory 填 `dist`。
3. 仓库内已内置 `vercel.json` 自动处理 SPA 静态路由分发。

---

### 4. Docker & docker-compose 一键容器化部署

本项目已提供精简多阶段构建 `Dockerfile` 与 `docker-compose.yml`：

```bash
# 1. 克隆代码
git clone <your-repo-url> && cd fox3

# 2. 一键构建并启动
docker-compose up -d --build

# 3. 访问站点
http://<你的服务器IP>:8080
```

---

### 5. 腾讯云 (EdgeOne / 轻量服务器) 部署

* **EdgeOne Pages**：绑定 Git 仓库，构建目录填写 `dist`，享受中国大陆顶尖边缘加速。
* **轻量服务器 (Lighthouse / CVM)**：
  将 `dist/` 目录拷贝至 `/var/www/fox3/dist`，使用项目内置的 `nginx.conf` 启动 Nginx 服务。

---

### 6. 阿里云 (ESA / OSS / ECS) 部署

* **阿里云 OSS 静态网站托管**：创建公共读 Bucket，将 `dist/` 内文件全部上传，静态页面默认首页和 404 均设置为 `index.html`。
* **阿里云 ECS**：配合 Docker 或 Nginx 进行静态托管。

---

### 7. 1Panel 面板极速部署

1. 打开 1Panel 后台，进入 **网站** -> **创建网站** -> **静态网站**。
2. 上传 `dist/` 目录文件至网站根目录。
3. 或进入 **容器** -> **编排**，直接粘贴本项目 `docker-compose.yml` 一键创建。

---

## 🔑 环境变量与绑定参数一览表

| 变量名 / 绑定键 | 平台 / 类型 | 实际用途 | 建议 |
| :--- | :--- | :--- | :--- |
| `DB` | Cloudflare Pages D1 Binding | 注册用户、验证码与限流、共享同步 JSON、Resend 收件箱、R2 不可用时的文件回退表 | 收件箱、账户与共享同步必绑；邮件测试限流可选用 |
| `R2_BUCKET` | Cloudflare Pages R2 Binding | 文件上传对象与下载读取 | 推荐 |
| `KV` | Cloudflare Pages KV Binding | 兼容回退及临时数据；不是主博客数据库，免费配额可能限制写入 | 可选 |
| `ADMIN_USERNAME` | Pages Environment Variable | 管理员账号名，默认 `fox` | 推荐设置 |
| `ADMIN_PASSWORD` | Pages Secret | 管理员自行设定的登录密码；至少 12 字符。未设置则管理员登录被拒绝 | 必须设置 |
| `ADMIN_SESSION_SECRET` | Pages Secret | HMAC 会话签名密钥；至少 32 字符。未设置时仅在 `ADMIN_PASSWORD` 至少 32 字符才回退 | 强烈建议单独设置 |
| `MAIL_PROVIDER` | Pages Environment Variable | `resend`（推荐）、`smtp`、`brevo` 或 `sendgrid` | 推荐明确设置为 `resend` |
| `RESEND_API_KEY` | Pages Secret | Resend HTTPS API 凭据；用于发信、域名连接检查和取回收件正文 | Resend 主通道必填；权限需覆盖域名读取与 Receiving |
| `MAIL_SENDER` | Pages Environment Variable | 后台发件人，例如 `Fox3 <no-reply@verified-domain>`；Resend 要求使用已验证且启用发送的域名 | 必填 |
| `RESEND_WEBHOOK_SECRET` | Pages Secret | Resend `email.received` webhook 的 Signing Secret（`whsec_...`） | 启用站内收件必填 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURITY` / `SMTP_USER` / `SMTP_PASS` | Pages Variables/Secrets | 可选 SMTP 备用通道；Resend SMTP 示例：`smtp.resend.com` / `465` / `ssl` / `resend` / Resend API Key | 仅选择 SMTP 时使用；密码用 Secret |
| `BREVO_API_KEY` / `SENDGRID_API_KEY` / `MAIL_API_KEY` | Pages Secret | 备用服务商 API 凭据；`MAIL_API_KEY` 可作兼容别名 | 仅选对应 API 通道时使用 |
| `VERIFY_CODE_LENGTH` / `VERIFY_EMAIL_SUBJECT` / `VERIFY_EMAIL_TEMPLATE` | Pages Environment Variables | 后台注册验证码位数、主题和模板 | 可选 |

### Resend 发信、连接测试与收件配置

在 Resend 中创建 API Key 并验证发件域名。Cloudflare Pages 的 Functions Variables/Secrets 至少设置 `MAIL_PROVIDER=resend`、`RESEND_API_KEY` 和 `MAIL_SENDER`。推荐 API Key 具备此功能所需的域名读取与收件读取权限；仅发送权限的 Key 仍可能能发邮件，但不能通过域名连接检查或读取 inbound 邮件。

邮箱中枢的“检查 Resend API 连接”会以 HTTPS 调用 `GET https://api.resend.com/domains`，不会发送邮件；绿色连接结果只表示 API Key 可读取域名，面板还会检查 `MAIL_SENDER` 域名是否存在并启用发送。要验证实际发信，请另按“发送后台测试邮件”，它会真实投递至发件地址。Resend API 发送端点为 `POST https://api.resend.com/emails`。

收件时，在 Resend Dashboard 的 Emails → Receiving 启用 Resend 管理域名，或按 Resend 指引为自有域名设置 MX。随后创建订阅 `email.received` 事件的 Webhook，URL 填 `https://<你的 Pages 域名>/api/mail/webhook`，把 webhook Signing Secret 保存为 `RESEND_WEBHOOK_SECRET`，并将 D1 绑定名设为 `DB`。收到事件后，Functions 会先验证 Svix 签名和时间戳，再通过 Resend Receiving API 获取邮件正文并保存进 D1；管理员邮件中枢读取 `/api/mail/inbox` 展示来信。配置变量本身不代表 Resend Dashboard 已启用收件，状态灯会等到实际收到邮件后才显示“已收到邮件”。D1 自动清理 180 天前的邮件并最多保留最近 500 封；当前只保留附件元数据，不下载附件文件。

### 数据实际存储映射

- **浏览器 `localStorage`**：当前设备的博客文章、书籍、照片元数据、媒体、站内邮件列表、商品/订单、聊天、站点与系统设置、前台邮箱设置（SMTP/API 密钥）等应用状态。前台密钥保存在本机浏览器且未加密；不随共享同步上传，导出备份会剔除邮件密钥。公用设备不要保存密钥。
- **浏览器 IndexedDB**：浏览器本地文件/Blob 缓存与部分上传文件回退数据。清除浏览器站点数据会影响这些本机数据。
- **Cloudflare D1 (`DB`)**：`fox3_users` 保存注册账户和 PBKDF2 密码哈希；`fox3_email_verifications`、`fox3_email_ip_rates` 用于验证码/限流；`fox3_inbound_emails` 保存经过 Resend webhook 验签并拉取的来信正文和附件元数据；`fox3_sync` 保存管理员手动同步的共享 JSON（文章、书籍、照片/媒体元数据、站内邮件列表、商品/订单、聊天、备份索引、回收站、系统设置等；自动同步的字段范围较小）；`fox3_files` 是无 R2 时的文件回退表；邮件测试限流表可选使用 D1。邮件凭据/WebDAV 凭据不在共享同步载荷中。
- **Cloudflare R2 (`R2_BUCKET`)**：上传文件对象的首选存储；单文件上传上限为 90 MiB，并拒绝常见可执行/活动内容扩展名。R2 写失败时，文件不超过 1 MiB 才可回退 D1 文件表；KV 回退上限为 18 MiB；最后的 Worker 内存回退仅适用于 4 MiB 以内文件。内存回退会在实例重启/切换后丢失，无法视为持久存储；D1/KV 回退也不是等价的大文件对象存储。超过可用后备容量时 API 返回 JSON 503，不会报告虚假成功。
- **Cloudflare KV (`KV`)**：仅作兼容回退/短期记录；正常验证码和共享同步优先 D1，只有 D1 不可用时才回退。成功发送邮件的回执由 API 返回并保存在前端应用状态，不再额外写 KV。KV 免费配额仍可能在回退数据写入频繁时耗尽。
- **邮箱配置归属**：前台邮箱配置只保存在配置它的浏览器；后台环境变量适用于服务端/注册邮件。二者可分别检查或发送测试邮件，手动站内信可明确选择使用哪一方。Resend webhook 收件正文保存于 D1，应用不会通过 IMAP 轮询，也不会把 Email Routing 转发误认为本站收件。
- **重要部署限制**：纯静态部署（例如 Pages Direct Upload、Vercel 静态目录、OSS 静态托管）不会自动带上 Cloudflare Pages Functions、D1/R2/KV 绑定；账户、验证码、服务端邮件和云同步 API 需要 Functions 运行环境与相应绑定。未配置时仅能使用本地功能或得到明确的服务错误。

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
* **密码**：没有固定默认密码。生产部署必须在 Cloudflare Pages Secret 中设置强随机 `ADMIN_PASSWORD`；应用页面不能更改平台 Secret。
