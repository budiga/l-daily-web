# 我的记事本

React + TypeScript + Vite + Tailwind CSS 的纯前端 PWA 日记本。日记只保存在当前来源下的浏览器 IndexedDB，不上传服务器。正式地址为 https://enzotime.online/。

## 本地开发

使用 `.nvmrc` 指定的 Node.js 22.14.0 和 pnpm 10.33.0。

可通过 `npm install --global pnpm@10.33.0` 安装 pnpm；版本由 `package.json` 的 `packageManager` 固定。

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

在终端显示的本地地址访问。生产构建使用 `pnpm run build`，产物在 `dist/`；`pnpm run preview` 可预览产物。

PWA 仅在生产构建注册 Service Worker，开发服务器不注册，以免缓存干扰热更新。使用 `pnpm run build` 后运行 `pnpm run preview`，在 `http://localhost:4173/` 或 `http://127.0.0.1:4173/` 检查离线功能；其他地址需要可信 HTTPS。手机不能通过普通局域网 HTTP 地址验收 Service Worker。

## 验证

```sh
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

测试覆盖手动保存顺序、写入失败重试、删除与保存并发、空白内容删除、备份校验、导入冲突与事务回滚，以及 PWA 安装状态、更新授权、超时和多标签页刷新保护。实际浏览器验收需检查移动端、文件下载、刷新持久化与 HTTPS 环境。

## 使用

页面顶部的「主题」下拉选框可选择原来的暖白主题（原色）、绿色和红色，默认绿色。主题选择仅保存在当前浏览器，刷新后保留；浏览器禁止存储时仍可在当前页面切换。

点击「写日记」创建空草稿；输入后点「确定创建」保存，已创建的日记只读。切换日记或返回列表时，若有未保存内容会询问是否放弃。导入、导出不会自动保存当前草稿。保存失败时保留输入并支持重试。

导出备份为 JSON。导入时完整校验文件，重复项跳过；ID 冲突保留本地版本。清理浏览器数据、切换协议、主机名或端口不会自动迁移数据，请先导出备份。同一时间以单标签页编辑为主。

## 安装与离线使用

- 在线打开正式地址，等待「已可离线使用」提示。此后断网可重新打开、阅读和创建日记，手动保存与 JSON 导入导出仍在本地完成。首次访问时没有网络或离线资源尚未缓存完整，不能保证启动。
- Android Chrome、电脑 Chrome/Edge 可点击顶部「安装应用」，或使用浏览器地址栏/菜单安装。浏览器尚未允许原生安装提示时，该按钮会显示手动安装说明。
- iPhone/iPad 推荐使用 Safari，点击分享 →「添加到主屏幕」→「添加」。已处于独立应用窗口时隐藏安装入口。不支持安装的浏览器仍可作为普通网页使用。
- 图标沿用绿色「日」字，资源位于 `public/`，包括普通 PNG、maskable PNG 和 Apple Touch Icon。应用清单的 `id`、`start_url`、`scope` 固定为 `/`，部署于域名根路径。
- 有新版时提示「更新」「稍后」；选「稍后」后可从顶部「更新可用」重新打开。未保存内容、读取或业务操作未完成时禁止更新。只有当前页面确认更新且没有未保存内容时才刷新；其他标签页激活新版不会强制刷新当前页。
- 应用启动、重新联网和返回前台时检查更新，前台检查至多每分钟一次。注册、下载或更新失败不会阻止日记读写；可联网后重试或刷新。不要在尚有未保存内容时手动刷新。
- 离线缓存只用于程序文件，不是日记备份，也不会云同步。浏览器清理数据、设备存储不足或卸载行为可能影响本地内容，请定期导出备份。不同浏览器、系统或安装容器的存储可能隔离，安装后若列表为空，可从原浏览器导出再导入。

### 从旧 HTTP/IP 地址迁移

先在仍可访问的旧地址导出 JSON，再到 `https://enzotime.online/` 导入，确认篇数和正文后再处理旧数据。不能依靠 HTTPS 重定向自动迁移 IndexedDB。若旧地址已经强制跳转且无法导出，请先恢复旧来源的可访问性，不要清理浏览器数据。当前 HTTPS 来源中已有的日记数据库名称和版本不变。

### PWA 浏览器验收

使用生产构建，按以下顺序检查（仅使用临时测试日记）：

1. 首次联网加载，检查应用清单、图标、`/sw.js` 以及离线就绪提示；以普通窗口和独立窗口分别检查安装入口。
2. 断网重新打开首页，创建并保存日记，刷新后核对内容，执行 JSON 导出/导入；`/version.json` 应仍走网络，不得命中应用壳兜底。
3. 保持第一版页面打开，部署第二个构建并返回前台，检查更新提示、「稍后」和主动更新。若无提示，检查浏览器 Service Worker 状态和资源响应，而不是清理整个站点数据。
4. 分别在未保存、保存失败、操作进行中尝试更新；再开两个标签页，由另一页激活新版，确认当前草稿未丢失。无脏数据的页面也应由用户自行确认刷新。
5. 检查窄屏、键盘操作、软键盘和安全区域。桌面 Chromium、Android Chrome、iPhone Safari 的真实安装行为需分别实测，模拟设备不能替代真实 iPhone 安装验收。

