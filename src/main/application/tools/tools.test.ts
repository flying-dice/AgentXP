import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, closedAppMessage, type ToolGroup } from '@shared/desktop'
import type { Bounds } from '@shared/desktop'
import type { FileChangeDto } from '@shared/models'
import { SqliteAppWindowRepository } from '../../infrastructure/db/sqlite-app-window-repository'
import { SqliteStickyNoteRepository } from '../../infrastructure/db/sqlite-sticky-note-repository'
import { SqliteToolPolicyRepository } from '../../infrastructure/db/sqlite-tool-policy-repository'
import { DesktopService } from '../desktop/DesktopService'
import { PAUSED_MESSAGE } from '../desktop/AppToolPolicy'
import { ToolGateway } from '../desktop/ToolGateway'
import { createVfsFixture } from '../test-helpers'
import { TOOL_SPECS, specsForGroups, type ToolHandlers } from './catalog'
import { ADMIN_TOOL_DEFS } from './adminCatalog'
import { createBrowserTools, formatRead, formatTabs, normalizeUrl } from './browserTools'
import { MAX_READ_CHARS, MAX_READ_LINE_CHARS, createCodeTools } from './codeTools'
import { DesktopToolService } from './DesktopToolService'
import { createFsTools, nameMatcher } from './fsTools'
import { FileSearch } from '../vfs/FileSearch'
import { createNotepadTools } from './notepadTools'
import type { ActionResult, AppRequests, BrowserDriver, BrowserGuard, CommandRunner, PageContent, PageInfo } from './ports'
import { createEventsTools } from './eventsTools'
import { createNotesTools } from './notesTools'
import { createBoardTools } from './boardTools'
import { KanbanService } from '../kanban/KanbanService'
import { SqliteKanbanRepository } from '../../infrastructure/db/sqlite-kanban-repository'
import { createPaintTools } from './paintTools'
import { createDiagramTools } from './diagramTools'
import { createRecycleTools } from './recycleTools'
import { createReviewTools } from './reviewTools'
import { createSnipTools } from './snipTools'
import { createWordpadTools } from './wordpadTools'
import { ProtocolEventLog } from '../events/ProtocolEventLog'
import { StickyNoteService } from '../desktop/StickyNoteService'
import { createShellTools } from './shellTools'
import { createChatTools } from './chatTools'
import { createTerminalTools } from './terminalTools'
import { createShowTools } from './showTools'
import { ShowService } from '../show/ShowService'
import { ShowTargets } from '../show/ShowTargets'
import { ToolPaths } from './ToolPaths'
import type { TerminalActivity } from '../ports'
import { textResult, type ToolResult } from './types'

/** The admin tools (Task Scheduler, Teams, ...) are exercised in adminTools.test.ts; here they only fill the handler map. */
const adminStubs = Object.fromEntries(Object.keys(ADMIN_TOOL_DEFS).map((name) => [name, async () => textResult('stub')])) as unknown as ToolHandlers<keyof typeof ADMIN_TOOL_DEFS>

const textOf = (r: ToolResult): string => r.content.map((c) => (c.type === 'text' ? c.text : `<${c.type}>`)).join('\n')

class FakeDriver implements BrowserDriver {
  calls: string[] = []
  fail: string | null = null
  guards: BrowserGuard[] = []
  private page: PageInfo = { title: 'Example', url: 'https://example.com/' }
  private go(label: string, url?: string): PageInfo {
    if (this.fail) throw new Error(this.fail)
    this.calls.push(label)
    if (url) this.page = { title: 'Loaded', url }
    return this.page
  }
  private act(label: string, guard?: BrowserGuard): ActionResult {
    if (guard) this.guards.push(guard)
    return { ...this.go(label), box: { x: 1, y: 2, width: 3, height: 4 } }
  }
  async navigate(_w: number, url: string) {
    return this.go(`navigate:${url}`, url)
  }
  async read(_w: number, mode: 'text' | 'tree'): Promise<PageContent> {
    return { ...this.go(`read:${mode}`), lines: Array.from({ length: 300 }, (_, i) => (i === 0 ? '[1] link "More" -> https://example.com/more' : `text "line ${i}"`)) }
  }
  async find(_w: number, query: { text?: string; role?: string }) {
    this.go(`find:${query.text ?? query.role}`)
    return query.text === 'none' ? [] : [{ ref: 5, description: 'button "Send"', context: 'composer' }]
  }
  async screenshot() {
    this.go('screenshot')
    return 'UE5H'
  }
  async click(_w: number, ref: number, o: { button: string; double: boolean }, guard: BrowserGuard) {
    return this.act(`click:${ref}:${o.button}:${o.double}`, guard)
  }
  async type(_w: number, ref: number | undefined, text: string, submit: boolean, guard: BrowserGuard) {
    return this.act(`type:${ref}:${text}:${submit}`, guard)
  }
  async press(_w: number, keys: string, guard: BrowserGuard) {
    return this.act(`press:${keys}`, guard)
  }
  async scroll(_w: number, t: { ref?: number; direction: string; amount?: number }, guard: BrowserGuard) {
    return { ...this.act(`scroll:${t.direction}:${t.ref}:${t.amount}`, guard), note: 'page scrolled 0 of 100 px down' }
  }
  async wait(_w: number, q: { text?: string; ref?: number; timeoutMs: number }, guard: BrowserGuard) {
    this.guards.push(guard)
    this.go(`wait:${q.text ?? q.ref}:${q.timeoutMs}`)
    return { found: q.text !== 'never', waitedMs: 12 }
  }
  async select(_w: number, ref: number, option: string, guard: BrowserGuard) {
    return this.act(`select:${ref}:${option}`, guard)
  }
  async elementOf(_w: number, ref: number) {
    if (ref === 404) return undefined
    return ref === 2 ? { role: 'textbox', name: 'Message' } : { role: 'button', name: 'Send' }
  }
  async locate(_w: number, ref: number) {
    this.calls.push(`locate:${ref}`)
    return { x: 10, y: 20, width: 30, height: 40 }
  }
  async back() {
    return this.go('back')
  }
  async forward() {
    return this.go('forward')
  }
  async reload() {
    return this.go('reload')
  }
}

let f: Awaited<ReturnType<typeof createVfsFixture>>
let paths: ToolPaths
let desktops: DesktopService
let desktopId: number
let sessionId: number
let driver: FakeDriver
let browserRequests: AppRequests & { sent: { method: string; params: unknown }[]; reply: unknown }
let asked: string[]
let allowAsk: boolean
let ran: { command: string; cwd: string }[]
let recorded: [number, TerminalActivity][]
let runCounter: number
let tools: DesktopToolService
let changes: FileChangeDto[]
let appCalls: { windowId: number; method: string; params: unknown }[]
let appAnswers: Record<string, unknown>
let written: { sessionId: number; path: string; text: string }[]
let captures: (Bounds | undefined)[]
let restored: number[]
let eventLog: ProtocolEventLog
let noteService: StickyNoteService
let shows: ShowService

const run = (tool: string, args: unknown = {}): Promise<ToolResult> => tools.call({ sessionId, desktopId }, tool, args)

