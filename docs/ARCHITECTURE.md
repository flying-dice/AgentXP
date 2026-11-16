# AgentXP architecture

AgentXP is an Electron desktop harness for coding agents that speak the
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
      db/          SQLite (better-sqlite3): connection, migrations, repositories
                   implementing domain ports.
      acp/         ACP client: agent process spawning, connection, client-side
                   handlers (fs, terminals, permissions), session update mapping.
      a2ui/        Stdio MCP server handed to agents + bridge into the app.
      fs/          Workspace file system access, sandboxed to registered folders.
    ipc/           ipcMain handlers that adapt AgentXpApi calls to application services,
                   and the event publisher that pushes AgentXpEvents to windows.
    index.ts       Composition root: builds everything and wires it together.
  preload/         contextBridge implementation of AgentXpApi.
  renderer/src/
    lib/kit/       WinForms UI kit, atomic design:
      atoms/       One standard WinForms control per component (Button, TextBox, ...).
      molecules/   Small compositions (LabeledField, ToolbarButton with icon, ...).
      organisms/   Large controls (MenuStrip, TreeView, DataGridView, CodeViewer, ...).
      templates/   Window layouts (Form, SplitContainer layouts, MainWindow template).
      tokens.css   Win7 design tokens. Components use these variables.
    lib/components/ui/  shadcn-svelte primitives (bits-ui) used for behaviour; kit
                   components wrap them with the Win7 skin.
    lib/a2ui/      A2UI surface store + renderer mapping catalog components to kit components.
    lib/stores/    Svelte 5 rune stores over window.agentxp (one store per concern).
    lib/pages/     Pages (the main window) composed from kit templates/organisms.
```

Dependency rule: arrows point inwards. `domain` imports nothing from other
layers; `application` imports `domain`; `infrastructure` implements domain
ports; `ipc` and `index.ts` wire it all. The renderer talks to main only via
`window.agentxp` (typed by `src/shared/ipc.ts`).

## Principles

- SRP: one reason to change per module. Small files, small functions.
- DRY: shared shapes live in `src/shared`; Win7 visuals live in `tokens.css`
  and kit atoms, never duplicated in pages.
- KISS: no frameworks beyond what is listed in package.json. No global singletons
  outside the composition root; pass dependencies via constructors.
- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect`, snippets).
- Every kit component has a Storybook story (`*.stories.svelte`, addon-svelte-csf).

## Persistence

SQLite via better-sqlite3, fully relational and normalised (3NF). Foreign keys
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
   to the renderer as `AgentXpEvents`: message chunks, tool calls, plan (tasks),
   modes, commands, usage.
4. Client-side ACP requests (`fs/read_text_file`, `fs/write_text_file`,
   `terminal/*`, `session/request_permission`) are served by the harness,
   sandboxed to the session folder. Writes are recorded as file changes for the
   Changes pane (with revert).
5. The A2UI MCP tool lets the agent draw WinForms surfaces inline in the
   transcript; user actions on a surface are delivered back to the agent as a
   prompt.
