// Tests of the round 8 harness fixes (H-104, H-107, H-109 to H-119). Pure helpers and the files that carry the fixes.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildBrief, RECORD_TEMPLATE } from './lib/brief.mjs'
import { enterNote, tooltipNote } from './lib/args.mjs'
import { sandboxParent } from './lib/fixtures.mjs'
import { asksQuestion, checkLines, loadTasks, minutesFromLog, recordPlaceholderProblem, rerunProblem, stopRecordProblem, withRunFlags, withTimeLine } from './lib/tasktext.mjs'
import { CHECKS } from './checks/index.mjs'
import { chatReviewChecks, listsRemarksAsText } from './checks/features.mjs'
import { TASKS } from './tasks.mjs'

const hereDir = new URL('.', import.meta.url).pathname
const source = (file) => readFileSync(join(hereDir, file), 'utf8')
const msg = (role, text) => ({ kind: 'message', role, blocks: [{ text }] })

describe('round 8 harness fixes', () => {
  it('H-104 puts the sandbox under the home folder, not /tmp, and falls back to /tmp', () => {
    expect(sandboxParent({ env: {}, home: '/home/u', tmp: '/tmp', mkdir: () => undefined })).toBe('/home/u/.ux-panel')
    expect(sandboxParent({ env: { UX_SANDBOX_ROOT: '/data/ux' }, home: '/home/u', tmp: '/tmp', mkdir: () => undefined })).toBe('/data/ux')
    expect(
      sandboxParent({
        env: {},
        home: '/home/u',
        tmp: '/tmp',
        mkdir: () => {
          throw new Error('read-only')
        }
      })
    ).toBe('/tmp')
    expect(source('server.mjs')).toContain('sandboxParent()')
  })

  it('H-107 removes the Claude Code row from the T17.2 fixture', () => {
    expect(source('presets/desktops.mjs')).toMatch(/a\.name === 'Claude Code'[^\n]*agents\.remove/)
    expect(TASKS['T17.2'].preset).toBe('bad-default-agent')
  })

  it('H-109 measures Time from the log and refuses a placeholder', () => {
    const entries = [{ ts: '2026-01-01T10:00:00.000Z' }, { ts: '2026-01-01T10:04:30.000Z' }]
    expect(minutesFromLog(entries)).toBe(4.5)
    expect(minutesFromLog([{ ts: '2026-01-01T10:00:00.000Z' }])).toBeNull()
    const record = (time) => `# T01.1 x - novice\n- Result: PASS (ok)   Steps: 3 of 9   ${time}\n- SEQ: 6 - fine`
    for (const time of ['Time: <stop fills in>', 'Time: <min>', 'Time: not measured', 'Time: 5']) expect(withTimeLine(record(time), 4.5)).toContain('Time: 4.5 min')
    expect(withTimeLine('# T\n- Result: PASS (ok)   Steps: 3 of 9', 2)).toContain('Steps: 3 of 9   Time: 2 min')
    expect(withTimeLine('no result line', 2)).toBe('no result line')
    expect(recordPlaceholderProblem(record('Time: <stop fills in>'))).toMatch(/<stop fills in>/)
    expect(recordPlaceholderProblem(record('Time: <min>'))).toMatch(/<min>/)
    expect(recordPlaceholderProblem(withTimeLine(record('Time: <min>'), 4.5))).toBeNull()
    expect(recordPlaceholderProblem('- Answer: use <div> tags\n')).toBeNull()
    expect(RECORD_TEMPLATE).not.toContain('Time: <min>')
    expect(source('session.mjs')).toContain('recordPlaceholderProblem(')
  })

  it('H-110 writes the rerun and facilitator flags and the reason into the notes', () => {
    const next = withRunFlags({ task: 'T28.1', rerun: null, finishedByFacilitator: false, notes: ['a'] }, { rerun: 'usage limit', finishedByFacilitator: true })
    expect(next).toMatchObject({ rerun: { reason: 'usage limit' }, finishedByFacilitator: true })
    expect(next.notes).toEqual(['a', 'rerun: usage limit', 'finished by the facilitator'])
    expect(withRunFlags({ rerun: { reason: 'x' }, notes: [] }, {}).rerun).toEqual({ reason: 'x' })
    expect(rerunProblem({ lostRunExists: true, rerun: undefined, check: { rerun: null } })).toMatch(/--rerun/)
    expect(rerunProblem({ lostRunExists: true, rerun: 'limit', check: {} })).toBeNull()
    expect(rerunProblem({ lostRunExists: false, check: {} })).toBeNull()
  })

  it('H-111 stop needs the record when check.json exists', () => {
    expect(stopRecordProblem({ hasCheck: true, record: undefined })).toMatch(/--record/)
    expect(stopRecordProblem({ hasCheck: true, record: 'r.md' })).toBeNull()
    expect(stopRecordProblem({ hasCheck: true, noRecord: true })).toBeNull()
    expect(stopRecordProblem({ hasCheck: false })).toBeNull()
    expect(stopRecordProblem({ hasCheck: true, noCheck: true })).toBeNull()
  })

  it('H-112 and H-118: move prints the tooltip text, type says that a line break presses Enter', () => {
    expect(tooltipNote('Pause all agents')).toContain('"Pause all agents"')
    expect(tooltipNote('  ')).toBeNull()
    expect(tooltipNote(null)).toBeNull()
    expect(enterNote('one line')).toBeNull()
    expect(enterNote('a\nb\nc')).toMatch(/Enter pressed 2 times/)
    expect(enterNote('a\nb')).toMatch(/Enter pressed 1 time:/)
    expect(source('server.mjs')).toContain('tooltipNote(')
    expect(source('server.mjs')).toContain('enterNote(')
  })

  it('H-113 and H-116: the brief says not to open the session folder or run check again, and to name the window', () => {
    const brief = buildBrief({ task: 'T01.1', level: 'novice', taskInfo: { title: 'x' }, panelist: source('PANELIST.md') })
    expect(brief).toContain('do not open the session folder, `check.json`')
    expect(brief).toContain('never run `check` again')
    expect(source('PANELIST.md')).toMatch(/name the window/)
  })

  it('H-114 documents the usage-limit rerun procedure', () => {
    const text = source('FACILITATOR.md')
    expect(text).toContain('Rerun after a usage limit (H-114)')
    expect(text).toContain('-session-lost')
    expect(text).toContain('--rerun')
  })

  it('H-117 names the form button "Send name" and the speaker "Helper"', () => {
    const labels = source('scripts/a2ui.json').match(/"text":\s*"Send[^"]*"/g) ?? []
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.every((l) => l.includes('Send name'))).toBe(true)
    expect(source('presets/misc.mjs')).toContain("A2UI_SPEAKER = 'Helper'")
  })

  it('H-119 check prints the reason to the facilitator only when the result is not a PASS', () => {
    const result = { status: 'FAIL', reason: 'the answer lacks: not-a-real-command', notes: ['note one'] }
    const hidden = checkLines({ result, steps: 4, budget: 9 }).join('\n')
    expect(hidden).not.toMatch(/lacks|not-a-real-command|note one/)
    expect(hidden).toContain('FAIL')
    expect(hidden).toContain('steps: 4 of budget 9')
    expect(checkLines({ result, steps: 4, budget: 9, facilitator: true }).join('\n')).toMatch(/lacks: not-a-real-command[\s\S]*note one/)
    expect(checkLines({ result: { status: 'PASS', reason: 'ok', notes: [] }, steps: 1, budget: null })[0]).toBe('PASS: ok')
    expect(source('session.mjs')).toContain('checkLines(')
  })

  it('H-115 T25.3 has a task, a start state, a script and a check for the chat review', () => {
    const task = loadTasks()['T25.3']
    expect(task).toMatchObject({ title: 'The chat reviews', min: 4, budgetExpert: 12, budgetNovice: 16 })
    expect(task.scenario).toContain('how many remarks it left and where you were taken afterwards')
    expect(asksQuestion(task)).toBe(true)
    expect(TASKS['T25.3'].preset).toBe('review-chat')
    expect(CHECKS['T25.3']).toBeTypeOf('function')
    expect(readFileSync(join(hereDir, '../../docs/ux/tasks.md'), 'utf8')).toContain('| J25 | T25.1, T25.2, T25.3 |')
    const tools = JSON.parse(source('scripts/chat-review.json'))
      .rules[0].steps.filter((s) => s.type === 'mcpCall')
      .map((s) => s.tool)
    expect(tools).toEqual(['review_open', 'review_list_changes', 'review_read_diff', 'review_add_comment', 'review_add_comment', 'review_submit'])
  })

  it('H-115 the T25.3 checks: two agent remarks, a verdict, no text list, the chat in front', () => {
    const comments = [{ author: 'agent' }, { author: 'agent' }]
    const base = { review: { comments, summary: { verdict: 'request_changes' } }, entries: [msg('user', 'review please'), msg('agent', 'I left 2 remarks in the review window.')], desktop: { focusedWindowId: 7 }, chatWindowId: 7 }
    const ok = (input) => chatReviewChecks(input).every(([good]) => good)
    expect(ok(base)).toBe(true)
    expect(ok({ ...base, review: { ...base.review, comments: [{ author: 'agent' }] } })).toBe(false)
    expect(ok({ ...base, review: { ...base.review, comments: [{ author: 'agent' }, { author: 'user' }] } })).toBe(false)
    expect(ok({ ...base, review: { ...base.review, summary: null } })).toBe(false)
    expect(ok({ ...base, entries: [msg('agent', 'Remarks: notes.txt:4 THREE is shouted in capitals')] })).toBe(false)
    expect(ok({ ...base, desktop: { focusedWindowId: 3 } })).toBe(false)
    expect(listsRemarksAsText(msg('agent', 'I left 2 remarks.'))).toBe(false)
  })
})
