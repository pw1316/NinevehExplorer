import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadAccounts, saveAccounts } from '../services/accountsFile'
import type { Account } from '../services/accountStore'

let dir = ''
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'loadaily-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('accountsFile', () => {
  it('文件不存在时返回空树', () => {
    expect(loadAccounts(join(dir, 'accounts.json'))).toEqual([])
  })

  it('内容不是数组时警告并回退空树', () => {
    const file = join(dir, 'accounts.json')
    writeFileSync(file, '{"a":1}', 'utf8')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadAccounts(file)).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('内容损坏时警告并回退空树', () => {
    const file = join(dir, 'accounts.json')
    writeFileSync(file, 'not json', 'utf8')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadAccounts(file)).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('保存后能读回同样内容', () => {
    const file = join(dir, 'nested', 'accounts.json')
    const tree: Account[] = [{ id: 'a1', name: 'A', rosters: [] }]
    saveAccounts(file, tree)
    expect(loadAccounts(file)).toEqual(tree)
  })

  it('保存是原子写且不留 tmp 文件', () => {
    const file = join(dir, 'accounts.json')
    saveAccounts(file, [])
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual([])
    expect(loadAccounts(join(dir, '.accounts.json.tmp'))).toEqual([])
  })
})
