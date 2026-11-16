import { describe, expect, it } from 'vitest'
import { takeIconHint } from './shellHints'

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
