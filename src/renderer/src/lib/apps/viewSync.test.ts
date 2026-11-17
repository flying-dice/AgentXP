import { describe, expect, it } from 'vitest'
import { ECHO_WAIT_MS, ViewSync } from './viewSync'

describe('ViewSync', () => {
  let time = 0
  const sync = (): ViewSync<{ path: string }> => new ViewSync((v) => v.path, () => time)

  it('treats the first view as external', () => {
    expect(sync().isExternal({ path: 'a' })).toBe(true)
  })

  it('ignores the echo of its own report', () => {
    const s = sync()
    s.isExternal({ path: 'a' })
    expect(s.report({ path: 'b' })).toBe(true)
    expect(s.isExternal({ path: 'b' })).toBe(false)
  })

  it('sees a change by the agent', () => {
    const s = sync()
    s.isExternal({ path: 'a' })
    expect(s.isExternal({ path: 'c' })).toBe(true)
    expect(s.report({ path: 'c' })).toBe(false)
  })

  it('ignores a view pushed before its report arrived in main, then follows changes after the echo', () => {
    const s = sync()
    s.isExternal({ path: '' }) // a window that just opened: nothing shown
    expect(s.report({ path: 'a' })).toBe(true) // the user opens a file at once
    expect(s.isExternal({ path: '' })).toBe(false) // the empty view, pushed before main had the report: stale
    expect(s.isExternal({ path: 'a' })).toBe(false) // the echo
    expect(s.isExternal({ path: 'b' })).toBe(true) // the agent, after the echo
  })

  it('a newer report replaces the pending one; the older echo is stale', () => {
    const s = sync()
    s.report({ path: 'a' })
    s.report({ path: 'b' })
    expect(s.isExternal({ path: 'a' })).toBe(false)
    expect(s.isExternal({ path: 'b' })).toBe(false)
    expect(s.isExternal({ path: 'c' })).toBe(true)
  })

  it('stops waiting for an echo that never comes', () => {
    time = 0
    const s = sync()
    s.report({ path: 'a' })
    time = ECHO_WAIT_MS - 1
    expect(s.isExternal({ path: 'c' })).toBe(false)
    time = ECHO_WAIT_MS
    expect(s.isExternal({ path: 'c' })).toBe(true)
  })

  it('mark remembers a view without waiting for an echo', () => {
    const s = sync()
    expect(s.mark({ path: 'a' })).toBe(true)
    expect(s.mark({ path: 'a' })).toBe(false)
    expect(s.isExternal({ path: 'b' })).toBe(true)
  })
})
