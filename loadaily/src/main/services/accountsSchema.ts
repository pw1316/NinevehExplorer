import type { Account, Character, Roster } from './accountStore'

/**
 * Structural normalization for data loaded from accounts.json.
 *
 * accounts.json is a plain file in a user-visible directory, so it can be
 * hand-edited, half-synced or written by an older build. Anything that survives
 * parsing must still be safe for the renderer, which dereferences
 * `account.rosters` and `roster.characters` directly — an unchecked file would
 * throw during render and blank the whole window.
 *
 * Rules: entries without a usable string `id`/`name` are dropped; a non-array
 * `rosters`/`characters` becomes `[]`; a character whose `itemLevel` is not a
 * non-negative integer gets `0` rather than being dropped.
 */
export function normalizeAccounts(value: unknown): { tree: Account[]; dropped: number } {
  if (!Array.isArray(value)) return { tree: [], dropped: 0 }
  const tree: Account[] = []
  let dropped = 0
  for (const raw of value) {
    const account = normalizeAccount(raw)
    if (account) tree.push(account)
    else dropped++
  }
  return { tree, dropped }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

function normalizeAccount(raw: unknown): Account | null {
  if (typeof raw !== 'object' || raw === null) return null
  const a = raw as Record<string, unknown>
  if (!isNonEmptyString(a.id) || !isNonEmptyString(a.name)) return null
  const rosters = Array.isArray(a.rosters) ? a.rosters : []
  return {
    id: a.id,
    name: a.name,
    rosters: rosters.map(normalizeRoster).filter((r): r is Roster => r !== null)
  }
}

function normalizeRoster(raw: unknown): Roster | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!isNonEmptyString(r.id) || !isNonEmptyString(r.name)) return null
  const characters = Array.isArray(r.characters) ? r.characters : []
  return {
    id: r.id,
    name: r.name,
    characters: characters.map(normalizeCharacter).filter((c): c is Character => c !== null)
  }
}

function normalizeCharacter(raw: unknown): Character | null {
  if (typeof raw !== 'object' || raw === null) return null
  const c = raw as Record<string, unknown>
  if (!isNonEmptyString(c.id) || !isNonEmptyString(c.name)) return null
  const level = c.itemLevel
  return {
    id: c.id,
    name: c.name,
    itemLevel: typeof level === 'number' && Number.isInteger(level) && level >= 0 ? level : 0
  }
}
