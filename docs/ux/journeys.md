# Agent7 Key User Journeys

Status: discovery. Personas are in `personas.md`, scoring in `rubric.md`, the process in `process.md`.

J25 to J31 cover the features added after this plan: Code Review, the chat pane, the Browser with web apps, the standard menu bars with right-click menus and About, and in-app Help. They were written against the built app and need no planned feature.

Planned features are included where they change a journey: A2UI surface targets (inline, sidebar, window) and the new Code app (Code::Blocks-style layout, git status, change gutter). Steps that depend on them are marked **[planned]**. Re-verify those steps against the built app before scoring.

## How to read a journey

Each journey also has panel tasks in `tasks.md` (T-numbers) and a manual topic in `manuals/<app>.md` for each app it touches; docs are part of the evidence (D11). Each journey has: id, personas, trigger, goal, preconditions, happy path (table: screen, user action, system response, what the user must notice), decision points, failure and edge branches, success measure, and existing e2e coverage.

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
| J10 | Agents work quietly (what is it doing, what can it use?) [planned] | P2, P1 |
| J11 | Pause and take control | P2, P1 |
| J12 | Eject a drive | P1, P3 |
| J13 | Disconnect and reconnect while the agent runs | P3, P2 |
| J14 | Manage several desktops | P3 |
| J15 | Delete a desktop | P3, P4 |
| J16 | Choose permissions (Control Center) | P2 |
| J17 | Add and choose agents | P3 |
| J18 | A2UI surfaces: inline, sidebar, window | P1, P4 |
| J19 | Browse with the Browser | P1, P2 |
| J20 | Investigate a problem (Event Viewer, Task Manager) | P2, P3 |
| J21 | Keyboard-only operation | P3 |
| J22 | First-time help and discoverability | P4 |
| J23 | Recover from errors | P4, P2 |
| J24 | Read code, git status and the gutter [planned] | P1, P2, P3 |
| J25 | Review the agent's changes in Code Review | P2, P1 |
| J26 | Send review comments to a chat, and comment yourself | P2, P1 |
| J27 | Ask the chat pane about what you are looking at | P1, P4 |
| J28 | Let the agent use a web app in the Browser | P1, P2 |
| J29 | Browse with tabs and recover from a bad page | P1, P4 |
| J30 | Use menus, right-click and About in any app | P4, P3 |
| J31 | Get help from inside an app (Help menu and F1) | P4 |
| J32 | An agent shows you something | P1, P4 |
| J33 | Hear about what the agents made | P2, P3 |
| J34 | Follow an agent as it works | P3, P1 |

J10 and J32 to J34 come from `docs/AGENT_PRESENCE.md` (Work, Show, Output). J10 replaces "Tools follow apps"; every PR of that plan has landed.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T01.1 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T02.1, T02.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T03.1 in `tasks.md`.

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
  - Agent not installed or command fails (ENOENT, `npx` missing): the chat must show an error row with a next step (Control Center -> Agents) and keep the composer disabled with a reason.
  - Agent crashes at start: error with Retry. Check there is a Retry.
  - Not signed in (Claude Code auth, no API key): the agent's message must reach the user in plain words.
  - No network on first `npx` download: progress, then a timeout message.
  - Chosen drive was ejected between dialog and start: refusal message names the drive.
  - Many chats: Recent chats list length, search box.
- **Success measure.** Chat window ready within 5 seconds (warm) and the user can name the folder the chat works in.
- **E2E coverage.** `desktop-shell.e2e.ts` (chat on a drive, on C:, from Explorer), `chat.e2e.ts`, `scripted-builtin.e2e.ts`. Missing: agent not installed, auth failure, recent chats.
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T04.1, T04.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T05.1, T05.2 in `tasks.md`.

## J06 - Approve or deny a request (chat and UAC dialog)

