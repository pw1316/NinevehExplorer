import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, openSync, fsyncSync, closeSync } from 'fs'
import { join, dirname } from 'path'
import type { Account } from './accountStore'
import { normalizeAccounts } from './accountsSchema'

export interface CorruptInfo {
  file: string
  backup: string
  reason: string
}

export function loadAccounts(file: string, onCorrupt?: (info: CorruptInfo) => void): Account[] {
  if (!existsSync(file)) return []
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (e) {
    console.warn(`accounts.json 读取失败，按空列表处理: ${file}`, e)
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    preserveCorrupt(file, raw, 'JSON 解析失败', onCorrupt)
    return []
  }

  if (!Array.isArray(parsed)) {
    preserveCorrupt(file, raw, '内容不是数组', onCorrupt)
    return []
  }

  const { tree, dropped } = normalizeAccounts(parsed)
  if (dropped > 0) {
    console.warn(`accounts.json 有 ${dropped} 个结构不符的条目已忽略: ${file}`)
  }
  return tree
}

export function saveAccounts(file: string, list: Account[]): void {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = join(dirname(file), '.accounts.json.tmp')
  const text = JSON.stringify(list, null, 2)
  // fsync before rename: the rename is atomic, but without flushing the file
  // contents a power cut can leave a renamed-but-empty file behind.
  const fd = openSync(tmp, 'w')
  try {
    writeFileSync(fd, text, 'utf8')
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
  renameSync(tmp, file)
}

/**
 * An unreadable accounts.json is never overwritten in place: the next save
 * would destroy the only copy of the user's data. Move it aside first, then
 * report, so a repairable file stays repairable.
 */
function preserveCorrupt(file: string, raw: string, reason: string, onCorrupt?: (info: CorruptInfo) => void): void {
  const backup = `${file}.corrupt-${Date.now()}`
  let kept = backup
  try {
    renameSync(file, backup)
  } catch (e) {
    // Renaming failed (locked / read-only): leave the original untouched
    // instead of risking a destructive fallback.
    console.warn(`accounts.json 无法改名为备份，保持原文件不动: ${file}`, e)
    kept = file
  }
  console.warn(`accounts.json ${reason}，已按空列表处理${kept === file ? '（原文件未改动）' : `，原文件备份为 ${kept}`}`)
  console.warn(`原始内容长度 ${raw.length} 字符`)
  onCorrupt?.({ file, backup: kept, reason })
}
