# fox3 - 优雅全能的个人数字化博客与云端知识库平台 (WhiteFox Blog v3)

<p align="center">
  <img src="https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80" alt="fox3 Banner" width="100%" style="border-radius: 16px; max-height: 400px; object-fit: cover;" />
</p>

> **fox3** 是专为极客、创作者与全栈工程师量身打造的下一代现代化全功能博客与知识库系统。深度集成 **Cloudflare D1、R2 与 KV**，融合多格式云端书架、音视频流媒体、光影相册、全景网盘、商品展台与客服会话、多通道邮件管理中枢，以及坚果云 WebDAV 一键全站容灾备份。

---

## 🌟 核心特性与架构

### 1. 底层存储架构
- **Cloudflare D1**：用于存储文章、评论、分类、标签、文件元数据与用户信息等结构化数据。
- **Cloudflare R2**：用于存储图片、音视频、电子书及附件等大文件实体，免除全球公网流出费用。
- **Cloudflare KV**：用于高性能缓存与配置同步。
- **零故障容错设计**：即使在未绑定 D1/R2、本地单机演示或离线状态下，系统自动平滑接入 IndexedDB / LocalStorage 冗余存储，**绝不报错、绝不出现图片裂开或文件上传失败**。

### 2. 丰富功能专区
- **博客专区**：支持 Markdown 渲染、分类标签筛选、模糊搜索、互动点赞、收藏，以及管理员后台一键图文编辑。
- **首页介绍区**：支持自定义更换封面并**实时可视化背景渐变渲染**，动态显示存储使用容量（默认零起点，杜绝 NaN 异常）。
- **云端书架**：全面支持 **EPUB、PDF、TXT、MOBI、AZW3** 等多格式上传与阅读；手机端全屏沉浸式阅读器，无缝适配顶部安全区（不遮挡手机状态栏）。
- **光影相册**：支持多图上传、分类瀑布流展示与全屏灯箱放大预览。
- **影音天地**：内置 HTML5 音视频流媒体播放器，支持背景音乐与视频点播。
- **个人云盘 (R2/对象存储)**：原生连接 Cloudflare R2 存储桶，支持断点续传、文件下载，并**仅在上传/下载操作时动态弹出实时进度条与传输速率**。
- **商品展台与客服**：
  - 支持多图轮播上传与删除、多展示区管理、数量选择与价格自动计算；
  - 订单提交必须填写联系姓名、电话、邮箱与收件地址；
  - 后台分为**已支付**与**未支付**订单状态筛选；
  - 接入 PayPal、万里汇 (WorldFirst)、微信支付、支付宝四大通道接口预留（**仅管理员可见**）；
  - 内置浮动实时客服聊天窗口，管理员可在后台直接与访客站内实时对话。
- **邮件管理中枢**：
  - 支持保存第三方 API（Resend / SendGrid 等）与原生 SMTP 服务器配置；
  - 预留并显示 Cloudflare Email Routing 路由信息；
  - 完整的信件管理（收件箱、已发送、信件回收站、搜索、批量删除/批量还原）；
  - 支持管理员站内向用户邮箱回信与新注册验证码自动回复；
  - 收发限制风控开关与**超过 3,000 封信件智能容量预警**。
- **坚果云 / WebDAV 容灾备份**：
  - 外接坚果云（NutStore）或通用 WebDAV 协议；
  - 可视化浏览与管理已上传的备份快照；
  - 支持一键导出全站结构化数据包并自动上传，支持一键选择历史快照恢复，彻底防范服务器运营风险。
- **系统设置与外观**：
  - 折叠选区：网站名称自定义、**一键主题快速配色**、自定义全局调色板、自定义站长头像、全站背景图片、首页介绍区背景；
  - **一键切换手机端与电脑端**视图；
  - 已注册用户列表与账号禁用/启用管理。
- **注册与全站隐私保护策略**：
  - **全站隐私开关 (未注册访客仅看博客)**：开启后未登录游客仅能浏览博客文章，书架、相册、影音、网盘、商品等分区严格隐藏；
  - **仅限邮箱注册 (强制邮箱验证)**：新注册必须验证邮箱验证码；
  - **开放新用户注册**：关闭后阻断外部注册，仅管理员可登录。

---

## 🚀 部署指南 (Deployment Guide)

本项目提供多种简单快捷的部署方式，**以 Cloudflare Pages 一键拉取与上传部署优先**。

### 方式一：Cloudflare Pages 连接 Git 仓库一键拉取部署 (首选优先 ★★★★★)

1. **推送代码**：将本项目提交并推送到您的 GitHub 或 GitLab 仓库。
2. **创建 Pages 应用**：
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)；
   - 点击左侧菜单 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**；
   - 选择本仓库 `fox3`。
3. **设置构建配置 (Build Configurations)**：
   - **Framework preset**：`Vite`
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
   - **Node.js Version**：默认（>=18 即可）
