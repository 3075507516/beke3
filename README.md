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
  * 管理员专属板块，支持快捷添加和管理网站与图床，默认集成高速公共图床 (`https://img.001315.xyz/`)，支持海报预览与一键跳转。
* **站内邮件发信与注册验证码**：
  * 默认优先使用 Resend Email API（HTTPS）发信，也兼容 SMTP、Brevo API、SendGrid API；实际投递仍取决于服务商账户、发件域名 DNS 和收件方策略。
  * Resend `email.received` webhook 经签名验证后会取回来信正文并写入 D1；需要在 Resend 配置 Receiving 域名/MX 与 webhook，并绑定 D1。
  * 前台邮件设置（含密钥）保存在当前浏览器本机且未加密，只适合本机/手动邮件测试与显式选择前台配置的手动发信；它不会配置生产服务端。验证码及由后端触发的业务发信依赖 Pages Functions 的邮件环境变量/Secrets。后台 API 连接检查不发信，后台“发送测试邮件”才会真实投递。
* **流量与上传性能极限优化**：
  * 全局图片采用懒加载 (`loading="lazy"`) 与异步解码 (`decoding="async"`)；
  * 标签页处于后台隐藏状态时（Page Visibility API）立即暂停网络长轮询与同步，彻底杜绝无操作流量浪费。
  * 文件上传采用真正的 `XMLHttpRequest.upload.onprogress` 实时字节速率计算；当前单文件最大 90 MiB，慢速网络等待约 10 分钟，无断点续传。实际可用上限和持久性仍取决于 Pages Functions 配置及对象存储能力。
* **独立外部翻译 API 配置**：
  * 快速在线互译助手自带独立的“保存外部翻译 API 配置”按键，配置即时生效并持久化。
* **备份区 (WebDAV)**：
  * 浏览器端直接访问 WebDAV，适合小型结构化数据/文本备份；当前没有大型媒体的可靠分块续传保障，跨域、服务器限制和单次传输时限都会影响可用性。大型图片/视频可能超时、卡住或失败，不应视为可靠的大文件灾备通道。
* **深层国际化多语言支持**：
  * 提供 10 种语言的下拉切换；翻译覆盖范围依各页面字典实现而异，并非保证每一处用户内容或所有文案均已翻译。
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
4. 部署成功后，进入 **Settings** -> **Functions** -> **Bindings** 绑定资源：
     * **D1 Database 绑定**：名称填写 `DB`；用于公开站点内容主库、用户账户/密码重置、验证码及限流记录、Resend webhook 收件。跨设备博客内容必须可用 D1；KV 不作为公开站点内容的回退主库。
   * **R2 Bucket 绑定**：变量名称填写 `R2_BUCKET`，用于应用文件上传；无 R2 时可回退 D1 文件表，超大/不适用场景不保证。
   * **KV Namespace 绑定**：名称填写 `KV`，作为验证码/旧私有同步的兼容回退与临时数据层；公开站点内容严格使用 D1，不回退 KV，避免把临时存储误当权威数据。KV 有日写入额度。
   * **环境变量设置 (Environment Variables)**：
     * `ADMIN_USERNAME`：自定义管理员账号名（默认 `fox`）。
     * `ADMIN_PASSWORD`：管理员自行选择的生产登录密码，至少 6 个字符，可用数字、字母、符号或组合；未设置时管理员登录被拒绝。仅在 Cloudflare Pages 的 Variables and Secrets 中设置或修改。
     * `ADMIN_SESSION_SECRET`：必须独立设置至少 32 个字符的高熵随机 Secret，用于签发/验证最长 7 天的 API 会话；它不是登录密码，不能用 `ADMIN_PASSWORD` 替代，缺少或过短会 fail closed。
     * 邮件与收件变量：按下方“邮件配置”设置所用服务端 provider、凭据和发件地址；Resend 收件另需 D1、Resend Receiving 域及 webhook 签名 Secret。

