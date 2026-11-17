# Agent presence: Work, Show, Output

Status: accepted, being built (PR 0 of 5: this note and the `agent-presence-ux` skill). It replaces "tools follow
apps" (`DESKTOP_DESIGN.md` sections 1 and 3) as the rule for how agents appear on the desktop. The UX rules for
contributors are in `.claude/skills/agent-presence-ux/SKILL.md`; this note is the design and the build plan.

## 1. Why

AgentXP started with agents working *through* the desktop: a tool existed only while its app was open, and the
`code_*`, `fs_find` and `wordpad_*` tools opened and focused windows as a side effect of ordinary work. Commit
`0113b82` went further and told agents to prefer those tools "because the user watches you work".

In use this is noise:

- Windows flash open for reads and searches that take milliseconds. Nobody can follow them.
- With the team model, several members race for the operator's one screen.
- Agents bypass it anyway (the `0113b82` audit: built-in Grep/Glob, a hidden shell, sub-agents that made up a
  commit). The gate cannot stop an agent's own built-in tools.
- The gate grew exceptions (`ALWAYS_ON_TOOL_GROUPS`, `terminal_run` with the Terminal closed) because it got in the
  way of real work.

The desktop is **the operator's environment**. Agents work out of sight; the desktop shows what matters, when it
matters, and the operator chooses when to look closer.

## 2. Three styles of agent action

Every agent tool, and every UI reaction to an agent, is exactly one of these.

| Style | What it is | Examples | What the operator sees |
|---|---|---|---|
| **Work** | The agent doing its job | read, search, edit, write, run, browse-read, list | Nothing moves. A step in the chat, the activity feed, the top bar, the team room. Two clicks to the detail. Open windows that already show the thing update live. |
| **Show** | The agent deliberately pointing the operator at something | "look at auth.ts:40-62", "here is the diff", "this comment", "this card" | The target opens at the exact spot, the agent cursor glides there, a note says why. |
| **Output** | Results that land in an app's own data | review comments, Kanban cards, diagram shapes, file changes, a drawn surface | Live in the open window with a short change cue; if closed, one balloon per turn with one action. |

Classify a new action with two questions: *Did the agent mean the operator to look, now?* Show. *Does it leave
something behind in an app?* Output. Otherwise it is Work. A tool has one style; if it seems to need two, split it.

## 3. Rules that hold everywhere

1. **Only the foreground chat may move the operator's view.** The foreground chat is the one whose window or
   embedded pane the operator last focused or typed in. Every other chat (a background chat, a team member, a
   scheduled run) *asks*: a balloon "Builder wants to show you auth.ts:40-62" with **Show** and **Not now**, kept in
   the Action Center.
2. **Agents may update windows that are open. They open a window only to Show, or to put Output in an output
   app.** Output windows open behind the focused window, unfocused, with the taskbar flash (`attention`) and the
   agent glow. Every agent open obeys **Agent may open apps**.
3. **The operator always wins.** Any operator mouse or key input cancels a cursor glide and dismisses a show.
   During `TYPING_GRACE_MS` after operator typing nothing takes focus.
4. **Pause stops all motion.** Cursors hide, shows are dropped, Follow stops.
5. **Ask before every action covers Show.** With it on, a show asks first.
6. **One identity everywhere.** An agent has one name and one colour in the cursor, note callouts, balloons,
   activity rows, tool rows, the team room and the top bar.

## 4. Work: quiet, never hidden

The operator must be able to answer "what is it doing" and "what did it do" in at most two clicks, without any
window opening on its own.

- **Top bar.** "Working: <step>" becomes a link (`topbar-working-link`) to the chat doing the work. With several
  agents working it reads "3 agents working" and opens a task-pane popup (`topbar-agents-menu`): one row per agent
  with colour swatch, name, current step, **Open chat** and **Follow**.
- **Chat tool rows.** Each row gets the matching action, wired like the existing **Show in Event Viewer**
  (`ToolCallCard.svelte`, `EmbeddedChat.svelte` `onshowtoolevent`, `DesktopController.openEventViewer`):
  **Show in Code** (read, search and edit rows, at the lines), **Show diff** (edit rows), **Show in Terminal**
  (run rows), **Show in Browser** (browser rows). The operator asked, so these may open and focus.
- **InfoPanels activity feed.** Rows (`recentToolCalls`, `lib/desktop/activity.ts`) become clickable with the same
  actions and carry the agent swatch and name.
- **Team room.** Member rows show the current step in plain words ("reading auth.ts", "running npm test") from the
  existing title helpers (`plainToolTitle`, `browserStep`).
