# loadaily 账号架构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭起 loadaily 的 Electron 骨架，并实现「账号 → 远征队 → 角色」三级的增删改、持久化与 UI 展示。

**Architecture:** 沿用参考项目（`E:\Repository\pw1316\memmonitor`）的三层架构：主进程服务层（纯函数 store + 原子写文件）→ 类型化 IPC（`ipc.ts` 分发 + `preload` contextBridge）→ React 渲染层（只做 UI）。业务数据是一棵 `Account[]` 树，所有改动走纯函数算出新树，再原子写盘，IPC 统一返回整棵树。

**Tech Stack:** Electron 31 + electron-vite 2 + TypeScript 5 + React 18 + Vite 5 + Vitest 2 + electron-builder 26。

**Spec:** `docs/superpowers/specs/2026-10-05-account-architecture-design.md`

## Global Constraints

- 所有路径相对 `loadaily/`（`E:\Repository\pw1316\NinevehExplorer\loadaily`）。命令都在 `loadaily/` 目录下执行。
- Windows 桌面单机应用；数据落应用自身目录 `loadaily_Data/`（dev = 项目根，打包 = exe 同级），不落系统 user 目录。
- `contextIsolation: true`、`nodeIntegration: false`；渲染层不碰 Node/文件系统，一切经 `window.api`。
- IPC 契约三处同步：`src/preload/index.ts`、`src/preload/index.d.ts`、`src/main/index.ts`。新增通道三处都要改。
- 持久化必须 `tmp + rename` 原子写；读失败/结构不对 → 警告并回退空树 `[]`，不崩溃。
- 校验在主进程（唯一真源）：`name` trim 后不得为空；`itemLevel` 必须是非负整数。校验失败抛 `Error`，经 IPC 以 rejected Promise 传回渲染层。
- 禁止原生 `window.confirm` / `window.prompt`，用自定义弹窗组件。
- UI 文案中文；配色沿用参考模板 token：背景 `#E5E9EF`、头部 `#333645`、主色 `#3890ff`、次要文字 `#6b7989`、成功 `#5cb85c`、警告 `#f0ad4e`、错误 `#da314b`、输入框底 `#F7F7F7`、圆角 `2px`。
- 字体：`"Helvetica Neue", "Luxi Sans", "DejaVu Sans", Tahoma, "Hiragino Sans GB", "Microsoft Yahei", sans-serif`。
- 源码里不要写「参考自 xxx」这类出处注释。
- 提交：本环境 `.git` 只读，`git add/commit` 需用户批准后才能执行；若无法提交，跳过提交步骤并继续，最后统一提示用户。

## File Structure

| 文件 | 职责 |
|------|------|
| `package.json` / `electron.vite.config.ts` / `tsconfig*.json` / `vitest.config.ts` / `electron-builder.yml` | 构建、类型检查、测试、打包配置 |
| `src/main/ipc.ts` | 通用 IPC handler 分发器（与业务无关） |
| `src/main/dataDir.ts` | 解析 `loadaily_Data` 目录 |
| `src/main/tray.ts` | 托盘、自绘图标、关闭拦截判断 |
| `src/main/index.ts` | 装配：窗口、单实例锁、托盘、数据装载、10 个 IPC 通道注册 |
| `src/main/services/accountStore.ts` | 纯函数：`Account[]` 树的增删改 + 校验（不依赖 Electron/Node IO） |
| `src/main/services/accountsFile.ts` | `accounts.json` 读写（原子写、损坏回退） |
| `src/main/__tests__/*.test.ts` | ipc 分发 / store / 文件读写测试 |
| `src/preload/index.ts` | contextBridge 暴露 `window.api` |
| `src/preload/index.d.ts` | `WindowApi` 类型（IPC 契约） |
| `src/renderer/index.html` / `src/renderer/src/main.tsx` / `src/renderer/src/styles.css` | 渲染层入口与样式 |
| `src/renderer/src/App.tsx` | 顶层 tab（账号）、状态装载、错误条 |
| `src/renderer/src/components/AccountView.tsx` | 账号内：远征队子 tab + 角色区 |
| `src/renderer/src/components/InlineEdit.tsx` | 点击编辑、失焦/点外部提交 |
| `src/renderer/src/components/CharacterCard.tsx` | 角色卡：name + itemLevel |
| `src/renderer/src/components/ConfirmModal.tsx` | 删除二次确认 |
| `src/renderer/src/components/PromptModal.tsx` | 新增/重命名输入名字 |

---

## Task 1: 项目骨架与构建链

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `vitest.config.ts`, `electron-builder.yml`, `.gitignore`
- Create: `src/main/ipc.ts`, `src/main/dataDir.ts`, `src/main/tray.ts`, `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`, `src/renderer/src/main.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`
- Test: `src/main/__tests__/ipc.test.ts`

**Interfaces:**
- Consumes: 无（起点）
- Produces: `createIpcDispatcher(handlers: Record<string, IpcHandler>)` → `{ invoke(channel, ...args): Promise<unknown> }`；`getDataDir(): string`；`makeTrayIcon(size?: number)`、`shouldPreventClose(isQuitting: boolean)`、`setupTray(getWindow)`。

- [ ] **Step 1: 写构建/类型/测试配置**

`package.json`：

```json
{
  "name": "loadaily",
  "productName": "loadaily",
  "version": "0.1.0",
  "private": true,
  "description": "LostArk 国服 日常/周常管理工具",
  "main": "out/main/index.js",
  "scripts": {
    "start": "electron-vite dev",
    "build": "electron-vite build && electron-builder",
    "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^31.7.0",
    "electron-builder": "^26.15.3",
    "electron-vite": "^2.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

`electron.vite.config.ts`：

```ts
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: { plugins: [react()] }
})
```

`tsconfig.json`：

```json
{ "files": [], "references": [{ "path": "./tsconfig.node.json" }, { "path": "./tsconfig.web.json" }] }
```

`tsconfig.node.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "skipLibCheck": true, "esModuleInterop": true,
    "composite": true, "types": ["node"], "outDir": "out"
  },
  "include": ["electron.vite.config.ts", "src/main/**/*", "src/preload/**/*"]
}
```

`tsconfig.web.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "skipLibCheck": true, "jsx": "react-jsx",
    "composite": true, "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/renderer/**/*", "src/preload/index.d.ts"]
}
```

`vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/__tests__/**/*.test.ts'] }
})
```

`electron-builder.yml`：

```yaml
appId: com.pw1316.loadaily
productName: loadaily
win:
  target: portable
  icon: build/icon.png
```

`.gitignore`（在已有内容后补齐）：

```
node_modules/
out/
dist/
build/
loadaily_Data/
*.tsbuildinfo
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: 安装成功，生成 `node_modules/` 与 `package-lock.json`。（无网络时需申请提权联网安装。）

- [ ] **Step 3: 写失败测试（IPC 分发器）**

`src/main/__tests__/ipc.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { createIpcDispatcher } from '../ipc'

describe('createIpcDispatcher', () => {
  it('委派已知通道并透传参数', async () => {
    const handler = vi.fn((a: number, b: number) => a + b)
    const d = createIpcDispatcher({ 'math:add': handler })
    await expect(d.invoke('math:add', 2, 3)).resolves.toBe(5)
    expect(handler).toHaveBeenCalledWith(2, 3)
  })

  it('未知通道抛错', async () => {
    const d = createIpcDispatcher({})
    await expect(d.invoke('nope')).rejects.toThrow('未知 IPC channel: nope')
  })
})
```

- [ ] **Step 4: 运行测试确认失败**

Run: `npm test`
Expected: FAIL —— 找不到模块 `../ipc`。

