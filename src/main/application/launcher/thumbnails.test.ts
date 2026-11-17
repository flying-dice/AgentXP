import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileThumbnailStore } from '../../infrastructure/fs/FileThumbnailStore'
import { deriveRunState } from './summary'
import { ThumbnailService, type ThumbnailCapturer, type ThumbnailStore } from './ThumbnailService'
import { parseThumbnailUrl, thumbnailUrl, THUMBNAIL_WIDTH } from './thumbnailUrl'

describe('thumbnailUrl', () => {
  it('round-trips the desktop id and carries the version', () => {
    const url = thumbnailUrl(7, 1234.9)
    expect(url).toBe('agentxp-thumb://desktop/7.png?v=1234')
    expect(parseThumbnailUrl(url)).toBe(7)
    expect(parseThumbnailUrl('agentxp-thumb://desktop/12.png')).toBe(12)
  })

  it('rejects other URLs', () => {
    expect(parseThumbnailUrl('https://desktop/7.png')).toBeNull()
    expect(parseThumbnailUrl('agentxp-thumb://other/7.png')).toBeNull()
    expect(parseThumbnailUrl('agentxp-thumb://desktop/..%2f7.png')).toBeNull()
    expect(parseThumbnailUrl('agentxp-thumb://desktop/x.png')).toBeNull()
  })
})

describe('deriveRunState', () => {
  it('prefers waiting for the user, then working, then error', () => {
    expect(deriveRunState([], 0)).toBe('idle')
    expect(deriveRunState(['idle', 'closed'], 0)).toBe('idle')
    expect(deriveRunState(['working', 'error'], 0)).toBe('working')
    expect(deriveRunState(['connecting'], 0)).toBe('working')
    expect(deriveRunState(['error', 'idle'], 0)).toBe('error')
    expect(deriveRunState([], 0, true)).toBe('error')
    expect(deriveRunState(['working'], 0, true)).toBe('working')
    expect(deriveRunState(['working'], 1)).toBe('awaiting_approval')
    expect(deriveRunState(['awaiting_permission'], 0)).toBe('awaiting_approval')
  })
})

function memory() {
  const versions = new Map<number, number>()
  const writes: Array<[number, Uint8Array]> = []
  let clock = 1000
  const store: ThumbnailStore = {
    write: async (id, png) => {
      writes.push([id, png])
      versions.set(id, clock++)
    },
    version: (id) => versions.get(id) ?? null
  }
  return { store, writes }
}

describe('ThumbnailService', () => {
  it('captures at the thumbnail width, stores, notifies and exposes a versioned url', async () => {
    const { store, writes } = memory()
    const updated = vi.fn()
    const capturer: ThumbnailCapturer = { capturePng: vi.fn(async () => new Uint8Array([1, 2, 3])) }
    const service = new ThumbnailService({ store, capturer, connected: () => [], updated })
    expect(service.urlOf(1)).toBeNull()
    await service.captureNow(1)
    expect(capturer.capturePng).toHaveBeenCalledWith(1, THUMBNAIL_WIDTH)
    expect(writes).toHaveLength(1)
    expect(updated).toHaveBeenCalledWith(1)
    expect(service.urlOf(1)).toBe('agentxp-thumb://desktop/1.png?v=1000')
  })

  it('keeps the old thumbnail when there is no window, an empty image or the capture throws', async () => {
    const { store, writes } = memory()
    const results: Array<Uint8Array | null | Error> = [null, new Uint8Array(), new Error('gone')]
    const capturer: ThumbnailCapturer = {
      capturePng: async () => {
        const r = results.shift()!
        if (r instanceof Error) throw r
        return r
      }
    }
    const service = new ThumbnailService({ store, capturer, connected: () => [], updated: () => {} })
    await service.captureNow(1)
    await service.captureNow(1)
    await expect(service.captureNow(1)).resolves.toBeUndefined()
    expect(writes).toEqual([])
  })

  it('captures every connected desktop on the timer until stopped', async () => {
    const { store, writes } = memory()
    let tick: () => void = () => {}
    const cleared: unknown[] = []
    const service = new ThumbnailService({
      store,
      capturer: { capturePng: async () => new Uint8Array([9]) },
      connected: () => [1, 2],
      updated: () => {},
      intervalMs: 60_000,
      setInterval: (run, ms) => {
        expect(ms).toBe(60_000)
        tick = run
        return 'handle'
      },
      clearInterval: (h) => void cleared.push(h)
    })
    service.start()
    service.start() // idempotent
    tick()
    await vi.waitFor(() => expect(writes.map(([id]) => id)).toEqual([1, 2]))
    service.stop()
    expect(cleared).toEqual(['handle'])
  })
})

describe('FileThumbnailStore', () => {
  const dirs: string[] = []
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })))

  it('writes <dir>/<id>/thumbnail.png and reports its mtime as the version', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'a7-thumb-'))
    dirs.push(dir)
    const store = new FileThumbnailStore(dir)
    expect(store.version(3)).toBeNull()
    await store.write(3, new Uint8Array([137, 80]))
    expect(store.pathOf(3)).toBe(join(dir, '3', 'thumbnail.png'))
    expect([...readFileSync(store.pathOf(3))]).toEqual([137, 80])
    expect(store.version(3)).toBeGreaterThan(0)
  })
})