---

### 管理员登录与云端 API 权限

Cloudflare Pages Functions 从部署环境读取至少 6 字符的 `ADMIN_PASSWORD` 和独立的至少 32 字符 `ADMIN_SESSION_SECRET`；登录签发最长 7 天的签名会话，相关 API 验证签名及有效期。前端保存令牌，并会在应用启动、网络恢复或切回前台时检查会话。缺少有效密码或会话密钥时不能完成管理员登录。生产值应在 Cloudflare Pages Variables and Secrets 配置，前端设置不能更改平台 Secret。此鉴权只保护代码中明确校验会话的管理 API，不代表博客、书架、相册、影音等所有数据都具备后端逐用户权限控制。纯静态部署没有 Pages Functions，无法提供这些 API。

---

### 2. Cloudflare Pages 直接上传部署 (Direct Upload)

适合免 Git 仓库交付**静态前端**。`npm run build` 会生成 `dist/` 与 `dist-upload.zip`，其中 ZIP 仅含静态产物。Direct Upload 不部署仓库 `functions/`，也不会创建 D1/R2/KV 绑定；注册/重置、服务端验证码与邮件、管理员云同步和远程文件 API 均不可用：
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
3. `vercel.json` 设置 `npm run build` 与 `dist` 输出，并将非静态路径回退到 `index.html`。其中 `/api/status` 规则只是路由/响应头配置，并未实现本项目 Cloudflare Pages Functions；此部署不提供本项目账户、验证码邮件、云同步或文件 API。

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
| `DB` | Cloudflare Pages D1 Binding | 已发布站点内容主库（`fox3_site_content`）、注册用户媒体目录（`fox3_user_media`）、用户/验证码与限流、Resend 收件箱、文件回退表及旧版私有同步 | 必须绑定；站点内容不使用 KV 替代 |
| `R2_BUCKET` | Cloudflare Pages R2 Binding | 文件上传对象与下载读取 | 推荐 |
| `KV` | Cloudflare Pages KV Binding | 旧版私有同步/验证码等兼容回退；不是站点内容数据库 | 可选 |
| `ADMIN_USERNAME` | Pages Environment Variable | 管理员账号名，默认 `fox` | 推荐设置 |
| `ADMIN_PASSWORD` | Pages Secret | 管理员自行设定的登录密码；至少 6 个字符，字符类型不限。未设置则管理员登录被拒绝 | 必须设置 |
| `ADMIN_SESSION_SECRET` | Pages Secret | 独立 HMAC 会话签名密钥；至少 32 个字符；不以管理员密码回退 | 必须单独设置 |
| `MAIL_PROVIDER` | Pages Environment Variable | `resend`（推荐）、`smtp`、`brevo` 或 `sendgrid` | 推荐明确设置为 `resend` |
| `RESEND_API_KEY` | Pages Secret | Resend HTTPS API 凭据；用于后端发信和取回收件正文 | Resend 主通道必填；权限需覆盖域名读取与 Receiving |
| `MAIL_SENDER` | Pages Environment Variable | 后台发件人，例如 `Fox3 <no-reply@verified-domain>`；Resend 要求使用已验证且启用发送的域名 | 必填 |
| `RESEND_WEBHOOK_SECRET` | Pages Secret | Resend `email.received` webhook 的 Signing Secret（`whsec_...`） | 启用站内收件必填 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURITY` / `SMTP_USER` / `SMTP_PASS` | Pages Variables/Secrets | 可选 SMTP 备用通道；Resend SMTP 示例：`smtp.resend.com` / `465` / `ssl` / `resend` / Resend API Key | 仅选择 SMTP 时使用；密码用 Secret |
| `BREVO_API_KEY` / `SENDGRID_API_KEY` / `MAIL_API_KEY` | Pages Secret | 备用服务商 API 凭据；`MAIL_API_KEY` 可作兼容别名 | 仅选对应 API 通道时使用 |
| `VERIFY_CODE_LENGTH` / `VERIFY_EMAIL_SUBJECT` / `VERIFY_EMAIL_TEMPLATE` | Pages Environment Variables | 后台注册验证码位数、主题和模板 | 可选 |
| `OBJECT_STORAGE_PROVIDER` | Pages Environment Variable | 可选 `cos`、`oss` 或 `s3`；未设置时根据已完整配置的凭据选择 | R2 仍是文件主存储；外部对象存储仅作后备 |
| `COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_REGION` / `COS_BUCKET` | Pages Variables/Secrets | 腾讯 COS SecretId/SecretKey、地域（如 `ap-guangzhou`）、完整桶名（如 `mybucket-1250000000`） | 选择 COS 后配置；SecretId/SecretKey 设为 Secrets |
| `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` / `OSS_REGION` / `OSS_BUCKET` | Pages Variables/Secrets | 阿里 OSS AccessKey ID/Secret、地域（如 `cn-hangzhou`）、Bucket 名称 | 选择 OSS 后配置；AccessKey 设为 Secrets |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_REGION` / `S3_BUCKET` / `S3_ENDPOINT` | Pages Variables/Secrets | 通用 AWS SigV4 S3-compatible endpoint、地域、Bucket 与密钥 | 为未单独适配的平台提供对象存储后备；需支持 path-style 请求 |