- [ ] **Step 5: 实现 IPC 分发器**

`src/main/ipc.ts`：

```ts
export type IpcHandler = (...args: any[]) => unknown | Promise<unknown>

export function createIpcDispatcher(handlers: Record<string, IpcHandler>) {
  return {
    async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
      const h = handlers[channel]
      if (!h) throw new Error(`未知 IPC channel: ${channel}`)
      return h(...args)
    }
  }
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test`
Expected: PASS（2 个用例）。

- [ ] **Step 7: 写最小可运行的主进程 / preload / 渲染层**

`src/main/dataDir.ts`：

```ts
import { app } from 'electron'
import { join, dirname } from 'path'

export function getDataDir(): string {
  const root = app.isPackaged ? dirname(app.getPath('exe')) : app.getAppPath()
  return join(root, 'loadaily_Data')
}
```

`src/main/tray.ts`：

```ts
import { app, Tray, Menu, nativeImage, type BrowserWindow } from 'electron'

export function shouldPreventClose(isQuitting: boolean): boolean {
  return !isQuitting
}

export function makeTrayIcon(size = 16): Electron.NativeImage {
  const buf = Buffer.alloc(size * size * 4) // BGRA
  const corner = size * 0.375
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const isCorner = x < corner && y < corner
      buf[i] = isCorner ? 0xff : 0xff       // B
      buf[i + 1] = isCorner ? 0xff : 0x90   // G
      buf[i + 2] = isCorner ? 0xff : 0x38   // R
      buf[i + 3] = 0xff                     // A
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

export function setupTray(getWindow: () => BrowserWindow | null): Tray {
  const tray = new Tray(makeTrayIcon())
  tray.setToolTip('loadaily')
  const showWindow = (): void => {
    const win = getWindow()
    if (!win) return
    win.show()
    win.focus()
  }
  tray.on('double-click', showWindow)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开窗口', click: showWindow },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]))
  return tray
}
```

`src/main/index.ts`（本任务先只做窗口，Task 6 再补数据与 IPC）：

```ts
import { app, BrowserWindow, Menu, type Tray } from 'electron'
import { join } from 'path'
import { makeTrayIcon } from './tray'

let win: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100, height: 760, title: 'loadaily',
    icon: makeTrayIcon(256),
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false }
  })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    createWindow()
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
```

`src/preload/index.ts`（本任务占位，Task 7 补契约）：

```ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {})
```

`src/renderer/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:*" />
    <title>loadaily</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/renderer/src/main.tsx`：

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

`src/renderer/src/App.tsx`（占位，Task 8 重写）：

```tsx
export default function App(): JSX.Element {
  return <div className="app-shell"><header className="app-header">loadaily</header></div>
}
```

`src/renderer/src/styles.css`：

```css
:root {
  --bg: #E5E9EF; --header: #333645; --primary: #3890ff; --link: #3498db;
  --text: #333; --text-secondary: #6b7989; --th: #B8C4CE;
  --row-sep: #F3F3F3; --row-hover: #FAF8F0; --input-bg: #F7F7F7;
  --ok: #5cb85c; --warn: #f0ad4e; --err: #da314b; --radius: 2px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Helvetica Neue", "Luxi Sans", "DejaVu Sans", Tahoma, "Hiragino Sans GB", "Microsoft Yahei", sans-serif;
  background: var(--bg); color: var(--text); font-size: 13px;
}
.app-shell { display: flex; flex-direction: column; height: 100vh; }
.app-header { background: var(--header); color: #fff; padding: 8px 14px; font-weight: 600; }
```

- [ ] **Step 8: 类型检查**

Run: `npm run typecheck`
Expected: 两个工程均无错误。

- [ ] **Step 9: 启动冒烟**

Run: `npm start`
Expected: 弹出标题 `loadaily` 的窗口，头部显示 `loadaily`。手动关闭窗口后结束进程。

- [ ] **Step 10: 提交**

```bash
git add loadaily/package.json loadaily/electron.vite.config.ts loadaily/tsconfig.json loadaily/tsconfig.node.json loadaily/tsconfig.web.json loadaily/vitest.config.ts loadaily/electron-builder.yml loadaily/.gitignore loadaily/src
git commit -m "feat(loadaily): scaffold electron + react + ts project"
```

---

## Task 2: accountStore —— 账号层

**Files:**
- Create: `src/main/services/accountStore.ts`
- Test: `src/main/__tests__/accountStore.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `interface Character { id: string; name: string; itemLevel: number }`
  - `interface Roster { id: string; name: string; characters: Character[] }`
  - `interface Account { id: string; name: string; rosters: Roster[] }`
  - `addAccount(tree: Account[], name: string): Account[]`
  - `renameAccount(tree: Account[], id: string, name: string): Account[]`
  - `removeAccount(tree: Account[], id: string): Account[]`

- [ ] **Step 1: 写失败测试**

`src/main/__tests__/accountStore.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { addAccount, renameAccount, removeAccount, type Account } from '../services/accountStore'

