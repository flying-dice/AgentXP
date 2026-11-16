import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { ControlServer, StepController } from './control.ts'
import { connect, type ControlClient } from './controlClient.ts'
import { loadScript } from './script.ts'
import { Harness, script, socketPath } from './testkit.ts'

const here = dirname(fileURLToPath(import.meta.url))
const stepping = (): ReturnType<typeof loadScript> => loadScript(join(here, 'scripts', 'stepping.json'))

let harness: Harness | null = null
let server: ControlServer | null = null
let control: ControlClient | null = null
const loaded: string[] = []
let currentPath = ''

afterEach(async () => {
  control?.close()
  await server?.close()
  await harness?.dispose()
  harness = server = control = null
  loaded.length = 0
})

async function setup(s: ReturnType<typeof script>): Promise<{ h: Harness; control: ControlClient }> {
  const controller = new StepController()
  controller.setScriptName(s.name)
  harness = await new Harness(s, { controller }).start()
  server = new ControlServer(controller, {
    load: (path) => {
      if (path.includes('bad')) throw new Error('Invalid script bad.json: $.name: is required')
      loaded.push(path)
    }
  })
  const path = (currentPath = socketPath())
  await server.listen(path)
  control = await connect(path)
  return { h: harness, control }
}

describe('manual stepping over the control socket', () => {
  it('pauses before every manual step and releases one step per next', async () => {
    const { h, control } = await setup(stepping())
    const turn = h.prompt('go')

    const labels: Array<string | null> = []
    const trace: string[][] = []
    for (let i = 0; i < 6; i++) {
      const paused = await control.waitForPause()
      expect(paused).toMatchObject({ state: 'paused', rule: 'stepper', stepIndex: i, path: String(i), mode: 'script', script: 'stepping' })
      labels.push(paused.label)
      trace.push(h.trace())
      expect(await control.next()).toBe(true)
    }

    expect(await turn).toBe('end_turn')
    expect(labels).toEqual(['first message', 'thought', 'plan', 'tool start', 'tool end', 'last message'])
    expect(trace.map((t) => t.length)).toEqual([0, 1, 2, 3, 4, 5])
    expect(h.trace()).toEqual(['message:Step one.\n', 'thought:Thinking between steps.', 'plan', 'tool_call:t1:in_progress', 'tool_call_update:t1:completed', 'message:All steps done.'])
    expect((await control.status()).state).toBe('idle')
    expect(control.events.map((e) => e.event)).toEqual(['turn_started', ...Array<string>(6).fill('paused').flatMap((p) => [p, 'resumed']), 'turn_ended'])
    expect(control.events.at(-1)).toMatchObject({ event: 'turn_ended', stopReason: 'end_turn' })
  })

  it('next with nothing paused releases nothing and keeps no credit', async () => {
    const { h, control } = await setup(stepping())
    expect(await control.next()).toBe(false)
    const turn = h.prompt('go')
    await control.waitForPause()
    expect(h.trace()).toEqual([])
    await control.setMode('auto')
    expect(await turn).toBe('end_turn')
    expect(h.trace()).toHaveLength(6)
  })

  it('a manual step in an automatic script pauses only there', async () => {
    const { h, control } = await setup(script({ rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'message', text: 'a' }, { type: 'message', text: 'b', step: 'manual', label: 'b' }, { type: 'message', text: 'c' }] }] }))
    const turn = h.prompt('1')
    const paused = await control.waitForPause()
    expect(paused).toMatchObject({ stepIndex: 1, label: 'b' })
    expect(h.trace()).toEqual(['message:a'])
    await control.next()
    expect(await turn).toBe('end_turn')
    expect(h.trace()).toEqual(['message:a', 'message:b', 'message:c'])
  })

  it('manual forces every step to pause; script hands control back', async () => {
    const { h, control } = await setup(script({ rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'message', text: 'a' }, { type: 'message', text: 'b' }] }] }))
    expect((await control.setMode('manual')).mode).toBe('manual')
    const turn = h.prompt('1')
    await control.waitForPause()
    await control.next()
    expect(await control.waitForPause()).toMatchObject({ stepIndex: 1 })
    expect((await control.setMode('script')).mode).toBe('script')
    await control.next()
    expect(await turn).toBe('end_turn')
    expect(h.trace()).toEqual(['message:a', 'message:b'])
  })

  it('waits inside permission branches and reports the branch path', async () => {
    const s = script({
      defaults: { stepMode: 'manual' },
      rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'requestPermission', toolCallId: 't', options: [{ optionId: 'yes', name: 'Yes', kind: 'allow_once' }], branches: { yes: [{ type: 'message', text: 'in branch', label: 'inner' }] } }] }]
    })
    const { h, control } = await setup(s)
    const turn = h.prompt('x')
    await control.waitForPause()
    await control.next()
    expect(await control.waitForPause()).toMatchObject({ path: '0/yes/0', stepIndex: 0, stepType: 'message', label: 'inner' })
    await control.next()
    expect(await turn).toBe('end_turn')
  })

  it('announces pauses in the chat when defaults.announcePause is set', async () => {
    const { h, control } = await setup(script({ defaults: { stepMode: 'manual', announcePause: true }, rules: [{ id: 'r', match: { any: true }, steps: [{ type: 'message', text: 'x', label: 'only' }] }] }))
    const turn = h.prompt('x')
    await control.waitForPause()
    await new Promise((r) => setTimeout(r, 20))
    expect(h.trace()).toEqual(['thought:[paused before step 0: message "only"; waiting for next]'])
    await control.next()
    await turn
  })
})