4. **绑定 D1、R2 和 KV**：
   - 项目部署成功后，在 Pages 项目详情页点击 **Settings** -> **Functions** -> **Bindings**；
   - **D1 数据库绑定**：点击 Add binding -> 选择 D1 database -> 变量名必须填写为 `DB`，关联您在 CF 创建的 D1 数据库；
   - **R2 存储桶绑定**：点击 Add binding -> 选择 R2 bucket -> 变量名必须填写为 `R2_BUCKET`，关联您在 CF 创建的 R2 存储桶；
   - **KV 空间绑定**：点击 Add binding -> 选择 KV namespace -> 变量名必须填写为 `KV`，关联您在 CF 创建的 KV 空间。
5. 点击 **Save and Deploy**，即可享受 Cloudflare 全球 CDN 加速与极速响应！

---

### 方式二：Cloudflare Pages 一键直接上传文件部署 (免 Git 快速交付)

如果您不想配置 Git 仓库，可直接使用打包好的文件在 Cloudflare 控制台拖拽部署：

1. **获取上传部署包**：
   - 在本地终端运行构建命令：
     ```bash
     npm install
     npm run build
     ```
   - 运行完成后，根目录下会自动生成：
     - `dist/` 文件夹（包含全部静态资源与 HTML）；
     - `dist-upload.zip` 一键直接上传归档压缩包。
2. **在 Cloudflare 控制台上传**：
   - 登录 Cloudflare Dashboard -> **Workers & Pages** -> **Create application** -> **Pages**；
   - 选择 **Direct Upload (直接上传)**；
   - 输入项目名称（如 `fox3-blog`）；
   - 将 `dist` 文件夹或上传包解压后的文件夹直接拖拽入上传框内；
   - 点击 **Deploy site**，几秒钟内即可生成上线的专属 `*.pages.dev` 访问链接！

---

### 方式三：腾讯云 EdgeOne / 轻量应用服务器部署

#### 方案 A：腾讯云 EdgeOne Pages 托管
1. 打开腾讯云 EdgeOne 控制台，进入 Pages 边缘静态托管；
2. 关联 Git 仓库或直接上传 `dist/` 目录；
3. 输出目录指定为 `dist`，获得中国大陆全境高质量加速节点服务。

#### 方案 B：腾讯云轻量服务器 (Lighthouse / CVM)
1. 在服务器安装 Nginx 与 Node.js；
2. 将构建生成的 `dist/` 目录放置在 `/var/www/fox3/dist`；
3. 配置 Nginx 站点配置：
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       root /var/www/fox3/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```
4. 执行 `nginx -s reload` 即可。

---

### 方式四：阿里云 ESA / OSS 静态托管与 ECS 部署

#### 方案 A：阿里云 OSS 静态网站托管
1. 登录阿里云控制台，新建一个 OSS Bucket，权限设置为“公共读”；
2. 在 Bucket 管理中找到“数据管理” -> “静态页面”，设置默认首页为 `index.html`，404 错误页为 `index.html`；
3. 将本地 `dist/` 内所有文件上传至该 Bucket；
4. 绑定自定义域名并开启 CDN 加速。

#### 方案 B：阿里云 ECS 云服务器
- 与腾讯云轻量服务器相同，使用 Nginx 进行静态目录托管与反向代理即可。

---

## ⚙️ 环境变量与 Cloudflare 绑定变量参考

| 变量 / 绑定名 | 类型 | 说明 | 是否必填 |
| :--- | :--- | :--- | :--- |
| `DB` | Cloudflare D1 数据库绑定 | 用于存储博文、用户、评论、分类等结构化数据 | 推荐（未绑定时自动启用本地容错存储） |
| `R2_BUCKET` | Cloudflare R2 对象存储绑定 | 用于存储多媒体、电子书大文件、相片与附件 | 推荐（未绑定时自动启用本地 IndexedDB 存储） |
| `KV` | Cloudflare KV 命名空间绑定 | 用于高速缓存与跨终端数据同步 | 可选 |
| `VITE_ADMIN_USERNAME` | 环境变量 | 初始超级管理员账号（默认 `fox`） | 可选 |

---

## 🛠 本地开发与构建命令

```bash
# 安装依赖
npm install

# 启动本地开发热更新服务器 (端口 3000)
npm run dev

# 编译生产文件并自动打包生成 dist-upload.zip
npm run build

# 启动本地构建结果预览
npm run preview
```

---

## 🔐 初始管理员账号信息

- **默认管理员用户名**：`fox`
- **默认管理员密码**：`whitefox2025`
- 登录后可在前台导航栏右上角看到专属“超级管理员”标识，并在“设置”与“邮箱中枢”中进行全站管理。可在设置面板随时修改相关安全配置。

---

## 📄 授权与许可

MIT License © 2025 fox3 Team.
