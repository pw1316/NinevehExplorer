import { app } from 'electron'
import { join, dirname } from 'path'
import { resolveDataDir } from './dataDirRoot'

export function getDataDir(): string {
  const root = resolveDataDir({
    isPackaged: app.isPackaged,
    portableDir: process.env.PORTABLE_EXECUTABLE_DIR,
    exeDir: dirname(app.getPath('exe')),
    appPath: app.getAppPath()
  })
  return join(root, 'loadaily_Data')
}
