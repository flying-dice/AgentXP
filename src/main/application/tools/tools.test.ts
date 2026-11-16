import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, closedAppMessage, type ToolGroup } from '@shared/desktop'
import type { FileChangeDto, FileNodeDto } from '@shared/models'
import { SqliteAppWindowRepository } from '../../infrastructure/db/sqlite-app-window-repository'
import { SqliteDesktopRepository } from '../../infrastructure/db/sqlite-desktop-repository'
import { SqliteToolPolicyRepository } from '../../infrastructure/db/sqlite-tool-policy-repository'
import { DesktopService } from '../desktop/DesktopService'
import { PAUSED_MESSAGE } from '../desktop/AppToolPolicy'
import { ToolGateway } from '../desktop/ToolGateway'
import { createAppFixture } from '../test-helpers'
import { TOOL_SPECS, specsForGroups } from './catalog'
import { createBrowserTools, formatSnapshot, normalizeUrl } from './browserTools'
import { createCodeTools } from './codeTools'
import { DesktopToolService } from './DesktopToolService'
import { createFsTools, nameMatcher } from './fsTools'
import { createNotepadTools } from './notepadTools'
import type { BrowserDriver, CommandRunner, PageInfo, PageSnapshot } from './ports'
import { createShellTools } from './shellTools'
import { createTerminalTools } from './terminalTools'
import { toWorkspacePath } from './paths'
import type { ToolResult } from './types'

const textOf = (r: ToolResult): string => r.content.map((c) => (c.type === 'text' ? c.text : `<${c.type}>`)).join('\n')

const TREE: Record<string, FileNodeDto[]> = {
  '': [
    { name: 'src', path: 'src', isDirectory: true },
    { name: 'README.md', path: 'README.md', isDirectory: false }
  ],
  src: [
    { name: 'app.ts', path: 'src/app.ts', isDirectory: false },
    { name: 'app.test.ts', path: 'src/app.test.ts', isDirectory: false }
  ]
}

class FakeDriver implements BrowserDriver {
  calls: string[] = []
  fail: string | null = null
  private page: PageInfo = { title: 'Example', url: 'https://example.com/' }
  private go(label: string, url?: string): PageInfo {
    if (this.fail) throw new Error(this.fail)
    this.calls.push(label)
    if (url) this.page = { title: 'Loaded', url }
    return this.page
  }
  async navigate(_w: number, url: string) {
    return this.go(`navigate:${url}`, url)
  }
  async read(): Promise<PageSnapshot> {
    return { ...this.go('read'), text: 'Hello page', elements: [{ ref: 1, kind: 'link', label: 'More', detail: 'https://example.com/more' }] }
  }
  async screenshot() {
    this.go('screenshot')
    return 'UE5H'
  }
  async click(_w: number, ref: number) {
    return this.go(`click:${ref}`)
  }
  async type(_w: number, ref: number, text: string, submit: boolean) {
    return this.go(`type:${ref}:${text}:${submit}`)
  }
  async back() {
    return this.go('back')
  }
}

let f: ReturnType<typeof createAppFixture>
let desktops: DesktopService
let desktopId: number
let sessionId: number
let driver: FakeDriver
let asked: string[]
let allowAsk: boolean
let ran: { command: string; cwd: string }[]
let tools: DesktopToolService
let changes: FileChangeDto[]

const run = (tool: string, args: unknown = {}): Promise<ToolResult> => tools.call({ sessionId, desktopId }, tool, args)