describe('accountStore: 账号层', () => {
  it('addAccount 追加账号并生成唯一 id', () => {
    const a = addAccount([], '主账号')
    const b = addAccount(a, '小号')
    expect(b).toHaveLength(2)
    expect(b[0]).toMatchObject({ name: '主账号', rosters: [] })
    expect(b[1].name).toBe('小号')
    expect(b[0].id).not.toBe(b[1].id)
  })

  it('addAccount 去掉名字两端空白', () => {
    expect(addAccount([], '  主账号  ')[0].name).toBe('主账号')
  })

  it('addAccount 名字为空则抛错', () => {
    expect(() => addAccount([], '   ')).toThrow('名字不能为空')
  })

  it('renameAccount 只改目标账号且不修改原树', () => {
    const tree: Account[] = [
      { id: 'a1', name: 'A', rosters: [] },
      { id: 'a2', name: 'B', rosters: [] }
    ]
    const next = renameAccount(tree, 'a1', 'A2')
    expect(next.map(a => a.name)).toEqual(['A2', 'B'])
    expect(tree[0].name).toBe('A')
    expect(next[1]).toBe(tree[1])
  })

  it('renameAccount 目标不存在则抛错', () => {
    expect(() => renameAccount([], 'nope', 'X')).toThrow('账号不存在: nope')
  })

  it('removeAccount 删除目标账号', () => {
    const tree: Account[] = [
      { id: 'a1', name: 'A', rosters: [] },
      { id: 'a2', name: 'B', rosters: [] }
    ]
    expect(removeAccount(tree, 'a1').map(a => a.id)).toEqual(['a2'])
  })

  it('removeAccount 目标不存在则抛错', () => {
    expect(() => removeAccount([], 'nope')).toThrow('账号不存在: nope')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/main/__tests__/accountStore.test.ts`
Expected: FAIL —— 找不到模块 `../services/accountStore`。

- [ ] **Step 3: 实现账号层**

`src/main/services/accountStore.ts`：

```ts
export interface Character { id: string; name: string; itemLevel: number }
export interface Roster { id: string; name: string; characters: Character[] }
export interface Account { id: string; name: string; rosters: Roster[] }

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function assertName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('名字不能为空')
  return trimmed
}

export function addAccount(tree: Account[], name: string): Account[] {
  const account: Account = { id: makeId(), name: assertName(name), rosters: [] }
  return [...tree, account]
}

export function renameAccount(tree: Account[], id: string, name: string): Account[] {
  const next = assertName(name)
  let hit = false
  const result = tree.map(a => {
    if (a.id !== id) return a
    hit = true
    return { ...a, name: next }
  })
  if (!hit) throw new Error(`账号不存在: ${id}`)
  return result
}

export function removeAccount(tree: Account[], id: string): Account[] {
  const result = tree.filter(a => a.id !== id)
  if (result.length === tree.length) throw new Error(`账号不存在: ${id}`)
  return result
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/main/__tests__/accountStore.test.ts`
Expected: PASS（7 个用例）。

---

## Task 3: accountStore —— 远征队层

**Files:**
- Modify: `src/main/services/accountStore.ts`
- Test: `src/main/__tests__/accountStore.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `Account` / `Roster` / `makeId` / `assertName`
- Produces: `addRoster(tree, accountId, name): Account[]`、`renameRoster(tree, id, name): Account[]`、`removeRoster(tree, id): Account[]`

- [ ] **Step 1: 追加失败测试**

在 `accountStore.test.ts` 末尾追加：

```ts
describe('accountStore: 远征队层', () => {
  const base = (): Account[] => [
    { id: 'a1', name: 'A', rosters: [{ id: 'r1', name: 'R1', characters: [] }] },
    { id: 'a2', name: 'B', rosters: [] }
  ]

  it('addRoster 加到目标账号', () => {
    const next = addRoster(base(), 'a1', 'R2')
    expect(next[0].rosters.map(r => r.name)).toEqual(['R1', 'R2'])
    expect(next[1]).toEqual({ id: 'a2', name: 'B', rosters: [] })
  })

  it('addRoster 目标账号不存在则抛错', () => {
    expect(() => addRoster(base(), 'nope', 'R')).toThrow('账号不存在: nope')
  })

  it('renameRoster 跨账号定位并只改目标', () => {
    const next = renameRoster(base(), 'r1', 'R1改')
    expect(next[0].rosters[0].name).toBe('R1改')
    expect(next[1].name).toBe('B')
    expect(next[1].rosters).toEqual([])
  })

  it('renameRoster 目标不存在则抛错', () => {
    expect(() => renameRoster(base(), 'nope', 'X')).toThrow('远征队不存在: nope')
  })

  it('removeRoster 删除目标且保留账号', () => {
    const next = removeRoster(base(), 'r1')
    expect(next[0].rosters).toEqual([])
    expect(next[1].name).toBe('B')
  })

  it('removeRoster 目标不存在则抛错', () => {
    expect(() => removeRoster(base(), 'nope')).toThrow('远征队不存在: nope')
  })
})
```

同时把该文件顶部 import 改为：

```ts
import { describe, expect, it } from 'vitest'
import {
  addAccount, renameAccount, removeAccount,
  addRoster, renameRoster, removeRoster,
  type Account
} from '../services/accountStore'
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/main/__tests__/accountStore.test.ts`
Expected: FAIL —— `addRoster` 等未导出。

- [ ] **Step 3: 实现远征队层**

在 `accountStore.ts` 末尾追加：

```ts
export function addRoster(tree: Account[], accountId: string, name: string): Account[] {
  const roster: Roster = { id: makeId(), name: assertName(name), characters: [] }
  let hit = false
  const result = tree.map(a => {
    if (a.id !== accountId) return a
    hit = true
    return { ...a, rosters: [...a.rosters, roster] }
  })
  if (!hit) throw new Error(`账号不存在: ${accountId}`)
  return result
}

export function renameRoster(tree: Account[], id: string, name: string): Account[] {
  const next = assertName(name)
  let hit = false
  const result = tree.map(a => {
    if (!a.rosters.some(r => r.id === id)) return a
    hit = true
    return { ...a, rosters: a.rosters.map(r => (r.id === id ? { ...r, name: next } : r)) }
  })
  if (!hit) throw new Error(`远征队不存在: ${id}`)
  return result
}

export function removeRoster(tree: Account[], id: string): Account[] {
  let hit = false
  const result = tree.map(a => {
    if (!a.rosters.some(r => r.id === id)) return a
    hit = true
    return { ...a, rosters: a.rosters.filter(r => r.id !== id) }
  })
  if (!hit) throw new Error(`远征队不存在: ${id}`)
  return result
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/main/__tests__/accountStore.test.ts`
Expected: PASS（13 个用例）。

---

## Task 4: accountStore —— 角色层与校验

**Files:**
- Modify: `src/main/services/accountStore.ts`
- Test: `src/main/__tests__/accountStore.test.ts`

**Interfaces:**
- Consumes: Task 2/3 的 `Account` / `Roster` / `Character` / `makeId` / `assertName`
- Produces: `assertItemLevel(level: number): number`、`addCharacter(tree, rosterId, name, itemLevel): Account[]`、`updateCharacter(tree, id, patch: { name?: string; itemLevel?: number }): Account[]`、`removeCharacter(tree, id): Account[]`

- [ ] **Step 1: 追加失败测试**

在 `accountStore.test.ts` 末尾追加：

```ts
describe('accountStore: 角色层与校验', () => {
  const base = (): Account[] => [
    {
      id: 'a1', name: 'A',
      rosters: [{
        id: 'r1', name: 'R1',
        characters: [{ id: 'c1', name: '法师', itemLevel: 1700 }]
      }]
    }
  ]

  it('addCharacter 加到目标远征队', () => {
    const next = addCharacter(base(), 'r1', '战士', 1600)
    expect(next[0].rosters[0].characters.map(c => c.name)).toEqual(['法师', '战士'])
    expect(next[0].rosters[0].characters[1].itemLevel).toBe(1600)
  })

  it('addCharacter 远征队不存在则抛错', () => {
    expect(() => addCharacter(base(), 'nope', '战士', 1600)).toThrow('远征队不存在: nope')
  })

  it('addCharacter 装备等级非法则抛错', () => {
    expect(() => addCharacter(base(), 'r1', '战士', -1)).toThrow('装备等级必须是非负整数')
    expect(() => addCharacter(base(), 'r1', '战士', 1.5)).toThrow('装备等级必须是非负整数')
  })

  it('updateCharacter 只改传入的字段', () => {
    const next = updateCharacter(base(), 'c1', { itemLevel: 1720 })
    expect(next[0].rosters[0].characters[0]).toEqual({ id: 'c1', name: '法师', itemLevel: 1720 })
  })

  it('updateCharacter 支持同时改名字与装等', () => {
    const next = updateCharacter(base(), 'c1', { name: '冰法', itemLevel: 1720 })
    expect(next[0].rosters[0].characters[0]).toEqual({ id: 'c1', name: '冰法', itemLevel: 1720 })
  })

  it('updateCharacter 名字为空则抛错', () => {
    expect(() => updateCharacter(base(), 'c1', { name: '  ' })).toThrow('名字不能为空')
  })

  it('updateCharacter 目标不存在则抛错', () => {
    expect(() => updateCharacter(base(), 'nope', { itemLevel: 1720 })).toThrow('角色不存在: nope')
  })

  it('removeCharacter 删除目标角色', () => {
    const next = removeCharacter(base(), 'c1')
    expect(next[0].rosters[0].characters).toEqual([])
  })

  it('removeCharacter 目标不存在则抛错', () => {
    expect(() => removeCharacter(base(), 'nope')).toThrow('角色不存在: nope')
  })
})
```

同时把顶部 import 改为：

```ts
import { describe, expect, it } from 'vitest'
import {
  addAccount, renameAccount, removeAccount,
  addRoster, renameRoster, removeRoster,
  addCharacter, updateCharacter, removeCharacter,
  type Account
} from '../services/accountStore'
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/main/__tests__/accountStore.test.ts`
Expected: FAIL —— `addCharacter` 等未导出。

- [ ] **Step 3: 实现角色层**

在 `accountStore.ts` 末尾追加：

```ts
export function assertItemLevel(level: number): number {
  if (!Number.isInteger(level) || level < 0) throw new Error('装备等级必须是非负整数')
  return level
}

function findCharacter(tree: Account[], id: string): Character | undefined {
  for (const a of tree) {
    for (const r of a.rosters) {
      const c = r.characters.find(x => x.id === id)
      if (c) return c
    }
  }
  return undefined
}

export function addCharacter(tree: Account[], rosterId: string, name: string, itemLevel: number): Account[] {
  const character: Character = { id: makeId(), name: assertName(name), itemLevel: assertItemLevel(itemLevel) }
  let hit = false
  const result = tree.map(a => {
    if (!a.rosters.some(r => r.id === rosterId)) return a
    hit = true
    return {
      ...a,
      rosters: a.rosters.map(r => (r.id === rosterId ? { ...r, characters: [...r.characters, character] } : r))
    }
  })
  if (!hit) throw new Error(`远征队不存在: ${rosterId}`)
  return result
}

export function updateCharacter(tree: Account[], id: string, patch: { name?: string; itemLevel?: number }): Account[] {
  if (!findCharacter(tree, id)) throw new Error(`角色不存在: ${id}`)
  const name = patch.name === undefined ? undefined : assertName(patch.name)
  const itemLevel = patch.itemLevel === undefined ? undefined : assertItemLevel(patch.itemLevel)
  return tree.map(a => ({
    ...a,
    rosters: a.rosters.map(r => ({
      ...r,
      characters: r.characters.map(c => {
        if (c.id !== id) return c
        const merged = { ...c }
        if (name !== undefined) merged.name = name
        if (itemLevel !== undefined) merged.itemLevel = itemLevel
        return merged
      })
    }))
  }))
}

export function removeCharacter(tree: Account[], id: string): Account[] {
  if (!findCharacter(tree, id)) throw new Error(`角色不存在: ${id}`)
  return tree.map(a => ({
    ...a,
    rosters: a.rosters.map(r => ({ ...r, characters: r.characters.filter(c => c.id !== id) }))
  }))
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/main/__tests__/accountStore.test.ts`
Expected: PASS（22 个用例）。

---

## Task 5: accountsFile 持久化

**Files:**
- Create: `src/main/services/accountsFile.ts`
- Test: `src/main/__tests__/accountsFile.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `Account` 类型
- Produces: `loadAccounts(file: string): Account[]`、`saveAccounts(file: string, list: Account[]): void`

- [ ] **Step 1: 写失败测试**

`src/main/__tests__/accountsFile.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadAccounts, saveAccounts } from '../services/accountsFile'
import type { Account } from '../services/accountStore'

let dir = ''
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'loadaily-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('accountsFile', () => {
  it('文件不存在时返回空树', () => {
    expect(loadAccounts(join(dir, 'accounts.json'))).toEqual([])
  })

  it('内容不是数组时警告并回退空树', () => {
    const file = join(dir, 'accounts.json')
    writeFileSync(file, '{"a":1}', 'utf8')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadAccounts(file)).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('内容损坏时警告并回退空树', () => {
    const file = join(dir, 'accounts.json')
    writeFileSync(file, 'not json', 'utf8')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadAccounts(file)).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('保存后能读回同样内容', () => {
    const file = join(dir, 'nested', 'accounts.json')
    const tree: Account[] = [{ id: 'a1', name: 'A', rosters: [] }]
    saveAccounts(file, tree)
    expect(loadAccounts(file)).toEqual(tree)
  })

  it('保存是原子写且不留 tmp 文件', () => {
    const file = join(dir, 'accounts.json')
    saveAccounts(file, [])
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual([])
    expect(loadAccounts(join(dir, '.accounts.json.tmp'))).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/main/__tests__/accountsFile.test.ts`
Expected: FAIL —— 找不到模块 `../services/accountsFile`。

- [ ] **Step 3: 实现持久化**

`src/main/services/accountsFile.ts`：

```ts
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import type { Account } from './accountStore'

export function loadAccounts(file: string): Account[] {
  if (!existsSync(file)) return []
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown
    if (!Array.isArray(parsed)) {
      console.warn(`accounts.json 不是数组，按空列表处理: ${file}`)
      return []
    }
    return parsed as Account[]
  } catch {
    console.warn(`accounts.json 解析失败，按空列表处理: ${file}`)
    return []
  }
}

export function saveAccounts(file: string, list: Account[]): void {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = join(dirname(file), '.accounts.json.tmp')
  writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8')
  renameSync(tmp, file)
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/main/__tests__/accountsFile.test.ts`
Expected: PASS（5 个用例）。

---

## Task 6: accountHandlers 与主进程装配

**Files:**
- Create: `src/main/services/accountHandlers.ts`
- Modify: `src/main/index.ts`
- Test: `src/main/__tests__/accountHandlers.test.ts`

**Interfaces:**
- Consumes: Task 4 的 store 函数、Task 5 的 `loadAccounts` / `saveAccounts`、Task 1 的 `IpcHandler`
- Produces: `createAccountHandlers(file: string): Record<string, IpcHandler>`，键为下面 10 个通道，值为同步返回 `Account[]` 的函数。

通道清单（IPC 契约的通道名以此为准）：`account:list`、`account:add`、`account:rename`、`account:remove`、`roster:add`、`roster:rename`、`roster:remove`、`character:add`、`character:update`、`character:remove`。

- [ ] **Step 1: 写失败测试**

`src/main/__tests__/accountHandlers.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createAccountHandlers } from '../services/accountHandlers'
import { loadAccounts } from '../services/accountsFile'
import { createIpcDispatcher } from '../ipc'

let dir = ''
let file = ''
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'loadaily-h-')) ; file = join(dir, 'accounts.json') })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('accountHandlers', () => {
  it('初始为空树', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    await expect(d.invoke('account:list')).resolves.toEqual([])
  })

  it('account:add 返回新树并落盘', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    const after = (await d.invoke('account:add', '主账号')) as Array<{ name: string }>
    expect(after).toHaveLength(1)
    expect(after[0].name).toBe('主账号')
    expect(loadAccounts(file)).toHaveLength(1)
  })

  it('未知通道抛错', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    await expect(d.invoke('nope')).rejects.toThrow('未知 IPC channel: nope')
  })

  it('校验失败时报错且不落盘', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    await expect(d.invoke('account:add', '   ')).rejects.toThrow('名字不能为空')
    await expect(d.invoke('account:list')).resolves.toEqual([])
  })

  it('三级通道串起来可用', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    const a1 = (await d.invoke('account:add', 'A')) as any[]
    const accountId = a1[0].id
    const a2 = (await d.invoke('roster:add', accountId, 'R1')) as any[]
    const rosterId = a2[0].rosters[0].id
    const a3 = (await d.invoke('character:add', rosterId, '法师', 1700)) as any[]
    expect(a3[0].rosters[0].characters[0]).toMatchObject({ name: '法师', itemLevel: 1700 })
  })

  it('新实例从已有文件恢复', async () => {
    const first = createIpcDispatcher(createAccountHandlers(file))
    await first.invoke('account:add', '主账号')
    const second = createIpcDispatcher(createAccountHandlers(file))
    const list = (await second.invoke('account:list')) as Array<{ name: string }>
    expect(list.map(a => a.name)).toEqual(['主账号'])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/main/__tests__/accountHandlers.test.ts`
Expected: FAIL —— 找不到模块 `../services/accountHandlers`。

- [ ] **Step 3: 实现 handler 集合**

`src/main/services/accountHandlers.ts`：

```ts
import type { IpcHandler } from '../ipc'
import { loadAccounts, saveAccounts } from './accountsFile'
import {
  addAccount, renameAccount, removeAccount,
  addRoster, renameRoster, removeRoster,
  addCharacter, updateCharacter, removeCharacter,
  type Account
} from './accountStore'

export function createAccountHandlers(file: string): Record<string, IpcHandler> {
  let tree: Account[] = loadAccounts(file)

  const persist = (next: Account[]): Account[] => {
    saveAccounts(file, next)
    tree = next
    return tree
  }

  return {
    'account:list': () => tree,
    'account:add': (name: string) => persist(addAccount(tree, name)),
    'account:rename': (id: string, name: string) => persist(renameAccount(tree, id, name)),
    'account:remove': (id: string) => persist(removeAccount(tree, id)),
    'roster:add': (accountId: string, name: string) => persist(addRoster(tree, accountId, name)),
    'roster:rename': (id: string, name: string) => persist(renameRoster(tree, id, name)),
    'roster:remove': (id: string) => persist(removeRoster(tree, id)),
    'character:add': (rosterId: string, name: string, itemLevel: number) => persist(addCharacter(tree, rosterId, name, itemLevel)),
    'character:update': (id: string, patch: { name?: string; itemLevel?: number }) => persist(updateCharacter(tree, id, patch)),
    'character:remove': (id: string) => persist(removeCharacter(tree, id))
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/main/__tests__/accountHandlers.test.ts`
Expected: PASS（6 个用例）。

- [ ] **Step 5: 装配主进程**

`src/main/index.ts` 整体替换为：

```ts
import { app, BrowserWindow, ipcMain, Menu, type Tray } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { getDataDir } from './dataDir'
import { createIpcDispatcher } from './ipc'
import { createAccountHandlers } from './services/accountHandlers'
import { setupTray, shouldPreventClose, makeTrayIcon } from './tray'

const dataDir = getDataDir()
mkdirSync(dataDir, { recursive: true })

const handlers = createAccountHandlers(join(dataDir, 'accounts.json'))
const dispatcher = createIpcDispatcher(handlers)
for (const channel of Object.keys(handlers)) {
  ipcMain.handle(channel, (_evt, ...args: unknown[]) => dispatcher.invoke(channel, ...args))
}

let isQuitting = false
let win: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100, height: 760, title: 'loadaily',
    icon: makeTrayIcon(256),
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false }
  })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  win.on('close', (e) => {
    if (shouldPreventClose(isQuitting)) {
      e.preventDefault()
      win?.hide()
    }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    createWindow()
    tray = setupTray(() => win)
    app.on('before-quit', () => { isQuitting = true })
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
```

- [ ] **Step 6: 类型检查并全量测试**

Run: `npm run typecheck && npm test`
Expected: 类型检查通过；测试全绿（Task 1-6 累计）。

---

## Task 7: preload 契约与类型

**Files:**
- Modify: `src/preload/index.ts`
- Create: `src/preload/index.d.ts`

**Interfaces:**
- Consumes: Task 2 的 `Account` 类型、Task 6 的 10 个通道名
- Produces: 全局 `window.api.accounts.*`，方法签名见下方 `WindowApi`。

- [ ] **Step 1: 写 preload 实现**

`src/preload/index.ts` 整体替换为：

```ts
import { contextBridge, ipcRenderer } from 'electron'
import type { Account } from '../main/services/accountStore'

const invoke = (channel: string, ...args: unknown[]): Promise<unknown> => ipcRenderer.invoke(channel, ...args)

const api = {
  accounts: {
    list: (): Promise<Account[]> => invoke('account:list') as Promise<Account[]>,
    addAccount: (name: string): Promise<Account[]> => invoke('account:add', name) as Promise<Account[]>,
    renameAccount: (id: string, name: string): Promise<Account[]> => invoke('account:rename', id, name) as Promise<Account[]>,
    removeAccount: (id: string): Promise<Account[]> => invoke('account:remove', id) as Promise<Account[]>,
    addRoster: (accountId: string, name: string): Promise<Account[]> => invoke('roster:add', accountId, name) as Promise<Account[]>,
    renameRoster: (id: string, name: string): Promise<Account[]> => invoke('roster:rename', id, name) as Promise<Account[]>,
    removeRoster: (id: string): Promise<Account[]> => invoke('roster:remove', id) as Promise<Account[]>,
    addCharacter: (rosterId: string, name: string, itemLevel: number): Promise<Account[]> => invoke('character:add', rosterId, name, itemLevel) as Promise<Account[]>,
    updateCharacter: (id: string, patch: { name?: string; itemLevel?: number }): Promise<Account[]> => invoke('character:update', id, patch) as Promise<Account[]>,
    removeCharacter: (id: string): Promise<Account[]> => invoke('character:remove', id) as Promise<Account[]>
  }
}

contextBridge.exposeInMainWorld('api', api)
```

- [ ] **Step 2: 写类型声明（契约）**

`src/preload/index.d.ts`：

```ts
import type { Account } from '../main/services/accountStore'

export interface WindowApi {
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

declare global { interface Window { api: WindowApi } }
export {}
```

- [ ] **Step 3: 类型检查**

Run: `npm run typecheck`
Expected: 通过（`accountStore.ts` 是纯逻辑，无 Node/Electron 依赖，web 工程也能引用其类型）。

- [ ] **Step 4: 端到端冒烟**

Run: `npm start`
Expected: 窗口打开。按 `Ctrl+Shift+I` 打开 DevTools，Console 执行：

```js
await window.api.accounts.addAccount('冒烟账号')
```

返回数组含 `{ name: '冒烟账号', rosters: [] }`；且项目根出现 `loadaily_Data/accounts.json`。手动删除 `loadaily_Data/` 以清理冒烟数据，关闭窗口结束进程。

---

## Task 8: 渲染层外壳、弹窗与账号 CRUD

**Files:**
- Create: `src/renderer/src/components/ConfirmModal.tsx`, `src/renderer/src/components/PromptModal.tsx`
- Modify: `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`

**Interfaces:**
- Consumes: Task 7 的 `window.api.accounts.*`、Task 2 的 `Account` 类型
- Produces:
  - `type Mutate = (op: () => Promise<Account[]>) => Promise<void>`（从 `App.tsx` 导出，后续组件复用）
  - `ConfirmModal`：`{ open: boolean; title: string; message: string; confirmLabel?: string; onConfirm(): void; onCancel(): void }`
  - `PromptModal`：`{ open: boolean; title: string; label?: string; defaultValue?: string; placeholder?: string; onSubmit(value: string): void; onCancel(): void }`

- [ ] **Step 1: 写 ConfirmModal**

`src/renderer/src/components/ConfirmModal.tsx`：

```tsx
interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, confirmLabel = '删除', onConfirm, onCancel }: ConfirmModalProps): JSX.Element | null {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
          <button className="btn" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 写 PromptModal**

`src/renderer/src/components/PromptModal.tsx`：

```tsx
import { useEffect, useRef, useState } from 'react'

interface PromptModalProps {
  open: boolean
  title: string
  label?: string
  defaultValue?: string
  placeholder?: string
  onSubmit: (value: string) => void
  onCancel: () => void
}

export default function PromptModal({ open, title, label, defaultValue = '', placeholder, onSubmit, onCancel }: PromptModalProps): JSX.Element | null {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setValue(defaultValue)
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open, defaultValue])

  if (!open) return null

  const submit = (): void => {
    if (!value.trim()) return
    onSubmit(value)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        {label ? <div className="modal-label">{label}</div> : null}
        <input
          ref={inputRef}
          className="modal-input"
          value={value}
          placeholder={placeholder}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
            else if (e.key === 'Escape') onCancel()
          }}
        />
        <div className="modal-actions">
          <button className="btn primary" onClick={submit} disabled={!value.trim()}>确定</button>
          <button className="btn" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 写完整样式表**

`src/renderer/src/styles.css` 整体替换为：

```css
:root {
  --bg: #E5E9EF; --header: #333645; --primary: #3890ff; --link: #3498db;
  --text: #333; --text-secondary: #6b7989; --th: #B8C4CE;
  --row-sep: #F3F3F3; --row-hover: #FAF8F0; --input-bg: #F7F7F7;
  --ok: #5cb85c; --warn: #f0ad4e; --err: #da314b; --radius: 2px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Helvetica Neue", "Luxi Sans", "DejaVu Sans", Tahoma, "Hiragino Sans GB", "Microsoft Yahei", sans-serif;
  background: var(--bg); color: var(--text); font-size: 13px;
}
.app-shell { display: flex; flex-direction: column; height: 100vh; }
.app-header { background: var(--header); color: #fff; padding: 8px 14px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.app-title { font-size: 14px; }
.app-error { background: var(--err); color: #fff; padding: 4px 14px; font-size: 12px; }
.tab-bar { display: flex; align-items: center; gap: 4px; background: var(--row-sep); padding: 6px 10px 0; }
.sub-tab-bar { display: flex; align-items: center; gap: 4px; padding: 0 0 8px; }
.tab { background: transparent; border: none; padding: 6px 16px; cursor: pointer; color: var(--text-secondary); font-size: 13px; font-weight: 600; border-radius: var(--radius) var(--radius) 0 0; }
.tab.active { background: var(--bg); color: var(--primary); }
.tab-add { background: transparent; border: none; padding: 6px 10px; cursor: pointer; color: var(--text-secondary); font-size: 14px; font-weight: 700; }
.sub-tab { background: transparent; border: none; padding: 4px 12px; cursor: pointer; color: var(--text-secondary); font-size: 13px; border-radius: var(--radius); }
.sub-tab.active { background: #fff; color: var(--primary); font-weight: 600; }
.tab-body { flex: 1; padding: 12px; overflow: auto; display: flex; flex-direction: column; min-height: 0; gap: 10px; }
.card { background: #fff; border-radius: var(--radius); padding: 10px 12px; box-shadow: 0 0 3px rgba(0,0,0,.1); }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.card h3 { font-size: 12px; color: var(--text-secondary); }
.empty-hint { color: var(--text-secondary); font-size: 13px; padding: 24px; text-align: center; }
.hint { font-size: 12px; color: var(--text-secondary); }
.btn { border: none; border-radius: var(--radius); padding: 4px 12px; cursor: pointer; background: var(--row-sep); font-family: inherit; font-size: 12px; }
.btn:hover { background: #e9e9e9; }
.btn.primary { background: var(--primary); color: #fff; }
.btn.primary:disabled { opacity: .5; cursor: not-allowed; }
.btn.danger { background: var(--err); color: #fff; }
.btn.link { background: transparent; color: var(--link); padding: 2px 4px; }
.input { background: var(--input-bg); border: none; border-radius: var(--radius); padding: 5px 8px; font-family: inherit; font-size: 13px; }
.char-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
.char-card { flex: 0 0 auto; width: 170px; background: #fff; border-radius: var(--radius); box-shadow: 0 0 3px rgba(0,0,0,.1); padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.char-name { font-size: 14px; font-weight: 600; cursor: text; min-height: 20px; }
.char-field { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.char-field label { font-size: 12px; color: var(--text-secondary); }
.char-ilvl { width: 84px; text-align: right; }
.char-actions { display: flex; justify-content: flex-end; }
.inline-edit-input { width: 100%; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { background: #fff; border-radius: var(--radius); padding: 14px 16px; min-width: 300px; max-width: 420px; box-shadow: 0 2px 12px rgba(0,0,0,.25); }
.modal-title { font-weight: 600; margin-bottom: 8px; }
.modal-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.modal-message { font-size: 13px; margin-bottom: 12px; }
.modal-input { width: 100%; background: var(--input-bg); border: none; border-radius: var(--radius); padding: 6px 8px; font-family: inherit; font-size: 13px; margin-bottom: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
.err { color: var(--err); }
```

- [ ] **Step 4: 写 App 外壳与账号 CRUD**

`src/renderer/src/App.tsx` 整体替换为：

```tsx
import { useCallback, useEffect, useState } from 'react'
import type { Account } from '../../main/services/accountStore'
import ConfirmModal from './components/ConfirmModal'
import PromptModal from './components/PromptModal'

export type Mutate = (op: () => Promise<Account[]>) => Promise<void>

export default function App(): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingAccount, setAddingAccount] = useState(false)
  const [renamingAccount, setRenamingAccount] = useState<Account | null>(null)
  const [removingAccount, setRemovingAccount] = useState<Account | null>(null)

  const run: Mutate = useCallback(async (op) => {
    try {
      setAccounts(await op())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    window.api.accounts.list()
      .then(list => { setAccounts(list); setError(null) })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const activeAccount = accounts.find(a => a.id === activeAccountId) ?? accounts[0] ?? null

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">loadaily</span>
        <span className="hint">{accounts.length} 个账号</span>
      </header>

      {error ? <div className="app-error">{error}</div> : null}

      <nav className="tab-bar">
        {accounts.map(a => (
          <button
            key={a.id}
            className={`tab${activeAccount?.id === a.id ? ' active' : ''}`}
            onClick={() => setActiveAccountId(a.id)}
            onDoubleClick={() => setRenamingAccount(a)}
            title="双击重命名"
          >
            {a.name}
          </button>
        ))}
        <button className="tab-add" onClick={() => setAddingAccount(true)} title="新增账号">＋</button>
      </nav>

      <main className="tab-body">
        {loading ? (
          <div className="empty-hint">加载中…</div>
        ) : !activeAccount ? (
          <div className="empty-hint">还没有账号，点击上方「＋」新增账号。</div>
        ) : (
          <div className="card">
            <div className="card-head">
              <h3>{activeAccount.name}</h3>
              <div>
                <button className="btn link" onClick={() => setRenamingAccount(activeAccount)}>重命名</button>
                <button className="btn link err" onClick={() => setRemovingAccount(activeAccount)}>删除</button>
              </div>
            </div>
            <div className="hint">远征队与角色区在后续任务实现。</div>
          </div>
        )}
      </main>

      <PromptModal
        open={addingAccount}
        title="新增账号"
        label="账号名字"
        placeholder="例如：主账号"
        onSubmit={value => {
          setAddingAccount(false)
          void run(() => window.api.accounts.addAccount(value))
        }}
        onCancel={() => setAddingAccount(false)}
      />

      <PromptModal
        open={renamingAccount !== null}
        title="重命名账号"
        label="账号名字"
        defaultValue={renamingAccount?.name ?? ''}
        onSubmit={value => {
          const target = renamingAccount
          setRenamingAccount(null)
          if (target) void run(() => window.api.accounts.renameAccount(target.id, value))
        }}
        onCancel={() => setRenamingAccount(null)}
      />

      <ConfirmModal
        open={removingAccount !== null}
        title="删除账号"
        message={`确定删除账号「${removingAccount?.name ?? ''}」？其下的远征队与角色会一并删除。`}
        onConfirm={() => {
          const target = removingAccount
          setRemovingAccount(null)
          if (target) void run(() => window.api.accounts.removeAccount(target.id))
        }}
        onCancel={() => setRemovingAccount(null)}
      />
    </div>
  )
}
```

- [ ] **Step 5: 类型检查**

Run: `npm run typecheck`
Expected: 通过。

- [ ] **Step 6: 手动验收**

Run: `npm start`
Expected:
1. 空态提示「还没有账号，点击上方「＋」新增账号。」
2. 点 `＋` 输入「主账号」→ 出现 tab「主账号」并被选中。
3. 双击 tab 或点「重命名」→ 改成「主账号2」生效。
4. 再建一个账号 → 出现第二个 tab，点击可切换。
5. 点「删除」→ 弹出确认框，确认后 tab 消失，选中项自动回退到剩余账号；全删后回到空态。
6. 重启 App 后数据仍在（`loadaily_Data/accounts.json`）。

- [ ] **Step 7: 提交**

```bash
git add loadaily/src
git commit -m "feat(loadaily): account tree store, ipc contract and account crud ui"
```

---

## Task 9: 远征队子 tab 与 CRUD

**Files:**
- Create: `src/renderer/src/components/AccountView.tsx`
- Modify: `src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: Task 8 的 `Mutate`、`ConfirmModal`、`PromptModal`；Task 2 的 `Account` / `Roster` 类型
- Produces: `AccountView`，props `{ account: Account; run: Mutate }`；内部维护 `activeRosterId`，选中项失效时回退到第一个远征队。

- [ ] **Step 1: 写 AccountView**

`src/renderer/src/components/AccountView.tsx`：

```tsx
import { useState } from 'react'
import type { Account, Roster } from '../../../main/services/accountStore'
import type { Mutate } from '../App'
import ConfirmModal from './ConfirmModal'
import PromptModal from './PromptModal'

interface AccountViewProps {
  account: Account
  run: Mutate
}

export default function AccountView({ account, run }: AccountViewProps): JSX.Element {
  const [activeRosterId, setActiveRosterId] = useState<string | null>(null)
  const [addingRoster, setAddingRoster] = useState(false)
  const [renamingRoster, setRenamingRoster] = useState<Roster | null>(null)
  const [removingRoster, setRemovingRoster] = useState<Roster | null>(null)
  const [removingCharacterId, setRemovingCharacterId] = useState<string | null>(null)

  const activeRoster = account.rosters.find(r => r.id === activeRosterId) ?? account.rosters[0] ?? null
  const removingCharacter = activeRoster?.characters.find(c => c.id === removingCharacterId) ?? null

  return (
    <>
      <div className="sub-tab-bar">
        {account.rosters.map(r => (
          <button
            key={r.id}
            className={`sub-tab${activeRoster?.id === r.id ? ' active' : ''}`}
            onClick={() => setActiveRosterId(r.id)}
            onDoubleClick={() => setRenamingRoster(r)}
            title="双击重命名"
          >
            {r.name}
          </button>
        ))}
        <button className="tab-add" onClick={() => setAddingRoster(true)} title="新增远征队">＋</button>
      </div>

      {activeRoster ? (
        <div className="card">
          <div className="card-head">
            <h3>{activeRoster.name}</h3>
            <div>
              <button className="btn link" onClick={() => setRenamingRoster(activeRoster)}>重命名</button>
              <button className="btn link err" onClick={() => setRemovingRoster(activeRoster)}>删除</button>
            </div>
          </div>
          <div className="hint">角色卡区在后续任务实现。</div>
        </div>
      ) : (
        <div className="empty-hint">该账号还没有远征队，点击上方「＋」新增远征队。</div>
      )}

      <PromptModal
        open={addingRoster}
        title="新增远征队"
        label="远征队名字"
        placeholder="例如：主远征队"
        onSubmit={value => {
          setAddingRoster(false)
          void run(() => window.api.accounts.addRoster(account.id, value))
        }}
        onCancel={() => setAddingRoster(false)}
      />

      <PromptModal
        open={renamingRoster !== null}
        title="重命名远征队"
        label="远征队名字"
        defaultValue={renamingRoster?.name ?? ''}
        onSubmit={value => {
          const target = renamingRoster
          setRenamingRoster(null)
          if (target) void run(() => window.api.accounts.renameRoster(target.id, value))
        }}
        onCancel={() => setRenamingRoster(null)}
      />

      <ConfirmModal
        open={removingRoster !== null}
        title="删除远征队"
        message={`确定删除远征队「${removingRoster?.name ?? ''}」？其下的角色会一并删除。`}
        onConfirm={() => {
          const target = removingRoster
          setRemovingRoster(null)
          if (target) void run(() => window.api.accounts.removeRoster(target.id))
        }}
        onCancel={() => setRemovingRoster(null)}
      />

      <ConfirmModal
        open={removingCharacter !== null}
        title="删除角色"
        message={`确定删除角色「${removingCharacter?.name ?? ''}」？`}
        onConfirm={() => {
          const target = removingCharacter
          setRemovingCharacterId(null)
          if (target) void run(() => window.api.accounts.removeCharacter(target.id))
        }}
        onCancel={() => setRemovingCharacterId(null)}
      />
    </>
  )
}
```

（`removingCharacterId` 在 Task 10 才会被设置；此处先声明好弹窗，避免 Task 10 再改这段。）

- [ ] **Step 2: 在 App 中接入 AccountView**

修改 `src/renderer/src/App.tsx`：顶部 import 增加

```tsx
import AccountView from './components/AccountView'
```

把 `<main className="tab-body">` 内「有账号」分支的 `<div className="card">…</div>` 整块替换为：

```tsx
<AccountView key={activeAccount.id} account={activeAccount} run={run} />
```

替换后该分支为：

```tsx
) : !activeAccount ? (
  <div className="empty-hint">还没有账号，点击上方「＋」新增账号。</div>
) : (
  <AccountView key={activeAccount.id} account={activeAccount} run={run} />
)}
```

- [ ] **Step 3: 类型检查**

Run: `npm run typecheck`
Expected: 通过。

- [ ] **Step 4: 手动验收**

Run: `npm start`
Expected:
1. 选中账号后出现远征队子 tab 行与「＋」。
2. 新增两个远征队 → 子 tab 出现，点击可切换。
3. 双击子 tab 或点「重命名」→ 生效。
4. 删除当前远征队 → 确认后子 tab 消失，选中项回退到剩余远征队；全删后显示「该账号还没有远征队…」。
5. 切换账号再切回 → 子 tab 选择状态跟随账号（因 `key={account.id}` 重挂载）。

- [ ] **Step 5: 提交**

```bash
git add loadaily/src
git commit -m "feat(loadaily): roster sub-tabs with crud"
```

---

## Task 10: 角色卡横向区与角色 CRUD

**Files:**
- Create: `src/renderer/src/components/InlineEdit.tsx`, `src/renderer/src/components/CharacterCard.tsx`
- Modify: `src/renderer/src/components/AccountView.tsx`

**Interfaces:**
- Consumes: Task 9 的 `AccountView` 与 `removingCharacterId` 状态；Task 2 的 `Character` 类型
- Produces:
  - `InlineEdit`：`{ value: string; onSubmit(value: string): void; className?: string; placeholder?: string }`，点击进入编辑，失焦/`Enter` 提交，`Esc` 取消。
  - `CharacterCard`：`{ character: Character; onRename(name: string): void; onItemLevel(itemLevel: number): void; onRemove(): void }`。

- [ ] **Step 1: 写 InlineEdit**

`src/renderer/src/components/InlineEdit.tsx`：

```tsx
import { useEffect, useRef, useState } from 'react'

interface InlineEditProps {
  value: string
  onSubmit: (value: string) => void
  className?: string
  placeholder?: string
}

export default function InlineEdit({ value, onSubmit, className, placeholder }: InlineEditProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const commit = (): void => {
    setEditing(false)
    const next = draft.trim()
    if (!next || next === value) return
    onSubmit(next)
  }

  if (!editing) {
    return (
      <div className={className} onClick={() => setEditing(true)} title="点击编辑">
        {value || <span className="hint">{placeholder ?? '未命名'}</span>}
      </div>
    )
  }

  return (
    <input
      ref={inputRef}
      className={`input inline-edit-input${className ? ` ${className}` : ''}`}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
        else if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}
```

- [ ] **Step 2: 写 CharacterCard**

`src/renderer/src/components/CharacterCard.tsx`：

```tsx
import { useEffect, useState } from 'react'
import type { Character } from '../../../main/services/accountStore'
import InlineEdit from './InlineEdit'

interface CharacterCardProps {
  character: Character
  onRename: (name: string) => void
  onItemLevel: (itemLevel: number) => void
  onRemove: () => void
}

export default function CharacterCard({ character, onRename, onItemLevel, onRemove }: CharacterCardProps): JSX.Element {
  const [ilvl, setIlvl] = useState(String(character.itemLevel))
  const [ilvlError, setIlvlError] = useState<string | null>(null)

  useEffect(() => { setIlvl(String(character.itemLevel)) }, [character.itemLevel])

  const commitIlvl = (): void => {
    const n = Number(ilvl)
    if (ilvl.trim() === '' || !Number.isInteger(n) || n < 0) {
      setIlvlError('需为非负整数')
      return
    }
    setIlvlError(null)
    if (n !== character.itemLevel) onItemLevel(n)
  }

  return (
    <div className="char-card">
      <InlineEdit className="char-name" value={character.name} onSubmit={onRename} placeholder="未命名角色" />
      <div className="char-field">
        <label>装备等级</label>
        <input
          className="input char-ilvl"
          value={ilvl}
          inputMode="numeric"
          onChange={e => setIlvl(e.target.value)}
          onBlur={commitIlvl}
          onKeyDown={e => {
            if (e.key === 'Enter') commitIlvl()
            else if (e.key === 'Escape') { setIlvl(String(character.itemLevel)); setIlvlError(null) }
          }}
        />
      </div>
      {ilvlError ? <div className="err">{ilvlError}</div> : null}
      <div className="char-actions">
        <button className="btn link err" onClick={onRemove}>删除</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 在 AccountView 中接入角色区**

在 `src/renderer/src/components/AccountView.tsx` 顶部 import 增加：

```tsx
import CharacterCard from './CharacterCard'
```

把 `<div className="hint">角色卡区在后续任务实现。</div>` 替换为：

```tsx
<div className="char-row">
  {activeRoster.characters.map(c => (
    <CharacterCard
      key={c.id}
      character={c}
      onRename={name => { void run(() => window.api.accounts.updateCharacter(c.id, { name })) }}
      onItemLevel={itemLevel => { void run(() => window.api.accounts.updateCharacter(c.id, { itemLevel })) }}
      onRemove={() => setRemovingCharacterId(c.id)}
    />
  ))}
  <div className="char-card">
    <button className="btn" onClick={() => setAddingCharacter(true)}>＋ 新增角色</button>
  </div>
</div>
```

在同文件的 `AccountView` 函数体内、`removingCharacterId` 声明旁增加新增角色的状态：

```tsx
const [addingCharacter, setAddingCharacter] = useState(false)
```

并在 `</>` 前、`removingCharacter` 对应的 `ConfirmModal` 之后增加：

```tsx
<PromptModal
  open={addingCharacter}
  title="新增角色"
  label="角色名字"
  placeholder="例如：法师"
  onSubmit={value => {
    const target = activeRoster
    setAddingCharacter(false)
    if (target) void run(() => window.api.accounts.addCharacter(target.id, value, 0))
  }}
  onCancel={() => setAddingCharacter(false)}
/>
```

> 说明：新增角色只填名字，装备等级默认 `0`，随后在卡片上编辑（符合 spec 的「默认 0」）。

- [ ] **Step 4: 类型检查**

Run: `npm run typecheck`
Expected: 通过。

- [ ] **Step 5: 手动验收**

Run: `npm start`
Expected:
1. 远征队下出现横向排列的角色卡与「＋ 新增角色」。
2. 新增角色 → 卡片出现，装等显示 `0`。
3. 点击角色名 → 变输入框；改完点页面其它区域 → 生效；`Esc` → 取消还原。
4. 改装备等级：输入 `1720` 回车或点外部 → 生效；输入 `-1` / `abc` / 清空 → 显示「需为非负整数」且不写盘。
5. 删除角色 → 确认后卡片消失。
6. 角色多到超过宽度时出现横向滚动条，不换行。

- [ ] **Step 6: 全量测试与类型检查**

Run: `npm test && npm run typecheck`
Expected: 测试全绿、类型检查通过。

- [ ] **Step 7: 提交**

```bash
git add loadaily/src
git commit -m "feat(loadaily): horizontal character cards with inline editing"
```

---

## Task 11: 文档收尾与打包校验

**Files:**
- Create: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: 前面所有任务的成品
- Produces: 无代码接口（仅文档）

- [ ] **Step 1: 写 README**

`README.md`：

```markdown
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

- 位置：dev = 项目根 `loadaily_Data/`；打包 = exe 同级 `loadaily_Data/`
- 文件：`accounts.json`（`Account[]` 树，`tmp + rename` 原子写）
- 删除 `loadaily_Data/` 即可重置为初始状态

## 目录

```
src/main/            主进程：装配、IPC 分发、托盘、纯逻辑服务
src/preload/         contextBridge 契约（window.api）
src/renderer/        React 界面
docs/superpowers/    设计 spec 与实现计划
```
```

- [ ] **Step 2: 写 CLAUDE.md**

`CLAUDE.md`：

```markdown
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
- 校验在主进程（`accountStore.ts`）：`name` 非空；`itemLevel` 非负整数。

## UI 规范

- 配色：背景 `#E5E9EF`、头部 `#333645`、主色 `#3890ff`、次要文字 `#6b7989`；
  语义色：成功 `#5cb85c`、警告 `#f0ad4e`、错误 `#da314b`。
- 字体 `"Helvetica Neue", "Luxi Sans", "DejaVu Sans", Tahoma, "Hiragino Sans GB", "Microsoft Yahei", sans-serif`，圆角 `2px`，文案中文。
- 禁止原生 `window.confirm` / `window.prompt`，使用 `ConfirmModal` / `PromptModal`。

## 设计决策（勿擅自变更）

- `contextIsolation + 类型化 IPC`：渲染层无 Node 能力，一切经 `window.api`。
- 关闭到托盘 + 单实例锁；托盘「退出」为真退出。
- 数据落应用自身目录，不落系统 user 目录。
- id 由主进程生成且全局唯一（`` `${Date.now()}-${随机串}` ``）。
- 删除确认一律走自定义弹窗。
```

- [ ] **Step 3: 全量验证**

Run: `npm test && npm run typecheck`
Expected: 全绿 / 通过。

- [ ] **Step 4: 打包校验（有网络时）**

Run: `npm run build`
Expected: 产出 portable exe。若因网络无法下载 electron-builder 依赖而失败，记录该情况并跳过，不要改动构建配置来绕过。

- [ ] **Step 5: 提交**

```bash
git add loadaily/README.md loadaily/CLAUDE.md
git commit -m "docs(loadaily): add readme and agent guide"
```

