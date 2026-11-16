import { describe, expect, it } from 'vitest'
import { ToolCallScope } from './ToolCallScope'

describe('ToolCallScope', () => {
  it('keeps the id of the first use', () => {
    const scope = new ToolCallScope()
    scope.beginTurn('s')
    expect(scope.forCreate('s', 't1')).toBe('t1')
    expect(scope.forCreate('s', 't1')).toBe('t1')
    expect(scope.forUpdate('s', 't1')).toBe('t1')
  })

  it('gives a call that reuses an id in a later turn a new id; updates follow it', () => {
    const scope = new ToolCallScope()
    scope.beginTurn('s')
    scope.forCreate('s', 't1')
    scope.beginTurn('s')
    expect(scope.forUpdate('s', 't1')).toBe('t1') // a late update still reaches the old call
    expect(scope.forCreate('s', 't1')).toBe('t1@2')
    expect(scope.forCreate('s', 't1')).toBe('t1@2')
    expect(scope.forUpdate('s', 't1')).toBe('t1@2')
    scope.beginTurn('s')
    expect(scope.forCreate('s', 't1')).toBe('t1@3')
  })

  it('scopes per session and passes unknown ids through', () => {
    const scope = new ToolCallScope()
    scope.beginTurn('a')
    scope.forCreate('a', 't1')
    scope.beginTurn('b')
    expect(scope.forCreate('b', 't1')).toBe('t1')
    expect(scope.forUpdate('b', 'never-seen')).toBe('never-seen')
  })
})
