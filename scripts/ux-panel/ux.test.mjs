import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { normalizeKey, parseArgs, parseCommand } from './lib/args.mjs'
import { countSteps, createLog, readLog, summarize } from './lib/log.mjs'
import { asksQuestion, baseTaskId, budgetVerdict, loadTasks, parseTasks, scenarioText } from './lib/tasktext.mjs'
import { CHECKS } from './checks/index.mjs'
import { countWords, helpInfo, lastProgress, nameWords, resourceText, userText } from './checks/util.mjs'
import { fillsWindow, judgeTabs } from './checks/features.mjs'
import { LOGIN_ORIGINAL, REDIRECT_BUG } from './lib/fixtures.mjs'
import { TASKS } from './tasks.mjs'

describe('ux argument parsing', () => {
  it('parses click with coordinates and flags', () => {
    expect(parseCommand(['click', '10', '20'])).toEqual({ cmd: 'click', args: [10, 20], flags: {} })
    expect(parseCommand(['click', '10', '20', '--double'])).toEqual({ cmd: 'click', args: [10, 20], flags: { double: true } })
    expect(parseCommand(['click', '--right', '1.5', '2'])).toEqual({ cmd: 'click', args: [1.5, 2], flags: { right: true } })
  })

  it('refuses double and right together, wrong counts, non numbers and unknown commands', () => {
    expect(() => parseCommand(['click', '1', '2', '--double', '--right'])).toThrow(/either/)
    expect(() => parseCommand(['click', '1'])).toThrow(/takes 2/)
    expect(() => parseCommand(['click', 'a', '2'])).toThrow(/not a number/)
    expect(() => parseCommand(['dance'])).toThrow(/unknown command/)
    expect(() => parseCommand(['click', '1', '2', '--loud'])).toThrow(/unknown option/)
  })

  it('accepts negative scroll amounts as values, not options', () => {
    expect(parseCommand(['scroll', '5', '6', '-300']).args).toEqual([5, 6, -300])
  })

  it('keeps typed text whole, including text that looks like an option after --', () => {
    expect(parseCommand(['type', 'hello world']).args).toEqual(['hello world'])
    expect(parseCommand(['type', '--', '--force']).args).toEqual(['--force'])
  })

  it('limits wait to 10 seconds and parses shot --out', () => {
    expect(parseCommand(['wait', '10000']).args).toEqual([10000])
    expect(() => parseCommand(['wait', '10001'])).toThrow(/between/)
    expect(parseCommand(['shot', '--out', '/tmp/a.png']).flags).toEqual({ out: '/tmp/a.png' })
    expect(parseCommand(['shot', '--out=/tmp/b.png']).flags).toEqual({ out: '/tmp/b.png' })
    expect(() => parseCommand(['shot', '--out'])).toThrow(/needs a value/)
  })

  it('switch needs a whole number', () => {
    expect(parseCommand(['switch', '1']).args).toEqual([1])
    expect(() => parseCommand(['switch', '1.5'])).toThrow(/whole/)
  })

  it('parseArgs handles bool and string flags', () => {
    expect(parseArgs(['a', '--x', 'b', '--y'], { x: 'string', y: 'bool' })).toEqual({ positional: ['a'], flags: { x: 'b', y: true } })
  })

  it('normalizes key combos', () => {
    expect(normalizeKey('ctrl+n')).toBe('Control+n')
    expect(normalizeKey('esc')).toBe('Escape')
    expect(normalizeKey('f1')).toBe('F1')
    expect(normalizeKey('Alt+F4')).toBe('Alt+F4')
    expect(normalizeKey('shift+tab')).toBe('Shift+Tab')
    expect(normalizeKey('Control+Shift+P')).toBe('Control+Shift+P')
    expect(normalizeKey('+')).toBe('+')
  })
})

