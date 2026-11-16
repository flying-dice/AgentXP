import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordingPublisher } from '../test-helpers'
import { APP_REQUEST_TIMEOUT_MS, AppRequestBroker } from './AppRequestBroker'

let publisher: RecordingPublisher
let broker: AppRequestBroker
let n: number

beforeEach(() => {
  vi.useFakeTimers()
  publisher = new RecordingPublisher()
  n = 0
  broker = new AppRequestBroker(publisher, () => `req-${++n}`)
})
afterEach(() => vi.useRealTimers())

describe('AppRequestBroker', () => {
  it('pushes the request to the desktop window and resolves with the answer', async () => {
    const pending = broker.request(4, 12, 'read', { a: 1 })
    expect(publisher.payloads('desktop.appRequest')).toEqual([{ requestId: 'req-1', desktopId: 4, windowId: 12, method: 'read', params: { a: 1 } }])
    broker.respond({ requestId: 'req-1', ok: true, result: 'data:image/png;base64,AA' })
    await expect(pending).resolves.toBe('data:image/png;base64,AA')
  })

  it('rejects with the app\'s error message', async () => {
    const pending = broker.request(4, 12, 'draw', {})
    broker.respond({ requestId: 'req-1', ok: false, error: 'bad op' })
    await expect(pending).rejects.toThrow('bad op')
  })

  it('answers several requests independently', async () => {
    const a = broker.request(4, 1, 'a', null)
    const b = broker.request(4, 2, 'b', null)
    broker.respond({ requestId: 'req-2', ok: true, result: 'B' })
    broker.respond({ requestId: 'req-1', ok: true, result: 'A' })
    expect(await Promise.all([a, b])).toEqual(['A', 'B'])
  })

  it('rejects with a clear message after 10 s and ignores a late answer', async () => {
    const pending = broker.request(4, 12, 'read', {})
    const assertion = expect(pending).rejects.toThrow(/did not answer "read" within 10 s/)
    await vi.advanceTimersByTimeAsync(APP_REQUEST_TIMEOUT_MS - 1)
    broker.respond({ requestId: 'req-1', ok: true, result: 'too late?' }) // still in time
    await expect(pending).resolves.toBe('too late?')
    await assertion.catch(() => {})

    const slow = broker.request(4, 12, 'read', {}, 500)
    const slowAssertion = expect(slow).rejects.toThrow(/within 1 s|within 0 s/)
    await vi.advanceTimersByTimeAsync(500)
    await slowAssertion
    expect(() => broker.respond({ requestId: 'req-2', ok: true, result: 1 })).not.toThrow()
    expect(() => broker.respond({ requestId: 'unknown', ok: true, result: 1 })).not.toThrow()
  })

  it('times out after the default 10 seconds', async () => {
    const pending = broker.request(4, 12, 'read', {})
    const assertion = expect(pending).rejects.toThrow(/10 s/)
    await vi.advanceTimersByTimeAsync(APP_REQUEST_TIMEOUT_MS)
    await assertion
  })

  it('rejects what is pending on dispose', async () => {
    const pending = broker.request(4, 12, 'read', {})
    const assertion = expect(pending).rejects.toThrow(/shutting down/)
    broker.dispose()
    await assertion
  })
})