beforeEach(async () => {
  f = await createVfsFixture()
  // The project (E:) holds a small tree; node_modules and .git are there but hidden from the agent's listings.
  for (const dir of ['src', 'docs', 'node_modules/dep', '.git']) await mkdir(join(f.projectDir, dir), { recursive: true })
  const files: Record<string, string> = {
    'README.md': 'text of README.md',
    'notes.md': 'text of notes.md',
    'other.txt': 'text of other.txt',
    'src/app.ts': 'x',
    'src/app.test.ts': 'x',
    'docs/a.md': '# a',
    'node_modules/dep/index.js': 'x'
  }
  for (const [name, text] of Object.entries(files)) await writeFile(join(f.projectDir, name), text)
  desktops = new DesktopService({
    desktops: f.repos.desktops,
    windows: new SqliteAppWindowRepository(f.db),
    policies: new SqliteToolPolicyRepository(f.db),
    agents: f.repos.agents,
    sessions: f.repos.sessions,
    notes: new SqliteStickyNoteRepository(f.db),
    surfaces: f.repos.surfaces,
    chats: {
      keepAsChat: () => false,
      create: async (desktop, agentId, cwd, role) => f.repos.sessions.create({ agentId: agentId ?? f.agentId, desktopId: desktop, cwd, title: 'chat', role }),
      cancel: async () => {},
      remove: async () => {}
    },
    drives: f.drives,
    events: f.publisher
  })
  desktopId = f.desktop.id
  paths = new ToolPaths(f.vfs, f.repos.sessions)
  const chat = await desktops.newChat(desktopId, undefined, 'E:\\')
  sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
  driver = new FakeDriver()
  browserRequests = {
    sent: [],
    reply: { tabs: [{ id: 1, title: 'One', url: 'https://one.example/', active: true }] },
    request(_d, _w, method, params) {
      this.sent.push({ method, params })
      return Promise.resolve(this.reply)
    }
  }
  asked = []
  allowAsk = true
  ran = []
  recorded = []
  runCounter = 0
  changes = []
  const runner: CommandRunner = {
    run: async (command, options) => {
      ran.push({ command, cwd: options.cwd })
      if (command === 'close-terminal') for (const w of desktops.windowsOf(desktopId, 'terminal')) desktops.closeWindow(w.id)
      options.onOutput?.('line1\n')
      options.onOutput?.('line2\n')
      return { exitCode: command === 'fail' ? 2 : 0, timedOut: false, output: 'line1\nline2\n' }
    }
  }
  const ask = async (_id: number, title: string): Promise<boolean> => {
    asked.push(title)
    return allowAsk
  }
  desktops.attachOpenApproval(ask)
  const gateway = new ToolGateway({
    desktops,
    broker: { prompt: async () => ({ outcome: 'selected', optionId: 'allow' }), observe: () => () => {} },
    events: { publish: () => {} }
  })
  appCalls = []
  appAnswers = {}
  written = []
  captures = []
  restored = []
  eventLog = new ProtocolEventLog({ desktopOfSession: () => desktopId, events: { publish: () => {} } })
  noteService = new StickyNoteService({ notes: new SqliteStickyNoteRepository(f.db), events: f.publisher, desktops })
  const requests = {
    request: async (_desktop: number, windowId: number, method: string, params: unknown) => {
      appCalls.push({ windowId, method, params })
      if (appAnswers['fail']) throw new Error(String(appAnswers['fail']))
      return appAnswers[method]
    }
  }
  const recycle = {
    list: () => [{ id: 4, desktopId, sessionId, path: 'a.txt', revertedText: 'x', restoredText: null, revertedAt: '2026-01-01T00:00:00.000Z' }],
    restore: async (id: number) => void restored.push(id)
  }
  const kanbanService = new KanbanService({ kanban: new SqliteKanbanRepository(f.db), events: f.publisher })
  shows = new ShowService({
    desktops,
    identity: () => ({ name: 'Builder', color: '#2a6' }),
    ask,
    targets: new ShowTargets({
      desktops,
      paths,
      files: { stat: (id, path) => f.vfs.stat(id, path) },
      changes: { list: () => changes },
      comments: { getComment: () => null },
      boards: kanbanService,
      requests,
      browser: driver
    }),
    events: f.publisher,
    sleep: async () => {}
  })
  tools = new DesktopToolService({
    states: desktops,
    log: {
      called: (c, t, a) => eventLog.recordToolCall(c, t, a),
      finished: (c, t, r, refused) => eventLog.recordToolResult(c, t, r, refused)
    },
    gate: gateway,
    handlers: {
      ...createShellTools({ desktops, paths }),
      ...createChatTools({ desktops, sessions: f.repos.sessions, transcripts: f.repos.transcripts }),
      ...createFsTools({ vfs: f.vfs, search: new FileSearch(f.vfs), paths }),
      ...createNotepadTools({ desktops, vfs: f.vfs, paths }),
      ...createCodeTools({
        desktops,
        paths,
        vfs: f.vfs,
        search: new FileSearch(f.vfs),
        // Writes for real and records the change the way SessionFiles does, so code_edit / code_write can be read back.
        files: {
          write: async (id, path, text) => {
            await f.vfs.writeFile(desktopId, path, text)
            changes = [...changes.filter((c) => c.path !== path), { id: 30 + changes.length, sessionId: id, path, kind: 'modified', additions: 1, deletions: 1 } as FileChangeDto]
          }
        }
      }),
      ...createTerminalTools({ desktops, runner, vfs: f.vfs, paths, terminals: { record: (id, a) => void recorded.push([id, a]) }, newTerminalId: () => `run-${++runCounter}` }),
      ...createBrowserTools({ desktops, driver, requests: browserRequests }),
      ...createShowTools({ shows }),
      ...createPaintTools({ desktops, requests }),
      ...createWordpadTools({
        desktops,
        vfs: f.vfs,
        paths,
        requests,
        files: { write: async (sessionId, path, text) => void written.push({ sessionId, path, text }) }
      }),
      ...createDiagramTools({
        desktops,
        vfs: f.vfs,
        paths,
        requests,
        files: { write: async (sessionId, path, text) => void written.push({ sessionId, path, text }) }
      }),
      ...createNotesTools({ notes: noteService }),
      ...createBoardTools({ kanban: kanbanService }),
      ...createEventsTools({ log: eventLog }),
      ...createSnipTools({
        desktops,
        screen: {
          capture: async (_id, region) => {
            captures.push(region)
            return 'data:image/png;base64,UE5H'
          }
        }
      }),
      ...createRecycleTools({ recycle: recycle as never }),
      ...createReviewTools({ reviews: {} as never }), // exercised in reviewTools.test.ts
      ...adminStubs
    }
  })
})

describe('tool catalog', () => {
  it('groups the tools as documented', () => {
    const byGroup = (g: ToolGroup): string[] => specsForGroups([g]).map((s) => s.name)
    expect(byGroup('shell')).toEqual(['desktop_state', 'drives_list', 'desktop_open_app', 'review_open', 'desktop_close_app', 'chats_list', 'chat_read', 'chat_open'])
    expect(byGroup('fs.read')).toEqual(['fs_list', 'fs_find', 'code_read', 'code_search'])
    expect(byGroup('fs.write')).toEqual(['code_edit', 'code_write'])
    expect(byGroup('notepad')).toEqual(['notepad_open', 'notepad_read'])
    expect(byGroup('show')).toEqual(['show', 'code_open', 'code_reveal', 'code_show_diff'])
    expect(byGroup('terminal')).toEqual(['terminal_run', 'terminal_read'])
    expect(byGroup('browser')).toEqual([
      'browser_navigate',
      'browser_read',
      'browser_find',
      'browser_screenshot',
      'browser_click',
      'browser_type',
      'browser_press',
      'browser_scroll',
      'browser_wait',
      'browser_select',
      'browser_tabs',
      'browser_back',
      'browser_forward',
      'browser_reload'
    ])
    expect(byGroup('paint')).toEqual(['paint_draw', 'paint_read', 'paint_clear', 'paint_resize'])
    expect(byGroup('wordpad')).toEqual(['wordpad_open', 'wordpad_read', 'wordpad_write'])
    expect(byGroup('notes')).toEqual(['notes_list', 'notes_add', 'notes_update', 'notes_remove'])
    expect(byGroup('events')).toEqual(['events_query'])
    expect(byGroup('snip')).toEqual(['screen_capture'])
    expect(byGroup('recycle')).toEqual(['recycle_list', 'recycle_restore'])
    expect(byGroup('board')).toHaveLength(12)
    expect(byGroup('diagrams')).toEqual([
      'diagram_new',
      'diagram_stencils',
      'diagram_add',
      'diagram_update',
      'diagram_delete',
      'diagram_layout',
      'diagram_arrange',
      'diagram_pages',
      'diagram_select',
      'diagram_read',
      'diagram_export',
      'diagram_save',
      'diagram_open'
    ])
    expect(byGroup('review')).toEqual(['review_list_changes', 'review_read_diff', 'review_add_comment', 'review_submit'])
    expect(byGroup('scheduler')).toEqual(['scheduler_list', 'scheduler_get', 'scheduler_create', 'scheduler_update', 'scheduler_delete', 'scheduler_enable', 'scheduler_run', 'scheduler_end', 'scheduler_clear_history'])
    expect(byGroup('teams')).toEqual(['profile_list', 'profile_create', 'profile_update', 'profile_delete', 'team_list', 'team_create', 'team_update', 'team_delete'])
    expect(byGroup('rooms')).toEqual(['room_list', 'room_read', 'room_create', 'room_rename', 'room_delete', 'room_post', 'room_stop'])
    expect(byGroup('settings')).toHaveLength(18)
    expect(byGroup('taskmgr')).toEqual(['taskmgr_chats', 'taskmgr_processes', 'taskmgr_terminals', 'taskmgr_open_chat', 'taskmgr_end_task', 'taskmgr_end_process'])
    expect(byGroup('help')).toEqual(['help_search', 'help_read'])
    expect(TOOL_SPECS).toHaveLength(130)
  })

  it('lists every group but those of closed output apps, falling back to shell for an unknown desktop', () => {
    expect(tools.enabledGroups(desktopId)).toEqual(['shell', 'fs.read', 'fs.write', 'notepad', 'show', 'terminal', 'wordpad', 'notes', 'events', 'snip', 'recycle', 'board', 'scheduler', 'teams', 'rooms', 'settings', 'taskmgr', 'help'])
    desktops.openWindow({ desktopId, app: 'browser' })
    expect(tools.enabledGroups(desktopId)).toContain('browser')
    expect(tools.enabledGroups(999)).toEqual(['shell'])
  })
})

describe('DesktopToolService gating', () => {
  it('returns an MCP error result with the open-the-app message when an output app is closed', async () => {
    const res = await run('browser_read')
    expect(res.isError).toBe(true)
    expect(textOf(res)).toBe(closedAppMessage('browser'))
    expect(driver.calls).toEqual([])
  })

  it('does not gate Work tools on open apps: reading, listing and running work with nothing open', async () => {
    for (const w of desktops.state(desktopId).windows) desktops.closeWindow(w.id)
    expect((await run('fs_list')).isError).toBeUndefined()
    expect((await run('code_read', { path: 'README.md' })).isError).toBeUndefined()
    expect(textOf(await run('terminal_run', { command: 'ls' }))).toContain('[exit code 0]')
    expect(desktops.state(desktopId).windows).toEqual([])
  })

  it('rejects unknown tools and bad arguments', async () => {
    expect(textOf(await run('rm_rf'))).toMatch(/Unknown tool/)
    expect(textOf(await run('desktop_open_app', { app: 'chat' }))).toMatch(/Invalid arguments/)
  })

  it('refuses everything but desktop_state while paused', async () => {
    await desktops.setPaused(desktopId, true)
    expect(textOf(await run('desktop_open_app', { app: 'terminal' }))).toBe(PAUSED_MESSAGE)
    expect(JSON.parse(textOf(await run('desktop_state'))).paused).toBe(true)
  })

  it('refuses a denied group even when the app is open', async () => {
    desktops.openWindow({ desktopId, app: 'browser' })
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, browser: 'deny' } })
    expect(textOf(await run('browser_read'))).toMatch(/blocked/)
  })
})