describe('session log', () => {
  let dir
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  it('appends JSONL entries with a timestamp and counts only action commands as steps', () => {
    dir = mkdtempSync(join(tmpdir(), 'ux-log-'))
    const file = join(dir, 'log.jsonl')
    const log = createLog(file)
    log.append({ cmd: 'shot', args: [], screenshot: '/x/1.png', ok: true })
    log.append({ cmd: 'click', args: [1, 2], screenshot: '/x/2.png', ok: true })
    log.append({ cmd: 'type', args: ['hi'], ok: true })
    log.append({ cmd: 'key', args: ['Enter'], ok: false, note: 'failed' })
    log.append({ cmd: 'find', args: ['New'], ok: true })
    log.append({ cmd: 'wait', args: [100], ok: true })
    const entries = readLog(file)
    expect(entries).toHaveLength(6)
    expect(entries[1]).toMatchObject({ cmd: 'click', args: [1, 2], screenshot: '/x/2.png' })
    expect(Date.parse(entries[0].ts)).not.toBeNaN()
    expect(countSteps(entries)).toBe(2)
    expect(summarize(entries)).toMatchObject({ commands: 6, steps: 2, errors: 1, screenshots: 2 })
  })

  it('reads an absent log as empty', () => {
    expect(readLog('/nonexistent/ux-log.jsonl')).toEqual([])
  })
})

describe('tasks.md parsing', () => {
  it('reads scenario, min and budgets', () => {
    const md = '### J01\n\n**T01.1 - Find the start**\n- Scenario: "Find it.\n  Now."\n- Start state: x\n- Min 1 (click). Budget 3 / 4.\n\n**T01.2 - Next**\n- Scenario: "Other."\n- Min 2. Budget 6 / 8.\n'
    const tasks = parseTasks(md)
    expect(tasks['T01.1']).toMatchObject({ title: 'Find the start', scenario: 'Find it. Now.', min: 1, budgetExpert: 3, budgetNovice: 4 })
    expect(tasks['T01.2']).toMatchObject({ scenario: 'Other.', min: 2 })
  })
})

// ---------------------------------------------------------------- checkers (H-01 .. H-22), run against a fake context
const msg = (role, text) => ({ kind: 'message', role, blocks: [{ text }] })
const win = (app, view = {}) => ({ id: `${app}-1`, app, view })
const fakeCtx = ({ state = {}, desktop, policy = { groups: {} }, entries = [], sessions = [], list = [], changes = [], helpPage, page, sleep } = {}) => ({
  state: { desktopId: 'd1', sessionId: 's1', ...state },
  fixtures: { loginApp: '/nonexistent/login-app' },
  desktopState: async () => desktop ?? null,
  desktopWindow: () => helpPage,
  desktopPage: async () => page,
  sleep: sleep ?? (async () => undefined),
  policy: async () => policy,
  transcript: async () => entries,
  sessions: async () => sessions,
  launcherList: async () => list,
  changes: async () => changes
})
const run = (id, ctx, answer) => CHECKS[id](ctx, { answer })
const hereDir = new URL('.', import.meta.url).pathname
const source = (file) => readFileSync(join(hereDir, file), 'utf8')

describe('H-01 T02.2 uses the answer', () => {
  const list = [
    { id: 'a', title: 'Fix login redirect', drives: [] },
    { id: 'b', title: 'Docs', drives: [{ label: 'docs-site' }] }
  ]
  it('is MANUAL without an answer and decided by keywords with one', async () => {
    const ctx = fakeCtx({ state: { desktopId: 'a' }, list })
    expect((await run('T02.2', ctx)).status).toBe('MANUAL')
    expect((await run('T02.2', ctx, 'The name was already used')).status).toBe('PASS')
    expect((await run('T02.2', ctx, 'it just failed')).status).toBe('FAIL')
  })
})

describe('H-02 T08.2 file name and count words', () => {
  const changes = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'README.md'].map((n, i) => ({ path: `E:\\${n}`, additions: i === 4 ? 9 : 1, deletions: 0 }))
  it('accepts the name with or without the extension and a count in words', async () => {
    const ctx = fakeCtx({ changes })
    expect((await run('T08.2', ctx, 'five files, README changed most, lines 3 to 9')).status).toBe('PASS')
    expect((await run('T08.2', ctx, 'five files, README changed most')).status).toBe('FAIL') // H-44: the lines are part of the answer
    expect((await run('T08.2', ctx, '5 files changed, README.md most, lines 3 to 9')).status).toBe('PASS')
    expect((await run('T08.2', ctx, 'five files, a.ts most')).status).toBe('FAIL')
  })
  it('helpers', () => {
    expect(nameWords('E:\\docs\\README.md')).toEqual(['README.md', 'README'])
    expect(countWords(5)).toEqual(['5', 'five'])
  })
})

