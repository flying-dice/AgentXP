# AgentXP architecture

AgentXP is an Electron desktop harness for coding agents that speak the
[Agent Client Protocol](https://agentclientprotocol.com) (ACP). It looks and
behaves like a Windows XP WinForms application (see `docs/design/`).

## Layers (clean architecture)

```
src/
  shared/          Pure TypeScript contracts and pure logic used by main and renderer.
                   No Node, no Electron, no DOM.
                   models.ts (DTOs), ipc.ts + ipc-channels.ts (AgentXPApi, push events),
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
      fs/          Host file access (`NodeHostFiles`), sandboxed per drive root; thumbnail store.
    ipc/           ipcMain handlers that adapt AgentXPApi calls to application services, the AG-UI
                   stream transport (streamAguiRun), window caption handlers, Electron dialogs and
                   the event publisher that pushes the renderer-facing events to windows.
    compose.ts     Composition root: builds the services from ports and adapters.
    index.ts       Electron entry: frameless BrowserWindow, opens the database, wires IPC.
  preload/         contextBridge implementation of AgentXPApi.
  renderer/src/
    App.svelte     Mounts the main window page and the message box host.
    lib/kit/       WinForms UI kit (Windows XP look), pure Svelte, atomic design:
      atoms/       One standard WinForms control per component (Button, TextBox, ...).
      molecules/   Small compositions of atoms (LabeledField, TitleBar, MenuItem, ...).
      organisms/   Large controls (MenuStrip, TreeView, DataGridView, CodeViewer, Taskbar, ...).
      templates/   Window layouts (Desktop, MainWindowTemplate).
      actions/     Shared behaviour (click-outside, popup positioning, roving focus, focus trap).
      tokens.css   WinXP design tokens (`--xp-*`). Components use these variables.
      The kit knows nothing about the app. Atoms import no molecules or organisms; molecules
      import no organisms.
    lib/app/       AgentXP-specific components and logic built from the kit: shell (trees, panes,
                   dialogs), session (transcript, composer, tool calls, permissions), options,
                   changes, files, menus, shortcuts and AppController (UI orchestration).
    lib/stores/    Svelte 5 rune stores over `window.agentxp` (one store per concern).
    lib/agui/      AG-UI client: IpcAgent (AbstractAgent over IPC) and SessionAgentStore.
    lib/a2ui/      A2UI surface renderer: SurfaceController drives @a2ui/web_core's processor and
                   the registry maps catalog components to Svelte components (a2ui/components).
    lib/pages/     Pages (the main window) composed from kit templates and app components.
```

Dependency rule: arrows point inwards. `domain` imports nothing from other layers;
`application` imports `domain` and `shared`; `infrastructure` implements domain and application
ports; `ipc`, `compose.ts` and `index.ts` wire it all. The renderer talks to main only via
`window.agentxp` (typed by `src/shared/ipc.ts`) and never imports main code. The kit never
imports `lib/app`, stores or pages.

## Principles

- SRP: one reason to change per module. Small files, small functions.
- DRY: shared shapes live in `src/shared`; WinXP visuals live in `tokens.css`
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

1. The user creates a desktop in the launcher, plugs a folder (project) in as a drive (E:) and starts a chat with a working directory (a VPath).
2. `SessionService` spawns the configured agent command (default
   `npx -y @zed-industries/claude-code-acp`) via `AgentProcess`, initialises ACP,
   and calls `session/new` with the real path of the chat's cwd and the A2UI MCP server in
   `mcpServers`.
3. `session/update` notifications are mapped to domain events, projected into repository writes (transcript,
   tool calls, plan, modes, commands, usage) and translated into the AG-UI stream (see below).
4. Client-side ACP requests (`fs/read_text_file`, `fs/write_text_file`,
   `terminal/*`, `session/request_permission`) are served by the harness,
   allowed inside C: and the plugged-in drives only. Writes are recorded as file changes for the
   Changes pane (with revert).
5. The A2UI MCP tool lets the agent draw WinForms surfaces inline in the
   transcript, in a sidebar of the Chat window or in its own desktop window
   (`target`, see DESKTOP_DESIGN section 10); user actions on a surface are delivered back to the agent as a
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
  The only events sent straight to the renderer are the `AgentXPEvents` (session list, folders, status bar).

## A2UI

The agent draws surfaces with the A2UI MCP tool. `shared/a2ui` holds the WinForms catalog
(`winforms-catalog.json`, loaded through `@a2ui/web_core`), validates messages and processes them;
surfaces are stored relationally and travel to the renderer as `a2ui-surface` activity messages.
In the renderer, `SurfaceController` feeds the messages to web_core's `MessageProcessor` and
`registry.ts` maps each catalog component to a Svelte component built from the kit. User actions go
back to the agent through an AG-UI run (`forwardedProps.a2uiAction`). Where a surface is shown
(`inline`, `sidebar`, `window`) is stored on the surface; windows are `surface` apps (`surface_windows`),
sidebar tabs live in the Chat app.

## Desktop

Design: `docs/DESKTOP_DESIGN.md`. Contract: `src/shared/desktop.ts` (types, tool group table, `enabledToolGroups`,
`DesktopApi`), `src/shared/desktop-views.ts` (default bounds, initial views, window titles).

- **State.** `DesktopService` (application/desktop) is the source of truth. Windows are persisted
  (`app_windows` + `chat_windows` / `path_windows` / `browser_windows`, migration 002); focus and the transient view live in
  memory. Every change recomputes `DesktopState` and publishes `desktop.changed` unless it equals the last one published.
  Three things listen: (a) `ElectronEventPublisher` sends it to the owning desktop's window only (chat events go the same way
  via `SessionDto.desktopId`), (b) `AguiRunCoordinator` turns it into STATE_DELTA on `/desktop` for the chats of that desktop
  (`buildSessionState` fills `desktop`), (c) the bridge pushes `toolsChanged` when `tools` changed.
