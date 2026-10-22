# 日常 · 私人日记

React + TypeScript + Vite + Tailwind CSS 的纯前端日记本。日记只保存在当前来源下的浏览器 IndexedDB，不上传服务器。

## 本地开发

使用 `.nvmrc` 指定的 Node.js 22.14.0 和 pnpm 10.33.0。

可通过 `npm install --global pnpm@10.33.0` 安装 pnpm；版本由 `package.json` 的 `packageManager` 固定。

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

在终端显示的本地地址访问。生产构建使用 `pnpm run build`，产物在 `dist/`；`pnpm run preview` 可预览产物。

## 验证

```sh
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

测试覆盖自动保存顺序、写入失败重试、删除与保存并发、空白内容删除、备份校验、导入冲突与事务回滚。实际浏览器验收仍需检查移动端、文件下载、刷新持久化，以及公网 IP 的 HTTP 环境。

## 使用

点击「写日记」创建空草稿；输入后约 500ms 自动保存。切换日记、返回列表、导入导出前会先保存当前内容。失败时保留输入并支持重试。清空标题和正文会删除数据库中的记录，编辑区仍可继续输入。

导出备份为 JSON。导入时完整校验文件，重复项跳过；ID 冲突保留本地版本。清理浏览器数据、切换协议、主机名或端口不会自动迁移数据，请先导出备份。同一时间以单标签页编辑为主。

## 腾讯云部署

部署前请提供并核对服务器 IP、系统和 SSH 方式。本仓库不会自动初始化服务器或创建 GitHub 仓库。

以下初始化步骤由管理员在已核实的 Ubuntu LTS 服务器执行，部署账号示例为 `diary-deploy`：

1. 安装 Nginx、rsync、curl、util-linux、coreutils；确认支持 `flock`、`sha256sum`、GNU `mv` 和 Bash。
2. 创建专用部署账号及 `/var/www/simple-diary/{releases,shared/assets,incoming}`，将该根目录归部署账号所有；不授予部署账号 sudo 权限。
3. 在该账号 `~/.ssh/authorized_keys` 配置专用发布公钥，限制文件权限。
4. 根据实际发布目录调整 `deploy/nginx.conf`，安装为 Nginx 默认站点；先运行 `sudo nginx -t` 再重新加载。
5. 在安全组与系统防火墙开放 80；核对 CI 运行器访问 SSH 的网络方案，不能假设 GitHub 托管运行器出口 IP 固定。
6. 通过可信渠道核实 SSH 主机公钥；非默认 SSH 端口的 known_hosts 条目使用 `[主机]:端口` 格式。

GitHub 中创建 `production` 环境，仅允许 `main` 发布。按开发文档设置 Variables：`DEPLOY_HOST`、`DEPLOY_PORT`、`DEPLOY_USER`、`DEPLOY_PATH`、`SITE_URL`；Secrets：`DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS`。`SITE_URL` 如 `http://1.2.3.4`，不要加末尾斜线。私钥使用无口令的专用 Ed25519 发布密钥，勿提交仓库。

- CI：PR 和 main 上执行规范、类型、核心测试、构建。分支保护中将 `CI / check` 设置为必需检查。
- 发布：main 推送后检查与构建，生成 SHA 及校验和，保留 GitHub 产物，跳过已过时提交。完整上传并校验后原子切换 `current`。
- 验证：首页、版本 SHA、脚本和样式资源；失败时自动切回上一版并复查。首次发布失败会移除本次 current 链接，并提示没有历史版本。
- 回滚：在 main 手动运行 Rollback，填写保留版本的完整 40 位提交 SHA，校验后复用原产物切换。发布与回滚共享 GitHub 并发组和服务器文件锁。
- 清理：保留最近五个版本，并额外保留当前和上一版本。共享哈希资源不自动删除。

发布根目录不能含空格。初次发布前 IP 访问返回 404 是预期状态。当前版本可访问 `/version.json` 核对。相同 SHA 的发布重跑不会覆盖已存在版本；请使用回滚工作流切换已有版本。

HTTP 仅用于开发体验，正式记录私人内容前配置 HTTPS。服务器备份不包含用户浏览器中的日记，前端回滚也不会恢复本地数据。
