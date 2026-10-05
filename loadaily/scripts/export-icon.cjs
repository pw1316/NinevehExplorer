// 由 electron 执行：把 reference/icon/ 下的只读图标源导出为应用实际使用的图标。
//   src/main/assets/app-icon.png    窗口图标（256×256），随主进程 bundle 一起打包
//   src/main/assets/tray-icon.png   托盘图标（16×16），同上
//   build/icon.png                  打包 exe 图标（256×256），electron-builder 读取
//
// 产物落在 src/main/assets/（而不是 out/）：`electron-vite build` 会清空 out/，
// 所以 output 必须放在源码侧，再由 electron.vite.config.ts 的 copy 插件搬进 bundle。
// 图标源更新后重跑 `npm run export:icon`；`npm start` 会自动先跑一次。
const { app, nativeImage } = require('electron')
const { writeFileSync, mkdirSync } = require('fs')
const { join } = require('path')

const ROOT = join(__dirname, '..')
const EMBLEM = join(ROOT, 'reference', 'icon', 'lostark-emblem.png')
const ASSETS = join(ROOT, 'src', 'main', 'assets')

const TARGETS = [
  { file: join(ASSETS, 'app-icon.png'), size: 256 },
  { file: join(ASSETS, 'tray-icon.png'), size: 16 },
  { file: join(ROOT, 'build', 'icon.png'), size: 256 }
]

app.whenReady().then(() => {
  const source = nativeImage.createFromPath(EMBLEM)
  if (source.isEmpty()) {
    console.error('图标源读取失败:', EMBLEM)
    app.exit(1)
    return
  }
  for (const { file, size } of TARGETS) {
    const buf = source.resize({ width: size, height: size, quality: 'best' }).toPNG()
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, buf)
    console.log(`icon written: ${file} (${size}x${size}, ${buf.length} bytes)`)
  }
  app.exit(0)
})
