import { describe, expect, it } from 'vitest'
import { imageFromPngBytes, type ImageApi } from '../trayParts'

const goodPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function makeApi(behaviour: 'ok' | 'empty' | 'throw'): { api: ImageApi<string>; calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    api: {
      createEmpty: () => { calls.push('createEmpty'); return 'EMPTY' },
      createFromBuffer: () => {
        calls.push('createFromBuffer')
        if (behaviour === 'throw') throw new Error('decode failed')
        return behaviour === 'ok' ? 'IMAGE' : 'DECODED-BUT-EMPTY'
      }
    }
  }
}

const isEmpty = (img: string): boolean => img === 'EMPTY' || img === 'DECODED-BUT-EMPTY'

describe('imageFromPngBytes', () => {
  it('没有字节时直接返回空图像，不尝试解码', () => {
    for (const input of [null, undefined, Buffer.alloc(0)]) {
      const { api, calls } = makeApi('ok')
      expect(imageFromPngBytes(api, input, isEmpty)).toBe('EMPTY')
      expect(calls).toEqual(['createEmpty'])
    }
  })

  it('解码抛错时回退空图像，不把异常抛给启动流程', () => {
    const { api } = makeApi('throw')
    expect(imageFromPngBytes(api, goodPng, isEmpty)).toBe('EMPTY')
  })

  it('解码成功但结果为空时回退空图像', () => {
    const { api } = makeApi('empty')
    expect(imageFromPngBytes(api, goodPng, isEmpty)).toBe('EMPTY')
  })

  it('解码成功时返回该图像', () => {
    const { api } = makeApi('ok')
    expect(imageFromPngBytes(api, goodPng, isEmpty)).toBe('IMAGE')
  })
})
