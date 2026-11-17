import { mkdir, writeFile } from 'node:fs/promises'
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
import { TOOL_SPECS, specsForGroups } from './catalog'
import { createBrowserTools, formatRead, formatTabs, normalizeUrl } from './browserTools'
import { createCodeTools } from './codeTools'
import { DesktopToolService } from './DesktopToolService'
import { createFsTools, nameMatcher } from './fsTools'
import { createNotepadTools } from './notepadTools'
import type { ActionResult, AppRequests, BrowserDriver, BrowserGuard, CommandRunner, PageContent, PageInfo } from './ports'
import { createEventsTools } from './eventsTools'
import { createNotesTools } from './notesTools'
import { createBoardTools } from './boardTools'
import { KanbanService } from '../kanban/KanbanService'
import { SqliteKanbanRepository } from '../../infrastructure/db/sqlite-kanban-repository'
import { createPaintTools } from './paintTools'
import { createRecycleTools } from './recycleTools'
import { createReviewTools } from './reviewTools'
import { createSnipTools } from './snipTools'
import { createWordpadTools } from './wordpadTools'
import { ProtocolEventLog } from '../events/ProtocolEventLog'
import { StickyNoteService } from '../desktop/StickyNoteService'
import { createShellTools } from './shellTools'
import { createTerminalTools } from './terminalTools'
import { ToolPaths } from './ToolPaths'
import type { TerminalActivity } from '../ports'
import type { ToolResult } from './types'

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
    return ref === 2 ? { role: 'textbox', name: 'Message' } : { role: 'button', name: 'Send' }
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
      create: async (desktop, agentId, cwd) => f.repos.sessions.create({ agentId: agentId ?? f.agentId, desktopId: desktop, cwd, title: 'chat' }),
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
      options.onOutput?.('line1\n')
      options.onOutput?.('line2\n')
      return { exitCode: command === 'fail' ? 2 : 0, timedOut: false, output: 'line1\nline2\n' }
    }
  }
  const ask = async (_id: number, title: string): Promise<boolean> => {
    asked.push(title)
    return allowAsk
  }
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
  tools = new DesktopToolService({
    states: desktops,
    log: {
      called: (c, t, a) => eventLog.recordToolCall(c, t, a),
      finished: (c, t, r, refused) => eventLog.recordToolResult(c, t, r, refused)
    },
    gate: gateway,
    handlers: {
      ...createShellTools({ desktops, paths, ask }),
      ...createFsTools({ vfs: f.vfs, paths }),
      ...createNotepadTools({ desktops, vfs: f.vfs, paths }),
      ...createCodeTools({ desktops, changes: { list: () => changes }, paths }),
      ...createTerminalTools({ desktops, runner, vfs: f.vfs, paths, terminals: { record: (id, a) => void recorded.push([id, a]) }, newTerminalId: () => `run-${++runCounter}` }),
      ...createBrowserTools({ desktops, driver, requests: browserRequests }),
      ...createPaintTools({ desktops, requests }),
      ...createWordpadTools({
        desktops,
        vfs: f.vfs,
        paths,
        requests,
        files: { write: async (sessionId, path, text) => void written.push({ sessionId, path, text }) }
      }),
      ...createNotesTools({ notes: noteService }),
      ...createBoardTools({ kanban: new KanbanService({ kanban: new SqliteKanbanRepository(f.db), events: f.publisher }) }),
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
      ...createReviewTools({ reviews: {} as never }) // exercised in reviewTools.test.ts
    }
  })
})

