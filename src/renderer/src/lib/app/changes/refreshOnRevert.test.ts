import { describe, expect, it, vi } from 'vitest'
import { refreshOnRevert, type RefreshableStore } from './refreshOnRevert'

function fakeApi() {
  let handler: ((e: { desktopId: number }) => void) | undefined
  const off = vi.fn()
  const on = (_name: string, h: (e: { desktopId: number }) => void): (() => void) => {
    handler = h
    return off
  }
  return { api: { on } as never, emit: (desktopId: number) => handler?.({ desktopId }), off }
}

const store = (running: boolean): RefreshableStore & { connect: ReturnType<typeof vi.fn> } => ({ running, connect: vi.fn(async () => {}) })

describe('refreshOnRevert (UX-79)', () => {
  it('loads the state of every idle chat of the desktop again when a revert is announced', () => {
    const { api, emit } = fakeApi()
    const idle = store(false)
    const busy = store(true)
    refreshOnRevert(api, 1, () => [idle, busy])
    emit(1)
    expect(idle.connect).toHaveBeenCalledTimes(1)
    expect(busy.connect).not.toHaveBeenCalled()
  })

  it('ignores another desktop and gives back the way to stop', () => {
    const { api, emit, off } = fakeApi()
    const idle = store(false)
    const stop = refreshOnRevert(api, 1, () => [idle])
    emit(2)
    expect(idle.connect).not.toHaveBeenCalled()
    stop()
    expect(off).toHaveBeenCalled()
  })
})
