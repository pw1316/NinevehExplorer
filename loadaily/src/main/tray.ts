import { app, Tray, Menu, nativeImage, type BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { imageFromPngBytes } from './trayParts'

export function shouldPreventClose(isQuitting: boolean): boolean {
  return !isQuitting
}

/** Packaged icons live next to the bundled main entry, so dev and asar agree on one path. */
function iconPath(file: string): string {
  return join(__dirname, file)
}

export function loadAppIcon(): Electron.NativeImage {
  return imageFromPngBytes(nativeImage, readIconBytes('app-icon.png'), img => img.isEmpty())
}

export function loadTrayIcon(): Electron.NativeImage {
  return imageFromPngBytes(nativeImage, readIconBytes('tray-icon.png'), img => img.isEmpty())
}

/** Reading bytes first (rather than createFromPath) keeps a missing icon from throwing. */
function readIconBytes(file: string): Buffer | null {
  const path = iconPath(file)
  if (!existsSync(path)) return null
  try {
    return readFileSync(path)
  } catch {
    return null
  }
}

export function setupTray(getWindow: () => BrowserWindow | null): Tray {
  const tray = new Tray(loadTrayIcon())
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
