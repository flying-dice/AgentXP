# Agent presence: Work, Show, Output

Status: accepted; all PRs and the follow-ups have landed. PR 0 (this note and the `agent-presence-ux` skill), PR 1 (headless Work, policy-only gating, `openOutputWindow`, **Show in...** actions), PR 2 (notices, the balloon queue, Action Center actions, change cues, `AgentIdentity`, foreground tracking), PR 3 (`show`, the agent cursor, the note callout, show requests) and PR 4 (Follow, the top-bar agents popup, identities on every surface, team room step text). It replaces "tools follow
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

As built (PR 4):

- `workingAgents` (`lib/desktop/activity.ts`) lists the chats that work (working or waiting for approval), newest first,
  with identity and step; `barStatus` reads "N agents working" with two or more and the line becomes
  `topbar-agents-link`, which opens `lib/desktop/AgentsPopup.svelte` (portal, XP task pane look, rows
  `topbar-agents-row` with the chat title, `topbar-agents-step`, **Open chat** and **Follow** / **Stop following**).
  With one agent the PR 1 link stays.
- The step in words is `stepWords` / `currentStep` (`lib/app/session/stepWords.ts`): "reading auth.ts", "editing
  auth.ts", "running npm test", "searching for \"token\"", browser steps through `browserNow`, the rest through
  `plainToolTitle`. The team room member rows show it (`team-chat-member-step`) beside the activity label.
- Feed rows start with the swatch and name of the agent (`infopanel-activity-agent`). Chat tool rows do not carry it:
  a chat, a pane and a member session panel each show one agent, whose name heads its messages.

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

`code_open`, `code_reveal` and `code_show_diff` became aliases of `show` for one release and are now gone (follow-ups PR).

As built (PR 3, `src/main/application/show/ShowService.ts` and `ShowTargets.ts`, tool handlers in `tools/showTools.ts`):

- The group `show` replaces the old `code` group (its only tools were the three aliases). A stored policy for `code` is
  ignored. The Control Center row reads **Agent may show you things** with Always, Ask and Never.
- `ShowTargets.check` proves the target is there (file, recorded change, comment and its open Code Review window, card,
  shape through the Diagrams app request `show` with `check`, page ref through `driver.elementOf`, window) and names it.
  A stale target is a tool error and nothing opens. `ShowTargets.land` opens or raises the window and goes to the spot.
- A foreground show raises the target window **without taking the keyboard focus** (`DesktopService.presentWindow`):
  the chat stays the foreground chat and the operator keeps typing. A request the operator accepts (**Show**) and
  **Show again** raise and focus the window, because the operator asked. A new window obeys **Agent may open apps**.
- Code gets exactly the lines as `visibleLines` (the highlight), not a padded range.
- Never returns `Not shown (Never): ...`, not a refusal. Ask (and **Ask before every action**) asks through the tool
  gateway after the target was checked. The gateway itself does not gate the `show` group (only Pause does).
- Events: `desktop.show` (show id, session, identity, target, label, note, the resolved spot, `cursor`),
  `desktop.showEnded` (dismissed, replaced, paused), `desktop.showQueue` (shows waiting plus unanswered requests) and
  `desktop.agentCursor` (Browser). The renderer tells main `desktop.dismissShow`, `acceptShow` and `showAgain`.
- The queue moves on when the operator dismisses the show on screen; a queued show whose target went away is skipped.
  **Not now** only closes the balloon: the request stays in the Action Center with **Show**. Pause drops the show on
  screen, the queue and the requests.
