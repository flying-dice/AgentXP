/** An in-memory `Agent7Api` for Storybook: the "Fix login redirect bug" session of the design. */
import { EventType, type BaseEvent, type RunAgentInput } from '@ag-ui/core'
import { createFakeDesktop } from './fakeDesktop'
import { createFakeExtras } from './fakeExtras'
import type { AguiSessionState } from '@shared/agui-state'
import type { Agent7Api, Agent7Events } from '@shared/ipc'
import type { AgentDto, FileChangeDto, FileNodeDto, FolderDto, SessionDto, TaskDto } from '@shared/models'
import { sampleNew, sampleOld } from '../kit/organisms/stories.samples'
import { completedTurn, modes } from './session/session.fixtures'

export const sampleAgents: AgentDto[] = [
  { id: 1, name: 'Claude Code', command: 'npx', args: ['-y', '@zed-industries/claude-code-acp'], env: {}, isDefault: true },
  { id: 2, name: 'Gemini CLI', command: 'gemini', args: ['--experimental-acp'], env: { GEMINI_API_KEY: 'example' }, isDefault: false }
]

export const sampleMarkdown = `# claude-code-win

A Windows-friendly build of the **login service**. It keeps the \`?next=\` parameter when it redirects.

## Getting started

1. Install the dependencies with \`npm install\`
2. Run the tests with \`npm test\`
3. Start the dev server

## Notes

- Redirects only go to paths on the same site
- Sessions expire after _30 minutes_

\`\`\`ts
export function parseRedirect(url: string): string {
  const next = new URL(url).searchParams.get('next')
  return next && next.startsWith('/') ? next : '/'
}
\`\`\`

## License

MIT
`

export const sampleFolders: FolderDto[] = [
  { id: 1, name: 'claude-code-win', path: 'C:\\Users\\jonathan\\source\\claude-code-win', lastOpenedAt: null },
  { id: 2, name: 'dotfiles', path: 'C:\\Users\\jonathan\\dotfiles', lastOpenedAt: null }
]

const session = (id: number, folderId: number, title: string, over: Partial<SessionDto> = {}): SessionDto => ({
  id,
  folderId,
  agentId: 1,
  title,
  status: 'idle',
  acpSessionId: `acp-session-${id}`,
  currentModeId: 'default',
  currentModelId: 'sonnet',
  modes,
  models: [
    { id: 'sonnet', name: 'Claude Sonnet 5.5', description: null },
    { id: 'opus', name: 'Claude Opus 5.5', description: null }
  ],
  commands: [{ name: 'compact', description: 'Compact the conversation', hint: null }],
  contextUsed: 12000,
  contextSize: 200000,
  createdAt: `2026-11-16T01:4${id}:00Z`,
  updatedAt: `2026-11-16T01:4${id}:00Z`,
  ...over
})

export const sampleSessions: SessionDto[] = [
  session(1, 1, 'Fix login redirect bug'),
  session(2, 1, 'Add parser unit tests'),
  session(3, 1, 'Refactor config loader'),
  session(4, 2, 'Tidy shell aliases')
]

export const sampleChanges: FileChangeDto[] = [
  { id: 1, sessionId: 1, path: 'src/auth/redirect.ts', kind: 'modified', additions: 5, deletions: 2, originalText: sampleOld, currentText: sampleNew },
  { id: 2, sessionId: 1, path: 'src/auth/urls.ts', kind: 'added', additions: 14, deletions: 0, originalText: null, currentText: "export const sanitizeReturnUrl = (v: string): string | null => (v.startsWith('/') ? v : null)\n" }
]

export const sampleTasks: TaskDto[] = [
  { id: 1, sessionId: 1, position: 0, content: 'Read the sign-in handler', priority: 'medium', status: 'completed' },
  { id: 2, sessionId: 1, position: 1, content: 'Validate the returnUrl parameter', priority: 'high', status: 'in_progress' },
  { id: 3, sessionId: 1, position: 2, content: 'Run the auth tests', priority: 'medium', status: 'pending' }
]

const tree: Record<string, FileNodeDto[]> = {
  '': [
    { name: 'src', path: 'src', isDirectory: true },
    { name: 'tests', path: 'tests', isDirectory: true },
    { name: 'package.json', path: 'package.json', isDirectory: false },
    { name: 'README.md', path: 'README.md', isDirectory: false }
  ],
  src: [
    { name: 'auth', path: 'src/auth', isDirectory: true },
    { name: 'index.ts', path: 'src/index.ts', isDirectory: false }
  ],
  'src/auth': [
    { name: 'redirect.ts', path: 'src/auth/redirect.ts', isDirectory: false },
    { name: 'session.ts', path: 'src/auth/session.ts', isDirectory: false }
  ],
  tests: [{ name: 'auth.test.ts', path: 'tests/auth.test.ts', isDirectory: false }]
}

export const sampleState = (): AguiSessionState => {
  const { state } = completedTurn()
  return { ...state, session: { ...state.session, title: 'Fix login redirect bug' }, changes: sampleChanges, tasks: sampleTasks }
}

const noop = (): void => {}

