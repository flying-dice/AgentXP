/** Realistic fake data for the session stories: the "Fix login redirect bug" session of the design. */
import type { Interrupt, Message } from '@ag-ui/core'
import type { A2uiServerMessage, A2uiSurfaceTarget } from '@shared/a2ui'
import { A2UI_ACTIVITY_TYPE, emptyAguiState, PERMISSION_INTERRUPT_REASON, type AguiSessionState, type PermissionInterruptMetadata } from '@shared/agui-state'
import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
import { testResults } from '../../a2ui/A2uiSurface.fixtures'
import { surfacesOf, type SurfaceActivity } from '../../agui/activities'

export const modes = [
  { id: 'default', name: 'Ask before edits', description: null },
  { id: 'acceptEdits', name: 'Auto-accept edits', description: null },
  { id: 'plan', name: 'Plan mode (read-only)', description: null }
]

export const agent: AgentDto = { id: 1, name: 'Claude Code', command: 'npx', args: [], env: {}, isDefault: true }

export const folder: FolderDto = { id: 1, name: 'claude-code-win', path: 'C:\\Users\\jonathan\\source\\claude-code-win', lastOpenedAt: null }

export const session: SessionDto = {
  id: 1,
  desktopId: 1,
  cwd: 'E:\\',
  agentId: 1,
  title: 'Fix login redirect bug',
  status: 'idle',
  acpSessionId: 'acp-1',
  currentModeId: 'default',
  currentModelId: null,
  modes,
  models: [],
  commands: [],
  contextUsed: 12000,
  contextSize: 200000,
  createdAt: '2026-11-16T01:40:00Z',
  updatedAt: '2026-11-16T01:47:00Z'
}

const call = (id: string, name: string, args: unknown) => ({
  id,
  type: 'function' as const,
  function: { name, arguments: JSON.stringify(args) }
})

const baseState = (): AguiSessionState => {
  const state = emptyAguiState()
  state.session = { ...state.session, title: session.title, modes, currentModeId: 'default', status: 'idle' }
  return state
}

const redirectOld = `export async function handleSignIn(req, res) {
  const user = await authenticate(req.body);
  res.redirect('/home');
  return user;
}
`
const redirectNew = `export async function handleSignIn(req, res) {
  const user = await authenticate(req.body);
  const returnUrl = sanitizeReturnUrl(req.query.returnUrl);
  // Only same-origin paths are allowed, to avoid open redirects.
  const target = returnUrl ?? '/home';
  res.redirect(target);
  return user;
}
`

const testOutput = `\u001b[1m$ npm test -- auth\u001b[0m

 \u001b[32m\u2713\u001b[0m tests/auth.test.ts (6 tests) 14ms
 \u001b[32m\u2713\u001b[0m tests/redirect.test.ts (4 tests) 9ms

 Test Files  \u001b[32m2 passed\u001b[0m (2)
      Tests  \u001b[32m10 passed\u001b[0m (10)
`

/** A finished turn: reasoning, Read, Grep, Edit (diff), Bash (console) and a closing markdown message. */
export const completedTurn = (): { messages: Message[]; state: AguiSessionState } => {
  const state = baseState()
  state.toolCalls = {
    t1: { title: 'Read src/auth/redirect.ts', kind: 'read', status: 'completed', rawInput: '{"file_path":"src/auth/redirect.ts"}', locations: [{ path: 'E:\\src\\auth\\redirect.ts', line: null }], contents: [{ kind: 'content', block: { kind: 'text', text: redirectOld } }] },
    t2: { title: 'grep redirect', kind: 'search', status: 'completed', rawInput: '{"pattern":"res.redirect","path":"src"}', locations: [], contents: [] },
    t3: { title: 'Edit src/auth/redirect.ts', kind: 'edit', status: 'completed', rawInput: '{"file_path":"src/auth/redirect.ts"}', locations: [{ path: 'E:\\src\\auth\\redirect.ts', line: 18 }], contents: [{ kind: 'diff', path: 'E:\\src\\auth\\redirect.ts', oldText: redirectOld, newText: redirectNew }] },
    t4: { title: 'npm test -- auth', kind: 'execute', status: 'completed', rawInput: '{"command":"npm test -- auth"}', locations: [], contents: [{ kind: 'terminal', terminalId: 'term1' }] },
    t5: { title: 'Edit src/auth/session.ts', kind: 'edit', status: 'failed', rawInput: '{"file_path":"src/auth/session.ts"}', locations: [], contents: [] }
  }
  state.terminals = { term1: { command: 'npm test -- auth', output: testOutput, exitCode: 0 } }
  const messages: Message[] = [
    { id: 'u1', role: 'user', content: 'Fix the login redirect so deep links survive sign-in' },
    { id: 'r1', role: 'reasoning', content: 'The handler always redirects to /home. I should read the returnUrl query parameter, validate it is a same-origin path, and fall back to /home.' },
    { id: 'a1', role: 'assistant', content: "I'll start by reading the sign-in handler.", toolCalls: [call('t1', 'Read', { file_path: 'src/auth/redirect.ts' }), call('t2', 'Grep', { pattern: 'res.redirect', path: 'src' })] },
    { id: 'm1', role: 'tool', toolCallId: 't1', content: redirectOld },
    { id: 'm2', role: 'tool', toolCallId: 't2', content: 'src/auth/redirect.ts:20:  res.redirect(\'/home\');' },
    { id: 'a2', role: 'assistant', content: 'The handler always sends users to `/home`. I will honour a validated `returnUrl` instead.', toolCalls: [call('t3', 'Edit', { file_path: 'src/auth/redirect.ts' }), call('t5', 'Edit', { file_path: 'src/auth/session.ts' }), call('t4', 'Bash', { command: 'npm test -- auth' })] },
    { id: 'm3', role: 'tool', toolCallId: 't3', content: 'Edited src/auth/redirect.ts' },
    { id: 'm4', role: 'tool', toolCallId: 't4', content: 'ok' },
    { id: 'a3', role: 'assistant', content: "Done. Deep links now survive sign-in:\n\n- `sanitizeReturnUrl` accepts **same-origin paths only**, which blocks open redirects\n- falls back to `/home` when the parameter is missing or rejected\n- all 10 auth tests pass\n\n```ts\nconst target = returnUrl ?? '/home'\n```" }
  ]
  return { messages, state }
}

