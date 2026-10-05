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