describe('shell tools', () => {
  it('opens an output app behind the focused window, which enables its tools, and closes it again', async () => {
    const chat = desktops.state(desktopId).focusedWindowId
    const opened = await run('desktop_open_app', { app: 'browser' })
    expect(textOf(opened)).toMatch(/Opened Browser window \d+ .*behind the user's window/)
    const state = desktops.state(desktopId)
    const browser = state.windows.find((w) => w.app === 'browser')!
    expect(state.tools).toContain('browser')
    expect(browser).toMatchObject({ openedBy: 'agent', attention: true })
    expect(state.focusedWindowId).toBe(chat) // the focus stays with the user's chat
    expect(state.windows.at(-1)?.id).toBe(chat) // and the chat stays on top: the Browser is right behind it
    expect(textOf(await run('desktop_close_app', { app: 'browser' }))).toMatch(/Closed/)
    expect(desktops.state(desktopId).tools).not.toContain('browser')
    expect((await run('desktop_close_app', { app: 'browser' })).isError).toBe(true)
  })

  it('reuses an open singleton where it is, without raising or focusing it', async () => {
    const code = desktops.openWindow({ desktopId, app: 'code' })
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    const order = desktops.state(desktopId).windows.map((w) => w.id)
    await run('desktop_open_app', { app: 'code' })
    const state = desktops.state(desktopId)
    expect(state.windows.map((w) => w.id)).toEqual(order)
    expect(state.focusedWindowId).toBe(chat.id)
    expect(state.windows.find((w) => w.id === code.id)?.attention).toBe(true)
  })

  it('follows the "Agent may open apps" policy', async () => {
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'deny' })
    expect((await run('desktop_open_app', { app: 'browser' })).isError).toBe(true)
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'ask' })
    allowAsk = false
    expect(textOf(await run('desktop_open_app', { app: 'browser' }))).toMatch(/declined/)
    expect(desktops.state(desktopId).tools).not.toContain('browser')
    allowAsk = true
    expect((await run('desktop_open_app', { app: 'browser' })).isError).toBeUndefined()
    expect(asked).toEqual(['Open the Browser app', 'Open the Browser app'])
  })

  it('lists the drives (always on) and shows them in desktop_state', async () => {
    expect(textOf(await run('drives_list'))).toBe(
      'C:\\  Local Disk: your private system disk (home: C:\\Users\\Agent)\nE:\\  project: USB drive, a project the user plugged in (can be ejected at any time)'
    )
    expect(JSON.parse(textOf(await run('desktop_state'))).drives.map((d: { letter: string }) => d.letter)).toEqual(['C', 'E'])
    f.drives.eject(desktopId, 'E')
    expect(textOf(await run('drives_list'))).toBe('C:\\  Local Disk: your private system disk (home: C:\\Users\\Agent)')
  })

  it('opens an app at a path relative to the working directory or a full virtual path', async () => {
    await run('desktop_open_app', { app: 'explorer', path: 'src' })
    expect(desktops.windowsOf(desktopId, 'explorer')[0]?.view).toMatchObject({ path: 'E:\\src' })
    await run('desktop_open_app', { app: 'notepad', path: 'C:\\Users\\Agent\\Documents\\n.txt' })
    expect(desktops.windowsOf(desktopId, 'notepad')[0]?.view).toMatchObject({ path: 'C:\\Users\\Agent\\Documents\\n.txt' })
    expect(textOf(await run('desktop_open_app', { app: 'explorer', path: 'G:\\' }))).toMatch(/Drive G: is not plugged in/)
  })

  it('does not let the agent close the user\'s own windows', async () => {
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    expect(textOf(await run('desktop_close_app', { window: chat.id }))).toMatch(/belongs to the user/)
  })

  it('has no tool that moves the focus', async () => {
    expect(textOf(await run('desktop_focus_app', { app: 'notepad' }))).toMatch(/Unknown tool/)
  })
})

/** What the operator sees: the windows (their order, state and views) and the focus. Work tools must leave it alone. */
const screen = (): string => {
  const state = desktops.state(desktopId)
  return JSON.stringify({ windows: state.windows, focus: state.focusedWindowId })
}

describe('fs tools', () => {
  it('lists a directory (default: the chat\'s working directory) and finds files by name or glob; VPaths come back', async () => {
    expect(textOf(await run('fs_list'))).toBe('E:\\docs\\\nE:\\src\\\nE:\\notes.md\nE:\\other.txt\nE:\\README.md') // .git and node_modules hidden
    expect(textOf(await run('fs_list', { path: 'src' }))).toBe('E:\\src\\app.test.ts\nE:\\src\\app.ts')
    expect(textOf(await run('fs_list', { path: 'E:\\src' }))).toBe('E:\\src\\app.test.ts\nE:\\src\\app.ts')
    expect(textOf(await run('fs_list', { path: join(f.projectDir, 'src') }))).toBe('E:\\src\\app.test.ts\nE:\\src\\app.ts') // real paths inside a drive work too
    expect(textOf(await run('fs_find', { pattern: '*.test.ts' }))).toBe('E:\\src\\app.test.ts')
    expect(textOf(await run('fs_find', { pattern: 'readme' }))).toBe('E:\\README.md')
    expect(textOf(await run('fs_find', { pattern: 'dep' }))).toBe('No matches.') // node_modules is not searched
    expect(textOf(await run('fs_find', { pattern: 'app', limit: 1 }))).toBe('E:\\src\\app.test.ts\n(more not shown: raise limit or narrow the search)')
  })

  it('fs_find finds by a word in the file and opens nothing', async () => {
    const before = screen()
    expect(textOf(await run('fs_find', { containing: 'TEXT OF' }))).toBe('E:\\notes.md\nE:\\other.txt\nE:\\README.md')
    expect(textOf(await run('fs_find', { pattern: '*.md', containing: 'notes', path: 'E:\\' }))).toBe('E:\\notes.md')
    expect(screen()).toBe(before)
    expect(textOf(await run('fs_find', {}))).toMatch(/Give pattern/)
  })

  it('fs_find leaves an open Explorer as it is (no search, no folder change, no focus)', async () => {
    desktops.openWindow({ desktopId, app: 'explorer', path: 'C:\\' })
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    const before = screen()
    await run('fs_find', { pattern: 'readme' })
    await run('fs_list', { path: 'src' })
    expect(screen()).toBe(before)
  })

  it('lists C: (seeded) and refuses paths outside the drives and missing folders', async () => {
    expect(textOf(await run('fs_list', { path: 'C:\\Users\\Agent' }))).toBe('C:\\Users\\Agent\\Desktop\\\nC:\\Users\\Agent\\Documents\\\nC:\\Users\\Agent\\Downloads\\')
    expect((await run('fs_list', { path: '../etc' })).isError).toBe(true)
    expect(textOf(await run('fs_list', { path: '/etc' }))).toMatch(/Not a valid path/)
    expect(textOf(await run('fs_list', { path: 'nope' }))).toMatch(/ENOENT|no such/i)
  })

  it('refuses a drive that was ejected, at the very next call, and works again after plugging it in', async () => {
    expect((await run('fs_list')).isError).toBeUndefined()
    f.drives.eject(desktopId, 'E')
    const refused = await run('fs_list')
    expect(refused.isError).toBe(true)
    expect(textOf(refused)).toBe('Drive E: is not plugged in on this desktop. project was removed. Ask the user to open Computer and choose Plug in again.')
    expect(textOf(await run('fs_find', { pattern: 'a', path: 'E:\\src' }))).toMatch(/not plugged in/)
    expect(textOf(await run('fs_list', { path: 'C:\\Users' }))).toBe('C:\\Users\\Agent\\')
    f.drives.plugInFolder(desktopId, f.folder.id)
    expect((await run('fs_list')).isError).toBeUndefined()
  })

  it('matches names', () => {
    expect(nameMatcher('*.ts')('a.ts')).toBe(true)
    expect(nameMatcher('*.ts')('a.tsx')).toBe(false)
    expect(nameMatcher('a.b')('xA.bx')).toBe(true)
    expect(nameMatcher('a.b*')('axb')).toBe(false)
  })

  it('resolves tool paths: relative to the cwd, full VPaths, real paths inside a drive', () => {
    const context = { sessionId, desktopId }
    expect(paths.cwd(context)).toBe('E:\\')
    expect(paths.resolve(context)).toBe('E:\\')
    expect(paths.resolve(context, 'src/a.ts')).toBe('E:\\src\\a.ts')
    expect(paths.resolve(context, 'src\\..\\b.ts')).toBe('E:\\b.ts')
    expect(paths.resolve(context, 'c:/Users/Agent')).toBe('C:\\Users\\Agent')
    expect(paths.resolve(context, join(f.projectDir, 'x.ts'))).toBe('E:\\x.ts')
    expect(() => paths.resolve(context, '../x')).toThrow(/Not a valid path/)
    expect(() => paths.resolve(context, '/etc/passwd')).toThrow(/Not a valid path/)
    expect(() => paths.resolve(context, 'Q:\\x')).toThrow(/Drive Q: is not plugged in/)
  })
})

