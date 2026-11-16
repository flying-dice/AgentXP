import { describe, expect, it } from 'vitest'
import { SqliteAppWindowRepository } from './sqlite-app-window-repository'
import { SqliteDesktopRepository } from './sqlite-desktop-repository'
import { SqliteRecycledChangeRepository } from './sqlite-recycled-change-repository'
import { SqliteSessionRepository } from './sqlite-session-repository'
import { SqliteStickyNoteRepository } from './sqlite-sticky-note-repository'
import { count, createFixture } from './test-helpers'

const bounds = { x: 10, y: 20, width: 240, height: 200 }

function setup() {
  const f = createFixture()
  const desktops = new SqliteDesktopRepository(f.db)
  const desktop = desktops.create({ agentId: f.agentId, title: 'project', isOpen: true })
  const sessions = new SqliteSessionRepository(f.db)
  const session = sessions.create({ agentId: f.agentId, desktopId: desktop.id, title: 'chat' })
  return { ...f, desktops, desktop, sessions, session, notes: new SqliteStickyNoteRepository(f.db), recycled: new SqliteRecycledChangeRepository(f.db) }
}

describe('migration 003', () => {
  it('lets every new app kind have a window row', () => {
    const { db, desktop } = setup()
    const windows = new SqliteAppWindowRepository(db)
    for (const app of ['paint', 'wordpad', 'sticky-notes', 'event-viewer', 'snipping-tool', 'recycle-bin'] as const) {
      expect(windows.create({ desktopId: desktop.id, app, bounds, windowState: 'normal', openedBy: 'agent' }).app).toBe(app)
    }
  })
})

describe('SqliteStickyNoteRepository', () => {
  it('creates, lists oldest first, updates parts and removes', () => {
    const { notes, desktop, session } = setup()
    const a = notes.create({ desktopId: desktop.id, text: 'a', color: 'yellow', bounds, planSessionId: null, author: 'user' })
    const b = notes.create({ desktopId: desktop.id, text: '', color: 'blue', bounds, planSessionId: session.id, author: 'agent' })
    expect(notes.list(desktop.id).map((n) => n.id)).toEqual([a.id, b.id])
    expect(b).toMatchObject({ planSessionId: session.id, author: 'agent', bounds })

    const moved = notes.update(a.id, { text: 'changed', bounds: { x: 1.4, y: 2.6, width: 100, height: 50 } })
    expect(moved).toMatchObject({ text: 'changed', color: 'yellow', bounds: { x: 1, y: 3, width: 100, height: 50 } })
    expect(notes.update(b.id, { planSessionId: null })?.planSessionId).toBeNull()
    expect(notes.update(999, { text: 'x' })).toBeNull()

    expect(notes.remove(a.id)).toBe(true)
    expect(notes.remove(a.id)).toBe(false)
    expect(notes.get(a.id)).toBeNull()
  })

  it('rejects colours and authors outside the check constraints', () => {
    const { notes, desktop } = setup()
    expect(() => notes.create({ desktopId: desktop.id, text: '', color: 'teal' as never, bounds, planSessionId: null, author: 'user' })).toThrow()
    expect(() => notes.create({ desktopId: desktop.id, text: '', color: 'pink', bounds, planSessionId: null, author: 'bot' as never })).toThrow()
  })

  it('goes with its desktop (cascade) and only unlinks from a deleted chat (set null)', () => {
    const { db, notes, desktop, desktops, sessions, session } = setup()
    const note = notes.create({ desktopId: desktop.id, text: '', color: 'green', bounds, planSessionId: session.id, author: 'agent' })
    sessions.remove(session.id)
    expect(notes.get(note.id)).toMatchObject({ planSessionId: null })
    desktops.remove(desktop.id)
    expect(count(db, 'sticky_notes')).toBe(0)
  })
})

describe('SqliteRecycledChangeRepository', () => {
  it('adds, lists newest first, removes one and empties a desktop', () => {
    const { recycled, desktop, session } = setup()
    const a = recycled.add({ desktopId: desktop.id, sessionId: session.id, folderId: null, path: 'a.txt', revertedText: 'new', restoredText: 'old' })
    const b = recycled.add({ desktopId: desktop.id, sessionId: null, folderId: null, path: 'b.txt', revertedText: null, restoredText: 'kept' })
    expect(a).toMatchObject({ path: 'C:\\a.txt', revertedText: 'new', restoredText: 'old', sessionId: session.id })
    expect(a.revertedAt).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(b).toMatchObject({ revertedText: null, sessionId: null })
    expect(recycled.list(desktop.id).map((r) => r.id)).toEqual([b.id, a.id])
    expect(recycled.remove(a.id)).toBe(true)
    expect(recycled.get(a.id)).toBeNull()
    expect(recycled.removeAll(desktop.id)).toBe(1)
    expect(recycled.list(desktop.id)).toEqual([])
  })

  it('keeps the row when its chat is deleted and drops it with the desktop', () => {
    const { db, recycled, desktop, desktops, sessions, session } = setup()
    const item = recycled.add({ desktopId: desktop.id, sessionId: session.id, folderId: null, path: 'a.txt', revertedText: 'x', restoredText: null })
    sessions.remove(session.id)
    expect(recycled.get(item.id)).toMatchObject({ sessionId: null, restoredText: null })
    desktops.remove(desktop.id)
    expect(count(db, 'recycled_changes')).toBe(0)
  })
})
