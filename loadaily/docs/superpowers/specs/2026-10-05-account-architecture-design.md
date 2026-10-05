# loadaily 账号架构设计（第一阶段）

- 日期：2026-10-05
- 状态：待评审
- 范围：账号 → 远征队 → 角色 的增删改与展示（不含 task）

## 1. 背景与目标

loadaily 是一个基于 Electron 的《失落方舟》(LostArk，国服) 日常/周常管理工具：查看并管理每个角色的日常、周常完成情况。

本阶段只做**账号架构**，把项目骨架和「账号 → 远征队 → 角色」这条主链的增删改 + 展示跑通，为后续的 task 体系打好地基。task（日周常）的定义与完成状态留到后续阶段，另开独立 tab。

## 2. 范围

### 本阶段做

- 项目骨架（Electron + TypeScript + React + Vite，沿用参考模板的架构模式）。
- 账号（Account）、远征队（Roster）、角色（Character）三级的增删改。
- 对应 UI：账号为主 tab，远征队为子 tab，角色卡横向排列，角色卡展示并可编辑 `name`、`itemLevel`。
- 数据本地持久化（JSON，原子写）。
- 名字/装备等级的输入校验；删除前的自定义确认弹窗。
- 单元测试与类型检查。

### 本阶段明确不做

- task 的定义、编辑、完成状态；每日/每周重置；历史记录；休息值。
- 角色排序 / 拖拽。
- 网络同步、官方 API 接入。
- 多语言 / 主题切换。

## 3. 技术基座与分层

沿用本项目既定的三层架构（主进程服务层 → 类型化 IPC → React 渲染层）：

| 层 | 位置 | 职责 | 约束 |
|----|------|------|------|
| 主进程服务层 | `src/main/services/` | 纯数据逻辑 + 持久化 | 不依赖 Electron/UI，可单测 |
| IPC | `src/main/ipc.ts` + `src/preload/` | 通道分发、`contextBridge` 暴露 `window.api` | 契约三处同步 |
| 渲染层 | `src/renderer/` | 只做 UI | 无 Node 能力，一切经 `window.api` |

关键决策（沿用模板，不擅自变更）：

- `contextIsolation: true`、`nodeIntegration: false`；渲染层不触碰 Node/文件系统。
- IPC 契约三处同步：`src/preload/index.ts` 方法、`src/preload/index.d.ts` 类型、`src/main/index.ts` handler 注册。
- 数据目录 `loadaily_Data/`：dev 模式 = 项目根，打包模式 = exe 同级（`path.dirname(app.getPath('exe'))`）。
- 设置/数据落应用自身目录，不落系统 user 目录。
- 单实例锁、关闭到托盘、自绘图标（窗口/托盘同源）沿用模板。
- 删除确认使用自定义 `ConfirmModal`，不用原生 `window.confirm`（原生对话框会破坏 Electron 窗口焦点）。
- 只沿用模板的骨架，**移除模板自带的示例业务**（示例 Tab、待办 Todo、SettingsStore 键值设置）；本阶段没有任何设置项。
- 应用标题 / `productName` 为 `loadaily`。

## 4. 数据模型

```ts
interface Character {
  id: string
  name: string          // 用户可编辑
  itemLevel: number     // uint，即非负整数
}

interface Roster {
  id: string
  name: string
  characters: Character[]
}

interface Account {
  id: string
  name: string
  rosters: Roster[]
}
```

- `id` 全局唯一，由主进程生成，格式沿用模板：`` `${Date.now()}-${随机串}` ``。全局唯一使得所有增删改只需传一个 `id`，无需附带父路径。
- 三个实体本阶段均只有 `name` 一个自身标量属性（角色额外有 `itemLevel`）。
- **不预留 task 字段**。后续 task 定义与完成状态作为独立结构，按 `characterId`（+ `taskId`）关联，避免在角色里塞空壳。
- 整个账号树是本阶段唯一的业务数据形态，序列化为一个数组 `Account[]`。

## 5. 模块与文件

```
loadaily/
  package.json / electron.vite.config.ts / tsconfig*.json / vitest.config.ts / electron-builder.yml
  src/main/
    index.ts            # 装配：窗口/单实例锁/托盘/IPC 注册/数据装载
    ipc.ts              # IPC handler 分发骨架
    dataDir.ts          # loadaily_Data 目录解析
    tray.ts             # 托盘与自绘图标（沿用模板）
    services/
      accountStore.ts   # 纯函数树操作 + 校验
      accountsFile.ts   # accounts.json 读写（原子写、损坏回退）
      accountHandlers.ts # 组装 10 个 IPC 通道（持有内存树 + 落盘）
    __tests__/
      accountStore.test.ts
      accountsFile.test.ts
      ipc.test.ts
  src/preload/
    index.ts            # contextBridge 暴露 window.api
    index.d.ts          # WindowApi 类型（契约）
  src/renderer/
    index.html
    src/main.tsx
    src/App.tsx                    # 顶层 tab（账号）+ 状态装配
    src/styles.css
    src/components/
      AccountView.tsx   # 账号内：远征队子 tab + 角色区
      InlineEdit.tsx    # 点击编辑、失焦/点外部提交
      CharacterCard.tsx # 角色卡：name + itemLevel
      ConfirmModal.tsx  # 自定义删除确认
      PromptModal.tsx   # 新增/重命名时输入名字
  docs/superpowers/specs/2026-10-05-account-architecture-design.md
```

`accountStore.ts` 对外只暴露纯函数（输入旧树、返回新树），签名示例：

