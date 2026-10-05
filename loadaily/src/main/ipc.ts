export type IpcHandler = (...args: any[]) => unknown | Promise<unknown>

export function createIpcDispatcher(handlers: Record<string, IpcHandler>) {
  return {
    async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
      // own-property check: a plain `handlers[channel]` would resolve
      // Object.prototype members such as 'constructor' and 'toString'.
      const h = Object.hasOwn(handlers, channel) ? handlers[channel] : undefined
      if (!h) throw new Error(`未知 IPC channel: ${channel}`)
      return h(...args)
    }
  }
}
