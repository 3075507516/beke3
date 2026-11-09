# fox3 博客项目 (Cloudflare D1 + R2 原生多功能全栈博客系统)

> 项目灵感与功能参考：https://beke.luobikang.kdns.fr/
> 遵循高颜值设计、极速响应、全站无感降级容灾与全平台自动化部署理念。

---

## 🌟 核心特性与架构设计

fox3 是一款专为 Cloudflare 生态量身定制的原生全栈博客系统，同时提供多云平台（腾讯云 EdgeOne / 轻量服务器、阿里云 ESA / OSS / ECS）的高兼容运行能力。

### 核心架构与存储分层
* **Cloudflare D1 (主关系型数据库)**：负责存储文章、评论、分类、标签、订单记录与文件元数据等核心结构化数据。
* **Cloudflare R2 (对象存储桶)**：负责存储高分辨率图片、音频流、视频流、多格式电子书（EPUB/PDF/TXT/MOBI/AZW3）与灾备备份包等大文件实体。
* **Cloudflare KV (毫秒级键值缓存)**：负责缓存配置、多端设备实时同步房间与速率限制计数器。
* **智能平滑降级机制**：在未绑定 D1 或 R2 的离线或单机环境中，系统无缝自动降级至浏览器本地安全的 IndexedDB / LocalStorage 持久化存储，确保全功能 100% 正常可用且不报崩溃错误。

---

## 🎨 外观与主题系统

1. **两套全局外观风格**：
   * **现代毛玻璃 (Modern Glass)**：半透明卡片、流体色彩渐变、全景大背景透光。
   * **经典怀旧控制台 (Retro Classic)**：基于经典 cPanel 拟物化风格设计，纸质微黄底色、立体凸起 3D 按键、拟物化立体图标网格、顶部红底警示条以及全站返回顶部悬浮按钮。可在页眉处一键实时切换。
2. **多语言支持 (i18n)**：
   * 原生内置 `zh-CN` (简体中文)、`zh-TW` (繁体中文)、`en-US` (English)。
   * 全站导航、操作按钮、提示语、登录注册弹窗均实现完整多语言本地化。
3. **独立自适应与手机端视图切换**：
   * 支持独立切换手机端高仿真预览模式与桌面宽屏自适应模式，互不干扰。
4. **全屏沉浸阅读器**：
   * 电子书专区支持手机全屏自适应，避开手机状态栏安全区，支持字体大小调节与目录快速跳转。

---

## 🛡️ 隐私保护与权限控制

* **管理员专属权限 (Admin Only)**：
  * **邮箱中枢 (Mail Hub)**：仅管理员可见。支持 Cloudflare Email Routing、Resend API 邮件收发、3000 封预警提醒与回收站。
  * **系统设置 (Settings)**：仅管理员可见。自定义全站名称、调色板、背景照片、注册用户状态管理与唯一最高管理员密码保护。
  * **坚果云 WebDAV 容灾管理**：仅管理员可见。支持文件备份与一键恢复。
* **全站隐私保护开关**：
  * **开启未登录访客仅看博客**：开启后，未登录访客仅可阅读博客文章，网盘、书架、影音、相册、商品等功能分区将被严格隐藏。
  * **仅限邮箱注册**：强制有效邮箱身份验证，杜绝恶意注册。
  * **开放新用户注册**：可一键关闭注册通道，仅允许管理员登录。

---

## 🚀 全平台部署指南

### 1. Cloudflare Pages Git 一键拉取部署（首选优先）

1. **推送到 GitHub / GitLab**：
   将本项目代码推送至您的远程 Git 仓库。
2. **连接 Cloudflare Pages**：
   * 打开 [Cloudflare 控制台](https://dash.cloudflare.com/) -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
   * 选择刚推送的 `fox3` 代码仓库。
3. **构建配置 (Build Settings)**：
   * **Framework preset**: `Vite`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
4. **绑定 D1、R2 与 KV 变量**：
   在 Pages 项目后台 -> **Settings** -> **Functions** -> **Bindings (绑定)**：
   * **D1 Database**: 变量名填 `DB`，绑定创建的 D1 数据库。
   * **R2 Bucket**: 变量名填 `R2_BUCKET`，绑定创建的 R2 存储桶。
   * **KV Namespace**: 变量名填 `KV`，绑定创建的 KV 命名空间。
5. **部署成功**：
   点击 **Save and Deploy**，几秒后即可通过 `*.pages.dev` 访问全新博客！

---

### 2. Cloudflare Pages 一键上传文件部署（免 Git 快速交付）

如果您希望直接上传预编译包，无需绑定 GitHub 账号：

1. **获取上传部署包**：
   在终端执行：
   ```bash
   npm run build
   ```
   构建完成后，根目录下会自动生成预编译好的 `dist-upload.zip` 压缩包及 `dist/` 文件夹。
2. **上传部署**：
   * 登录 Cloudflare 控制台 -> **Workers & Pages** -> **Create application** -> **Pages** -> **Direct Upload (直接上传)**。
   * 填写项目名称（如 `fox3`），将生成的 `dist` 文件夹或上传包直接拖入浏览器窗口。
   * 点击 **Deploy site** 即刻全球分发上线！

---

### 3. 腾讯云 EdgeOne / 轻量服务器 (Lighthouse) 部署

* **方案 A：EdgeOne Pages 静态托管**
  在腾讯云 EdgeOne 控制台进入 Pages 服务，关联代码仓库，构建输出目录指定为 `dist` 即可享受国内高带宽低延迟分发。
* **方案 B：轻量服务器 Nginx 反向代理配置**
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
* **腾讯云 COS 对象存储环境变量**：
  ```env
  TENCENT_COS_SECRET_ID=AKIDxxxxxxxxxxxxxxxx
  TENCENT_COS_SECRET_KEY=xxxxxxxxxxxxxxxxxxxx
  TENCENT_COS_BUCKET=fox3-1250000000
  TENCENT_COS_REGION=ap-guangzhou
  ```

---

### 4. 阿里云 ESA / OSS 静态托管 / ECS 部署

* **方案 A：阿里云 OSS 静态网站托管**
  1. 创建阿里云 OSS Bucket，权限设置为“公共读”。
  2. 在基础设置中启用“静态页面托管”，默认首页设为 `index.html`，404 错误页设为 `index.html`。
  3. 将本地 `dist/` 下的所有文件上传至 OSS Bucket 根目录。
  4. 绑定自定义域名并开启阿里云免费 CDN 加速。
* **阿里云 OSS 环境变量**：
  ```env
  ALIYUN_OSS_ACCESS_KEY_ID=LTAIxxxxxxxxxxxxxx
  ALIYUN_OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
  ALIYUN_OSS_BUCKET=fox3-bucket
  ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
  ```

---

## 📦 本地开发与调试

```bash
# 1. 克隆代码仓库
git clone <your-repo-url>
cd fox3

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 执行生产环境打包 (同时生成 dist/ 与 dist-upload.zip)
npm run build
```

---

## 🔒 默认管理员凭据

* **默认用户名**：`fox`
* **默认密码**：`admin123`
* *(首次登录后请在【系统设置】->【站内密码修改】中立即更改管理员安全密码)*
