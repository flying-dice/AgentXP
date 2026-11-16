import { describe, expect, it, vi } from 'vitest'
import { handleAppRequest, registerAppRequestHandler, startAppRequests } from './appRequests'

describe('handleAppRequest', () => {
  it('answers an unknown window with an error', async () => {
    const res = await handleAppRequest({ desktopId: 1, requestId: 'a', windowId: 999, method: 'read', params: null })
    expect(res).toMatchObject({ requestId: 'a', ok: false })
  })

  it('returns the handler result', async () => {
    const off = registerAppRequestHandler(1, async (method, params) => ({ method, params }))
    expect(await handleAppRequest({ desktopId: 1, requestId: 'b', windowId: 1, method: 'read', params: 5 })).toEqual({ requestId: 'b', ok: true, result: { method: 'read', params: 5 } })
    off()
    expect((await handleAppRequest({ desktopId: 1, requestId: 'c', windowId: 1, method: 'read', params: 5 })).ok).toBe(false)
  })

  it('turns a throwing handler into an error response', async () => {
    const off = registerAppRequestHandler(2, async () => {
      throw new Error('boom')
    })
    expect(await handleAppRequest({ desktopId: 1, requestId: 'd', windowId: 2, method: 'x', params: null })).toEqual({ requestId: 'd', ok: false, error: 'boom' })
    off()
  })

  it('an old unregister does not remove a newer handler', async () => {
    const offOld = registerAppRequestHandler(3, async () => 'old')
    const offNew = registerAppRequestHandler(3, async () => 'new')
    offOld()
    expect(await handleAppRequest({ desktopId: 1, requestId: 'e', windowId: 3, method: 'x', params: null })).toMatchObject({ ok: true, result: 'new' })
    offNew()
  })
})

describe('startAppRequests', () => {
  it('replies through desktop.respondAppRequest', async () => {
    let listener: ((r: never) => void) | undefined
    const respondAppRequest = vi.fn(async () => {})
    const off = vi.fn()
    const stop = startAppRequests({
      on: ((_event: string, l: (r: never) => void) => {
        listener = l
        return off
      }) as never,
      desktop: { respondAppRequest } as never
    })
    listener!({ desktopId: 1, requestId: 'z', windowId: 77, method: 'read', params: null } as never)
    await vi.waitFor(() => expect(respondAppRequest).toHaveBeenCalledWith({ requestId: 'z', ok: false, error: expect.any(String) }))
    stop()
    expect(off).toHaveBeenCalled()
  })
})