export const permissionOptions: PermissionInterruptMetadata['options'] = [
  { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
  { optionId: 'allow_always', name: 'Always allow', kind: 'allow_always' },
  { optionId: 'reject', name: 'Reject', kind: 'reject_once' }
]

export const permissionInterrupt = (toolCallId: string, title: string, toolKind: PermissionInterruptMetadata['toolKind']): Interrupt => ({
  id: '7',
  reason: PERMISSION_INTERRUPT_REASON,
  toolCallId,
  metadata: { requestId: 7, title, toolKind, options: permissionOptions } satisfies PermissionInterruptMetadata
})

/** A turn suspended on an edit permission request. */
export const permissionTurn = (): { messages: Message[]; state: AguiSessionState; interrupt: Interrupt } => {
  const state = baseState()
  state.session.status = 'awaiting_permission'
  state.toolCalls = {
    t1: { title: 'Read src/auth/redirect.ts', kind: 'read', status: 'completed', rawInput: '{"file_path":"src/auth/redirect.ts"}', locations: [], contents: [] },
    t2: { title: 'Edit src/auth/redirect.ts', kind: 'edit', status: 'pending', rawInput: '{"file_path":"src/auth/redirect.ts"}', locations: [{ path: 'E:\\src\\auth\\redirect.ts', line: 18 }], contents: [{ kind: 'diff', path: 'E:\\src\\auth\\redirect.ts', oldText: redirectOld, newText: redirectNew }] }
  }
  const messages: Message[] = [
    { id: 'u1', role: 'user', content: 'Fix the login redirect so deep links survive sign-in' },
    { id: 'a1', role: 'assistant', content: 'I will replace the hard-coded redirect with a validated returnUrl.', toolCalls: [call('t1', 'Read', { file_path: 'src/auth/redirect.ts' }), call('t2', 'Edit', { file_path: 'src/auth/redirect.ts' })] },
    { id: 'm1', role: 'tool', toolCallId: 't1', content: redirectOld }
  ]
  return { messages, state, interrupt: permissionInterrupt('t2', 'Edit src/auth/redirect.ts', 'edit') }
}

/** A running turn: a Bash command streaming output. */
export const runningTurn = (): { messages: Message[]; state: AguiSessionState } => {
  const state = baseState()
  state.session.status = 'working'
  state.toolCalls = {
    t1: { title: 'npm run build', kind: 'execute', status: 'in_progress', rawInput: '{"command":"npm run build"}', locations: [], contents: [{ kind: 'terminal', terminalId: 'term1' }] }
  }
  state.terminals = { term1: { command: 'npm run build', output: '> claude-code-win@1.2.0 build\n> tsc -p . && vite build\n\n\u001b[36mvite v5.4.0\u001b[0m building for production...\ntransforming (212) src/auth/redirect.ts', exitCode: null } }
  return {
    state,
    messages: [
      { id: 'u1', role: 'user', content: 'Run the build and tell me if it passes' },
      { id: 'a1', role: 'assistant', content: 'Running the build now.', toolCalls: [call('t1', 'Bash', { command: 'npm run build' })] }
    ]
  }
}

/** A turn that drew an A2UI surface (test results) with the replayable messages. */
export const surfaceTurn = (
  target: A2uiSurfaceTarget = 'inline',
  hidden = false,
  surface: A2uiServerMessage[] = testResults
): { messages: Message[]; state: AguiSessionState; activities: Map<string, SurfaceActivity> } => {
  const state = baseState()
  const messages: Message[] = [
    { id: 'u1', role: 'user', content: 'Show me the test results as a table' },
    { id: 'a1', role: 'assistant', content: target === 'inline' ? 'Here are the results of the last run:' : `The results are in ${target === 'window' ? 'their own window' : 'the sidebar'}.` },
    { id: 'a2ui:tests', role: 'activity', activityType: A2UI_ACTIVITY_TYPE, content: { surfaceId: 'tests', target, hidden, messages: surface } }
  ]
  return { messages, state, activities: surfacesOf(messages) }
}

export const emptyTurn = (): { messages: Message[]; state: AguiSessionState } => ({ messages: [], state: baseState() })
