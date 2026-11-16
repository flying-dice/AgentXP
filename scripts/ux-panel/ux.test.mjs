import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { normalizeKey, parseArgs, parseCommand } from './lib/args.mjs'
import { countSteps, createLog, readLog, summarize } from './lib/log.mjs'
import { baseTaskId, budgetVerdict, loadTasks, parseTasks, scenarioText } from './lib/tasktext.mjs'
import { CHECKS } from './checks/index.mjs'
import { countWords, helpInfo, lastProgress, nameWords } from './checks/util.mjs'
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
const fakeCtx = ({ state = {}, desktop, policy = { groups: {} }, entries = [], sessions = [], list = [], changes = [], helpPage } = {}) => ({
  state: { desktopId: 'd1', sessionId: 's1', ...state },
  fixtures: { loginApp: '/nonexistent/login-app' },
  desktopState: async () => desktop ?? null,
  desktopWindow: () => helpPage,
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
    expect((await run('T08.2', ctx, 'five files, README changed most')).status).toBe('PASS')
    expect((await run('T08.2', ctx, '5 files changed, README.md most')).status).toBe('PASS')
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
    expect((await run('T14.1', ctx)).status).toBe('PASS')
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
    expect((await run('T22.1', fakeCtx({ desktop: { windows: [] } }))).status).toBe('FAIL')
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
    expect((await run('T19.1', fakeCtx({ state, desktop: desktop('http://127.0.0.1:5555/') }))).status).toBe('MANUAL')
    expect((await run('T19.1', fakeCtx({ state, desktop: desktop('http://127.0.0.1:4173/') }))).status).toBe('FAIL')
    expect((await run('T19.1', fakeCtx({ state, desktop: desktop('http://127.0.0.1:5555/') }), 'The assistant can now see the page')).status).toBe('PASS')
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
