import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { normalizeKey, parseArgs, parseCommand } from './lib/args.mjs'
import { countSteps, createLog, readLog, stepsToPassFromLog, summarize } from './lib/log.mjs'
import { windowKind, windowLine } from './lib/windows.mjs'
import { buildBrief, RECORD_TEMPLATE } from './lib/brief.mjs'
import { scrollReport, scrollWarning } from './lib/args.mjs'
import { answerOrderNotes } from './checks/chat.mjs'
import { canonicalTaskId, contextConflicts, contextProblem, parsePrevious, withStepsLine } from './lib/tasktext.mjs'
import { effectiveSteps, recordAnswerProblem, stepsToPassOf, answerProblem, asksQuestion, baseTaskId, budgetFor, budgetVerdict, loadTasks, normalizeLevel, parseTasks, scenarioText, seqFromRecord, withSeq, answerTooShort, seqProblem, startDecision, syncSeq } from './lib/tasktext.mjs'
import { CHECKS } from './checks/index.mjs'
import { barChipConflicts, countsThreeAndThree } from './checks/chat.mjs'
import { commitProblem, gateProblem, readBuild, siblingCommits, withBuildLine } from './lib/build.mjs'
import { T162_NO, T162_WHY } from './checks/settings.mjs'
import { controlNotes, countWords, helpInfo, lastProgress, missingNumbers, nameWords, numbersIn, resourceText, saysCouldNotTell, userText } from './checks/util.mjs'
import { fillsWindow, judgeTabs, readTabs, staleTabNotes } from './checks/features.mjs'
import { LOGIN_ORIGINAL, REDIRECT_BUG, REDIRECT_FIXED } from './lib/fixtures.mjs'
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