describe('H-03 T10.1 routes', () => {
  const closed = { desktop: { windows: [], tools: ['fs.read'] }, policy: { groups: { terminal: 'ask' } } }
  it('passes when Terminal is closed, with the Workspace bar wording', async () => {
    expect((await run('T10.1', fakeCtx(closed), 'The Workspace bar, Agent can use, has no Terminal')).status).toBe('PASS')
  })
  it('passes when the Terminal policy is Deny although a Terminal window is open', async () => {
    const ctx = fakeCtx({ desktop: { windows: [win('terminal')], tools: ['terminal'] }, policy: { groups: { terminal: 'deny' } } })
    expect((await run('T10.1', ctx, 'I set it to deny')).status).toBe('PASS')
  })
  it('fails when the command line is still usable', async () => {
    const ctx = fakeCtx({ desktop: { windows: [win('terminal')], tools: ['terminal'] }, policy: { groups: { terminal: 'allow' } } })
    expect((await run('T10.1', ctx)).status).toBe('FAIL')
  })
  it('tasks.md has budget 8 / 10, T10.2 Min 0, T22.1 Min 2, T06.1 Min 1', () => {
    const t = loadTasks()
    expect(t['T10.1']).toMatchObject({ min: 1, budgetExpert: 8, budgetNovice: 10 })
    expect(t['T10.2'].min).toBe(0)
    expect(t['T22.1'].min).toBe(2)
    expect(t['T06.1'].min).toBe(1)
  })
})

describe('H-04 T13.1 progress', () => {
  const progress = (n) => [{ kind: 'message', role: 'agent', blocks: [{ text: `Progress ${n} of 30.` }] }]
  it('reads the last N of M number', () => {
    expect(lastProgress([...progress(3), ...progress(7), msg('user', 'x')])).toBe(7)
  })
  it('passes when the number grew although the row count did not (one row mutates)', async () => {
    const ctx = fakeCtx({ state: { progressAtStart: 3, toolCallsAtStart: 0 }, desktop: { windows: [] }, entries: progress(9), list: [{ id: 'd1', runState: 'working' }] })
    const r = await run('T13.1', ctx)
    expect(r.status).toBe('PASS')
    expect(r.notes.join(' ')).toContain('working')
  })
  it('fails when nothing moved', async () => {
    const ctx = fakeCtx({ state: { progressAtStart: 9, toolCallsAtStart: 0 }, desktop: { windows: [] }, entries: progress(9) })
    expect((await run('T13.1', ctx)).status).toBe('FAIL')
  })
})

describe('H-05 T14.1 does not need the error desktop name', () => {
  it('passes on connection alone', async () => {
    const ctx = fakeCtx({ state: { pendingDesktopId: 'p', errorDesktopTitle: 'Docs site' }, list: [{ id: 'p', connected: true }] })
    expect((await run('T14.1', ctx, 'Docs site has the problem')).status).toBe('PASS') // H-39: the answer names the error workspace
    expect((await run('T14.1', fakeCtx({ state: { pendingDesktopId: 'p' }, list: [{ id: 'p', connected: false }] }))).status).toBe('FAIL')
  })
})

describe('H-06 T15.1 keyword groups', () => {
  let root
  afterEach(() => root && rmSync(root, { recursive: true, force: true }))
  it('needs chat, a drive word and a stays word', async () => {
    root = mkdtempSync(join(tmpdir(), 'ux-t151-'))
    mkdirSync(join(root, 'src/auth'), { recursive: true })
    writeFileSync(join(root, 'src/auth/redirect.ts'), REDIRECT_BUG)
    writeFileSync(join(root, 'src/auth/login.ts'), LOGIN_ORIGINAL)
    const ctx = fakeCtx({ list: [] })
    ctx.fixtures.loginApp = root
    expect((await run('T15.1', ctx, 'Chats and files on C: are lost; the project folder stays')).status).toBe('PASS')
    expect((await run('T15.1', ctx, 'chat')).status).toBe('FAIL')
    expect((await run('T15.1', ctx, 'chats are lost, the folder stays')).status).toBe('FAIL')
  })
})

