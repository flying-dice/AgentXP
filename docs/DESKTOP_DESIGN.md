# Agent7 Desktop Design

Status: accepted, being built. Reference mockup: `docs/design/desktop/Desktop.dc.html` (serve the folder and open it) and `docs/design/desktop/desktop.png`.

## 1. Idea

The agent does not live in one window. It lives on a **desktop**, a small virtual Windows 7 machine, and works through **apps** that open as windows on that desktop. The user sees exactly what the agent can touch, because what the agent can touch *is* what is open.

- A **desktop** is one Electron `BrowserWindow`. It belongs to one folder (the workspace, shown as drive `W:`) and one default agent. You can have several desktops open at once, each in its own OS window.
- A **chat** is one ACP session. A desktop holds many chats. Each chat is shown by a **Chat app** window. Closing the window hides the chat; it stays in **Start -> Recent chats**.
- An **app** is a virtual program: Chat, Explorer, Notepad, Code, Terminal, Browser, Control Centre, Agent Manager. Apps are windows inside the desktop window (our own Aero Basic chrome, draggable, resizable, minimise to the taskbar).
- **Tools follow apps.** An agent tool exists only while the app that provides it is open on that desktop. Close Terminal and the agent loses its terminal. Open Browser and the agent gains `browser_*`.
- **System level** settings (agents, permission policy, connectors, about) live in **Control Centre**, a desktop app, not in a per-chat dialog.

## 2. Vocabulary in code

| Concept | Code name | Persistence |
|---|---|---|
| Desktop | `Desktop` | `desktops` table |
| Chat (ACP session) | `Session` (unchanged) | `sessions` (+ `desktop_id`) |
| App window | `AppWindow` | `app_windows` + one subtype table per app kind that has view state |
| App kind | `AppKind` | `app_kinds` lookup table |
| Tool group | `ToolGroup` | derived, not stored |

User text says "chat" (README style guide updated: chat = one conversation in a Chat window).

## 3. Apps and the tools they provide

