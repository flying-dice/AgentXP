/** The ACP agent: sessions, prompt turns, cancellation. Wires the script host, controller and runner together. */
import { PROTOCOL_VERSION, RequestError, agent, methods, type AgentApp, type AgentContext, type McpServer } from '@agentclientprotocol/sdk'
import { randomUUID } from 'node:crypto'
import { NO_DEFAULTS, sendUpdate, type ActionContext } from './actions.ts'
import type { StepController } from './control.ts'
import { McpHub } from './mcp.ts'
import { parsePrompt } from './prompt.ts'
import { TurnRunner } from './runner.ts'
import type { ScriptHost } from './scriptHost.ts'
import { CONTROL_COMMANDS, runSlashCommand } from './slashCommands.ts'

interface Session {
  cwd: string
  mcp: McpHub
  modeId: string | null
  modelId: string | null
  turn: AbortController | null
  toolCounter: number
}

export interface ScriptedAgent {
  app: AgentApp
  /** Closes MCP connections and cancels running turns. */
  dispose(): Promise<void>
}

export function createScriptedAgent(host: ScriptHost, controller: StepController): ScriptedAgent {
  const sessions = new Map<string, Session>()

  const session = (id: string): Session => {
    const found = sessions.get(id)
    if (!found) throw RequestError.invalidParams({ sessionId: id }, `unknown session ${id}`)
    return found
  }

  const open = (id: string, cwd: string, servers: McpServer[]): Session => {
    const { modes, models } = host.current.agent
    const created: Session = { cwd, mcp: new McpHub(servers), modeId: modes?.[0]?.id ?? null, modelId: models?.[0]?.id ?? null, turn: null, toolCounter: 0 }
    sessions.set(id, created)
    return created
  }

  const state = (s: Session): Record<string, unknown> => {
    const { modes, models } = host.current.agent
    return {
      ...(modes && s.modeId ? { modes: { currentModeId: s.modeId, availableModes: modes.map((m) => ({ id: m.id, name: m.name, description: m.description })) } } : {}),
      ...(models && s.modelId
        ? { models: { currentModelId: s.modelId, availableModels: models.map((m) => ({ modelId: m.id, name: m.name, description: m.description })) } }
        : {})
    }
  }

  /** Advertises the control commands and the script's own commands once the session response went out. */
  const advertiseCommands = (client: AgentContext, sessionId: string): void => {
    setTimeout(() => {
      const commands = [...CONTROL_COMMANDS, ...(host.current.agent.commands ?? [])].map((c) => ({ name: c.name, description: c.description, input: c.hint ? { hint: c.hint } : null }))
      void sendUpdate(client, sessionId, { sessionUpdate: 'available_commands_update', availableCommands: commands }).catch(() => undefined)
    }, 0)
  }

  const reply = (client: AgentContext, sessionId: string, text: string): Promise<void> =>
    sendUpdate(client, sessionId, { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } })

  const app = agent({ name: host.current.agent.name })
    .onRequest(methods.agent.initialize, () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentInfo: { name: host.current.agent.name, version: host.current.agent.version },
      agentCapabilities: { loadSession: true }
    }))
    .onRequest(methods.agent.session.new, ({ params, client }) => {
      const id = `scripted-${randomUUID()}`
      const created = open(id, params.cwd, params.mcpServers)
      advertiseCommands(client, id)
      return { sessionId: id, ...state(created) }
    })
    .onRequest(methods.agent.session.load, ({ params, client }) => {
      const loaded = open(params.sessionId, params.cwd, params.mcpServers ?? [])
      advertiseCommands(client, params.sessionId)
      return state(loaded)
    })
    .onRequest(methods.agent.session.setMode, async ({ params, client }) => {
      const s = session(params.sessionId)
      if (!host.current.agent.modes?.some((m) => m.id === params.modeId)) throw RequestError.invalidParams({ modeId: params.modeId }, `unknown mode ${params.modeId}`)
      s.modeId = params.modeId
      await sendUpdate(client, params.sessionId, { sessionUpdate: 'current_mode_update', currentModeId: params.modeId })
      return {}
    })
    .onRequest('session/set_model', (raw: unknown) => raw as { sessionId: string; modelId: string }, ({ params }) => {
      const s = session(params.sessionId)
      if (!host.current.agent.models?.some((m) => m.id === params.modelId)) throw RequestError.invalidParams({ modelId: params.modelId }, `unknown model ${params.modelId}`)
      s.modelId = params.modelId
      return {}
    })
    .onNotification(methods.agent.session.cancel, ({ params }) => {
      sessions.get(params.sessionId)?.turn?.abort()
    })
    .onRequest(methods.agent.session.prompt, async ({ params, client }) => {
      const s = session(params.sessionId)
      const prompt = parsePrompt(params.prompt)
      const control = runSlashCommand(prompt.text, controller)
      if (control !== null) {
        await reply(client, params.sessionId, control)
        return { stopReason: 'end_turn' }
      }
      const selection = host.select(prompt.text)
      const turn = new AbortController()
      s.turn = turn
      const vars = new Map<string, string>([
        ['prompt', prompt.text],
        ['cwd', s.cwd],
        ['desktop', prompt.desktop],
        ['sessionId', params.sessionId],
        ...Object.entries(selection?.captures ?? {})
      ])
      const ctx: ActionContext = {
        client,
        sessionId: params.sessionId,
        cwd: s.cwd,
        vars,
        signal: turn.signal,
        mcp: s.mcp,
        defaults: host.current.defaults ?? NO_DEFAULTS,
        nextId: () => `mcp-${++s.toolCounter}`
      }
      try {
        const stopReason = await new TurnRunner(ctx, controller).run({ rule: selection?.rule.id ?? null, steps: selection?.rule.steps ?? host.fallbackSteps() })
        return { stopReason }
      } finally {
        s.turn = null
      }
    })

  return {
    app,
    async dispose() {
      await Promise.all([...sessions.values()].map(async (s) => {
        s.turn?.abort()
        await s.mcp.close()
      }))
      sessions.clear()
    }
  }
}