describe('H-07 T22.x accept the Help window under either title', () => {
  it('finds a help window by app and topic', async () => {
    const ctx = fakeCtx({ desktop: { windows: [win('help', { topic: 'explorer' })] } })
    expect(await helpInfo(ctx)).toMatchObject({ topic: 'explorer' })
    expect((await run('T22.1', ctx, 'it lets you plug in a project folder')).status).toBe('PASS')
    expect((await run('T22.1', ctx)).status).toBe('MANUAL')
  })
  it('T22.2 accepts the chat or recycle-bin topic and rejects another topic', async () => {
    const ok = fakeCtx({ desktop: { windows: [win('help', { topic: 'recycle-bin' })] } })
    expect((await run('T22.2', ok, 'open Changes, select, Revert; the recycle bin restores')).status).toBe('PASS')
    expect((await run('T22.2', fakeCtx({ desktop: { windows: [win('help', { topic: 'chat' })] } }))).status).toBe('MANUAL')
    expect((await run('T22.2', fakeCtx({ desktop: { windows: [win('help', { topic: 'paint' })] } }))).status).toBe('FAIL')
  })
  it('fails without a help window', async () => {
    // H-24: without a Help window the tooltip answer decides; no answer at all needs the researcher
    expect((await run('T22.1', fakeCtx({ desktop: { windows: [] } }), 'no idea')).status).toBe('FAIL')
    expect((await run('T22.1', fakeCtx({ desktop: { windows: [] } }))).status).toBe('MANUAL')
  })
})

describe('H-08 T19.1 scenario and checker agree', () => {
  it('the scenario carries the address placeholder and the checker uses the session port', async () => {
    const t = loadTasks()['T19.1']
    expect(t.scenario).toContain('{TEST_PAGE_URL}')
    expect(scenarioText(t.scenario, { testPageUrl: 'http://127.0.0.1:5555/' })).toContain('http://127.0.0.1:5555/')
    expect(scenarioText(t.scenario)).toContain('http://127.0.0.1:4173/')
    expect(TASKS['T19.1'].options.script).toBe('browser-agent')
    const desktop = (url) => ({ windows: [win('browser', { url })], tools: ['browser'] })
    const state = { testPageUrl: 'http://127.0.0.1:5555/' }
    const read = { sessions: [{ id: 's1' }], entries: [{ kind: 'tool_call', title: 'browser_read', status: 'completed' }] }
    expect((await run('T19.1', fakeCtx({ state, ...read, desktop: desktop('http://127.0.0.1:5555/') }))).status).toBe('MANUAL')
    expect((await run('T19.1', fakeCtx({ state, ...read, desktop: desktop('http://127.0.0.1:4173/') }))).status).toBe('FAIL')
    expect((await run('T19.1', fakeCtx({ state, ...read, desktop: desktop('http://127.0.0.1:5555/') }), 'The assistant can now see the page')).status).toBe('PASS')
    // H-40: no browser_read call, no pass
    expect((await run('T19.1', fakeCtx({ state, desktop: desktop('http://127.0.0.1:5555/') }), 'The assistant can now see the page')).status).toBe('FAIL')
  })
  it('the server takes a configurable port', () => {
    expect(source('server.mjs')).toContain('flags.port')
    expect(source('session.mjs')).toContain('freePort')
  })
})

describe('H-09 T23.2 compares the message text exactly', () => {
  const sent = 'Please list the files'
  const ctx = (reply) => fakeCtx({ state: { firstMessage: sent }, entries: [msg('user', sent), msg('agent', reply)], sessions: [{ id: 's1', status: 'idle' }] })
  it('passes for the exact text and fails for a prefixed or other text', async () => {
    expect((await run('T23.2', ctx(`Got your message: ${sent}`))).status).toBe('PASS')
    expect((await run('T23.2', ctx(`Got your message: You ${sent}`))).status).toBe('FAIL')
    expect((await run('T23.2', ctx('Got your message: hello'))).status).toBe('FAIL')
  })
})

describe('H-10 variant suffix', () => {
  it('strips -inline, -sidebar and -window, and every task id resolves in tasks.md', () => {
    expect(baseTaskId('T18.1-window')).toBe('T18.1')
    expect(baseTaskId('T05.2')).toBe('T05.2')
    const t = loadTasks()
    for (const id of Object.keys(TASKS)) expect(t[baseTaskId(id)], id).toBeTruthy()
  })
})

describe('H-11 folder picker stub', () => {
  it('is installed by the presets and cancels file pickers', () => {
    for (const f of ['presets/base.mjs', 'presets/basic.mjs', 'presets/desktops.mjs']) expect(source(f)).toContain('answerFolderPicker')
    expect(source('lib/context.mjs')).toContain("includes('openDirectory')")
  })
})

