// Checkers and start states of T32.1 to T34.1 (agent presence), run against a fake context like ux.test.mjs.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHECKS } from './checks/index.mjs'
import { judgeFollowLog } from './checks/presence.mjs'
import { resolveScript } from './lib/context.mjs'
import { loadTasks } from './lib/tasktext.mjs'
import { PRESETS } from './presets/index.mjs'
import { TASKS } from './tasks.mjs'

const msg = (role, text) => ({ kind: 'message', role, blocks: [{ text }] })
const tool = (title, status = 'completed') => ({ kind: 'tool_call', title, status })
const fakeCtx = ({ state = {}, desktop = null, entries = [], page } = {}) => ({
  state: { desktopId: 'd1', sessionId: 's1', ...state },
  desktopState: async () => desktop,
  desktopPage: async () => page,
  transcript: async () => entries
})
const run = (id, ctx, answer) => CHECKS[id](ctx, { answer })
const win = (id, app, view = {}, windowState = 'normal') => ({ id, app, view, windowState })
const notepadPage = (text) => ({ getByTestId: () => ({ getByTestId: () => ({ inputValue: async () => text }) }) })
const logPage = (log) => ({ evaluate: async () => log })

describe('T32 to T34 have a start state and a checker, and are no longer planned', () => {
  it('maps each task to a preset, a checker and a script that exists', () => {
    const tasks = loadTasks()
    for (const id of ['T32.1', 'T32.2', 'T33.1', 'T33.2', 'T34.1']) {
      expect(PRESETS[TASKS[id].preset], id).toBeTypeOf('function')
      expect(CHECKS[id], id).toBeTypeOf('function')
      expect(tasks[id].planned, id).toBe(false)
    }
    for (const script of ['show-file', 'show-request', 'two-agent-output', 'diagram-output', 'builder-steps']) {
      const parsed = JSON.parse(readFileSync(resolveScript(script), 'utf8'))
      expect(parsed.name).toBe(script)
      expect(parsed.rules.length).toBeGreaterThan(0)
    }
  })
  it('the show-file script shows exactly the lines of afterLogin, with a note', () => {
    const script = JSON.parse(readFileSync(resolveScript('show-file'), 'utf8'))
    const show = script.rules[0].steps.find((s) => s.tool === 'show')
    expect(show.arguments.target).toEqual({ kind: 'file', path: 'src/auth/redirect.ts', lines: [2, 4] })
    expect(show.arguments.note.length).toBeGreaterThan(10)
  })
})

describe('T32.1 Why this line?', () => {
  const prompt = 'Where is the login redirect checked?'
  it('passes on a reply that agrees or quotes the note, fails without a reply', async () => {
    const ctx = (reply) => fakeCtx({ state: { prompt }, entries: [msg('user', prompt), msg('agent', 'Here.'), ...(reply ? [msg('user', reply)] : [])] })
    expect((await run('T32.1', ctx('Yes, I agree, fix it there'))).status).toBe('PASS')
    expect((await run('T32.1', ctx('> afterLogin ignores the address in ?next= and always returns /home\n'))).status).toBe('PASS')
    expect((await run('T32.1', ctx('What is a redirect?'))).status).toBe('FAIL')
    expect((await run('T32.1', ctx(null))).status).toBe('FAIL')
  })
})

describe('T32.2 Someone else wants your attention', () => {
  const requested = [msg('agent', 'Sent as a request: the comment on notes.txt:4')]
  it('passes when the request was accepted: Code Review focused on the comment', async () => {
    const desktop = { focusedWindowId: 7, windows: [win(3, 'code'), win(7, 'code-review', { selectedCommentId: 12 })] }
    expect((await run('T32.2', fakeCtx({ state: { reviewSessionId: 'r', reviewWindowId: 7, commentId: 12 }, desktop, entries: requested }))).status).toBe('PASS')
  })
  it('fails while Code still has the focus, on another comment, or when the show was not a request', async () => {
    const state = { reviewSessionId: 'r', reviewWindowId: 7, commentId: 12 }
    const codeFocused = { focusedWindowId: 3, windows: [win(3, 'code'), win(7, 'code-review', { selectedCommentId: null })] }
    expect((await run('T32.2', fakeCtx({ state, desktop: codeFocused, entries: requested }))).status).toBe('FAIL')
    const other = { focusedWindowId: 7, windows: [win(7, 'code-review', { selectedCommentId: 11 })] }
    expect((await run('T32.2', fakeCtx({ state, desktop: other, entries: requested }))).status).toBe('FAIL')
    const shownNow = { focusedWindowId: 7, windows: [win(7, 'code-review', { selectedCommentId: 12 })] }
    expect((await run('T32.2', fakeCtx({ state, desktop: shownNow, entries: [msg('agent', 'Shown now: the comment')] }))).status).toBe('FAIL')
  })
})

