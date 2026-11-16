import { describe, expect, it } from 'vitest'
import { RefTable } from './refs'

const node = (backendNodeId: number, frameId = 'main') => ({ frameId, backendNodeId, role: 'button', name: `n${backendNodeId}` })

describe('RefTable', () => {
  it('hands out one ref per node and keeps it when the page is read again', () => {
    const refs = new RefTable()
    expect([refs.ref(node(10)), refs.ref(node(11)), refs.ref(node(10))]).toEqual([1, 2, 1])
    expect(refs.get(2)).toMatchObject({ backendNodeId: 11 })
    expect(refs.size).toBe(2)
  })

  it('tells the same backend id in two frames apart', () => {
    const refs = new RefTable()
    expect(refs.ref(node(5, 'main'))).not.toBe(refs.ref(node(5, 'frame-2')))
  })

  it('invalidates every ref on reset and never reuses a number', () => {
    const refs = new RefTable()
    const old = refs.ref(node(10))
    refs.reset()
    expect(refs.get(old)).toBeUndefined()
    expect(refs.ref(node(10))).toBeGreaterThan(old)
  })
})
