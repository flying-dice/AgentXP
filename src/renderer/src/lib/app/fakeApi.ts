/** An in-memory `Agent7Api` for Storybook: the "Fix login redirect bug" session of the design. */
import { EventType, type BaseEvent, type Message, type RunAgentInput } from '@ag-ui/core'
import { createFakeDesktop } from './fakeDesktop'
import { createFakeLauncher, sampleDesktops } from './fakeLauncher'
import { createFakeVfs } from './fakeVfs'
import { createFakeGit, sampleHead } from './fakeGit'
import { createFakeExtras } from './fakeExtras'
import { createFakeReview } from './fakeReview'
import type { AguiSessionState } from '@shared/agui-state'
import type { Agent7Api, Agent7Events } from '@shared/ipc'
import type { AgentDto, FileChangeDto, FileNodeDto, FolderDto, SessionDto, TaskDto } from '@shared/models'
import type { DesktopSummaryDto, DriveDto, VPath } from '@shared/vfs'
import { AGENT_HOME, parseVPath } from '@shared/vfs'
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

const session = (id: number, desktopId: number, title: string, over: Partial<SessionDto> = {}): SessionDto => ({
  id,
  desktopId,
  cwd: 'E:\\',
  role: 'chat',
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
  { id: 1, sessionId: 1, path: 'E:\\src\\auth\\redirect.ts', kind: 'modified', additions: 5, deletions: 2, originalText: sampleOld, currentText: sampleNew },
  { id: 2, sessionId: 1, path: 'E:\\src\\auth\\urls.ts', kind: 'added', additions: 14, deletions: 0, originalText: null, currentText: "export const sanitizeReturnUrl = (v: string): string | null => (v.startsWith('/') ? v : null)\n" }
]

export const sampleTasks: TaskDto[] = [
  { id: 1, sessionId: 1, position: 0, content: 'Read the sign-in handler', priority: 'medium', status: 'completed' },
  { id: 2, sessionId: 1, position: 1, content: 'Validate the returnUrl parameter', priority: 'high', status: 'in_progress' },
  { id: 3, sessionId: 1, position: 2, content: 'Run the auth tests', priority: 'medium', status: 'pending' }
]

/** The files of a plugged-in project, relative to the drive root. */
export function sampleProjectFiles(folder: Pick<FolderDto, 'name'>): Record<string, string> {
  if (folder.name === 'claude-code-win') {
    return {
      'README.md': sampleMarkdown,
      'package.json': '{\n  "name": "claude-code-win",\n  "version": "1.4.2",\n  "scripts": { "test": "vitest run" }\n}\n',
      'src/index.ts': sampleNew,
      'src/auth/redirect.ts': sampleOld,
      'src/auth/session.ts': 'export const SESSION_MINUTES = 30\n',
      'docs/guide.md': '# Guide\n\nSee the [README](../README.md) first.\n',
      'tests/auth.test.ts': "import { describe, it, expect } from 'vitest'\nimport { parseRedirect } from '../src/auth/redirect'\n\ndescribe('parseRedirect', () => {\n  it('keeps ?next=', () => expect(parseRedirect('https://a.b/?next=/x')).toBe('/x'))\n})\n"
    }
  }
  if (folder.name === 'dotfiles') return { '.bashrc': "alias ll='ls -la'\n", 'aliases.sh': "alias gs='git status'\n", 'README.md': '# dotfiles\n\nShell aliases and settings.\n' }
  return { 'README.md': `# ${folder.name}\n` }
}

/** HEAD of the sample repository: the project files as they are, except those that differ (`sampleHead`). */
const cleanHead = (): Record<VPath, string> => {
  const files = Object.fromEntries(Object.entries(sampleProjectFiles(sampleFolders[0])).map(([rel, text]) => [`E:\\${rel.replaceAll('/', '\\')}`, text]))
  for (const path of ['E:\\src\\auth\\session.ts', 'E:\\docs\\guide.md']) delete files[path]
  return { ...files, ...sampleHead() }
}

export const sampleState = (): AguiSessionState => {
  const { state } = completedTurn()
  return { ...state, session: { ...state.session, title: 'Fix login redirect bug' }, changes: sampleChanges, tasks: sampleTasks }
}

const noop = (): void => {}

/** Fake AG-UI transport: every run (connect included) answers with the sample transcript and `stateOf()` (default: the sample state). */
export function fakeAgui(stateOf: () => AguiSessionState = sampleState, messagesOf: () => Message[] = () => completedTurn().messages): Agent7Api['agui'] {
  const listeners = new Map<string, (event: BaseEvent) => void>()
  return {
    run: async (input: RunAgentInput) => {
      const emit = listeners.get(input.runId)
      const messages = messagesOf()
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
export type FakeApi = Agent7Api & {
  pushEvent: ReturnType<typeof createFakeExtras>['pushEvent']
  /** The current drives (C: and the plugged-in USB drives). */
  driveList(): DriveDto[]
  /** Follow plug in / eject (a story host keeps its own desktop in step). */
  watchDrives(listener: (drives: DriveDto[]) => void): () => void
}

export function createFakeApi(options: { empty?: boolean; desktops?: DesktopSummaryDto[] } = {}): FakeApi {
  let agents = [...sampleAgents]
  let folders = options.empty ? [] : [...sampleFolders]
  let sessions = options.empty ? [] : [...sampleSessions]
  const listeners: { [K in keyof Agent7Events]?: ((payload: Agent7Events[K]) => void)[] } = {}
  const emit = <K extends keyof Agent7Events>(event: K, payload: Agent7Events[K]): void => (listeners[event] ?? []).forEach((l) => l(payload))
  let nextId = 100
  const extras = createFakeExtras(emit as unknown as Parameters<typeof createFakeExtras>[0])
  let desktopApi: ReturnType<typeof createFakeDesktop> | null = null
  const driveWatchers = new Set<(drives: DriveDto[]) => void>()
  const fakeVfs = createFakeVfs({
    resolveFolder: (folderId) => {
      if (folderId !== undefined) return folders.find((f) => f.id === folderId) ?? null
      const plugged = new Set(fakeVfs.list().map((d) => d.folderId))
      const free = folders.find((f) => !plugged.has(f.id))
      if (free) return free
      const created: FolderDto = { id: nextId++, name: 'new-project', path: 'C:\\Users\\jonathan\\source\\new-project', lastOpenedAt: null }
      folders = [...folders, created]
      return created
    },
    filesOf: sampleProjectFiles,
    onDrives: (drives) => {
      desktopApi?.setDrives(drives)
      driveWatchers.forEach((w) => w(drives))
    }
  })
  if (!options.empty) fakeVfs.mount(sampleFolders[0], 'E')
  const launcher = createFakeLauncher({ folders: () => folders, emit: emit as never, desktops: options.desktops ?? (options.empty ? [] : sampleDesktops()) })
  /** The path of a folder-relative `FileNodeDto` listing, now served by the VFS: the drive a folder is plugged in as. */
  const driveRoot = (folderId: number): VPath => `${fakeVfs.list().find((d) => d.folderId === folderId)?.letter ?? 'E'}:\\`

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
      readDir: async (id, path) => {
        const entries = await fakeVfs.vfs.readDir(1, `${driveRoot(id)}${path.replaceAll('/', '\\')}`)
        return entries.map((e): FileNodeDto => ({ name: e.name, path: (parseVPath(e.path)?.segments ?? []).join('/'), isDirectory: e.kind === 'directory' }))
      },
      readFile: async (id, path) => fakeVfs.vfs.readFile(1, `${driveRoot(id)}${path.replaceAll('/', '\\')}`),
      gitBranch: async () => 'main',
      writeFile: async (id, path, text) => fakeVfs.vfs.writeFile(1, `${driveRoot(id)}${path.replaceAll('/', '\\')}`, text)
    },
    vfs: fakeVfs.vfs,
    git: createFakeGit({ vfs: fakeVfs.vfs, head: cleanHead(), changed: (root) => emit('git.changed', { desktopId: 1, root }) }),
    review: createFakeReview({ vfs: fakeVfs.vfs, head: sampleHead(), emit: emit as never }),
    drives: fakeVfs.drives,
    launcher,
    sessions: {
      list: async (desktopId) => (desktopId === undefined ? sessions : sessions.filter((s) => s.desktopId === desktopId)),
      get: async (id) => sessions.find((s) => s.id === id) ?? session(id, 1, 'Fake session'),
      create: async (desktopId, agentId, cwd) => {
        const created = session(nextId++, desktopId, 'New session', { agentId: agentId ?? 1, cwd: cwd ?? AGENT_HOME })
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
    desktop: (desktopApi = createFakeDesktop({
      windows: options.empty ? [] : ['chat'],
      drives: fakeVfs.list(),
      onChange: (state) => emit('desktop.changed', state),
      createReviewSession: (cwd) => {
        const created = session(nextId++, 1, 'Review of the changes', { cwd, role: 'review' })
        sessions = [...sessions, created]
        return created.id
      }
    })),
    notes: extras.notes,
    events: extras.events,
    recycle: extras.recycle,
    snip: extras.snip,
    processes: {
      list: async () => [{ agentId: 1, agentName: 'Claude Code', desktopId: 1, pid: 4312, sessionIds: sessions.map((s) => s.id) }],
      end: async () => {}
    },
    a2ui: { dispatch: async () => {}, deleteSurface: async () => {}, moveSurface: async () => {}, setSidebarHidden: async () => {} },
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
  return Object.assign(api, {
    pushEvent: extras.pushEvent,
    driveList: () => fakeVfs.list(),
    watchDrives: (listener: (drives: DriveDto[]) => void) => {
      driveWatchers.add(listener)
      return () => void driveWatchers.delete(listener)
    }
  })
}