describe('H-03 T10.1 and T10.2 (J10 agents work quietly)', () => {
  it('T10.1 passes when Code shows redirect.ts and the answer names both files', async () => {
    const ctx = fakeCtx({ desktop: { windows: [win('code', { activePath: 'W:/src/auth/redirect.ts' })], tools: [] } })
    expect((await run('T10.1', ctx, 'It changed login.ts and redirect.ts')).status).toBe('PASS')
  })
  it('T10.1 fails without a Code window on redirect.ts and without its change in the Changes list', async () => {
    const ctx = fakeCtx({ desktop: { windows: [], tools: [] } })
    expect((await run('T10.1', ctx, 'login.ts and redirect.ts')).status).toBe('FAIL')
  })
  it('T10.1 passes when the chat Changes list shows the change of redirect.ts (panel r9)', async () => {
    const page = { getByTestId: () => ({ allInnerTexts: async () => ["return next && next.startsWith('/') ? next : '/home'"] }) }
    const ctx = fakeCtx({ desktop: { windows: [], tools: [] }, page })
    expect((await run('T10.1', ctx, 'It changed login.ts and redirect.ts')).status).toBe('PASS')
  })
  it('T10.2 passes on Deny and fails otherwise', async () => {
    expect((await run('T10.2', fakeCtx({ desktop: { windows: [], tools: [] }, policy: { groups: { terminal: 'deny' } } }), 'I set it to deny in Control Center')).status).toBe('PASS')
    expect((await run('T10.2', fakeCtx({ desktop: { windows: [], tools: [] }, policy: { groups: { terminal: 'ask' } } }), 'I set it to deny')).status).toBe('FAIL')
  })
  it('tasks.md has T10.1 budget 6 / 8, T10.2 Min 4, T22.1 Min 2, T06.1 Min 1 (J10 rewritten by docs/AGENT_PRESENCE.md)', () => {
    const t = loadTasks()
    expect(t['T10.1']).toMatchObject({ min: 2, budgetExpert: 6, budgetNovice: 8 })
    expect(t['T10.2'].min).toBe(4)
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
    const ctx = fakeCtx({ state: { progressAtStart: 3, toolCallsAtStart: 0 }, desktop: { windows: [win('chat', { sessionId: 's1' })] }, entries: progress(9), list: [{ id: 'd1', runState: 'working' }] })
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
  it('H-96: T22.2 accepts a correct answer without a Help window, and still fails a wrong one', async () => {
    const none = fakeCtx({ desktop: { windows: [] } })
    expect((await run('T22.2', none, 'Open Changes, select the change and click Revert; the Recycle Bin can restore it')).status).toBe('PASS')
    expect((await run('T22.2', none, 'I do not know')).status).toBe('FAIL')
    expect((await run('T22.2', none)).status).toBe('MANUAL')
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
    // H-49: the answer says what the page says, as the assistant told it
    expect((await run('T19.1', fakeCtx({ state, ...read, desktop: desktop('http://127.0.0.1:5555/') }), 'The assistant says the page is "Example Domain"')).status).toBe('PASS')
    expect((await run('T19.1', fakeCtx({ state, ...read, desktop: desktop('http://127.0.0.1:5555/') }), 'The assistant can now see the page')).status).toBe('FAIL')
    // H-40: no browser_read call, no pass
    expect((await run('T19.1', fakeCtx({ state, desktop: desktop('http://127.0.0.1:5555/') }), 'It says Example Domain')).status).toBe('FAIL')
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
  it('asks for lines; the checker needs the three files and the lines 1, 3 and 4 (H-60)', async () => {
    expect(loadTasks()['T24.1'].scenario).toContain('which lines of redirect.ts')
    const ctx = fakeCtx()
    expect((await run('T24.1', ctx, 'redirect.ts login.ts session.ts, lines 1, 3 and 4')).status).toBe('PASS')
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
  it('T16.2 without an answer is MANUAL (H-68 decides it with an answer)', async () => {
    expect((await run('T16.2', fakeCtx())).status).toBe('MANUAL')
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
const desktopResource = { kind: 'resource', uri: 'agentxp://desktop/state', mimeType: 'application/json', text: '{"windows":[],"appContext":{"openFile":"E:\\\\index.ts","selection":"export const answer = 42"}}' }
const userWithState = (text) => ({ kind: 'message', role: 'user', blocks: [desktopResource, { kind: 'text', text }] })

describe('H-23 user text excludes the desktop-state resource', () => {
  it('userText keeps only text blocks; resourceText reads the resource', () => {
    const m = userWithState('hello')
    expect(userText(m)).toBe('hello')
    expect(resourceText(m)).toContain('agentxp://desktop/state')
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
    expect((await run('T24.1', fakeCtx(), 'redirect.ts, login.ts and session.ts: lines one, three and four')).status).toBe('PASS')
    expect((await run('T24.1', fakeCtx(), 'redirect.ts, login.ts and session.ts: 3 files')).status).toBe('FAIL')
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
    expect(chat).not.toContain('window.agentxp.drives.eject')
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
    expect((await run('T14.1', ctx, 'the docs-site workspace has a problem')).status).toBe('PASS')
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
    expect(asksQuestion(loadTasks()['T25.2'])).toBe(true)
    expect(asksQuestion(loadTasks()['T04.2'])).toBe(false)
    expect(source('session.mjs')).toContain('answerProblem')
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
    expect(JSON.stringify(agent.fallback)).toContain('Okay.')
  })
})

// ---------------------------------------------------------------- round 3 harness defects H-47 to H-64
describe('H-47 T29.1 reads the address from the title attribute of the tab button', () => {
  // The markup of BrowserApp.svelte: one button.tab with title={tab.url} and a span.label; no .tabtitle child.
  const element = (attrs, label) => ({ getAttribute: (n) => attrs[n] ?? null, querySelector: (sel) => (sel === '.label' ? { textContent: label } : null) })
  const base = 'http://127.0.0.1:5555/'
  it('readTabs returns the address and the label of the real tab markup', () => {
    const tab = readTabs([element({ 'data-testid': 'browser-tab-t1', 'data-active': 'true', title: base }, 'Fixture page')])[0]
    expect(tab).toEqual({ id: 'browser-tab-t1', active: 'true', url: base, label: 'Fixture page' })
  })
  it('two correct tabs of the real markup pass judgeTabs', () => {
    const tabs = readTabs([element({ 'data-testid': 'browser-tab-a', 'data-active': 'true', title: base }, 'Fixture page'), element({ 'data-testid': 'browser-tab-b', 'data-active': 'false', title: `${base}second` }, 'Second page')])
    expect(judgeTabs(tabs, base).every(([ok]) => ok)).toBe(true)
    expect(staleTabNotes(tabs)).toEqual([])
  })
  it('an empty reading prints a stale-selector warning', () => {
    const tabs = readTabs([element({ 'data-testid': 'browser-tab-a', 'data-active': 'true' }, 'Fixture page')])
    expect(tabs[0].url).toBe('')
    expect(staleTabNotes(tabs)[0]).toContain('stale')
  })
  it('the checker uses readTabs and the product still has title={tab.url} and no .tabtitle', () => {
    expect(source('checks/features.mjs')).toContain('.evaluateAll(readTabs)')
    expect(source('checks/features.mjs')).not.toContain('button.tabtitle')
    const svelte = readFileSync(join(hereDir, '../../src/renderer/src/lib/apps/browser/BrowserApp.svelte'), 'utf8')
    expect(svelte).toContain('title={tab.url}')
    expect(svelte).not.toContain('tabtitle')
  })
})

describe('H-48 budgets follow the level', () => {
  const task = { budgetNovice: 20, budgetExpert: 15 }
  it('novice gets the novice budget, intermediate and expert the 3 x Min budget', () => {
    expect(budgetFor(task, 'novice')).toBe(20)
    expect(budgetFor(task, 'intermediate')).toBe(15)
    expect(budgetFor(task, 'expert')).toBe(15)
    expect(budgetFor(task, 'haiku')).toBe(20)
    expect(budgetFor(task, 'sonnet')).toBe(15)
    expect(budgetFor(task, undefined)).toBe(15)
  })
  it('T20.1 novice is 20, intermediate 15', () => {
    const t = loadTasks()['T20.1']
    expect([budgetFor(t, 'novice'), budgetFor(t, 'intermediate')]).toEqual([20, 15])
  })
  it('an unknown level is an error', () => {
    expect(() => budgetFor(task, 'beginner')).toThrow(/unknown level/)
    expect(() => normalizeLevel('')).toThrow()
    expect(source('session.mjs')).toContain('normalizeLevel')
  })
})

describe('H-49 T19.1 asks the assistant, H-50 T02.2 asks for the reason', () => {
  it('the scenario asks to ask the assistant what the page says', () => {
    const t = loadTasks()['T19.1']
    expect(t.scenario).toBe('Open the web page at {TEST_PAGE_URL} on this desktop, then ask the assistant what it says.')
    expect(t.answer).toContain('Example Domain')
  })
  it('the browser-agent read rule matches "what does it say"', () => {
    const rule = JSON.parse(source('scripts/browser-agent.json')).rules.find((r) => r.id === 'read-page')
    expect(new RegExp(rule.match.regex, 'i').test('What does it say?')).toBe(true)
    expect(new RegExp(rule.match.regex, 'i').test('Please read this')).toBe(true)
  })
  it('H-98: the read rule does not match a follow-up about the work, and T28.1 puts the request on its own line', () => {
    const rule = JSON.parse(source('scripts/browser-agent.json')).rules.find((r) => r.id === 'read-page')
    const re = new RegExp(rule.match.regex, 'i')
    expect(re.test('How could I tell that you were using the page?')).toBe(false)
    expect(re.test('Then tell me what you did in the browser.')).toBe(false)
    const t = loadTasks()['T28.1']
    expect(t.scenario).toContain('tell the facilitator')
    expect(t.scenario.split('\n\n')).toContain('Use the chat app at http://127.0.0.1:4174/')
  })
  it('T02.2 tries the same name and needs the reason', async () => {
    const t = loadTasks()['T02.2']
    expect(t.scenario).toContain('Try to give it the same name. If the program will not allow that, say why')
    expect(t.scenario).not.toContain('with the same name.')
    const list = [{ id: 'a', title: 'Fix login redirect', drives: [] }, { id: 'b', title: 'Docs', drives: [{ label: 'docs-site' }] }]
    const ctx = fakeCtx({ state: { desktopId: 'a' }, list })
    expect((await run('T02.2', ctx, 'The program said the name is already taken by another workspace')).status).toBe('PASS')
    expect((await run('T02.2', ctx, 'Every workspace needs its own name')).status).toBe('PASS')
    expect((await run('T02.2', ctx, 'it was refused')).status).toBe('FAIL')
  })
})

describe('H-51 T14.1 start state waits for the agent problem', () => {
  it('the four-desktops preset runs checkAgents and waits for agentProblem after the last desktop', () => {
    const src = source('presets/desktops.mjs')
    const i = src.indexOf("'four-desktops'")
    const body = src.slice(i)
    expect(body.indexOf('launcher.checkAgents')).toBeGreaterThan(body.indexOf("title: 'Scratch pad'"))
    expect(body).toContain('agentProblem')
  })
  it('T14.1 notes a row without a problem and accepts the hyphenated name', async () => {
    const list = [{ id: 'p', connected: true }, { id: 'e', agentProblem: null }]
    const ctx = fakeCtx({ state: { pendingDesktopId: 'p', errorDesktopId: 'e', errorDesktopTitle: 'Docs site' }, list })
    const result = await run('T14.1', ctx, 'Docs site')
    expect(result.status).toBe('PASS')
    expect(result.notes.join(' ')).toContain('shows no agent problem')
    const okList = [{ id: 'p', connected: true }, { id: 'e', agentProblem: 'The agent could not start.' }]
    expect((await run('T14.1', fakeCtx({ state: { pendingDesktopId: 'p', errorDesktopId: 'e', errorDesktopTitle: 'Docs site' }, list: okList }), 'Docs site')).notes.join(' ')).not.toContain('no agent problem')
  })
})

describe('H-52 a hover waits for the tooltip', () => {
  it('move waits longer than the 500 ms tooltip delay', () => {
    const src = source('server.mjs')
    expect(src).toContain('HOVER_WAIT_MS = 1200')
    expect(src).toContain("cmd === 'move' ? HOVER_WAIT_MS : 150")
  })
  it('PANELIST.md says to look again after a hover', () => {
    expect(source('PANELIST.md')).toContain('look again')
  })
})

describe('H-53 the rating comes from the record, H-59 answer tasks need --answer or --no-answer, H-54 Answer: lines', () => {
  it('seqFromRecord reads the SEQ line', () => {
    expect(seqFromRecord('# T04.1 - novice\n- Result: PASS\n- SEQ: 6\n- Errors: none')).toBe(6)
    expect(seqFromRecord('- SEQ: 2 (hard)')).toBe(2)
    expect(seqFromRecord('- SEQ: n/a')).toBe(null)
    expect(seqFromRecord('- SEQ: 9')).toBe(null)
    expect(seqFromRecord('no rating')).toBe(null)
  })
  it('withSeq recomputes the weak flag from the rating', () => {
    const check = { status: 'PASS', steps: 3, budget: 12, seq: null, weak: false }
    expect(withSeq(check, 6)).toMatchObject({ seq: 6, weak: false })
    expect(withSeq(check, 4)).toMatchObject({ seq: 4, weak: true })
    expect(withSeq({ ...check, weak: true }, 7)).toMatchObject({ seq: 7, weak: false })
    expect(withSeq({ ...check, status: 'FAIL' }, 2).weak).toBe(false)
  })
  it('check takes no --seq; stop takes --record', () => {
    const src = source('session.mjs')
    expect(src).not.toContain("seq: 'string'")
    expect(src).toContain("record: 'string'")
    expect(src).toContain('syncSeq')
    expect(source('FACILITATOR.md')).not.toContain('--seq <SEQ>')
  })
  it('answerProblem refuses an answer task without --answer or --no-answer', () => {
    const task = loadTasks()['T22.1']
    expect(answerProblem(task, {})).toContain('--no-answer')
    expect(answerProblem(task, { answer: 'It plugs in a folder' })).toBe(null)
    expect(answerProblem(task, { noAnswer: true })).toContain('--accept-no-answer') // H-90: --no-answer alone is refused
    expect(answerProblem(task, { noAnswer: true, acceptNoAnswer: true })).toBe(null)
    expect(answerProblem(loadTasks()['T04.2'], {})).toBe(null)
  })
  it('"Find out" scenarios without an Answer: line do not ask a question (T01.1, T07.1)', () => {
    const tasks = loadTasks()
    expect(tasks['T01.1'].scenario).toMatch(/find out/i)
    expect(asksQuestion(tasks['T01.1'])).toBe(false)
    expect(asksQuestion(tasks['T07.1'])).toBe(false)
    expect(answerProblem(tasks['T07.1'], {})).toBe(null)
  })
  it('every task whose checker reads the answer has an Answer: line in tasks.md, and the other tasks have none', () => {
    const withChecker = ['T02.2', 'T05.1', 'T06.1', 'T08.2', 'T10.1', 'T10.2', 'T12.2', 'T14.1', 'T15.1', 'T16.2', 'T17.2', 'T18.1', 'T19.1', 'T19.2', 'T20.1', 'T22.1', 'T22.2', 'T24.1', 'T24.2', 'T25.1', 'T25.2', 'T25.3', 'T28.1', 'T30.2', 'T31.1', 'T31.2', 'T33.1']
    const tasks = loadTasks()
    for (const id of withChecker) expect(asksQuestion(tasks[id]), id).toBe(true)
    const rest = Object.keys(tasks).filter((id) => !withChecker.includes(id))
    for (const id of rest) expect(asksQuestion(tasks[id]), id).toBe(false)
  })
  it('the smoke test passes --no-answer', () => {
    expect(source('presets-smoke.mjs')).toContain("'--no-answer'")
  })
})

describe('H-55 H-56 the scripted agents speak plain words', () => {
  const json = (file) => JSON.parse(source(file))
  const texts = (x) => JSON.stringify(x).match(/"text":"[^"]*"/g) ?? []
  it('eject-victim and a2ui print no tool result fields', () => {
    for (const file of ['scripts/eject-victim.json', 'scripts/a2ui.json']) {
      const all = texts(json(file)).join(' ')
      expect(all, file).not.toMatch(/Error: \{\{|isError|Tool said|Update result|surface "|\{\{render\}\}|\{\{update\}\}/)
    }
    expect(texts(json('scripts/eject-victim.json')).join(' ')).toContain('I could not read README.md: {{readme}}')
  })
  it('the chip "Explain this" answers for the selected lines, like the right-click route', () => {
    const aside = json('scripts/aside.json')
    const final = (id) => aside.rules.find((r) => r.id === id).steps.filter((x) => x.type === 'message').at(-1).text
    expect(final('explain')).toBe(final('explain-lines'))
    expect(final('explain')).toContain('lines 1 and 2 of index.ts')
    expect(JSON.stringify(aside.rules.find((r) => r.id === 'explain'))).not.toContain('{{file}}')
  })
})

describe('H-57 H-58 H-63 presets', () => {
  it('T07.1 asks for two different files and checks the flag shows 2', () => {
    const src = source('presets/chat.mjs')
    expect(src).toContain('PROMPT_LOGIN')
    expect(src).toContain("'2', 'the taskbar flag showing 2 waiting requests'")
    const base = source('presets/base.mjs')
    expect(base).toContain('src/auth/login.ts')
    const rules = JSON.parse(source('scripts/fix-redirect.json')).rules
    const login = rules.find((r) => r.id === 'login')
    expect(rules.indexOf(login)).toBeLessThan(rules.findIndex((r) => r.id === 'work'))
    expect(new RegExp(login.match.regex, 'i').test('Trim the user name in src/auth/login.ts before it is checked')).toBe(true)
    expect(new RegExp(login.match.regex, 'i').test('Fix the login redirect bug so that deep links survive sign-in')).toBe(false)
    expect(JSON.stringify(login)).toContain('src/auth/login.ts')
    expect(JSON.stringify(login)).not.toContain('src/auth/redirect.ts')
  })
  it('crashed-agent asserts Restart and send again; the second failure is its own task', () => {
    const src = source('presets/chat.mjs')
    expect(src).toContain('chat-error-restart-send')
    expect(src).toContain('options.twice')
    expect(TASKS['T23.1']).toEqual({ preset: 'crashed-agent' })
    expect(TASKS['T23.1b']).toMatchObject({ preset: 'crashed-agent', options: { twice: true } })
    expect(TASKS['T23.1-twice']).toBeUndefined() // H-86
    expect(baseTaskId('T23.1-twice')).toBe('T23.1b')
    expect(CHECKS['T23.1b']).toBeTypeOf('function')
    expect(CHECKS['T23.1']).toBeTypeOf('function')
  })
  it('T23.1 prints a note when the start state was not the first crash', async () => {
    const entries = [msg('user', 'a'), msg('agent', 'b'), msg('user', 'c')]
    const base = { entries, sessions: [{ id: 's1', status: 'idle' }] }
    const ctx = fakeCtx({ ...base, state: { firstCrashOffersRestartSend: false, startedAtSecondFailure: true } })
    ctx.runOutcomes = async () => ['cancelled', 'success']
    const result = await run('T23.1', ctx)
    expect(result.status).toBe('PASS')
    expect(result.notes.join(' ')).toContain('"Restart and send again"')
    const ok = fakeCtx({ ...base, state: { firstCrashOffersRestartSend: true } })
    ok.runOutcomes = async () => ['success']
    expect((await run('T23.1', ok)).notes).toEqual([])
  })
  it('the presets with a reopened chat dismiss the "Reopened ..." note', () => {
    const src = source('presets/chat.mjs')
    expect(src.match(/dismissReopenedNotes/g).length).toBe(2)
    expect(source('lib/context.mjs')).toContain('chat-reopened-dismiss')
  })
})

describe('H-60 T24.1 needs the lines 1, 3 and 4', () => {
  const files = 'redirect.ts, login.ts and session.ts changed'
  it('numbersIn expands ranges and ignores digits inside longer numbers', () => {
    expect([...numbersIn('lines 1, 3 and 4')].sort()).toEqual([1, 3, 4])
    expect([...numbersIn('lines 1-4', { ranges: true })].sort()).toEqual([1, 2, 3, 4])
    expect([...numbersIn('lines 1-4')].sort()).toEqual([1, 4]) // H-77: no range expansion by default
    expect(numbersIn('line 13 and 1.5').has(1)).toBe(false)
    expect(missingNumbers('3 and 4', [1, 3, 4])).toEqual([1])
  })
  it('passes with all three lines, fails with a lone 3 or two lines', async () => {
    expect((await run('T24.1', fakeCtx(), `${files}; new lines 1, 3 and 4 of redirect.ts`)).status).toBe('PASS')
    expect((await run('T24.1', fakeCtx(), `${files}; lines 1 to 4 of redirect.ts`)).status).toBe('FAIL') // H-77: a range is not expanded
    const noLine = await run('T24.1', fakeCtx(), `${files}; line 3`)
    expect(noLine.status).toBe('FAIL')
    expect(noLine.reason).toContain('1, 4')
    expect((await run('T24.1', fakeCtx(), `${files}; 3 files, line 3 and 4`)).status).toBe('FAIL')
    expect((await run('T24.1', fakeCtx(), 'redirect.ts and login.ts; lines 1, 3 and 4')).status).toBe('FAIL')
    expect((await run('T24.1', fakeCtx())).status).toBe('MANUAL')
  })
})

describe('H-61 the panelist quotes the screen', () => {
  it('PANELIST.md asks for text copied from a shot and a last look', () => {
    const text = source('PANELIST.md')
    expect(text).toContain('copied from a screenshot')
    expect(text).toContain('one more `shot`')
    expect(source('FACILITATOR.md')).toContain('LAST shot')
  })
})

describe('H-62 T19.2 keywords by cause', () => {
  const desktop = { windows: [win('browser', { url: 'http://127.0.0.1:9/' })], tools: ['browser'] }
  it('the blocked-port answer of the novice passes, a vague answer fails', async () => {
    const ctx = fakeCtx({ desktop })
    const novice = 'The address 127.0.0.1:9 uses a port that the Browser blocks. Check the number after the colon and type the right address.'
    expect((await run('T19.2', ctx, novice)).status).toBe('PASS')
    expect((await run('T19.2', ctx, 'The page does not load')).status).toBe('PASS')
    expect((await run('T19.2', ctx, 'The connection was refused')).status).toBe('PASS')
    expect((await run('T19.2', ctx, 'something is wrong with it')).status).toBe('FAIL')
    expect((await run('T19.2', ctx)).status).toBe('MANUAL')
  })
})

describe('H-64 T27.2 does not say side panel', () => {
  it('the scenario asks for the whole window and that nothing else shares it', () => {
    const t = loadTasks()['T27.2']
    expect(t.scenario).toBe('The file has too little room. Make the file use the whole window. Nothing else should share the window with the file.')
    expect(t.scenario).not.toMatch(/side panel/i)
  })
})

describe('H-65 T23.1b, the second failure', () => {
  it('tasks.md has T23.1b and the preset asserts "It stopped again", no stale comment', () => {
    const t = loadTasks()['T23.1b']
    expect(t.title).toBe('It crashed again')
    expect(t.min).toBe(3)
    expect(t.budgetNovice).toBe(12)
    const src = source('presets/chat.mjs')
    expect(src).not.toContain('one SIGKILL mid-turn is counted as two failures')
    expect(src).toContain('UX-123')
    expect(src).toContain('secondFailureOffersNewChat')
  })
  const sessions = [{ id: 's1', status: 'idle' }, { id: 's2', status: 'idle' }]
  const mk = (state, outcomes) => {
    const ctx = fakeCtx({ state, sessions, entries: [msg('user', 'a'), msg('agent', 'b')] })
    ctx.runOutcomes = async (_d, id) => outcomes[id] ?? []
    return ctx
  }
  it('passes when a turn finished after the second failure, in this chat or in a new one', async () => {
    expect((await run('T23.1b', mk({ secondFailure: true, secondFailureOffersNewChat: true }, { s1: ['cancelled', 'success'] }))).status).toBe('PASS')
    expect((await run('T23.1b', mk({ secondFailure: true, secondFailureOffersNewChat: true }, { s2: ['success'] }))).status).toBe('PASS')
  })
  it('fails without a finished turn or when the start state never reached the second failure', async () => {
    expect((await run('T23.1b', mk({ secondFailure: true }, { s1: ['cancelled'] }))).status).toBe('FAIL')
    expect((await run('T23.1b', mk({}, { s1: ['success'] }))).status).toBe('FAIL')
  })
  it('notes a box that does not offer Start a new chat (UX-123 not shipped)', async () => {
    const result = await run('T23.1b', mk({ secondFailure: true, secondFailureOffersNewChat: false }, { s1: ['success'] }))
    expect(result.notes.join(' ')).toContain('did not offer "Start a new chat"')
  })
})

describe('H-66 start is idempotent and a failed start frees the folder', () => {
  it('decides by the existing session file', () => {
    const base = { task: 'T01.1', level: 'novice' }
    expect(startDecision(null, { ...base, alive: false })).toBe('fresh')
    expect(startDecision({ ...base, ready: true, pid: 1 }, { ...base, alive: true })).toBe('reuse')
    expect(startDecision({ ...base, ready: false, error: 'boom' }, { ...base, alive: true })).toBe('replace')
    expect(startDecision({ ...base, ready: true }, { ...base, alive: false })).toBe('replace')
    expect(startDecision({ ...base, ready: true }, { task: 'T02.1', level: 'novice', alive: true })).toBe('busy')
    expect(startDecision({ ...base, ready: true }, { ...base, level: 'intermediate', alive: true })).toBe('busy')
  })
  it('session.mjs keeps server.log and the failed session file', () => {
    const src = source('session.mjs')
    expect(src).toContain('session.failed-')
    expect(src).not.toContain('already holds a session; use a new folder')
  })
})

describe('H-67 every check run is kept; short answers are refused', () => {
  it('answerTooShort refuses placeholders', () => {
    expect(answerTooShort('x')).toContain('fewer than 5 words')
    expect(answerTooShort('line 1 changed')).toContain('fewer than 5 words')
    expect(answerTooShort('lines 1, 3 and 4 change')).toBeNull()
    expect(answerTooShort(undefined)).toBeNull()
  })
  it('check appends to runs', () => {
    const src = source('session.mjs')
    expect(src).toContain('runs')
    expect(src).toContain('answerTooShort')
  })
})

describe('H-68 T16.2 keyword check', () => {
  it('needs no and the reason', async () => {
    expect((await run('T16.2', fakeCtx(), 'No, Notepad also provides Write files so it can still write')).status).toBe('PASS')
    expect((await run('T16.2', fakeCtx(), 'It does not stop it because they are separate settings')).status).toBe('PASS')
    expect((await run('T16.2', fakeCtx(), 'Yes it stops writing files with Notepad too')).status).toBe('FAIL')
    expect((await run('T16.2', fakeCtx(), 'No idea about that')).status).toBe('FAIL')
    expect(T162_NO.test('no')).toBe(true)
    expect(T162_WHY.test('both provide it')).toBe(true)
  })
})

describe('H-69 fresh panelists', () => {
  it('the briefing and the guide demand one fresh panelist per task; T21.1 has Min 4 and budget 12 / 16', () => {
    expect(source('FACILITATOR.md')).toContain('ONE FRESH PANELIST PER TASK')
    expect(source('PANELIST.md')).toContain('fresh panelist')
    const t = loadTasks()['T21.1']
    expect([t.min, t.budgetExpert, t.budgetNovice]).toEqual([4, 12, 16])
  })
})

describe('H-70 T11.2 banner against chips', () => {
  it('flags a chip that contradicts the Ask banner', () => {
    const banner = 'You are in control. Browser and all other tools are set to Ask until you resume.'
    expect(barChipConflicts(banner, ['Read files: Ask', 'Run commands: Off', 'Browser: Off'])).toEqual(['Run commands: Off', 'Browser: Off'])
    expect(barChipConflicts(banner, ['Read files: Ask', 'Write files: Ask'])).toEqual([])
    expect(barChipConflicts('Idle', ['Browser: Off'])).toEqual([])
  })
  it('prints the take over line and no groups line', async () => {
    const ctx = fakeCtx({ desktop: { userInControl: true }, policy: { groups: { 'fs.read': 'allow' } } })
    const result = await run('T11.2', ctx)
    expect(result.status).toBe('PASS')
    expect(result.reason).toBe('take over: userInControl true')
    expect(result.reason).not.toContain('permission groups')
  })
  it('reads the banner and chips from the page and notes a conflict', async () => {
    const page = {
      getByTestId: (id) =>
        id === 'topbar-status'
          ? { first: () => ({ textContent: async () => 'You are in control. All other tools are set to Ask until you resume.' }) }
          : { locator: () => ({ allTextContents: async () => ['Read files: Ask', 'Browser: Off'] }) }
    }
    const result = await run('T11.2', fakeCtx({ desktop: { userInControl: true }, page }))
    expect(result.status).toBe('PASS')
    expect(result.notes.join(' ')).toContain('banner against chips')
    expect(result.notes.join(' ')).toContain('"Browser: Off"')
  })
})

describe('H-71 the Browser script ends in plain words', () => {
  it('browser-agent.json has no raw DONE snapshot and the T28.1 checker looks for the plain sentence', () => {
    const text = source('scripts/browser-agent.json')
    expect(text).not.toContain('DONE {{mine}}')
    expect(text).toContain('I sent the message and found it in #general.')
    expect(source('checks/features.mjs')).toContain('found it in #general')
  })
})

describe('H-72 the SEQ scale guard and the sync from the record', () => {
  const rec = (seq, sentence, stuck = 'a dead end at the menu') => `# T12.1 - novice\n- Result: PASS\n- SEQ: ${seq} - ${sentence}\n- Errors (wrong clicks): ${stuck}\n`
  it('rejects a low SEQ for an easy task and a high SEQ for an impossible one', () => {
    expect(seqProblem(2, rec(2, 'It was very easy, I found it at once'))).toContain('contradicts')
    expect(seqProblem(1, rec(1, 'Fine', 'none'))).toContain('no stuck points')
    expect(seqProblem(6, rec(6, 'It was very difficult and I nearly gave up'))).toContain('contradicts')
  })
  it('accepts consistent ratings, including "not easy" at a low SEQ and mixed sentences', () => {
    expect(seqProblem(6, rec(6, 'Easy, the button was where I looked', 'none'))).toBeNull()
    expect(seqProblem(2, rec(2, 'It was not easy, I could not find the setting'))).toBeNull()
    expect(seqProblem(5, rec(5, 'The shortcuts worked, but finding them is hard without prior knowledge'))).toBeNull()
    expect(seqProblem(4, rec(4, 'Easy but slow', 'none'))).toBeNull()
  })
  it('syncSeq copies a good rating, recomputes weak, refuses a bad one unless confirmed, and rejects 0, 8 and none', () => {
    const check = { status: 'PASS', steps: 3, budget: 9, weak: false, seq: 2 }
    expect(syncSeq(check, rec(6, 'Easy to do', 'none')).check).toMatchObject({ seq: 6, weak: false })
    expect(syncSeq(check, rec(4, 'Okay')).check).toMatchObject({ seq: 4, weak: true })
    expect(syncSeq(check, rec(2, 'Very easy', 'none')).problem).toContain('contradicts')
    expect(syncSeq(check, rec(2, 'Very easy', 'none'), { confirmed: true })).toMatchObject({ problem: null, check: { seq: 2 } })
    expect(syncSeq(check, rec(8, 'x')).problem).toContain('1 to 7')
    expect(syncSeq(check, rec(0, 'x')).problem).toContain('1 to 7')
    expect(syncSeq(check, '# no rating').problem).toContain('no "- SEQ')
  })
  it('the 19 R4 rows: the reversed value (8 minus the record) is replaced by the record', () => {
    for (const [file, record] of [[2, 6], [1, 7], [3, 5]]) {
      const out = syncSeq({ status: 'PASS', steps: 3, budget: 12, seq: file, weak: file < 5 }, rec(record, 'Easy', 'none'))
      expect(out.check.seq).toBe(record)
      expect(out.check.weak).toBe(record < 5)
    }
  })
  it('the templates state the scale beside the field', () => {
    expect(source('PANELIST.md')).toContain('1 = very difficult, 7 = very easy')
    expect(source('FACILITATOR.md')).toContain('(1 = very difficult, 7 = very easy; a high number means EASY)')
    expect(source('session.mjs')).not.toContain("'--seq'")
  })
})

describe('H-73 T14.1 starts with another row selected', () => {
  it('the preset selects Scratch pad and tasks.md says so', () => {
    expect(source('presets/desktops.mjs')).toContain("hasText: 'Scratch pad'")
    expect(loadTasks()['T14.1']).toBeTruthy()
    expect(readFileSync(join(hereDir, '../../docs/ux/tasks.md'), 'utf8')).toContain('H-73')
  })
})

describe('H-74 T06.1 needs lines 1, 3 and 4', () => {
  const ctxFor = () => {
    const root = mkdtempSync(join(tmpdir(), 'ux-t061-'))
    mkdirSync(join(root, 'src/auth'), { recursive: true })
    writeFileSync(join(root, 'src/auth/redirect.ts'), REDIRECT_FIXED)
    const ctx = fakeCtx({ entries: [{ kind: 'tool_call', permission: { outcome: 'selected', selectedOptionId: 'allow' } }] })
    ctx.fixtures = { loginApp: root }
    return ctx
  }
  it('a partial answer fails; full line lists and +3/-3 pass', async () => {
    const ctx = ctxFor()
    const partial = await run('T06.1', ctx, 'line 1 changed but I could not read the rest')
    expect(partial.status).toBe('FAIL')
    expect(partial.reason).toContain('3, 4')
    expect((await run('T06.1', ctx, 'lines 1, 3 and 4 of redirect.ts change')).status).toBe('PASS')
    expect((await run('T06.1', ctx, 'it adds +3 and removes -3 lines')).status).toBe('PASS')
    expect((await run('T06.1', ctx)).status).toBe('MANUAL')
  })
})

describe('H-75 timing claims name a shot', () => {
  it('PANELIST.md asks for the shot number of every timing claim', () => {
    expect(source('PANELIST.md')).toContain('names the')
    expect(source('PANELIST.md')).toContain('Timing claims (H-75)')
  })
})

// ---------------------------------------------------------------- round 5 harness defects H-77 .. H-86
describe('H-77 no range expansion in the line answers', () => {
  const R5_ANSWER = 'The box could not say which lines change ... It only showed the new code, lines 1 to 5'
  const ctxFor = () => {
    const root = mkdtempSync(join(tmpdir(), 'ux-h77-'))
    mkdirSync(join(root, 'src/auth'), { recursive: true })
    writeFileSync(join(root, 'src/auth/redirect.ts'), REDIRECT_FIXED)
    const ctx = fakeCtx({ entries: [{ kind: 'tool_call', permission: { outcome: 'selected', selectedOptionId: 'allow' } }] })
    ctx.fixtures = { loginApp: root }
    return ctx
  }
  it('numbersIn keeps ranges apart unless asked', () => {
    expect([...numbersIn('lines 1 to 5')].sort()).toEqual([1, 5])
    expect(missingNumbers('lines 1 to 5', [1, 3, 4])).toEqual([3, 4])
    expect(missingNumbers('lines 1, 3 and 4', [1, 3, 4])).toEqual([])
    expect(numbersIn('lines 1 to 5', { ranges: true }).has(3)).toBe(true)
  })
  it('saysCouldNotTell finds the give-up phrases and not a plain answer', () => {
    expect(saysCouldNotTell(R5_ANSWER)).toBe(true)
    for (const t of ['I cannot tell', "can't tell which", 'no idea', 'it was unclear', 'not sure']) expect(saysCouldNotTell(t), t).toBe(true)
    expect(saysCouldNotTell('lines 1, 3 and 4 change')).toBe(false)
    expect(saysCouldNotTell('it adds +3 and removes -3 lines')).toBe(false)
  })
  it('T06.1: the R5 intermediate answer fails, with the reason', async () => {
    const result = await run('T06.1', ctxFor(), R5_ANSWER)
    expect(result.status).toBe('FAIL')
    expect(result.reason).toContain('could not tell')
    expect(result.reason).toContain('3, 4')
    expect((await run('T06.1', ctxFor(), 'It changes the new code in lines 1 to 4 of redirect.ts')).status).toBe('FAIL')
    expect((await run('T06.1', ctxFor(), 'The box could not say, but in the Changes tab it is lines 1, 3 and 4')).status).toBe('PASS')
    expect((await run('T06.1', ctxFor(), '+3 and -3, lines 1, 3 and 4')).status).toBe('PASS')
  })
  it('T24.1: the R5 style answer fails too', async () => {
    const result = await run('T24.1', fakeCtx(), `redirect.ts, login.ts, session.ts. ${R5_ANSWER}`)
    expect(result.status).toBe('FAIL')
    expect(result.reason).toContain('could not tell')
  })
})

describe('H-78 scroll unit, position change and warning', () => {
  it('warns under 20 pixels only', () => {
    expect(scrollWarning(5)).toContain('100 is one wheel notch')
    expect(scrollWarning(-10)).toContain('10 pixels')
    expect(scrollWarning(19)).not.toBeNull()
    expect(scrollWarning(20)).toBeNull()
    expect(scrollWarning(300)).toBeNull()
  })
  it('reports the position change, nothing moved and an unknown area', () => {
    expect(scrollReport(200, 0, 200, 640)).toBe('Scrolled 200: the content moved 200 px down (position 0 -> 200 of 640 px).')
    expect(scrollReport(-100, 300, 200, 640)).toContain('moved 100 px up')
    expect(scrollReport(200, 640, 640, 640)).toContain('nothing moved')
    expect(scrollReport(200, null, null, undefined)).toContain('no scrollable area')
  })
  it('the help text, PANELIST.md and the server say it', () => {
    expect(source('ux.mjs')).toContain('100 is one wheel notch')
    expect(source('PANELIST.md')).toContain('100 is one wheel notch')
    expect(source('server.mjs')).toContain('scrollReport')
  })
})

describe('H-79 the browser reply is one plain sentence', () => {
  it('browser-agent.json does not echo the tool result', () => {
    const rule = JSON.parse(source('scripts/browser-agent.json')).rules.find((r) => r.id === 'read-page')
    const text = rule.steps.filter((s) => s.type === 'message').at(-1).text
    expect(text).toBe('The page is titled Fixture page. It says Example Domain.')
    expect(text).not.toContain('{{page}}')
  })
})

describe('H-80 one fresh panelist per task', () => {
  it('refuses T21.1, T22.x and T31.x after the tasks that teach them', () => {
    expect(contextProblem('T21.1', ['T20.1'])).toContain('FRESH panelist')
    expect(contextProblem('T21.1', ['T22.2'])).not.toBeNull()
    expect(contextProblem('T21.1', ['T06.1'])).not.toBeNull()
    expect(contextProblem('T22.1', ['T20.2'])).not.toBeNull()
    expect(contextProblem('T22.2', ['T22.1'])).not.toBeNull()
    expect(contextProblem('T31.1', ['T22.1'])).not.toBeNull()
    expect(contextProblem('T31.2', ['T31.1'])).not.toBeNull()
    expect(contextConflicts('T21.1', ['T01.1', 'T20.1'])).toEqual(['T20.1'])
  })
  it('allows a fresh context and unrelated tasks', () => {
    expect(contextProblem('T21.1', [])).toBeNull()
    expect(contextProblem('T21.1', ['T01.1', 'T04.1'])).toBeNull()
    expect(contextProblem('T01.1', ['T20.1'])).toBeNull()
    expect(parsePrevious('T20.1, T22.1')).toEqual(['T20.1', 'T22.1'])
    expect(parsePrevious('')).toEqual([])
  })
  it('start and check write the context; brief is a command', () => {
    const src = source('session.mjs')
    expect(src).toContain('context: { previousTasks: previous }')
    expect(src).toContain('context: info.context')
    expect(src).toContain("command === 'brief'")
  })
  it('brief prints the whole one-task prompt: start, act, check, record, stop', () => {
    const task = loadTasks()['T06.1']
    const text = buildBrief({ task: 'T06.1', level: 'novice', taskInfo: task, panelist: source('PANELIST.md'), round: 'r6' })
    for (const part of ['## 1. Start', '## 2. Act', '## 3. Check', '## 4. Record', '## 5. Stop']) expect(text).toContain(part)
    expect(text).toContain('session.mjs start --task T06.1 --level novice --out /tmp/ux-sessions/r6/T06.1-novice 2>/dev/null')
    expect(text).toContain('check --out /tmp/ux-sessions/r6/T06.1-novice --answer')
    expect(text).toContain('stop --out /tmp/ux-sessions/r6/T06.1-novice --record docs/ux/panel/r6/T06.1-novice.md')
    expect(text).toContain('# T06.1 Allow after reading - novice')
    expect(text).toContain('**novice**')
    expect(text).not.toContain('**LEVEL**')
  })
  it('brief for a task without a question has no --answer', () => {
    const text = buildBrief({ task: 'T04.2', level: 'intermediate', taskInfo: loadTasks()['T04.2'], panelist: 'LEVEL', round: 'r6' })
    expect(text).not.toContain('--answer')
    expect(text).toContain('check --out /tmp/ux-sessions/r6/T04.2-intermediate\n')
  })
  it('FACILITATOR.md documents brief and --previous', () => {
    const text = source('FACILITATOR.md')
    expect(text).toContain('session.mjs brief --task')
    expect(text).toContain('--previous')
    expect(RECORD_TEMPLATE).toContain('Context:')
  })
})

describe('H-81 the step number', () => {
  it('the server prints "Step N" for action commands and counts from the log', () => {
    const src = source('server.mjs')
    expect(src).toContain('Step ${++stepCount}')
    expect(src).toContain('countSteps(readLog(')
  })
  it('the number is the budget count: successful actions only', () => {
    const entries = [{ cmd: 'click', ok: true }, { cmd: 'shot', ok: true }, { cmd: 'scroll', ok: true }, { cmd: 'key', ok: false }, { cmd: 'wait', ok: true }]
    expect(countSteps(entries)).toBe(2)
  })
})

describe('H-82 answer tasks need an answer; keyword checks', () => {
  it('stop refuses a no-answer check of an answer task unless accepted', () => {
    const src = source('session.mjs')
    expect(src).toContain("'accept-no-answer'")
    expect(src).toContain('the last check of this answer task had no answer')
  })
  it('T02.2 keywords: the reason', async () => {
    const list = [{ id: 'a', title: 'Fix login redirect', drives: [] }, { id: 'b', title: 'Docs', drives: [{ label: 'docs-site' }] }]
    const ctx = fakeCtx({ state: { desktopId: 'a' }, list })
    for (const ok of ['The name already exists', 'it is the same name', 'each workspace needs its own name', 'the name is taken']) expect((await run('T02.2', ctx, ok)).status, ok).toBe('PASS')
    expect((await run('T02.2', ctx, 'it was refused')).status).toBe('FAIL')
    expect((await run('T02.2', ctx, 'I chose a different name')).status).toBe('FAIL')
  })
  it('T10.2 keywords include Deny and the chip', async () => {
    const ctx = fakeCtx({ desktop: { windows: [], tools: [] }, policy: { groups: { terminal: 'deny' } } })
    expect((await run('T10.2', ctx, 'Terminal is set to Deny in Permissions')).status).toBe('PASS')
    expect((await run('T10.2', ctx, 'the chip in the top bar says so')).status).toBe('PASS')
    expect((await run('T10.2', ctx, 'I just looked')).status).toBe('FAIL')
  })
})

describe('H-83 the Result line gets "Steps: N of M"', () => {
  it('adds the line when it is missing and leaves a complete one alone', () => {
    const record = '# T19.1 x - intermediate\n- Result: PASS (a; b)   Time: 3\n- SEQ: 6 - ok'
    const fixed = withStepsLine(record, 5, 12)
    expect(fixed).toContain('- Result: PASS (a; b)   Time: 3   Steps: 5 of 12')
    expect(withStepsLine(fixed, 9, 12)).toBe(fixed)
    expect(withStepsLine('no result line', 5, 12)).toBe('no result line')
    expect(withStepsLine('- Result: FAIL (x)', 3, null)).toBe('- Result: FAIL (x)   Steps: 3')
  })
  it('stop writes it', () => {
    expect(source('session.mjs')).toContain('withStepsLine(text, last.steps, last.budget)')
  })
})

describe('H-84 quote the screen; T31.1 keyword', () => {
  const page = (topic) => ({ getByTestId: () => ({ getAttribute: async () => topic }) })
  it('T31.1 needs Ctrl+S in the answer', async () => {
    const desktop = { windows: [win('notepad')], tools: [] }
    const ctx = fakeCtx({ desktop, page: page('notepad') })
    expect((await run('T31.1', ctx, 'Press Ctrl+S to save the file')).status).toBe('PASS')
    expect((await run('T31.1', ctx, 'File then Save As')).status).toBe('FAIL')
    expect((await run('T31.1', ctx)).status).toBe('MANUAL')
    expect(asksQuestion(loadTasks()['T31.1'])).toBe(true)
  })
  it('PANELIST.md quotes only text in a shot, with the shot number', () => {
    expect(source('PANELIST.md')).toContain('H-84')
    expect(source('PANELIST.md')).toContain('each clause of your Answer:')
    expect(source('PANELIST.md')).toContain('cut off')
  })
})

describe('H-85 T07.1 logs the order and the time of the two answers', () => {
  const chat = (label, raised, answered) => ({
    label,
    entries: [
      { kind: 'tool_call', seq: 2, createdAt: raised, permission: { outcome: 'selected', selectedOptionId: 'allow' } },
      { kind: 'message', seq: 3, role: 'agent', createdAt: answered, blocks: [] }
    ]
  })
  it('names the chat answered first and the seconds', () => {
    const notes = answerOrderNotes([chat('Fix redirect', '2026-01-01T10:00:00Z', '2026-01-01T10:00:40Z'), chat('Trim name', '2026-01-01T10:00:00Z', '2026-01-01T10:00:15Z')])
    expect(notes[0]).toContain('1. chat "Trim name"')
    expect(notes[0]).toContain('2. chat "Fix redirect"')
    expect(notes[1]).toContain('"Trim name" 15')
    expect(notes[1]).toContain('"Fix redirect" 40')
    expect(answerOrderNotes([{ label: 'x', entries: [] }])).toEqual([])
  })
  it('the checker passes with the notes; tasks.md says either chat may be first', async () => {
    const entries = [{ kind: 'tool_call', seq: 1, createdAt: '2026-01-01T10:00:00Z', permission: { outcome: 'selected', selectedOptionId: 'allow' } }, { kind: 'message', seq: 2, createdAt: '2026-01-01T10:00:02Z', role: 'agent', blocks: [] }]
    const result = await run('T07.1', fakeCtx({ state: { sessionIds: ['a', 'b'] }, entries, sessions: [{ id: 'a', title: 'Chat A' }, { id: 'b', title: 'Chat B' }] }))
    expect(result.status).toBe('PASS')
    expect(result.notes.join(' ')).toContain('answer order')
    expect(readFileSync(join(hereDir, '../../docs/ux/tasks.md'), 'utf8')).toContain('either chat may be answered first')
    expect(loadTasks()['T07.1'].scenario).toContain('answer both')
  })
})

describe('H-86 one id for the second crash', () => {
  it('T23.1b everywhere; the old name is only an alias', () => {
    expect(canonicalTaskId('T23.1-twice')).toBe('T23.1b')
    expect(canonicalTaskId('T23.1')).toBe('T23.1')
    expect(Object.keys(TASKS)).toContain('T23.1b')
    expect(Object.keys(TASKS)).not.toContain('T23.1-twice')
    expect(source('session.mjs')).toContain('canonicalTaskId(flags.task)')
    expect(loadTasks()['T23.1b']).toBeTruthy()
  })
})

// ---------------------------------------------------------------- round 6 harness defects H-87 .. H-95
describe('H-87 T27.2 counts the panes and the strip, not the Focus bar', () => {
  // R6 state: the Focus bar has a Chat button (code-focus-chat) and the chat pane is collapsed; the editor fills the window.
  const page = ({ open, edge, editor, app }) => ({
    locator: (sel) => ({
      count: async () => (sel.includes('data-collapsed="false"') ? open : edge),
      first: () => ({ boundingBox: async () => ({ width: sel.includes('code-editor') ? editor : app }) })
    })
  })
  it('passes with a collapsed pane, the Focus bar button and an editor of 792 of 800 px', async () => {
    expect((await run('T27.2', fakeCtx({ page: page({ open: 0, edge: 2, editor: 792, app: 800 }) }))).status).toBe('PASS')
  })
  it('the open-pane selector names only the embedded chat, never the Focus bar', () => {
    const src = source('checks/features.mjs')
    const line = src.split('\n').find((l) => l.includes('const open = await page.locator'))
    expect(line).toContain('data-collapsed="false"')
    expect(line).not.toContain('code-focus')
  })
})

describe('H-88 T06.1 accepts the counts in any spelling', () => {
  const ctxFor = () => {
    const root = mkdtempSync(join(tmpdir(), 'ux-h88-'))
    mkdirSync(join(root, 'src/auth'), { recursive: true })
    writeFileSync(join(root, 'src/auth/redirect.ts'), REDIRECT_FIXED)
    const ctx = fakeCtx({ entries: [{ kind: 'tool_call', permission: { outcome: 'selected', selectedOptionId: 'allow' } }] })
    ctx.fixtures = { loginApp: root }
    return ctx
  }
  it('countsThreeAndThree', () => {
    for (const t of ['3 lines added and 3 removed', '+3 / -3', '3 added, 3 removed', 'it added 3 lines and removed 3 lines', '3 additions and 3 deletions', '+3 and −3']) expect(countsThreeAndThree(t), t).toBe(true)
    for (const t of ['3 lines added', '5 lines added and 5 removed', 'lines 1 to 5', 'I could not tell']) expect(countsThreeAndThree(t), t).toBe(false)
  })
  it('the R6 intermediate answer passes (counts, and a range of the hunk header)', async () => {
    const r6 = 'Yes it changes src/auth/redirect.ts: 3 lines added and 3 removed, in lines 1 to 5 (hunk -1,5 +1,5)'
    expect((await run('T06.1', ctxFor(), r6)).status).toBe('PASS')
  })
  it('still rejects a range alone and "could not tell"', async () => {
    expect((await run('T06.1', ctxFor(), 'It changes the new code in lines 1 to 5 of redirect.ts')).status).toBe('FAIL')
    expect((await run('T06.1', ctxFor(), 'I could not tell which lines change, lines 1 to 5 maybe')).status).toBe('FAIL')
  })
})

describe('H-89 T17.2 matches "set ... as default"', () => {
  const ctx = () => ({ ...fakeCtx({ state: { appPid: 7 } }), app: { process: () => ({ pid: 7 }) } })
  it('accepts the R6 wording and "default" with "agent"', async () => {
    expect((await run('T17.2', ctx(), 'not-a-real-command was not found; on the Agents page set Claude Code as default')).status).toBe('PASS')
    expect((await run('T17.2', ctx(), 'not found: open Agents and make another agent the default')).status).toBe('PASS')
    expect((await run('T17.2', ctx(), 'not-a-real-command is wrong; Agents page; start a new chat')).status).toBe('PASS')
  })
  it('still fails without an action', async () => {
    expect((await run('T17.2', ctx(), 'not-a-real-command was not found, shown on the Agents page')).status).toBe('FAIL')
  })
})

describe('H-90 answer tasks need an answer and an Answer line', () => {
  const task = () => loadTasks()['T10.1']
  it('check refuses --no-answer alone; stop refuses a record without an Answer line', () => {
    expect(answerProblem(task(), { noAnswer: true })).toContain('H-90')
    expect(recordAnswerProblem(task(), '# rec\n- SEQ: 5 - ok')).toContain('Answer')
    expect(recordAnswerProblem(task(), '# rec\n- Answer: none')).toContain('Answer')
    expect(recordAnswerProblem(task(), '# rec\n- Answer: the top bar has no Terminal chip')).toBe(null)
    expect(recordAnswerProblem(task(), '# rec', { acceptNoAnswer: true })).toBe(null)
    expect(recordAnswerProblem(loadTasks()['T04.2'], '# rec')).toBe(null)
  })
  it('session.mjs uses both', () => {
    expect(source('session.mjs')).toContain('recordAnswerProblem')
    expect(source('session.mjs')).toContain("acceptNoAnswer: flags['accept-no-answer']")
  })
})

describe('H-91 T13.1 needs a window of the original chat', () => {
  const progress = [{ kind: 'message', role: 'agent', blocks: [{ text: 'Progress 9 of 30.' }] }]
  it('is MANUAL with progress and no window of the chat (reopened: false)', async () => {
    const r = await run('T13.1', fakeCtx({ state: { progressAtStart: 3 }, desktop: { windows: [] }, entries: progress }))
    expect(r.status).toBe('MANUAL')
    expect(r.notes.join(' ')).toContain('reopened: false')
  })
  it('is MANUAL when the open chat window belongs to another chat', async () => {
    const r = await run('T13.1', fakeCtx({ state: { progressAtStart: 3 }, desktop: { windows: [win('chat', { sessionId: 'other' })] }, entries: progress }))
    expect(r.status).toBe('MANUAL')
  })
  it('passes with the same session id open', async () => {
    const r = await run('T13.1', fakeCtx({ state: { progressAtStart: 3 }, desktop: { windows: [win('chat', { sessionId: 's1' })] }, entries: progress }))
    expect(r.status).toBe('PASS')
    expect(r.notes.join(' ')).toContain('reopened: true')
  })
  it('tasks.md says so', () => {
    expect(readFileSync(join(hereDir, '../../docs/ux/tasks.md'), 'utf8')).toContain('same session id')
  })
})

describe('H-92 stepsToPass', () => {
  it('uses the steps when the check first held', () => {
    expect(stepsToPassOf({ runs: [], checkerStatus: 'PASS', steps: 6 })).toBe(6)
    expect(stepsToPassOf({ runs: [{ checkerStatus: 'FAIL', steps: 1 }, { checkerStatus: 'PASS', steps: 2 }], checkerStatus: 'PASS', steps: 6 })).toBe(2)
    expect(stepsToPassOf({ explicit: 2, runs: [], checkerStatus: 'PASS', steps: 6 })).toBe(2)
    expect(stepsToPassOf({ runs: [], checkerStatus: 'FAIL', steps: 6 })).toBe(null)
  })
  it('the budget and the weak rule use it (T01.1 at the limit of 3 after the goal at 2)', () => {
    expect(effectiveSteps(3, 2)).toBe(2)
    expect(effectiveSteps(3, null)).toBe(3)
    expect(budgetVerdict('PASS', 3, 3, 6).weak).toBe(true)
    expect(budgetVerdict('PASS', effectiveSteps(3, 2), 3, 6).weak).toBe(false)
    expect(budgetVerdict('PASS', effectiveSteps(5, 2), 3, 6).status).toBe('PASS')
  })
  it('tasks.md T01.1 documents it', () => {
    expect(readFileSync(join(hereDir, '../../docs/ux/tasks.md'), 'utf8')).toContain('stepsToPass')
  })
})

describe('H-93 one Steps heading, rerun and finishedByFacilitator', () => {
  it('no Think-aloud heading in the templates', () => {
    expect(RECORD_TEMPLATE).toContain('Steps (the numbered step list of the final report)')
    expect(RECORD_TEMPLATE).not.toMatch(/think-aloud/i)
    expect(source('FACILITATOR.md')).not.toMatch(/- Think-aloud/)
    expect(source('PANELIST.md')).not.toMatch(/think-aloud/i)
  })
  it('stop writes the flags', () => {
    const src = source('session.mjs')
    expect(src).toContain("'finished-by-facilitator'")
    expect(src).toContain('finishedByFacilitator')
    expect(src).toContain('rerun')
  })
})

describe('H-94 build id', () => {
  it('readBuild says packaged only with an existing executable', () => {
    const root = mkdtempSync(join(tmpdir(), 'ux-h94-'))
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '1.2.3' }))
    expect(readBuild({ repoRoot: root, env: { UX_BUILD_COMMIT: 'abcdef1234567' } })).toEqual({ packaged: false, version: '1.2.3', commit: 'abcdef1234567' })
    const exe = join(root, 'AgentXP.exe')
    writeFileSync(exe, '')
    expect(readBuild({ repoRoot: root, env: { UX_PACKAGED_EXE: exe, UX_BUILD_COMMIT: 'x' } }).packaged).toBe(true)
    expect(readBuild({ repoRoot: root, env: { UX_PACKAGED_EXE: join(root, 'missing.exe'), UX_BUILD_COMMIT: 'x' } }).packaged).toBe(false)
  })
  it('H-100: the commit comes from build-info.json beside the packaged executable, before the environment', () => {
    const root = mkdtempSync(join(tmpdir(), 'ux-h100-'))
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '1.2.3' }))
    mkdirSync(join(root, 'app', 'resources'), { recursive: true })
    const exe = join(root, 'app', 'AgentXP.exe')
    writeFileSync(exe, '')
    expect(readBuild({ repoRoot: root, env: { UX_PACKAGED_EXE: exe, UX_BUILD_COMMIT: 'envcommit00' } }).commit).toBe('envcommit00')
    writeFileSync(join(root, 'app', 'resources', 'build-info.json'), JSON.stringify({ commit: '840aaf8687aa', version: '1.2.3' }))
    expect(readBuild({ repoRoot: root, env: { UX_PACKAGED_EXE: exe, UX_BUILD_COMMIT: 'envcommit00' } }).commit).toBe('840aaf8687aa')
  })
  it('H-100: a round with two commit ids is refused unless confirmed', () => {
    expect(commitProblem(['840aaf8687aa', '840aaf8687bb', null])).toBe(null) // the same first ten characters
    expect(commitProblem(['840aaf8687', '840aaf8687', 'f29521dd34'])).toContain('840aaf8687, f29521dd34')
    expect(commitProblem(['840aaf8687', 'f29521dd34'], { confirmed: true })).toBe(null)
    expect(commitProblem([])).toBe(null)
  })
  it('H-100: siblingCommits reads the other session folders of the round', () => {
    const round = mkdtempSync(join(tmpdir(), 'ux-h100r-'))
    for (const [name, commit] of [['T01.1-novice', 'aaaaaaaaaa'], ['T02.1-novice', 'bbbbbbbbbb'], ['T03.1-novice', 'cccccccccc']]) {
      mkdirSync(join(round, name))
      writeFileSync(join(round, name, name === 'T03.1-novice' ? 'check.json' : 'session.json'), JSON.stringify({ build: { commit } }))
    }
    expect(siblingCommits(join(round, 'T02.1-novice')).sort()).toEqual(['aaaaaaaaaa', 'cccccccccc'])
    expect(siblingCommits(join(round, 'missing', 'x'))).toEqual([])
  })
  it('a round without packaged: true does not count for the gate', () => {
    expect(gateProblem([{ build: { packaged: true } }, { build: { packaged: true } }])).toBe(null)
    expect(gateProblem([{ build: { packaged: true } }, { build: { packaged: false } }, {}])).toContain('2 of 3')
  })
  it('the record header gets the build line once', () => {
    const text = withBuildLine('# T01.1 Find the start - novice\n- Result: PASS', { packaged: false, version: '0.1.0', commit: 'abcdef1234567' })
    expect(text).toContain('- Build: unpackaged build, version 0.1.0, commit abcdef1234')
    expect(withBuildLine(text, { packaged: true })).toBe(text)
  })
  it('server and session wire it', () => {
    expect(source('server.mjs')).toContain('readBuild')
    expect(source('session.mjs')).toContain('withBuildLine')
  })
})

describe('H-95 T23.2 documents the flaky script', () => {
  it('tasks.md says the first send after each Reconnect fails again; the script fails once per process', () => {
    const md = readFileSync(join(hereDir, '../../docs/ux/tasks.md'), 'utf8')
    expect(md).toContain('first send after each Reconnect fails again')
    const script = JSON.parse(source('scripts/flaky.json'))
    expect(script.rules[0]).toMatchObject({ id: 'first-fails', once: true })
  })
})

describe('H-101 to H-105 round 7 harness', () => {
  it('H-101: stepsToPassFromLog counts the actions up to the first line where the check held', () => {
    const log = [{ cmd: 'shot' }, { cmd: 'click' }, { cmd: 'click', ok: false }, { cmd: 'type', checkHeld: true }, { cmd: 'click' }]
    expect(stepsToPassFromLog(log)).toBe(2)
    expect(stepsToPassFromLog([{ cmd: 'click' }, { cmd: 'click' }])).toBe(null)
    expect(stepsToPassFromLog([])).toBe(null)
  })
  it('H-101: the server replays the check for T01.1 and T02.1 and check.json uses the log', () => {
    expect(source('server.mjs')).toContain('REPLAY_TASKS.includes(state.task)')
    expect(source('session.mjs')).toContain('stepsToPassFromLog(entries)')
  })
  it('H-102: a shot says which window it shows, and a click waits for a new window', () => {
    expect(windowKind('file:///x/index.html?launcher=1')).toBe('launcher')
    expect(windowKind('file:///x/index.html?desktop=3')).toBe('desktop')
    expect(windowKind('about:blank')).toBe('window')
    expect(windowLine('x?desktop=3', 'Fix login redirect')).toBe('Window shown: desktop "Fix login redirect"')
    expect(source('server.mjs')).toContain('NEW_WINDOW_WAIT_MS = 1500')
    expect(source('server.mjs')).toContain('windowLine(page.url(), entry.window)')
  })
  it('H-105: the template has no empty Researcher notes line and the Evidence line is a repository path', () => {
    expect(RECORD_TEMPLATE).not.toContain('Researcher notes')
    expect(RECORD_TEMPLATE).toContain('- Evidence: docs/ux/panel/<round>/<task>-<level>-session/shots/NNN.png')
    const brief = buildBrief({ task: 'T01.1', level: 'novice', taskInfo: { title: 'Find the start' }, panelist: 'LEVEL', round: 'r8' })
    expect(brief).toContain('- Evidence: docs/ux/panel/r8/T01.1-novice-session/shots/NNN.png')
    expect(brief).not.toContain('Researcher notes')
    expect(source('PANELIST.md')).toContain('Open every screenshot that a command lists')
  })
  it('H-104 and H-97: /tmp paths are test paths in the briefing; bad-default-agent adds a working helper agent', () => {
    expect(source('PANELIST.md')).toContain('are test paths of this study')
    expect(source('presets/desktops.mjs')).toContain("name: 'Helper assistant'")
    expect(source('presets/desktops.mjs')).toContain('makeDefault: false')
  })
})

describe('H-99 control notes', () => {
  it('records the ask-before-every-action box and pause', () => {
    expect(controlNotes({ userInControl: true, paused: false })[0]).toBe('ask before every action (userInControl): true; paused: false')
    expect(controlNotes(null)[0]).toContain('unknown')
  })
})
