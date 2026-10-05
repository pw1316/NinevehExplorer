/**
 * IPC errors arrive as `Error invoking remote method 'character:update': Error: <real message>`.
 * Show the Chinese message the main process produced, not Electron's English wrapper.
 */
export function readableError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  const marker = /Error invoking remote method '[^']*':\s*/
  const withoutWrapper = raw.replace(marker, '')
  return withoutWrapper.replace(/^Error:\s*/, '').trim() || '操作失败'
}
