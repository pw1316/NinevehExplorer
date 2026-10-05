# loadaily

《失落方舟》(LostArk，国服) 日常/周常管理工具（Electron 桌面应用）。

当前阶段：账号架构 —— 「账号 → 远征队 → 角色」三级增删改与展示，数据本地持久化。

## 开发

| 命令 | 作用 |
|------|------|
| `npm start` | 启动应用（electron-vite dev） |
| `npm test` | 运行单元测试（vitest） |
| `npm run typecheck` | 类型检查（tsc 双工程） |
| `npm run build` | 打包 portable exe（需网络下载 electron-builder 依赖） |

## 数据

- 位置：dev = 项目根 `loadaily_Data/`；打包（portable）= exe 所在目录 `loadaily_Data/`
  （portable 启动器会把程序解包到临时目录，故用 `PORTABLE_EXECUTABLE_DIR` 定位真实 exe 目录，
  否则数据会在每次启动时丢失）
- 文件：`accounts.json`（`Account[]` 树，`tmp + rename` 原子写）
- 删除 `loadaily_Data/` 即可重置为初始状态

## 目录

```
src/main/            主进程：装配、IPC 分发、托盘、纯逻辑服务
src/preload/         contextBridge 契约（window.api）
src/renderer/        React 界面
docs/superpowers/    设计 spec 与实现计划
```