describe('H-12 T11.2 accepts all-Ask and needs no prompt', () => {
  it('passes with userInControl or with every group Ask', async () => {
    expect((await run('T11.2', fakeCtx({ desktop: { userInControl: true }, policy: { groups: { 'fs.read': 'allow' } } }))).status).toBe('PASS')
    expect((await run('T11.2', fakeCtx({ desktop: { userInControl: false }, policy: { groups: { 'fs.read': 'ask', terminal: 'ask' } } }))).status).toBe('PASS')
    expect((await run('T11.2', fakeCtx({ desktop: { userInControl: false }, policy: { groups: { 'fs.read': 'ask', terminal: 'allow' } } }))).status).toBe('FAIL')
  })
})

describe('H-14 T24.1 lines', () => {
  it('asks for lines; the checker needs the three files and 3', async () => {
    expect(loadTasks()['T24.1'].scenario).toContain('which lines of redirect.ts')
    const ctx = fakeCtx()
    expect((await run('T24.1', ctx, 'redirect.ts login.ts session.ts, line 3')).status).toBe('PASS')
    expect((await run('T24.1', ctx, 'redirect.ts login.ts session.ts')).status).toBe('FAIL')
  })
})

describe('H-17 desktop titles', () => {
  it('has no "Workspace" default', async () => {
    const { defaultTitle } = await import('./presets/base.mjs')
    expect(defaultTitle(['loginApp'])).toBe('Fix login redirect')
    expect(defaultTitle(['docsSite'])).toBe('Docs site')
  })
})

describe('H-18 T17.2', () => {
  it('needs the wrong command, the Agents page and the same app pid', async () => {
    const ctx = (pid) => ({ ...fakeCtx({ state: { appPid: 7 } }), app: { process: () => ({ pid }) } })
    expect((await run('T17.2', ctx(7), 'It says not-a-real-command was not found; the Agents page lets me change it')).status).toBe('PASS')
    expect((await run('T17.2', ctx(7), 'There was an error with the command')).status).toBe('FAIL')
    expect((await run('T17.2', ctx(8), 'not-a-real-command, see Agents')).status).toBe('FAIL')
  })
})

describe('H-19 phrase patterns', () => {
  it('T16.2 stays MANUAL', async () => {
    expect((await run('T16.2', fakeCtx(), 'no')).status).toBe('MANUAL')
  })
  it('T19.2 rejects near-empty answers', async () => {
    const d = { windows: [win('browser')] }
    expect((await run('T19.2', fakeCtx({ desktop: d }), 'not sure')).status).toBe('FAIL')
    expect((await run('T19.2', fakeCtx({ desktop: d }), 'It could not connect, I would press Refresh')).status).toBe('PASS')
  })
  it('T05.1 needs the file and a finished statement', async () => {
    const entries = [msg('user', 'Fix the login redirect bug so that deep links survive sign-in'), msg('agent', 'ok')]
    const ctx = fakeCtx({ entries, sessions: [{ id: 's1', status: 'idle' }] })
    expect((await run('T05.1', ctx, 'redirect.ts')).status).toBe('FAIL')
    expect((await run('T05.1', ctx, 'It changed redirect.ts and is finished')).status).toBe('PASS')
  })
})

describe('H-20 panel scripts of the scripted agent', () => {
  it('demo writes nothing, runs nothing and leaks no template variable; a2ui replies in plain words', () => {
    expect(source('scripts/demo.json')).not.toMatch(/SCRIPTED\.md|tests\.|"terminal"|writeFile/)
    expect(source('scripts/a2ui.json')).not.toContain('Got action')
  })
})

describe('H-22 near miss', () => {
  it('flags a PASS within +25 percent of the budget but still fails it', () => {
    expect(budgetVerdict('PASS', 6, 6)).toMatchObject({ status: 'PASS', nearMiss: false })
    expect(budgetVerdict('PASS', 7, 6)).toMatchObject({ status: 'FAIL', nearMiss: true })
    expect(budgetVerdict('PASS', 7, 6).lines.join(' ')).toContain('within +25 percent: review')
    expect(budgetVerdict('PASS', 9, 6)).toMatchObject({ status: 'FAIL', nearMiss: false })
    expect(budgetVerdict('FAIL', 7, 6).nearMiss).toBe(false)
  })
})