| App | Kind | Singleton per desktop | Tools while open | Agent view state (sent in desktop state) |
|---|---|---|---|---|
| Chat | `chat` | no (one per chat) | *(prompt channel, always)* | session id, title, status |
| Explorer | `explorer` | no | ACP `fs/read_text_file`; MCP `fs_list`, `fs_find` | current path, selected entries |
| Notepad | `notepad` | no | ACP `fs/write_text_file`; MCP `notepad_open`, `notepad_read` | file path, dirty flag, caret line |
| Code | `code` | yes | ACP `fs/read_text_file`, `fs/write_text_file`; MCP `code_open`, `code_reveal`, `code_show_diff` | open tabs, active file, visible line range, selection, changes list selection |
| Terminal | `terminal` | no | ACP `terminal/*`; MCP `terminal_run`, `terminal_read` | cwd, running command, last 20 lines |
| Browser | `browser` | no | MCP `browser_navigate`, `browser_read`, `browser_screenshot`, `browser_click`, `browser_type`, `browser_back` | url, page title, loading |
| Control Centre | `control-centre` | yes | none (system UI) | open page |
| Task Manager | `agent-manager` | yes | none | none |
| Agent Paint | `paint` | no | MCP `paint_draw`, `paint_read`, `paint_clear`, `paint_resize` | file path, canvas size, tool, colour, dirty flag |
| WordPad | `wordpad` | no | MCP `wordpad_open`, `wordpad_read` (incl. unsaved text), `wordpad_write` (recorded as an agent file change) | file path, read/edit mode, dirty flag, visible heading |
| Sticky Notes | `sticky-notes` | yes | MCP `notes_list`, `notes_add` (`plan: true` for the chat's plan), `notes_update`, `notes_remove` | none (the notes themselves are in the desktop state) |
| Event Viewer | `event-viewer` | yes | MCP `events_query` (chat, source, level, text; at most 200 compact lines) | chat filter, level filter, selected event |
| Snipping Tool | `snipping-tool` | yes | MCP `screen_capture` (whole desktop or one window) | last snip id |
| Recycle Bin | `recycle-bin` | yes | MCP `recycle_list`, `recycle_restore` | selected item |

Default policy: Ask for `wordpad` and `recycle` (and `fs.write`, `terminal` as before), Allow for the rest.

Always present, whatever is open (the "shell" tool group): `desktop_state`, `desktop_open_app`, `desktop_close_app`, `desktop_focus_app`, and the A2UI tools `a2ui_catalog`, `a2ui_render`, `a2ui_delete_surface` (A2UI draws inside the calling chat).

`desktop_open_app` is governed by the Control Centre policy **Agent may open apps**: Always (default), Ask (permission dialog), Never.

### How gating works

Two channels reach the agent and both are gated by one `AppToolPolicy` (pure function: open app kinds -> enabled `ToolGroup`s).

1. **MCP tools** (the Agent7 MCP server, renamed from `agent7-a2ui` to `agent7`). The server asks the bridge for the tool list on every `tools/list`. When the set of open apps on the desktop changes, the bridge pushes `toolsChanged` to every connected server of that desktop, which sends MCP `notifications/tools/list_changed`. A call to a tool whose app closed mid-turn returns an MCP error result: "The Terminal app is closed. Call desktop_open_app with app \"terminal\" to open it."
2. **ACP client methods** (`fs/*`, `terminal/*`). ACP fixes `clientCapabilities` at `initialize`, so Agent7 keeps declaring them and refuses the request with a JSON-RPC error carrying the same message when the app is closed.

Honest limit, stated in the README: an agent's *own* built-in tools (for example a CLI agent shelling out without ACP terminals) bypass the client. Agent7 cannot stop those. Claude Code routes file reads/writes and Bash through ACP when the client offers them, so for it the gating holds.

## 4. Desktop state: what the agent sees

The user's point: "AG-UI sends the desktop state and current views, so the agent knows exactly what to change."

```ts
// src/shared/desktop.ts
interface DesktopState {
  desktopId: Id
  folder: { id: Id; path: string; name: string }
  focusedWindowId: Id | null
  windows: AppWindowState[]          // z-order, back to front
  tools: ToolGroup[]                 // enabled groups, derived
  paused: boolean
  userInControl: boolean
}
interface AppWindowState {
  id: Id; app: AppKind; title: string
  bounds: { x: number; y: number; width: number; height: number }
  windowState: 'normal' | 'minimized' | 'maximized'
  view: AppView                      // discriminated by app
}
```

Flow:

1. The renderer owns interaction (the user drags, opens, closes, scrolls, selects). It reports each change through IPC `desktop.*` commands. View changes that happen often (scroll, selection, caret) are debounced 300 ms.
2. Main (`DesktopService`) is the source of truth. It persists window rows, recomputes `DesktopState`, and:
   - pushes it to every chat of that desktop as AG-UI `STATE_DELTA` under `state.desktop` (shared state already used for tasks/changes),
   - tells the MCP bridge so `tools/list_changed` fires when `tools` changed.
3. On every run the AG-UI client sends the current desktop as `RunAgentInput.context[{ description: "agent7.desktop", value: <JSON> }]`. `AguiRunCoordinator` turns that context into an ACP `resource` content block (`uri: agent7://desktop/state`, `mimeType: application/json`) placed before the user's text, so the agent starts each turn knowing what is on screen.
4. Mid-turn the agent calls `desktop_state` for a fresh copy.

## 5. Windows, sessions and processes

- One `BrowserWindow` per open desktop, loading the renderer with `?desktop=<id>`. `File -> New Desktop` (Start menu) picks a folder and opens a new OS window. Last open desktops reopen at launch.
- AG-UI runs, `session.changed` and desktop events are sent only to the `webContents` of the owning desktop.
- One agent process per (desktop, agent) via the existing `AgentConnectionPool`; each chat is an ACP session on it. MCP servers are passed per ACP session with `AGENT7_DESKTOP_ID` and `AGENT7_SESSION_KEY`.

## 6. Shell (renderer)

Built from kit organisms, matching the mockup:

- **Desktop surface** - wallpaper, icons (Workspace W:, Chats, Control Centre, Recycle Bin = reverted changes, Code), double click opens.
- **Window manager** - z-order, focus, drag by title bar, resize by edges, minimise/maximise/restore, snap to top = maximise. Window chrome is the kit `Form` with `TitleBar`.
- **Top bar** (mockup's agent strip) - "Agent7 desktop · Working: <task>" plus **Pause** (cancels running turns, blocks new tool calls until resumed) and **Take control** (every tool call needs permission while on).
- **Taskbar** - Start orb (Agent7 mark), one button per window, tray with clock and Action Center flag.
- **Start menu** - apps, Recent chats, New chat, New desktop, Control Centre, search box.
- **Action Center** (tray popup) - pending permission requests from every chat on the desktop, newest first, each with **Review** -> UAC style dialog (dimmed desktop, shield, reason text such as "Writing files is set to Ask in Control Centre").
- **Gadgets** (right column, can be hidden) - context meter per active chat, activity feed (last tool calls), session clock.

## 7. Apps (renderer)

Each app is a Svelte component in `src/renderer/src/lib/apps/<kind>/` registered in `apps/registry.ts` with `{ kind, title, icon, singleton, defaultBounds, component }`. An app receives `{ window: AppWindowState, desktop: DesktopController }` and reports view changes with `desktop.updateView(windowId, view)`.

- **Chat** - the current session transcript, composer, tasks and per-chat changes, reused from `lib/app/session`. A2UI surfaces render inline as today.
- **Explorer** - address bar, folder tree, details `ListView` with a "Agent status" column (read / changed / created this chat).
- **Notepad** - plain `TextBox` multiline editor, File menu (Open, Save), status bar line/col.
- **Code** - file tree, tabs, `CodeViewer`, changes list with `DiffViewer`, Revert. "Agent is editing" marker when a tool call targets the open file.
- **Terminal** - `ConsoleView` showing the ACP terminals of the desktop plus an interactive user shell row.
- **Browser** - address bar, Back/Forward/Refresh, an Electron `<webview>` (partition `persist:agent7-browser`). Main finds its `webContents` through `did-attach-webview` and the window id, and drives it for `browser_*` (navigate, `executeJavaScript` text/accessibility snapshot, `capturePage` PNG returned as MCP image content, synthetic click/type by element ref from the last snapshot).
- **Control Centre** - pages: Agents (the old Options Agents tab), Permissions (per tool group Allow / Ask / Deny, Agent may open apps), Appearance (gadgets on/off), About.
- **Agent Manager** - running agent processes, chats per process, status, context use, **End process**.

## 8. Data model additions (migrations 002 and 003)

```sql
CREATE TABLE app_kinds (kind TEXT PRIMARY KEY);   -- seeded (002): chat, explorer, notepad, code, terminal, browser, control-centre, agent-manager; (003): paint, wordpad, sticky-notes, event-viewer, snipping-tool, recycle-bin
CREATE TABLE desktops (
  id INTEGER PRIMARY KEY,
  folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0,1)),
  paused INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0,1)),
  user_in_control INTEGER NOT NULL DEFAULT 0 CHECK (user_in_control IN (0,1)),
  created_at TEXT NOT NULL
);
ALTER TABLE sessions ADD COLUMN desktop_id INTEGER REFERENCES desktops(id) ON DELETE CASCADE;
CREATE TABLE app_windows (
  id INTEGER PRIMARY KEY,
  desktop_id INTEGER NOT NULL REFERENCES desktops(id) ON DELETE CASCADE,
  kind TEXT NOT NULL REFERENCES app_kinds(kind),
  x INTEGER NOT NULL, y INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  window_state TEXT NOT NULL CHECK (window_state IN ('normal','minimized','maximized')),
  z_order INTEGER NOT NULL,
  opened_by TEXT NOT NULL CHECK (opened_by IN ('user','agent'))
);
CREATE TABLE chat_windows     (window_id INTEGER PRIMARY KEY REFERENCES app_windows(id) ON DELETE CASCADE, session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE);
CREATE TABLE path_windows     (window_id INTEGER PRIMARY KEY REFERENCES app_windows(id) ON DELETE CASCADE, relative_path TEXT NOT NULL);  -- explorer, notepad
CREATE TABLE browser_windows  (window_id INTEGER PRIMARY KEY REFERENCES app_windows(id) ON DELETE CASCADE, url TEXT NOT NULL);
CREATE TABLE tool_group_policies (
  tool_group TEXT PRIMARY KEY,
  decision TEXT NOT NULL CHECK (decision IN ('allow','ask','deny'))
);
```

Focus and transient view state (scroll, selection, caret) are kept in memory only, not persisted. Existing sessions get a desktop per folder in the migration.

Migration 003 (text columns only, no blobs):

```sql
CREATE TABLE sticky_notes (
  id INTEGER PRIMARY KEY,
  desktop_id INTEGER NOT NULL REFERENCES desktops(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow','blue','green','pink','purple','white')),
  x INTEGER NOT NULL, y INTEGER NOT NULL, width INTEGER NOT NULL CHECK (width > 0), height INTEGER NOT NULL CHECK (height > 0),
  plan_session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,   -- the note mirrors that chat's tasks
  author TEXT NOT NULL CHECK (author IN ('user','agent')),
  created_at TEXT NOT NULL
);
CREATE TABLE recycled_changes (
  id INTEGER PRIMARY KEY,
  desktop_id INTEGER NOT NULL REFERENCES desktops(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  reverted_text TEXT,   -- the agent's version the revert threw away; NULL = the agent had deleted the file
  restored_text TEXT,   -- what the revert wrote back; NULL = the revert deleted an added file
  reverted_at TEXT NOT NULL
);
```

The Event Viewer's events are not persisted: an in-memory ring buffer of 5,000 events per desktop.

## 9. Build order

1. Contracts: `src/shared/desktop.ts`, IPC additions, tool group table. (orchestrator)
2. In parallel:
   - **Backend**: migration, repositories, `DesktopService`, `AppToolPolicy`, multi-window, bridge + MCP server tools and `list_changed`, ACP refusal, desktop state in AG-UI state and run context, browser driver.
   - **Shell**: desktop surface, window manager, taskbar, start menu, top bar, Action Center + UAC, gadgets, Storybook stories.
   - **Apps**: the eight apps against `fakeApi`, with stories.
3. Integrate, smoke test, README chapter rewrite and new screenshots, merge.