- **Live where open.** An edit to the file shown in Code reloads it (already done through `activeChangeKey`) and the
  changed lines get a short highlight. `terminal_run` keeps mirroring into an open Terminal (`showInTerminal`).
  Nothing opens.
- **Event Viewer** stays the full record.

## 5. Show: the colleague turning their screen

One tool, `show`, in a new always-on group `show`:

```ts
show({
  target:
    | { kind: 'file'; path: string; lines?: [number, number] }
    | { kind: 'change'; path?: string; changeId?: Id }
    | { kind: 'review-comment'; id: Id }
    | { kind: 'card'; boardId: Id; cardId: Id }
    | { kind: 'diagram-shape'; id: string }
    | { kind: 'page-element'; ref: number }   // a ref from browser_read
    | { kind: 'window'; app: AppKind },
  note: string                                 // required: why the operator should look
})
```

For the foreground chat:

1. The target window opens or comes forward and goes to the spot: Code through the existing `showFile` /
   `CodeView.visibleLines` highlight, Code Review selects the comment, Kanban selects the card, Diagrams uses the
   `diagram_select` path, Browser scrolls the element into view.
2. The agent cursor glides from its last position (else from the chat window) to the target rectangle.
3. A note callout (XP balloon tooltip look) appears beside the target: agent name, note, **OK** and **Reply**.
   **Reply** focuses the chat composer with the note quoted.
4. The cursor fades after about 1.5 s idle. The highlight stays until the operator clicks elsewhere.

For any other chat the show becomes a request (rule 1). Limits: one show at a time per desktop, further shows queue
("2 things to look at" in the Action Center), Esc or any operator input dismisses. The transcript keeps a row per
show ("Showed you auth.ts:40-62: <note>") with **Show again**.

Policy: Control Center row **Agent may show you things**, Always (default), Ask or Never. Never keeps the transcript
row only.

`code_open`, `code_reveal` and `code_show_diff` become aliases of `show` for one release, then go.

## 6. Output: it lands in the app, and you hear about it once

- **Window open.** The change appears live with a short cue: new review comments flash their gutter marker, moved
  or new cards flash, Diagrams keeps its changed-shape flash. `review.changed` and the board events carry the changed
  ids so the window knows what to flash.
- **Window closed.** One balloon per turn per kind, in outcome words, with exactly one action:
  "Reviewer left 4 comments on auth.ts" **Open review**; "Builder changed 6 files" **Review changes**;
  "Card 'Login bug' moved to Done" **Open board**; "Diagram updated" **Open diagram**. Each balloon also goes to the
  Action Center history.
- **Turn summary.** When a background chat ends a turn: "Builder finished: changed 6 files, ran tests (passed)"
  **Open chat**. The foreground chat gets no balloon; the operator is watching it.
- **Output windows** are the apps whose window owns the state: Paint, Agent Diagrams, WordPad, Browser, Code Review
  and agent-drawn surfaces. They open behind, unfocused and flashing, and never take focus.

## 7. Follow: opt-in live watching

- **Follow** is on a team-room member row, a Chat window's **View** menu and the top-bar agents popup. The top bar
  then reads "Following Builder" with **Stop following**.
- While following, that agent's Work is projected as quiet shows: Code goes to the file and lines it reads or
  edits, its cursor travels with it, the Terminal mirrors its runs. No note callouts. Projection pauses while the
  operator types and resumes after the grace period.
- One followed agent at a time. Follow ends on **Stop following**, on Pause, at the end of the agent's turn (unless
  **Keep following** is checked), or when its chat closes.

## 8. The agent cursor

- Kit organism `AgentCursor`, generalised from the Paint ghost cursor (`apps/paint/PaintApp.svelte`): the XP arrow
  in the agent's colour with a name tag.
- Hosted in a new desktop overlay layer: fixed, `pointer-events: none`, z-index 160000 (above the popup layer at
  150000, below the UAC popup at 200000).
- One cursor per active agent.
- Glide of about 300 ms, ease-out. This is a deliberate exception to the era rule (see
  `docs/design/XP_DESIGN_LANGUAGE.md`, "Motion"). With `prefers-reduced-motion` it jumps and shows a short pulse ring.
- Targets are resolved in the renderer: `[data-window-id] [data-testid=...]` and `getBoundingClientRect()`, plus
  resolvers per app for file lines, comments, cards and shapes. Browser boxes are offset by the `.page` rectangle.
- In the Browser the box is sent **before** the click (`driver.elementOf` in `browserTools.ts`), so the cursor
  arrives first and then the click happens. That is the one place where the cursor shows real control.