describe('notepad and code tools', () => {
  it('notepad_open opens the file behind the user\'s window (one window per file) and notepad_read reads it', async () => {
    desktops.openWindow({ desktopId, app: 'notepad' })
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    expect(textOf(await run('notepad_open', { path: 'notes.md' }))).toMatch(/behind the user's window/)
    expect(textOf(await run('notepad_open', { path: 'E:\\notes.md' }))).toMatch(/already shows/)
    expect(desktops.state(desktopId).focusedWindowId).toBe(chat.id)
    const pads = desktops.windowsOf(desktopId, 'notepad')
    expect(pads[1]).toMatchObject({ openedBy: 'agent', attention: true })
    expect(pads.map((w) => w.view)).toMatchObject([{ path: null }, { path: 'E:\\notes.md' }])
    expect(textOf(await run('notepad_read'))).toBe('text of notes.md')
    desktops.updateView(pads[1]!.id, { app: 'notepad', path: 'E:\\notes.md', dirty: true, caretLine: 1 })
    expect(textOf(await run('notepad_read'))).toMatch(/unsaved edits/)
    expect(textOf(await run('notepad_read', { path: 'other.txt' }))).toBe('text of other.txt')
    expect((await run('notepad_open', { path: 'missing.txt' })).isError).toBe(true)
  })

  it('show from the foreground chat: Code comes forward at exactly those lines, the focus stays in the chat', async () => {
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    const result = await run('show', { target: { kind: 'file', path: 'src/app.ts', lines: [40, 42] }, note: 'Here the token is checked' })
    expect(textOf(result)).toMatch(/^Shown now: app\.ts:40-42\n/)
    const code = desktops.windowsOf(desktopId, 'code')[0]!
    expect(code.view).toMatchObject({ app: 'code', tabs: ['E:\\src\\app.ts'], activePath: 'E:\\src\\app.ts', selection: { startLine: 40, endLine: 42 }, visibleLines: [40, 42] })
    const state = desktops.state(desktopId)
    expect(state.focusedWindowId).toBe(chat.id) // the operator keeps typing in the chat
    expect(state.windows.at(-1)?.id).toBe(code.id) // the target is in front
    expect(f.publisher.payloads('desktop.show').at(-1)).toMatchObject({ label: 'app.ts:40-42', note: 'Here the token is checked', identity: { name: 'Builder' }, spot: { kind: 'lines', windowId: code.id, lines: [40, 42] }, cursor: true })
  })

  it('show from a chat the operator is not in: a request notice with Show and Not now, nothing moves', async () => {
    desktops.openWindow({ desktopId, app: 'notepad' }) // the operator works in Notepad
    const before = screen()
    const result = await run('show', { target: { kind: 'file', path: 'README.md' }, note: 'The setup steps changed' })
    expect(textOf(result)).toMatch(/^Sent as a request: README\.md\n/)
    expect(screen()).toBe(before)
    expect(desktops.windowsOf(desktopId, 'code')).toEqual([])
    const notice = f.publisher.payloads('desktop.notice').at(-1)!
    expect(notice).toMatchObject({ kind: 'show', text: 'Builder wants to show you README.md: The setup steps changed' })
    expect(notice.actions.map((a) => a.label)).toEqual(['Show', 'Not now'])
    const showId = notice.actions[0]!.target.kind === 'show' ? notice.actions[0]!.target.showId : ''
    await shows.accept(desktopId, showId)
    // The operator asked: Code opens in front with the focus.
    const code = desktops.windowsOf(desktopId, 'code')[0]!
    expect(desktops.state(desktopId).focusedWindowId).toBe(code.id)
  })

  it('show refuses a stale target and opens nothing; Never keeps the transcript row only', async () => {
    const before = screen()
    expect(textOf(await run('show', { target: { kind: 'file', path: 'missing.ts' }, note: 'x' }))).toMatch(/There is no file E:\\missing\.ts/)
    expect(textOf(await run('show', { target: { kind: 'change', path: 'src/app.ts' }, note: 'x' }))).toMatch(/no recorded change/)
    expect(textOf(await run('show', { target: { kind: 'page-element', ref: 1 }, note: 'x' }))).toMatch(/Browser window is closed/)
    expect(textOf(await run('show', { target: { kind: 'card', boardId: 'Nope', cardId: 1 }, note: 'x' }))).toMatch(/does not exist/)
    expect(screen()).toBe(before)
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, show: 'deny' } })
    const never = await run('show', { target: { kind: 'file', path: 'README.md' }, note: 'x' })
    expect(never.isError).toBeUndefined()
    expect(textOf(never)).toMatch(/^Not shown \(Never\): README\.md/)
    expect(screen()).toBe(before)
  })

  it('show with the policy at Ask asks first; a declined show moves nothing', async () => {
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, show: 'ask' } })
    allowAsk = false
    expect(textOf(await run('show', { target: { kind: 'file', path: 'README.md' }, note: 'Look' }))).toMatch(/^Not shown \(declined\)/)
    expect(asked).toEqual(['Show you README.md'])
    expect(desktops.windowsOf(desktopId, 'code')).toEqual([])
    allowAsk = true
    expect(textOf(await run('show', { target: { kind: 'file', path: 'README.md' }, note: 'Look' }))).toMatch(/^Shown now/)
  })

  it('code_open, code_reveal and code_show_diff are aliases of show (the foreground rule applies)', async () => {
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    expect(textOf(await run('code_open', { path: 'src/app.ts', line: 40 }))).toMatch(/^Shown now: app\.ts:40/)
    let view = desktops.windowsOf(desktopId, 'code')[0]!.view
    expect(view).toMatchObject({ app: 'code', activePath: 'E:\\src\\app.ts', visibleLines: [40, 40] })
    const first = f.publisher.payloads('desktop.show').at(-1)!
    expect(first.note).toBe('The agent pointed you here without saying why.')
    // A second show waits until the operator is done with the first.
    expect(textOf(await run('code_reveal', { path: 'README.md', startLine: 3, endLine: 9, note: 'The intro' }))).toMatch(/^Queued: README\.md:3-9/)
    await shows.dismiss(desktopId, first.showId)
    view = desktops.windowsOf(desktopId, 'code')[0]!.view
    expect(view).toMatchObject({ activePath: 'E:\\README.md', visibleLines: [3, 9] })
    expect(f.publisher.payloads('desktop.showEnded').at(-1)).toMatchObject({ showId: first.showId, reason: 'dismissed' })
    changes = [{ id: 11, sessionId, path: 'E:\\src\\app.ts', kind: 'modified', additions: 3, deletions: 1, originalText: '', currentText: '' } as FileChangeDto]
    await shows.dismiss(desktopId, f.publisher.payloads('desktop.show').at(-1)!.showId)
    expect(textOf(await run('code_show_diff', { path: 'e:\\SRC\\app.ts', note: 'The fix' }))).toMatch(/^Shown now: the change of app\.ts/)
    expect(desktops.windowsOf(desktopId, 'code')[0]?.view).toMatchObject({ selectedChangeId: 11 })
    expect(textOf(await run('code_open', { path: 'G:\\x.ts' }))).toMatch(/Drive G: is not plugged in/)
  })

  it('show opens a new window only when "Agent may open apps" allows it', async () => {
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'deny' })
    expect(textOf(await run('show', { target: { kind: 'file', path: 'README.md' }, note: 'Look' }))).toMatch(/blocked by the permission policy/)
    expect(desktops.windowsOf(desktopId, 'code')).toEqual([])
  })

  it('show of a page element: the Browser comes forward and the box of the element is the spot', async () => {
    const browser = desktops.openWindow({ desktopId, app: 'browser', url: 'https://example.com/' })
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    expect(textOf(await run('show', { target: { kind: 'page-element', ref: 404 }, note: 'x' }))).toMatch(/not known on this page/)
    expect(textOf(await run('show', { target: { kind: 'page-element', ref: 5 }, note: 'This button sends it' }))).toMatch(/^Shown now: the button 'Send'/)
    expect(f.publisher.payloads('desktop.show').at(-1)?.spot).toEqual({ kind: 'page-box', windowId: browser.id, box: { x: 10, y: 20, width: 30, height: 40 } })
  })

  it('show of a card: Kanban comes forward with the card selected', async () => {
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    await run('board_create', { name: 'Sprint' })
    expect(textOf(await run('board_add_card', { board: 'Sprint', column: 'To do', title: 'Login bug' }))).toBeTruthy()
    const board = (await run('board_get', { board: 'Sprint' }))
    const cardId = Number(/Card \[(\d+)\] Login bug/.exec(textOf(board))?.[1])
    expect(textOf(await run('show', { target: { kind: 'card', boardId: 'Sprint', cardId }, note: 'This one is blocked' }))).toMatch(/^Shown now: card 'Login bug'/)
    const kanban = desktops.windowsOf(desktopId, 'kanban')[0]!
    expect(kanban.view).toMatchObject({ app: 'kanban', selectedCardId: cardId })
    expect(desktops.state(desktopId).focusedWindowId).toBe(chat.id)
    expect(textOf(await run('show', { target: { kind: 'card', boardId: 'Sprint', cardId: 9999 }, note: 'x' }))).toMatch(/has no card 9999/)
  })

  it('browser_click with a watching operator: the cursor is sent to the box first, then the click happens', async () => {
    const browserTools = createBrowserTools({
      desktops,
      driver,
      cursor: {
        pointAt: async (_context, _windowId, box) => {
          driver.calls.push(`point:${box.x},${box.y}`)
          return true
        }
      }
    })
    desktops.openWindow({ desktopId, app: 'browser', url: 'https://example.com/' })
    await browserTools.browser_click({ ref: 5 }, { desktopId, sessionId })
    await browserTools.browser_type({ ref: 2, text: 'hi' }, { desktopId, sessionId })
    await browserTools.browser_press({ keys: 'Enter' }, { desktopId, sessionId })
    expect(driver.calls).toEqual(['locate:5', 'point:10,20', 'click:5:left:false', 'locate:2', 'point:10,20', 'type:2:hi:false', 'press:Enter'])
  })

  it('code_read returns numbered lines and leaves an open Code window as it is', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    await writeFile(join(f.projectDir, 'src/long.ts'), Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n') + '\n')
    const before = screen()
    expect(textOf(await run('code_read', { path: 'src/long.ts' }))).toBe(`E:\\src\\long.ts, lines 1-10 of 10:\n${Array.from({ length: 10 }, (_, i) => `${i + 1}\tline ${i + 1}`).join('\n')}`)
    expect(textOf(await run('code_read', { path: 'src/long.ts', startLine: 3, endLine: 4 }))).toBe('E:\\src\\long.ts, lines 3-4 of 10:\n3\tline 3\n4\tline 4\n(6 more lines: read from startLine 5)')
    expect(screen()).toBe(before)
    expect(textOf(await run('code_read', { path: 'src/long.ts', startLine: 20 }))).toMatch(/has 10 lines/)
    expect(textOf(await run('code_read', { path: 'missing.ts' }))).toMatch(/ENOENT|no such/i)
  })

  it('Work tools open nothing and leave the focus alone: code_read, code_search, code_edit, code_write with no Code window', async () => {
    const before = screen()
    expect((await run('code_read', { path: 'README.md' })).isError).toBeUndefined()
    expect((await run('code_search', { query: 'text of' })).isError).toBeUndefined()
    expect((await run('code_write', { path: 'src/fresh.ts', text: 'export const fresh = 1\n' })).isError).toBeUndefined()
    expect((await run('code_edit', { path: 'src/fresh.ts', oldText: '= 1', newText: '= 2' })).isError).toBeUndefined()
    expect(screen()).toBe(before)
    expect(desktops.windowsOf(desktopId, 'code')).toEqual([])
  })

  it('code_search lists path:line:column matches and does not touch the Code window', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    const before = screen()
    const text = textOf(await run('code_search', { query: 'TEXT OF', include: '*.md' }))
    expect(text).toBe('2 results in 2 files (searched 3 files below E:\\).\nE:\\notes.md:1:1: text of notes.md\nE:\\README.md:1:1: text of README.md')
    expect(screen()).toBe(before)
    expect(textOf(await run('code_search', { query: 'nothing like this' }))).toMatch(/^No results\./)
    expect(textOf(await run('code_search', { query: '(', regex: true }))).toMatch(/Not a valid regular expression/)
  })

  it('code_edit replaces exact text once, records the change and highlights it where Code already shows the file', async () => {
    const code = desktops.openWindow({ desktopId, app: 'code' })
    desktops.updateView(code.id, { app: 'code', tabs: ['E:\\README.md', 'E:\\src\\app.ts'], activePath: 'E:\\src\\app.ts', visibleLines: null, selection: null, selectedChangeId: null })
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    await writeFile(join(f.projectDir, 'src/app.ts'), 'one\ntwo\nthree\ntwo\n')
    expect(textOf(await run('code_edit', { path: 'src/app.ts', oldText: 'missing', newText: 'x' }))).toMatch(/was not found/)
    expect(textOf(await run('code_edit', { path: 'src/app.ts', oldText: 'two', newText: 'x' }))).toMatch(/occurs 2 times/)
    expect(textOf(await run('code_edit', { path: 'src/app.ts', oldText: 'three', newText: 'THREE\nAND A HALF' }))).toBe('Edited E:\\src\\app.ts (lines 3-4).')
    expect(await f.vfs.readFile(desktopId, 'E:\\src\\app.ts')).toBe('one\ntwo\nTHREE\nAND A HALF\ntwo\n')
    // Same tabs, same active file, no change selected, focus where it was: only the changed lines are highlighted.
    expect(desktops.windowsOf(desktopId, 'code')[0]!.view).toMatchObject({ tabs: ['E:\\README.md', 'E:\\src\\app.ts'], activePath: 'E:\\src\\app.ts', visibleLines: [3, 4], selectedChangeId: null })
    expect(desktops.state(desktopId).focusedWindowId).toBe(chat.id)
    expect(textOf(await run('code_edit', { path: 'src/app.ts', oldText: 'two', newText: '2', replaceAll: true }))).toMatch(/2 places/)
    expect(await f.vfs.readFile(desktopId, 'E:\\src\\app.ts')).toBe('one\n2\nTHREE\nAND A HALF\n2\n')
  })

  it('code_edit edits several lines of a file with Windows line endings, copied from code_read (which shows no \\r)', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    await writeFile(join(f.projectDir, 'src/win.ts'), 'one\r\ntwo\r\nthree\r\n')
    expect(textOf(await run('code_edit', { path: 'src/win.ts', oldText: 'one\ntwo', newText: 'ONE\nTWO\nTWO AND A HALF' }))).toBe('Edited E:\\src\\win.ts (lines 1-3).')
    expect(await f.vfs.readFile(desktopId, 'E:\\src\\win.ts')).toBe('ONE\r\nTWO\r\nTWO AND A HALF\r\nthree\r\n')
  })

  it('code_edit refuses binary files and files that are not UTF-8, and leaves them as they were', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    const latin1 = Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a, 0x6f, 0x6e, 0x65, 0x0a]) // "café\none\n" in Windows-1252
    await writeFile(join(f.projectDir, 'src/latin1.txt'), latin1)
    expect(textOf(await run('code_edit', { path: 'src/latin1.txt', oldText: 'one', newText: 'two' }))).toMatch(/not UTF-8 text/)
    expect(Buffer.compare(await readFile(join(f.projectDir, 'src/latin1.txt')), latin1)).toBe(0)
    await writeFile(join(f.projectDir, 'src/blob.bin'), Buffer.from([0x6f, 0x6e, 0x65, 0x00, 0x01]))
    expect(textOf(await run('code_edit', { path: 'src/blob.bin', oldText: 'one', newText: 'two' }))).toMatch(/binary file/)
  })

  it('code_read cuts very long lines and stops before the result gets too big', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    await writeFile(join(f.projectDir, 'src/min.js'), `${'x'.repeat(MAX_READ_LINE_CHARS + 500)}\n`)
    expect(textOf(await run('code_read', { path: 'src/min.js' }))).toContain('[... 500 more characters]')
    await writeFile(join(f.projectDir, 'src/wide.js'), Array.from({ length: 200 }, () => 'y'.repeat(MAX_READ_LINE_CHARS)).join('\n'))
    const text = textOf(await run('code_read', { path: 'src/wide.js' }))
    expect(text.length).toBeLessThan(MAX_READ_CHARS + 1000)
    expect(text).toMatch(/more lines: read from startLine \d+/)
  })

  it('code_write creates or replaces a file and does not switch the Code window to it', async () => {
    desktops.openWindow({ desktopId, app: 'code', path: 'E:\\README.md' })
    const before = screen()
    expect(textOf(await run('code_write', { path: 'src/new.ts', text: 'a\nb\n' }))).toBe('Created E:\\src\\new.ts (2 lines).')
    expect(textOf(await run('code_write', { path: 'src/new.ts', text: 'c' }))).toBe('Replaced E:\\src\\new.ts (1 lines).')
    expect(await f.vfs.readFile(desktopId, 'E:\\src\\new.ts')).toBe('c')
    expect(screen()).toBe(before)
  })

  it('code_edit and code_write follow the "Writing files" permission (fs.write)', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    desktops.setPolicy({ ...desktops.policy(), groups: { ...desktops.policy().groups, 'fs.write': 'deny' } })
    expect((await run('code_write', { path: 'src/denied.ts', text: 'x' })).isError).toBe(true)
    await expect(f.vfs.readFile(desktopId, 'E:\\src\\denied.ts')).rejects.toThrow()
  })
})

