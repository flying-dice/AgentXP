import { beforeEach, describe, expect, it } from 'vitest'
import { SqliteDesktopRepository } from '../../infrastructure/db/sqlite-desktop-repository'
import { SqliteKanbanRepository } from '../../infrastructure/db/sqlite-kanban-repository'
import { createFixture, count } from '../../infrastructure/db/test-helpers'
import { RecordingPublisher } from '../test-helpers'
import { KanbanService } from './KanbanService'

let service: KanbanService
let publisher: RecordingPublisher
let desktopId: number
let otherDesktopId: number
let f: ReturnType<typeof createFixture>

const titles = (b: { columns: { name: string; cards: { title: string }[] }[] }, column: string): string[] =>
  b.columns.find((c) => c.name === column)!.cards.map((c) => c.title)

beforeEach(() => {
  f = createFixture()
  const desktops = new SqliteDesktopRepository(f.db)
  desktopId = desktops.create({ agentId: f.agentId, title: 'one', isOpen: true }).id
  otherDesktopId = desktops.create({ agentId: f.agentId, title: 'two', isOpen: true }).id
  publisher = new RecordingPublisher()
  service = new KanbanService({ kanban: new SqliteKanbanRepository(f.db), events: publisher })
})

describe('KanbanService', () => {
  it('creates a board with To do, Doing and Done, or with the columns asked for', () => {
    expect(service.createBoard(desktopId, ' Sprint ').columns.map((c) => c.name)).toEqual(['To do', 'Doing', 'Done'])
    const custom = service.createBoard(desktopId, 'Bugs', ['Open', 'Closed'])
    expect(custom.name).toBe('Bugs')
    expect(custom.columns.map((c) => c.name)).toEqual(['Open', 'Closed'])
    expect(service.list(desktopId).map((b) => b.name)).toEqual(['Sprint', 'Bugs'])
    expect(service.list(otherDesktopId)).toEqual([])
    expect(publisher.payloads('kanban.changed')).toEqual([{ desktopId }, { desktopId }])
  })

  it('adds cards with a title, a description and an assignee, in order', () => {
    const board = service.createBoard(desktopId, 'B')
    const todo = board.columns[0]!.id
    service.addCard(todo, { title: 'A', description: 'first', assignee: ' Dev ' })
    const after = service.addCard(todo, { title: 'B' })
    expect(after.columns[0]!.cards).toMatchObject([
      { title: 'A', description: 'first', assignee: 'Dev' },
      { title: 'B', description: '', assignee: null }
    ])
    expect(() => service.addCard(todo, { title: '  ' })).toThrow(/needs a name/)
    expect(() => service.addCard(999, { title: 'x' })).toThrow(/not found/)
  })

  it('updates parts of a card and clears the assignee', () => {
    const board = service.createBoard(desktopId, 'B')
    const card = service.addCard(board.columns[0]!.id, { title: 'A', assignee: 'x' }).columns[0]!.cards[0]!
    expect(service.updateCard(card.id, { description: 'd' }).columns[0]!.cards[0]).toMatchObject({ title: 'A', description: 'd', assignee: 'x' })
    expect(service.updateCard(card.id, { assignee: '' }).columns[0]!.cards[0]!.assignee).toBeNull()
    expect(service.updateCard(card.id, { title: 'Z', assignee: 'y' }).columns[0]!.cards[0]).toMatchObject({ title: 'Z', assignee: 'y' })
  })

  it('moves a card within a column and between columns, keeping both orders dense', () => {
    const board = service.createBoard(desktopId, 'B')
    const [todo, doing] = board.columns.map((c) => c.id)
    for (const t of ['a', 'b', 'c']) service.addCard(todo!, { title: t })
    const ids = Object.fromEntries(service.board(board.id).columns[0]!.cards.map((c) => [c.title, c.id]))
    expect(titles(service.moveCard(ids['c']!, todo!, 0), 'To do')).toEqual(['c', 'a', 'b'])
    let b = service.moveCard(ids['a']!, doing!)
    expect([titles(b, 'To do'), titles(b, 'Doing')]).toEqual([['c', 'b'], ['a']])
    b = service.moveCard(ids['b']!, doing!, 0)
    expect([titles(b, 'To do'), titles(b, 'Doing')]).toEqual([['c'], ['b', 'a']])
    b = service.moveCard(ids['c']!, doing!, 99)
    expect(titles(b, 'Doing')).toEqual(['b', 'a', 'c'])
    expect(f.db.prepare('SELECT position FROM kanban_cards ORDER BY position').all().map((r) => r['position'])).toEqual([0, 1, 2])
  })

  it('refuses to move a card to a column of another board', () => {
    const a = service.createBoard(desktopId, 'A')
    const b = service.createBoard(desktopId, 'B')
    const card = service.addCard(a.columns[0]!.id, { title: 'x' }).columns[0]!.cards[0]!
    expect(() => service.moveCard(card.id, b.columns[0]!.id)).toThrow(/own board/)
  })

  it('renames and reorders columns, deletes columns, cards and boards with what is below them', () => {
    const board = service.createBoard(desktopId, 'B')
    const [todo, doing, done] = board.columns.map((c) => c.id)
    expect(service.moveColumn(done!, 0).columns.map((c) => c.name)).toEqual(['Done', 'To do', 'Doing'])
    expect(service.renameColumn(doing!, 'Review').columns.map((c) => c.name)).toEqual(['Done', 'To do', 'Review'])
    expect(service.addColumn(board.id, 'Later').columns.map((c) => c.name)).toEqual(['Done', 'To do', 'Review', 'Later'])
    const card = service.addCard(todo!, { title: 'x' }).columns[1]!.cards[0]!
    expect(service.deleteCard(card.id).columns[1]!.cards).toEqual([])
    service.addCard(todo!, { title: 'y' })
    service.deleteColumn(todo!)
    expect(count(f.db, 'kanban_cards')).toBe(0)
    service.deleteBoard(board.id)
    expect(count(f.db, 'kanban_columns')).toBe(0)
    expect(service.list(desktopId)).toEqual([])
  })

  it('finds a board by id or by name, and knows which desktop a card lives on', () => {
    const board = service.createBoard(desktopId, 'Team Board')
    const card = service.addCard(board.columns[0]!.id, { title: 'x' }).columns[0]!.cards[0]!
    expect(service.find(desktopId, 'team board').id).toBe(board.id)
    expect(service.find(desktopId, board.id).id).toBe(board.id)
    expect(() => service.find(otherDesktopId, board.id)).toThrow(/does not exist/)
    expect(service.desktopOfCard(card.id)).toBe(desktopId)
    expect(service.desktopOfColumn(board.columns[1]!.id)).toBe(desktopId)
  })

  it('goes away with its desktop', () => {
    service.addCard(service.createBoard(desktopId, 'B').columns[0]!.id, { title: 'x' })
    f.db.exec(`DELETE FROM desktops WHERE id = ${desktopId}`)
    expect(count(f.db, 'kanban_boards') + count(f.db, 'kanban_cards')).toBe(0)
  })
})
