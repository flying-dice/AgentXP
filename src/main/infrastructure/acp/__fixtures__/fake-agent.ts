/**
 * Minimal ACP agent used by the end-to-end test. Run with
 * `node --experimental-strip-types fake-agent.ts` (so: type-only imports, no enums).
 *
 * On every prompt it streams a message chunk, a plan, a tool call that needs
 * permission, writes `fake-agent-output.txt` through fs/write_text_file, runs a
 * terminal command, then ends the turn (or reports `cancelled`).
 */
import { randomUUID } from 'node:crypto'
import { Readable, Writable } from 'node:stream'
import { PROTOCOL_VERSION, agent, methods, ndJsonStream } from '@agentclientprotocol/sdk'
import type { AgentContext } from '@agentclientprotocol/sdk'

const cwds = new Map<string, string>()

async function update(cx: AgentContext, sessionId: string, u: Record<string, unknown>): Promise<void> {
  await cx.notify(methods.client.session.update, { sessionId, update: u as never })
}

async function runTerminal(cx: AgentContext, sessionId: string): Promise<string> {
  const terminal = await cx.createTerminal({
    sessionId,
    command: process.execPath,
    args: ['-e', "console.log('terminal-says-hi')"]
  })
  await terminal.waitForExit()
  const { output } = await terminal.currentOutput()
  await terminal.release()
  return output.trim()
}

const app = agent({ name: 'fake-agent' })
  .onRequest(methods.agent.initialize, () => ({
    protocolVersion: PROTOCOL_VERSION,
    agentInfo: { name: 'fake-agent', version: '1.0.0' },
    agentCapabilities: { loadSession: false }
  }))
  .onRequest(methods.agent.session.new, ({ params }) => {
    // Unit tests expect the fixed id. The e2e fixture sets FAKE_AGENT_UNIQUE_SESSIONS: Agent7 keeps (agent, ACP session id)
    // unique, and every chat of one registered agent starts a new process of this file, so a fixed id would collide.
    const sessionId = process.env['FAKE_AGENT_UNIQUE_SESSIONS'] ? `fake-session-${randomUUID()}` : 'fake-session'
    cwds.set(sessionId, params.cwd)
    return {
      sessionId,
      modes: {
        currentModeId: 'default',
        availableModes: [
          { id: 'default', name: 'Default' },
          { id: 'plan', name: 'Plan', description: 'Plan only' }
        ]
      }
    }
  })
  .onRequest(methods.agent.session.setMode, async ({ params, client }) => {
    await update(client, params.sessionId, { sessionUpdate: 'current_mode_update', currentModeId: params.modeId })
    return {}
  })
  .onRequest(methods.agent.session.prompt, async ({ params, client }) => {
    const sessionId = params.sessionId
    await update(client, sessionId, {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'Working on it' }
    })
    await update(client, sessionId, {
      sessionUpdate: 'plan',
      entries: [{ content: 'Write file', priority: 'high', status: 'in_progress' }]
    })
    await update(client, sessionId, {
      sessionUpdate: 'tool_call',
      toolCallId: 'tc-1',
      title: 'Write output',
      kind: 'edit',
      status: 'pending',
      rawInput: { path: 'fake-agent-output.txt' }
    })
    const permission = await client.request(methods.client.session.requestPermission, {
      sessionId,
      toolCall: { toolCallId: 'tc-1', title: 'Write output' },
      options: [
        { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
        { optionId: 'reject', name: 'Reject', kind: 'reject_once' }
      ]
    })
    if (permission.outcome.outcome !== 'selected' || permission.outcome.optionId !== 'allow') {
      await update(client, sessionId, { sessionUpdate: 'tool_call_update', toolCallId: 'tc-1', status: 'failed' })
      return { stopReason: 'cancelled' }
    }
    await client.request(methods.client.fs.writeTextFile, {
      sessionId,
      path: `${cwds.get(sessionId)}/fake-agent-output.txt`,
      content: 'hello from fake agent\n'
    })
    const terminalOutput = await runTerminal(client, sessionId)
    await update(client, sessionId, {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'tc-1',
      status: 'completed',
      rawOutput: { terminalOutput }
    })
    return { stopReason: 'end_turn' }
  })

app.connect(
  ndJsonStream(Writable.toWeb(process.stdout) as WritableStream<Uint8Array>, Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>)
)
