import jsonpatch from 'fast-json-patch'
import { describe, expect, it } from 'vitest'
import { diffJson } from './jsonDiff'

/** Applies the diff with the same library the AG-UI client uses and checks it reproduces `next`. */
function roundTrip(prev: unknown, next: unknown): unknown[] {
  const ops = diffJson(prev, next)
  const patched = jsonpatch.applyPatch(structuredClone(prev), structuredClone(ops) as never, true, false).newDocument
  expect(patched).toEqual(next)
  return ops
}

describe('diffJson', () => {
  it('is empty for equal values and identical references', () => {
    const shared = { a: [1, 2] }
    expect(diffJson({ x: shared }, { x: shared })).toEqual([])
    expect(roundTrip({ a: 1, b: [1, { c: 2 }] }, { a: 1, b: [1, { c: 2 }] })).toEqual([])
  })

  it('replaces changed primitives at their path', () => {
    expect(roundTrip({ s: { title: 'a', n: 1 } }, { s: { title: 'b', n: 1 } })).toEqual([
      { op: 'replace', path: '/s/title', value: 'b' }
    ])
  })

  it('adds and removes object keys and escapes keys with / and ~', () => {
    const ops = roundTrip({ calls: { 'a/b': 1, gone: 2 } }, { calls: { 'a/b': 1, 'c~d': 3 } })
    expect(ops).toEqual([
      { op: 'remove', path: '/calls/gone' },
      { op: 'add', path: '/calls/c~0d', value: 3 }
    ])
    roundTrip({}, { 'x/y': { z: 1 } })
  })

  it('diffs arrays element-wise: appends, truncates from the end, recurses into elements', () => {
    expect(roundTrip({ l: [1, 2] }, { l: [1, 2, 3, 4] })).toEqual([
      { op: 'add', path: '/l/2', value: 3 },
      { op: 'add', path: '/l/3', value: 4 }
    ])
    expect(roundTrip({ l: [1, 2, 3, 4] }, { l: [1] })).toEqual([
      { op: 'remove', path: '/l/3' },
      { op: 'remove', path: '/l/2' },
      { op: 'remove', path: '/l/1' }
    ])
    expect(roundTrip({ l: [{ a: 1 }, { a: 2 }] }, { l: [{ a: 1 }, { a: 3 }] })).toEqual([
      { op: 'replace', path: '/l/1/a', value: 3 }
    ])
  })

  it('replaces on type changes and treats undefined values as absent', () => {
    roundTrip({ v: [1] }, { v: { a: 1 } })
    roundTrip({ v: null }, { v: 'x' })
    expect(diffJson({ a: 1 }, { a: 1, b: undefined })).toEqual([])
  })
})