describe('chat control commands', () => {
  it('/auto, /status and /script answer in the chat while idle', async () => {
    const { h } = await setup(stepping())
    await h.prompt('/auto')
    await h.prompt('/status')
    const texts = h.updates('agent_message_chunk').map((u) => (u.content.type === 'text' ? u.content.text : ''))
    expect(texts[0]).toBe('Mode: auto.')
    expect(JSON.parse(texts[1])).toMatchObject({ state: 'idle', mode: 'auto', script: 'stepping' })
    expect(await h.prompt('go')).toBe('end_turn')
    expect(h.trace().filter((t) => t.startsWith('message:Step') || t.startsWith('message:All'))).toHaveLength(2)
    await h.prompt('/script')
    expect(h.controller.status().mode).toBe('script')
  })

  it('/next from another prompt releases a paused turn; with nothing paused it says so', async () => {
    const { h, control } = await setup(stepping())
    await h.prompt('/next')
    expect(h.trace().at(-1)).toBe('message:Nothing is paused.')
    const turn = h.prompt('go')
    await control.waitForPause()
    await h.prompt('/next')
    expect(h.trace()).toContain('message:Released the paused step.')
    await control.waitForPause()
    await control.setMode('auto')
    expect(await turn).toBe('end_turn')
  })

  it('advertises the control commands and the script commands after session/new', async () => {
    const { h } = await setup(script({ agent: { name: 'a', version: '1', commands: [{ name: 'scripted', description: 'Own command' }] }, rules: [] }))
    await new Promise((r) => setTimeout(r, 20))
    const names = h.updates('available_commands_update')[0].availableCommands.map((c) => c.name)
    expect(names).toEqual(['next', 'auto', 'manual', 'script', 'status', 'scripted'])
  })
})

describe('control socket protocol', () => {
  it('answers status with the state, rule, step index and label', async () => {
    const { control } = await setup(stepping())
    expect(await control.status()).toEqual({ ok: true, cmd: 'status', state: 'idle', mode: 'script', rule: null, stepIndex: null, path: null, stepType: null, label: null, script: 'stepping' })
  })

  it('load replaces the script through the host; errors come back as ok:false', async () => {
    const { control } = await setup(stepping())
    await control.load('other.json')
    expect(loaded).toEqual(['other.json'])
    await expect(control.load('bad.json')).rejects.toThrow('Invalid script bad.json: $.name: is required')
  })

  it('rejects unknown commands and invalid JSON without dropping the connection', async () => {
    const { control } = await setup(stepping())
    await expect(control.send({ cmd: 'explode' })).rejects.toThrow(/unknown cmd "explode"/)
    expect((await control.status()).state).toBe('idle')
  })

  it('pushes pause events to every connected client', async () => {
    const { h, control } = await setup(stepping())
    const second = await connect(currentPath)
    const seen = second.waitForEvent('paused')
    const turn = h.prompt('go')
    await control.waitForPause()
    expect(await seen).toMatchObject({ event: 'paused', label: 'first message' })
    second.close()
    await control.setMode('auto')
    await turn
  })
})
