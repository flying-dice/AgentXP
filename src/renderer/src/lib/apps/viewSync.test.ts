import { describe, expect, it } from 'vitest'
import { ViewSync } from './viewSync'

describe('ViewSync', () => {
  const sync = (): ViewSync<{ path: string }> => new ViewSync((v) => v.path)

  it('treats the first view as external', () => {
    expect(sync().isExternal({ path: 'a' })).toBe(true)
  })

  it('ignores the echo of its own report', () => {
    const s = sync()
    s.isExternal({ path: 'a' })
    expect(s.mark({ path: 'b' })).toBe(true)
    expect(s.isExternal({ path: 'b' })).toBe(false)
  })

  it('sees a change by the agent', () => {
    const s = sync()
    s.isExternal({ path: 'a' })
    expect(s.isExternal({ path: 'c' })).toBe(true)
    expect(s.mark({ path: 'c' })).toBe(false)
  })
})
