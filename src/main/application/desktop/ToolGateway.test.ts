import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_POLICY, closedAppMessage, enabledToolGroups, type DesktopState, type ToolPolicyDto } from '@shared/desktop'
import type { PermissionRequestDto } from '@shared/models'
import type { AgentSessionEvent } from '../../domain/agent/AgentSessionEvent'
import type { PermissionDecision, PermissionPrompt } from '../../domain/agent/PermissionPrompter'
import { ToolRefusedError } from '../../domain/agent/ToolGate'
import type { PermissionChange } from '../PermissionBroker'
import { PAUSED_MESSAGE } from './AppToolPolicy'
import { ToolGateway } from './ToolGateway'

const SESSION = 7

class FakeBroker {
  prompts: PermissionPrompt[] = []
  answer: PermissionDecision = { outcome: 'selected', optionId: 'allow' }
  private observer: (change: PermissionChange) => void = () => {}
  observe(observer: (change: PermissionChange) => void): () => void {
    this.observer = observer
    return () => {}
  }
  async prompt(_sessionId: number, request: PermissionPrompt): Promise<PermissionDecision> {
    this.prompts.push(request)
    return this.answer
  }
  /** The agent's own prompt was answered. */
  agentPromptResolved(optionKind: 'allow_once' | 'reject_once'): void {
    const request: PermissionRequestDto = {
      id: 1,
      sessionId: SESSION,
      toolCallId: 'agent-call',
      options: [{ optionId: 'o', name: 'x', kind: optionKind }],
      outcome: 'selected',
      selectedOptionId: 'o'
    }
    this.observer({ kind: 'resolved', request })
  }
}

let state: DesktopState
let policy: ToolPolicyDto
let broker: FakeBroker
let events: AgentSessionEvent[]
let now: number
let gateway: ToolGateway

const baseState = (apps: Parameters<typeof enabledToolGroups>[0]): DesktopState => ({
  desktopId: 1,
  title: 't',
  drives: [{ letter: 'C', label: 'Local Disk', kind: 'system', folderId: null, pluggedAt: null }],
  home: 'C:\\Users\\Agent',
  focusedWindowId: null,
  windows: [],
  tools: enabledToolGroups(apps),
  paused: false,
  userInControl: false,
  notes: []
})

beforeEach(() => {
  state = baseState(['code', 'terminal', 'browser'])
  policy = structuredClone(DEFAULT_TOOL_POLICY)
  broker = new FakeBroker()
  events = []
  now = 1_000
  gateway = new ToolGateway({
    desktops: { stateOfSession: (id) => (id === SESSION ? state : null), policy: () => policy },
    broker,
    events: { publish: (_id, event) => events.push(event) },
    now: () => now
  })
})

const check = (group: 'fs.read' | 'fs.write' | 'terminal' | 'browser' | 'code', askUser = true) =>
  gateway.forSession(SESSION).check('acp', { group, title: 'Do it', askUser })

describe('ToolGateway', () => {
  it('lets calls through when the app is open and the policy allows', async () => {
    await expect(check('code')).resolves.toBeUndefined()
    await expect(check('fs.read')).resolves.toBeUndefined()
    expect(broker.prompts).toEqual([])
  })

  it('refuses a closed app with the open-the-app message', async () => {
    state = baseState(['terminal'])
    await expect(check('browser')).rejects.toThrow(closedAppMessage('browser'))
    await expect(check('fs.write')).rejects.toBeInstanceOf(ToolRefusedError)
  })

  it('refuses everything while paused and when the policy denies', async () => {
    state = { ...state, paused: true }
    await expect(check('code')).rejects.toThrow(PAUSED_MESSAGE)
    state = { ...state, paused: false }
    policy.groups.terminal = 'deny'
    await expect(check('terminal')).rejects.toThrow(/blocked/)
  })

  it('does not gate chats that have no desktop', async () => {
    await expect(gateway.authorize(99, { group: 'terminal', title: 'x' })).resolves.toBeUndefined()
  })

  it('asks the user when the policy says ask, showing the request as a tool call', async () => {
    await check('fs.write')
    expect(broker.prompts).toHaveLength(1)
    expect(broker.prompts[0]?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once'])
    expect(events.map((e) => e.type)).toEqual(['tool_call_created', 'tool_call_updated'])
    expect(events[0]).toMatchObject({ title: expect.stringContaining('Writing files is set to Ask') })
    expect(events[1]).toMatchObject({ patch: { status: 'completed' } })
  })

  it('refuses when the user declines or dismisses', async () => {
    broker.answer = { outcome: 'selected', optionId: 'reject' }
    await expect(check('terminal')).rejects.toThrow(/declined/)
    broker.answer = { outcome: 'cancelled' }
    await expect(check('terminal')).rejects.toThrow(/declined/)
    expect(events.at(-1)).toMatchObject({ patch: { status: 'failed' } })
  })

  it('asks for every call while the user is in control', async () => {
    state = { ...state, userInControl: true }
    await check('code')
    await check('code')
    expect(broker.prompts).toHaveLength(2)
  })

  it('follow-up calls (askUser false) are not asked again', async () => {
    await check('terminal', false)
    expect(broker.prompts).toEqual([])
  })

  it('an approval from the agent\'s own prompt covers the next gated call once, for a minute', async () => {
    broker.agentPromptResolved('allow_once')
    await check('fs.write')
    expect(broker.prompts).toEqual([]) // covered
    await check('fs.write')
    expect(broker.prompts).toHaveLength(1) // consumed: asked now

    broker.agentPromptResolved('allow_once')
    now += 61_000
    await check('fs.write')
    expect(broker.prompts).toHaveLength(2) // expired

    broker.agentPromptResolved('reject_once')
    await check('fs.write')
    expect(broker.prompts).toHaveLength(3) // a rejection is no approval
  })

  it('our own approvals do not count as the agent\'s', async () => {
    await check('fs.write')
    const own = broker.prompts[0]!.toolCallId
    broker.agentPromptResolved('allow_once')
    // Simulate the resolution of our own request, which must not create an approval.
    ;(broker as unknown as { observer: (c: PermissionChange) => void }).observer({
      kind: 'resolved',
      request: { id: 2, sessionId: SESSION, toolCallId: own, options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }], outcome: 'selected', selectedOptionId: 'allow' }
    })
    await check('fs.write') // consumes the agent's approval
    await check('fs.write') // must ask: nothing left
    expect(broker.prompts).toHaveLength(2)
  })
})
