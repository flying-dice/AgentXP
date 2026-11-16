import { describe, expect, it } from 'vitest'
import type { TaskDto } from '@shared/models'
import { MIN_NOTE, moveNote, noteTitle, planItems, resizeNote } from './noteModel'

const b = { x: 100, y: 100, width: 200, height: 150 }

describe('geometry', () => {
  it('moves and keeps the bar reachable', () => {
    expect(moveNote(b, 10, -5, { width: 800, height: 600 })).toEqual({ ...b, x: 110, y: 95 })
    expect(moveNote(b, -999, -999, { width: 800, height: 600 })).toEqual({ ...b, x: -160, y: 0 })
    expect(moveNote(b, 9999, 9999, { width: 800, height: 600 })).toEqual({ ...b, x: 760, y: 576 })
  })
  it('resizes with a minimum', () => {
    expect(resizeNote(b, 50, 10)).toEqual({ ...b, width: 250, height: 160 })
    expect(resizeNote(b, -999, -999)).toEqual({ ...b, width: MIN_NOTE.width, height: MIN_NOTE.height })
  })
})

describe('plan and titles', () => {
  const task = (id: number, position: number, status: TaskDto['status']): TaskDto => ({ id, sessionId: 1, position, content: `t${id}`, priority: 'medium', status })
  it('orders tasks and checks completed ones', () => {
    expect(planItems([task(2, 1, 'in_progress'), task(1, 0, 'completed')])).toEqual([
      { id: 1, text: 't1', done: true, active: false },
      { id: 2, text: 't2', done: false, active: true }
    ])
  })
  it('titles notes', () => {
    expect(noteTitle({ text: '\n  hello\nworld', planSessionId: null })).toBe('hello')
    expect(noteTitle({ text: '', planSessionId: null })).toBe('(empty note)')
    expect(noteTitle({ text: '', planSessionId: 3 }, 'Fix bug')).toBe('Plan: Fix bug')
    expect(noteTitle({ text: 'x'.repeat(80), planSessionId: null })).toHaveLength(48)
  })
})