describe('tool catalog', () => {
  it('groups the tools as documented', () => {
    const byGroup = (g: ToolGroup): string[] => specsForGroups([g]).map((s) => s.name)
    expect(byGroup('shell')).toEqual(['desktop_state', 'drives_list', 'desktop_open_app', 'review_open', 'desktop_close_app', 'desktop_focus_app'])
    expect(byGroup('fs.read')).toEqual(['fs_list', 'fs_find'])
    expect(byGroup('notepad')).toEqual(['notepad_open', 'notepad_read'])
    expect(byGroup('code')).toEqual(['code_open', 'code_reveal', 'code_show_diff'])
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
    expect(byGroup('fs.write')).toEqual([])
    expect(byGroup('paint')).toEqual(['paint_draw', 'paint_read', 'paint_clear', 'paint_resize'])
    expect(byGroup('wordpad')).toEqual(['wordpad_open', 'wordpad_read', 'wordpad_write'])
    expect(byGroup('notes')).toEqual(['notes_list', 'notes_add', 'notes_update', 'notes_remove'])
    expect(byGroup('events')).toEqual(['events_query'])
    expect(byGroup('snip')).toEqual(['screen_capture'])
    expect(byGroup('recycle')).toEqual(['recycle_list', 'recycle_restore'])
    expect(byGroup('board')).toHaveLength(12)
    expect(byGroup('review')).toEqual(['review_list_changes', 'review_read_diff', 'review_add_comment', 'review_submit'])
    expect(TOOL_SPECS).toHaveLength(60)
  })

  it('lists the enabled groups of the desktop, falling back to shell for an unknown desktop', () => {
    expect(tools.enabledGroups(desktopId)).toEqual(['shell', 'board'])
    desktops.openWindow({ desktopId, app: 'browser' })
    expect(tools.enabledGroups(desktopId)).toEqual(['shell', 'browser', 'board'])
    expect(tools.enabledGroups(999)).toEqual(['shell'])
  })
})