describe('terminal tools', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'terminal' }))

  it('runs a command in a real folder behind the drive, shows it in the Terminal window and keeps the output for terminal_read', async () => {
    const res = await run('terminal_run', { command: 'echo hi', cwd: 'src' })
    expect(textOf(res)).toBe('line1\nline2\n[exit code 0]')
    expect(ran).toEqual([{ command: 'echo hi', cwd: join(f.projectDir, 'src') }])
    expect(desktops.windowsOf(desktopId, 'terminal')[0]?.view).toEqual({
      app: 'terminal',
      terminalId: 'run-1',
      cwd: 'E:\\src',
      runningCommand: null,
      lastLines: ['> echo hi', 'line1', 'line2']
    })
    expect(textOf(await run('terminal_read', { lines: 2 }))).toBe('line1\nline2')
  })

  it('records each run as a terminal of the chat: start, streamed output, exit code', async () => {
    await run('terminal_run', { command: 'echo hi', cwd: 'src' })
    await run('terminal_run', { command: 'fail' })
    const cwd = join(f.projectDir, 'src')
    expect(recorded.map(([id, a]) => [id, a.terminalId, a.command, a.delta, a.exitStatus])).toEqual([
      [sessionId, 'run-1', 'echo hi', '', null],
      [sessionId, 'run-1', 'echo hi', 'line1\n', null],
      [sessionId, 'run-1', 'echo hi', 'line2\n', null],
      [sessionId, 'run-1', 'echo hi', '', { exitCode: 0, signal: null }],
      [sessionId, 'run-2', 'fail', '', null],
      [sessionId, 'run-2', 'fail', 'line1\n', null],
      [sessionId, 'run-2', 'fail', 'line2\n', null],
      [sessionId, 'run-2', 'fail', '', { exitCode: 2, signal: null }]
    ])
    expect(recorded[0]![1]).toMatchObject({ args: [], cwd })
  })

  it('runs on C: and refuses an ejected drive without running anything', async () => {
    await run('terminal_run', { command: 'ls', cwd: 'C:\\Temp' })
    expect(ran).toEqual([{ command: 'ls', cwd: join(f.desktopsDir, String(desktopId), 'C', 'Temp') }])
    f.drives.eject(desktopId, 'E')
    const res = await run('terminal_run', { command: 'ls' })
    expect(res.isError).toBe(true)
    expect(textOf(res)).toMatch(/Drive E: is not plugged in/)
    expect(ran).toHaveLength(1)
  })

  it('reports a failing command as an error result', async () => {
    const res = await run('terminal_run', { command: 'fail' })
    expect(res.isError).toBe(true)
    expect(textOf(res)).toContain('[exit code 2]')
  })

  it('runs with the Terminal closed and opens nothing', async () => {
    for (const w of desktops.windowsOf(desktopId, 'terminal')) desktops.closeWindow(w.id)
    const before = screen()
    expect(textOf(await run('terminal_run', { command: 'echo hi' }))).toBe('line1\nline2\n[exit code 0]')
    expect(screen()).toBe(before)
    expect(recorded).toHaveLength(4)
  })

  it('finishes the run when the Terminal window is closed meanwhile, still recording the output for the chat', async () => {
    const res = await run('terminal_run', { command: 'close-terminal' })
    expect(textOf(res)).toBe('line1\nline2\n[exit code 0]')
    expect(desktops.windowsOf(desktopId, 'terminal')).toEqual([])
    expect(recorded.map(([, a]) => a.delta)).toEqual(['', 'line1\n', 'line2\n', ''])
  })

  it('says so when nothing ran yet', async () => {
    expect(textOf(await run('terminal_read'))).toMatch(/nothing has been run/)
  })
})

