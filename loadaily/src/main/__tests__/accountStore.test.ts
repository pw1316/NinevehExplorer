import { describe, expect, it } from 'vitest'
import {
  addAccount, renameAccount, removeAccount,
  addRoster, renameRoster, removeRoster,
  addCharacter, updateCharacter, removeCharacter,
  type Account
} from '../services/accountStore'

describe('accountStore: 账号层', () => {
  it('addAccount 追加账号并生成唯一 id', () => {
    const a = addAccount([], '主账号')
    const b = addAccount(a, '小号')
    expect(b).toHaveLength(2)
    expect(b[0]).toMatchObject({ name: '主账号', rosters: [] })
    expect(b[1].name).toBe('小号')
    expect(b[0].id).not.toBe(b[1].id)
  })

  it('addAccount 去掉名字两端空白', () => {
    expect(addAccount([], '  主账号  ')[0].name).toBe('主账号')
  })

  it('addAccount 名字为空则抛错', () => {
    expect(() => addAccount([], '   ')).toThrow('名字不能为空')
  })

  it('renameAccount 只改目标账号且不修改原树', () => {
    const tree: Account[] = [
      { id: 'a1', name: 'A', rosters: [] },
      { id: 'a2', name: 'B', rosters: [] }
    ]
    const next = renameAccount(tree, 'a1', 'A2')
    expect(next.map(a => a.name)).toEqual(['A2', 'B'])
    expect(tree[0].name).toBe('A')
    expect(next[1]).toBe(tree[1])
  })

  it('renameAccount 目标不存在则抛错', () => {
    expect(() => renameAccount([], 'nope', 'X')).toThrow('账号不存在: nope')
  })

  it('removeAccount 删除目标账号', () => {
    const tree: Account[] = [
      { id: 'a1', name: 'A', rosters: [] },
      { id: 'a2', name: 'B', rosters: [] }
    ]
    expect(removeAccount(tree, 'a1').map(a => a.id)).toEqual(['a2'])
  })

  it('removeAccount 目标不存在则抛错', () => {
    expect(() => removeAccount([], 'nope')).toThrow('账号不存在: nope')
  })
})

describe('accountStore: 远征队层', () => {
  const base = (): Account[] => [
    { id: 'a1', name: 'A', rosters: [{ id: 'r1', name: 'R1', characters: [] }] },
    { id: 'a2', name: 'B', rosters: [] }
  ]

  it('addRoster 加到目标账号', () => {
    const next = addRoster(base(), 'a1', 'R2')
    expect(next[0].rosters.map(r => r.name)).toEqual(['R1', 'R2'])
    expect(next[1]).toEqual({ id: 'a2', name: 'B', rosters: [] })
  })

  it('addRoster 目标账号不存在则抛错', () => {
    expect(() => addRoster(base(), 'nope', 'R')).toThrow('账号不存在: nope')
  })

  it('renameRoster 跨账号定位并只改目标', () => {
    const next = renameRoster(base(), 'r1', 'R1改')
    expect(next[0].rosters[0].name).toBe('R1改')
    expect(next[1].name).toBe('B')
    expect(next[1].rosters).toEqual([])
  })

  it('renameRoster 目标不存在则抛错', () => {
    expect(() => renameRoster(base(), 'nope', 'X')).toThrow('远征队不存在: nope')
  })

  it('removeRoster 删除目标且保留账号', () => {
    const next = removeRoster(base(), 'r1')
    expect(next[0].rosters).toEqual([])
    expect(next[1].name).toBe('B')
  })

  it('removeRoster 目标不存在则抛错', () => {
    expect(() => removeRoster(base(), 'nope')).toThrow('远征队不存在: nope')
  })
})

describe('accountStore: 角色层与校验', () => {
  const base = (): Account[] => [
    {
      id: 'a1', name: 'A',
      rosters: [{
        id: 'r1', name: 'R1',
        characters: [{ id: 'c1', name: '法师', itemLevel: 1700 }]
      }]
    }
  ]

  it('addCharacter 加到目标远征队', () => {
    const next = addCharacter(base(), 'r1', '战士', 1600)
    expect(next[0].rosters[0].characters.map(c => c.name)).toEqual(['法师', '战士'])
    expect(next[0].rosters[0].characters[1].itemLevel).toBe(1600)
  })

  it('addCharacter 远征队不存在则抛错', () => {
    expect(() => addCharacter(base(), 'nope', '战士', 1600)).toThrow('远征队不存在: nope')
  })

  it('addCharacter 装备等级非法则抛错', () => {
    expect(() => addCharacter(base(), 'r1', '战士', -1)).toThrow('装备等级必须是非负整数')
    expect(() => addCharacter(base(), 'r1', '战士', 1.5)).toThrow('装备等级必须是非负整数')
  })

  it('updateCharacter 只改传入的字段', () => {
    const next = updateCharacter(base(), 'c1', { itemLevel: 1720 })
    expect(next[0].rosters[0].characters[0]).toEqual({ id: 'c1', name: '法师', itemLevel: 1720 })
  })

  it('updateCharacter 支持同时改名字与装等', () => {
    const next = updateCharacter(base(), 'c1', { name: '冰法', itemLevel: 1720 })
    expect(next[0].rosters[0].characters[0]).toEqual({ id: 'c1', name: '冰法', itemLevel: 1720 })
  })

  it('updateCharacter 名字为空则抛错', () => {
    expect(() => updateCharacter(base(), 'c1', { name: '  ' })).toThrow('名字不能为空')
  })

  it('updateCharacter 目标不存在则抛错', () => {
    expect(() => updateCharacter(base(), 'nope', { itemLevel: 1720 })).toThrow('角色不存在: nope')
  })

  it('removeCharacter 删除目标角色', () => {
    const next = removeCharacter(base(), 'c1')
    expect(next[0].rosters[0].characters).toEqual([])
  })

  it('removeCharacter 目标不存在则抛错', () => {
    expect(() => removeCharacter(base(), 'nope')).toThrow('角色不存在: nope')
  })
})
