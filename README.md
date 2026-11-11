# fox3 - 次世代现代化全能个人博客与数字知识库系统

> **fox3** 是一款高颜值、响应式、多终端适配的现代化全能博客与数字资产管理系统。设计灵感与功能对标 https://beke.luobikang.kdns.fr/，支持无缝云端存储与多端高可用容灾。

---

## 🌟 核心特性概览

* **极速现代化架构**：基于 React 19、TypeScript、Vite 与 Tailwind CSS，采用极简毛玻璃卡片质感，自适应电脑宽屏与手机竖屏。
* **全新统一重构登录与鉴权系统**：
  * 默认用户名与密码注册，界面明示不支持密码找回。
  * 支持电子邮箱验证码注册，验证码严格真实发信且无前端泄露，注册面板自带“关闭”退出按键。
  * 超级管理员用户名固定为 `fox`，初始默认密码 `123456`，部署时可通过环境变量 `ADMIN_PASSWORD` 重载与在系统设置中自主修改，系统保留账号禁止注册。
* **严格角色权限隔离与身份徽标**：
  * 普通注册用户仅能发布博文与删除自己发布的博文，禁止编辑他人内容及书架/相册/影音。
  * 博文详情与卡片高亮标注作者角色徽标，例如 `[用户名] (注册用户)` 与 `fox (超级管理员)`。
  * 【备份区】、【邮箱中枢】、【系统设置】及【网站图床】严格对非管理员隐藏，普通用户无权访问。
* **11 款系统级怀旧与设计风格主题中心**：
  * 内置微软 Windows 98 怀旧、麦金塔 Classic Platinum、Matrix 极客终端、复古报纸羊皮纸、8-Bit 掌机像素、赛博朋克霓虹、蒸汽朋克黄铜、北欧极简原木、复古皮质笔记本、工程架构蓝图、现代流体玻璃等 11 款独立完整主题（不仅是调色，深度重塑边框质感与系统气质）。
  * 彻底移除夜间深色模式强制覆盖。
* **网站图床与网址导航中枢 (Sites & Image Host Hub)**：
  * 管理员专属板块，支持快捷添加和管理网站与图床，默认集成高速公共图床 (`https://img.001315.xyz/`)，支持海报预览与一键跳转。
* **站内邮件中枢与高可用加密接入方式**：
  * 支持自定义端口（SMTP 端口 465/587/25，IMAP 端口 993/143）与多种主流加密接入方式（Resend API TLS 1.3、Brevo API SSL、SendGrid API、企业专用 SMTP 及 Cloudflare Email Routing 边缘路由）。
  * 具备站内邮件中枢持久化回执记录，确保信件收发 100% 必达必查。
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
   * **D1 Database 绑定**：变量名称填写 `DB`，绑定您的 Cloudflare D1 数据库。
   * **R2 Bucket 绑定**：变量名称填写 `R2_BUCKET`，绑定您的 Cloudflare R2 存储桶。
   * **KV Namespace 绑定**：变量名称填写 `KV`，绑定用于缓存与跨设备实时同步的 KV 命名空间。
   * **环境变量设置 (Environment Variables)**：
     * `ADMIN_USERNAME`：自定义管理员账号名（默认 `fox`）。
     * `ADMIN_PASSWORD`：自定义管理员高强度登录密码（系统内置默认初始密码为 `fox3admin2026`）。

---

### 🔑 最佳推荐登录与权限保障方案 (彻底解决无法登录问题)

为保证在各种网络、离线环境、反向代理或跨域 CDN 场景下均能 100% 顺畅登录，系统采用了**双重自适应鉴权引擎**：

1. **唯一超级管理员凭据**：
   * **默认账号**：`fox`（同时支持以 `admin` 或管理邮箱 `service@whitefox.blog` 识别）。
   * **默认初始密码**：`fox3admin2026`。