beforeEach(async () => {
  f = createAppFixture()
  desktops = new DesktopService({
    desktops: new SqliteDesktopRepository(f.db),
    windows: new SqliteAppWindowRepository(f.db),
    policies: new SqliteToolPolicyRepository(f.db),
    folders: f.repos.folders,
    agents: f.repos.agents,
    sessions: f.repos.sessions,
    chats: {
      create: async (folderId, agentId, desktop) => f.repos.sessions.create({ folderId, agentId: agentId ?? f.agentId, desktopId: desktop, title: 'chat' }),
      cancel: async () => {},
      remove: async () => {}
    },
    pickFolder: async () => null,
    host: { open: () => {}, close: () => {} },
    events: f.publisher
  })
  desktopId = desktops.desktopForFolder(f.folderId).id
  const chat = await desktops.newChat(desktopId)
  sessionId = chat.view.app === 'chat' ? chat.view.sessionId : 0
  driver = new FakeDriver()
  asked = []
  allowAsk = true
  ran = []
  changes = []
  const runner: CommandRunner = {
    run: async (command, options) => {
      ran.push({ command, cwd: options.cwd })
      return { exitCode: command === 'fail' ? 2 : 0, timedOut: false, output: 'line1\nline2\n' }
    }
  }
  const browser = {
    list: async (_root: string, rel: string) => {
      const entries = TREE[rel]
      if (!entries) throw new Error(`no such folder ${rel}`)
      return entries
    },
    readText: async (_root: string, rel: string) => {
      if (rel === 'missing.txt') throw new Error('ENOENT')
      return `text of ${rel}`
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
  tools = new DesktopToolService({
    states: desktops,
    gate: gateway,
    handlers: {
      ...createShellTools({ desktops, ask }),
      ...createFsTools({ desktops, browser }),
      ...createNotepadTools({ desktops, browser }),
      ...createCodeTools({ desktops, changes: { list: () => changes } }),
      ...createTerminalTools({ desktops, runner }),
      ...createBrowserTools({ desktops, driver })
    }
  })
})

describe('tool catalog', () => {
  it('groups the tools as documented', () => {
    const byGroup = (g: ToolGroup): string[] => specsForGroups([g]).map((s) => s.name)
    expect(byGroup('shell')).toEqual(['desktop_state', 'desktop_open_app', 'desktop_close_app', 'desktop_focus_app'])
    expect(byGroup('fs.read')).toEqual(['fs_list', 'fs_find'])
    expect(byGroup('notepad')).toEqual(['notepad_open', 'notepad_read'])
    expect(byGroup('code')).toEqual(['code_open', 'code_reveal', 'code_show_diff'])
    expect(byGroup('terminal')).toEqual(['terminal_run', 'terminal_read'])
    expect(byGroup('browser')).toEqual(['browser_navigate', 'browser_read', 'browser_screenshot', 'browser_click', 'browser_type', 'browser_back'])
    expect(byGroup('fs.write')).toEqual([])
    expect(TOOL_SPECS).toHaveLength(19)
  })

  it('lists the enabled groups of the desktop, falling back to shell for an unknown desktop', () => {
    expect(tools.enabledGroups(desktopId)).toEqual(['shell'])
    desktops.openWindow({ desktopId, app: 'browser' })
    expect(tools.enabledGroups(desktopId)).toEqual(['shell', 'browser'])
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

  it('lists a directory and finds files by name or glob', async () => {
    expect(textOf(await run('fs_list'))).toBe('src/\nREADME.md')
    expect(textOf(await run('fs_list', { path: 'src' }))).toBe('src/app.ts\nsrc/app.test.ts')
    expect(textOf(await run('fs_find', { pattern: '*.test.ts' }))).toBe('src/app.test.ts')
    expect(textOf(await run('fs_find', { pattern: 'readme' }))).toBe('README.md')
    expect(textOf(await run('fs_find', { pattern: 'nothing' }))).toBe('No matches.')
    expect(textOf(await run('fs_find', { pattern: 'app', limit: 1 }))).toBe('src/app.ts')
  })

  it('refuses paths outside the workspace and reports missing folders', async () => {
    expect((await run('fs_list', { path: '../etc' })).isError).toBe(true)
    expect(textOf(await run('fs_list', { path: 'nope' }))).toMatch(/no such folder/)
  })

  it('matches names', () => {
    expect(nameMatcher('*.ts')('a.ts')).toBe(true)
    expect(nameMatcher('*.ts')('a.tsx')).toBe(false)
    expect(nameMatcher('a.b')('xA.bx')).toBe(true)
    expect(nameMatcher('a.b*')('axb')).toBe(false)
  })

  it('normalises workspace paths', () => {
    expect(toWorkspacePath('/w', undefined)).toBe('')
    expect(toWorkspacePath('/w', '/w/src/a.ts')).toBe('src/a.ts')
    expect(toWorkspacePath('/w', 'src/../b.ts')).toBe('b.ts')
    expect(() => toWorkspacePath('/w', '/etc/passwd')).toThrow(/outside/)
  })
})

describe('notepad and code tools', () => {
  it('notepad_open shows the file (one window per file) and notepad_read reads it', async () => {
    desktops.openWindow({ desktopId, app: 'notepad' })
    await run('notepad_open', { path: 'notes.md' })
    await run('notepad_open', { path: 'notes.md' })
    const pads = desktops.windowsOf(desktopId, 'notepad')
    expect(pads.map((w) => w.view)).toMatchObject([{ path: null }, { path: 'notes.md' }])
    expect(textOf(await run('notepad_read'))).toBe('text of notes.md')
    desktops.updateView(pads[1]!.id, { app: 'notepad', path: 'notes.md', dirty: true, caretLine: 1 })
    expect(textOf(await run('notepad_read'))).toMatch(/unsaved edits/)
    expect(textOf(await run('notepad_read', { path: 'other.txt' }))).toBe('text of other.txt')
    expect((await run('notepad_open', { path: 'missing.txt' })).isError).toBe(true)
  })

  it('code_open and code_reveal drive the singleton Code window as the agent', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    await run('code_open', { path: 'src/app.ts', line: 40 })
    let view = desktops.windowsOf(desktopId, 'code')[0]!.view
    expect(view).toMatchObject({ app: 'code', tabs: ['src/app.ts'], activePath: 'src/app.ts', selection: { startLine: 40, endLine: 40 }, visibleLines: [35, 65] })
    await run('code_reveal', { path: 'README.md', startLine: 3, endLine: 9 })
    view = desktops.windowsOf(desktopId, 'code')[0]!.view
    expect(view).toMatchObject({ tabs: ['src/app.ts', 'README.md'], activePath: 'README.md', selection: { startLine: 3, endLine: 9 } })
    expect(desktops.windowsOf(desktopId, 'code')).toHaveLength(1)
  })

  it('code_show_diff selects the recorded change', async () => {
    desktops.openWindow({ desktopId, app: 'code' })
    expect((await run('code_show_diff', { path: 'src/app.ts' })).isError).toBe(true)
    changes = [{ id: 11, sessionId, path: '/work/project/src/app.ts', kind: 'modified', additions: 3, deletions: 1, originalText: '', currentText: '' } as FileChangeDto]
    expect(textOf(await run('code_show_diff', { path: 'src/app.ts' }))).toMatch(/\+3 -1/)
    expect(desktops.windowsOf(desktopId, 'code')[0]?.view).toMatchObject({ selectedChangeId: 11 })
  })
})

describe('terminal tools', () => {
  beforeEach(() => void desktops.openWindow({ desktopId, app: 'terminal' }))

  it('runs a command in the workspace, shows it in the Terminal window and keeps the output for terminal_read', async () => {
    const res = await run('terminal_run', { command: 'echo hi', cwd: 'src' })
    expect(textOf(res)).toBe('line1\nline2\n[exit code 0]')
    expect(ran).toEqual([{ command: 'echo hi', cwd: '/work/project/src' }])
    expect(desktops.windowsOf(desktopId, 'terminal')[0]?.view).toEqual({
      app: 'terminal',
      terminalId: 'agent',
      cwd: 'src',
      runningCommand: null,
      lastLines: ['> echo hi', 'line1', 'line2']
    })
    expect(textOf(await run('terminal_read', { lines: 2 }))).toBe('line1\nline2')
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

  it('navigates, mirrors the page into the window view and reads it', async () => {
    expect(textOf(await run('browser_navigate', { url: 'example.org' }))).toBe('Loaded https://example.org/ ("Loaded").')
    expect(view()).toMatchObject({ url: 'https://example.org/', title: 'Loaded', loading: false })
    const read = textOf(await run('browser_read'))
    expect(read).toContain('Hello page')
    expect(read).toContain('[1] link: More -> https://example.com/more')
  })

  it('returns the screenshot as image content', async () => {
    const res = await run('browser_screenshot')
    expect(res.content[1]).toEqual({ type: 'image', data: 'UE5H', mimeType: 'image/png' })
  })

  it('clicks, types and goes back', async () => {
    await run('browser_click', { ref: 3 })
    await run('browser_type', { ref: 2, text: 'hello', submit: true })
    await run('browser_back')
    expect(driver.calls).toEqual(['click:3', 'type:2:hello:true', 'back'])
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

  it('formats a page snapshot', () => {
    expect(formatSnapshot({ title: 'T', url: 'u', text: 'body', elements: [] })).toContain('No interactive elements.')
  })
})
