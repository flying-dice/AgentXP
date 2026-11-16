# Agent7 Key User Journeys

Status: discovery. Personas are in `personas.md`, scoring in `rubric.md`, the process in `process.md`.

Planned features are included where they change a journey: A2UI surface targets (inline, sidebar, window) and the new Code app (Code::Blocks-style layout, git status, change gutter). Steps that depend on them are marked **[planned]**. Re-verify those steps against the built app before scoring.

## How to read a journey

Each journey also has panel tasks in `tasks.md` (T-numbers) and a manual topic in `docs/help/<app>.md` for each app it touches; docs are part of the evidence (D11). Each journey has: id, personas, trigger, goal, preconditions, happy path (table: screen, user action, system response, what the user must notice), decision points, failure and edge branches, success measure, and existing e2e coverage.

"Must notice" is the observable signal the user needs to continue without help. If a step has no such signal, that is a finding.

Test id names below follow `docs/CONVENTIONS.md`. Names with a question mark are guesses: check them in the source before writing the spec.

## Index

| Id | Journey | Primary personas |
|---|---|---|
| J01 | First launch and empty launcher | P1, P4 |
| J02 | Create a desktop | P1, P4 |
| J03 | Plug in a project | P1, P4 |
| J04 | Start a chat | P1, P4 |
| J05 | Send a prompt and follow progress | P1, P4 |
| J06 | Approve or deny a request (chat and UAC dialog) | P2, P4 |
| J07 | Approve from the Action Center | P2, P3 |
| J08 | Review and revert changes (Chat, Code) | P1, P2 |
| J09 | Restore from the Recycle Bin | P1, P2 |
| J10 | Tools follow apps | P2, P1 |
| J11 | Pause and take control | P2, P1 |
| J12 | Eject a drive | P1, P3 |
| J13 | Disconnect and reconnect while the agent runs | P3, P2 |
| J14 | Manage several desktops | P3 |
| J15 | Delete a desktop | P3, P4 |
| J16 | Choose permissions (Control Centre) | P2 |
| J17 | Add and choose agents | P3 |
| J18 | A2UI surfaces: inline, sidebar, window | P1, P4 |
| J19 | Browse with the Browser | P1, P2 |
| J20 | Investigate a problem (Event Viewer, Task Manager) | P2, P3 |
| J21 | Keyboard-only operation | P3 |
| J22 | First-time help and discoverability | P4 |
| J23 | Recover from errors | P4, P2 |
| J24 | Read code, git status and the gutter [planned] | P1, P2, P3 |

---

## J01 - First launch and empty launcher

- **Personas.** P1, P4.
- **Trigger.** The user starts Agent7 for the first time (installer, `npm run dev`, or the boxed disk).
- **Goal.** Understand what Agent7 is and what to do next within 10 seconds.
- **Preconditions.** Empty user-data folder. Built-in agents seeded (Claude Code, Scripted Agent). No desktops. Node and an agent may or may not be installed.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | OS | Starts Agent7 | The 520x600 **Agent7 Desktop Connection** window opens, focus on the list or New... | A single, centered window with a title and one obvious next step |
| 2 | Launcher, empty | Reads | Empty-state text names the next step ("no desktops yet", New...) | What a desktop is, in one sentence, and that **New...** is the way forward |
| 3 | Launcher | Presses **New...** or Alt+N | The New desktop dialog opens (continues in J02) | Dialog is modal to the launcher and focus is in the name box |

- **Decision points.** Read the intro line or click New... at once. Pick a project now or later.
- **Failure and edge branches.**
  - Agent runtime missing (no Node, no `npx`): the launcher must not hide this. Check where the user first learns of it (J17, J23).
  - No network on first start: the first Claude Code start downloads the agent with `npx` (README tip: it can take a minute). The chat must say "Starting agent" with progress, not freeze.
  - Data folder unwritable or database migration fails: the launcher must show a plain error with a next step, not a blank window.
  - Launcher closed by mistake: Agent7 must be reachable again (Start -> Agent7 Desktops... on a desktop; what if none is open?). Check the quit/relaunch behavior.
  - High DPI, small screen (below 600 px height): the fixed 520x600 window must fit and scroll.
- **Success measure.** 90% of P4 reviewers click **New...** within 10 seconds with no help. The empty state has no jargon.
- **E2E coverage.** `launcher.e2e.ts` ("opens the launcher first, with no desktops yet"). Missing: empty-state text quality, screenshots, small screen.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T01.1 in `tasks.md`.

## J02 - Create a desktop

- **Personas.** P1, P4.
- **Trigger.** The user clicks **New...** in the launcher.
- **Goal.** Have a desktop for one project with the right agent.
- **Preconditions.** J01. At least one agent registered. A project folder exists.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | New desktop dialog | Types a name | **Create** enables when the name is valid | A default name is suggested, or the rule for a valid name is visible |
| 2 | Same | Ticks known projects or clicks **Browse...** | OS folder picker; chosen folder appears ticked in the list | Project is selected; what "plugged in as a USB drive" means |
| 3 | Same | Selects **Agent** | The default agent is preselected | Which agent will run and whether it is installed |
| 4 | Same | Clicks **Create** | Dialog closes; the row appears selected in the list with a thumbnail placeholder | New row is selected and visible (scrolled into view) |
| 5 | Launcher | Clicks **Connect** (or Enter) | Desktop window opens (J14 covers more) | Row shows **Connected**; desktop window has focus |

- **Decision points.** Project now or later. Which agent. Name.
- **Failure and edge branches.**
  - Duplicate name: README says each desktop needs its own name. The error must appear next to the box and name the rule.
  - Empty name: Create stays disabled with a visible reason, or a clear message.
  - Folder picker cancelled: no change, no error.
  - Folder was deleted or is on a disconnected drive since last use: it appears in the list but cannot plug in. Needs a clear row state, not a silent skip.
  - Folder already plugged in on another desktop: allowed? Show it.
  - No agent registered or default agent command missing: Create must warn or the first chat must explain (J17).
  - Very long names: truncate with tooltip.
