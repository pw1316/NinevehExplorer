# CLAUDE.md

本文件为在本仓库（loadaily）工作时的指引。

## 项目概况

loadaily 是《失落方舟》国服的日常/周常管理桌面工具。Electron + TypeScript + React + Vite（electron-vite），
主进程服务层 + 类型化 IPC（contextBridge，contextIsolation: true）+ React 渲染层。

当前实现：账号 → 远征队 → 角色 三级增删改与展示；task（日周常）为后续阶段。

## 开发要点

- `npm start` 启动；`npm test`（vitest）必须保持全绿；`npm run typecheck` 双工程必须通过。
- 模块边界：`src/main/index.ts` 只做装配；业务纯逻辑放 `src/main/services/`；渲染层不碰 Node。
- IPC 契约以 `src/preload/index.ts` 为准，新增通道须同步 `src/main/index.ts`（经 `accountHandlers.ts`）与 `src/preload/index.d.ts`。
- 数据目录 `loadaily_Data/`：dev = 项目根，打包 = exe 同级；`accounts.json` 原子写、损坏回退空树。
  打包为 portable 时 exe 路径是临时解包目录，故 `dataDir.ts` 用 `process.env.PORTABLE_EXECUTABLE_DIR`
  定位真实 exe 目录（纯逻辑在 `dataDirRoot.ts`，有单测覆盖）。改动此处务必保留该回退，否则数据每次启动即丢。
- 校验在主进程（`accountStore.ts`）：`name` 非空；`itemLevel` 非负整数。
- `tsconfig.web.json` 显式 include 了 `src/main/services/accountStore.ts`：该文件是纯类型/纯逻辑（不依赖 Node/Electron），
  渲染层与 preload 都要引用它的 `Account` 类型，而 `composite: true` 要求工程列出所有被引用的文件。改动此处需保持该文件无 Node 依赖。

## 环境注意（本机 DSH/Codex 会话）

- 若 shell 里存在 `ELECTRON_RUN_AS_NODE=1`，直接跑 `electron ...` 或 `npm start` 会崩溃并报
  `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`：该变量会让 electron.exe 以纯 Node 模式运行，
  `require('electron')` 只返回 exe 路径字符串而非 API。这不是应用缺陷。
  `npm run export:icon` 已用 `scripts/run-electron.cjs` 在子进程里剔除该变量，不受影响；
  `npm start` 仍受其影响，启动前清除即可：`Remove-Item Env:ELECTRON_RUN_AS_NODE`。

## reference 机制（强约束）

- `reference/` 存放**第三方公开素材**，是本项目 UI 风格与图标的唯一基准：
  - `reference/p9/`：第三方公开 CSS（UI 风格基准）
  - `reference/icon/lostark-emblem.png`：《失落方舟》官网图标源文件
- **只读**：不得修改、不得直接 import / 打包进产物（产物用导出的副本）
- 实现 UI / 改图标前，先对照 `reference/p9/p9base100801.css` 取色值与形态
- 源码中**不要保留「参考自 reference/xxx」或出处类注释**：风格知识沉淀在 `reference/` 与本文档，代码只写行为

## UI 风格规范（遵循 reference/p9，改 UI 前必读）

界面风格以 `reference/p9/p9base100801.css` 为基准，**后续所有 UI/CSS 改动须遵循该风格**：

- **配色**：页面背景蓝灰 `#E5E9EF`；头部深色 `#333645`；主色/按钮 `#3890ff`；强调链接 `#3498db`；次要文字 `#6b7989`；卡片白底 + 细阴影、圆角 2px
- **语义色**（勿与主色混淆）：成功绿 `#5cb85c`、警告橙 `#f0ad4e`、错误红 `#da314b`
- **表格**：表头灰 `#B8C4CE`、行分隔 `#F3F3F3`、行 hover `#FAF8F0`
- **字体**：`"Helvetica Neue", "Luxi Sans", "DejaVu Sans", Tahoma, "Hiragino Sans GB", "Microsoft Yahei", sans-serif`
- **通用**：输入框灰底 `#F7F7F7` 无边框圆角；文案中文
- 这些色值同时以 CSS 变量定义在 `src/renderer/src/styles.css` 的 `:root`，改样式优先用变量
- 新增组件 / 改样式时对照参考文件取色值与形态；**不在源码注释中提及参考出处**

## 图标（reference/icon → out/main）

- 图标源 `reference/icon/lostark-emblem.png`（只读）；`npm run export:icon` 导出两份产物：
  - `out/main/app-icon.png`（256×256，窗口 + 打包 exe）
  - `out/main/tray-icon.png`（16×16，托盘）
- 产物与主进程 bundle 同目录，`tray.ts` 用 `join(__dirname, ...)` 读取，dev 与 asar 打包路径一致
- `npm start` / `npm test` / `npm run build` 都会先自动跑一次 `export:icon`；图标源更新后重跑即可
- 图标缺失或损坏只会退化成空图标，不会让启动失败（`trayParts.ts` 的防御性解码有单测）

## 设计决策（勿擅自变更）

- `contextIsolation + 类型化 IPC`：渲染层无 Node 能力，一切经 `window.api`。
- 关闭到托盘 + 单实例锁；托盘「退出」为真退出。
- 数据落应用自身目录，不落系统 user 目录。
- id 由主进程生成且全局唯一（`` `${Date.now()}-${随机串}` ``）。
- 删除确认一律走自定义弹窗。
- 窗口图标、托盘图标、打包 exe 图标同源（都来自 `reference/icon/` 的导出产物）。
