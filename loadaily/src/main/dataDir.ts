import { app } from 'electron'
import { join, dirname } from 'path'

export function getDataDir(): string {
  const root = app.isPackaged ? dirname(app.getPath('exe')) : app.getAppPath()
  return join(root, 'loadaily_Data')
}
