import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { loadScript } from './script.ts'
import { Harness, script, type HarnessOptions } from './testkit.ts'

const here = dirname(fileURLToPath(import.meta.url))
const demo = (): ReturnType<typeof loadScript> => loadScript(join(here, 'scripts', 'demo.json'))

let harness: Harness | null = null
afterEach(async () => {
  await harness?.dispose()
  harness = null
})
const start = async (s: ReturnType<typeof script>, options?: HarnessOptions): Promise<Harness> => (harness = await new Harness(s, options).start())

describe('demo.json', () => {
  it('runs the full turn when the edit is allowed', async () => {
    const h = await start(demo(), { permission: () => 'allow', files: { '/work/README.md': '# readme' }, terminalOutput: 'tests ok', terminalExitCode: 0 })
    expect(await h.prompt('please fix it')).toBe('end_turn')

    expect(h.trace()).toEqual([
      ...['On it: p', 'lease fi', 'x it'].map((t) => `message:${t}`),
      'thought:Reading the README first, then proposing a small edit.',
      'plan',
      'request:fs/read_text_file',
      'message:Read README.md (error: false).\n',
      'tool_call:edit-1:pending',
      'request:session/request_permission',
      'tool_call_update:edit-1:in_progress',
      'request:fs/write_text_file',
      'tool_call_update:edit-1:completed',
      'tool_call:test-1:in_progress',
      'request:terminal/create',
      'tool_call_update:test-1:completed',
      'message:Edit applied; npm test exited with 0.',
      'usage_update',
      'message: Done.'
    ])
    expect(h.written).toEqual([{ path: '/work/SCRIPTED.md', content: '# Scripted\n\nWritten by the scripted agent.\n' }])
    const [diff] = h.updates('tool_call')[0].content ?? []
    expect(diff).toMatchObject({ type: 'diff', path: '/work/SCRIPTED.md', oldText: null })
    expect(h.updates('plan')[0].entries).toHaveLength(3)
    const terminal = h.seen.find((s) => s.kind === 'request' && s.method === 'terminal/create')
    expect(terminal).toMatchObject({ params: { command: 'npm', args: ['test'], cwd: '/work' } })
  })

  it('takes the deny branch and ends the turn there', async () => {
    const h = await start(demo(), { permission: () => 'deny' })
    expect(await h.prompt('do it')).toBe('end_turn')
    expect(h.trace().slice(-3)).toEqual(['request:session/request_permission', 'tool_call_update:edit-1:failed', 'message:Understood, I left the files alone.'])
    expect(h.written).toEqual([])
    expect(h.trace()).not.toContain('usage_update')
  })

  it('takes the cancelled branch when the permission is dismissed', async () => {
    const h = await start(demo(), { permission: () => 'cancelled' })
    expect(await h.prompt('do it')).toBe('cancelled')
    expect(h.trace().at(-1)).toBe('tool_call_update:edit-1:failed')
  })

  it('answers a greeting with the greeting rule only', async () => {
    const h = await start(demo())
    expect(await h.prompt('Hello!')).toBe('end_turn')
    expect(h.trace()).toEqual(['message:Hello from the scripted agent. Say anything else to run the demo turn.'])
  })

  it('reports a failed file read through saveAs instead of failing the turn', async () => {
    const h = await start(demo(), { permission: () => 'deny' })
    await h.prompt('go')
    expect(h.trace()).toContain('message:Read README.md (error: true).\n')
  })
})