- **Personas.** P2, P4.
- **Trigger.** The agent calls a tool whose permission is **Ask**, or Take control is on.
- **Goal.** Decide with full knowledge: what, where, why, and the effect of each answer.
- **Preconditions.** J05. Policy Ask for Write files or Terminal.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Desktop | Is looking elsewhere | Desktop dims; the **User Account Control**-style dialog appears; taskbar flashes; Action Center flag shows a red count; chat shows the request and status "Waiting for permission" | A request is waiting and the agent is blocked |
| 2 | UAC dialog | Reads question, target and reason | Shows "Do you want to allow the agent to edit src/auth/redirect.ts?" and "Writing files is set to Ask in Control Center." | Actor, action, target, reason |
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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T06.1, T06.2, T06.3 in `tasks.md`.

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
| 5 | Action Center | Clicks **Open Control Center** | Control Center opens on Permissions | Link to change the policy |

- **Decision points.** Answer all or one. Open the Control Center to loosen or tighten a policy.
- **Failure and edge branches.**
  - Zero requests: empty-state text, not a blank popup.
  - Popup closes on blur while the user reads: it must be easy to reopen; keyboard Esc closes and returns focus to the flag.
  - Many requests (20+): scroll and a "deny all" or per-chat filter? Decide and document.
  - Same request listed twice or stale rows after Stop.
  - Flag is tiny: target size and contrast of the red count.
- **Success measure.** Time from "count appears" to "answered" under 5 seconds with the mouse and under 8 with the keyboard.
- **E2E coverage.** `chat.e2e.ts` ("a second request can be approved from the Action Center through the UAC dialog"). Missing: messages list, empty state, many requests, keyboard.
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T07.1 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T08.1, T08.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T09.1 in `tasks.md`.

## J10 - Agents work quietly (what is it doing, what can it use?) [planned]

Replaces "Tools follow apps" (`docs/AGENT_PRESENCE.md`, section 4). Agents work out of sight; the desktop does not move unless the operator asks.

- **Personas.** P2, P1.
- **Trigger.** An agent is working and the user wants to know what it is doing, what it did, or what it is allowed to use.
- **Goal.** Answer "what is it doing" and "what did it do" in at most two clicks, with no window opening on its own, and know what the agent can use from the policy.
- **Preconditions.** A connected desktop with a project; an agent reads, searches, edits and runs commands in a turn; no Code, Explorer or Terminal window open.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Desktop | Watches while the agent works | No window opens or takes focus. The top bar reads "Working: reading auth.ts" | The desktop stays theirs; the step is in plain words |
| 2 | Top bar | Clicks the working link (`topbar-working-link`) | The chat doing the work comes to the front | Where the work happens |
| 3 | Chat | Reads the tool rows | One row per step, repeats merged, each with **Show in Code**, **Show diff** or **Show in Terminal** | Every step is there, in order |
| 4 | Chat | Clicks **Show in Code** on a read row | Code opens at the lines that were read, highlighted | Exactly what the agent looked at |
| 5 | InfoPanels | Clicks an activity row | Same action as the tool row | A second way in, from anywhere |
| 6 | Code (open on `auth.ts`) | Keeps reading while the agent edits `auth.ts` | The file reloads in place; changed lines flash briefly; tab, scroll and caret stay | Live change without losing their place |
| 7 | Top bar | Reads **Agent can use** | Chips show the policy (Allow, Ask, Deny) per group, not open apps | What the agent may use, and that the policy decides it |

- **Decision points.** Look now (tool row, feed) or later (Event Viewer). Restrict with the Control Center policy (Deny or Ask), not by closing windows.
- **Failure and edge branches.**
  - Several agents working: the top bar reads "3 agents working" and opens the agents popup (`topbar-agents-menu`) with one row per agent.
  - The agent edits a file that is open in Code but not the active tab: no tab switch; the tab shows a changed marker.
  - The user is typing in another window when the agent starts: nothing takes focus (typing grace).
  - The honest limit: an agent's own built-in tools that do not go through ACP are not gated by policy. The wording near the chips and in About must say so.
  - A tool set to Deny: the agent is refused with a plain message; the tool row says Denied.
  - Chips overflow on a narrow window; chips never rely on colour alone.
