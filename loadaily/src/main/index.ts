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
