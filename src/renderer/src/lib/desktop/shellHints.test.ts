import { describe, expect, it } from 'vitest'
import { PROJECT_HINT, takeIconHint, takeProjectHint } from './shellHints'

const memory = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const data = new Map<string, string>()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

describe('takeIconHint', () => {
  it('is true once', () => {
    const storage = memory()
    expect(takeIconHint(storage)).toBe(true)
    expect(takeIconHint(storage)).toBe(false)
  })

  it('stays quiet when storage is missing or throws', () => {
    expect(takeIconHint(null)).toBe(false)
    expect(
      takeIconHint({
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {}
      })
    ).toBe(false)
  })
})

describe('takeProjectHint (UX-164)', () => {
  it('is true once for each desktop', () => {
    const storage = memory()
    expect(takeProjectHint(storage, 1)).toBe(true)
    expect(takeProjectHint(storage, 1)).toBe(false)
    expect(takeProjectHint(storage, 2)).toBe(true)
  })
  it('stays quiet without storage and names Computer', () => {
    expect(takeProjectHint(null, 1)).toBe(false)
    expect(PROJECT_HINT.text).toContain('open Computer, then Plug in a project')
    expect(PROJECT_HINT.action).toBe('Open Computer')
  })
})
