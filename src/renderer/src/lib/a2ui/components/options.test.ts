import { describe, expect, it } from 'vitest'
import { toIcon, toOptions } from './options'

describe('options', () => {
  it('normalises strings and objects', () => {
    expect(toOptions(['a', { value: 'b' }, { value: 'c', label: 'See' }])).toEqual([
      { value: 'a', label: 'a' },
      { value: 'b', label: 'b' },
      { value: 'c', label: 'See' }
    ])
    expect(toOptions(undefined)).toEqual([])
  })
  it('drops unknown icons', () => {
    expect(toIcon('definitely-not-an-icon')).toBeUndefined()
    expect(toIcon(3)).toBeUndefined()
  })
})
