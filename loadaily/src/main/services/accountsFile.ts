import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import type { Account } from './accountStore'

export function loadAccounts(file: string): Account[] {
  if (!existsSync(file)) return []
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown
    if (!Array.isArray(parsed)) {
      console.warn(`accounts.json 不是数组，按空列表处理: ${file}`)
      return []
    }
    return parsed as Account[]
  } catch {
    console.warn(`accounts.json 解析失败，按空列表处理: ${file}`)
    return []
  }
}

export function saveAccounts(file: string, list: Account[]): void {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = join(dirname(file), '.accounts.json.tmp')
  writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8')
  renameSync(tmp, file)
}
