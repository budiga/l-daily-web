# Agent 协作规范

本文件适用于本仓库中的 agent 编码与审查任务。

## 项目背景与基本约定

- 技术栈为 React + TypeScript + Vite + Tailwind CSS，使用 pnpm 管理依赖。
- pnpm 版本以 `package.json` 的 `packageManager` 为准；使用 `pnpm install` 安装依赖，依赖变更同步更新 `pnpm-lock.yaml`，不混用 npm 或 Yarn 及其锁文件。
- 延续现有目录结构、命名和代码风格，优先复用已有组件与逻辑。
- 保持改动聚焦，不顺带重构无关代码，不覆盖或撤销他人已有改动。
- 不为简单需求引入额外依赖或过度抽象。

## React 代码生成规范

- 编写、修改或审查 React 代码前，必须阅读并遵循 [Vercel React Best Practices](.agents/skills/vercel-react-best-practices/SKILL.md)，按任务需要阅读对应规则文件。
- 按当前 React + Vite 环境应用规则；Next.js、SSR 等专属规则仅在项目实际采用对应技术时适用。
- 优先关注不必要的异步串行等待、包体积和无效渲染，避免没有收益的缓存与优化。

## 数据与交互约定

- 日记保存在浏览器 IndexedDB，不上传服务器；正文按纯文本渲染。
- 修改存储、自动保存或导入导出前，阅读 [开发文档](开发文档.md) 对应章节，保护现有数据与备份兼容性。
- 界面改动兼顾移动端、键盘操作及必要的加载、空白和错误状态。

## 验证与交付

- 代码改动完成后执行 `pnpm run lint`、`pnpm run typecheck`、`pnpm test`、`pnpm run build`；纯文档改动检查内容与链接即可。
- 修改业务逻辑时补充必要的行为测试；涉及界面交互时进行相应浏览器检查。
- 完成后简述变更、验证结果及未完成项，不将未执行的检查描述为通过。
- 行为或开发方式发生变化时同步相关文档，不提交密钥、私人日记或临时文件。

## 提交规范

- 提交信息统一为 `type(scope): 中文描述`，scope 必填，使用英文半角括号和冒号，冒号后留一个空格。
- type 使用 `feat`、`fix`、`docs`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`。
- scope 使用简短英文模块名，例如 `editor`、`storage`、`backup`、`ui`、`repo`。
- 示例：`fix(storage): 修复自动保存覆盖最新内容的问题`、`docs(repo): 添加 agent 协作规范`。
- 每次提交聚焦一件事，提交前检查 diff，仅包含本次任务相关改动。
- 用户要求提交时才执行 Git 提交；推送、合并或发布须有明确授权。
