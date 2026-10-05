import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createAccountHandlers } from '../services/accountHandlers'
import { loadAccounts } from '../services/accountsFile'
import { createIpcDispatcher } from '../ipc'

let dir = ''
let file = ''
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'loadaily-h-')) ; file = join(dir, 'accounts.json') })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('accountHandlers', () => {
  it('初始为空树', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    await expect(d.invoke('account:list')).resolves.toEqual([])
  })

  it('account:add 返回新树并落盘', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    const after = (await d.invoke('account:add', '主账号')) as Array<{ name: string }>
    expect(after).toHaveLength(1)
    expect(after[0].name).toBe('主账号')
    expect(loadAccounts(file)).toHaveLength(1)
  })

  it('未知通道抛错', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    await expect(d.invoke('nope')).rejects.toThrow('未知 IPC channel: nope')
  })

  it('校验失败时报错且不落盘', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    await expect(d.invoke('account:add', '   ')).rejects.toThrow('名字不能为空')
    await expect(d.invoke('account:list')).resolves.toEqual([])
  })

  it('三级通道串起来可用', async () => {
    const d = createIpcDispatcher(createAccountHandlers(file))
    const a1 = (await d.invoke('account:add', 'A')) as any[]
    const accountId = a1[0].id
    const a2 = (await d.invoke('roster:add', accountId, 'R1')) as any[]
    const rosterId = a2[0].rosters[0].id
    const a3 = (await d.invoke('character:add', rosterId, '法师', 1700)) as any[]
    expect(a3[0].rosters[0].characters[0]).toMatchObject({ name: '法师', itemLevel: 1700 })
  })

  it('新实例从已有文件恢复', async () => {
    const first = createIpcDispatcher(createAccountHandlers(file))
    await first.invoke('account:add', '主账号')
    const second = createIpcDispatcher(createAccountHandlers(file))
    const list = (await second.invoke('account:list')) as Array<{ name: string }>
    expect(list.map(a => a.name)).toEqual(['主账号'])
  })
})
