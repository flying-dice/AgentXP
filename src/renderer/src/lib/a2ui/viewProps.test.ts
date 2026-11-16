import { describe, expect, it, vi } from 'vitest'
import { asAction, asArray, asBoolean, asEnum, asNumber, asRecord, asString, asStringList, setterOf, toViewProps } from './viewProps'

describe('as* helpers', () => {
  it('narrow unknown values with fallbacks', () => {
    expect(asString(undefined, 'x')).toBe('x')
    expect(asString(5)).toBe('5')
    expect(asNumber('7')).toBe(7)
    expect(asNumber('', 3)).toBe(3)
    expect(asNumber(NaN)).toBeUndefined()
    expect(asBoolean('yes')).toBe(false)
    expect(asArray(1)).toEqual([])
    expect(asStringList(['a', 1])).toEqual(['a', '1'])
    expect(asRecord([1])).toEqual({})
    expect(asEnum('b', ['a', 'b'] as const, 'a')).toBe('b')
    expect(asEnum('z', ['a', 'b'] as const, 'a')).toBe('a')
  })
  it('asAction wraps callables and ignores the rest', () => {
    const f = vi.fn()
    asAction(f)?.()
    expect(f).toHaveBeenCalledOnce()
    expect(asAction('x')).toBeUndefined()
  })
})

describe('toViewProps / setterOf', () => {
  it('keeps literals and gives a no-op setter for unbound props', () => {
    const view = toViewProps({ text: 'hi', nested: { n: 1 }, list: [1, 2] } as never)
    expect(view).toEqual({ text: 'hi', nested: { n: 1 }, list: [1, 2] })
    expect(() => setterOf(view, 'text')('x')).not.toThrow()
  })
  it('finds an explicit setter', () => {
    const set = vi.fn()
    setterOf({ setValue: set }, 'value')('v')
    expect(set).toHaveBeenCalledWith('v')
  })
})
