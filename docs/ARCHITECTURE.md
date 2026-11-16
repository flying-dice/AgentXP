# Agent7 architecture

Agent7 is an Electron desktop harness for coding agents that speak the
[Agent Client Protocol](https://agentclientprotocol.com) (ACP). It looks and
behaves like a Windows 7 WinForms application (see `docs/design/`).

## Layers (clean architecture)

```
src/
  shared/          Pure TypeScript contracts and pure logic used by main and renderer.
                   No Node, no Electron, no DOM.
                   models.ts (DTOs), ipc.ts + ipc-channels.ts (Agent7Api, push events),
                   agui-state.ts (the AG-UI shared state), a2ui.ts + a2ui/ (A2UI catalog,
                   validation and message processor built on @a2ui/web_core), diff.ts (line diff,
                   line-change counting, unified diff parsing).
  main/            Electron main process.
    domain/        Entities, value objects and ports (interfaces). Depends on nothing.
    application/   Use cases / services. Depend on domain ports and shared only: never on
                   electron, node:sqlite, the ACP SDK or infrastructure.
      agui/        The AG-UI backend: run coordinator, event translator, shared state, interrupts.
    infrastructure/
      db/          SQLite (built-in `node:sqlite`): connection, migrations, repositories
                   implementing domain ports.
      acp/         ACP client built on @agentclientprotocol/sdk: agent process, connection,
                   client-side handlers (fs, terminals, permissions), session update mapping.
      a2ui/        Stdio MCP server (@modelcontextprotocol/sdk) handed to agents + bridge into the app.
      fs/          Workspace file system access, sandboxed to registered folders.
    ipc/           ipcMain handlers that adapt Agent7Api calls to application services, the AG-UI
                   stream transport (streamAguiRun), window caption handlers, Electron dialogs and
                   the event publisher that pushes the renderer-facing events to windows.
    compose.ts     Composition root: builds the services from ports and adapters.
    index.ts       Electron entry: frameless BrowserWindow, opens the database, wires IPC.
  preload/         contextBridge implementation of Agent7Api.
  renderer/src/
    App.svelte     Mounts the main window page and the message box host.
    lib/kit/       WinForms UI kit (Windows 7 look), pure Svelte, atomic design:
      atoms/       One standard WinForms control per component (Button, TextBox, ...).
      molecules/   Small compositions of atoms (LabeledField, TitleBar, MenuItem, ...).
      organisms/   Large controls (MenuStrip, TreeView, DataGridView, CodeViewer, Taskbar, ...).
      templates/   Window layouts (Desktop, MainWindowTemplate).
      actions/     Shared behaviour (click-outside, popup positioning, roving focus, focus trap).
      tokens.css   Win7 design tokens (`--w7-*`). Components use these variables.
      The kit knows nothing about the app. Atoms import no molecules or organisms; molecules
      import no organisms.
    lib/app/       Agent7-specific components and logic built from the kit: shell (trees, panes,
                   dialogs), session (transcript, composer, tool calls, permissions), options,
                   changes, files, menus, shortcuts and AppController (UI orchestration).
    lib/stores/    Svelte 5 rune stores over `window.agent7` (one store per concern).
    lib/agui/      AG-UI client: IpcAgent (AbstractAgent over IPC) and SessionAgentStore.
    lib/a2ui/      A2UI surface renderer: SurfaceController drives @a2ui/web_core's processor and
                   the registry maps catalog components to Svelte components (a2ui/components).
    lib/pages/     Pages (the main window) composed from kit templates and app components.
```

Dependency rule: arrows point inwards. `domain` imports nothing from other layers;
`application` imports `domain` and `shared`; `infrastructure` implements domain and application
ports; `ipc`, `compose.ts` and `index.ts` wire it all. The renderer talks to main only via
`window.agent7` (typed by `src/shared/ipc.ts`) and never imports main code. The kit never
imports `lib/app`, stores or pages.

## Principles

- SRP: one reason to change per module. Small files, small functions.
- DRY: shared shapes live in `src/shared`; Win7 visuals live in `tokens.css`
  and kit atoms, never duplicated in pages.
- KISS: official SDKs for protocols (@agentclientprotocol/sdk, @ag-ui/core + @ag-ui/client, @a2ui/web_core,
  @modelcontextprotocol/sdk) instead of hand-rolled protocol code; no UI libraries, no frameworks beyond what is listed in package.json. No global singletons
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
3. `session/update` notifications are mapped to domain events, projected into repository writes (transcript,
   tool calls, plan, modes, commands, usage) and translated into the AG-UI stream (see below).
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
- Transcript, tasks, changes, terminals and surfaces are not pushed as separate events: services
  publish them internally (`InternalEvents` in `application/ports.ts`), the coordinator consumes them.
  The only events sent straight to the renderer are the `Agent7Events` (session list, folders, status bar).

## A2UI

The agent draws surfaces with the A2UI MCP tool. `shared/a2ui` holds the WinForms catalog
(`winforms-catalog.json`, loaded through `@a2ui/web_core`), validates messages and processes them;
surfaces are stored relationally and travel to the renderer as `a2ui-surface` activity messages.
In the renderer, `SurfaceController` feeds the messages to web_core's `MessageProcessor` and
`registry.ts` maps each catalog component to a Svelte component built from the kit. User actions go
back to the agent through an AG-UI run (`forwardedProps.a2uiAction`).

## Window

The main window is frameless (`frame: false`). The kit's `TitleBar` and `CaptionButtons` draw the
Windows 7 caption; `ipc/registerWindowHandlers.ts` implements minimise, maximise and close and
publishes the window state. Storybook renders the same components against `lib/app/fakeApi.ts`.