### 站点内容数据库与跨设备刷新

Cloudflare Pages 项目必须部署 `functions/api/[[route]].ts` Functions，并在生产/预览环境绑定一个 D1 数据库，binding 名称必须为 `DB`。核心公开站点内容存入 `fox3_site_content`；无管理员身份的所有设备都可通过 `GET /api/site-content` 读取最新已发布内容和使用顶部刷新按钮，管理员修改内容后自动写入 D1。访客不能写入内容。接口只公开白名单字段：文章/管理员书籍/照片/媒体/产品目录/站点链接与公开外观设置；订单、邮件、聊天、账户、管理员/邮件/支付/WebDAV 凭据不进入公开 API。管理员开启“注册用户文件管理”后，已登录注册用户可将本人书籍/照片/音视频目录通过独立的签名会话写入 `fox3_user_media`；这些媒体条目会公开展示，但 API 只允许账户所有者更新/删除自己的条目。文件本体存对象存储，D1 只保存轻量目录元数据；EPUB/TXT 正文不进入同步快照，阅读时从云文件按需读取。

新部署可在绑定 D1 后预建表（应用也会在首次请求时安全执行 `CREATE TABLE IF NOT EXISTS`）：

```bash
npx wrangler d1 execute <你的数据库名称> --remote --file=migrations/0001_site_content.sql
```

本地 D1 用 `--local`。旧版本管理员共享快照会在新表为空时被服务端读取并严格筛选白名单，只将安全公开字段返回；管理员首次会话可把筛选后的内容迁入新表，旧私有同步记录不会作为公开接口返回。内容使用 revision 乐观锁，两个管理员设备同时编辑时，较旧版本的提交会得到冲突提示，需先刷新再编辑。纯静态 Direct Upload/Vercel 不包含 Functions 和 D1，不能实现跨设备站点内容。

顶部的刷新/同步按钮对所有人开放，执行的是公开站点内容读取，不会写入，也不会触碰 WebDAV 或管理员私有数据。设备前台时每分钟、重新聚焦/联网时会检查 D1 版本；若服务端版本没有改变，不会重载内容或额外写库。数据库不可用时界面会显示错误，不会把本机内容伪报为云端成功。

### Resend 发信与收件配置

