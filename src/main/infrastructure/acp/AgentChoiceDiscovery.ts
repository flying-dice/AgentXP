import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { client, methods, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'
import type { AgentInput } from '@shared/ipc'
import type { AgentChoiceDiscovery } from '../../application/AgentService'
import { AgentProcess } from './AgentProcess'
import { extractSessionState } from './sessionState'

/** Queries session metadata without prompting the model or exposing client tools/MCP servers. */
export class AcpAgentChoiceDiscovery implements AgentChoiceDiscovery {
  async discover(input: AgentInput): ReturnType<AgentChoiceDiscovery['discover']> {
    const cwd = await mkdtemp(join(tmpdir(), 'agentxp-choices-'))
    let proc: AgentProcess | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let connection: ReturnType<ReturnType<typeof client>['connect']> | undefined
    try {
      proc = new AgentProcess({ command: input.command, args: input.args, env: input.env, cwd })
      connection = client({ name: 'agentxp-choices' })
        .onNotification(methods.client.session.update, () => {})
        .onRequest(methods.client.session.requestPermission, async () => ({ outcome: { outcome: 'cancelled' as const } }))
        .connect(proc.stream)
      const active = connection
      const query = async () => {
        await active.agent.request(methods.agent.initialize, {
          protocolVersion: PROTOCOL_VERSION,
          clientCapabilities: {},
          clientInfo: { name: 'agentxp', version: '0.1.0' }
        })
        const response = await active.agent.request(methods.agent.session.new, { cwd, mcpServers: [] })
        const { modes, models } = extractSessionState(response)
        return { modes, models }
      }
      return await Promise.race([
        query(),
        proc.exited.then((exit): never => {
          throw new Error(`The agent stopped while loading choices (${exit.error?.message ?? exit.code ?? exit.signal}).`)
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Loading agent choices timed out. Check that the agent is installed and signed in.')), 60_000)
        })
      ])
    } finally {
      clearTimeout(timer)
      connection?.close()
      await proc?.dispose()
      await rm(cwd, { recursive: true, force: true })
    }
  }
}
