import type { Account } from '../main/services/accountStore'

export interface WindowApi {
  accounts: {
    list(): Promise<Account[]>
    addAccount(name: string): Promise<Account[]>
    renameAccount(id: string, name: string): Promise<Account[]>
    removeAccount(id: string): Promise<Account[]>
    addRoster(accountId: string, name: string): Promise<Account[]>
    renameRoster(id: string, name: string): Promise<Account[]>
    removeRoster(id: string): Promise<Account[]>
    addCharacter(rosterId: string, name: string, itemLevel: number): Promise<Account[]>
    updateCharacter(id: string, patch: { name?: string; itemLevel?: number }): Promise<Account[]>
    removeCharacter(id: string): Promise<Account[]>
  }
}

declare global { interface Window { api: WindowApi } }
export {}
