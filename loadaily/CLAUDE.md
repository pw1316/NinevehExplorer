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

- 若 shell 里存在 `ELECTRON_RUN_AS_NODE=1`，`npm start` 会崩溃并报
  `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`：该变量会让 electron.exe 以纯 Node 模式运行，
  `require('electron')` 只返回 exe 路径字符串而非 API。启动前清除即可：
  `Remove-Item Env:ELECTRON_RUN_AS_NODE`。这不是应用缺陷。

## UI 规范

- 配色：背景 `#E5E9EF`、头部 `#333645`、主色 `#3890ff`、次要文字 `#6b7989`；
  语义色：成功 `#5cb85c`、警告 `#f0ad4e`、错误 `#da314b`。
- 字体 `"Helvetica Neue", "Luxi Sans", "DejaVu Sans", Tahoma, "Hiragino Sans GB", "Microsoft Yahei", sans-serif`，圆角 `2px`，文案中文。
- 禁止原生 `window.confirm` / `window.prompt`，使用 `ConfirmModal` / `PromptModal`。
- 账号 tab 与远征队子 tab 的重命名/删除入口只出现在「当前选中项」上（`.tab.active .tab-act` / `.sub-tab.active .tab-act`），
  避免两级文案重名造成选择器歧义。

## 设计决策（勿擅自变更）

- `contextIsolation + 类型化 IPC`：渲染层无 Node 能力，一切经 `window.api`。
- 关闭到托盘 + 单实例锁；托盘「退出」为真退出。
- 数据落应用自身目录，不落系统 user 目录。
- id 由主进程生成且全局唯一（`` `${Date.now()}-${随机串}` ``）。
- 删除确认一律走自定义弹窗。
