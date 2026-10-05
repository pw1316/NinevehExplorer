import type { IpcHandler } from '../ipc'
import { loadAccounts, saveAccounts } from './accountsFile'
import {
  addAccount, renameAccount, removeAccount,
  addRoster, renameRoster, removeRoster,
  addCharacter, updateCharacter, removeCharacter,
  type Account
} from './accountStore'

export function createAccountHandlers(file: string): Record<string, IpcHandler> {
  let tree: Account[] = loadAccounts(file)

  const persist = (next: Account[]): Account[] => {
    saveAccounts(file, next)
    tree = next
    return tree
  }

  return {
    'account:list': () => tree,
    'account:add': (name: string) => persist(addAccount(tree, name)),
    'account:rename': (id: string, name: string) => persist(renameAccount(tree, id, name)),
    'account:remove': (id: string) => persist(removeAccount(tree, id)),
    'roster:add': (accountId: string, name: string) => persist(addRoster(tree, accountId, name)),
    'roster:rename': (id: string, name: string) => persist(renameRoster(tree, id, name)),
    'roster:remove': (id: string) => persist(removeRoster(tree, id)),
    'character:add': (rosterId: string, name: string, itemLevel: number) => persist(addCharacter(tree, rosterId, name, itemLevel)),
    'character:update': (id: string, patch: { name?: string; itemLevel?: number }) => persist(updateCharacter(tree, id, patch)),
    'character:remove': (id: string) => persist(removeCharacter(tree, id))
  }
}
