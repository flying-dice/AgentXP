import { describe, expect, it } from 'vitest'
import type { A2uiServerMessage } from '@shared/a2ui'
import { planSync, sameMessage } from './messagePlan'

const v = 'v0.9' as const
const create = (id = 's'): A2uiServerMessage => ({ version: v, createSurface: { surfaceId: id, catalogId: 'c' } })
const comps = (text: string): A2uiServerMessage => ({ version: v, updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Label', text }] } })
const data = (n: number): A2uiServerMessage => ({ version: v, updateDataModel: { surfaceId: 's', path: '/n', value: n } })

describe('sameMessage', () => {
  it('compares structurally regardless of key order', () => {
    expect(sameMessage({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true)
    expect(sameMessage({ a: 1 }, { a: 2 })).toBe(false)
    expect(sameMessage([1], { 0: 1 })).toBe(false)
    expect(sameMessage(null, {})).toBe(false)
  })
})

describe('planSync', () => {
  it('applies only the appended tail', () => {
    expect(planSync([create(), comps('a')], [create(), comps('a'), data(1)])).toEqual({ kind: 'apply', messages: [data(1)] })
  })
  it('applies nothing when unchanged', () => {
    expect(planSync([create()], [create()])).toEqual({ kind: 'apply', messages: [] })
  })
  it('patches same-length lists whose changed entries are upserts', () => {
    expect(planSync([create(), comps('a'), data(1)], [create(), comps('b'), data(1)])).toEqual({ kind: 'apply', messages: [comps('b')] })
  })
  it('rebuilds when createSurface changes or the list shrinks', () => {
    expect(planSync([create('s'), comps('a')], [create('t'), comps('a')])).toEqual({ kind: 'rebuild' })
    expect(planSync([create(), comps('a'), data(1)], [create()])).toEqual({ kind: 'rebuild' })
  })
})