- **Success measure.** P2 says what the agent did in the last turn, and shows one read in Code, in under 30 seconds, and no window opened during the turn without a user action.
- **E2E coverage.** Planned: `e2e/search.e2e.ts` and `e2e/scripted-desktop-tools.e2e.ts` rewritten to assert that no window opens; `e2e/desktop-tools.e2e.ts` for policy chips.
- **Docs and panel.** `manuals/desktop.md`, `manuals/chat.md`, `manuals/code.md`, `manuals/control-centre.md`, README chapter 6. Panel tasks: T10.1, T10.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T11.1, T11.2, T11.3 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T12.1, T12.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T13.1, T13.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T14.1, T14.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T15.1 in `tasks.md`.

## J16 - Choose permissions (Control Center)

- **Personas.** P2.
- **Trigger.** The user wants more or less autonomy for the agent.
- **Goal.** Set Allow, Ask or Deny per tool group and know when it applies.
- **Preconditions.** A connected desktop.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Start | **Start -> Control Center** | Window opens on home or last page | Pages: Agents, Permissions, Appearance, About |
| 2 | Permissions | Reads the table | 13 rows with Setting and "What it covers" | The defaults and what is risky |
| 3 | Permissions | Changes a Setting | **Apply** and **Cancel** enable | Change is pending, not saved |
| 4 | Permissions | Clicks **Apply** | Policy saved; takes effect for the next tool call | Applies now? Applies to all desktops? Say so |
| 5 | Chat | Next agent call | Ask shows UAC with the reason "... is set to Ask in Control Center" | Reason links back to the setting |

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T16.1, T16.2 in `tasks.md`.

## J17 - Add and choose agents

- **Personas.** P3.
- **Trigger.** The user wants a different agent or model, or a custom ACP agent.
- **Goal.** Register an agent, make it the default, and use it.
- **Preconditions.** Control Center open.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Control Center -> Agents | Clicks **Add...** | **Add Agent** dialog | Fields: Name, Command, Arguments (one per line), Environment (KEY=VALUE) |
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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T17.1, T17.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T18.1, T18.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T19.1, T19.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T20.1, T20.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T21.1 in `tasks.md`.

## J22 - First-time help and discoverability

- **Personas.** P4.
- **Trigger.** The user does not know what to do next, or what a thing means.
- **Goal.** Find an answer in under 10 seconds without leaving Agent7. **[planned]** Agent7 gets a Help and Support app that renders the per-app manuals in `manuals/<app>.md`. F1 is context-sensitive: it opens the topic of the focused app or dialog. Start has a **Help and Support** entry with search. The manuals cover every control (coverage script).
- **Preconditions.** Any screen.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Any window | Presses **F1** | Opens help for the focused window (or opens a Help window) | Windows users expect F1. Today the README lists no F1; treat as a gap to check |
| 2 | Start menu | Looks for Help and Support | An entry such as **Help and Support** or About | The entry exists and opens the guide |
| 3 | Control Center -> About | Reads | Version, links, honest limit | Where to report bugs |
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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T22.1, T22.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T23.1, T23.2 in `tasks.md`.

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
- **Docs and panel.** Manual topics for each app used (`manuals/<app>.md`) must name every control of this journey. Panel tasks: T24.1, T24.2 in `tasks.md`.

## J25 - Review the agent's changes in Code Review

- **Personas.** P2, P1.
- **Trigger.** The agent changed files in a Git project and the user wants a second opinion before accepting them.
- **Goal.** See every changed line, read what the reviewer agent says about it, and know the verdict.
- **Preconditions.** A Git project plugged in with changed and new files. A connected desktop. The reviewer agent is the default agent (script `review`).

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Start | **Start -> Code Review** (or **Review changes** in Code) | A Code Review window opens: a file outline on the left, a banner with the base (HEAD) and the reviewer working | That a reviewer started by itself, and against what (HEAD) |
| 2 | Code Review, outline | Reads the file list | Changed files with status (modified, new) and counts of added and removed lines | Which files changed and how much |
| 3 | Code Review | Opens a file | WinDiff-style diff: removed lines red, added lines yellow, a margin bar, comment threads inline | Colors are explained by words (Added, Removed), not by color only |
| 4 | Code Review | **F7** or **Next change** | The selection steps to the next change | The keyboard path and the position in the file |
| 5 | Code Review | Reads the verdict and the comment list | Verdict (Changes requested), comment count, severity of each comment (Blocker, Minor) | Who wrote each comment and how serious it is |

