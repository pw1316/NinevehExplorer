# loadaily

《失落方舟》(LostArk，国服) 日常/周常管理工具（Electron 桌面应用）。

当前阶段：账号架构 —— 「账号 → 远征队 → 角色」三级增删改与展示，数据本地持久化。

## 开发

| 命令 | 作用 |
|------|------|
| `npm start` | 启动应用（electron-vite dev） |
| `npm test` | 运行单元测试（vitest） |
| `npm run typecheck` | 类型检查（tsc 双工程） |
| `npm run export:icon` | 从 `reference/icon/` 导出窗口/托盘图标 |
| `npm run build` | 打包 portable exe（需网络下载 electron-builder 依赖） |

## 数据

- 位置：dev = 项目根 `loadaily_Data/`；打包（portable）= exe 所在目录 `loadaily_Data/`
  （portable 启动器会把程序解包到临时目录，故用 `PORTABLE_EXECUTABLE_DIR` 定位真实 exe 目录，
  否则数据会在每次启动时丢失）
- 文件：`accounts.json`（`Account[]` 树，`tmp + rename` 原子写）
- 读不出来的文件不会被覆盖：会先改名成 `accounts.json.corrupt-<时间戳>` 并弹窗告知，便于手工抢救
- 删除 `loadaily_Data/` 即可重置为初始状态

## 目录

```
src/main/            主进程：装配、IPC 分发、托盘、纯逻辑服务
src/preload/         contextBridge 契约（window.api）
src/renderer/        React 界面
scripts/             export-icon.cjs 图标导出
reference/           第三方公开素材（UI 风格基准 + 图标源，只读）
docs/superpowers/    设计 spec 与实现计划
```

## UI 风格与图标

界面风格与图标以 `reference/` 下的第三方公开素材为基准，属**只读**约束，详见根 `CLAUDE.md`
的「reference 机制」与「UI 风格规范」两节。改 UI 前请先对照 `reference/p9/p9base100801.css` 取色值。