## 腾讯云部署

部署前请提供并核对服务器 IP、系统和 SSH 方式。本仓库不会自动初始化服务器或创建 GitHub 仓库。

以下初始化步骤由管理员在已核实的 Ubuntu LTS 服务器执行，部署账号示例为 `diary-deploy`：

1. 安装 Nginx、rsync、curl、util-linux、coreutils；确认支持 `flock`、`sha256sum`、GNU `mv` 和 Bash。
2. 创建专用部署账号及 `/var/www/simple-diary/{releases,shared/assets,incoming}`，将该根目录归部署账号所有；不授予部署账号 sudo 权限。
3. 在该账号 `~/.ssh/authorized_keys` 配置专用发布公钥，限制文件权限。
4. 根据实际发布目录调整 `deploy/nginx.conf`。已有 HTTPS 配置时，只把站点目录、资源 location 和安全头合并到实际的 443 server，保留现有证书路径与 TLS 设置，不要用仓库中的 HTTP 示例覆盖证书配置；先运行 `sudo nginx -t` 再重新加载。
5. 在安全组与系统防火墙开放 443（80 可用于重定向/证书续期）；核对 CI 运行器访问 SSH 的网络方案，不能假设 GitHub 托管运行器出口 IP 固定。
6. 通过可信渠道核实 SSH 主机公钥；非默认 SSH 端口的 known_hosts 条目使用 `[主机]:端口` 格式。

GitHub 中创建 `production` 环境，仅允许 `main` 发布。设置 Variables：`DEPLOY_HOST`、`DEPLOY_PORT`、`DEPLOY_USER`、`DEPLOY_PATH`、`SITE_URL`；Secrets：`DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS`。正式 `SITE_URL` 使用 `https://enzotime.online`，不要加末尾斜线。私钥使用无口令的专用 Ed25519 发布密钥，勿提交仓库。

- CI：PR 和 main 上执行规范、类型、核心测试、构建。分支保护中将 `CI / check` 设置为必需检查。
- 发布：main 推送后检查与构建，生成 SHA 及校验和，保留 GitHub 产物，跳过已过时提交。完整上传并校验后原子切换 `current`。
- 验证：首页、版本 SHA、脚本和样式资源。PWA 版本额外校验清单、Service Worker、Workbox 文件和图标的 SHA256，防止缺失文件或错误的 HTML 兜底被当作成功；失败时自动切回上一版并复查。首次发布失败会移除本次 current 链接，并提示没有历史版本。
- 回滚：在 main 手动运行 Rollback，填写保留版本的完整 40 位提交 SHA，校验后复用原产物切换。发布与回滚共享 GitHub 并发组和服务器文件锁。
- 清理：保留最近五个版本，并额外保留当前和上一版本。共享哈希资源不自动删除。

发布根目录不能含空格。初次发布前 IP 访问返回 404 是预期状态。当前版本可访问 `/version.json` 核对。相同 SHA 的发布重跑不会覆盖已存在版本；请使用回滚工作流切换已有版本。

HTTP 仅用于开发体验，正式记录私人内容前配置 HTTPS。服务器备份不包含用户浏览器中的日记，前端回滚也不会恢复本地数据。

### PWA 缓存与回滚

`/sw.js` 必须返回 JavaScript 和 `Cache-Control: no-cache, max-age=0, must-revalidate`；`/manifest.webmanifest` 返回 `application/manifest+json` 并重新验证缓存；哈希脚本/样式继续长期缓存，Workbox 文件由当前发布目录提供。缺失资源必须返回 404。CSP 应允许同源的 worker 和 manifest；注册代码由主脚本执行，不需要放开内联脚本。上线后用 `curl -I` 和浏览器检查实际 HTTPS 响应头，若经过 CDN，也要排除对 `sw.js` 的长期缓存。

回滚到另一个 PWA 版本后，浏览器会把该版本视为一次更新；已经离线的设备只有重新联网、检测并确认更新后才会切换，服务器切回目录不会立即改变所有客户端。

回滚到首次 PWA 之前的版本，必须同时退役 `/sw.js`，否则客户端可能一直显示旧缓存。流程：

1. 提醒用户完成保存并导出备份；切换旧版本目录，同时将本仓库 `deploy/retire-sw.js` 放到服务器的稳定位置（例如 `/var/www/simple-diary/shared/retire-sw.js`）。
2. 在实际 HTTPS server 中把 `location = /sw.js` 的 `try_files` 替换为 `alias /var/www/simple-diary/shared/retire-sw.js;`，保留上述 no-cache 响应头，并设置 `default_type application/javascript;`。验证 Nginx 配置后重载，确认 `/sw.js` 返回退役脚本而非 404 或 HTML。
3. 退役脚本只删除名称以 `simple-diary-` 开头的程序缓存并注销自身，不触碰 IndexedDB/localStorage，不自动刷新已打开的页面。用户联网后检测到退役脚本，再自行刷新访问旧版。
4. 在有离线设备可能重连期间持续提供退役脚本。以后恢复 PWA 时，移除此临时 alias，恢复 `/sw.js` 从当前发布目录提供。不要用「清除站点所有数据」解决程序缓存问题。