describe('browser tools', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'browser' }))

  const view = () => desktops.windowsOf(desktopId, 'browser')[0]!.view

  it('navigates, mirrors the page into the window view and reads it in pages', async () => {
    expect(textOf(await run('browser_navigate', { url: 'example.org' }))).toBe('Loaded https://example.org/ ("Loaded").')
    expect(view()).toMatchObject({ url: 'https://example.org/', title: 'Loaded', loading: false })
    const read = textOf(await run('browser_read'))
    expect(read).toContain('Lines 1-150 of 300 (tree). nextOffset: 150')
    expect(read).toContain('[1] link "More" -> https://example.com/more')
    const second = textOf(await run('browser_read', { offset: 150, limit: 200, mode: 'text' }))
    expect(second).toContain('Lines 151-300 of 300 (text). End of page.')
    expect(driver.calls).toContain('read:text')
  })

  it('formats an empty page and a continued page', () => {
    expect(formatRead({ title: 'T', url: 'u', lines: [] }, 'tree', undefined, undefined)).toContain('has no accessible content')
    expect(formatRead({ title: 'T', url: 'u', lines: ['a', 'b', 'c'], viewport: 'viewport 1x1' }, 'text', 1, 1)).toContain('nextOffset: 2')
  })

  it('returns the screenshot as image content', async () => {
    const res = await run('browser_screenshot')
    expect(res.content[1]).toEqual({ type: 'image', data: 'UE5H', mimeType: 'image/png' })
  })

  it('finds elements by text or role and says when nothing matched', async () => {
    expect(textOf(await run('browser_find', { text: 'Send' }))).toContain('[5] button "Send"  <- composer')
    expect(textOf(await run('browser_find', { text: 'none' }))).toMatch(/Nothing matched/)
    expect((await run('browser_find', {})).isError).toBe(true)
  })

  it('clicks, types, presses keys, scrolls, waits, selects and navigates history', async () => {
    await run('browser_click', { ref: 3 })
    await run('browser_click', { ref: 3, button: 'right', double: true })
    await run('browser_type', { ref: 2, text: 'hello', submit: true })
    await run('browser_type', { text: 'no ref' })
    await run('browser_press', { keys: 'Control+K' })
    await run('browser_scroll', { direction: 'up', ref: 7 })
    expect(textOf(await run('browser_scroll', {}))).toContain('page scrolled 0 of 100 px down')
    await run('browser_select', { ref: 4, option: 'Two' })
    expect(textOf(await run('browser_wait', { text: 'Hi' }))).toMatch(/Done waiting for "Hi"/)
    expect(textOf(await run('browser_wait', { text: 'never', timeoutMs: 100 }))).toMatch(/Timed out/)
    await run('browser_back')
    await run('browser_forward')
    await run('browser_reload')
    expect(driver.calls).toEqual([
      'click:3:left:false',
      'click:3:right:true',
      'type:2:hello:true',
      'type:undefined:no ref:false',
      'press:Control+K',
      'scroll:up:7:undefined',
      'scroll:down:undefined:undefined',
      'select:4:Two',
      'wait:Hi:5000',
      'wait:never:100',
      'back',
      'forward',
      'reload'
    ])
  })

  it('shows the user what the agent does: an activity request at the start and one with the box at the end', async () => {
    await run('browser_click', { ref: 3 })
    expect(browserRequests.sent.map((r) => r.method)).toEqual(['activity', 'activity'])
    expect(browserRequests.sent[0]!.params).toMatchObject({ label: "Clicking the button 'Send'" })
    expect(browserRequests.sent[1]!.params).toMatchObject({ box: { x: 1, y: 2, width: 3, height: 4 } })
  })

  it('names the element in plain words, without a ref, and announces reads too', async () => {
    await run('browser_type', { ref: 2, text: 'hi' })
    expect(browserRequests.sent[0]!.params).toMatchObject({ label: 'Typing into the message box' })
    browserRequests.sent.length = 0
    await run('browser_read')
    expect(browserRequests.sent.map((r) => r.method)).toEqual(['activity', 'activity'])
    expect(browserRequests.sent[0]!.params).toMatchObject({ label: 'Reading the page', reading: true })
    expect(browserRequests.sent[1]!.params).toMatchObject({ label: 'Reading the page', reading: false })
    for (const r of browserRequests.sent) expect(JSON.stringify(r.params)).not.toMatch(/\[\d+\]/)
  })

  it('marks the page as read when a read ends', async () => {
    await run('browser_read')
    expect(browserRequests.sent[0]!.params).not.toHaveProperty('read')
    expect(browserRequests.sent[1]!.params).toMatchObject({ read: true })
  })

  it('describes a wait in words, with the wanted page text only in the detail', async () => {
    await run('browser_wait', { text: 'Reacted (1)' })
    const params = browserRequests.sent[0]!.params as { label: string; detail?: string }
    expect(params.label).toBe('Waiting for the page to change')
    expect(params.label).not.toContain('Reacted')
    expect(params.detail).toBe('Waiting for the text "Reacted (1)" to show on the page.')
  })

  it('stops an action when the user pauses AgentXP or takes control meanwhile', async () => {
    await run('browser_click', { ref: 1 })
    const guard = driver.guards[0]!
    expect(() => guard()).not.toThrow()
    await desktops.setPaused(desktopId, true)
    expect(() => guard()).toThrow(/paused/)
    await desktops.setPaused(desktopId, false)
    desktops.setUserInControl(desktopId, true)
    expect(() => guard()).toThrow(/took control/)
    desktops.setUserInControl(desktopId, false)
  })

  it('lists, opens, switches and closes tabs through the Browser app', async () => {
    expect(textOf(await run('browser_tabs', { action: 'list' }))).toContain('* tab 1: One - https://one.example/')
    await run('browser_tabs', { action: 'new', url: 'example.net' })
    expect(browserRequests.sent.at(-1)).toEqual({ method: 'tabs', params: { action: 'new', url: 'https://example.net/', tab: undefined } })
    expect((await run('browser_tabs', { action: 'switch' })).isError).toBe(true)
    expect(formatTabs({ tabs: [], note: 'Closed.' })).toContain('No tabs.')
  })

  it('reports driver failures and clears the loading flag', async () => {
    driver.fail = 'The page failed to load'
    const res = await run('browser_navigate', { url: 'https://down.example/' })
    expect(res.isError).toBe(true)
    expect(textOf(res)).toBe('The page failed to load')
    expect(view()).toMatchObject({ loading: false })
  })

  it('addresses a window by id and complains about unknown ones', async () => {
    expect(textOf(await run('browser_read', { window: 9999 }))).toMatch(/not an open Browser window/)
  })

  it('only opens http(s) addresses', () => {
    expect(normalizeUrl('example.com/a')).toBe('https://example.com/a')
    expect(normalizeUrl('http://localhost:3000')).toBe('http://localhost:3000/')
    expect(normalizeUrl('localhost:3000')).toBe('https://localhost:3000/')
    expect(() => normalizeUrl('file:///etc/passwd')).toThrow(/http/)
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow(/http/)
  })

})

const PNG = 'data:image/png;base64,UE5H'

describe('new app groups: gating and listing', () => {
  it('lists the tools of an output app only while its window is open; the others always', () => {
    const listed = (): string[] => specsForGroups(tools.enabledGroups(desktopId)).map((s) => s.name)
    expect(listed()).not.toContain('paint_draw')
    expect(listed()).toEqual(expect.arrayContaining(['notes_add', 'wordpad_open', 'wordpad_read', 'recycle_list', 'events_query', 'screen_capture']))
    desktops.openWindow({ desktopId, app: 'paint' })
    expect(listed()).toEqual(expect.arrayContaining(['paint_draw', 'paint_read']))
    const paint = desktops.state(desktopId).windows.find((w) => w.app === 'paint')!
    desktops.closeWindow(paint.id)
    expect(listed()).not.toContain('paint_draw')
  })

  it('answers with the open-the-app hint while an output app is closed', async () => {
    expect(textOf(await run('paint_read'))).toBe(closedAppMessage('paint'))
    expect(textOf(await run('diagram_read'))).toBe(closedAppMessage('diagrams'))
    expect(textOf(await run('wordpad_read'))).toBe('No WordPad window is open. Call wordpad_open with a file first.')
    expect((await run('notes_list')).isError).toBeUndefined()
    expect((await run('events_query', {})).isError).toBeUndefined()
  })

  it('asks for WordPad and Recycle Bin by default (policy), allows the rest', async () => {
    desktops.openWindow({ desktopId, app: 'wordpad' })
    desktops.openWindow({ desktopId, app: 'recycle-bin' })
    desktops.openWindow({ desktopId, app: 'sticky-notes' })
    const approvals: string[] = []
    const asking = new ToolGateway({
      desktops,
      broker: {
        prompt: async () => {
          approvals.push('asked')
          return { outcome: 'selected', optionId: 'reject' }
        },
        observe: () => () => {}
      },
      events: { publish: () => {} }
    })
    await expect(asking.authorize(sessionId, { group: 'wordpad', title: 'x' })).rejects.toThrow(/declined/)
    await expect(asking.authorize(sessionId, { group: 'recycle', title: 'x' })).rejects.toThrow(/declined/)
    await expect(asking.authorize(sessionId, { group: 'notes', title: 'x' })).resolves.toBeUndefined()
    expect(approvals).toHaveLength(2)
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, notes: 'deny' } })
    expect(textOf(await run('notes_list'))).toMatch(/blocked/)
  })

  it('logs MCP tool calls as events, with refusals as warnings and failures as errors', async () => {
    desktops.openWindow({ desktopId, app: 'sticky-notes' })
    await run('notes_list')
    await run('notes_update', { id: 99, text: 'x' }) // error result
    await run('paint_read') // app closed: refused
    const events = eventLog.query({ desktopId, source: 'mcp' })
    expect(events.map((e) => `${e.direction}:${e.name}:${e.level}`)).toEqual([
      'in:notes_list:info',
      'out:notes_list:info',
      'in:notes_update:info',
      'out:notes_update:error',
      'in:paint_read:info',
      'out:paint_read:warning'
    ])
  })
})