- **Decision points.** Outline or expanded view. Inline or split layout. Which file to open first. Trust the reviewer or read the diff.
- **Failure and edge branches.**
  - Not a Git repository, or no changes: the outline says so in plain words and offers a next step.
  - The reviewer agent is slow or fails: the banner shows working, then an error with a cause and Refresh.
  - A file is binary or too large: the diff says it is not shown, with the reason.
  - The base ref is wrong (a typo): the error names the ref.
  - The reviewer comments on a line that is gone: the comment appears under "orphans" and not silently.
  - The agent edits files while the user reads: the diff refreshes or says it is out of date.
  - A review of a drive that is ejected (J12).
  - The reviewer is the same agent that wrote the change: the user cannot tell that it is a second opinion (trust).
- **Success measure.** P2 names the blocking comment and its line in under 1 minute. P1 finds the verdict without help.
- **E2E coverage.** `code-review.e2e.ts` (outline, threads, verdict, margin, F7, split). Missing: errors, ejected drive, binary files, keyboard-only.
- **Docs and panel.** Manual topic `manuals/code-review.md`. Panel tasks: T25.1, T25.2, T25.3 (the chat you ask does the review, UX-193) in `tasks.md`.

## J26 - Send review comments to a chat, and comment yourself

- **Personas.** P2, P1.
- **Trigger.** The user agrees with the reviewer and wants the work fixed, or wants to add a remark of their own.
- **Goal.** Get the open comments to a chat in one pass, and leave an own comment that the chat gets later.
- **Preconditions.** A review with open comments (J25). At least one chat on the desktop.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Code Review | Opens the comment list (**View > Comments**) | A list of comments with state (Open) and **Send to chat** per comment and **Send all** | How many comments are open |
| 2 | Code Review | **Send all open comments** | The Send to chat dialog lists the chats and **New chat** | Which chat gets it; the default is the safe one |
| 3 | Send dialog | Picks a chat, **Send** | The chat shows the comments as the user's message and the agent answers; comments change to Sent | The chat window got the text and the comments say Sent |
| 4 | Code Review diff | Clicks the **+** in the gutter of a line | A comment box opens on that line | Which line it belongs to; Cancel and Submit |
| 5 | Comment box | Types and submits | The comment appears as a thread by You, state Open | It is not sent yet; Send to chat later |
| 6 | Thread | **Reply**, **Resolve**, **Delete** | State changes; Resolve hides it from Send all | What Resolve means for sending |

- **Decision points.** Which chat. New chat or an existing one. Send one or all. Resolve before sending.
- **Failure and edge branches.**
  - No chat open: the dialog offers New chat and says why.
  - The chat is busy with a turn: the message queues or the dialog says so.
  - Send twice: sent comments are not sent again; the dialog says how many go out.
  - An empty comment: Submit is disabled with a reason.
  - Delete a comment: asks first or can be undone.
  - A very long comment or a file name: wraps, does not break the layout.
  - The chat agent is not the reviewer and has no `review_*` tools: the prompt still reads well.
- **Success measure.** P2 sends all open comments in 3 actions. P1 leaves an own comment on a given line without help.
- **E2E coverage.** `code-review.e2e.ts` (Send all to a chat, comments become sent). Missing: own comments, reply, resolve, delete, New chat, busy chat.
- **Docs and panel.** Manual topic `manuals/code-review.md`. Panel tasks: T26.1, T26.2 in `tasks.md`.

## J27 - Ask the chat pane about what you are looking at

- **Personas.** P1, P4.
- **Trigger.** The user reads a file, a page or a log and has a question about it.
- **Goal.** Ask the assistant a short question about the open thing without leaving the window and without cluttering the chat list.
- **Preconditions.** An app window with a chat pane (Code, Notepad, Explorer, Browser and others; not Chat, Code Review or an agent window). A connected desktop with an agent.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | App window | Selects text and **right-clicks** | Context menu with **Explain this** and **Ask chat...** | The items are about the selection |
| 2 | Context menu | **Explain this** | The pane opens on the right, the question is sent with the selection and the open file | The answer appears in the same window |
| 3 | App window | **View > Chat pane** or **Ctrl+Shift+C** | The pane opens or closes | The shortcut is shown in the menu |
| 4 | Pane | Reads the blank pane | Text says the conversation ends when the window closes; suggestion chips | What the pane is for, and that it is short-lived |
| 5 | Pane | **New conversation** | The conversation is deleted and the pane is blank again | That the old text is gone |
| 6 | Pane | **Hide the chat panel** | The pane collapses to a slim button on the window edge | How to bring it back |