2. **多层异步双重鉴权**：
   * **云端模式**：当部署在 Cloudflare Pages 时，登录时前端优先向边缘 Functions `/api/auth/admin` 发起异步身份校验，能够即时读取 Cloudflare 控制台后台设定的 `ADMIN_PASSWORD` 与 `ADMIN_USERNAME` 环境变量。
   * **本地/容灾模式**：若未配置环境变量或处于本地开发环境，系统自动无缝对齐本地持久化凭据与默认凭据。
   * **格式自适应容错**：自动进行首尾空格剥离（`.trim()`）与大小写宽容匹配（如 `FOX` / `fox` / `Fox` 均可识别）。
3. **密码修改与同步机制**：
   * 管理员可在【设置区】->【唯一超级管理员最高权限与密码】随时输入当前密码并设定全新密码。
   * 密码修改后将自动通过 `BroadcastChannel` 实时同步至本设备的所有标签页与浏览器存储，永久生效。
   * **KV Namespace 绑定**：变量名称填写 `KV`，绑定您的 Cloudflare KV 命名空间。

---

### 2. Cloudflare Pages 一键直接上传部署 (Direct Upload)

适合免 Git 仓库一键直接交付：
1. 本地执行构建与打包命令：
   ```bash
   npm run build
   ```
2. 构建脚本会在根目录下自动生成 `dist-upload.zip` 与 `dist/` 编译输出目录。
3. 登录 Cloudflare Pages 控制台，选择 **Create application** -> **Pages** -> **Direct Upload**。
4. 填写项目名称（如 `fox3`），直接将 `dist` 文件夹或上传包拖拽入上传区，点击 **Deploy site** 即可秒级上线！

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

| 变量名 / 绑定键 | 平台 / 类型 | 用途说明 | 是否必须 |
| :--- | :--- | :--- | :--- |
| `DB` | Cloudflare Pages D1 Binding | 关联 D1 数据库，存储文章、分类、订单与元数据 | 推荐 (无则降级本地) |
| `R2_BUCKET` | Cloudflare Pages R2 Binding | 关联 R2 存储桶，存储图片、影音、电子书等大文件 | 推荐 (无则降级本地) |
| `KV` | Cloudflare Pages KV Binding | 关联 KV 空间，加速配置读取与缓存 | 可选 |
| `TENCENT_COS_SECRET_ID` | 腾讯云环境变量 | 腾讯云 COS 访问 SecretId | 腾讯云环境可选 |
| `TENCENT_COS_SECRET_KEY`| 腾讯云环境变量 | 腾讯云 COS 访问 SecretKey | 腾讯云环境可选 |
| `ALIYUN_OSS_ACCESS_KEY_ID` | 阿里云环境变量 | 阿里云 OSS 访问 Key ID | 阿里云环境可选 |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | 阿里云环境变量 | 阿里云 OSS 访问 Key Secret | 阿里云环境可选 |
| `ADMIN_USERNAME` | Cloudflare / 环境变量 | 管理员用户名 (项目仅单一管理员，默认为 `fox`，全局保留阻止普通注册) | 唯一性保证 |
| `ADMIN_PASSWORD` | Cloudflare / 环境变量 | 部署密码 / 管理员密码 (后台环境变量优先鉴权，前端设置区亦可实时修改同步) | 最高安全控制权 |
| `MAIL_API_KEY` | 邮件服务密钥 (可选) | Resend 或 SendGrid 接口秘钥 | 邮件发信通道 |
| `CF_EMAIL_ROUTING_ADDRESS` | 邮件路由环境变量 | Cloudflare Email Routing 路由前缀地址 (`contact@...`) | 邮件中枢收信 |
| `CF_EMAIL_DESTINATION` | 邮件路由环境变量 | 管理员私人接收转发展信箱 (`admin@...`) | 邮件中枢转发 |
| `TRANSLATE_API_KEY` | 翻译服务环境变量 | 自定义翻译引擎秘钥 (DeepL / OpenAI / 自定义接口) | 在线互译助手 |

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

## 📝 默认管理员账号

* **用户名**: `admin` 或 `fox`
* **默认密码**: `admin123`（登录后可在设置区随时修改，管理员拥有全站唯一最高控制权）