```ts
addAccount(tree, name): Account[]
renameAccount(tree, id, name): Account[]
removeAccount(tree, id): Account[]
addRoster(tree, accountId, name): Account[]
renameRoster(tree, id, name): Account[]
removeRoster(tree, id): Account[]
addCharacter(tree, rosterId, name, itemLevel): Account[]
updateCharacter(tree, id, patch: { name?: string; itemLevel?: number }): Account[]
removeCharacter(tree, id): Account[]
```

层级查找由 `id` 全局唯一保证：`accountStore` 内部统一「遍历定位」，找到叶子做替换、逐层返回新对象，未命中的分支保持原引用。

## 6. IPC 契约

所有通道返回值统一为**更新后的完整账号树** `Account[]`；渲染层收到后整体替换本地状态（数据量小，最简且无同步漏项）。

通道由 `src/main/services/accountHandlers.ts` 的 `createAccountHandlers(file)` 组装（内存中持有当前树，写盘用 `accountsFile`），`index.ts` 只负责把它接到 `ipcMain`。

| 通道 | 入参 | 返回 |
|------|------|------|
| `account:list` | — | `Account[]` |
| `account:add` | `name: string` | `Account[]` |
| `account:rename` | `id: string, name: string` | `Account[]` |
| `account:remove` | `id: string` | `Account[]` |
| `roster:add` | `accountId: string, name: string` | `Account[]` |
| `roster:rename` | `id: string, name: string` | `Account[]` |
| `roster:remove` | `id: string` | `Account[]` |
| `character:add` | `rosterId: string, name: string, itemLevel: number` | `Account[]` |
| `character:update` | `id: string, patch: { name?: string; itemLevel?: number }` | `Account[]` |
| `character:remove` | `id: string` | `Account[]` |

`window.api` 形态（`preload/index.d.ts`）：

```ts
interface WindowApi {
  accounts: {
    list(): Promise<Account[]>
    addAccount(name: string): Promise<Account[]>
    renameAccount(id: string, name: string): Promise<Account[]>
    removeAccount(id: string): Promise<Account[]>
    addRoster(accountId: string, name: string): Promise<Account[]>
    renameRoster(id: string, name: string): Promise<Account[]>
    removeRoster(id: string): Promise<Account[]>
    addCharacter(rosterId: string, name: string, itemLevel: number): Promise<Account[]>
    updateCharacter(id: string, patch: { name?: string; itemLevel?: number }): Promise<Account[]>
    removeCharacter(id: string): Promise<Account[]>
  }
}
```

## 7. UI 结构

```
┌ app-header: loadaily ─────────────────────────────────────────┐
├ tab-bar:  [账号A] [账号B] ... [＋]                              │   ← 每个账号一个顶层 tab
├ sub-tab-bar: [远征队1] [远征队2] ... [＋]                       │   ← 选中账号内的远征队
├ character-row: ┌───────┐ ┌───────┐ ┌───────┐                  │   ← 角色卡横向排列
│                │ 角色名 │ │ 角色名 │ │ 角色名 │                  │     放不下横向滚动
│                │ 装等   │ │ 装等   │ │ 装等   │                  │
│                └───────┘ └───────┘ └───────┘                  │
└───────────────────────────────────────────────────────────────┘
```

- 顶层 tab 栏：每个账号一个 tab，末尾 `＋` 新增账号；当前账号 tab 上有重命名/删除入口。
- 账号内：远征队子 tab，末尾 `＋` 新增；当前子 tab 上有重命名/删除入口。
- 新增（账号/远征队/角色）先弹 `PromptModal` 填名字（必填，trim 后为空则不允许提交）；角色新增时同时填装备等级（默认 0）。
- 角色区：角色卡横向 flex 排列（`flex-wrap: nowrap` + 横向滚动）。每张卡提供重命名、编辑装等、删除入口。
- 角色名字：点击变输入框，失焦或点击其它区域提交；`Enter` 提交、`Esc` 取消。
- 装备等级：数字输入，提交时校验 uint。
- 删除账号/远征队/角色：`ConfirmModal` 二次确认。
- 未选中/无数据时给出空态提示（如「还没有账号，点 ＋ 新建」）。
- 选中项用 id 记录；删除后若选中项消失，自动回退到相邻项或空态。

## 8. 持久化与错误处理

- 文件：`<dataDir>/accounts.json`，内容为 `Account[]`。
- 读：文件不存在 → 空树 `[]`；JSON 解析失败或结构非数组 → 警告并回退 `[]`，不崩溃。
- 写：`tmp + rename` 原子写；写入前 `mkdirSync(recursive)`。
- 校验放在主进程（唯一真源）：
  - `name`：`trim()` 后为空 → 抛错拒绝；
  - `itemLevel`：非整数或 `< 0` → 抛错拒绝。
- IPC 抛错经 `invoke` 以 rejected Promise 传回渲染层，UI 在状态条显示错误、不静默吞。

## 9. 测试

使用 vitest（沿用模板配置）：

1. `accountStore` 纯函数：三级增删改；改一个分支不影响兄弟分支；按 id 定位；非法 `name`/`itemLevel` 被拒。
2. `accountsFile`：文件缺失 → `[]`；损坏内容 → `[]` 且有警告；保存后能读回。
3. `ipc` 分发：未知通道抛错；已知通道正确委派。
4. `npm run typecheck`（tsc 双工程 node + web）保持通过。

## 10. 后续阶段（本次不设计，仅登记）

- task tab：定义日周常模块（增删改定义）。
- 角色卡扩展为「展示 + 编辑完成状态」，按 `characterId + taskId` 关联。
- 每日/每周重置、历史记录、休息值。
- 角色排序/拖拽、批量操作、导入导出。