- **Decision points.** Pane or full Chat window (**Open in Chat window**). Use a chip or type.
- **Failure and edge branches.**
  - No agent connected or the agent fails to start: the pane shows the cause, not a blank.
  - The user closes the window: the conversation is deleted, and the pane or the About text says so before.
  - A very long selection: truncated with a note, or the limit is stated.
  - The pane is narrow: width can be changed by mouse and by key.
  - A permission request arises from the pane: where does it show (UAC dialog names the window)?
  - Two windows have two panes: the user mixes them up (title of the pane).
  - The agent in the pane acts on files: the user cannot tell it from the main chat.
- **Success measure.** P1 gets an explanation of a selection in 3 actions. P4 finds the way to hide and show the pane.
- **E2E coverage.** `aside.e2e.ts`, `context-menus.e2e.ts`. Missing: errors, narrow pane, keyboard resize, permission from the pane.
- **Docs and panel.** Manual topics `manuals/embedded-chat.md` and the app's own manual. Panel tasks: T27.1, T27.2 in `tasks.md`.

## J28 - Let the agent use a web app in the Browser

- **Personas.** P1, P2.
- **Trigger.** The user wants the agent to work in a web page (read a team chat, fill a form).
- **Goal.** Hand a web page to the agent, see what it does, and take back control at once when needed.
- **Preconditions.** A Browser window open (an output window, J33; before `docs/AGENT_PRESENCE.md` PR 1 also needed for the tools, J10). Browser permission Allow or Ask. A local web app, no network.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Chat | Asks the agent to use the web page at an address | The agent navigates the Browser and reads the page | The Browser window changes by itself |
| 2 | Browser | Watches | A ring around the page and an **activity bar** ("Agent is using this page") with **Take control** | That the agent is acting, and where |
| 3 | Browser | Reads the tab strip and address | Address and tab title follow the agent | Which page and which tab |
| 4 | Browser | **Take control** | The agent stops acting on the page; the bar goes away; the next agent action asks | The bar says who is in control now |
| 5 | Chat | Reads the end of the turn | The agent says what it read and did | What it posted, matching the page |

- **Decision points.** Let it run, or take control. Browser permission Ask or Allow.
- **Failure and edge branches.**
  - The Browser window is closed: the agent says it has no browser, and the user knows what to open.
  - The page loads slowly or never: the Browser shows loading, then an error; the agent reports it.
  - The page is signed in: the agent shares the user's cookies (the UI must say so, J19).
  - The agent types into a message box or presses Send in a real web app: it should ask first (trust).
  - Page text tries to steer the agent (prompt injection): the user sees the address in requests.
  - The user types in the page while the agent acts: conflict.
  - Take control during a click: the click finishes or aborts cleanly.
- **Success measure.** P1 can say what the agent did in the page. P2 takes control in 1 action in under 5 seconds.
- **E2E coverage.** `browser-agent.e2e.ts` (read, switch channel, type, tabs, activity bar). Missing: take control, closed Browser, slow page, Ask policy.
- **Docs and panel.** Manual topic `manuals/browser.md`. Panel tasks: T28.1, T28.2 in `tasks.md`.

## J29 - Browse with tabs and recover from a bad page

- **Personas.** P1, P4.
- **Trigger.** The user wants two pages side by side, or a page does not load.
- **Goal.** Open, switch and close tabs, and know what to do when a page fails.
- **Preconditions.** Browser open on a page.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Browser | **New Tab** (+ or **Ctrl+T**) | A new tab opens and is active; the address box has focus | A blank tab is clear about what it is |
| 2 | Browser | Types an address, **Enter** | The page loads; the tab shows its title | Loading and the title |
| 3 | Browser | Clicks the other tab | The first page is back | Which tab is active (not by color only) |
| 4 | Browser | Closes a tab (x or **Ctrl+W**) | The tab closes; the neighbor is active | No loss of the other page |
| 5 | Browser | Opens an address that fails | An error page: what happened, why, Refresh | Plain words and a next step |