// ---------------------------------------------------------------- round 2 harness fixes (H-23 .. H-46)
const desktopResource = { kind: 'resource', uri: 'agent7://desktop/state', mimeType: 'application/json', text: '{"windows":[],"appContext":{"openFile":"E:\\\\index.ts","selection":"export const answer = 42"}}' }
const userWithState = (text) => ({ kind: 'message', role: 'user', blocks: [desktopResource, { kind: 'text', text }] })

describe('H-23 user text excludes the desktop-state resource', () => {
  it('userText keeps only text blocks; resourceText reads the resource', () => {
    const m = userWithState('hello')
    expect(userText(m)).toBe('hello')
    expect(resourceText(m)).toContain('agent7://desktop/state')
    expect(userText({ blocks: [{ text: 'old style' }] })).toBe('old style')
  })
  it('T21.1 passes for "hello" behind a resource block and an Allow answer', async () => {
    const entries = [userWithState('hello'), { kind: 'tool_call', permission: { outcome: 'selected', selectedOptionId: 'allow' } }]
    expect((await run('T21.1', fakeCtx({ sessions: [{ id: 's1' }], entries }))).status).toBe('PASS')
    expect((await run('T21.1', fakeCtx({ sessions: [{ id: 's1' }], entries: [userWithState('hello there'), entries[1]] }))).status).toBe('FAIL')
  })
  it('T27.1 passes with the pane question behind a resource block, and its note is not empty', async () => {
    const desktop = { windows: [{ id: 'code-1', app: 'code', view: {}, asideSessionId: 'a1' }] }
    const entries = [userWithState('Explain this'), msg('agent', 'Short answer: lines 1 and 2 of index.ts.')]
    const result = await run('T27.1', fakeCtx({ desktop, entries }))
    expect(result.status).toBe('PASS')
    expect(result.notes.join(' ')).toContain('question: Explain this')
    // a question that names nothing and carries no selection fails (H-38)
    const bare = [{ kind: 'message', role: 'user', blocks: [{ kind: 'text', text: 'hi' }] }, msg('agent', 'ok')]
    expect((await run('T27.1', fakeCtx({ desktop, entries: bare }))).status).toBe('FAIL')
    const typed = [{ kind: 'message', role: 'user', blocks: [{ kind: 'text', text: 'what do the first two lines do?' }] }, msg('agent', 'ok')]
    expect((await run('T27.1', fakeCtx({ desktop, entries: typed }))).status).toBe('PASS')
  })
})

describe('H-24 T22.1 accepts a tooltip answer, H-25 number words', () => {
  it('passes without a Help window when the answer gives the tooltip meaning', async () => {
    const ctx = fakeCtx({ desktop: { windows: [] } })
    expect((await run('T22.1', ctx, 'It plugs in a project folder as a drive so the agent can see its files')).status).toBe('PASS')
    expect((await run('T22.1', ctx, 'I do not know')).status).toBe('FAIL')
    expect((await run('T22.1', ctx)).status).toBe('MANUAL')
  })
  it('T25.2 and T24.1 accept digits and words', async () => {
    const ctx = fakeCtx({ desktop: { windows: [win('code-review')] } })
    expect((await run('T25.2', ctx, 'Changes requested, two comments')).status).toBe('PASS')
    expect((await run('T25.2', ctx, 'Changes requested, 2 comments')).status).toBe('PASS')
    expect((await run('T25.2', ctx, 'Changes requested, five comments')).status).toBe('FAIL')
    expect((await run('T24.1', fakeCtx(), 'redirect.ts, login.ts and session.ts: three files')).status).toBe('PASS')
    expect((await run('T24.1', fakeCtx(), 'redirect.ts, login.ts and session.ts: 3 files')).status).toBe('PASS')
  })
})

