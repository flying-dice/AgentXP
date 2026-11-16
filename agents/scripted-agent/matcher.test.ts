import { describe, expect, it } from 'vitest'
import { RuleSelector, matchPrompt } from './matcher.ts'
import type { Rule } from './script.ts'

describe('matchPrompt', () => {
  it('equals ignores surrounding whitespace and optionally case', () => {
    expect(matchPrompt({ equals: 'hello' }, '  hello\n')).toEqual({})
    expect(matchPrompt({ equals: 'hello' }, 'Hello')).toBeNull()
    expect(matchPrompt({ equals: 'hello', ignoreCase: true }, 'HELLO')).toEqual({})
    expect(matchPrompt({ equals: 'hello' }, 'hello there')).toBeNull()
  })

  it('contains matches anywhere', () => {
    expect(matchPrompt({ contains: 'edit' }, 'please edit it')).toEqual({})
    expect(matchPrompt({ contains: 'EDIT', ignoreCase: true }, 'please edit it')).toEqual({})
    expect(matchPrompt({ contains: 'edit' }, 'nothing')).toBeNull()
  })

  it('regex captures numbered and named groups', () => {
    expect(matchPrompt({ regex: 'open (\\w+) (?<where>\\w+)' }, 'open the door')).toEqual({ 'match.0': 'open the door', 'match.1': 'the', 'match.2': 'door', 'match.where': 'door' })
    expect(matchPrompt({ regex: '^HI', ignoreCase: true }, 'hi!')).toEqual({ 'match.0': 'hi' })
    expect(matchPrompt({ regex: '^hi' }, 'oh hi')).toBeNull()
  })

  it('any matches everything, including an empty prompt', () => {
    expect(matchPrompt({ any: true }, '')).toEqual({})
  })
})

describe('RuleSelector', () => {
  const rule = (id: string, match: Rule['match'], once = false): Rule => ({ id, match, once, steps: [] })

  it('first matching rule wins', () => {
    const selector = new RuleSelector([rule('a', { contains: 'x' }), rule('b', { contains: 'x' }), rule('c', { any: true })])
    expect(selector.select('x')?.rule.id).toBe('a')
    expect(selector.select('y')?.rule.id).toBe('c')
  })

  it('consumes once rules', () => {
    const selector = new RuleSelector([rule('first', { contains: 'x' }, true), rule('rest', { any: true })])
    expect(selector.select('x')?.rule.id).toBe('first')
    expect(selector.select('x')?.rule.id).toBe('rest')
  })

  it('returns null when nothing matches', () => {
    expect(new RuleSelector([rule('a', { equals: 'a' })]).select('b')).toBeNull()
  })
})