- **Decision points.** Search words or an address. Close the last tab.
- **Failure and edge branches.**
  - No network: error page with Refresh (see also T19.2).
  - Many tabs: the strip scrolls or shrinks tabs; titles truncate with a tooltip.
  - Close the last tab: the window shows an empty state, not a crash.
  - A link that opens a new window: becomes a tab or is blocked with a note.
  - Back and Forward per tab.
  - Keyboard: Tab order through the strip, Ctrl+Tab.
- **Success measure.** P1 has two pages open and switches in 5 actions. P4 names the cause of a failed page.
- **E2E coverage.** `browser-agent.e2e.ts` (the user opens and closes tabs). Missing: errors, shortcuts, last tab, keyboard.
- **Docs and panel.** Manual topic `manuals/browser.md`. Panel tasks: T29.1 in `tasks.md`.

## J30 - Use menus, right-click and About in any app

- **Personas.** P4, P3.
- **Trigger.** The user looks for a command, or wants to know what an app is.
- **Goal.** Find any command in the same place in every app, and use the same keys.
- **Preconditions.** Any app window open.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Any app | Reads the menu bar | **File, Edit, View, Help** (the same order everywhere), access keys underlined on Alt | The same four menus in every app |
| 2 | Any app | Opens a menu with the mouse or **Alt+letter** | Items with accelerators; unavailable items are disabled but visible | Shortcuts are shown next to the items |
| 3 | List, file or text | **Right-click** (or Shift+F10, Menu key) | A context menu for what is under the pointer | Items fit the thing (a file, a selection) |
| 4 | Context menu | Picks an item (for example **Open with Notepad**) | The command runs in the right app | The result is visible at once |
| 5 | Any app | **Help > About** | A dialog with name, icon, version and description | The version; OK closes it and focus returns |

- **Decision points.** Menu bar or right-click or shortcut.
- **Failure and edge branches.**
  - An app without a menu bar (see the manuals audit): the user looks in vain.
  - A context menu on empty space: shows a sensible menu or none, not an error.
  - A menu command that does nothing or is always disabled.
  - Esc closes the menu and returns focus; Left and Right move between menus.
  - A right-click in the Browser page or a webview.
  - Context menu near the window edge: it must stay on screen.
  - Different words for one command in different apps (Open in Chat window, Open with Notepad, Open in Notepad).
- **Success measure.** P4 opens a file from Explorer in Notepad by right-click in 3 actions and finds the version of an app in 3.
- **E2E coverage.** `context-menus.e2e.ts`, `apps.e2e.ts` (menu shortcuts). Missing: keyboard-only menus, edge placement, consistency check across all apps.
- **Docs and panel.** Manual topics for each app used. Panel tasks: T30.1, T30.2 in `tasks.md`.

## J31 - Get help from inside an app (Help menu and F1)

- **Personas.** P4.
- **Trigger.** The user does not know how something works in the app that is open.
- **Goal.** Reach the right topic of the right app in two actions, offline.
- **Preconditions.** An app window is focused.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Any app | **F1** or **Help > App Help** | Help and Support opens on the topic of the focused app | The topic title names the app |
| 2 | Help and Support | Reads the part list and the procedure | Steps in plain words | The answer to the question |
| 3 | Help and Support | Types in the search box | The topic list filters; no result says so | A way back to the index (Home) |
| 4 | Another app | **F1** again | The same Help window moves to the other topic | No second Help window |
| 5 | Help and Support | **Back** and **Forward** | Topic history | The user can return |

- **Decision points.** F1 or the menu or Start. Search or browse.
- **Failure and edge branches.**
  - F1 with a dialog open or with no window focused: opens the index, never nothing.
  - An app whose manual lacks the control the user asks about.
  - Search with no result.
  - Help text names a control that is not there (stale manual).
  - Help window covers the app so that the user cannot follow the steps: placement.
  - Help topic is not kept after restart.
  - Help contains jargon.