在 Resend 中创建 API Key 并验证发件域名。Cloudflare Pages 的 Functions Variables/Secrets 至少设置 `MAIL_PROVIDER=resend`、`RESEND_API_KEY` 和 `MAIL_SENDER`。这些服务端变量用于验证码和后台触发的业务邮件；前端 provider/key 只保存在本机，不能代替后端配置。建议 API Key 至少具有发信和读取 inbound 内容所需权限；连接指示状态以已部署的 `/api/mail/status` 返回的服务端配置为准，不代表 Resend Dashboard 中的域名、MX、Receiving 或 webhook 已完成实际验证。

邮箱中枢已移除独立的“检查 Resend API 连接”按钮，避免将凭据格式检查误当作真实连通。页面后台状态灯读取 `/api/mail/status` 的服务端变量配置；“发送后台测试邮件”会实际向 `MAIL_SENDER` 投递测试邮件。Resend API 正式发送端点为 `POST https://api.resend.com/emails`。

收件配置步骤：登录 `resend.com`，进入左侧菜单 **API Keys**，点击 **Create API Key**，选好权限和域名后创建，并立即复制 `RESEND_API_KEY`。接着进入 **Webhooks** 创建新 Webhook，Endpoint / URL 填你自己的 Pages Functions 地址，例如 `https://你的项目名.pages.dev/api/webhook`，监听事件选择 `email.received`。创建成功后复制 Resend 返回的 signing secret，保存为 `RESEND_WEBHOOK_SECRET`。然后在 **Domains** 添加域名；要收邮件，需在域名详情开启 **Receiving**，并按 Resend 提示在域名 DNS 中配置 MX 记录。Webhook URL 不是 Resend 提供的，而是你自己的 Pages Functions 接口；`RESEND_API_KEY` 和 `RESEND_WEBHOOK_SECRET` 创建时通常只完整显示一次，遗失后需重新生成。不要把密钥写进前端代码或公开仓库，应保存到 Cloudflare Pages 环境变量/Secrets。当前接口同时兼容 `/api/webhook` 与旧路径 `/api/mail/webhook`。收到事件后，Functions 会验证 Svix 签名和时间戳，再通过 Resend Receiving API 获取邮件正文并保存进 D1；管理员邮件中枢读取 `/api/mail/inbox` 展示来信。收件指示灯读取 `/api/mail/status` 中 inbound 所需变量是否配置；它仅表示部署端配置就绪，不验证 Resend Dashboard 的 Receiving、域名 MX 或 webhook 是否真实生效，也不代表已收到邮件。D1 自动清理 180 天前的邮件并最多保留最近 500 封；当前只保留附件元数据，不下载附件文件。

### 商户支付与部署指南（Cloudflare Pages + Functions + D1）

本项目支付必须部署在 **Cloudflare Pages + Pages Functions + D1**，并绑定 D1 为 `DB`。执行 `migrations/0002_commerce.sql`（或确认应用已按部署流程初始化该迁移）。D1 持久保存订单、站内会话、消息、通知及可编辑法律页面；网站内容数据库与 WebDAV 备份严格分离，WebDAV 不作为订单/站内数据主库。纯静态 Direct Upload/Vercel 不提供这些 Functions 和支付后端。全站及所有支付通知 URL 必须使用 HTTPS；国内服务器上线前完成 ICP 备案，微信 PC 网站支付接入要求备案域名。

**商户资质准备：**通常需准备企业/个体户营业执照、法人身份证、结算账户，并按各支付机构要求提交网站、经营类目和补充材料。商户可用资格、支持币种、结算周期及最终到账以账户审核和实测为准；本代码没有提供 FX/汇率兑换，不承诺支付账户审批或平台实际收款。

