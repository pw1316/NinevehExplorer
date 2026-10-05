export interface Character { id: string; name: string; itemLevel: number }
export interface Roster { id: string; name: string; characters: Character[] }
export interface Account { id: string; name: string; rosters: Roster[] }

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function assertName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('名字不能为空')
  return trimmed
}

export function addAccount(tree: Account[], name: string): Account[] {
  const account: Account = { id: makeId(), name: assertName(name), rosters: [] }
  return [...tree, account]
}

export function renameAccount(tree: Account[], id: string, name: string): Account[] {
  const next = assertName(name)
  let hit = false
  const result = tree.map(a => {
    if (a.id !== id) return a
    hit = true
    return { ...a, name: next }
  })
  if (!hit) throw new Error(`账号不存在: ${id}`)
  return result
}

export function removeAccount(tree: Account[], id: string): Account[] {
  const result = tree.filter(a => a.id !== id)
  if (result.length === tree.length) throw new Error(`账号不存在: ${id}`)
  return result
}

export function addRoster(tree: Account[], accountId: string, name: string): Account[] {
  const roster: Roster = { id: makeId(), name: assertName(name), characters: [] }
  let hit = false
  const result = tree.map(a => {
    if (a.id !== accountId) return a
    hit = true
    return { ...a, rosters: [...a.rosters, roster] }
  })
  if (!hit) throw new Error(`账号不存在: ${accountId}`)
  return result
}

export function renameRoster(tree: Account[], id: string, name: string): Account[] {
  const next = assertName(name)
  let hit = false
  const result = tree.map(a => {
    if (!a.rosters.some(r => r.id === id)) return a
    hit = true
    return { ...a, rosters: a.rosters.map(r => (r.id === id ? { ...r, name: next } : r)) }
  })
  if (!hit) throw new Error(`远征队不存在: ${id}`)
  return result
}

export function removeRoster(tree: Account[], id: string): Account[] {
  let hit = false
  const result = tree.map(a => {
    if (!a.rosters.some(r => r.id === id)) return a
    hit = true
    return { ...a, rosters: a.rosters.filter(r => r.id !== id) }
  })
  if (!hit) throw new Error(`远征队不存在: ${id}`)
  return result
}

export function assertItemLevel(level: number): number {
  if (!Number.isInteger(level) || level < 0) throw new Error('装备等级必须是非负整数')
  return level
}

function findCharacter(tree: Account[], id: string): Character | undefined {
  for (const a of tree) {
    for (const r of a.rosters) {
      const c = r.characters.find(x => x.id === id)
      if (c) return c
    }
  }
  return undefined
}

export function addCharacter(tree: Account[], rosterId: string, name: string, itemLevel: number): Account[] {
  const character: Character = { id: makeId(), name: assertName(name), itemLevel: assertItemLevel(itemLevel) }
  let hit = false
  const result = tree.map(a => {
    if (!a.rosters.some(r => r.id === rosterId)) return a
    hit = true
    return {
      ...a,
      rosters: a.rosters.map(r => (r.id === rosterId ? { ...r, characters: [...r.characters, character] } : r))
    }
  })
  if (!hit) throw new Error(`远征队不存在: ${rosterId}`)
  return result
}

export function updateCharacter(tree: Account[], id: string, patch: { name?: string; itemLevel?: number }): Account[] {
  if (!findCharacter(tree, id)) throw new Error(`角色不存在: ${id}`)
  const name = patch.name === undefined ? undefined : assertName(patch.name)
  const itemLevel = patch.itemLevel === undefined ? undefined : assertItemLevel(patch.itemLevel)
  return tree.map(a => ({
    ...a,
    rosters: a.rosters.map(r => ({
      ...r,
      characters: r.characters.map(c => {
        if (c.id !== id) return c
        const merged = { ...c }
        if (name !== undefined) merged.name = name
        if (itemLevel !== undefined) merged.itemLevel = itemLevel
        return merged
      })
    }))
  }))
}

export function removeCharacter(tree: Account[], id: string): Account[] {
  if (!findCharacter(tree, id)) throw new Error(`角色不存在: ${id}`)
  return tree.map(a => ({
    ...a,
    rosters: a.rosters.map(r => ({ ...r, characters: r.characters.filter(c => c.id !== id) }))
  }))
}
