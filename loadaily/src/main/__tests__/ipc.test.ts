import { describe, expect, it, vi } from 'vitest'
import { createIpcDispatcher } from '../ipc'

describe('createIpcDispatcher', () => {
  it('委派已知通道并透传参数', async () => {
    const handler = vi.fn((a: number, b: number) => a + b)
    const d = createIpcDispatcher({ 'math:add': handler })
    await expect(d.invoke('math:add', 2, 3)).resolves.toBe(5)
    expect(handler).toHaveBeenCalledWith(2, 3)
  })

  it('未知通道抛错', async () => {
    const d = createIpcDispatcher({})
    await expect(d.invoke('nope')).rejects.toThrow('未知 IPC channel: nope')
  })

  it('原型链上的属性名也算未知通道', async () => {
    const d = createIpcDispatcher({})
    await expect(d.invoke('constructor')).rejects.toThrow('未知 IPC channel: constructor')
    await expect(d.invoke('toString')).rejects.toThrow('未知 IPC channel: toString')
  })
})