- **Virtual file system and launcher.** Desktops are long-lived virtual PCs (docs/DESKTOP_DESIGN.md, section 8b). `VirtualFileSystem`
  and `DriveService` (application/vfs) map VPaths (`C:\...`, `E:\...`) to real paths through the desktop's live drives (C: is
  `<userData>/desktops/<id>/C`; E: to Z: are plugged-in `folders`), `SessionFiles` gates the ACP file/terminal requests the same way,
  and `HostFiles` (`NodeHostFiles`, sandbox guard, symlink-safe) is the only code that touches the disk. `LauncherService`
  (application/launcher) lists/creates/connects/disconnects/renames/removes desktops; `ThumbnailService` keeps a PNG per desktop
  (served as `agentxp-thumb://`). Disconnecting only closes the OS window.
- **Windows.** One `BrowserWindow` per connected desktop plus the launcher window (`?launcher=1`) (`ipc/DesktopWindowManager`, URL `?desktop=<id>`, `webviewTag` on). The
  manager is the `DesktopWindowHost` port: `open` focuses or creates a window, reusing the blank first-run window. Closing an
  OS window only disconnects (`is_open = 0`, not when the app quits); nothing running stops. `desktop.current` and `desktop.attachBrowser` need the calling window
  and are registered per sender (`ipc/registerDesktopHandlers`); every other call goes through `createApi`.
- **Tools follow apps.** `application/tools/catalog.ts` lists the MCP tools (name, group, zod schema); the MCP child
  (`agentxp`, `infrastructure/a2ui/mcp-tools.ts`, built as `out/main/a2ui-mcp.js`) asks the bridge for the enabled groups on
  every `tools/list`, forwards other calls to the app and sends `notifications/tools/list_changed` when the bridge pushes
  `toolsChanged` (the child holds a subscription socket per desktop). Handlers are one module per group
  (`shellTools`, `fsTools`, `notepadTools`, `codeTools`, `terminalTools`, `browserTools`, `paintTools`, `wordpadTools`,
  `notesTools`, `eventsTools`, `snipTools`, `recycleTools`); `DesktopToolService` validates the
  arguments, applies the gate and runs them. Tools that change what a window shows go through `DesktopService.updateView`.
- **Gate.** `AppToolPolicy.evaluateToolAccess` (pure) decides: paused, app closed, policy deny, then ask (policy ask or
  "take control"). `ToolGateway` applies it to both channels: MCP tools (closed app = MCP error result with
  `closedAppMessage`) and the ACP client methods (`AcpAgentConnection` calls the `ToolGate` port for `fs/*` and `terminal/*`
  and answers refusals with a JSON-RPC error). "Ask" shows an AgentXP permission request through `PermissionBroker`; an allow
  the agent's own prompt just obtained covers the next gated call of that session (60 s, once), so users are not asked twice.
- **Prompt context.** The AG-UI client sends the desktop as `RunAgentInput.context` (`agentxp.desktop`);
  `SessionService.promptTurn` puts it (or, if absent, the current state) before the user's text as an ACP `resource` block
  (`agentxp://desktop/state`). The block is stored but left out of the AG-UI messages and the Markdown export.
- **Browser.** The Browser app renders a `<webview partition="persist:agentxp-browser">` and reports its
  `getWebContentsId()` with `desktop.attachBrowser(windowId, id)`; main checks the guest belongs to the caller and hands it to
  `ElectronBrowserDriver` (Chrome DevTools Protocol: accessibility-tree read with stable refs, trusted click/type/keys/wheel, tabs through app requests; pure helpers `ax.ts`, `keys.ts`, `refs.ts`, `paging.ts`).