- **Success measure.** Task time under 45 seconds for P4. Zero errors with unclear cause.
- **E2E coverage.** `launcher.e2e.ts` ("creates a desktop through the New dialog", "creates a desktop with a project plugged in as a USB drive"). Missing: duplicate name, empty name, cancel, keyboard-only.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T02.1, T02.2 in `tasks.md`.

## J03 - Plug in a project

- **Personas.** P1, P4.
- **Trigger.** The user wants the agent to work on another folder on a running desktop.
- **Goal.** The project appears as a drive (E: or later) and the user can open it or start a chat on it.
- **Preconditions.** A connected desktop.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Desktop | Clicks **Start -> Computer** (or the Computer icon) | Explorer opens on "Computer" listing C: and any USB drives | Drives as tiles with letters |
| 2 | Explorer toolbar | Clicks **Plug in a project...** | OS folder picker | The button name is exact and visible |
| 3 | Folder picker | Selects folder | AutoPlay dialog opens; USB tray icon appears; drive tile appears | AutoPlay names the drive and the letter |
| 4 | AutoPlay | Chooses **Start a chat on this drive**, **Open folder**, or **Take no action** | Chat opens, Explorer opens, or nothing | The chat status bar shows `E:\` |

- **Decision points.** Which AutoPlay choice. Whether to start a chat now.
- **Failure and edge branches.**
  - Same project plugged in twice: returns the same drive. Tell the user ("already plugged in as E:") instead of showing AutoPlay again without explanation.
  - All letters E to Z used: clear error.
  - Folder inside an already plugged-in folder, or parent of one: define and message.
  - Folder unreadable or no permission (OS): error naming the folder.
  - Folder on removable media that is gone: see J12.
  - Folder deleted while plugged in: reads fail; Explorer must show an error row, the agent gets a tool error (check wording).
  - AutoPlay closed with Esc: treated as Take no action.
- **Success measure.** P4 plugs in a folder and starts a chat on it with no help, first try.
- **E2E coverage.** `explorer-usb.e2e.ts` ("plugging a project into the running desktop shows AutoPlay and the new drive"), `chat.e2e.ts` ("plugs the project in and starts a chat on it from AutoPlay"). Missing: duplicate, no free letter, cancel.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T03.1 in `tasks.md`.

## J04 - Start a chat

- **Personas.** P1, P4.
- **Trigger.** The user wants to talk to the agent.
- **Goal.** A Chat window is open, connected to the agent, in the right folder.
- **Preconditions.** A connected desktop. An agent that can start.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Start menu | **Start -> New chat** (or **New chat on a drive...**, or Explorer "Start a chat here", or AutoPlay) | A Chat window opens, focus in the message box | Title, folder in the status bar (`C:\Users\Agent` or `E:\`), agent name |
| 2 | Chat | Waits for the agent to start | Status shows starting, then ready; the model and mode lists fill | Clear "starting agent" state; first start can take a minute |
| 3 | Chat | Looks for the closed chat later | **Start -> Recent chats** lists it | Closing the window hides the chat; it is not lost |

- **Decision points.** Which entry point. Which drive. Which model and mode.
- **Failure and edge branches.**
  - Agent not installed or command fails (ENOENT, `npx` missing): the chat must show an error row with a next step (Control Centre -> Agents) and keep the composer disabled with a reason.
  - Agent crashes at start: error with Retry. Check there is a Retry.
  - Not signed in (Claude Code auth, no API key): the agent's message must reach the user in plain words.
  - No network on first `npx` download: progress, then a timeout message.
  - Chosen drive was ejected between dialog and start: refusal message names the drive.
  - Many chats: Recent chats list length, search box.
- **Success measure.** Chat window ready within 5 seconds (warm) and the user can name the folder the chat works in.
- **E2E coverage.** `desktop-shell.e2e.ts` (chat on a drive, on C:, from Explorer), `chat.e2e.ts`, `scripted-builtin.e2e.ts`. Missing: agent not installed, auth failure, recent chats.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T04.1, T04.2 in `tasks.md`.

## J05 - Send a prompt and follow progress

- **Personas.** P1, P4.
- **Trigger.** The user types a task.
- **Goal.** Know at every moment what the agent is doing, and when it is done.
- **Preconditions.** J04.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Chat | Types, presses Enter (Shift+Enter for a new line) | Message appears in the transcript; Send becomes Stop; "working" indicator | Message was accepted; a Stop button now exists |
| 2 | Chat transcript | Watches | Agent text streams; tool call cards show Running, Done, Failed, Cancelled; a "Thinking..." row | Which tool ran, on which path, with what result (Show) |
| 3 | Top bar, gadgets | Glances | Status shows Working with the action name; Activity gadget lists last actions; context meter moves | The same action in three places must agree |
| 4 | Desktop | Sees windows open | Agent-opened windows flash on the taskbar (`data-flashing`) and do not steal focus | The agent opened an app; the taskbar button flashes |
| 5 | Sticky Notes | Reads the plan | Plan note mirrors the chat tasks | Task progress (n of m done) |
| 6 | Chat | Waits | Turn ends: Stop turns back into Send; end state is visible (done, max tokens, refusal, cancelled) | The agent is finished and why it stopped |

- **Decision points.** Wait or do something else. Stop the agent. Attach a file or include the open file. Change model or mode.
- **Failure and edge branches.**
  - Agent error mid-turn: error row, run ends, composer re-enabled.
  - Stop reasons (`max_tokens`, `refusal`): `chat-stop-notice` text is plain and says what to do next.
  - Empty message: Send disabled.
  - Very long output or transcript (thousands of rows): scrolling, auto-scroll that stops when the user scrolls up.
  - Message sent while the agent still works: define (queue, disabled, or blocked) and make it visible.
  - Disconnect: see J13. Pause: see J11.
  - Context nearly full: warn before the agent fails.
  - Attachment too large or unreadable.
- **Success measure.** A P4 reviewer can say in one sentence what the agent did after the turn, from the screen alone.
- **E2E coverage.** `chat.e2e.ts`, `scripted-stepping.e2e.ts`, `scripted-errors.e2e.ts`, `scripted-paths.e2e.ts`. Missing: send while working, long transcript, context warning, attachments.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T05.1, T05.2 in `tasks.md`.

## J06 - Approve or deny a request (chat and UAC dialog)

- **Personas.** P2, P4.
- **Trigger.** The agent calls a tool whose permission is **Ask**, or Take control is on.
- **Goal.** Decide with full knowledge: what, where, why, and the effect of each answer.
- **Preconditions.** J05. Policy Ask for Write files or Terminal.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Desktop | Is looking elsewhere | Desktop dims; the **User Account Control**-style dialog appears; taskbar flashes; Action Center flag shows a red count; chat shows the request and status "Waiting for permission" | A request is waiting and the agent is blocked |
| 2 | UAC dialog | Reads question, target and reason | Shows "Do you want to allow the agent to edit src/auth/redirect.ts?" and "Writing files is set to Ask in Control Centre." | Actor, action, target, reason |
| 3 | UAC dialog | Clicks **Show details** | Diff or command appears | Exactly what will change |
| 4 | UAC dialog | Clicks **Allow** or **Deny** (agent-supplied labels), or **Not now** | Dialog closes; the agent continues or takes the deny branch; tool card turns Done or Failed | Outcome is visible in the tool card and the Activity gadget |
| 5 | Chat | Alternatively answers in the chat | Same result; the dialog closes everywhere | One decision, two places, never double-asked |

- **Decision points.** Allow, Deny, Not now (leaves the request pending). Change the policy afterwards (J16).
- **Failure and edge branches.**
  - Agent supplies odd option names (more than two, "Allow always"): buttons must still map to the right action and keep a safe default.
  - Not now, then forgetting: the flag count stays and the chat shows waiting. Check the desktop never looks idle.
  - Two requests arrive together: queued; each dialog names its chat.
  - Request answered in one place while the other is open: the other closes without error.
  - Agent cancelled (Stop) while a request waits: request disappears and the user is told.
  - Agent process dies while a request waits: stale request must be cleared.
  - Dialog covers the details the user needs (the chat behind it).
  - Default button is Allow in the screenshot. Review whether a destructive request should default to Deny or have no default.
  - Long paths, huge diffs, binary files: truncate with a way to see more.
  - Desktop disconnected while waiting: see J13.
- **Success measure.** P2 can state the file, the change and the reason from the dialog alone. No accidental Allow in the usability test (default button risk).
- **E2E coverage.** `chat.e2e.ts` (permission request in chat and Action Center, allow completes), `scripted-demo.e2e.ts` (allow path and deny path). Missing: Not now, Esc, two requests, Stop while waiting, option label variants.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T06.1, T06.2, T06.3 in `tasks.md`.

## J07 - Approve from the Action Center

- **Personas.** P2, P3.
- **Trigger.** The red count on the Action Center flag, or a request the user dismissed with Not now.
- **Goal.** Find and answer every waiting request across all chats of the desktop.
- **Preconditions.** At least one pending request.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Taskbar tray | Clicks the flag | Action Center pops up: "Waiting for your approval (n)", newest first, with chat names; Messages list | Count equals rows; each row has the chat and the action |
| 2 | Action Center | Clicks **Review** | UAC dialog opens for that request | It is the same request that the row shows |
| 3 | UAC dialog | Allows or Denies | Row disappears; count drops; popup stays or closes | The count changed |
| 4 | Action Center | Reads Messages | "Safe to remove" and other notes | Messages are separate from approvals |
| 5 | Action Center | Clicks **Open Control Centre** | Control Centre opens on Permissions | Link to change the policy |

- **Decision points.** Answer all or one. Open the Control Centre to loosen or tighten a policy.
- **Failure and edge branches.**
  - Zero requests: empty-state text, not a blank popup.
  - Popup closes on blur while the user reads: it must be easy to reopen; keyboard Esc closes and returns focus to the flag.
  - Many requests (20+): scroll and a "deny all" or per-chat filter? Decide and document.
  - Same request listed twice or stale rows after Stop.
  - Flag is tiny: target size and contrast of the red count.
- **Success measure.** Time from "count appears" to "answered" under 5 seconds with the mouse and under 8 with the keyboard.
- **E2E coverage.** `chat.e2e.ts` ("a second request can be approved from the Action Center through the UAC dialog"). Missing: messages list, empty state, many requests, keyboard.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T07.1 in `tasks.md`.

## J08 - Review and revert changes (Chat, Code)

- **Personas.** P1, P2.
- **Trigger.** The agent changed files and the user wants to review or undo.
- **Goal.** See every changed file with its diff and undo one or all of them safely.
- **Preconditions.** The agent wrote or deleted at least one file in a chat.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Chat | Clicks **Tasks and changes** and the **Changes** tab | Pane lists created, changed, deleted files for this chat | Status per file (created, changed, deleted) |
| 2 | Chat or **Code** | Selects a file | Diff opens in Code (changes list with DiffViewer) | Which lines the agent changed |
| 3 | Code [planned] | Looks at file tree, git status and the gutter | Code::Blocks-style layout: tree with git status marks, gutter marks for changed lines | Difference between the agent's changes and the repository's own git changes |
| 4 | Chat or Code | Clicks **Revert** | Message box asks; **Yes** writes the original back | The question says which file and that the change goes to the Recycle Bin |
| 5 | Desktop | Sees the result | The file leaves Changes; Recycle Bin now holds an item; the agent is informed (check) | Undo is itself undoable (J09) |

- **Decision points.** Revert one file or all. Reviewing in Code or in Chat. Reverting while the agent is still working.
- **Failure and edge branches.**
  - The file changed again after the agent's edit (the user's own edit): revert would discard it. The message must warn or refuse.
  - The file was deleted by the agent: revert recreates it.
  - The file was created by the agent: revert deletes it. The message must say so.
  - Drive ejected: the Changes list shows `?:\...` paths; Revert must be disabled with a reason (see J12).
  - Revert while the agent runs: define and show the result (the agent may rewrite the file).
  - Binary or very large file: diff shows a summary.
  - Folder is read-only: error names the file.
  - Code app open already with unsaved edits: conflict.
  - Agent Code tools "Agent is editing" marker while the user reviews.
- **Success measure.** P1 reverts the right file on the first try. P2 can review every changed file in one pass (keyboard reachable, next/previous change).
- **E2E coverage.** `chat.e2e.ts` ("lists the edited file under Changes in the chat and in Code"), `scripted-demo.e2e.ts` ("Changes list shows the file the agent wrote"). Missing: revert itself, revert-all, conflict, deleted/created cases, git status [planned].
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T08.1, T08.2 in `tasks.md`.

## J09 - Restore from the Recycle Bin

- **Personas.** P1, P2.
- **Trigger.** The user reverted too much, or wants to see what the agent had written.
- **Goal.** Get a reverted change back, exactly.
- **Preconditions.** J08 done.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Desktop | Double-clicks **Recycle Bin** (or Start -> Recycle Bin) | Window lists reverted items with path, chat and time | Item names with drive letters |
| 2 | Recycle Bin | Selects an item | Detail shows what would come back | Which version returns (the agent's) |
| 3 | Recycle Bin | Clicks **Restore this item** | Agent's version written back; item leaves the bin; change returns to Changes | Success feedback and where the file is |

- **Decision points.** Restore or leave. Restore over a newer file.
- **Failure and edge branches.**
  - The file has changed since the revert: restore overwrites. Confirm first.
  - The drive is not plugged in: restore disabled with reason (the path shows `?:\`).
  - Empty bin: empty-state text.
  - Agent calls `recycle_restore` (policy Ask): UAC dialog names it as the agent's action.
  - Is there "Empty Recycle Bin"? Windows users expect it. Decide and document the answer.
  - Large number of items.
- **Success measure.** Restore on the first try for P1 and P2. No silent overwrite.
- **E2E coverage.** None.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T09.1 in `tasks.md`.

## J10 - Tools follow apps (what can the agent touch?)

- **Personas.** P2, P1.
- **Trigger.** The user wants to know or change what the agent can use.
- **Goal.** Predict exactly what the agent can do, and change it by opening and closing apps.
- **Preconditions.** A connected desktop.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Top bar | Reads **Agent can use** chips | One chip per enabled group (Read files, Terminal, Notes...) | Chips are the whole truth about tools now; empty desktop shows an "open an app" hint |
| 2 | Start menu | Opens Terminal | Window opens; chip **Terminal** appears at once | A cause and an effect, in one glance |
| 3 | Terminal window | Closes it | Chip disappears; agent loses terminal tools | The chip goes away |
| 4 | Chat | Agent tries a closed tool | Refusal: "The Terminal app is closed. Call desktop_open_app..." | The agent is told, and may open the app by itself if **Agent may open apps** allows |
| 5 | Control Centre | Sets Agent may open apps to Ask or Never | Agent's `desktop_open_app` asks or fails | Link between app and policy |

- **Decision points.** Close an app to take a tool away. Deny or Ask in policy for a stronger guarantee than the window (policy is separate from open apps).
- **Failure and edge branches.**
  - Two windows of the same app: closing one must not remove the tool until the last window closes (README says last window).
  - App minimised: tool stays? The chip must stay and the doc must say so.
  - Tool origin: chip meaning for MCP versus ACP methods versus an agent's own built-in tools (honest limit). The UI must not imply a guarantee Agent7 cannot give. Check wording near the chips and in About.
  - Agent opened the app: chip and taskbar must show it (`opened_by agent`).
  - Chips overflow on a narrow window.
  - Chip colors only distinguish by color.
- **Success measure.** P2 correctly predicts the agent's available tools in a quiz after 2 minutes. The honest limit is found without the README.
- **E2E coverage.** `desktop-tools.e2e.ts`, `scripted-desktop-tools.e2e.ts`, `chat.e2e.ts` (first test). Missing: two windows of one app, minimized, honest-limit text.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T10.1, T10.2 in `tasks.md`.

## J11 - Pause and take control

- **Personas.** P2, P1.
- **Trigger.** The agent does something the user does not like, or the user wants to approve each step.
- **Goal.** Stop or constrain the agent immediately, and go back.
- **Preconditions.** An agent is working (for Pause) or any time (for Take control).

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Top bar | Clicks **Pause** | Running turns are cancelled; new tool calls are refused; status shows **Paused**; button becomes **Resume** | State is unmistakable (text, not only color) |
| 2 | Chat | Looks | Tool card shows Cancelled; turn ended; the agent is told | Work was interrupted, not completed |
| 3 | Top bar | Clicks **Resume** | Calls allowed again. The cancelled turn does NOT restart | User must send a prompt again; text says so |
| 4 | Top bar | Clicks **Take control** | Every tool call asks; button becomes **Release** | Every call will ask, so expect many dialogs |
| 5 | Start menu | Alternatively clicks **Pause agent** | Same as the top bar | Both controls agree |

- **Decision points.** Pause (stop now) or Take control (approve each). Release.
- **Failure and edge branches.**
  - The top bar is folded (pin off): Pause must stay reachable (Start menu, keyboard).
  - Pause with no running turn: allowed; shows Paused; explain what happens to the next prompt.
  - Pause while a permission request waits: request must resolve (cancel) cleanly.
  - Take control while Terminal is set to Allow: the user's choice wins; the chip or label says "asks every time".
  - State after disconnect and reconnect: Paused and Take control survive (persisted).
  - Another desktop is unaffected: say so.
  - Pause blocks the user's own app use? It must not.
- **Success measure.** P2 pauses within 2 seconds of deciding to. Nobody mistakes Resume for "continue the turn".
- **E2E coverage.** `desktop-tools.e2e.ts` ("Pause toggles the top bar between Idle and Paused"). Missing: pause while working, take control, pause with pending request, persistence.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T11.1, T11.2, T11.3 in `tasks.md`.

## J12 - Eject a drive

- **Personas.** P1, P3.
- **Trigger.** The user is done with a project or wants to cut the agent off from it.
- **Goal.** The agent can no longer touch that project, at once, and the user is sure of it.
- **Preconditions.** A plugged-in USB drive.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Tray | Clicks the **Safely Remove Hardware** icon | Menu lists drives with eject items | Drive name and letter |
| 2 | Tray menu | Clicks **Eject E:** | Drive disappears from Computer; tray balloon "safe to remove" (also in Action Center Messages) | Confirmation in a balloon |
| 3 | Chat | Agent's next call on E: | Tool call fails: `noDriveMessage`; warning in Event Viewer | The agent sees a clear refusal; the user sees a failed card |

- **Decision points.** Eject while a turn runs or wait for it. Eject C: (not allowed).
- **Failure and edge branches.**
  - Eject mid-turn: the running tool call is cancelled or fails. The user needs one explanation, not a stack of errors.
  - Chat's own cwd was on the drive: that chat is now stranded. Show a state in the chat status bar.
  - Open windows on the drive (Explorer, Code tabs, Notepad with unsaved text): define what happens to unsaved text.
  - Pending permission request for a file on the drive: cleared.
  - Changes of the agent to files on the ejected drive: remain in Changes with `?:\` (README). Revert disabled.
  - Plug in again later: it may get another letter; paths and chats should follow (design says changes follow).
  - Eject by keyboard (tray menu reachable?).
  - Only C: remains: tray icon disappears; focus must not be lost.
- **Success measure.** After eject, 100% of reviewers can say what the agent can still reach. No data loss in the unsaved-text case.
- **E2E coverage.** `explorer-usb.e2e.ts` ("Safely Remove from the tray ejects E: and its tile disappears"). Missing: eject mid-turn, stranded chat, open windows, re-plug, keyboard.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T12.1, T12.2 in `tasks.md`.

## J13 - Disconnect and reconnect while the agent runs

- **Personas.** P3, P2.
- **Trigger.** The user closes the desktop window, or leaves, while the agent works.
- **Goal.** Trust that nothing stops, get called back if the agent needs a decision, and return to the same screen.
- **Preconditions.** A running turn; a desktop window.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Desktop | Clicks the red Close of the connection bar (or **Start -> Disconnect**) | Window closes; the launcher is shown; agents keep running | Tooltip and launcher text say "agents keep running" |
| 2 | Launcher | Looks at the row | State: Running, then **Needs your approval (n)** | Row state follows the agent |
| 3 | OS | Gets a notification "Agent7: <desktop> needs your approval" | Click connects the desktop | The notification names the desktop and the reason |
| 4 | Desktop | Reconnects | Windows, chats, run state, pending requests restored; request dialog reappears | The same screen as left; pending request visible |

- **Decision points.** Disconnect or Pause first. Connect from the notification or the launcher.
- **Failure and edge branches.**
  - OS notifications disabled or in Do Not Disturb: the launcher row is the fallback. Check the launcher is visible (is it hidden when all desktops are connected?).
  - Notification click when the app was quit: define.
  - Quit the whole app (Alt+F4 on the last window) while agents work: does it warn? Quit must warn when agents are running or a request waits.
  - Agent finishes while disconnected: launcher row shows Idle and a "done" cue? Check.
  - Agent crashes while disconnected: row shows Error.
  - Reconnect during a turn: the transcript must continue streaming, not duplicate or lose rows.
  - Thumbnail stale (60 s refresh, on disconnect): label as a picture, not live.
  - Network lost while disconnected: error state and retry on reconnect.
  - Multiple notifications from one desktop: collapse.
- **Success measure.** No lost or duplicated messages after reconnect. P3 returns to the right desktop from the notification in one click.
- **E2E coverage.** `launcher.e2e.ts` (disconnect, reconnect), `desktop-shell.e2e.ts` (close button disconnects, tooltip). Missing: reconnect mid-turn, notification, quit warning, Needs your approval row state.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T13.1, T13.2 in `tasks.md`.

## J14 - Manage several desktops

- **Personas.** P3.
- **Trigger.** The user works on more than one project or agent.
- **Goal.** See the state of all desktops, switch quickly, keep them apart.
- **Preconditions.** Two or more desktops.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Launcher | Scans the list | Row per desktop: thumbnail, name, state dot and text, projects, last used | State and Connected label per row |
| 2 | Launcher | Selects, clicks **Show Options** | Details: chats, drives, created, last used, Disconnect | Details match the row |
| 3 | Launcher | Clicks **Rename...** (F2) | Dialog; unique name required | Rename done in the row |
| 4 | Desktop | **Start -> Switch desktop...** | Launcher appears; this desktop stays open | Both windows are separate OS windows |
| 5 | OS | Alt+Tab between desktop windows | Each window titled with the desktop name | The window title tells which desktop |

- **Decision points.** Connect more than one at once. Same project on two desktops. One agent per desktop.
- **Failure and edge branches.**
  - Two desktops on the same project at once (two agents writing the same files): warn?
  - Same agent in several desktops: one process per (desktop, agent); Task Manager shows them.
  - Rename to an existing name: inline error.
  - Last-open desktops reopen at launch: many windows at start; where do they appear (multi-monitor)?
  - Launcher many rows: list scroll, keyboard select, type-ahead.
  - Settings scope: are permissions global or per desktop? The UI must say which (see J16).
- **Success measure.** P3 identifies the desktop that needs him in under 3 seconds with 4 desktops.
- **E2E coverage.** `desktop-shell.e2e.ts` ("Switch desktop shows the launcher and keeps this desktop open"), `launcher.e2e.ts`. Missing: rename, details, several desktops, launch with many open.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T14.1, T14.2 in `tasks.md`.

## J15 - Delete a desktop

- **Personas.** P3, P4.
- **Trigger.** The user is finished with a desktop.
- **Goal.** Remove it with no surprise: know what is lost and what stays.
- **Preconditions.** A desktop, connected or not.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Launcher (or Start -> Disconnect arrow -> Delete desktop...) | Clicks **Delete...** | Message box: delete the desktop? | Text says the C: drive, chats, notes and logs are removed and project folders stay |
| 2 | Message box | Clicks **Yes** (or No) | Agents stopped; rows and app-data folder removed; project folders only ejected | Desktop leaves the list; selection moves sensibly |

- **Decision points.** Yes or No. Default button should be No.
- **Failure and edge branches.**
  - The agent is running or a request waits: the message must say so.
  - The desktop window is open: it closes first.
  - Files on C: the user wants (agent output in `C:\Users\Agent\Documents`): the message must warn. No undo exists (no trash for desktops).
  - Delete fails (locked folder, Windows file handles): clear error; the row state must be consistent.
  - Deleting the last desktop: back to the empty launcher state (J01).
- **Success measure.** Zero unintended deletions in testing. P4 can say what is lost after reading the box.
- **E2E coverage.** `launcher.e2e.ts` ("deletes a desktop after confirming"), `desktop-shell.e2e.ts` ("Delete desktop asks first"). Missing: running agent, default button, failure.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T15.1 in `tasks.md`.

## J16 - Choose permissions (Control Centre)

- **Personas.** P2.
- **Trigger.** The user wants more or less autonomy for the agent.
- **Goal.** Set Allow, Ask or Deny per tool group and know when it applies.
- **Preconditions.** A connected desktop.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Start | **Start -> Control Centre** | Window opens on home or last page | Pages: Agents, Permissions, Appearance, About |
| 2 | Permissions | Reads the table | 13 rows with Setting and "What it covers" | The defaults and what is risky |
| 3 | Permissions | Changes a Setting | **Apply** and **Cancel** enable | Change is pending, not saved |
| 4 | Permissions | Clicks **Apply** | Policy saved; takes effect for the next tool call | Applies now? Applies to all desktops? Say so |
| 5 | Chat | Next agent call | Ask shows UAC with the reason "... is set to Ask in Control Centre" | Reason links back to the setting |

- **Decision points.** Allow, Ask, Deny per group. Whether to trust Read files = Allow (reads all plugged drives silently).
- **Failure and edge branches.**
  - Close the window with pending changes: ask to save.
  - Apply fails (database): error, setting unchanged.
  - Deny: the agent's call fails with a message the agent can pass on to the user.
  - Policy change while a request waits: pending request stays as asked or resolves? Define.
  - Table row labels "Code" and "Notepad" overlap with Write files. Explain precedence: does Write files = Ask also gate Code writes? The "What it covers" text must be exact.
  - Keyboard: comboboxes reachable in order.
  - Copy: "may" and "Centre" spelling conflicts with the style guide and with "Action Center". Check.
- **Success measure.** P2 sets Terminal to Deny and confirms the effect in a test turn in under 2 minutes. No ambiguity on scope.
- **E2E coverage.** `chat.e2e.ts` sets the terminal policy through the API in setup only. Missing: any UI test of the Permissions page.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T16.1, T16.2 in `tasks.md`.

## J17 - Add and choose agents

- **Personas.** P3.
- **Trigger.** The user wants a different agent or model, or a custom ACP agent.
- **Goal.** Register an agent, make it the default, and use it.
- **Preconditions.** Control Centre open.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Control Centre -> Agents | Clicks **Add...** | **Add Agent** dialog | Fields: Name, Command, Arguments (one per line), Environment (KEY=VALUE) |
| 2 | Add Agent | Fills in, clicks **OK** | Agent listed | Does Agent7 test the command? Show the result |
| 3 | Agents | Selects, clicks **Set as Default** | Marked default | New desktops use it; existing desktops keep theirs (say so) |
| 4 | New desktop dialog | Picks the agent (J02) | Agent chosen | |
| 5 | Chat | Starts a chat | Agent starts (J04) | Failures name the command |

- **Decision points.** Which default. Edit built-in agents (edits are kept; paths refresh).
- **Failure and edge branches.**
  - Command not found: error at add time or at first chat. Prefer both.
  - Agent not speaking ACP (missing `--experimental-acp`): hang. A timeout and hint are needed.
  - Secrets in Environment: shown in clear text? Mask or warn.
  - Edit or delete the agent that a running desktop uses: define.
  - Delete the default agent: another becomes default, or a warning.
  - Duplicate names.
  - Claude Code sign-in missing.
- **Success measure.** P3 adds an agent and gets a first reply in under 2 minutes. A broken command yields a message with the cause.
- **E2E coverage.** `scripted-builtin.e2e.ts` (built-in registered). Missing: Add dialog, set default, bad command.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T17.1, T17.2 in `tasks.md`.

## J18 - A2UI surfaces: inline, sidebar, window

- **Personas.** P1, P4.
- **Trigger.** The agent draws a form, table or review with `a2ui_render` and a target.
- **Goal.** Use the agent's UI like any Windows form and send an answer back.
- **Preconditions.** A running chat. Planned: the targets (inline, sidebar, window) and the Move to and Delete commands are in flux.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Chat | Sees a surface | **Inline:** rows in the transcript. **Sidebar:** a side pane with tab and a chat row. **Window:** its own desktop window with a chat row | Where the surface is, and that the agent made it |
| 2 | Surface | Types, ticks, clicks a button | Action (with data model) goes to the agent; the agent answers | The agent received it (visible acknowledgement) |
| 3 | Chat row | Clicks **Open**, **Close**, **Move to**, **Delete** | Surface moves, hides or is deleted (Delete asks) | Closing a window hides, does not destroy |
| 4 | Surface | Agent updates it | Data changes; closed windows do not reopen; the agent is told it is closed | No focus theft |

- **Decision points.** Answer now or later. Move a surface to another target.
- **Failure and edge branches.**
  - Invalid or unknown component: fallback row with a plain message, not a blank area.
  - Surface from an old turn: still clickable? Mark stale or disabled once answered.
  - Double-click on a button: one action, not two.
  - Data entered then agent updates: the user's input is not wiped silently.
  - Keyboard focus into and out of a surface; tab order matches reading order.
  - Many surfaces: chat rows list scroll.
  - Agent-drawn controls must keep Win7 look and contrast.
  - Surface asks for secrets or fakes a system dialog (spoofing a UAC dialog): the agent window chrome must differ from the system dialogs. Check.
  - Agent crash with a surface open: show disabled state.
- **Success measure.** A P4 user completes a three-field form and sees the agent's reply with no help. Surface actions are never lost or doubled.
- **E2E coverage.** `scripted-a2ui.e2e.ts` (inline, sidebar, window, move to, delete). Missing: invalid component, stale surface, keyboard, spoofing review.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T18.1, T18.2 in `tasks.md`.

## J19 - Browse with the Browser

- **Personas.** P1, P2.
- **Trigger.** The user or the agent needs a web page.
- **Goal.** Use a browser on the desktop and know when the agent uses it.
- **Preconditions.** Browser app open. Network available.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Start | **Start -> Browser** | Window with address bar, Back, Forward, Refresh; chip **Browser** appears | The agent can now browse (chip) |
| 2 | Browser | Types an address, presses Enter | Page loads with progress | Loading state and title |
| 3 | Browser | Agent navigates | Address and page change; the taskbar or window shows agent activity | Agent drove it, not the user |
| 4 | Browser | User signs in to a site | Cookies in the shared partition `persist:agent7-browser` | The agent can see that session! The UI must say the agent shares the page |

- **Decision points.** Close the Browser to remove agent browsing. Sign in or not.
- **Failure and edge branches.**
  - No network or DNS failure: error page in Win7 style, with Refresh.
  - Invalid address or search words: define (search or error).
  - Certificate error: warning with a safe default.
  - Pop-ups, downloads, file:// links, new windows: blocked or handled; never open the host browser silently.
  - Agent clicks while the user types: conflict (user in control state).
  - Browser tools set to Ask: dialogs show the URL.
  - Page content may carry prompt injection: the agent reads untrusted text. Note the risk; show the URL in every request.
- **Success measure.** P1 loads a page in 2 steps. P2 can tell when the agent is reading or clicking.
- **E2E coverage.** `apps.e2e.ts` opens each app from Start (includes Browser if listed; check). None for navigation or errors.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T19.1, T19.2 in `tasks.md`.

## J20 - Investigate a problem (Event Viewer, Task Manager)

- **Personas.** P2, P3.
- **Trigger.** The agent did something unexpected, or is stuck.
- **Goal.** Find what happened and why, or end a stuck process.
- **Preconditions.** Some traffic in the desktop.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Start -> System Tools | Opens **Event Viewer** | Rows for ACP, AG-UI, MCP messages with level, source, chat | Newest events, filters by chat, source, level, text |
| 2 | Event Viewer | Filters, selects a row | Details pane shows the message | Warning rows for refusals (drive ejected, app closed) |
| 3 | Start -> **Task Manager** | Opens it | Chats, agent processes, terminals, context use | Which process belongs to which chat |
| 4 | Task Manager | Selects process, **End process** | Process ends after a confirmation; chats show Error or disconnected | Consequence for chats; recover with J23 |

- **Decision points.** Filter. End process or Pause (gentler).
- **Failure and edge branches.**
  - Ring buffer of 5,000 events per desktop: the oldest events are lost. Say so in the window.
  - The events are in memory: gone after restart. Say so.
  - Sensitive data in the log (file contents, prompts, API keys in env): review and redact. P2 cares.
  - Huge payloads: truncate with "show full".
  - Copy or export: does it exist? A reviewer will want it.
  - End process on the wrong agent: confirmation names chats affected.
  - Event Viewer empty: empty state.
- **Success measure.** P2 finds the reason for a given refusal in under 1 minute. P3 ends a stuck agent and continues in under 1 minute.
- **E2E coverage.** `chat.e2e.ts` ("the Event Viewer logged the traffic of the turn"). Missing: filters, details, Task Manager, End process.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T20.1, T20.2 in `tasks.md`.

## J21 - Keyboard-only operation

- **Personas.** P3 (and any user with a motor or vision need).
- **Trigger.** The user does not or cannot use the mouse.
- **Goal.** Do J01 to J16 without the mouse.
- **Preconditions.** None.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Launcher | Up/Down, Enter, F2, Delete, Alt+accelerator, Tab | Selection moves; focus ring visible | Focus is always visible and in a logical order |
| 2 | Desktop | Ctrl+Esc, arrows, Enter on icons, Alt+F4, Tab between windows | Start opens; focus enters the menu | No focus trap; Esc returns focus to where it came from |
| 3 | Chat | Types, Enter, Shift+Enter; Tab to Stop, Tasks and changes | Message sent | Send and Stop reachable; transcript scrollable by keys |
| 4 | UAC dialog | Appears | Focus moves into the dialog; Allow, Deny, Not now reachable; Esc closes | The dialog gets focus and returns it |
| 5 | Tray, Action Center, Safely Remove | Reach with keys | Popups open and close with keys | Tray items focusable |
| 6 | Windows | Move, resize, minimize without a mouse (Alt+Space menu, arrow keys) | Window menu | Windows 7 has these; the virtual windows need them too |

- **Decision points.** None; this is a cross-cutting check.
- **Failure and edge branches.**
  - Focus lost after a dialog closes or a window is removed.
  - Agent-opened windows steal the keyboard focus while typing.
  - Context menus (right click on drives) have no key (Shift+F10, Menu key).
  - Drag-only operations (snap, maximize by dragging, sticky note move).
  - Webview (Browser) traps Tab.
  - Canvas (Agent Paint, thumbnail) has no keyboard alternative: accept consciously.
  - Shortcuts that clash with the OS or screen readers.
  - README says Alt shows access keys: verify underlines.
- **Success measure.** All of J01 to J16 are completable by keyboard. Zero focus traps. Visible focus on every stop.
- **E2E coverage.** `apps.e2e.ts` (menu shortcuts inside windows only). Missing: all other keyboard flows.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T21.1 in `tasks.md`.

## J22 - First-time help and discoverability

- **Personas.** P4.
- **Trigger.** The user does not know what to do next, or what a thing means.
- **Goal.** Find an answer in under 10 seconds without leaving Agent7. **[planned]** Agent7 gets a Help and Support app that renders the per-app manuals in `docs/help/<app>.md`. F1 is context-sensitive: it opens the topic of the focused app or dialog. Start has a **Help and Support** entry with search. The manuals cover every control (coverage script).
- **Preconditions.** Any screen.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Any window | Presses **F1** | Opens help for the focused window (or opens a Help window) | Windows users expect F1. Today the README lists no F1; treat as a gap to check |
| 2 | Start menu | Looks for Help and Support | An entry such as **Help and Support** or About | The entry exists and opens the guide |
| 3 | Control Centre -> About | Reads | Version, links, honest limit | Where to report bugs |
| 4 | Hover | Hovers over buttons and chips | Tooltips with plain text | Tooltips explain chips like **Agent can use** |
| 5 | Empty states | Looks at empty Chat, Explorer, Recycle Bin, Event Viewer | Text tells the next step | No blank panes |

- **Decision points.** Read a tooltip, use F1, open the README outside the app.
- **Failure and edge branches.**
  - The README lives on GitHub and requires a network: the shipped disk must carry help offline (the manuals ship inside the app).
  - F1 in an app with no manual, in a dialog, or with no window focused: must open a sensible topic (the index), never nothing.
  - A control with no entry in the manual (coverage gate fails the build).
  - Manual search with no result: say so and offer the index.
  - Manual out of date with the UI: the coverage script reports stale ids.
  - Jargon in the UI (ACP, MCP, A2UI, "turn", "tool group", "context"): replace or explain.
  - Help out of date with the UI (screenshots).
  - Language: US English only; confirm.
- **Success measure.** P4 finds the answer to three set questions ("how do I undo a change", "what can the agent do now", "how do I stop it") in under 30 seconds each.
- **E2E coverage.** None.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T22.1, T22.2 in `tasks.md`.

## J23 - Recover from errors

- **Personas.** P4, P2.
- **Trigger.** Something goes wrong: agent crash, disconnect from the agent, no network, a tool failing, a failed save.
- **Goal.** Understand what happened, that no work was lost, and what to do next in one click.
- **Preconditions.** Any.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Chat | Agent process exits unexpectedly | Error row with cause; composer shows state; **Retry** or reconnect offered | Plain words; no stack trace; where to look (Event Viewer) |
| 2 | Chat | Network lost during a turn | Error row; turn ends; the user can resend | Message not lost; can edit and resend |
| 3 | Tool card | Tool fails | Card shows Failed with a short reason; **Show** gives details | The failure and its reason |
| 4 | Launcher | App restarts after a crash | Desktops come back; running states reset; the chats can be reattached | Nothing was lost |
| 5 | Task Manager | End process, then new prompt | Agent restarts on the next prompt | Recover without restarting the app |

- **Decision points.** Retry, resend, restart agent, report issue.
- **Failure and edge branches.**
  - Agent crashes repeatedly: do not loop silently; stop and say so.
  - Database corrupt or migration fails: offer a safe backup path; never wipe silently.
  - Disk full on C: or project drive: error names the drive.
  - Permission denied by the OS on a project folder.
  - Drive ejected mid-turn (J12), disconnect mid-turn (J13).
  - Time-outs: agent never answers; a visible "still working" and an end.
  - Webview crash (Browser).
  - Window or renderer crash: Electron recovers the window and reloads the state.
  - Error text copyable for issue reports; link to GitHub issues exists in README only.
- **Success measure.** For each injected failure, a P4 reviewer names the cause and the next step from the screen alone. No data loss.
- **E2E coverage.** `scripted-errors.e2e.ts` (error row, refusal, max tokens, cancelled, expect failure, Stop). Missing: agent crash, no network, restart, retry.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T23.1, T23.2 in `tasks.md`.

## J24 - Read code, git status and the gutter [planned]

- **Personas.** P1, P2, P3.
- **Trigger.** The user wants to read project code and see what changed, by the agent or in git.
- **Goal.** Navigate files, read code with colors, see git status and line-level changes, review a diff.
- **Preconditions.** A project with a Git repository plugged in. The new Code app (Code::Blocks-style layout) is built.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Start | **Start -> Code** | Code opens: project tree on the left, editor tabs in the center, messages and changes area at the bottom | Layout is familiar to IDE users |
| 2 | Tree | Opens a folder and a file | Tab opens; syntax colors; status bar shows line, column, language | Files with git status marks (modified, new, ignored) |
| 3 | Editor | Scrolls | Gutter shows line numbers and change marks (added, changed, removed) | Marks come from git or from the agent? They must be distinguishable |
| 4 | Changes area | Selects a changed file | Diff view; **Revert** | Agent-changed versus git-changed |
| 5 | Editor | Agent edits the open file | "Agent is editing" marker; the text updates; user edits conflict handling | The user is told before typing over the agent |

- **Decision points.** Edit by hand or leave it to the agent. Revert by Code or by chat (J08).
- **Failure and edge branches.**
  - Not a Git repository, or Git not installed: status marks absent with a plain notice, not an error.
  - Large repository or file: tree and status load asynchronously with progress; the UI stays responsive.
  - Binary files and huge files: not opened as text.
  - Detached HEAD, merge conflicts, submodules: marks and wording.
  - Drive ejected with tabs open (J12).
  - Unsaved user edits and an agent write to the same file.
  - Colors of git marks versus contrast and color blindness (marks need shape or text, too).
  - The agent has no `code_*` tools if Code is closed (J10).
- **Success measure.** P2 reviews all changes of a turn in Code in one pass. P1 finds the changed line from the gutter at once.
- **E2E coverage.** `chat.e2e.ts` (Code lists the edited file), `apps.e2e.ts` (opens Code). The new layout, git status and gutter have none yet.
- **Docs and panel.** Manual topics for each app used (`docs/help/<app>.md`) must name every control of this journey. Panel tasks: T24.1, T24.2 in `tasks.md`.
