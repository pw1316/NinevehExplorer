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