**平台开户与产品开通：**
1. **支付宝**：在支付宝开放平台/商家平台完成主体认证，创建应用并申请开通“电脑网站支付”和“手机网站支付”，按平台要求配置应用公钥、支付宝公钥及异步通知地址。
2. **微信支付**：在微信支付商户平台申请商户号并开通 PC 网站支付（Native 扫码支付；如业务需要另申请 H5 支付）。按平台流程配置商户 API 证书/私钥、API v3 密钥和回调 URL；PC 网站接入使用已备案域名。
3. **Stripe**：注册并完成 Stripe 账户启用，在 Dashboard 获取 Publishable Key 与 Secret Key。本项目结账只从服务器使用 Secret Key；Publishable Key 目前不参与结账，不要因拿到该 Key 而把 Secret Key 放进浏览器。
4. **PayPal**：创建并完成 PayPal 企业账户，建立 REST 应用并取得 Client ID 与 Secret；先用 Sandbox 凭据验证，正式环境另行切换。

**仅在 Cloudflare Pages Settings → Variables and Secrets → Secrets 配置下列密钥/凭据**，按实际部署环境设置，绝不写付款密钥到前端、`localStorage`、D1 或仓库：

- Alipay：`ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY`（PKCS#8）、`ALIPAY_PUBLIC_KEY`；可选 `ALIPAY_PID`、`ALIPAY_GATEWAY`。
- WeChat Pay：`WECHAT_MCHID`、`WECHAT_APPID`、`WECHAT_SERIAL_NO`、`WECHAT_PRIVATE_KEY`（PKCS#8）、`WECHAT_API_V3_KEY`（32 个 ASCII 字节）、`WECHAT_PLATFORM_CERT`、`WECHAT_NOTIFY_URL=https://你的域名/api/payments/webhook/wechat`。
- Stripe：`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`。
- PayPal：`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`、`PAYPAL_WEBHOOK_ID`、`PAYPAL_API_BASE`。默认 API base 是 Sandbox；正式环境使用 `https://api-m.paypal.com`。

四个异步回调 endpoint 为 `/api/payments/webhook/alipay`、`/api/payments/webhook/wechat`、`/api/payments/webhook/stripe`、`/api/payments/webhook/paypal`。在各平台把对应 HTTPS URL 配为通知地址：支付宝开启异步通知；微信配置支付回调；Stripe Dashboard Webhook 监听 `checkout.session.completed`、`checkout.session.async_payment_succeeded`、`checkout.session.async_payment_failed`、`checkout.session.expired`、`charge.refunded`、`refund.updated`；PayPal 至少订阅 `PAYMENT.CAPTURE.COMPLETED`、`PAYMENT.CAPTURE.DENIED`、`PAYMENT.CAPTURE.REFUNDED`。确认平台向部署 URL 实际投递并由服务端验签。

**Webhook 必须按以下 6 步处理：**
1. 用户付款。
2. 支付平台向 `notify_url` POST 通知，携带订单号、金额、状态和签名。
3. 后端验证签名。
4. 验签通过后再核对订单与金额，更新订单/会员并持久化，然后返回成功。
5. 验签失败则返回错误，不更新订单。
6. 重复回调按幂等方式处理，不重复发货或重复授予会员权益。

最终到账/支付成功以验签通过的服务端异步回调为准，不能依据前端跳转或用户返回页面判定。订单只能由后端数据库创建；用户取消只取消未支付订单。PayPal 回跳后由服务端执行 capture，但订单仍须等 Webhook 才标记 paid；Stripe/PayPal 均可能异步完成。正常支付按已验签回调更新；失败/过期保持未支付或失败状态；取消不覆盖已支付；重复回调幂等；管理员在订单页发货并可原路退款，退款处理中等待渠道通知更新状态。管理员可收到站内通知；接收邮箱可设置，但须配置项目已有邮件服务端 Secrets 和邮件服务，未配置时不能假定邮件已发送。若服务端支付 credentials 未配，结账应失败，不会伪造成功。

**建议上线检查：**先分别使用各平台沙箱/测试密钥完成下单、成功、失败、取消、重复通知及退款测试，检查签名验证、D1 状态、幂等和通知结果；确认回调公网可达、HTTPS 和密钥正确后，再按平台规则切换正式密钥并再次核实商户资格、币种和结算设置。本文不声称已经完成商户生产实测。