- **Success measure.** P4 finds the answer to an app question in under 30 seconds with F1 or the Help menu.
- **E2E coverage.** `help.e2e.ts` (F1, search, Start). Missing: F1 in dialogs and the Launcher, Back and Forward, accuracy of procedures.
- **Docs and panel.** Manual topic `manuals/help.md` and the manuals of all apps. Panel tasks: T31.1, T31.2 in `tasks.md`.

## J32 - An agent shows you something

`docs/AGENT_PRESENCE.md`, sections 5 and 8.

- **Personas.** P1, P4.
- **Trigger.** The user asks the agent in a chat "where is the redirect checked?" or the agent wants the user to look at something before it goes on.
- **Goal.** See the exact spot, know why the agent showed it, and carry on the conversation.
- **Preconditions.** A connected desktop with `login-app`; a chat in the foreground; **Agent may show you things** is Always.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Chat | Asks the question | The agent works quietly, then calls `show` on `src/auth/redirect.ts:12-20` | Nothing moved while it worked |
| 2 | Desktop | Watches | Code opens or comes forward at the lines, highlighted, while the keyboard focus stays in the chat; the agent cursor (name tag, agent colour) glides to them | Who is pointing, and where |
| 3 | Code | Reads the note callout | Agent name, the note ("The redirect target is not checked here"), **OK**, **Reply** | Why they are looking at this |
| 4 | Note callout | Clicks **Reply** | The chat composer gets focus with the note quoted | The conversation continues where it was |
| 5 | Chat | Reads the transcript | A row "Showed you redirect.ts:12-20: <note>" with **Show again** | The show is kept and can be repeated |

- **Decision points.** **OK**, **Reply**, or ignore it (any click elsewhere dismisses). Change **Agent may show you things** to Ask or Never in Control Center.
- **Failure and edge branches.**
  - A background chat or a team member calls `show`: no motion; a balloon "Builder wants to show you redirect.ts:12-20" with **Show** and **Not now**; it stays in the Action Center.
  - Two shows in a row: the second waits (its row reads "Will show you ...") and lands when the first note is closed; the Action Center counts what waits ("1 thing to look at").
  - **Agent may show you things** is Never: nothing moves; the row reads "Not shown (Never): ...".
  - The user types or clicks during the glide: the glide stops, focus stays where the user is.
  - Pause during a show: the cursor and callout disappear.
  - **Ask before every action** is on: the show asks first.
  - Target near a screen edge, in a maximized or small window: the callout stays on screen.
  - Reduced motion: the cursor jumps and pulses.
  - A stale target (file deleted, comment removed): the agent gets an error; nothing opens.
- **Success measure.** P4 states why the agent showed the lines, and replies to it, in under 20 seconds, on the first try.
- **E2E coverage.** `e2e/show.e2e.ts` (foreground show at the exact lines with cursor and note, Reply, OK, Show again, typing during a show, background request with Show and Not now and the Action Center count, Pause, reduced motion, Never). Ask and the queue are unit tests (`ShowService.test.ts`). `e2e/browser-agent.e2e.ts` checks the cursor before Browser clicks.
- **Docs and panel.** `manuals/desktop.md` (the agent cursor, the note callout, show requests), `manuals/chat.md`, `manuals/control-centre.md`, and the "What the Agent Can Do" of Code, Code Review, Kanban, Agent Diagrams and Browser. Panel tasks: T32.1, T32.2 in `tasks.md`.

## J33 - Hear about what the agents made

`docs/AGENT_PRESENCE.md`, section 6.

