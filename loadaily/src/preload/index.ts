import { contextBridge, ipcRenderer } from 'electron'
import type { Account } from '../main/services/accountStore'

const invoke = (channel: string, ...args: unknown[]): Promise<unknown> => ipcRenderer.invoke(channel, ...args)

const api = {
  accounts: {
    list: (): Promise<Account[]> => invoke('account:list') as Promise<Account[]>,
    addAccount: (name: string): Promise<Account[]> => invoke('account:add', name) as Promise<Account[]>,
    renameAccount: (id: string, name: string): Promise<Account[]> => invoke('account:rename', id, name) as Promise<Account[]>,
    removeAccount: (id: string): Promise<Account[]> => invoke('account:remove', id) as Promise<Account[]>,
    addRoster: (accountId: string, name: string): Promise<Account[]> => invoke('roster:add', accountId, name) as Promise<Account[]>,
    renameRoster: (id: string, name: string): Promise<Account[]> => invoke('roster:rename', id, name) as Promise<Account[]>,
    removeRoster: (id: string): Promise<Account[]> => invoke('roster:remove', id) as Promise<Account[]>,
    addCharacter: (rosterId: string, name: string, itemLevel: number): Promise<Account[]> => invoke('character:add', rosterId, name, itemLevel) as Promise<Account[]>,
    updateCharacter: (id: string, patch: { name?: string; itemLevel?: number }): Promise<Account[]> => invoke('character:update', id, patch) as Promise<Account[]>,
    removeCharacter: (id: string): Promise<Account[]> => invoke('character:remove', id) as Promise<Account[]>
  }
}

contextBridge.exposeInMainWorld('api', api)
