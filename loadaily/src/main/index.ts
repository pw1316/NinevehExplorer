import { app, BrowserWindow, dialog, ipcMain, Menu, type Tray } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { getDataDir } from './dataDir'
import { createIpcDispatcher } from './ipc'
import { createAccountHandlers } from './services/accountHandlers'
import { setupTray, shouldPreventClose, makeTrayIcon } from './tray'

// A packaged portable app is launched from wherever the user dropped the exe, so
// the data directory may be unwritable (read-only medium, restricted share,
// over-long path). Failing here means no window at all, hence the explicit
// message; the mkdir result is only reported once the app can show a dialog.
let startupError: string | null = null
const dataDir = getDataDir()
try {
  mkdirSync(dataDir, { recursive: true })
} catch (e) {
  startupError = e instanceof Error ? e.message : String(e)
}

// Recorded at load time and shown after ready, since load happens first.
let corruptNotice: { backup: string; reason: string } | null = null
const handlers = createAccountHandlers(join(dataDir, 'accounts.json'), info => {
  corruptNotice = { backup: info.backup, reason: info.reason }
})
const dispatcher = createIpcDispatcher(handlers)
for (const channel of Object.keys(handlers)) {
  ipcMain.handle(channel, (_evt, ...args: unknown[]) => dispatcher.invoke(channel, ...args))
}

/** Portable builds must not quietly fall back to a temp dir that is wiped each launch. */
function dataDirWarning(dir: string): string | null {
  if (!app.isPackaged) return null
  const temp = tmpdir().toLowerCase()
  return dir.toLowerCase().startsWith(temp)
    ? `数据目录落在临时目录，重启后可能丢失：\n${dir}`
    : null
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
    // These must come before the window: without a usable data directory the
    // app cannot persist anything, and a silent fallback to an empty tree looks
    // to the user like their data vanished for no reason.
    if (startupError) {
      dialog.showErrorBox(
        '无法创建数据目录',
        `${dataDir}\n\n${startupError}\n\n请把 loadaily 放到有写入权限的目录后重试。`
      )
      app.quit()
      return
    }
    if (corruptNotice) {
      dialog.showMessageBoxSync({
        type: 'warning',
        title: '数据文件无法读取',
        message: `accounts.json ${corruptNotice.reason}，已按空列表启动。`,
        detail: `原文件已备份为：\n${corruptNotice.backup}\n\n如需找回数据，可用该备份文件替换 accounts.json。`
      })
    }
    const tmpWarning = dataDirWarning(dataDir)
    if (tmpWarning) {
      dialog.showMessageBoxSync({
        type: 'warning',
        title: '数据目录位于临时目录',
        message: tmpWarning,
        detail: '这通常意味着 portable 启动器没有提供 PORTABLE_EXECUTABLE_DIR。'
      })
    }
    Menu.setApplicationMenu(null)
    createWindow()
    tray = setupTray(() => win)
    app.on('before-quit', () => { isQuitting = true })
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
