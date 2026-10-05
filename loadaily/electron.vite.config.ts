import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { cpSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * `electron-vite build` 会清空 out/，所以导出的图标不能直接写在 out/ 里。
 * 图标源由 `npm run export:icon` 导出到 src/main/assets/，这里在 bundle 生成后
 * 复制到 out/main/ —— 与主进程入口同目录，dev 与 asar 打包路径一致。
 * src/main/assets/ 缺失（未跑 export:icon）时跳过，由 start/build 的脚本保证先跑。
 */
function copyMainAssets(): { name: string; closeBundle: () => void } {
  return {
    name: 'loadaily-copy-main-assets',
    closeBundle(): void {
      const src = join(__dirname, 'src', 'main', 'assets')
      if (!existsSync(src)) return
      const dest = join(__dirname, 'out', 'main')
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
    }
  }
}

export default defineConfig({
  main: { plugins: [copyMainAssets()] },
  preload: {},
  renderer: { plugins: [react()] }
})