describe('DesktopToolService gating', () => {
  it('returns an MCP error result with the open-the-app message when the app is closed', async () => {
    const res = await run('browser_read')
    expect(res.isError).toBe(true)
    expect(textOf(res)).toBe(closedAppMessage('browser'))
    expect(driver.calls).toEqual([])
    expect(textOf(await run('terminal_run', { command: 'ls' }))).toBe(closedAppMessage('terminal'))
    expect(textOf(await run('fs_list'))).toBe(closedAppMessage('fs.read'))
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
  it('opens an app, which enables its tools, and closes it again', async () => {
    const opened = await run('desktop_open_app', { app: 'terminal' })
    expect(textOf(opened)).toMatch(/Opened Terminal window/)
    expect(desktops.state(desktopId).tools).toContain('terminal')
    expect(desktops.state(desktopId).windows.find((w) => w.app === 'terminal')?.openedBy).toBe('agent')
    expect(textOf(await run('desktop_close_app', { app: 'terminal' }))).toMatch(/Closed/)
    expect(desktops.state(desktopId).tools).not.toContain('terminal')
    expect((await run('desktop_close_app', { app: 'terminal' })).isError).toBe(true)
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

  it('focuses a window by app', async () => {
    const a = desktops.openWindow({ desktopId, app: 'notepad' })
    desktops.openWindow({ desktopId, app: 'terminal' })
    await run('desktop_focus_app', { app: 'notepad' })
    expect(desktops.state(desktopId).focusedWindowId).toBe(a.id)
  })
})

describe('fs tools', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'explorer' }))

  it('lists a directory (default: the chat\'s working directory) and finds files by name or glob; VPaths come back', async () => {
    expect(textOf(await run('fs_list'))).toBe('E:\\docs\\\nE:\\src\\\nE:\\notes.md\nE:\\other.txt\nE:\\README.md') // .git and node_modules hidden
    expect(textOf(await run('fs_list', { path: 'src' }))).toBe('E:\\src\\app.test.ts\nE:\\src\\app.ts')
    expect(textOf(await run('fs_list', { path: 'E:\\src' }))).toBe('E:\\src\\app.test.ts\nE:\\src\\app.ts')
    expect(textOf(await run('fs_list', { path: join(f.projectDir, 'src') }))).toBe('E:\\src\\app.test.ts\nE:\\src\\app.ts') // real paths inside a drive work too
    expect(textOf(await run('fs_find', { pattern: '*.test.ts' }))).toBe('E:\\src\\app.test.ts')
    expect(textOf(await run('fs_find', { pattern: 'readme' }))).toBe('E:\\README.md')
    expect(textOf(await run('fs_find', { pattern: 'dep' }))).toBe('No matches.') // node_modules is not searched
    expect(textOf(await run('fs_find', { pattern: 'app', limit: 1 }))).toBe('E:\\src\\app.test.ts')
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
  it('notepad_open shows the file (one window per file) and notepad_read reads it', async () => {
    desktops.openWindow({ desktopId, app: 'notepad' })
    await run('notepad_open', { path: 'notes.md' })
    await run('notepad_open', { path: 'E:\\notes.md' })
    const pads = desktops.windowsOf(desktopId, 'notepad')
    expect(pads.map((w) => w.view)).toMatchObject([{ path: null }, { path: 'E:\\notes.md' }])
    expect(textOf(await run('notepad_read'))).toBe('text of notes.md')
    desktops.updateView(pads[1]!.id, { app: 'notepad', path: 'E:\\notes.md', dirty: true, caretLine: 1 })
    expect(textOf(await run('notepad_read'))).toMatch(/unsaved edits/)
    expect(textOf(await run('notepad_read', { path: 'other.txt' }))).toBe('text of other.txt')
    expect((await run('notepad_open', { path: 'missing.txt' })).isError).toBe(true)
  })

  it('code_open and code_reveal drive the singleton Code window as the agent', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    await run('code_open', { path: 'src/app.ts', line: 40 })
    let view = desktops.windowsOf(desktopId, 'code')[0]!.view
    expect(view).toMatchObject({ app: 'code', tabs: ['E:\\src\\app.ts'], activePath: 'E:\\src\\app.ts', selection: { startLine: 40, endLine: 40 }, visibleLines: [35, 65] })
    await run('code_reveal', { path: 'README.md', startLine: 3, endLine: 9 })
    view = desktops.windowsOf(desktopId, 'code')[0]!.view
    expect(view).toMatchObject({ tabs: ['E:\\src\\app.ts', 'E:\\README.md'], activePath: 'E:\\README.md', selection: { startLine: 3, endLine: 9 } })
    expect(desktops.windowsOf(desktopId, 'code')).toHaveLength(1)
    expect(textOf(await run('code_open', { path: 'G:\\x.ts' }))).toMatch(/Drive G: is not plugged in/)
  })

  it('code_show_diff selects the recorded change', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    expect((await run('code_show_diff', { path: 'src/app.ts' })).isError).toBe(true)
    changes = [{ id: 11, sessionId, path: 'E:\\src\\app.ts', kind: 'modified', additions: 3, deletions: 1, originalText: '', currentText: '' } as FileChangeDto]
    expect(textOf(await run('code_show_diff', { path: 'src/app.ts' }))).toMatch(/\+3 -1/)
    expect(textOf(await run('code_show_diff', { path: 'e:\\SRC\\app.ts' }))).toMatch(/\+3 -1/)
    expect(desktops.windowsOf(desktopId, 'code')[0]?.view).toMatchObject({ selectedChangeId: 11 })
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
  it('lists the tools of a group only while its app is open', () => {
    const listed = (): string[] => specsForGroups(tools.enabledGroups(desktopId)).map((s) => s.name)
    expect(listed()).not.toContain('paint_draw')
    desktops.openWindow({ desktopId, app: 'paint' })
    desktops.openWindow({ desktopId, app: 'sticky-notes' })
    expect(listed()).toEqual(expect.arrayContaining(['paint_draw', 'paint_read', 'notes_add']))
    expect(listed()).not.toContain('wordpad_read')
    expect(listed()).not.toContain('recycle_list')
    const paint = desktops.state(desktopId).windows.find((w) => w.app === 'paint')!
    desktops.closeWindow(paint.id)
    expect(listed()).not.toContain('paint_draw')
  })

  it('answers with the open-the-app hint while an app is closed', async () => {
    for (const [tool, group] of [
      ['paint_read', 'paint'],
      ['wordpad_read', 'wordpad'],
      ['notes_list', 'notes'],
      ['events_query', 'events'],
      ['screen_capture', 'snip'],
      ['recycle_list', 'recycle']
    ] as const) {
      expect(textOf(await run(tool))).toBe(closedAppMessage(group))
    }
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

describe('wordpad tools', () => {
  it('opens a file in a new or the existing window and updates its view', async () => {
    desktops.openWindow({ desktopId, app: 'wordpad' })
    expect(textOf(await run('wordpad_open', { path: 'docs/a.md' }))).toBe('WordPad shows E:\\docs\\a.md.')
    const view = desktops.state(desktopId).windows.find((w) => w.app === 'wordpad')!.view
    expect(view).toMatchObject({ app: 'wordpad', path: 'E:\\docs\\a.md', dirty: false })
    expect(desktops.state(desktopId).windows.filter((w) => w.app === 'wordpad')).toHaveLength(1)
    expect(appCalls).toEqual([{ windowId: expect.any(Number), method: 'open', params: { path: 'E:\\docs\\a.md' } }])
    expect((await run('wordpad_open', { path: 'missing.txt' })).isError).toBe(true)
    expect((await run('wordpad_open', { path: '../x.md' })).isError).toBe(true)
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
