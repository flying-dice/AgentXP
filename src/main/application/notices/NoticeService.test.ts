import { beforeEach, describe, expect, it } from 'vitest'
import type { AppView, AppWindowState, DesktopState } from '@shared/desktop'
import type { CardChange } from '@shared/kanban'
import type { FileChangeDto, Id, TerminalDto } from '@shared/models'
import type { NoticeDto } from '@shared/notices'
import { RecordingPublisher } from '../test-helpers'
import { describeCards, describeRuns, NoticeService } from './NoticeService'

const DESKTOP = 1
const OTHER_DESKTOP = 2
const BUILDER = 10
const REVIEWER = 11
const ELSEWHERE = 20

const win = (id: Id, view: AppView): AppWindowState => ({ id, app: view.app, title: '', bounds: { x: 0, y: 0, width: 100, height: 100 }, windowState: 'normal', openedBy: 'user', view })
const chatWin = (id: Id, sessionId: Id): AppWindowState => win(id, { app: 'chat', sessionId, title: 'Chat' })
const reviewWin = (id: Id, sessionId: Id): AppWindowState => win(id, { app: 'code-review', root: 'E:\\', baseRef: 'HEAD', selectedPath: null, sessionId })
const kanbanWin = (id: Id, boardId: Id | null): AppWindowState => win(id, { app: 'kanban', boardId })
const diagramsWin = (id: Id): AppWindowState => win(id, { app: 'diagrams', path: null, page: 0, outline: [] } as unknown as AppView)
const change = (id: Id, path: string, currentText = 'x'): FileChangeDto => ({ id, sessionId: BUILDER, path, kind: 'modified', additions: 1, deletions: 0, originalText: '', currentText })
const run = (id: Id, command: string, args: string[], exitCode: number | null): TerminalDto => ({ id, sessionId: BUILDER, terminalId: `t${id}`, command, args, cwd: null, output: '', exitCode, signal: null })

let publisher: RecordingPublisher
let windows: AppWindowState[]
let focused: Id | null
let foreground: Id | null
let changes: FileChangeDto[]
let watching: Set<Id>
let service: NoticeService

const notices = (): NoticeDto[] => publisher.payloads('desktop.notice')

beforeEach(() => {
  publisher = new RecordingPublisher()
  windows = []
  focused = null
  foreground = null
  changes = []
  watching = new Set()
  const desktopOf: Record<Id, Id> = { [BUILDER]: DESKTOP, [REVIEWER]: DESKTOP, [ELSEWHERE]: OTHER_DESKTOP }
  service = new NoticeService({
    sessions: { get: (id) => (id in desktopOf ? { desktopId: desktopOf[id] } : null) },
    changes: { list: () => changes },
    comments: { getComment: (id) => ({ path: id === 3 ? 'src/login.ts' : 'src/auth.ts' }) },
    identity: (id) => ({ name: id === REVIEWER ? 'Reviewer' : id === ELSEWHERE ? 'Other' : 'Builder', color: '#3b7dd8' }),
    desktops: {
      state: (desktopId) => ({ desktopId, windows, focusedWindowId: focused }) as unknown as DesktopState,
      foregroundSessionId: () => foreground
    },
    watching: (_desktopId, sessionId) => watching.has(sessionId),
    events: publisher,
    now: () => new Date('2026-11-17T10:00:00Z')
  })
})

const reviewed = (by: Id, reviewSession: Id, commentIds: Id[]): void => service.onEvent({ name: 'review.changed', payload: { desktopId: DESKTOP, sessionId: reviewSession, commentIds, by } })
const boardChanged = (by: Id | null, cards: CardChange[], boardId = 5): void => service.onEvent({ name: 'kanban.changed', payload: { desktopId: DESKTOP, boardId, cards, by } })

