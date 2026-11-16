import { describe, expect, it } from 'vitest'
import type { A2uiServerMessage } from './a2ui'
import { applyA2uiMessage, getByPointer, parseA2uiFences, resolveDeep, resolveDynamic, setByPointer, type A2uiSurfaces } from './a2ui-surface'

const apply = (msgs: A2uiServerMessage[]): A2uiSurfaces => msgs.reduce(applyA2uiMessage, {} as A2uiSurfaces)

describe('pointers', () => {
  it('gets and sets', () => {
    const d = { a: { b: [1, { c: 2 }] }, 'x/y': 3 }
    expect(getByPointer(d, '/a/b/1/c')).toBe(2)
    expect(getByPointer(d, '/x~1y')).toBe(3)
    expect(getByPointer(d, '/nope/deep')).toBeUndefined()
    expect(getByPointer(d, '')).toBe(d)
    const n = setByPointer(d, '/a/b/0', 9) as typeof d
    expect(n.a.b[0]).toBe(9)
    expect(d.a.b[0]).toBe(1)
    expect(setByPointer(undefined, '/p/q', 1)).toEqual({ p: { q: 1 } })
    expect(setByPointer({ a: 1 }, '', 5)).toBe(5)
  })

  it('resolves dynamic values', () => {
    expect(resolveDynamic({ path: '/n' }, { n: 4 })).toBe(4)
    expect(resolveDynamic('lit', {})).toBe('lit')
    expect(resolveDeep({ a: { path: '/n' }, b: [{ path: '/m' }, 1] }, { n: 1, m: 2 })).toEqual({ a: 1, b: [2, 1] })
  })
})

describe('reducer', () => {
  const create: A2uiServerMessage = { createSurface: { surfaceId: 's', catalogId: 'c', title: 'T' } }

  it('creates, upserts components, updates data, deletes', () => {
    let s = apply([create, { updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Label', text: 'a' }, { id: 'x', component: 'Label', text: 'b' }] } }])
    expect(s.s.title).toBe('T')
    s = applyA2uiMessage(s, { updateComponents: { surfaceId: 's', components: [{ id: 'x', component: 'Label', text: 'c' }, { id: 'y', component: 'Label', text: 'd' }] } })
    expect(s.s.components.map((c) => [c.id, c.text])).toEqual([['root', 'a'], ['x', 'c'], ['y', 'd']])
    s = applyA2uiMessage(s, { updateDataModel: { surfaceId: 's', path: '/form/name', value: 'bob' } })
    expect(s.s.dataModel).toEqual({ form: { name: 'bob' } })
    s = applyA2uiMessage(s, { updateDataModel: { surfaceId: 's', value: { z: 1 } } })
    expect(s.s.dataModel).toEqual({ z: 1 })
    expect(applyA2uiMessage(s, { deleteSurface: { surfaceId: 's' } })).toEqual({})
  })

  it('ignores updates for unknown surfaces and does not mutate', () => {
    const empty: A2uiSurfaces = {}
    expect(applyA2uiMessage(empty, { updateDataModel: { surfaceId: 'q', value: 1 } })).toBe(empty)
    const s = apply([create])
    const before = JSON.stringify(s)
    applyA2uiMessage(s, { updateDataModel: { surfaceId: 's', path: '/a', value: 1 } })
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe('parseA2uiFences', () => {
  it('extracts single and array blocks and returns remaining text', () => {
    const text = 'Before\n```a2ui\n{"deleteSurface":{"surfaceId":"a"}}\n```\nMiddle\n```a2ui\n[{"deleteSurface":{"surfaceId":"b"}},{"deleteSurface":{"surfaceId":"c"}}]\n```\nAfter'
    const r = parseA2uiFences(text)
    expect(r.messages).toHaveLength(3)
    expect(r.text).toBe('Before\nMiddle\nAfter')
  })

  it('leaves invalid blocks and other fences alone', () => {
    const text = '```a2ui\nnot json\n```\n```ts\nx\n```'
    const r = parseA2uiFences(text)
    expect(r.messages).toEqual([])
    expect(r.text).toBe(text)
  })
})