/** Fake AG-UI transport: every run (connect included) answers with the sample transcript and `stateOf()` (default: the sample state). */
export function fakeAgui(stateOf: () => AguiSessionState = sampleState): Agent7Api['agui'] {
  const listeners = new Map<string, (event: BaseEvent) => void>()
  return {
    run: async (input: RunAgentInput) => {
      const emit = listeners.get(input.runId)
      const { messages } = completedTurn()
      const events: BaseEvent[] = [
        { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId } as BaseEvent,
        { type: EventType.STATE_SNAPSHOT, snapshot: stateOf() } as BaseEvent,
        { type: EventType.MESSAGES_SNAPSHOT, messages } as BaseEvent,
        { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId } as BaseEvent
      ]
      for (const event of events) emit?.(event)
    },
    abort: async () => {},
    onEvent: (runId, listener) => {
      listeners.set(runId, listener)
      return () => void listeners.delete(runId)
    }
  }
}

/** Builds the fake backend; `agents` starts with the sample agents, `folders` and `sessions` can start empty. */
export type FakeApi = Agent7Api & { pushEvent: ReturnType<typeof createFakeExtras>['pushEvent'] }

export function createFakeApi(options: { empty?: boolean } = {}): FakeApi {
  let agents = [...sampleAgents]
  let folders = options.empty ? [] : [...sampleFolders]
  let sessions = options.empty ? [] : [...sampleSessions]
  const listeners: { [K in keyof Agent7Events]?: ((payload: Agent7Events[K]) => void)[] } = {}
  const emit = <K extends keyof Agent7Events>(event: K, payload: Agent7Events[K]): void => (listeners[event] ?? []).forEach((l) => l(payload))
  let nextId = 100
  const extras = createFakeExtras(emit as unknown as Parameters<typeof createFakeExtras>[0])

  const api: Agent7Api = {
    agents: {
      list: async () => agents,
      create: async (input) => {
        const agent: AgentDto = { id: nextId++, isDefault: false, ...input }
        agents = [...agents, agent]
        return agent
      },
      update: async (id, input) => {
        agents = agents.map((a) => (a.id === id ? { ...a, ...input } : a))
        return agents.find((a) => a.id === id)!
      },
      remove: async (id) => void (agents = agents.filter((a) => a.id !== id)),
      setDefault: async (id) => void (agents = agents.map((a) => ({ ...a, isDefault: a.id === id })))
    },
    folders: {
      list: async () => folders,
      pick: async () => {
        const folder: FolderDto = { id: nextId++, name: 'new-project', path: 'C:\\Users\\jonathan\\source\\new-project', lastOpenedAt: null }
        folders = [...folders, folder]
        emit('folders.changed', folders)
        return folder
      },
      add: async (path) => {
        const folder: FolderDto = { id: nextId++, name: path.split(/[\\/]/).pop() ?? path, path, lastOpenedAt: null }
        folders = [...folders, folder]
        return folder
      },
      remove: async (id) => void (folders = folders.filter((f) => f.id !== id)),
      readDir: async (_id, path) => tree[path] ?? [],
      readFile: async (_id, path) => (path.endsWith('.md') ? sampleMarkdown : sampleNew),
      gitBranch: async () => 'main',
      writeFile: async () => {}
    },
    sessions: {
      list: async () => sessions,
      get: async (id) => sessions.find((s) => s.id === id)!,
      create: async (folderId, agentId) => {
        const created = session(nextId++, folderId, 'New session', { agentId: agentId ?? 1 })
        sessions = [...sessions, created]
        return created
      },
      rename: async (id, title) => void (sessions = sessions.map((s) => (s.id === id ? { ...s, title } : s))),
      remove: async (id) => void (sessions = sessions.filter((s) => s.id !== id)),
      transcript: async () => [],
      tasks: async () => sampleTasks,
      changes: async () => sampleChanges,
      terminals: async () => [],
      surfaces: async () => [],
      prompt: async () => {},
      cancel: async () => {},
      setMode: async (id, modeId) => {
        sessions = sessions.map((s) => (s.id === id ? { ...s, currentModeId: modeId } : s))
        emit('session.changed', sessions.find((s) => s.id === id)!)
      },
      setModel: async (id, modelId) => {
        sessions = sessions.map((s) => (s.id === id ? { ...s, currentModelId: modelId } : s))
        emit('session.changed', sessions.find((s) => s.id === id)!)
      },
      respondPermission: async () => {},
      revertChange: async () => {},
      clearTranscript: async () => {},
      exportTranscript: async () => 'C:\\Users\\jonathan\\Documents\\transcript.md'
    },
    desktop: createFakeDesktop({ windows: options.empty ? [] : ['chat'], onChange: (state) => emit('desktop.changed', state) }),
    notes: extras.notes,
    events: extras.events,
    recycle: extras.recycle,
    snip: extras.snip,
    processes: {
      list: async () => [{ agentId: 1, agentName: 'Claude Code', desktopId: 1, pid: 4312, sessionIds: sessions.map((s) => s.id) }],
      end: async () => {}
    },
    a2ui: { dispatch: async () => {} },
    dialogs: { pickFiles: async () => [] },
    shell: { openPath: async () => {} },
    app: { version: async () => '0.1.0' },
    window: {
      minimize: async () => {},
      toggleMaximize: async () => {},
      close: async () => {},
      getState: async () => ({ maximized: false, focused: true }),
      onStateChanged: () => noop
    },
    agui: fakeAgui(),
    on: (event, listener) => {
      const list = (listeners[event] ??= []) as ((payload: never) => void)[]
      list.push(listener as (payload: never) => void)
      return () => void list.splice(list.indexOf(listener as (payload: never) => void), 1)
    }
  }
  return Object.assign(api, { pushEvent: extras.pushEvent })
}
