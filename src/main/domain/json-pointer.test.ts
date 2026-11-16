import { describe, expect, it } from 'vitest'
import { setAtPointer } from './json-pointer'

describe('setAtPointer', () => {
  it('replaces the whole model for empty paths', () => {
    expect(setAtPointer({ a: 1 }, undefined, { b: 2 })).toEqual({ b: 2 })
    expect(setAtPointer({ a: 1 }, '', 5)).toBe(5)
    expect(setAtPointer({ a: 1 }, '/', 5)).toBe(5)
  })
  it('sets nested values, creating objects', () => {
    expect(setAtPointer({}, '/user/name', 'Ada')).toEqual({ user: { name: 'Ada' } })
    expect(setAtPointer(null, '/a', 1)).toEqual({ a: 1 })
  })
  it('preserves siblings and does not mutate the input', () => {
    const model = { a: { x: 1, y: 2 } }
    expect(setAtPointer(model, '/a/x', 9)).toEqual({ a: { x: 9, y: 2 } })
    expect(model).toEqual({ a: { x: 1, y: 2 } })
  })
  it('supports array indices, append and unescaping', () => {
    expect(setAtPointer({ list: [1, 2] }, '/list/1', 7)).toEqual({ list: [1, 7] })
    expect(setAtPointer({ list: [1] }, '/list/1', 2)).toEqual({ list: [1, 2] })
    expect(setAtPointer({}, '/a~1b/c~0d', 1)).toEqual({ 'a/b': { 'c~d': 1 } })
    expect(setAtPointer({}, '/rows/0/name', 'x')).toEqual({ rows: [{ name: 'x' }] })
  })
})