describe('paint tools', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'paint' }))
  const paintId = (): number => desktops.state(desktopId).windows.find((w) => w.app === 'paint')!.id

  it('forwards draw, clear and resize to the paint window as app requests', async () => {
    const ops = [{ type: 'rect', x: 1, y: 2, w: 3, h: 4, fill: '#f00' }, { type: 'line', points: [{ x: 0, y: 0 }, { x: 5, y: 5 }] }]
    expect(textOf(await run('paint_draw', { ops }))).toMatch(/Drew 2 operations/)
    await run('paint_clear', { color: '#fff' })
    await run('paint_resize', { width: 320, height: 200 })
    expect(appCalls).toEqual([
      { windowId: paintId(), method: 'draw', params: { ops } },
      { windowId: paintId(), method: 'draw', params: { ops: [{ type: 'clear', color: '#fff' }] } },
      { windowId: paintId(), method: 'resize', params: { width: 320, height: 200 } }
    ])
  })

  it('returns the canvas as image content and rejects a non-image answer', async () => {
    appAnswers['read'] = PNG
    const res = await run('paint_read')
    expect(res.content[1]).toEqual({ type: 'image', data: 'UE5H', mimeType: 'image/png' })
    appAnswers['read'] = 'nope'
    expect((await run('paint_read')).isError).toBe(true)
  })

  it('targets the window given, else the topmost, and reports unknown windows and app errors', async () => {
    const second = desktops.openWindow({ desktopId, app: 'paint' })
    await run('paint_clear')
    expect(appCalls.at(-1)?.windowId).toBe(second.id)
    await run('paint_clear', { windowId: paintId() })
    expect(appCalls.at(-1)?.windowId).toBe(paintId())
    expect(textOf(await run('paint_clear', { windowId: 9999 }))).toMatch(/not an open Agent Paint window/)
    appAnswers['fail'] = 'did not answer'
    expect(textOf(await run('paint_clear'))).toBe('did not answer')
    expect((await run('paint_draw', { ops: [] })).isError).toBe(true) // schema: at least one op
  })
})

describe('diagram tools', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'diagrams' }))
  const diagramsId = (): number => desktops.state(desktopId).windows.find((w) => w.app === 'diagrams')!.id

  it('forwards the model calls to the Diagrams window and returns its answer', async () => {
    appAnswers['add'] = 'Added 2 shapes and 1 connector.'
    const shapes = [
      { ref: 'a', stencil: 'flowchart.terminator', text: 'Start' },
      { ref: 'b', stencil: 'flowchart.process', text: 'Work' }
    ]
    const connectors = [{ from: 'a', to: 'b', label: 'go' }]
    expect(textOf(await run('diagram_add', { shapes, connectors, layout: { direction: 'LR' } }))).toBe('Added 2 shapes and 1 connector.')
    expect(appCalls).toEqual([{ windowId: diagramsId(), method: 'add', params: { shapes, connectors, layout: { direction: 'LR' } } }])
    appAnswers['read'] = 'Page 1 "Page-1": 2 shapes'
    expect(textOf(await run('diagram_read', { page: 1 }))).toMatch(/2 shapes/)
    expect(appCalls.at(-1)).toEqual({ windowId: diagramsId(), method: 'read', params: { page: 1 } })
  })

  it('validates the arguments before the window sees them', async () => {
    expect((await run('diagram_add', { shapes: [{ text: 'no stencil' }] })).isError).toBe(true)
    expect((await run('diagram_arrange', { ids: ['s1'], action: 'spin' })).isError).toBe(true)
    expect((await run('diagram_delete', { ids: [] })).isError).toBe(true)
    expect(appCalls).toEqual([])
  })

  it('returns a png export as an image and writes svg exports through the recorded write path', async () => {
    appAnswers['export-png'] = PNG
    const res = await run('diagram_export', { format: 'png' })
    expect(res.content[1]).toEqual({ type: 'image', data: 'UE5H', mimeType: 'image/png' })
    expect((await run('diagram_export', { format: 'png', path: 'x.png' })).isError).toBe(true)
    appAnswers['export-svg'] = '<svg/>'
    expect(textOf(await run('diagram_export', { format: 'svg' }))).toBe('<svg/>')
    expect(textOf(await run('diagram_export', { format: 'svg', path: 'out/flow.svg' }))).toMatch(/Wrote E:\\out\\flow.svg/)
    expect(written).toEqual([{ sessionId, path: 'E:\\out\\flow.svg', text: '<svg/>' }])
  })

  it('saves to the given or the current file, adding the extension, and tells the window', async () => {
    appAnswers['serialize'] = { json: '{"format":"agentxp-diagram"}', path: null, title: 'Flow' }
    expect(textOf(await run('diagram_save'))).toMatch(/give a path such as .*Flow\.xpdiagram/)
    expect(textOf(await run('diagram_save', { path: 'flow' }))).toBe('Saved the diagram as E:\\flow.xpdiagram.')
    expect(written).toEqual([{ sessionId, path: 'E:\\flow.xpdiagram', text: '{"format":"agentxp-diagram"}' }])
    expect(appCalls.at(-1)).toEqual({ windowId: diagramsId(), method: 'saved', params: { path: 'E:\\flow.xpdiagram' } })
    appAnswers['serialize'] = { json: '{}', path: 'E:\\kept.xpdiagram', title: 'Flow' }
    expect(textOf(await run('diagram_save'))).toBe('Saved the diagram as E:\\kept.xpdiagram.')
  })

  it('opens a file by sending its text to the window, and reports a missing file or window', async () => {
    await run('diagram_save', { path: 'none' }).catch(() => {})
    appAnswers['serialize'] = { json: '{"x":1}', path: null, title: '' }
    await run('diagram_save', { path: 'd.xpdiagram' })
    expect((await run('diagram_open', { path: 'missing.xpdiagram' })).isError).toBe(true)
    await desktops.closeWindow(diagramsId())
    expect(textOf(await run('diagram_read'))).toMatch(/No Agent Diagrams window is open|closed/)
  })
})

describe('wordpad tools', () => {
  it('opens a file in the existing window without focusing or raising it, and updates its view', async () => {
    desktops.openWindow({ desktopId, app: 'wordpad' })
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    desktops.focusWindow(chat.id)
    const order = desktops.state(desktopId).windows.map((w) => w.id)
    expect(textOf(await run('wordpad_open', { path: 'docs/a.md' }))).toBe('WordPad shows E:\\docs\\a.md.')
    const view = desktops.state(desktopId).windows.find((w) => w.app === 'wordpad')!.view
    expect(view).toMatchObject({ app: 'wordpad', path: 'E:\\docs\\a.md', dirty: false })
    expect(desktops.state(desktopId).windows.filter((w) => w.app === 'wordpad')).toHaveLength(1)
    expect(desktops.state(desktopId).focusedWindowId).toBe(chat.id)
    expect(desktops.state(desktopId).windows.map((w) => w.id)).toEqual(order)
    expect(appCalls).toEqual([{ windowId: expect.any(Number), method: 'open', params: { path: 'E:\\docs\\a.md' } }])
    expect((await run('wordpad_open', { path: 'missing.txt' })).isError).toBe(true)
    expect((await run('wordpad_open', { path: '../x.md' })).isError).toBe(true)
  })

  it('opens WordPad behind the user\'s window when none is open, following "Agent may open apps"', async () => {
    const chat = desktops.state(desktopId).focusedWindowId
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'deny' })
    expect(textOf(await run('wordpad_open', { path: 'docs/a.md' }))).toMatch(/blocked/)
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'allow' })
    await run('wordpad_open', { path: 'docs/a.md' })
    expect(desktops.windowsOf(desktopId, 'wordpad')[0]).toMatchObject({ openedBy: 'agent', attention: true, view: { path: 'E:\\docs\\a.md' } })
    expect(desktops.state(desktopId).focusedWindowId).toBe(chat)
  })

  it('reads the text the window shows, unsaved edits included', async () => {
    desktops.openWindow({ desktopId, app: 'wordpad' })
    appAnswers['read'] = '# Draft\n\nunsaved'
    expect(textOf(await run('wordpad_read'))).toBe('# Draft\n\nunsaved')
    appAnswers['read'] = 42
    expect((await run('wordpad_read')).isError).toBe(true)
  })

  it('writes through the recorded write path and shows the file', async () => {
    desktops.openWindow({ desktopId, app: 'wordpad' })
    expect(textOf(await run('wordpad_write', { path: 'notes.md', markdown: '# Hi' }))).toMatch(/Wrote E:\\notes.md/)
    expect(written).toEqual([{ sessionId, path: 'E:\\notes.md', text: '# Hi' }])
    expect(desktops.state(desktopId).windows.find((w) => w.app === 'wordpad')!.view).toMatchObject({ path: 'E:\\notes.md' })
    expect((await run('wordpad_write', { path: '../../etc/x', markdown: '' })).isError).toBe(true)
    expect(written).toHaveLength(1)
  })
})

describe('notes tools and desktop state', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'sticky-notes' }))

  it('adds, lists, updates and removes notes as the agent; notes appear in the desktop state', async () => {
    expect(textOf(await run('notes_list'))).toBe('No sticky notes.')
    expect(textOf(await run('notes_add', { text: 'buy milk', color: 'pink' }))).toMatch(/#\d+ \[pink\] \(agent\) buy milk/)
    const [note] = desktops.state(desktopId).notes
    expect(note).toMatchObject({ text: 'buy milk', color: 'pink', author: 'agent', planSessionId: null })
    await run('notes_update', { id: note!.id, text: 'buy oat milk', color: 'green' })
    expect(textOf(await run('notes_list'))).toBe(`#${note!.id} [green] (agent) buy oat milk`)
    await run('notes_remove', { id: note!.id })
    expect(desktops.state(desktopId).notes).toEqual([])
    expect(textOf(await run('notes_remove', { id: note!.id }))).toMatch(/does not exist/)
    expect(f.publisher.payloads('notes.changed').length).toBeGreaterThanOrEqual(3)
  })

  it('creates one plan note for the calling chat', async () => {
    await run('notes_add', { text: 'ignored', plan: true })
    await run('notes_add', { plan: true })
    const notes = desktops.state(desktopId).notes
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ planSessionId: sessionId, text: '', author: 'agent' })
    expect(textOf(await run('notes_list'))).toContain(`plan of chat ${sessionId}`)
  })

  it('rejects unknown colours', async () => {
    expect((await run('notes_add', { text: 'x', color: 'teal' })).isError).toBe(true)
  })
})