**政策页：**站点提供主页/价格（商城）/退款/隐私/服务条款/联系方式页面；站长可在网站法律与联系页编辑并保存到 D1。当前内容是政策草稿，发布前须依据实际经营主体、真实服务和适用法律审查，不构成法律意见。

### WebDAV 备份与远端文件管理

在“备份区”配置 HTTPS WebDAV 服务地址、目录、账号和应用专用密码后，应用通过本站 Cloudflare Pages Functions 的 `/api/webdav/*` 代理执行 DAV 操作：服务端认证探测、`PROPFIND` 远端列表、`PUT` 上传、`GET` 下载和 `DELETE` 删除。连接状态灯只在服务端真实认证请求成功后转绿；远端文件列表直接从 WebDAV 读取，因此同一目录也可在 WebDAV 服务商界面查看。服务端代理要求有效管理员会话，静态 Direct Upload/Vercel 部署不提供该 Functions API。

当前本站生成的是带版本号的 fox3 JSON 数据快照；它能恢复应用记录/设置，但并不把照片、视频、书籍附件等二进制本体打包进 JSON。远端已有任意扩展名文件会按原文件名/格式列出，管理员也可手动上传不超过 25 MiB 的本地原格式文件，并从本站下载或删除；本站的“恢复”仅适用于本站格式的 JSON 快照，其他文件需下载后在对应功能中重新导入。目前代理单文件上限 25 MiB、无断点续传，浏览器到 Pages Functions/远端的网络时限也可能导致传输失败；先选择文章、文字与设置文件，图片/视频或大电子书容易卡住或超时，不应将其当作可靠的大型媒体灾备方案。WebDAV 凭据只保存在当前浏览器本机，不写入共享同步载荷；远端文件列表每次从 WebDAV 目录直接读取；备份文件与 WebDAV 元数据完全不进入站点内容数据库。换设备需再次配置凭据并重新读取 WebDAV 目录。

### 注册账户与密码重置

邮箱注册会先由 Pages Functions 发送并校验验证码，然后将用户资料与 PBKDF2 密码哈希写入 D1 的 `fox3_users`。必须为 Pages Functions 绑定名为 `DB` 的 D1 数据库；缺少 D1 或写入失败时，API 返回错误，前端不会创建仅在本机存在的假账号。建议注册时验证并绑定可长期访问的真实邮箱；忘记密码时可通过“邮箱验证码重置”流程接收 10 分钟有效验证码。未绑定有效邮箱的普通用户名账号不能自助找回。重置验证码保存在独立 `fox3_password_resets` 表中，并执行 IP/邮箱限流和尝试次数限制。

### 数据实际存储映射

