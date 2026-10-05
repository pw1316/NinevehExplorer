export type PngBytes = Buffer | Uint8Array | null | undefined

/**
 * Minimal shape of Electron's nativeImage API that this module needs, so the
 * decode logic can be unit tested without an Electron runtime.
 */
export interface ImageApi<TImage> {
  createEmpty(): TImage
  createFromBuffer(buffer: Buffer): TImage
}

/**
 * Decode icon bytes defensively: a missing or corrupt icon file must degrade to
 * an empty image (the window/tray still opens) rather than throw during startup.
 */
export function imageFromPngBytes<TImage>(
  api: ImageApi<TImage>,
  bytes: PngBytes,
  isEmpty: (img: TImage) => boolean
): TImage {
  if (!bytes || bytes.length === 0) return api.createEmpty()
  try {
    const img = api.createFromBuffer(Buffer.from(bytes))
    return isEmpty(img) ? api.createEmpty() : img
  } catch {
    return api.createEmpty()
  }
}