describe('T33.1 What happened while I was busy?', () => {
  const state = { reviewWindowId: 7, firstCommentId: 4 }
  const onComment = { focusedWindowId: 7, windows: [win(7, 'code-review', { selectedCommentId: 4 })] }
  it('needs Code Review on the first new comment, then judges the answer by keywords', async () => {
    expect((await run('T33.1', fakeCtx({ state, desktop: onComment }))).status).toBe('MANUAL')
    expect((await run('T33.1', fakeCtx({ state, desktop: onComment }), 'Builder changed a file and ran the tests, Reviewer left two comments')).status).toBe('PASS')
    expect((await run('T33.1', fakeCtx({ state, desktop: onComment }), 'Something happened')).status).toBe('FAIL')
    const notOpened = { focusedWindowId: 2, windows: [win(2, 'notepad'), win(7, 'code-review', { selectedCommentId: null })] }
    expect((await run('T33.1', fakeCtx({ state, desktop: notOpened }), 'Builder changed a file, Reviewer left comments')).status).toBe('FAIL')
  })
})

describe('T33.2 Do not disturb me', () => {
  const state = { notepadWindowId: 2, diagramsWindowId: 5 }
  const drawn = [tool('agentxp.diagram_add'), tool('agentxp.diagram_add')]
  it('passes with the typed note, both drawing steps and Diagrams focused at the end', async () => {
    const desktop = { focusedWindowId: 5, windows: [win(2, 'notepad'), win(5, 'diagrams')] }
    expect((await run('T33.2', fakeCtx({ state, desktop, entries: drawn, page: notepadPage('buy milk') }))).status).toBe('PASS')
  })
  it('fails with an empty Notepad, an unfinished drawing, or Notepad still in front', async () => {
    const desktop = { focusedWindowId: 5, windows: [win(2, 'notepad'), win(5, 'diagrams')] }
    expect((await run('T33.2', fakeCtx({ state, desktop, entries: drawn, page: notepadPage('') }))).status).toBe('FAIL')
    expect((await run('T33.2', fakeCtx({ state, desktop, entries: [drawn[0], tool('agentxp.diagram_add', 'in_progress')], page: notepadPage('buy milk') }))).status).toBe('FAIL')
    expect((await run('T33.2', fakeCtx({ state, desktop: { ...desktop, focusedWindowId: 2 }, entries: drawn, page: notepadPage('buy milk') }))).status).toBe('FAIL')
  })
})

describe('T34.1 Watch the builder', () => {
  const reading = (following, code, running = true) => ({ following, code, running, at: 0 })
  it('passes when Follow was on during a projected step and off while Builder still worked', async () => {
    const log = [reading(null, null), reading('s1', null), reading('s1', 'E:\\src\\auth\\redirect.ts:2-4'), reading(null, 'E:\\src\\auth\\redirect.ts:2-4')]
    expect((await run('T34.1', fakeCtx({ page: logPage(log) }))).status).toBe('PASS')
  })
  it('fails without Follow, without a projected step, or when it was never turned off', async () => {
    expect((await run('T34.1', fakeCtx({ page: logPage([reading(null, null)]) }))).status).toBe('FAIL')
    expect((await run('T34.1', fakeCtx({ page: logPage([reading('s1', null), reading(null, null)]) }))).status).toBe('FAIL')
    expect((await run('T34.1', fakeCtx({ page: logPage([reading('s1', null), reading('s1', 'E:\\a.ts:1-2')]) }))).status).toBe('FAIL')
  })
  it('is manual when the turn ended (Follow ends with it) or the recorder is gone', async () => {
    const ended = [reading('s1', 'E:\\a.ts:1-2'), reading(null, 'E:\\a.ts:1-2', false)]
    expect((await run('T34.1', fakeCtx({ page: logPage(ended) }))).status).toBe('MANUAL')
    expect((await run('T34.1', fakeCtx({ page: logPage(null) }))).status).toBe('MANUAL')
    expect(judgeFollowLog(ended, 's1').at(-1)[0]).toBe(false)
  })
})

describe('the start state source', () => {
  it('records the follow log in the desktop page and closes the balloons of T33.1', () => {
    const src = readFileSync(join(new URL('.', import.meta.url).pathname, 'presets/presence.mjs'), 'utf8')
    expect(src).toContain('window.__uxFollowLog')
    expect(src).toContain('balloon-close')
  })
})