- **App requests.** Some tools need what only the renderer has (the Paint canvas, WordPad's unsaved text). `AppRequestBroker`
  (application/desktop) pushes `desktop.appRequest` `{ requestId, desktopId, windowId, method, params }` to the owning window and
  resolves when the app answers with `desktop.respondAppRequest`; it rejects after 10 s with a readable message. Methods:
  Paint `draw` / `read` (PNG data URL) / `resize`, WordPad `read` (markdown) / `open` (best effort).
- **Sticky Notes.** `sticky_notes` rows (migration 003) behind `StickyNoteService`: CRUD, `notes.changed` to the owning window,
  and the notes are part of `DesktopState.notes` so the agent sees them in `desktop_state`. A note with `planSessionId` mirrors
  that chat's tasks (the renderer renders them); `notes_add` with `plan: true` makes one for the calling chat (at most one per chat).
- **Recycle Bin.** `ChangeReverter` records a `recycled_changes` row (path, the text the revert threw away, the text it wrote back)
  for the desktop of the chat, then removes the change. `RecycleService.restore` writes `revertedText` back (or deletes the file
  when the agent had deleted it), records that as a new file change of the chat when the chat still exists, and removes the row.
  `recycle.changed` goes to the owning window.
- **Task Scheduler.** Pure rules are in `src/shared/schedule.ts` (next run time of a trigger: one time, daily, weekly, monthly,
  at startup; wall-clock strings plus an injectable `Zone`) and `src/shared/scheduler.ts` (task validation and summaries).
  `application/scheduler/TaskEngine` is timer based with an injected clock and timers. It arms one timer for the nearest run,
  applies the conditions (no other task running, agent idle), the missed-run rule (a start up to two minutes late counts as on
  time; an older one runs only with "run missed", otherwise it is a "Missed" history row), the overlap policy (ignore, queue at
  most 10, stop the existing run), the time limit, and restart on failure. `AgentActionRunner` sends the prompt through the chat
  services. `SchedulerService` is the use case that the IPC handlers call (`scheduler.*`); `scheduler.changed` goes to the
  windows of the desktop. Four tables (`scheduled_tasks`, `scheduled_task_triggers`, `scheduled_task_actions`,
  `scheduled_task_runs`, migration 015) hold the tasks and the last 100 runs of each. `ActionScope` (`resolveScope`, `checkCapabilities`) works out the skills and tools of a run from the registry: `AgentActionRunner` stores the result for the new chat (`session_scopes` and its child tables, migration 016) before the agent connects, and `AgentCapabilities` reads it when it builds `mcpServers` and the briefing. A skill, server, profile or team that is gone fails the run with a sentence. `ProtocolSchedulerLog` writes the
  `scheduler` source of the Event Viewer. Limitation: tasks run only while the app is open; there is no OS-level wake-up.
- **Event Viewer.** `ProtocolEventLog` (application/events) keeps a ring buffer of 5,000 events per desktop in memory (payload =
  pretty JSON cut at 64 KB) and pushes `events.appended` in 250 ms batches. Three taps feed it: (a) ACP JSON-RPC in both
  directions, `infrastructure/acp/tapStream` wraps the SDK stream and calls the `ProtocolTap` port that `SessionRuntime` binds
  per chat (`ConnectionHandlers.tap`); responses are named after their request, (b) AG-UI events, `streamAguiRun` reports each
  sent event through `onEvent`, (c) MCP tool calls, `DesktopToolService` reports the call and its result (`ToolCallLog`). Level:
  `error` for JSON-RPC errors, `RUN_ERROR` and failed tool calls; `warning` for refusals (error code -32010, refused tools),
  `stopReason` refusal / cancelled and `session/cancel`; else `info`.
- **Screen capture.** `snip.capture` / `screen_capture` use the `ScreenCapturer` port; `ElectronScreenCapturer` calls
  `webContents.capturePage(rect)` on the desktop's window and returns a PNG data URL.
- **Saving by the user.** `vfs.writeFile` (Notepad, WordPad saves) writes to a VPath through the same sandbox as
  `vfs.readFile` and is not recorded as an agent change; the agent's `wordpad_write` goes through `SessionFiles` and is.

## Window

Desktop windows keep the native title bar (`frame: true`), so maximize and full screen follow the OS rules; the launcher is frameless (`frame: false`). Inside the page the kit's `TitleBar` and `CaptionButtons` draw the
Windows XP caption; `ipc/registerWindowHandlers.ts` implements minimise, maximise and close and
publishes the window state. Storybook renders the same components against `lib/app/fakeApi.ts`.


## Teams, skills and MCP

See [TEAMS.md](TEAMS.md): `application/teams` (skills, MCP servers, profiles, teams, room service), `infrastructure/mcp` (SDK prober and filtering proxy), migration 014.