describe('board tools', () => {
  it('are on without any app open, for every chat of the desktop', () => {
    expect(tools.enabledGroups(desktopId)).toContain('board')
  })

  it('create a board, add cards by column name, move them and show the board with ids', async () => {
    expect(textOf(await run('board_list'))).toBe('No boards.')
    expect((await run('board_get')).isError).toBe(true)
    expect(textOf(await run('board_create', { name: 'Sprint' }))).toMatch(/Column \[\d+\] To do \(0\)\n.*Doing \(0\)\n.*Done \(0\)/)
    await run('board_add_card', { column: 'to do', title: 'Write docs', description: 'the manual\nand help', assignee: 'Docs agent' })
    await run('board_add_card', { column: 'To do', title: 'Ship it' })
    const text = textOf(await run('board_get'))
    expect(text).toMatch(/Card \[\d+\] Write docs \(assignee: Docs agent\)\n\s+the manual\n\s+and help/)
    const id = Number(/Card \[(\d+)\] Ship it/.exec(text)![1])
    expect(textOf(await run('board_move_card', { card: id, column: 'Done' }))).toMatch(/Done \(1\)\n\s+Card \[\d+\] Ship it/)
    expect(textOf(await run('board_move_card', { card: id, column: 'To do', position: 0 }))).toMatch(/To do \(2\)\n\s+Card \[\d+\] Ship it/)
    await run('board_update_card', { card: id, assignee: 'Dev agent', title: 'Ship v1' })
    expect(textOf(await run('board_list'))).toMatch(/\[\d+\] Sprint: To do \(2\), Doing \(0\), Done \(0\)/)
    expect(textOf(await run('board_get', { board: 'sprint' }))).toContain('Ship v1 (assignee: Dev agent)')
    await run('board_update_card', { card: id, assignee: '' })
    expect(textOf(await run('board_get'))).not.toContain('Dev agent')
    expect(f.publisher.payloads('kanban.changed').length).toBeGreaterThanOrEqual(5)
  })

  it('reports unknown columns and boards of other desktops as errors', async () => {
    await run('board_create', { name: 'A', columns: ['One'] })
    expect(textOf(await run('board_add_card', { column: 'Two', title: 'x' }))).toMatch(/no column "Two"\. Columns: One/)
    expect((await run('board_add_card', { column: 9999, title: 'x' })).isError).toBe(true)
    expect((await run('board_delete', { board: 'nope' })).isError).toBe(true)
    expect(textOf(await run('board_delete', { board: 'A' }))).toMatch(/Deleted board/)
    expect(textOf(await run('board_list'))).toBe('No boards.')
  })

  it('rename a board, add, rename and delete columns, and delete cards', async () => {
    await run('board_create', { name: 'Sprint', columns: ['To do'] })
    expect(textOf(await run('board_rename', { board: 'Sprint', name: 'Sprint 2' }))).toContain('Sprint 2')
    expect((await run('board_rename', { board: 'Sprint', name: 'x' })).isError).toBe(true)
    const added = textOf(await run('board_add_column', { board: 'Sprint 2', name: 'Review' }))
    const columnId = Number(/Column \[(\d+)\] Review/.exec(added)![1])
    expect(textOf(await run('board_rename_column', { column: columnId, name: 'QA' }))).toMatch(/Column \[\d+\] QA \(0\)/)
    await run('board_add_card', { column: 'QA', title: 'Check it' })
    await run('board_add_card', { column: 'To do', title: 'Keep me' })
    const cardId = Number(/Card \[(\d+)\] Keep me/.exec(textOf(await run('board_get')))![1])
    expect(textOf(await run('board_delete_column', { column: columnId }))).not.toContain('Check it')
    expect(textOf(await run('board_delete_card', { card: cardId }))).toMatch(/Deleted|To do \(0\)/)
    expect(textOf(await run('board_get'))).not.toContain('Keep me')
    expect((await run('board_delete_card', { card: cardId })).isError).toBe(true)
    expect((await run('board_rename_column', { column: 999999, name: 'x' })).isError).toBe(true)
  })

  it('obeys the Control Center policy', async () => {
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, groups: { ...DEFAULT_TOOL_POLICY.groups, board: 'deny' } })
    expect(textOf(await run('board_list'))).toMatch(/blocked/)
  })
})

describe('events_query', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'event-viewer' }))

  it('returns compact filtered lines, newest last', async () => {
    eventLog.record({ sessionId, source: 'acp', direction: 'out', name: 'session/prompt', payload: { a: 1 } })
    eventLog.record({ sessionId, source: 'acp', direction: 'in', name: 'session/prompt (response)', level: 'error', payload: { error: { message: 'boom' } } })
    expect(textOf(await run('events_query', { level: 'error' }))).toMatch(/^#\d+ \d\d:\d\d:\d\d error acp in session\/prompt \(response\) chat \d+ \{ "error"/)
    const all = textOf(await run('events_query', { source: 'acp', limit: 1 }))
    expect(all.split('\n')).toHaveLength(1)
    expect(textOf(await run('events_query', { source: 'acp', text: 'zzz' }))).toBe('No matching events.')
    expect((await run('events_query', { limit: 500 })).isError).toBe(true)
  })
})

describe('screen_capture', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'snipping-tool' }))

  it('captures the desktop or one window area as image content', async () => {
    const whole = await run('screen_capture')
    expect(whole.content[1]).toEqual({ type: 'image', data: 'UE5H', mimeType: 'image/png' })
    const chat = desktops.state(desktopId).windows.find((w) => w.app === 'chat')!
    await run('screen_capture', { windowId: chat.id })
    expect(captures).toEqual([undefined, chat.bounds])
    expect(textOf(await run('screen_capture', { windowId: 9999 }))).toMatch(/does not exist/)
  })
})

describe('recycle tools', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'recycle-bin' }))

  it('lists and restores the bin items of this desktop', async () => {
    expect(textOf(await run('recycle_list'))).toMatch(/^#4 a.txt \(your version reverted/)
    expect(textOf(await run('recycle_restore', { id: 4 }))).toBe('Restored a.txt.')
    expect(restored).toEqual([4])
    expect(textOf(await run('recycle_restore', { id: 5 }))).toMatch(/does not exist/)
    expect(restored).toEqual([4])
  })
})

describe('chat tools', () => {
  /** A closed chat with a short conversation, as the user left it. */
  const closedChat = (title: string): number => {
    const chat = f.repos.sessions.create({ agentId: f.agentId, desktopId, cwd: 'E:\\', title })
    f.repos.transcripts.appendMessage(chat.id, 'user', [{ kind: 'text', text: `question about ${title}` }])
    f.repos.transcripts.appendMessage(chat.id, 'agent', [{ kind: 'text', text: `answer about ${title}` }])
    return chat.id
  }

  it('lists the chats of the desktop, open and closed, and filters by title', async () => {
    const old = closedChat('Fix the login form')
    const listed = textOf(await run('chats_list'))
    expect(listed).toMatch(new RegExp(`^${old}  "Fix the login form"  .*\\(closed\\)$`, 'm'))
    expect(listed).toMatch(new RegExp(`^${sessionId}  .*\\(open in a window, this chat\\)$`, 'm'))
    expect(textOf(await run('chats_list', { query: 'LOGIN' })).split('\n')).toHaveLength(1)
    expect(textOf(await run('chats_list', { query: 'nothing' }))).toMatch(/No chat title contains/)
    expect(textOf(await run('chats_list', { limit: 1 }))).toMatch(/and 1 older chats/)
  })

  it('reads the transcript of a closed chat', async () => {
    const id = closedChat('Plan the release')
    const text = textOf(await run('chat_read', { chat: id }))
    expect(text).toContain('# Plan the release')
    expect(text).toContain('question about Plan the release')
    expect(text).toContain('answer about Plan the release')
    expect(textOf(await run('chat_read', { chat: id, maxChars: 500 }))).not.toMatch(/left out/)
    expect((await run('chat_read', { chat: 99_999 })).isError).toBe(true)
  })

  it('opens a closed chat again in a Chat window behind the user\'s, following the open-apps policy', async () => {
    const id = closedChat('Write the docs')
    const focused = desktops.state(desktopId).focusedWindowId
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'deny' })
    expect((await run('chat_open', { chat: id })).isError).toBe(true)
    desktops.setPolicy({ ...DEFAULT_TOOL_POLICY, openApps: 'ask' })
    allowAsk = false
    expect(textOf(await run('chat_open', { chat: id }))).toBe('The user declined to open a chat window.')
    expect(asked).toEqual(['Open a chat window'])
    allowAsk = true
    expect(textOf(await run('chat_open', { chat: id }))).toMatch(/Opened chat \d+ \("Write the docs"\) in Chat window \d+/)
    expect(desktops.windowsOf(desktopId, 'chat').map((w) => (w.view.app === 'chat' ? w.view.sessionId : 0))).toContain(id)
    expect(desktops.state(desktopId).focusedWindowId).toBe(focused)
  })

  it('does not reach a pane chat that is still in its window', async () => {
    const notepad = desktops.openWindow({ desktopId, app: 'notepad' })
    const aside = await desktops.openAside(desktopId, notepad.id)
    expect(textOf(await run('chats_list'))).not.toMatch(new RegExp(`^${aside}  `, 'm'))
    expect((await run('chat_open', { chat: aside })).isError).toBe(true)
  })
})
