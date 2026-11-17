# Agent7 Desktop Design

Status: accepted, being built. Reference mockup: `docs/design/desktop/Desktop.dc.html` (serve the folder and open it) and `docs/design/desktop/desktop.png`.

## 1. Idea

The agent does not live in one window. It lives on a **desktop**, a small virtual Windows 7 machine, and works through **apps** that open as windows on that desktop. The user sees exactly what the agent can touch, because what the agent can touch *is* what is open.

- A **desktop** is one Electron `BrowserWindow`. It belongs to one folder (the workspace, shown as drive `W:`) and one default agent. You can have several desktops open at once, each in its own OS window.
- A **chat** is one ACP session. A desktop holds many chats. Each chat is shown by a **Chat app** window. Closing the window hides the chat; it stays in **Start -> Recent chats**.
- An **app** is a virtual program: Chat, Explorer, Notepad, Code, Terminal, Browser, Control Center, Agent Manager. Apps are windows inside the desktop window (our own Aero Basic chrome, draggable, resizable, minimise to the taskbar).
- **Tools follow apps.** An agent tool exists only while the app that provides it is open on that desktop. Close Terminal and the agent loses its terminal. Open Browser and the agent gains `browser_*`.
- **System level** settings (agents, permission policy, connectors, about) live in **Control Center**, a desktop app, not in a per-chat dialog.

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
| Browser | `browser` | no | MCP `browser_navigate`, `browser_read`, `browser_find`, `browser_screenshot`, `browser_click`, `browser_type`, `browser_press`, `browser_scroll`, `browser_wait`, `browser_select`, `browser_tabs`, `browser_back`, `browser_forward`, `browser_reload` | url, page title, loading |
| Control Center | `control-centre` | yes | none (system UI) | open page |
| Task Manager | `agent-manager` | yes | none | none |
| Agent Paint | `paint` | no | MCP `paint_draw`, `paint_read`, `paint_clear`, `paint_resize` | file path, canvas size, tool, colour, dirty flag |
| WordPad | `wordpad` | no | MCP `wordpad_open`, `wordpad_read` (incl. unsaved text), `wordpad_write` (recorded as an agent file change) | file path, read/edit mode, dirty flag, visible heading |
| Sticky Notes | `sticky-notes` | yes | MCP `notes_list`, `notes_add` (`plan: true` for the chat's plan), `notes_update`, `notes_remove` | none (the notes themselves are in the desktop state) |
| Kanban | `kanban` | yes | MCP `board_*` (`board_list`, `board_get`, `board_create`, `board_rename`, `board_delete`, `board_add_column`, `board_rename_column`, `board_delete_column`, `board_add_card`, `board_update_card`, `board_move_card`, `board_delete_card`). The `board` tool group is **always on** (`ALWAYS_ON_TOOL_GROUPS`): agents work on boards without the window, gated by the Control Center policy only. | open board |
| Event Viewer | `event-viewer` | yes | MCP `events_query` (chat, source, level, text; at most 200 compact lines) | chat filter, level filter, selected event |
| Snipping Tool | `snipping-tool` | yes | MCP `screen_capture` (whole desktop or one window) | last snip id |
| Recycle Bin | `recycle-bin` | yes | MCP `recycle_list`, `recycle_restore` | selected item |
| Code Review | `code-review` | no (one per review) | MCP `review_list_changes`, `review_read_diff`, `review_add_comment`, `review_submit` (the review session of the window, and the chats of the desktop through `review_open`), and `fs.read` | root, base ref, selected file, review session id |
| Agent window | `surface` | no (one per A2UI surface) | none (the agent opens it by drawing: `a2ui_render` with `target: 'window'`; not agent-openable with `desktop_open_app`) | `surfaceId`, `sessionId`, title |

Default policy: Ask for `wordpad` and `recycle` (and `fs.write`, `terminal` as before), Allow for the rest.

Always present, whatever is open (the "shell" tool group): `desktop_state`, `desktop_open_app`, `desktop_close_app`, `desktop_focus_app`, and the A2UI tools `a2ui_catalog`, `a2ui_render`, `a2ui_delete_surface` (A2UI draws where `target` says, see section 10).

`desktop_open_app` is governed by the Control Center policy **Agent may open apps**: Always (default), Ask (permission dialog), Never.

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

- **Desktop surface** - wallpaper, icons (Workspace W:, Chats, Control Center, Recycle Bin = reverted changes, Code), double click opens.
- **Window manager** - z-order, focus, drag by title bar, resize by edges, minimise/maximise/restore, snap to top = maximise. Window chrome is the kit `Form` with `TitleBar`.
- **Top bar** (mockup's agent strip) - "Agent7 desktop · Working: <task>" plus **Pause** (cancels running turns, blocks new tool calls until resumed) and **Take control** (every tool call needs permission while on).
- **Taskbar** - Start orb (Agent7 mark), one button per window, tray with clock and Action Center flag.
- **Start menu** - apps, Recent chats, New chat, New desktop, Control Center, search box.
- **Action Center** (tray popup) - pending permission requests from every chat on the desktop, newest first, each with **Review** -> UAC style dialog (dimmed desktop, shield, reason text such as "Writing files is set to Ask in Control Center").
- **Gadgets** (right column, can be hidden) - context meter per active chat, activity feed (last tool calls), session clock.

## 7. Apps (renderer)

Each app is a Svelte component in `src/renderer/src/lib/apps/<kind>/` registered in `apps/registry.ts` with `{ kind, title, icon, singleton, defaultBounds, component }`. An app receives `{ window: AppWindowState, desktop: DesktopController }` and reports view changes with `desktop.updateView(windowId, view)`.

- **Chat** - the current session transcript, composer, tasks and per-chat changes, reused from `lib/app/session`. A2UI surfaces render inline (rows with Move to / Delete), in the chat's sidebar, or as rows for sidebar and window surfaces (section 10).
- **Explorer** - address bar, folder tree, details `ListView` with a "Agent status" column (read / changed / created this chat).
- **Notepad** - plain `TextBox` multiline editor, File menu (Open, Save), status bar line/col.
- **Code** - file tree, tabs, `CodeViewer`, changes list with `DiffViewer`, Revert. "Agent is editing" marker when a tool call targets the open file.
  Laid out like Code::Blocks (menu bar, icon toolbar, docked Management / Logs & others panes, status bar). Git awareness (`src/shared/git.ts`, `GitService` in main): `git.status` / `lineChanges` / `headText` / `revertHunk` run the `git` CLI (`execFile`, no shell, `LC_ALL=C`, `GIT_OPTIONAL_LOCKS=0`) in the real path of a VPath, so every drive works and a non-repository or missing git answers null / []. `git.changed { desktopId, root }` is pushed (debounced) after agent changes, user saves and a 5 s poll that only runs while a Code window is open. The tree shows status letters and folder dots, the kit `CodeViewer` a gutter, overview ruler and inline peek (`gutterMarks`); `revertHunk` rewrites the working file through the user write path (no agent change recorded).
- **Terminal** - `ConsoleView` showing the ACP terminals of the desktop plus an interactive user shell row.
- **Browser** - address bar, Back/Forward/Refresh/Stop, an IE9-style tab strip (new tab, close tab; one `<webview>` per tab, all in partition `persist:agent7-browser`, the app's `tabs` request lets the agent list/open/switch/close tabs) and an "Agent is using this page" bar with a highlight ring and a Take control button (the `activity` request). Each tab's `webContents` is reported with `desktop.attachBrowser`; the one attached last is the active tab. Main drives it through the Chrome DevTools Protocol (`webContents.debugger`, attached once per guest, detached on destroy):
  - **Read**: `Accessibility.getFullAXTree` of every frame (`Page.getFrameTree`, `frameId`; iframe owners resolved with `DOM.describeNode`; shadow roots are part of the AX tree), `DOMSnapshot.captureSnapshot` for off-screen marks. `browser_read` returns outline or text lines, paged (150 lines / 12k characters per page, `nextOffset`).
  - **Refs**: one number per DOM node (frame id + `backendNodeId`), stable across reads, reset when the page navigates; stale ones give a readable error.
  - **Input**: `DOM.scrollIntoViewIfNeeded` + `DOM.getBoxModel`, then trusted `Input.dispatchMouseEvent` at the box centre; `Input.dispatchKeyEvent` for `browser_press` (chords such as `Control+K`); `browser_type` focuses the node, selects all and calls `Input.insertText`, so contenteditable and React inputs work; the wheel (`mouseWheel`) scrolls pages and containers. Only `<select>` choice and the password-focus check use a page script.
  - **Safety**: password values are never returned and typing into a password field is refused; only http(s) navigation; the webview lockdown is unchanged; actions check `paused` and `userInControl` between steps (the tool gate already refuses or asks first).
  - `capturePage` PNG is still returned as MCP image content.
- **Control Center** - pages: Agents (the old Options Agents tab), Permissions (per tool group Allow / Ask / Deny, Agent may open apps), Appearance (gadgets on/off), About.
- **Agent Manager** - running agent processes, chats per process, status, context use, **End process**.

### Code Review and the embedded chat

`code-review` is a WinDiff-style diff tool with its own ACP session. `desktop.openReview(desktopId, root, baseRef?)` creates a session with `role: 'review'` and then the window; `chat_windows` links the window to the session and `path_windows` holds the root and `base_ref` (migration 007). Closing the window deletes the review session and its comments, so a review never outlives its window. Chat lists (launcher, Start menu, chat counts) only count `role: 'chat'` sessions; Task Manager still lists all pooled sessions.

- **Data** - `review_comments` (path, line range, side old/new, severity blocker/major/minor/nit, state open/resolved/sent, author agent/user, `parent_id` for replies) and `review_summaries` (one verdict per session). `ReviewService` (main) reads changes with the read-only `GitCli` (`diff --name-status`, `ls-files --others`, `show <ref>:./path`), stores comments and publishes `review.changed`.
- **Tools** - the `review` tool group is enabled desktop-wide while a Code Review window is open, so every handler resolves its window with `ReviewService.requireWindow`. The review session acts on its own window. Any other session of the desktop (a chat, or the `aside` chat pane of the Code window) acts on the Code Review window of its project (`sameProject` with the session `cwd`; the focused one, else the last opened), so "review this" asked in the IDE chat puts real comments into the window: they are stored under that window's review session (`ReviewTarget.reviewSessionId`). `review_open` (group `shell`, so it is always listed; it follows the "Agent may open apps" policy) opens or reuses the window. With no window the error tells the agent to call `review_open`. `review_submit` from a chat returns the verdict and the comment list (`formatReviewHandback`), so the answer lands in the chat the user asked in. Sessions of another desktop are refused. The review session stays read only (UX-37).
- **View** - the left margin bar shows removed lines red and added lines yellow (`src/shared/windiff.ts`, pure), F7 / Shift+F7 step through the change regions across files, outline and expanded views, unified or side by side. A gutter click adds a user comment; threads show Resolve, Reply, Delete and Send to chat. The window sends the first prompt (`reviewKickoffPrompt`) when its transcript is empty.
- **Send to chat** - `formatReviewPrompt` builds the prompt (verdict, `path:line [severity] body`, replies indented); the dialog picks an existing chat or a new one, the comments become `sent`.
- **EmbeddedChat** (`apps/shared/EmbeddedChat.svelte`) - the reusable right-aside chat panel: props `host`, `sessionId`, `contextProvider`, `role` (`chat` | `review` | `aside`), `collapsible`, `collapsed` / `width` (bindable), `resizable`, `compact`, `contained`, and for the chat pane `onstart`, `onnew`, `suggestions`, `prefill`; it shares the desktop's `SessionAgentStore`, and the provider's `appContext` is added to the `agent7.desktop` context entry. ChatApp, Code Review and the chat pane of section 12 use it. See `manuals/embedded-chat.md`.
- **Menu bar** - Code Review uses the standard helpers (`AppHelp`, `helpMenu`, `closeItems`, `menuBar`) like every app: its test ids are `code-review-menu-close`, `code-review-menu-help` and `code-review-menu-about`. Its reviewer panel stays.

## 7b. Help and context menus

Every app has in-app Help and a context menu.

**Help.** Each app window shows the classic menu bar with `File`, `Edit`, `View`, its own menus and `Help` last. Only menus that have real items appear. `Help` has `View Help` (F1), a separator and `About <App>`. View Help opens the single Help and Support window on the topic of the app and titles it `Agent7 Help and Support: Using <App>`; the Start menu entry keeps the title `Help and Support`. F1 on the desktop opens the topic of the focused window, also while the focus is in a text box. `AppHelp` and `AppAbout` (lib/apps/shared) and `standardMenu.ts` (kit) build the shared parts.

**Context menus.** Right-click, the Menu key and Shift+F10 open a kit `ContextMenuStrip` in every app, on rows and items first and on the window background otherwise. The renderer cancels the browser's own `contextmenu` event on the desktop and the launcher. The taskbar button has its own menu: Restore, Minimize, Close window.

**Ask chat.** Items such as Explain this, Ask chat... and Send selection to chat call `DesktopHost.askChat(AskChatRequest)` (`AskChatRequest` is in `src/shared/desktop.ts`). `DesktopController.askChat` opens the chat pane of the requesting window (section 12), expanded, and sends the prompt of `askChatPrompt` there (the file path and line range, the selection in a fenced block, or the page address and title). `ask` only fills the composer with `askChatDraft`, so the user types the question. The item Open in Chat window (kind `window`, `<app>-ctx-open-chat`) and a window without a pane keep the old behavior: a chat on the drive of the request (or home) in a new Chat window.

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

Migration 004 (section 8b) replaces `desktops.folder_id` with `desktop_drives` and `sessions.folder_id` with `sessions.cwd`; `path_windows` holds VPaths.

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

## 8b. Virtual file system and launcher (migration 004)

A desktop is a long-lived virtual Windows 7 PC, not a view of one folder. Contract: `src/shared/vfs.ts`.

**Paths.** The agent and the UI use *VPaths*: `C:\Users\Agent`, `E:\src\a.ts` (backslashes, upper-case drive letter, the drive
root keeps its trailing `\`). `parseVPath` / `normaliseVPath` / `joinVPath` / `vpathParent` / `vpathName` are pure; relative paths
and `..` above a drive root are invalid. The Explorer path `''` is "Computer" (the drive list).

**Drives.**
- `C:` is the desktop's own disk: a real directory `<userData>/desktops/<id>/C`, seeded with `Users\Agent\{Desktop,Documents,Downloads}` and `Temp`.
  It is deleted with the desktop. The agent's home (`AGENT_HOME`) and the default chat cwd are on it.
- `E:` to `Z:` are projects plugged in like USB sticks (`desktop_drives`, one `folders` row each). Plugging in picks the first free letter;
  plugging the same project again returns its drive. Eject ("Safely Remove") deletes the row: the very next tool call on that drive fails with
  `noDriveMessage` (`DriveUnavailableError`, a refusal, JSON-RPC -32010, a warning in the Event Viewer). `C:` cannot be ejected.

**`VirtualFileSystem`** (application/vfs) turns a VPath into a real path through the *live* drive list of the desktop, so eject takes effect at once.
Every read and write goes through the `HostFiles` port (`NodeHostFiles`), which confines each call to one root with the symlink-safe sandbox guard.
`DriveService` lists, plugs in and ejects drives and notifies observers (the desktop pushes a new `DesktopState`).
`SessionFiles` serves the ACP `fs/*` and `terminal/*` requests: a real absolute path is allowed iff it is inside `C:` or a plugged-in drive,
otherwise a JSON-RPC error (`OutsideDrivesError`, or the drive-named message when the chat's own drive was ejected).
MCP tools take and return VPaths (`ToolPaths.resolve` also accepts a real path inside a drive and paths relative to the chat's cwd); `drives_list`
is part of the always-on shell group, and the server instructions explain drives.

**Chats** have a `cwd` VPath (default `C:\Users\Agent`). The ACP `session/new` cwd is its real path.

**Changes.** `file_changes` / `recycled_changes` store `(folder_id, path)`: `folder_id NULL` is `C:`, the path is relative to that root with `/`.
The drive letter is looked up when a row is read, so a project plugged in again under another letter keeps its changes (while unplugged they show `?:\...`).

**Launcher** ("Remote Desktop Connection"). A fixed 520x600 frameless window (`?launcher=1`) opens at app start. A desktop is *connected* while an OS window
(`?desktop=<id>`) shows it; `desktops.is_open` means connected and is reset at start. Closing a desktop window (or `launcher.disconnect`) only disconnects:
agents, turns and permission requests keep running in main. A pending approval on a disconnected desktop raises an OS notification
"Agent7: <desktop> needs your approval" (click connects) and a `launcher.changed` push. `runState` = awaiting_approval > working > error > idle, derived from session
statuses and the `PermissionBroker`. `launcher.remove` stops the agents, deletes the rows (cascade) and the desktop's app-data folder; plugged-in project folders are only ejected.

**Thumbnails.** `capturePage` resized to 320 px wide, written to `<userData>/desktops/<id>/thumbnail.png` on disconnect and every 60 s while connected
(`ThumbnailService`, `FileThumbnailStore`). The launcher loads `agent7-thumb://desktop/<id>.png?v=<mtime>`, served by a custom protocol handler;
the renderer's CSP must allow `agent7-thumb:` in `img-src`.

```sql
CREATE TABLE desktop_drives (
  desktop_id INTEGER NOT NULL REFERENCES desktops(id) ON DELETE CASCADE,
  letter TEXT NOT NULL CHECK (letter GLOB '[E-Z]'),
  folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  plugged_at TEXT NOT NULL,
  UNIQUE (desktop_id, letter), UNIQUE (desktop_id, folder_id)
);
-- desktops: folder_id dropped, last_used_at added; is_open = connected
-- sessions: folder_id dropped, cwd TEXT NOT NULL DEFAULT 'C:\Users\Agent'
-- file_changes / recycled_changes: folder_id (NULL = C:) + root-relative path; UNIQUE (session_id, COALESCE(folder_id,0), path)
-- path_windows.relative_path -> path (a VPath)
```

Migration: every existing desktop's folder becomes its drive `E:`, existing chats get cwd `E:\`, change paths get the folder of their chat, window paths become
`E:\...`. `desktops` and `sessions` are rebuilt, so the migration runs with foreign keys off (`Migration.rebuildsTables`) and `migrate` runs `PRAGMA foreign_key_check` before committing.

## 10. A2UI surfaces: inline, sidebar, window

The agent draws with the MCP tool `a2ui_render({ messages, target? })`. `target` (default `inline`; `chat` is accepted as an alias) says where a **new** surface (`createSurface`) appears. Existing surfaces stay where they are.

| Target | Where | Use for |
|---|---|---|
| `inline` | in the Chat transcript (a2ui-surface activity, as before) | short conversational forms and answers |
| `sidebar` | a resizable panel on the right of the Chat window, tabs when there are several | a companion tied to this chat: status, checklist, a preview |
| `window` | its own `surface` app window on the chat's desktop | app-like UIs the user keeps open: dashboards, tools, editors |

The target is stored on the surface (`a2ui_surfaces.target`, CHECK `inline|sidebar|window`) and travels in the `a2ui-surface` activity content (`target`, `hidden`). A chat without a desktop only gets inline surfaces.

**Window surfaces.** `A2uiService` opens the window when the surface is created (through the `SurfaceWindows` port, implemented by `DesktopService.openSurfaceWindow`): `opened_by = agent`, placed with `placeNewWindow` below the top bar and beside the focused window, behind it, taskbar button flashes (the same rule as every agent-opened window). The title is `theme.title` (fallback "Agent window"); the size comes from `theme.width` / `theme.height` (clamped 240..900 x 160..640) or 480x360. Later `updateComponents` / `updateDataModel` update the same window (the renderer replays the activity messages). The window row and its `surface_windows` row are the whole state: **closing the window hides the surface** (the surface and its data model stay). A re-render by the agent does not reopen it (the user's choice wins); the tool result then says "The user closed this window; it updates in the background." The chat row **Open** opens (or focuses) the window with `opened_by = user`. Deleting the surface (`a2ui_delete_surface`, the row's **Delete**, clearing the chat, deleting the chat) removes the window: the service closes it first and trigger `trg_surface_window_removed` covers cascades.

**Sidebar surfaces.** The user closes a tab with its X; that sets `a2ui_surfaces.hidden = 1` (the row says Closed, **Open** shows the tab again). Hidden surfaces keep updating; the tool result says "The user closed this sidebar tab...".

**Chat rows.** The transcript shows, for sidebar and window surfaces, one compact row per surface (`chat-surface-row`, `data-surface-id`, `data-state` open|closed, `data-target`): icon, title, state, **Open**, **Close**, **Delete** (confirm), **Move to** (Inline / Sidebar / Window, `chat-surface-move-<target>`). Inline surfaces keep the transcript rendering and get a slim toolbar with **Delete** and **Move to**. IPC: `a2ui.deleteSurface`, `a2ui.moveSurface`, `a2ui.setSidebarHidden` (the Chat app then reloads its AG-UI store with `connect()`, because changes outside a turn are not streamed). Delete uses the same removal as `a2ui_delete_surface`; the agent is not prompted, it finds out because the surface is gone (`unknown surface`) and from `desktop_state`.

**Actions.** A control in a sidebar or window calls `store.sendA2uiAction` of the owning chat's store (`lib/apps/sessionStores`, shared with the Chat window), so it is exactly the inline path: an AG-UI run with `forwardedProps.a2uiAction`, delivered as a hidden prompt. If the chat is mid-turn the action is ignored (as before; the run guard `The agent is still working on the previous turn`). If the Chat window is closed the action still works, because the store belongs to the desktop, not to the window.

**What the agent sees.** `desktop_state` lists surface windows as windows with view `{ app: 'surface', surfaceId, sessionId, title }` and `DesktopState.surfaces` (`{ sessionId, surfaceId, title, target, state: open|closed }` for every surface of the desktop's chats). `a2ui_render` answers `ok` plus a note when a surface is shown in its own window / sidebar ("Shown in its own window "<title>"") or was closed by the user. The MCP tool descriptions and `DESKTOP_INSTRUCTIONS` explain the three targets. `desktop_close_app` cannot close an agent window (it is not an agent-openable app); `a2ui_delete_surface` closes it.

**Restart.** Window rows are persisted: after a restart or reconnect the surface windows come back with their surface and the chat rows read their state from the desktop state and the activity messages.

```sql
-- migration 005
INSERT INTO app_kinds (kind) VALUES ('surface');
ALTER TABLE a2ui_surfaces ADD COLUMN target TEXT NOT NULL DEFAULT 'inline' CHECK (target IN ('inline','sidebar','window'));
ALTER TABLE a2ui_surfaces ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0,1));
CREATE TABLE surface_windows (
  window_id  INTEGER PRIMARY KEY REFERENCES app_windows(id) ON DELETE CASCADE,
  surface_id INTEGER NOT NULL UNIQUE REFERENCES a2ui_surfaces(id) ON DELETE CASCADE
);
CREATE TRIGGER trg_surface_window_removed AFTER DELETE ON surface_windows BEGIN DELETE FROM app_windows WHERE id = OLD.window_id; END;
```

## 12. The chat pane of every app window (migration 008)

Every app window has a collapsible chat pane at its right edge: short, local and short-lived. The shell hosts it, the apps only supply context.

**Aside sessions (main).** `sessions.role = 'aside'` (migration 007) is the session of a pane. `desktop.openAside(desktopId, windowId)` returns the id of the window's aside and creates it lazily on the first call (the first message of the pane); two quick calls share one creation. The agent works in `asideCwd(view)`: the root of the plugged-in drive the window's view is on, else the agent's home. `desktop.closeAside(windowId)` is "New conversation": the session and its transcript are deleted, the window keeps its blank pane. A window that is closed deletes its aside (`DesktopService.closeWindow`, the same `removeOwnedSession` as for a review). Chat, Code Review and surface windows have none (`supportsAside`, `ASIDE_EXCLUDED_APPS`); `openAside` refuses them.

**The link.** Migration 008 adds `aside_windows (window_id PK -> app_windows ON DELETE CASCADE, session_id UNIQUE -> sessions ON DELETE CASCADE)`. It is not `chat_windows`: a `chat_windows` row owns its window (`trg_chat_window_removed`), but an aside belongs to a window that lives on its own. `AppWindowRecord.asideSessionId` joins it and `AppWindowState.asideSessionId` (absent before the first message) puts it in the desktop state, so the agent and every renderer see it.

**Not a chat.** Launcher counts (`chatCount`), `DesktopController.chats` (Start menu recents, the newest chat) and the "New chat" lists count `role: 'chat'` only. Task Manager lists every session that runs, so an aside shows there while its window is open and disappears with it.

**The agent.** An aside is an ordinary session of the desktop: its prompts carry the desktop state (`agent7://desktop/state`) and it gets the tools of the open apps through the usual tool gate, so the Browser's aside can use the `browser_*` tools on the page. The desktop context of an aside carries `appContext` with the window id, the app, the title and what the app registered. `DESKTOP_INSTRUCTIONS` (`tools/catalog.ts`) tells the agent to keep answers short and local to `appContext` and to pass `window` = `appContext.windowId` to tools that take a window.

**The shell.** `AppWindowFrame` puts the app and `AppChatPane` side by side (`.hosted`). `AppChatPane` shows a slim edge toggle (`chat-pane-toggle`) while collapsed and an `EmbeddedChat` with `role="aside"` while open. `DesktopController` owns what a pane needs: `paneOf` / `setChatPane` / `toggleChatPane` / `setPaneWidth` (collapsed state and width per window, remembered in `localStorage` under `agent7.chatpane.<desktopId>.<windowId>` with a try/catch, `desktop/chatPane.ts`), `openAside` / `closeAside`, the `prefills` of the composer and the app contexts. A window starts collapsed. Ctrl+Shift+C is handled by the frame, so it works in every app. The apps list `View -> Chat pane` with `help.paneItem(win.id)` (`chatPaneItem` in `standardMenu.ts`, test id `<app>-menu-chat-pane`). An app without a View menu gets one with `help.viewMenu(win.id)`.

**Context.** An app calls `useAppContext(host, () => win.id, () => ({ ... }))` (`apps/shared/appContext.svelte.ts`), which registers a provider with `host.setContext(windowId, provider)` and removes it when the app goes away. The provider runs when a prompt is sent and for the suggestion chips, so it must be cheap. `composeAppContext` adds `windowId`, `app` and `title`. What each app gives:

| App | Context |
|---|---|
| Code | `openFile`, `openTabs`, `selection` (text) and `range`, `gitStatus`, `changedLines` |
| Notepad, WordPad | `openFile`, `unsavedChanges`, `selection`, `range` (WordPad: `mode`, `visibleHeading`) |
| Explorer | `folder`, `selectedItems`, `items` |
| Terminal | `cwd`, `runningCommand`, `lastOutput`, `selection` |
| Browser | `url`, `title`, `tabs`, `selection` (the text selected at the last right-click: the guest page does not report it otherwise) |
| Event Viewer, Task Manager, Recycle Bin | `selectedRow` (and the filter, the tab or the item count) |
| Paint | `canvas` (width, height), `tool`, `color` |
| Sticky Notes | `note` (the selected note) or `notes` |
| Kanban | `board` (the open board as text with ids) and `selectedCard` |
| Help, Control Center, Snipping Tool | `topic`, `page`, `hasSnip` |

**Compact UX.** The pane uses a dense composer and suggestion chips from `suggestionsFor(app, context)` ("Explain this", "Summarise this page", "What changed in this file?"). Before the first message the pane shows a composer without a session: `EmbeddedChat.onstart` creates the aside, then the message is sent to it.

**askChat.** `DesktopController.askChat` expands the pane of `request.windowId` and sends the prompt there (`explain`, `send`) or fills the composer (`ask`, with `askChatDraft`, and focuses it through the `prefill` of `Composer`). If a turn is running in the pane, the text goes to the composer instead. `kind: 'window'` (context menu item "Open in Chat window") and windows without a pane use `askChatWindow`: a full chat in the Chat window, as before.

**Tests.** `DesktopService.test.ts` (lazy creation, one session per window, delete on close and on New conversation, not a chat), `LauncherService.test.ts` (chat counts), `migration-008.test.ts`, `chatPane.test.ts`, `desktop-views.test.ts`, `askChat.test.ts`; `e2e/aside.e2e.ts` and `e2e/context-menus.e2e.ts` with the `aside.json` scripted agent.

## 9. Build order

1. Contracts: `src/shared/desktop.ts`, IPC additions, tool group table. (orchestrator)
2. In parallel:
   - **Backend**: migration, repositories, `DesktopService`, `AppToolPolicy`, multi-window, bridge + MCP server tools and `list_changed`, ACP refusal, desktop state in AG-UI state and run context, browser driver.
   - **Shell**: desktop surface, window manager, taskbar, start menu, top bar, Action Center + UAC, gadgets, Storybook stories.
   - **Apps**: the eight apps against `fakeApi`, with stories.
3. Integrate, smoke test, README chapter rewrite and new screenshots, merge.