describe('NoticeService: turn summaries', () => {
  it('a background chat that ends its turn gets one summary in outcome words, with one action', () => {
    service.turnStarted(BUILDER)
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices()).toEqual([
      {
        desktopId: DESKTOP,
        id: 'notice-1',
        kind: 'summary',
        title: 'Chat finished',
        text: 'Builder finished',
        identity: { name: 'Builder', color: '#3b7dd8' },
        sessionId: BUILDER,
        actions: [{ id: 'notice-1-action', label: 'Open chat', target: { kind: 'chat', sessionId: BUILDER } }],
        at: '2026-11-17T10:00:00.000Z'
      }
    ])
  })

  it('counts the files the turn changed and the commands it ran; the action reviews the changes', () => {
    changes = [change(1, 'E:\\old.ts')]
    service.turnStarted(BUILDER)
    changes = [change(1, 'E:\\old.ts'), change(2, 'E:\\a.ts'), change(3, 'E:\\b.ts')]
    service.onEvent({ name: 'changes.changed', payload: { sessionId: BUILDER, changes } })
    service.onEvent({ name: 'terminal.changed', payload: run(1, 'npm', ['test'], null) })
    service.onEvent({ name: 'terminal.changed', payload: run(1, 'npm', ['test'], 0) })
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices()).toHaveLength(1)
    expect(notices()[0]).toMatchObject({ text: 'Builder finished: changed 2 files, ran tests (passed)', actions: [{ label: 'Review changes', target: { kind: 'changes', sessionId: BUILDER, path: 'E:\\a.ts' } }] })
  })

  it('a file changed again in this turn counts; one the turn did not touch does not', () => {
    changes = [change(1, 'E:\\a.ts', 'v1'), change(2, 'E:\\b.ts', 'v1')]
    service.turnStarted(BUILDER)
    changes = [change(1, 'E:\\a.ts', 'v2'), change(2, 'E:\\b.ts', 'v1')]
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices()[0]?.text).toBe('Builder finished: changed 1 file')
  })

  it('says when a turn stopped with an error, and opens the chat', () => {
    service.turnStarted(BUILDER)
    service.onEvent({ name: 'terminal.changed', payload: run(1, 'npm', ['run', 'build'], 2) })
    service.turnEnded(BUILDER, { error: 'The agent stopped unexpectedly\nstack...' })
    expect(notices()[0]).toMatchObject({ title: 'Chat stopped', text: 'Builder stopped with an error: The agent stopped unexpectedly. It ran npm run build (failed).', actions: [{ label: 'Open chat' }] })
  })

  it('says a refusal and the token limit in words', () => {
    service.turnStarted(BUILDER)
    service.turnEnded(BUILDER, { stopReason: 'max_tokens' })
    service.turnStarted(BUILDER)
    service.turnEnded(BUILDER, { stopReason: 'refusal' })
    expect(notices().map((n) => n.text)).toEqual(['Builder stopped: it reached its token limit.', 'Builder refused to go on.'])
  })

  it('tells nothing about a turn the operator stopped (Stop, Pause)', () => {
    service.turnStarted(BUILDER)
    service.turnEnded(BUILDER, { stopReason: 'cancelled' })
    expect(notices()).toEqual([])
  })
})

describe('NoticeService: the foreground chat', () => {
  it('gets no notice: the operator is watching it', () => {
    foreground = BUILDER
    service.turnStarted(BUILDER)
    reviewed(BUILDER, REVIEWER, [1, 2])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices()).toEqual([])
  })

  it('a member of the focused Team Chat room is watched too', () => {
    watching.add(BUILDER)
    service.turnStarted(BUILDER)
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices()).toEqual([])
  })

  it('is decided when the turn ends, not when it starts', () => {
    foreground = BUILDER
    service.turnStarted(BUILDER)
    foreground = null // the operator went to another window meanwhile
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices()).toHaveLength(1)
  })
})

