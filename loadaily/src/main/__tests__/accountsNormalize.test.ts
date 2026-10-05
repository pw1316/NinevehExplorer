import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadAccounts } from '../services/accountsFile'

const validChar = { id: 'c1', name: '法师', itemLevel: 1700 }
const validTree = [{ id: 'a1', name: 'A', rosters: [{ id: 'r1', name: 'R1', characters: [validChar] }] }]

function withFile(content: string): { file: string; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'loadaily-norm-'))
  const file = join(dir, 'accounts.json')
  writeFileSync(file, content, 'utf8')
  return { file, dir }
}

describe('loadAccounts: 结构性校验与规范化', () => {
  it('结构不符的条目被丢弃，不会让渲染层崩溃', () => {
    const { file, dir } = withFile(JSON.stringify([
      { name: '没有 id' },
      null,
      'not an object',
      { id: 'a9', name: '好账号', rosters: [] }
    ]))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tree = loadAccounts(file)
    warn.mockRestore()
    rmSync(dir, { recursive: true, force: true })
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('好账号')
    expect(tree[0].rosters).toEqual([])
  })

  it('rosters/characters 非数组时被规范化为空数组', () => {
    const { file, dir } = withFile(JSON.stringify([
      { id: 'a1', name: 'A', rosters: 'oops' },
      { id: 'a2', name: 'B', rosters: [{ id: 'r1', name: 'R1', characters: 'nope' }] }
    ]))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tree = loadAccounts(file)
    warn.mockRestore()
    rmSync(dir, { recursive: true, force: true })
    expect(tree[0].rosters).toEqual([])
    expect(tree[1].rosters).toHaveLength(1)
    expect(tree[1].rosters[0].characters).toEqual([])
  })

  it('角色 itemLevel 非非负整数时取 0，name 非字符串时丢弃该角色', () => {
    const { file, dir } = withFile(JSON.stringify([{
      id: 'a1', name: 'A',
      rosters: [{
        id: 'r1', name: 'R1',
        characters: [
          { id: 'c1', name: '法师', itemLevel: -5 },
          { id: 'c2', name: '战士', itemLevel: 1.5 },
          { id: 'c3', name: '弓手', itemLevel: 'x' },
          { id: 'c4', name: 42, itemLevel: 1600 },
          { id: 'c5', name: '诗人', itemLevel: 1580 }
        ]
      }]
    }]))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tree = loadAccounts(file)
    warn.mockRestore()
    rmSync(dir, { recursive: true, force: true })
    const chars = tree[0].rosters[0].characters
    expect(chars.map(c => c.id)).toEqual(['c1', 'c2', 'c3', 'c5'])
    expect(chars.map(c => c.itemLevel)).toEqual([0, 0, 0, 1580])
  })

  it('结构完好时原样返回，不做多余改写', () => {
    const { file, dir } = withFile(JSON.stringify(validTree))
    const tree = loadAccounts(file)
    rmSync(dir, { recursive: true, force: true })
    expect(tree).toEqual(validTree)
  })
})

describe('loadAccounts: 损坏文件先保全再回退', () => {
  it('解析失败时把原文件改名保全，并回调通知', () => {
    const { file, dir } = withFile('not json at all')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onCorrupt = vi.fn<(info: { file: string; backup: string; reason: string }) => void>()
    const tree = loadAccounts(file, onCorrupt)
    warn.mockRestore()
    expect(tree).toEqual([])
    expect(onCorrupt).toHaveBeenCalledTimes(1)
    const info = onCorrupt.mock.calls[0][0]
    expect(info.backup).not.toBe(file)
    expect(readFileSync(info.backup, 'utf8')).toBe('not json at all')
    rmSync(dir, { recursive: true, force: true })
  })

  it('内容不是数组时同样保全', () => {
    const { file, dir } = withFile('{"a":1}')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onCorrupt = vi.fn<(info: { file: string; backup: string; reason: string }) => void>()
    const tree = loadAccounts(file, onCorrupt)
    warn.mockRestore()
    expect(tree).toEqual([])
    expect(onCorrupt).toHaveBeenCalledTimes(1)
    expect(readFileSync(onCorrupt.mock.calls[0][0].backup, 'utf8')).toBe('{"a":1}')
    rmSync(dir, { recursive: true, force: true })
  })

  it('结构不完整（但可解析）不触发保全回调，避免误报', () => {
    const { file, dir } = withFile(JSON.stringify([{ name: '没有 id' }]))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onCorrupt = vi.fn<(info: { file: string; backup: string; reason: string }) => void>()
    loadAccounts(file, onCorrupt)
    warn.mockRestore()
    rmSync(dir, { recursive: true, force: true })
    expect(onCorrupt).not.toHaveBeenCalled()
  })
})
