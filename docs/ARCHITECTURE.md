# Agent7 architecture

Agent7 is an Electron desktop harness for coding agents that speak the
[Agent Client Protocol](https://agentclientprotocol.com) (ACP). It looks and
behaves like a Windows 7 WinForms application (see `docs/design/`).

## Layers (clean architecture)

```
src/
  shared/          Pure TypeScript contracts: DTOs (models.ts), IPC (ipc.ts), A2UI (a2ui.ts).
                   No Node, no Electron, no DOM.
  main/            Electron main process.
    domain/        Entities, value objects and ports (interfaces). Depends on nothing.
    application/   Use cases / services. Depend on domain ports only.
    infrastructure/
      db/          SQLite (built-in `node:sqlite`): connection, migrations, repositories
                   implementing domain ports.
      acp/         ACP client: agent process spawning, connection, client-side
                   handlers (fs, terminals, permissions), session update mapping.
      a2ui/        Stdio MCP server handed to agents + bridge into the app.
      fs/          Workspace file system access, sandboxed to registered folders.
    application/agui/  The AG-UI backend: run coordinator, event translator, shared state, interrupts.
    ipc/           ipcMain handlers that adapt Agent7Api calls to application services,
                   the AG-UI stream transport, and the event publisher that pushes the
                   renderer-facing Agent7Events (session list, status bar) to windows.
    index.ts       Composition root: builds everything and wires it together.
  preload/         contextBridge implementation of Agent7Api.
  renderer/src/
    lib/kit/       WinForms UI kit, atomic design:
      atoms/       One standard WinForms control per component (Button, TextBox, ...).
      molecules/   Small compositions (LabeledField, ToolbarButton with icon, ...).
      organisms/   Large controls (MenuStrip, TreeView, DataGridView, CodeViewer, ...).
      templates/   Window layouts (Form, SplitContainer layouts, MainWindow template).
      tokens.css   Win7 design tokens. Components use these variables.
      actions/     Shared behaviour (click-outside, popup positioning, roving focus).
    lib/a2ui/      A2UI surface store + renderer mapping catalog components to kit components.
    lib/stores/    Svelte 5 rune stores over window.agent7 (one store per concern).
    lib/agui/      AG-UI client: IpcAgent (AbstractAgent over IPC) and SessionAgentStore.
    lib/pages/     Pages (the main window) composed from kit templates/organisms.
```

Dependency rule: arrows point inwards. `domain` imports nothing from other
layers; `application` imports `domain`; `infrastructure` implements domain
ports; `ipc` and `index.ts` wire it all. The renderer talks to main only via
`window.agent7` (typed by `src/shared/ipc.ts`).

## Principles

- SRP: one reason to change per module. Small files, small functions.
- DRY: shared shapes live in `src/shared`; Win7 visuals live in `tokens.css`
  and kit atoms, never duplicated in pages.
- KISS: no frameworks beyond what is listed in package.json. No global singletons
  outside the composition root; pass dependencies via constructors.
- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect`, snippets).
- Every kit component has a Storybook story (`*.stories.svelte`, addon-svelte-csf).

## Persistence

SQLite via `node:sqlite`, fully relational and normalised (3NF). Foreign keys
on, `ON DELETE CASCADE` where ownership is clear. JSON text is only used where
the payload is schemaless by nature (raw tool input/output from agents, A2UI
component properties and data models). Images from agents are stored as BLOB.

## Agent flow

1. The user adds a folder (workspace) and creates a session in it.
2. `SessionService` spawns the configured agent command (default
   `npx -y @zed-industries/claude-code-acp`) via `AgentProcess`, initialises ACP,
   and calls `session/new` with the folder as `cwd` and the A2UI MCP server in
   `mcpServers`.
3. `session/update` notifications are mapped to repository writes and pushed
   to the renderer as `Agent7Events`: message chunks, tool calls, plan (tasks),
   modes, commands, usage.
4. Client-side ACP requests (`fs/read_text_file`, `fs/write_text_file`,
   `terminal/*`, `session/request_permission`) are served by the harness,
   sandboxed to the session folder. Writes are recorded as file changes for the
   Changes pane (with revert).
5. The A2UI MCP tool lets the agent draw WinForms surfaces inline in the
   transcript; user actions on a surface are delivered back to the agent as a
   prompt.

## AG-UI (renderer <-> main)

The renderer is an [AG-UI](https://docs.ag-ui.com) client (`@ag-ui/client`), the main process is the
agent backend that runs the ACP agents. Events travel over IPC, not HTTP: `agui.run` (invoke with a
`RunAgentInput`) makes main stream AG-UI events on `agui.event` as `{ runId, event }`; `agui.abort`
cancels the session's turn. One thread per session (`threadId` = session id).

- `AguiRunCoordinator` (main/application/agui) turns agent events into AG-UI events: text and thought
  chunks become text / reasoning messages, tool calls become tool call events, everything richer
  (kind, status, locations, diffs, terminals, tasks, changes, session info) is the shared state
  (`src/shared/agui-state.ts`, STATE_SNAPSHOT at run start, STATE_DELTA as JSON Patch), A2UI surfaces
  are `a2ui-surface` activity messages.
- A run is a prompt (input ends with a new user message), a resume (answers permission interrupts),
  an A2UI action (`forwardedProps.a2uiAction`) or a connect (none of these: MESSAGES_SNAPSHOT +
  STATE_SNAPSHOT of the persisted session). A permission request ends the run with a
  RUN_FINISHED `interrupt` outcome; the ACP turn stays suspended until a run with a matching
  `resume` entry continues it.
- Transcript, tasks, changes, terminals and surfaces are therefore no longer pushed as separate
  events: services still publish them internally (`InternalEvents`), the coordinator consumes them.