describe('rules and fallback', () => {
  it('uses the fallback, or an explanation, when no rule matches', async () => {
    const h = await start(script({ rules: [{ id: 'a', match: { equals: 'a' }, steps: [] }] }))
    await h.prompt('zzz')
    expect(h.trace()).toEqual(['message:No scripted rule matches "zzz".'])
    h.loadScript(script({ rules: [], fallback: [{ type: 'message', text: 'fallback for {{prompt}}' }] }))
    await h.prompt('q')
    expect(h.trace().at(-1)).toBe('message:fallback for q')
  })

  it('exposes regex captures and the desktop resource to templates', async () => {
    const h = await start(script({ rules: [{ id: 'r', match: { regex: 'open (?<app>\\w+)' }, steps: [{ type: 'message', text: '{{match.app}}|{{desktop}}|{{sessionId}}' }] }] }))
    await h.prompt('open notepad', [{ type: 'resource', resource: { uri: 'agentxp://desktop/state', text: '{"windows":[]}' } }])
    expect(h.trace()).toEqual([`message:notepad|{"windows":[]}|${h.sessionId}`])
  })

  it('consumes once rules', async () => {
    const h = await start(script({ rules: [{ id: 'one', match: { any: true }, once: true, steps: [{ type: 'message', text: 'first' }] }, { id: 'two', match: { any: true }, steps: [{ type: 'message', text: 'later' }] }] }))
    await h.prompt('a')
    await h.prompt('b')
    expect(h.trace()).toEqual(['message:first', 'message:later'])
  })

  it('chunks messages by defaults.chunkSize unless the step opts out', async () => {
    const h = await start(script({ defaults: { chunkSize: 3 }, rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'message', text: 'abcdefg' }, { type: 'message', text: 'whole', chunked: false }] }] }))
    await h.prompt('x')
    expect(h.trace()).toEqual(['message:abc', 'message:def', 'message:g', 'message:whole'])
  })
})

describe('step kinds', () => {
  it('emits the ACP updates for mode, usage, commands, session info and tool calls', async () => {
    const h = await start(
      script({
        rules: [
          {
            id: 'r',
            match: { any: true },
            steps: [
              { type: 'modeChange', modeId: 'plan' },
              { type: 'usage', used: 5, size: 10 },
              { type: 'availableCommands', commands: [{ name: 'go', description: 'Go', hint: 'where' }] },
              { type: 'sessionInfo', title: 'Titled' },
              { type: 'toolCall', id: 't', title: 'T', kind: 'read', locations: [{ path: '/a', line: 2 }], rawInput: { a: 1 } },
              { type: 'toolCallUpdate', id: 't', status: 'completed', content: [{ text: 'done' }], rawOutput: { b: 2 } }
            ]
          }
        ]
      })
    )
    await h.prompt('x')
    expect(h.updates('current_mode_update')[0].currentModeId).toBe('plan')
    expect(h.updates('usage_update')[0]).toMatchObject({ used: 5, size: 10 })
    expect(h.updates('available_commands_update').at(-1)?.availableCommands).toEqual([{ name: 'go', description: 'Go', input: { hint: 'where' } }])
    expect(h.updates('session_info_update')[0].title).toBe('Titled')
    expect(h.updates('tool_call')[0]).toMatchObject({ toolCallId: 't', kind: 'read', status: 'pending', locations: [{ path: '/a', line: 2 }], rawInput: { a: 1 } })
    expect(h.updates('tool_call_update')[0]).toMatchObject({ status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'done' } }], rawOutput: { b: 2 } })
  })

  it('stores file and terminal results in variables for later steps', async () => {
    const h = await start(
      script({
        rules: [
          {
            id: 'r',
            match: { any: true },
            steps: [
              { type: 'readFile', path: '/work/a.txt', saveAs: 'a' },
              { type: 'terminal', command: 'echo', args: ['hi'], saveAs: 'out' },
              { type: 'message', text: '{{a}}/{{out}}/{{out.exitCode}}' }
            ]
          }
        ]
      }),
      { files: { '/work/a.txt': 'AAA' }, terminalOutput: 'OUT', terminalExitCode: 3 }
    )
    await h.prompt('x')
    expect(h.trace().at(-1)).toBe('message:AAA/OUT/3')
  })
})