- **Personas.** P2, P3.
- **Trigger.** Agents in background chats or a team room finish work that leaves results in apps: review comments, cards, changes, a diagram.
- **Goal.** Learn about each result once, in plain words, and reach it in one click, without being interrupted while working.
- **Preconditions.** A connected desktop; the user is working in a foreground chat or an app; a team room with Reviewer and Builder runs in the background; Kanban is closed. The review tools need a Code Review window, so the Reviewer's window is open behind the user's window (`review_open` opens it there).

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Desktop | Keeps working | Reviewer adds 4 comments. One balloon: "Reviewer left 4 comments on redirect.ts", **Open review** | One message, in outcome words, not one per comment |
| 2 | Balloon | Clicks **Open review** | Code Review opens on the first new comment | The result, not just the app |
| 3 | Desktop | Ignores the next balloon | Builder's turn ends: "Builder finished: changed 6 files, ran tests (passed)", **Review changes** (**Open chat** when it changed no file); it times out | Nothing lost |
| 4 | Action Center | Opens it from the tray flag | Both balloons are listed with their actions | History of what happened |
| 5 | Kanban (open) | Watches while Builder moves a card | The card moves live and flashes; no balloon; no focus change | Live change in an open window |

- **Decision points.** Act now on the balloon, later from the Action Center, or open the app.
- **Failure and edge branches.**
  - The foreground chat makes output: no balloon (the user is watching it).
  - Many results in one turn: one balloon per kind per turn.
  - An agent opens an output app (Diagrams, Paint, WordPad, Browser): it opens behind the focused window with a flashing taskbar button and never takes focus; **Agent may open apps** set to Never refuses it.
  - Balloons while a UAC popup is open: they wait below it.
  - Two desktops: notices go only to their own desktop.
- **Success measure.** P2 names every result of a two-agent run from the Action Center alone; P3 reaches each result in one click; the user was never pulled out of their own window.
- **E2E coverage.** `e2e/notices.e2e.ts`: a background chat finishes (one summary balloon, kept in the Action Center), review comments in a Code Review window behind (balloon, **Open review** lands on the comment), the window focused (the threads flash, no balloon), a card moved with Kanban open (the card flashes, no balloon), the foreground chat (no balloon), two notices queue. Not yet: a two-member team run (step 1 with a room), balloons below a UAC popup.
- **Docs and panel.** `manuals/desktop.md` (balloons, Action Center, notices), `manuals/code-review.md`, `manuals/kanban.md`. Panel tasks: T33.1, T33.2 in `tasks.md` (still **[planned]**: no preset and checker yet).

## J34 - Follow an agent as it works

`docs/AGENT_PRESENCE.md`, section 7.

- **Personas.** P3, P1.
- **Trigger.** The user wants to watch one agent work live, for example to learn how it approaches a bug.
- **Goal.** Turn on Follow, watch that agent's steps on the desktop, and stop when done.
- **Preconditions.** A team room with Builder working on `login-app`.

| # | Screen | User action | System response | The user must notice |
|---|---|---|---|---|
| 1 | Team chat | Clicks **Follow** on Builder's row | The top bar reads "Following Builder" with **Stop following** | Follow is on, and for whom |
| 2 | Desktop | Watches | Code goes to each file and line range Builder reads or edits; Builder's cursor, in its colour, travels with it; the Terminal mirrors its runs | The work in real time, without notes |
| 3 | Notepad | Starts typing a note | Projection pauses; focus stays in Notepad | The user still wins |
| 4 | Desktop | Stops typing | After a short pause the projection resumes | It carried on without them |
| 5 | Top bar | Clicks **Stop following** | Projection and cursor stop | Back to quiet |

- **Decision points.** Follow one agent at a time; **Keep following** across turns or stop at the end of the turn.
- **Failure and edge branches.**
  - Follow a second agent: the first stops; the top bar names the new one.
  - Pause: Follow ends.
  - The followed chat closes or its turn ends (without **Keep following**): Follow ends with a short notice.
  - Another agent calls `show` while following: it becomes a request balloon.
  - Reduced motion: the cursor jumps.
- **Success measure.** P3 turns Follow on and off without Help; P1 describes the order of Builder's steps after watching one turn.
- **E2E coverage.** `e2e/follow.e2e.ts` (View > Follow this chat, reads and edits in Code with the cursor, the run in the Terminal, typing in Notepad pauses it, Stop following, Keep following and the end of the turn, Pause, the top-bar agents popup with two working chats, a team member's step text and Follow). The "Follow ends with a short notice" is one line on the top bar (`topbar-follow-ended`), not a balloon.
- **Docs and panel.** `manuals/team-chat.md`, `manuals/chat.md`, `manuals/desktop.md`. Panel tasks: T34.1 in `tasks.md`.
