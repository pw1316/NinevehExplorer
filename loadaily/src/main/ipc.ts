export type IpcHandler = (...args: any[]) => unknown | Promise<unknown>

export function createIpcDispatcher(handlers: Record<string, IpcHandler>) {
  return {
    async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
      const h = handlers[channel]
      if (!h) throw new Error(`未知 IPC channel: ${channel}`)
      return h(...args)
    }
  }
}
