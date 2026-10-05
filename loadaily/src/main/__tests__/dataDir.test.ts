import { describe, expect, it } from 'vitest'
import { resolveDataDir } from '../dataDirRoot'

const base = {
  isPackaged: true,
  portableDir: undefined as string | undefined,
  exeDir: 'C:\\app\\dist\\win-unpacked',
  appPath: 'E:\\repo\\loadaily'
}

describe('resolveDataDir', () => {
  it('dev 模式用项目根', () => {
    expect(resolveDataDir({ ...base, isPackaged: false })).toBe('E:\\repo\\loadaily')
  })

  it('打包模式用 exe 同级目录', () => {
    expect(resolveDataDir(base)).toBe('C:\\app\\dist\\win-unpacked')
  })

  it('portable 模式用 launcher 给出的真实 exe 目录，而不是临时解包目录', () => {
    expect(resolveDataDir({ ...base, portableDir: 'C:\\app\\dist' })).toBe('C:\\app\\dist')
  })

  it('portable 变量为空串时回退到 exe 同级', () => {
    expect(resolveDataDir({ ...base, portableDir: '' })).toBe('C:\\app\\dist\\win-unpacked')
  })

  it('dev 模式忽略 portable 变量', () => {
    expect(resolveDataDir({ ...base, isPackaged: false, portableDir: 'C:\\app\\dist' })).toBe('E:\\repo\\loadaily')
  })
})