describe('failures', () => {
  const fails = async (steps: Parameters<typeof script>[0]['rules'][number]['steps'], message: RegExp, options?: HarnessOptions): Promise<Harness> => {
    const h = await start(script({ rules: [{ id: 'r', match: { any: true }, steps }] }), options)
    await expect(h.prompt('x')).rejects.toThrow(message)
    return h
  }

  it('rejects the prompt with the error step', async () => {
    const h = await fails([{ type: 'message', text: 'before' }, { type: 'error', message: 'Scripted failure' }, { type: 'message', text: 'after' }], /Scripted failure/)
    expect(h.trace()).toEqual(['message:before'])
  })

  it('fails the turn when an expectation is not met, with the variable in the message', async () => {
    await fails([{ type: 'terminal', command: 'x', saveAs: 'out' }, { type: 'expect', from: 'out', contains: 'green' }], /variable "out" does not contain "green"/, { terminalOutput: 'red' })
    await fails([{ type: 'expect', from: 'ghost', equals: 'x' }], /variable "ghost" does not exist/)
    await fails([{ type: 'terminal', command: 'x', saveAs: 'o' }, { type: 'expect', from: 'o', regex: '^\\d+$' }], /does not match/, { terminalOutput: 'abc' })
  })

  it('uses the expect message when given', async () => {
    await fails([{ type: 'terminal', command: 'x', saveAs: 'o' }, { type: 'expect', from: 'o', equals: 'a', message: 'custom text' }], /custom text/)
  })

  it('passes expect when the condition holds', async () => {
    const h = await start(script({ rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'terminal', command: 'x', saveAs: 'o' }, { type: 'expect', from: 'o', equals: 'fine' }, { type: 'message', text: 'ok' }] }] }), { terminalOutput: 'fine' })
    expect(await h.prompt('x')).toBe('end_turn')
  })

  it('extract picks group 1 of a regex into a variable and fails when nothing matches', async () => {
    const steps = [{ type: 'terminal' as const, command: 'x', saveAs: 'o' }, { type: 'extract' as const, from: 'o', regex: '\\[(\\d+)\\] button "Send"', saveAs: 'ref' }]
    const h = await start(script({ rules: [{ id: 'r', match: { any: true }, steps: [...steps, { type: 'expect', from: 'ref', equals: '12' }, { type: 'message', text: 'ref {{ref}}' }] }] }), { terminalOutput: 'x\n[12] button "Send"' })
    expect(await h.prompt('x')).toBe('end_turn')
    await fails(steps, /extract failed: .* does not match variable "o"/, { terminalOutput: 'nothing here' })
  })

  it('fails the turn on an unknown template variable', async () => {
    await fails([{ type: 'message', text: 'Hello {{nobody}}' }], /Unknown template variable \{\{nobody\}\}/)
  })

  it('fails the turn when a client request errors and nothing captures it', async () => {
    await fails([{ type: 'readFile', path: '/nope' }], /not found|Resource/i)
  })

  it.each(['end_turn', 'max_tokens', 'refusal', 'cancelled'] as const)('ends with the stop reason %s', async (stopReason) => {
    const h = await start(script({ rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'message', text: 'a' }, { type: 'end', stopReason }, { type: 'message', text: 'never' }] }] }))
    expect(await h.prompt('x')).toBe(stopReason)
    expect(h.trace()).toEqual(['message:a'])
  })
})

describe('cancellation', () => {
  it('stops a waiting turn and answers cancelled', async () => {
    const h = await start(script({ rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'message', text: 'start' }, { type: 'wait', ms: 60_000 }, { type: 'message', text: 'never' }] }] }))
    const turn = h.prompt('x')
    await new Promise((r) => setTimeout(r, 30))
    await h.cancel()
    expect(await turn).toBe('cancelled')
    expect(h.trace()).toEqual(['message:start'])
    expect(h.controller.status().state).toBe('idle')
  })

  it('stops a turn paused before a manual step', async () => {
    const h = await start(script({ defaults: { stepMode: 'manual' }, rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'message', text: 'never' }] }] }))
    const turn = h.prompt('x')
    await new Promise((r) => setTimeout(r, 30))
    expect(h.controller.status().state).toBe('paused')
    await h.cancel()
    expect(await turn).toBe('cancelled')
    expect(h.trace()).toEqual([])
    expect(h.controller.status().state).toBe('idle')
  })
})
