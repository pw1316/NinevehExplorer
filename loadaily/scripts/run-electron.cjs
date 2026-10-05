// 图标导出的跨平台启动器：在子进程里以真正的 GUI 模式运行 electron。
//
// 为什么不直接写 `electron scripts/export-icon.cjs`：宿主 shell 里可能带有
// ELECTRON_RUN_AS_NODE=1（某些终端/AI 会话环境会设），那会让 electron 以纯 Node
// 运行，require('electron') 只返回 exe 路径字符串，脚本随即崩在 app 上。这里显式
// 剔除该变量，保证 `npm run export:icon` 在哪都能跑。
const { spawnSync } = require('child_process')
const { join } = require('path')

const electron = require('electron')
const script = join(__dirname, 'export-icon.cjs')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const result = spawnSync(electron, [script], { stdio: 'inherit', env })
process.exit(result.status === null ? 1 : result.status)