- Each tool result starts with a fixed prefix (`SHOW_RESULT` in `src/shared/show.ts`: "Shown now:", "Queued:", "Sent as
  a request:", "Not shown (Never):", "Not shown (declined):") and the label on the first line. The transcript row reads
  it back ("Showed you ...", "Will show you ...", "Asked to show you ...") and offers **Show again**
  (`tool-call-show-again`) except after Never or a decline.
- When a show arrives, the renderer flushes a pending view report of the target window and sends main's view again, so a
  stale report (Code's scroll after an earlier show) cannot undo the new spot.

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

As built (PR 2, `src/main/application/notices/NoticeService.ts`):

- "Window closed" means **the window does not have the focus**: closed, behind or minimized. The review tools need a
  Code Review window, so review comments are told when that window is behind.
- File changes are not a notice of their own. They are part of the turn summary, whose one action is
  **Review changes** (Code on the first changed file, its recorded change selected) when the turn changed files and
  ended well, else **Open chat**. So a background turn that only edited files gives one balloon, not two.
- The summary is left out when the turn only left output that has its own notice (a reviewer that only commented).
  A turn the operator stopped (Stop, Pause) gets nothing. Errors, refusals and the token limit say so.
- Everything is told when the turn ends. There is no quiet-period flush for long turns: open windows show the output
  live meanwhile, and one notice at the end keeps the count honest.
- The members of the focused Team Chat room count as watched (no notices), like the foreground chat.
- Change cues: `review.changed` carries `commentIds` and `by` (the agent's session); `kanban.changed` carries
  `boardId`, `cards` (id, title, added, moved, updated or deleted, column) and `by`. Code Review flashes the threads and
  the comment-list rows (it has no separate gutter marker); Kanban flashes the cards. Both expose `data-flash`.

## 7. Follow: opt-in live watching

- **Follow** is on a team-room member row, a Chat window's **View** menu and the top-bar agents popup. The top bar
  then reads "Following Builder" with **Stop following**.
- While following, that agent's Work is projected as quiet shows: Code goes to the file and lines it reads or
  edits, its cursor travels with it, the Terminal mirrors its runs. No note callouts. Projection pauses while the
  operator types and resumes after the grace period.
- One followed agent at a time. Follow ends on **Stop following**, on Pause, at the end of the agent's turn (unless
  **Keep following** is checked), or when its chat closes.

As built (PR 4, `src/main/application/show/FollowService.ts`, `src/shared/follow.ts`):

- `follow(desktopId, sessionId, keep)` / `stop` / `setKeep`; API `desktop.follow(desktopId, sessionId | null, keep?)`
  and `desktop.setKeepFollowing`. `DesktopState.following` is `{ sessionId, keep, identity } | null`, so the agent (in
  `desktop_state` and the prompt's desktop resource) and the UI see it. Following while paused is refused.
- Projection listens to `transcript.upserted`: every tool call of the followed chat, from the agentxp tools and the
  agent's own (ACP kind, location, diff, terminal), goes through `followTarget`, which is the first **Show in...** place
  (`toolShowTargets`, moved to `src/shared/toolShowTarget.ts`). An edit without lines goes to the lines its result names
  (`code_edit` says "lines 3-5"; its count no longer adds a line for a trailing line break). Each tool call lands once per
  place: an update that names the same place does not move the view again; a search lands when its first match is known.
- Code: `ShowTargets.land` (file, lines as `visibleLines`, no focus). Terminal: the Terminal comes to the front without
  the focus (`presentWindow`), on the ACP terminal when the step has one; `terminal_run` mirrors into it. Then
  `desktop.agentCursor` (no note) with the lines or the window. Browser steps are not projected: `ShowService.pointAt`
  now also points for the followed chat, so the cursor reaches the element before the click.
- Follow never asks: when **Agent may open apps** is not Allow and the window is not open, the step is not projected.
- The operator wins: while `DesktopService.operatorActive` (typing or clicking in the last `TYPING_GRACE_MS`) or while
  a show's note is on screen (`ShowService.onScreen`), the newest step waits and lands after `FOLLOW_RETRY_MS`.
- Shows are unchanged: the followed chat counts like the foreground chat only for projection, not for `show`. Its
  `show` from the background is still a request, so a note never lands without the foreground rule.
- Follow ends on Stop following (no line), on Pause, at the end of the turn (`SessionService.observeTurns`) unless
  Keep following, when the chat's home window closes (its Chat window, the window of its pane, or its Team Chat room)
  and when the chat is deleted. `desktop.followEnded` carries the reason; the top bar shows one line for a few seconds
  ("Stopped following Builder: the turn ended.", `topbar-follow-ended`), not a balloon.
- Controls: **View -> Follow this chat** (`chat-menu-follow`, checked), **Follow** on a member row
  (`team-chat-member-follow`, the row gets `data-following`), the agents popup; the top bar line `topbar-following`
  with `topbar-stop-following` and `topbar-keep-following`.

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

As built (follow-ups PR): a cursor remembers the window it points into (`CursorAnchor`). When that window is closed,
minimized, maximized, restored or resized, the cursor hides at once (`data-state="hidden"`) instead of floating where
the window was until it fades; when the window is moved (also while it is dragged, through its live bounds) the cursor
moves with it. The rule is the pure `cursorFollowsWindow` in `showResolvers.ts`.

As built (PR 4): the overlay takes a short list of pointings (`cursorPings`), so two agents pointing at once each move
their own cursor. A team member's glide starts at its row in the Team Chat window. Paint's drawing cursor honours
`prefers-reduced-motion` (it jumps, without the pulse ring on every point).

As built (PR 3):

- `kit/organisms/AgentCursor.svelte` (story `Organisms/AgentCursor`): `data-agent`, `data-state` (ready, gliding,
  arrived, idle, cancelled, hidden) and `data-motion` (glide, reduced). Paint uses it for its drawing cursor, with the
  agent identity that `paint_draw` now sends.
- `lib/desktop/ShowOverlay.svelte` is the layer (fixed, z-index 160000, click-through) with one cursor per agent and the
  note callout (`ShowCallout.svelte`, test ids `show-callout*`). The spot is resolved to a rectangle in
  `lib/desktop/showResolvers.ts` (pure geometry with tests: union of line rows, clipping, the Browser box offset by the
  page area marked `data-show-page`, the callout placement that stays inside the desktop). The resolver waits until the
  rectangle is still for a few frames, so the window has opened and the lines have scrolled in.
- The glide starts at the agent's last cursor position, else the middle of its chat window or pane. The cursor fades
  after `CURSOR_IDLE_MS` (1.5 s). Any operator pointer-down or key-down outside the callout stops a glide and dismisses
  the show; focus is never moved. The show is announced in the existing `aria-live` region.
- Browser: `BrowserDriver.locate` scrolls the element into view and returns its box before `browser_click`,
  `browser_type` and `browser_select`. `ShowService.pointAt` publishes it only for the foreground chat with the Browser
  on screen (Follow joins in PR 4) and waits the glide (`BROWSER_POINT_WAIT_MS`) before the action. The orange ring stays
  as the landing cue.

## 9. Identity

`AgentIdentity { name, color }`, resolved in one place:

- Team member: the profile name and colour (`RoomMemberDto.name`, `.color`).
- Plain chat: the agent display name and `colorOfName(sessionId)` (`src/shared/teams.ts`). No migration.

As built (PR 2): `agentIdentity()` in `src/shared/identity.ts`, resolved in main by compose (`TeamRoomService.memberOfSession`,
then the agent row). Balloons and Action Center messages show it now; the cursor and the note callout since PR 3.

As built (PR 4): `DesktopState.identities` maps the session id of every agent the desktop shows (chats with a window
or pane, Code Review sessions, busy chats, team room members) to its identity, resolved in main by the same
`identityOf`. The renderer's `DesktopController.identityOf` reads it and falls back to `agentIdentity` (the room member
colour, or the session colour). The feed, the agents popup, the Follow line and the cursor use it; team room rows use the
profile colour, which is the same one.

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

**Foreground tracking** (PR 2). `DesktopService.foregroundSessionId(desktopId)`: a focused Chat window is its chat, a
focused Code Review window its review session, and a focused app window whose chat pane the operator last focused or
typed in is that pane's chat. The renderer reports the pane with `desktop.notePaneFocus(windowId, active)` (focus or a
key in the pane, and `false` when the pane is hidden).

**Notices** (PR 2). The unused `status.message` event is gone. `desktop.notice { desktopId, id, kind, title, text,
identity, sessionId, actions[], at }` (`src/shared/notices.ts`) is published by `NoticeService` to the owning desktop
only. It hears turn starts and ends from `SessionService.observeTurns`, the app events from the publisher, and the
output tools of Diagrams, Paint and WordPad from the tool service log. Background show requests joined it in PR 3 (`ShowService`, notice kind `show`). The
balloon is a queue (`lib/desktop/balloonQueue.ts`: a notice waits, a shell balloon shows at once) with history in the
Action Center; `ActionCenterMessage` has generic `actions`; `Balloon` is a kit molecule. An A2UI window refused by
**Agent may open apps** now tells the agent that it was not opened and why, not that the user closed it.

**Agent instructions** (`src/main/application/tools/catalog.ts`). `PREFER_DESKTOP_INSTRUCTIONS` and the "Tools follow
the apps that are open" line are replaced by "Work quietly": built-in tools and AgentXP tools are both fine and
nothing opens; call `show` only when you want the operator to look, one target, always with a reason; output apps
open behind the operator. Tool descriptions that promise a window are rewritten.

## 11. Build plan

| PR | Scope | Main tests |
|---|---|---|
| 0 | This note, the `agent-presence-ux` skill, the glide exception, journeys J10 (rewritten) and J32 to J34, panel tasks | docs only |
| 1 | Headless Work: retire the gate, strip side effects, `openOutputWindow`, Browser and WordPad stop stealing focus, new instructions, **Show in...** on tool rows and feed rows, top-bar working link, README chapter 6 and manuals | `tools.test.ts`, `AppToolPolicy.test.ts`, `desktop-tools.integration.test.ts`, `catalog.test.ts`, `e2e/search.e2e.ts`, `e2e/scripted-desktop-tools.e2e.ts`, `e2e/desktop-tools.e2e.ts`, `e2e/scripted-demo.e2e.ts` |
| 2 (landed) | Notices and Output: `desktop.notice`, balloon queue and history, Action Center actions, turn summaries, change cues in Code Review and Kanban, `AgentIdentity`, foreground tracking (moved forward from PR 3) | `NoticeService.test.ts`, `e2e/notices.e2e.ts` |
| 3 (landed) | Show and the cursor: `show`, `ShowService`, foreground rule (uses PR 2's `foregroundSessionId`), queue, policy row, `AgentCursor` and overlay, note callout, per-app resolvers, Browser box before click, transcript rows; Paint uses the shared cursor | `e2e/show.e2e.ts`, scripted-agent scripts |
| 4 (landed) | Follow and team presence: Follow toggle, projection with typing pause, a cursor per member, member step text, the top-bar agents popup, identities on feed rows; show targets for review comments, cards and shapes checked in the real app, a shown or changed Kanban card scrolls into view | `FollowService.test.ts`, `e2e/follow.e2e.ts` |

Follow-ups (after PR 4): the deprecated `code_open`, `code_reveal` and `code_show_diff` aliases are removed (`show` is
the one tool of its group); the idle agent cursor hides with its window (section 8); ux-panel presets and checkers for
T32.1, T32.2, T33.1, T33.2 and T34.1; real-app checks (e2e) of the Diagrams, Paint and WordPad output balloons with the
window behind, Follow with **Agent may open apps** on Ask (nothing asks, only open windows follow), the Browser cursor
for a followed background chat, and Paint's drawing cursor with reduced motion.

Each PR follows `verify-change` and `agent-presence-ux` and runs every gate in `AGENTS.md`.