describe('NoticeService: output, one notice per turn per kind', () => {
  it('review comments: one notice for all of the turn, naming the file, landing on the first new comment', () => {
    windows = [reviewWin(7, REVIEWER), chatWin(8, 99)]
    focused = 8
    service.turnStarted(REVIEWER)
    reviewed(REVIEWER, REVIEWER, [1])
    reviewed(REVIEWER, REVIEWER, [2])
    reviewed(REVIEWER, REVIEWER, [2, 4])
    service.turnEnded(REVIEWER, { stopReason: 'end_turn' })
    // The comments have their notice; a turn that left nothing else needs no summary.
    expect(notices()).toHaveLength(1)
    expect(notices()[0]).toMatchObject({ kind: 'review', title: 'New review comments', text: 'Reviewer left 3 comments on auth.ts', actions: [{ label: 'Open review', target: { kind: 'review', sessionId: REVIEWER, commentId: 1 } }] })
    expect(notices()[0]?.actions).toHaveLength(1)
  })

  it('review comments on several files say how many', () => {
    service.turnStarted(BUILDER)
    reviewed(BUILDER, REVIEWER, [1, 3])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices()[0]?.text).toBe('Builder left 2 comments on 2 files')
  })

  it('review comments shown in the focused Code Review window are live: no notice', () => {
    windows = [reviewWin(7, REVIEWER)]
    focused = 7
    service.turnStarted(BUILDER)
    reviewed(BUILDER, REVIEWER, [1])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices().filter((n) => n.kind === 'review')).toEqual([])
  })

  it('the user\'s own comments and cards are nobody\'s output', () => {
    service.turnStarted(BUILDER)
    service.onEvent({ name: 'review.changed', payload: { desktopId: DESKTOP, sessionId: REVIEWER, commentIds: [1] } })
    boardChanged(null, [{ cardId: 1, title: 'x', kind: 'moved', column: 'Done' }])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices().map((n) => n.kind)).toEqual(['summary'])
  })

  it('board changes: one card in words, several counted; Open board selects a card that is still there', () => {
    service.turnStarted(BUILDER)
    boardChanged(BUILDER, [{ cardId: 1, title: 'Login bug', kind: 'moved', column: 'Done' }])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    service.turnStarted(BUILDER)
    boardChanged(BUILDER, [{ cardId: 1, title: 'A', kind: 'deleted' }])
    boardChanged(BUILDER, [{ cardId: 2, title: 'B', kind: 'added', column: 'To do' }])
    boardChanged(BUILDER, [{ cardId: 2, title: 'B', kind: 'moved', column: 'Doing' }])
    boardChanged(BUILDER, [{ cardId: 3, title: 'C', kind: 'updated', column: 'Doing' }])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    const board = notices().filter((n) => n.kind === 'board')
    expect(board.map((n) => n.text)).toEqual(["Builder moved card 'Login bug' to Done", 'Builder changed 3 cards'])
    expect(board.map((n) => n.actions[0]?.target)).toEqual([
      { kind: 'board', boardId: 5, cardId: 1 },
      { kind: 'board', boardId: 5, cardId: 2 }
    ])
  })

  it('board changes on the focused Kanban window are live: no notice', () => {
    windows = [kanbanWin(4, 5)]
    focused = 4
    service.turnStarted(BUILDER)
    boardChanged(BUILDER, [{ cardId: 1, title: 'Login bug', kind: 'moved', column: 'Done' }])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices().filter((n) => n.kind === 'board')).toEqual([])
  })

  it('diagram output with the window behind: Open diagram goes to that window; read tools and failures are not output', () => {
    windows = [diagramsWin(3), chatWin(8, 99)]
    focused = 8
    service.turnStarted(BUILDER)
    service.toolFinished(BUILDER, 'diagram_read', false)
    service.toolFinished(BUILDER, 'paint_draw', true)
    service.toolFinished(BUILDER, 'diagram_add', false)
    service.toolFinished(BUILDER, 'diagram_update', false)
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices()).toHaveLength(1)
    expect(notices()[0]).toMatchObject({ kind: 'output', title: 'Diagram updated', text: 'Builder updated the diagram', actions: [{ label: 'Open diagram', target: { kind: 'window', app: 'diagrams', windowId: 3 } }] })
  })

  it('diagram output in the focused Diagrams window is live: no notice', () => {
    windows = [diagramsWin(3)]
    focused = 3
    service.turnStarted(BUILDER)
    service.toolFinished(BUILDER, 'diagram_add', false)
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices().filter((n) => n.kind === 'output')).toEqual([])
  })

  it('output and a summary with more to say both come, each with one action', () => {
    service.turnStarted(BUILDER)
    changes = [change(2, 'E:\\a.ts')]
    boardChanged(BUILDER, [{ cardId: 1, title: 'Login bug', kind: 'moved', column: 'Done' }])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    expect(notices().map((n) => [n.kind, n.actions.length])).toEqual([
      ['board', 1],
      ['summary', 1]
    ])
  })
})

describe('NoticeService: scoping', () => {
  it('a notice goes to the desktop of the session it is about', () => {
    service.turnStarted(ELSEWHERE)
    service.turnEnded(ELSEWHERE, { stopReason: 'end_turn' })
    expect(notices().map((n) => n.desktopId)).toEqual([OTHER_DESKTOP])
  })

  it('what one session does is not told as another\'s, and a turn that never started tells nothing', () => {
    service.turnStarted(BUILDER)
    reviewed(ELSEWHERE, REVIEWER, [1])
    service.turnEnded(BUILDER, { stopReason: 'end_turn' })
    service.turnEnded(REVIEWER, { stopReason: 'end_turn' })
    expect(notices().map((n) => [n.kind, n.sessionId])).toEqual([['summary', BUILDER]])
  })

  it('a chat on no desktop gets nothing', () => {
    service.turnStarted(404)
    service.turnEnded(404, { stopReason: 'end_turn' })
    expect(notices()).toEqual([])
  })
})

describe('describeRuns and describeCards', () => {
  it('words for commands', () => {
    expect(describeRuns([])).toBeNull()
    expect(describeRuns([run(1, 'npx', ['vitest', 'run'], 1)])).toBe('ran tests (failed)')
    expect(describeRuns([run(1, 'ls', [], null)])).toBe('ran ls')
    expect(describeRuns([run(1, 'echo', ['a-very-long-argument-that-goes-on-and-on'], 0)])).toBe('ran echo a-very-long-argument-that-… (passed)')
    expect(describeRuns([run(1, 'ls', [], 0), run(2, 'pwd', [], 0)])).toBe('ran 2 commands (all passed)')
    expect(describeRuns([run(1, 'ls', [], 0), run(2, 'false', [], 1)])).toBe('ran 2 commands (1 failed)')
  })

  it('words for cards', () => {
    expect(describeCards('B', [{ cardId: 1, title: 'X', kind: 'added', column: 'To do' }])).toBe("B added card 'X' to To do")
    expect(describeCards('B', [{ cardId: 1, title: 'X', kind: 'updated' }])).toBe("B changed card 'X'")
    expect(describeCards('B', [{ cardId: 1, title: 'X', kind: 'deleted' }])).toBe("B deleted card 'X'")
  })
})
