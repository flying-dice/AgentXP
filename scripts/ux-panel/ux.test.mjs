import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { normalizeKey, parseArgs, parseCommand } from './lib/args.mjs'
import { countSteps, createLog, readLog, summarize } from './lib/log.mjs'
import { parseTasks } from './lib/tasktext.mjs'

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
