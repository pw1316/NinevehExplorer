/**
 * Pure data-directory resolution, kept free of electron imports so it is unit
 * testable.
 *
 * Portable builds matter here: electron-builder's `portable` target unpacks the
 * app to a NEW temp directory on every launch, so `exeDir` is throwaway and data
 * written beside it would be lost on restart. The launcher exports
 * `PORTABLE_EXECUTABLE_DIR` pointing at where the .exe actually lives, which is
 * the "exe 同级" location the spec calls for.
 */
export function resolveDataDir(opts: {
  isPackaged: boolean
  portableDir?: string | undefined
  exeDir: string
  appPath: string
}): string {
  if (!opts.isPackaged) return opts.appPath
  if (opts.portableDir) return opts.portableDir
  return opts.exeDir
}