- **浏览器内存/`localStorage`**：公开核心内容可从既有 localStorage 读取为启动缓存，并在数据库成功拉取后被 D1 最新版本覆盖；本地回写也仅作为可丢弃缓存，不是跨设备内容的权威来源。设备偏好与邮件/支付/WebDAV 配置仍留在本机浏览器；前台密钥未加密，不要在公用设备保存。
- **浏览器 IndexedDB**：浏览器本地文件/Blob 缓存与部分上传文件回退数据。清除浏览器站点数据会影响这些本机数据。
- **Cloudflare D1 (`DB`)**：`fox3_site_content` 是公开站点内容的规范主库，含 revision；`fox3_user_media` 保存注册用户媒体目录，按账户隔离并含 revision，公共页面只合并目录记录；`fox3_users` 保存注册账户和 PBKDF2 密码哈希；`fox3_email_verifications`、`fox3_password_resets`、`fox3_email_ip_rates` 用于注册/找回验证码及限流；`fox3_inbound_emails` 保存经过 Resend webhook 验签并拉取的来信正文和附件元数据；`fox3_sync` 仅是旧版管理员私有同步兼容表，不是网站公开内容主库；`fox3_files` 是无 R2 时的文件回退表。邮件凭据/WebDAV 凭据不在公开站点载荷中。
- **Cloudflare R2 (`R2_BUCKET`)**：上传文件对象的首选存储，下载同样优先从 R2 读取；单文件上传上限为 90 MiB，并拒绝常见可执行/活动内容扩展名；浏览器慢速网络等待最长约 10 分钟，当前不支持断点续传。只有成功写入 R2/COS/OSS/S3 对象存储的文件才能可靠跨设备读取；网络或云存储失败时若回退到 IndexedDB，会明确提示并仅在当前设备可用。R2 不可用时可按 `OBJECT_STORAGE_PROVIDER` 选择服务端 Tencent COS、Alibaba OSS 或通用 AWS SigV4 S3-compatible 对象存储后备。COS/OSS/S3 密钥只配置在 Pages Functions Secrets，绝不写入浏览器；COS Bucket 要填写带 APPID 的完整桶名（`bucketname-APPID`），COS region 形如 `ap-guangzhou`；OSS region 形如 `cn-hangzhou`。通用 S3 需提供 HTTPS endpoint、地域、桶名及密钥，并使用适配器支持的 path-style 请求。外部对象存储仍由当前 Cloudflare Pages Functions 代为签名读写，不会自动迁移 D1 用户/博客数据，也不代表前端静态部署已带有后端 API。对象存储失败时，文件不超过 1 MiB 才可回退 D1 文件表；KV 回退上限为 18 MiB；最后的 Worker 内存回退仅适用于 4 MiB 以内文件。内存回退会在实例重启/切换后丢失，无法视为持久存储；D1/KV 回退也不是等价的大文件对象存储。超过可用后备容量时 API 返回 JSON 503，不会报告虚假成功。
- **Cloudflare KV (`KV`)**：仅作旧版管理员私有同步/验证码兼容回退及短期记录；公开站点内容不写 KV。成功发送邮件回执由 API 返回并保存在前端状态，不额外写 KV。
- **邮箱配置归属与收信范围**：前台邮件配置只保存在设置它的浏览器（本机存储且未加密）；前台配置只能用于管理员显式选择前台来源的手动邮件/本机测试，不会令验证码或后端自动触发的业务邮件生效。验证码与后端业务发信使用 Pages Functions 环境变量/Secrets。手动邮件也可选择后台环境变量。前台测试会真实发送测试邮件至配置的发件地址；后台连接检查只探测服务状态，不发信。Resend `email.received` webhook 验签并通过 Resend API 拉取正文后才写入 D1 收件箱；它不是通用个人邮箱 IMAP 收件，也不会把发往管理员个人邮箱的邮件或 Email Routing/普通转发自动导入本站。来信必须进入已配置 Resend Receiving 的域名并触发有效 webhook；转发到管理员个人邮箱仅是外部邮箱投递，不等于本站收件。
- **跨设备站点内容与权限边界**：需要 Cloudflare Pages Functions 和 D1 binding `DB`。任何访客/设备可读和刷新白名单内已发布内容；管理员更改自动保存到 D1，并使用 revision 冲突保护。普通访客不能写入 D1。顶部按钮是手动重新读取，不执行管理员私有数据同步，也不操作 WebDAV。`BroadcastChannel` 仅用于同浏览器跨标签页。纯静态部署没有 Functions/D1，无法读取跨设备内容。注册用户媒体同步需真实 D1 用户登录签发的 7 天 HMAC 会话，且管理员已开启 `allowUserMediaManagement`；服务器对媒体目录写入按 token 中的用户 ID 强制归属，普通访客/无会话本地账号不能写 D1。文件对象经 `/api/upload` 保存到 R2 或已配置的对象存储；若云上传失败而回退 IndexedDB，该文件仅在当前浏览器可用，不会伪报跨设备持久化。用户媒体目录在页面公开展示，但只有其所有者可通过应用界面管理/删除。

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