- The cursor appears only for Show, Browser actions and Follow. Never for background Work.

## 9. Identity

`AgentIdentity { name, color }`, resolved in one place:

- Team member: the profile name and colour (`RoomMemberDto.name`, `.color`).
- Plain chat: the agent display name and `colorOfName(sessionId)` (`src/shared/teams.ts`). No migration.

## 10. Architecture changes

**Retire "tools follow apps".**
- `enabledToolGroups` (`src/shared/desktop.ts`) returns every group. What an agent can use is the Control Center
  policy plus the team, profile or scheduled-run scope.
- `evaluateToolAccess` (`AppToolPolicy.ts`) drops the closed-app step. `closedAppMessage` stays only for output apps
  whose tools need a mounted window (Paint, Diagrams, WordPad read and write, Browser, Code Review).
- ACP `fs/*` and `terminal/*` (`AcpAgentConnection.ts`) are gated by policy only.
- The `toolsChanged` push stays: it still fires on policy changes and for output windows.
- The top-bar "Agent can use" chips show policy (Allow, Ask, Deny), not open apps.

**Headless Work tools.**
- `code_read`, `code_search`, `code_edit`, `code_write` and `fs_find` stop calling `openWindow`. They update a
  window only when it is already open and already shows that file or folder.
- `wordpad_*` stop calling `focusWindow`. The Browser stops focusing itself on the first agent action
  (`BrowserApp.svelte`).
- Every agent open goes through one `DesktopService.openOutputWindow`: unfocused, `attention`, glow, and checks
  `openApps`. This closes today's gap where `code_*`, `fs_find`, `wordpad_*`, `taskmgr_open_chat` and A2UI windows
  skip the policy.
- `desktop_focus_app` leaves the agent catalog.

**Show.** `src/main/application/tools/showTools.ts` and a `ShowService` that applies the foreground rule, queues
requests and publishes `desktop.show { desktopId, sessionId, target, note, identity }`. Apps that own their state get
an `AppRequestBroker` method `show`; Code, Code Review and Kanban use view updates.

**Foreground tracking.** `DesktopService.foregroundSessionId`, set from window focus and from aside-pane focus and
typing reports.

**Notices.** The unused `status.message` event (`src/shared/ipc.ts`) is replaced by
`desktop.notice { desktopId, id, kind, title, text, identity, actions[] }` published from main for turn summaries,
output events and background show requests. The balloon becomes a queue with history; `ActionCenterMessage` gets
generic `actions` in place of the fixed **Continue**. `Balloon` moves into the kit.

**Agent instructions** (`src/main/application/tools/catalog.ts`). `PREFER_DESKTOP_INSTRUCTIONS` and the "Tools follow
the apps that are open" line are replaced by "Work quietly": built-in tools and AgentXP tools are both fine and
nothing opens; call `show` only when you want the operator to look, one target, always with a reason; output apps
open behind the operator. Tool descriptions that promise a window are rewritten.

## 11. Build plan

| PR | Scope | Main tests |
|---|---|---|
| 0 | This note, the `agent-presence-ux` skill, the glide exception, journeys J10 (rewritten) and J32 to J34, panel tasks | docs only |
| 1 | Headless Work: retire the gate, strip side effects, `openOutputWindow`, Browser and WordPad stop stealing focus, new instructions, **Show in...** on tool rows and feed rows, top-bar working link, README chapter 6 and manuals | `tools.test.ts`, `AppToolPolicy.test.ts`, `desktop-tools.integration.test.ts`, `catalog.test.ts`, `e2e/search.e2e.ts`, `e2e/scripted-desktop-tools.e2e.ts`, `e2e/desktop-tools.e2e.ts`, `e2e/scripted-demo.e2e.ts` |
| 2 | Notices and Output: `desktop.notice`, balloon queue and history, Action Center actions, turn summaries, change cues in Code Review and Kanban, `AgentIdentity` | `e2e/notices.e2e.ts` |
| 3 | Show and the cursor: `show`, `ShowService`, foreground rule, queue, policy row, `AgentCursor` and overlay, note callout, per-app resolvers, Browser box before click, transcript rows; Paint uses the shared cursor | `e2e/show.e2e.ts`, scripted-agent scripts |
| 4 | Follow and team presence: Follow toggle, projection with typing pause, a cursor per member, member step text | `e2e/follow.e2e.ts` |

Each PR follows `verify-change` and `agent-presence-ux` and runs every gate in `AGENTS.md`.
