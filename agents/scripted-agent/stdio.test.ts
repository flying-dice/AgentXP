/** The agent as the app runs it: a child process speaking ACP over stdio, with the control socket. */
import { spawn, type ChildProcess } from 'node:child_process'
import { dirname, join } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { PROTOCOL_VERSION, client, methods, ndJsonStream, type SessionNotification } from '@agentclientprotocol/sdk'
import { afterEach, describe, expect, it } from 'vitest'
import { connect } from './controlClient.ts'
import { socketPath } from './testkit.ts'

const entry = join(dirname(fileURLToPath(import.meta.url)), 'index.ts')
let child: ChildProcess | null = null
afterEach(() => {
  child?.kill()
  child = null
})

function spawnAgent(args: string[], env: Record<string, string> = {}): ChildProcess {
  child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', entry, ...args], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] })
  return child
}

describe('scripted agent process', () => {
  it('runs a bundled script by name and is stepped through the control socket', async () => {
    const control = socketPath()
    const proc = spawnAgent(['--script', 'stepping'], { AGENT7_SCRIPT_CONTROL: control })
    const updates: SessionNotification['update'][] = []
    const connection = client({ name: 'test' })
      .onNotification(methods.client.session.update, ({ params }) => void updates.push(params.update))
      .connect(ndJsonStream(Writable.toWeb(proc.stdin!) as WritableStream<Uint8Array>, Readable.toWeb(proc.stdout!) as ReadableStream<Uint8Array>))

    const init = await connection.agent.request(methods.agent.initialize, { protocolVersion: PROTOCOL_VERSION })
    expect(init.agentInfo).toMatchObject({ name: 'scripted-agent', version: '1.0.0' })
    const { sessionId } = await connection.agent.request(methods.agent.session.new, { cwd: process.cwd(), mcpServers: [] })

    const stepper = await connectWhenReady(control)
    const turn = connection.agent.request(methods.agent.session.prompt, { sessionId, prompt: [{ type: 'text', text: 'go' }] })
    for (let i = 0; i < 6; i++) {
      await stepper.waitForPause()
      await stepper.next()
    }
    expect((await turn).stopReason).toBe('end_turn')
    expect(updates.map((u) => u.sessionUpdate).filter((k) => k !== 'available_commands_update')).toEqual(['agent_message_chunk', 'agent_thought_chunk', 'plan', 'tool_call', 'tool_call_update', 'agent_message_chunk'])
    stepper.close()
    connection.close()
  })

  it('exits with a readable error for an invalid script', async () => {
    const proc = spawnAgent(['--script', join(dirname(entry), 'script.schema.json')])
    let stderr = ''
    proc.stderr!.on('data', (d: Buffer) => (stderr += d.toString()))
    const code = await new Promise<number | null>((resolve) => proc.on('exit', resolve))
    expect(code).toBe(1)
    expect(stderr).toMatch(/scripted-agent: Invalid script .*script\.schema\.json: \$\.name: is required/)
  })
})

/** The socket appears a moment after the process starts. */
async function connectWhenReady(path: string): ReturnType<typeof connect> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await connect(path)
    } catch (error) {
      if (attempt > 100) throw error
      await new Promise((r) => setTimeout(r, 50))
    }
  }
}