describe('H-26 T27.2 measures the file area', () => {
  const pageWith = ({ open = 0, edge = 1, editor, app }) => ({
    locator: (sel) => ({
      count: async () => (sel.includes('data-collapsed="false"') ? open : edge),
      first: () => ({ boundingBox: async () => ({ width: sel.includes('code-editor') ? editor : app }) })
    })
  })
  it('fillsWindow needs 90 percent', () => {
    expect(fillsWindow(900, 1000)).toBe(true)
    expect(fillsWindow(320, 1000)).toBe(false)
    expect(fillsWindow(0, 0)).toBe(false)
  })
  it('fails when the pane is hidden but the editor is a narrow column; passes when it fills the window', async () => {
    const narrow = await run('T27.2', fakeCtx({ page: pageWith({ editor: 320, app: 1100 }) }))
    expect(narrow.status).toBe('FAIL')
    expect(narrow.reason).toContain('320 px wide of 1100 px')
    expect((await run('T27.2', fakeCtx({ page: pageWith({ editor: 1050, app: 1100 }) }))).status).toBe('PASS')
    expect((await run('T27.2', fakeCtx({ page: pageWith({ open: 1, editor: 1050, app: 1100 }) }))).status).toBe('FAIL')
  })
})

describe('H-28 T29.1 uses the served per-session address', () => {
  const base = 'http://127.0.0.1:5555/'
  const tab = (url, label, active) => ({ id: 'browser-tab-x', active: String(active), url, label })
  const ok = (tabs) => judgeTabs(tabs, base).every(([good]) => good)
  it('tasks.md and the scenario use the placeholder; the server answers /second', () => {
    const t = loadTasks()['T29.1']
    expect(t.scenario).toContain('{TEST_PAGE_URL}second')
    expect(scenarioText(t.scenario, { testPageUrl: base })).toContain('http://127.0.0.1:5555/second')
    expect(source('server.mjs')).toContain('TEST_PAGE_SECOND_HTML')
  })
  it('needs two tabs, the first active, the second on /second with a real title', () => {
    expect(ok([tab(base, 'Fixture page', true), tab(`${base}second`, 'Second page', false)])).toBe(true)
    expect(ok([tab(base, 'Fixture page', true), tab('http://127.0.0.1:4173/second', 'Second page', false)])).toBe(false)
    expect(ok([tab(base, 'Fixture page', true), tab(`${base}second`, "This page can't be displayed", false)])).toBe(false)
    expect(ok([tab(base, 'Fixture page', false), tab(`${base}second`, 'Second page', true)])).toBe(false)
    expect(ok([tab(base, 'Fixture page', true)])).toBe(false)
  })
})

describe('H-33 T28.2 accepts take over or pause', () => {
  const calls = (n) => Array.from({ length: n }, () => ({ kind: 'tool_call', status: 'completed' }))
  const steady = (desktop) => ({ ...fakeCtx({ desktop }), transcript: async () => calls(3) })
  it('passes for userInControl and for paused when no tool call starts', async () => {
    expect((await run('T28.2', steady({ userInControl: true, paused: false }))).status).toBe('PASS')
    const paused = await run('T28.2', steady({ userInControl: false, paused: true }))
    expect(paused.status).toBe('PASS')
    expect(paused.notes.join(' ')).toContain('control used: paused')
  })
  it('fails when neither is set, or when the agent keeps calling tools', async () => {
    expect((await run('T28.2', steady({ userInControl: false, paused: false }))).status).toBe('FAIL')
    let n = 0
    const busy = { ...fakeCtx({ desktop: { userInControl: true } }), transcript: async () => calls(3 + n++) }
    expect((await run('T28.2', busy)).status).toBe('FAIL')
  })
})

describe('H-35 presets act through the UI', () => {
  it('eject-mid-job uses the tray menu and paused-desktop the top bar button', () => {
    const chat = source('presets/chat.mjs')
    expect(chat).toContain("getByTestId('usb-tray')")
    expect(chat).toContain('dialog-button-yes')
    expect(chat).not.toContain('window.agent7.drives.eject')
    expect(chat).toContain("getByTestId('topbar-pause')")
    expect(chat).not.toContain('desktop.setPaused')
  })
})

describe('H-32 fixtures live under a sandbox home', () => {
  it('the server starts the app with HOME and puts the projects in Documents', () => {
    const server = source('server.mjs')
    expect(server).toContain("join(sandboxHome, 'Documents')")
    expect(server).toContain('home: sandboxHome')
    const context = source('lib/context.mjs')
    expect(context).toContain('HOME: home')
    expect(context).toContain('USERPROFILE: home')
  })
})

describe('H-39 T14.1, H-42 T17.2, H-44 T06.1 and T08.2 check the answer', () => {
  it('T14.1 needs the error workspace in the answer', async () => {
    const list = [{ id: 'p', connected: true }]
    const ctx = fakeCtx({ state: { pendingDesktopId: 'p', errorDesktopTitle: 'Docs site' }, list })
    expect((await run('T14.1', ctx)).status).toBe('MANUAL')
    expect((await run('T14.1', ctx, 'Docs site has a problem')).status).toBe('PASS')
    expect((await run('T14.1', ctx, 'Scratch pad has a problem')).status).toBe('FAIL')
    expect(loadTasks()['T14.1'].scenario).toContain('which workspace has a problem')
  })
  it('T17.2 needs cause, place and what to do', async () => {
    const ctx = fakeCtx({ state: { appPid: 1 } })
    ctx.app = { process: () => ({ pid: 1 }) }
    expect((await run('T17.2', ctx, 'The command not-a-real-command was not found; open the Agents page and change it')).status).toBe('PASS')
    expect((await run('T17.2', ctx, 'The command not-a-real-command was not found, see the Agents page')).status).toBe('FAIL')
  })
  it('T06.1 and T08.2 scenarios ask for lines', () => {
    expect(loadTasks()['T06.1'].scenario).toContain('Tell me which lines it changes')
    expect(loadTasks()['T08.2'].scenario).toContain('which lines of that file changed')
  })
})

describe('H-29 H-30 H-43 H-46 facilitator tools', () => {
  it('asksQuestion recognises question scenarios', () => {
    expect(asksQuestion(loadTasks()['T25.2'].scenario)).toBe(true)
    expect(asksQuestion('Close the window and open a new chat.')).toBe(false)
    expect(source('session.mjs')).toContain('--answer was not given')
  })
  it('stop needs a check.json unless --no-check, and keeps the folder of a gone session', () => {
    expect(source('session.mjs')).toContain("flags['no-check']")
    expect(source('session.mjs')).toContain('no running session')
    expect(source('presets-smoke.mjs')).toContain("'--no-check'")
  })
  it('ux windows prints the window kind', () => {
    expect(source('server.mjs')).toContain('[${kind}]')
  })
  it('flags a weak pass at the budget limit or with a low SEQ', () => {
    expect(budgetVerdict('PASS', 6, 6)).toMatchObject({ status: 'PASS', weak: true })
    expect(budgetVerdict('PASS', 6, 6).lines.join(' ')).toContain('weak pass: at the budget limit')
    expect(budgetVerdict('PASS', 2, 6, 4)).toMatchObject({ weak: true })
    expect(budgetVerdict('PASS', 2, 6, 5)).toMatchObject({ weak: false, lines: [] })
    expect(budgetVerdict('PASS', 2, 6)).toMatchObject({ weak: false })
    expect(budgetVerdict('FAIL', 6, 6).weak).toBe(false)
    expect(budgetVerdict('PASS', 7, 6).weak).toBe(false)
  })
})

describe('H-27 H-31 H-38 H-40 scripts', () => {
  const json = (file) => JSON.parse(source(file))
  it('browser-slow scrolls in every cycle', () => {
    const steps = json('scripts/browser-slow.json').rules[0].steps
    const reads = steps.filter((x) => x.tool === 'browser_read').length
    expect(reads).toBeGreaterThan(20)
    expect(steps.filter((x) => x.tool === 'browser_scroll')).toHaveLength(reads)
  })
  it('crash-recovery hangs, crash-recovered ends within 5 seconds', () => {
    const waits = json('scripts/crash-recovered.json').rules[0].steps.filter((x) => x.type === 'wait').map((x) => x.ms)
    expect(waits.reduce((a, b) => a + b, 0)).toBeLessThan(5000)
    expect(JSON.stringify(json('scripts/crash-recovered.json'))).toContain('Done. The slow job is finished.')
    expect(source('presets/chat.mjs')).toContain("script: 'crash-recovery'")
  })
  it('aside does not echo the question and answers about the lines', () => {
    const aside = json('scripts/aside.json')
    expect(JSON.stringify(aside.fallback)).not.toContain('{{prompt}}')
    expect(aside.rules.map((r) => r.id)).toContain('explain-lines')
  })
  it('browser-agent has a read rule and a fallback', () => {
    const agent = json('scripts/browser-agent.json')
    expect(agent.rules.find((r) => r.id === 'read-page').steps.some((x) => x.tool === 'browser_read')).toBe(true)
    expect(JSON.stringify(agent.fallback)).toContain('I can read the page that is open in the Browser.')
  })
})
