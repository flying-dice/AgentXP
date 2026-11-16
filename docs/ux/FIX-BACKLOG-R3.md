# Fix backlog, round 3

Source: `panel/r3/SYNTHESIS.md` (themes TH-32 to TH-48, harness defects H-47 to H-64), `scorecard.md` (round 3), the round 3 records and the checks of `scripts/ux-panel/checks`. Round 1 items UX-01 to UX-50 and round 2 items UX-51 to UX-85 are not repeated here (UX-84, the performance measurement, is still open and belongs to another developer); this file starts at UX-86. Target: 10/10 at novice (Haiku) and intermediate (Sonnet); the expert tier is dropped. Severity is Nielsen 1 to 4 (1 = polish), same as rounds 1 and 2. Windows 7 terms and `docs/DOCUMENTATION_STYLE.md` apply (chat, desktop, drive, pane, dialog box; American spelling in new copy; no contractions in manuals; "Control Center" is the product spelling).

Do not change harness files in the product items: those fixes are in the harness section at the end (H-47 to H-64). Four items depend on them and say so (UX-86 on H-48, UX-87 on H-51, UX-102 on H-49, UX-99 on H-56).

Numbers UX-92, UX-97, UX-104 and UX-105 are not used. `SYNTHESIS.md` and `scorecard.md` already cite the numbers below, so the gaps stay.

Paths: `R` = `src/renderer/src/lib`, `M` = `src/main`, `shared` = `src/shared`.

Only problems that I confirmed against the shots, logs and code are listed. The claims that are not confirmed (Recycle Bin double-click reopening a chat, missing tooltips on Plug in a project and Take over, "Error: true" and "surface" text, "Explain this" answering about the whole file) are in `SYNTHESIS.md` section 2.4 and have no item here; two of them are harness work (H-52, H-55, H-56, H-63).

## Work packages

| WP | Name | Items | Files owned (edit freely) |
|---|---|---|---|
| WP-A | Shell, windows, launcher, project wording | UX-86 to UX-90 | `R/launcher/*`, `R/pages/{LauncherPage,DesktopPage}.svelte`, `R/desktop/{DesktopSurface,WindowLayer,AppWindowFrame,UsbTray,Balloon,DesktopController.svelte.ts,windowOrder.ts,geometry.ts,shellRegions.ts}`, `R/apps/explorer/*`, `shared/desktop-views.ts`, `M/application/launcher/*`, `M/application/desktop/DesktopService.ts` (`openWindow`, placement), `manuals/{explorer,projects,launcher}.md` |
| WP-B | Agent control, approvals, chat, failures | UX-91, UX-93 to UX-96, UX-98 to UX-101 | `R/desktop/{TopBar,TrayFlag,UacDialog,Gadgets,AppChatPane,NewChatDialog}.svelte`, `R/desktop/{activity,approval,chatPane}.ts`, `R/desktop/PermissionInbox.svelte.ts`, `R/app/session/*` except `SurfaceRow*`, `R/apps/chat/*`, `R/apps/askChat.ts`, `R/apps/shared/*`, `R/apps/control-centre/*`, `R/apps/agent-manager/*`, `R/apps/event-viewer/*`, `R/kit/organisms/StartMenu.svelte` (System Tools entry only), `M/application/{PermissionBroker,SessionProblems}.ts`, `M/application/vfs/ToolCallDiffs.ts`, `manuals/{chat,control-center,event-viewer,agents}.md` |
| WP-C | Browser and web tasks | UX-102, UX-103 | `R/apps/browser/*`, `M/application/tools/browserTools.ts`, `M/infrastructure/browser/*`, `manuals/browser.md` |
| WP-D | Code, review, Help | UX-106 to UX-112 | `R/apps/{code,code-review,help}/*`, `R/app/shell/{ChangesPane,FileTree,TasksPane}.svelte`, `R/app/changes/*`, `R/kit/organisms/{ListView,DataGridView,MenuStrip,TabControl}.svelte`, `manuals/{code,code-review,help}.md` |
| final | Sweep | UX-113 | everything, one developer, after WP-A to WP-D are merged. UX-84 (perf.mjs, other developer) stays open from round 2. |

WP-A to WP-D can run in parallel. Their file sets do not overlap except the files below.

**Shared files to watch (small, additive edits in a separate block; merge in the order WP-A, WP-B, WP-C, WP-D or rebase often):**
- `R/desktop/DesktopController.svelte.ts` and `R/pages/DesktopPage.svelte`: WP-A owns (UX-90 changes the balloon text at line 794 and the Eject labels; UX-88 the placement). WP-B adds only the waiting count and the take over text (UX-93, UX-94) through its own `activity.ts`, and the Event Viewer call (UX-100); WP-D adds the Help topic anchor call (UX-110) as one method.
- `R/desktop/TopBar.svelte`: WP-B only. WP-A does not touch it, but UX-88 changes the bar height constant in `shared/desktop-views.ts`; WP-B must not hard-code a height (UX-88 exposes `TOP_BAR_HEIGHT` as measured, see there).
- `shared/desktop-views.ts`: WP-A only (UX-88). WP-B reads `TOP_BAR_HEIGHT` and does not edit it.
- `shared/desktop.ts` (desktop state DTO): WP-B adds `waitingApprovals` if it is not derivable in the renderer (UX-93); WP-A adds nothing. One block each.
- `R/apps/code/CodeApp.svelte`: WP-D only. It embeds `R/apps/shared/EmbeddedChat.svelte` (WP-B): UX-106 uses the existing collapse props and does not edit EmbeddedChat internals. UX-112 adds menu entries and buttons in CodeApp and FileTree only.
- `R/apps/askChat.ts` and `R/desktop/chatPane.ts`: WP-B only (UX-99). WP-D's right-click routes in Code (UX-112) keep calling `askChat`; they do not change it.
- `R/app/shell/ChangesPane.svelte`: WP-D only (UX-111). UX-95 (WP-B) changes the permission box text and the data it reads, not the pane.
- `R/kit/organisms/StartMenu.svelte`: WP-B only in round 3 (UX-91). WP-A does not edit it.
- `M/application/desktop/DesktopService.ts`: WP-A edits `openWindow` and placement (UX-88); WP-B edits nothing there.
- `shared/ipc.ts`, `shared/ipc-channels.ts`, `M/ipc/createApi.ts`, `R/app/fakeApi.ts`, `R/app/fakeDesktop.ts`: each WP adds its own channels in its own block (WP-A none expected, WP-B `desktop.openEventViewer` if needed, WP-C none, WP-D `help.open` with an anchor).
- `manuals/*.md`: each WP edits only its own apps' manuals; `scripts/check-help-coverage.mjs` must stay green after each merge.

---

## WP-A Shell, windows, launcher, project wording

### UX-86 Create opens the desktop, or says what to press next
- **Problem.** T02.1 novice FAIL and T02.1 intermediate (TH-32): after Create the launcher shows "E: login-app", Idle, and the desktop window is not open. The novice stopped with "I did not know a desktop had to be connected" (shot 007); the intermediate searched for the next step. The task is "make a desktop", and nothing says that the desktop is a second step.
- **Decision.** After Create succeeds, the new desktop opens at once (same as Connect on the new row) and the launcher keeps the row selected. If the user cancels the opening or it fails, the row shows the status "Ready. Click Connect to open it." in the status column and Connect is the default button of the row. The New desktop dialog gets one line under the name box: "Agent7 opens the new desktop when you click Create." The manual `launcher.md` says the same in its first steps.
- **Acceptance.** T02.1 at novice and intermediate: a desktop window is open at the end with no extra instruction, in 18 steps or fewer (the budget needs H-48). No record contains "did not know a desktop had to be connected".
- **Severity** 2. **Findings** TH-32. **Files** `R/launcher/{NewDesktopDialog,DesktopRow}.svelte`, `R/launcher/launcherModel.ts`, `R/pages/LauncherPage.svelte`, `M/application/launcher/LauncherService.ts`, `manuals/launcher.md`.

### UX-87 The launcher row shows an agent problem when it appears
- **Problem.** T14.1 novice (INVALID, rerun after H-51): the broken-agent desktop reads Idle for the whole task, because `checkAgents` runs on mount and every 30 s only (`LauncherPage.svelte`), not when a desktop is added, started or reports a failed agent (shot 001, scorecard D9).
- **Decision.** Run `checkAgents` when the list changes (a desktop is created, renamed or removed), when a desktop window reports an agent failure (`agentProblem` event), and when the launcher window gets focus. The 30 second timer stays. A row with a problem shows the amber text "Agent problem: <short cause>" in the status column and the tooltip with the Control Center route.
- **Acceptance.** T14.1 (after H-51) at both levels: the row shows the problem within 2 seconds of the launcher opening; the answer names "Docs site". No row reads Idle while its agent is broken.
- **Severity** 3. **Findings** TH-36. **Files** `R/pages/LauncherPage.svelte`, `R/launcher/{DesktopRow.svelte,launcherModel.ts}`, `M/application/launcher/LauncherService.ts`.

### UX-88 New windows open below the top bar, beside their parent
- **Problem.** T13.1, T18.1-window (both levels), T18.2, T30.2, T12.2 novice (TH-34): title bars and close buttons sit under the top bar; the Help window opens on top of the app that asked for it (T30.2 shot 002). Cause: `TOP_BAR_HEIGHT = 30` in `shared/desktop-views.ts` while the bar is about 52 px with the chips row and 68 px with the status line, so `WINDOW_MIN_Y` is 34 and windows start under it.
- **Decision.**
  - `TopBar.svelte` reports its real height (a `ResizeObserver` result stored in the desktop controller); `WINDOW_MIN_Y` is that height plus 4 px. `TOP_BAR_HEIGHT` stays as the fallback until the first measurement and is raised to 68 so a first paint is safe. A window that is already open and now overlaps the bar is moved down on the next bar resize, not on every frame.
  - A new window opens at the cascade position of the focused window, offset 28 px right and down, and never covers the title bar of that window. Help, Event Viewer and dialog-like tools open on the side of the desktop that has more free width.
  - The new window gets focus and is raised above the chat pane (no window opens behind the chat; T13.1).
- **Acceptance.** In a shot taken right after each of T13.1, T18.1-window, T18.2, T30.2 and T12.2 the title bar and the close button of every window are fully visible, and Help does not hide the title bar of the window that opened it. Unit tests in `geometry.test.ts` and `windowOrder.test.ts` cover the bar heights 52 and 68.
- **Severity** 3. **Findings** TH-34, TH-42. **Files** `shared/desktop-views.ts`, `R/desktop/{WindowLayer,AppWindowFrame,DesktopSurface}.svelte`, `R/desktop/{geometry,windowOrder}.ts`, `R/desktop/DesktopController.svelte.ts`, `M/application/desktop/DesktopService.ts`.

### UX-89 The duplicate-name message does not move the dialog
- **Problem.** T02.2 (both levels, TH-43): the two-line error and the suggested name push Browse from y 388 to y 406; the panelists' click at 388 missed (shots 003 and 004). `.error` in `DesktopNameField.svelte` has `min-height: 15px` for a two-line text.
- **Decision.** Reserve the room: the error area has a fixed height for two lines (36 px) whether it is filled or not, and the suggestion is a link on the same area. The dialog height does not change when text appears or goes. The same fixed area is used by `RenameDesktopDialog`.
- **Acceptance.** In the duplicate-name flow the position of every button in the New desktop dialog is the same before and after the error (screenshot diff of the button row is zero pixels). T02.2 (reworded, H-50) passes at both levels without a missed click.
- **Severity** 3. **Findings** TH-43. **Files** `R/launcher/{DesktopNameField,NewDesktopDialog,RenameDesktopDialog}.svelte`.

### UX-90 Projects are not hardware: say what happened to the folder
- **Problem.** T12.1 (both) and T12.2 novice (TH-46): "Eject", the balloon "Safe To Remove Hardware" and "Drive E" make people think of a USB stick. The words were chosen for the Windows 7 look (UX-50), but the novices read them as a risk to the files.
- **Decision.** Keep the Windows 7 look and the icons. Change the words a person has to understand: the balloon title is "Project removed" and the text "'login-app' (E:) was removed from this desktop. Your files are still in the folder. Use Plug in again to add it back." The confirm dialog text says "Remove 'login-app' from this desktop? The agent can no longer use it. The folder and its files stay where they are." The menu and the button read "Eject (remove from this desktop)" (the UX-85 wording), the tray menu "Plug in login-app (E:) again". The label "Drive E" in chat text reads "the project login-app (E:)" in product text; the drive letter alone is not used for a project.
- **Acceptance.** T12.1 and T12.2 at both levels: no record calls the balloon or the dialog confusing, and nobody asks whether the files were deleted. `DesktopController.test.ts` expects the new balloon title (it expects 'Safe To Remove Hardware' now at line 211).
- **Severity** 3. **Findings** TH-46. **Files** `R/desktop/{DesktopController.svelte.ts,DesktopController.test.ts,Balloon.stories.svelte,UsbTray.svelte}`, `R/apps/explorer/ExplorerApp.svelte`, `manuals/{explorer,projects}.md`. The Eject entry in the Code tree is UX-112 (WP-D).

---

## WP-B Agent control, approvals, chat, failures

### UX-91 Event Viewer is one click from the Start menu
- **Problem.** T20.1 (TH-39): the Event Viewer is at Start, All Programs, System Tools; the novice needed 15 steps and the intermediate went through four menus. Nothing in the chat points to it when a tool fails (see UX-100).
- **Decision.** The Start menu left column (pinned programs) gets "Event Viewer" under "Control Center". The Action Center flag menu gets "Open Event Viewer". The name stays; the window title and the manual say "Event Viewer (a list of what happened)".
- **Acceptance.** T20.1 at both levels: the Event Viewer opens in 2 steps from the Start button; the answer contains the failed tool or file; 20 steps or fewer for the novice with the right budget (H-48).
- **Severity** 3. **Findings** TH-39. **Files** `R/kit/organisms/StartMenu.svelte`, `R/desktop/TrayFlag.svelte`, `manuals/event-viewer.md`.

### UX-93 The bar says how many requests wait
- **Problem.** T07.1 and the shots of T13.2 and T14.1 (TH-36, TH-44): while two chats wait for approval the bar reads "Working: Change src/auth/redirect.ts" and no number; only the taskbar flag has a badge. `workingText` in `R/desktop/activity.ts` returns the running tool's title before it checks `awaiting_permission`.
- **Decision.** In `workingText` the waiting check comes first: one request reads "Waiting for you: 1 request to approve"; n requests "Waiting for you: n requests to approve". The text is a link (button) that opens the next request in the inbox. The chips row and the taskbar flag use the same count. A running tool in another chat is shown after the dash only when nothing waits.
- **Acceptance.** T07.1 at both levels: the bar shows "2 requests" with two waiting; the taskbar badge and the bar agree. `activity.test.ts` has a case with a running tool and a waiting request. T13.2 and T14.1 panelists no longer say "easy to miss".
- **Severity** 3. **Findings** TH-36, TH-44. **Files** `R/desktop/{activity.ts,activity.test.ts,TopBar.svelte,TrayFlag.svelte,PermissionInbox.svelte.ts}`, `shared/desktop.ts` only if the count is not derivable in the renderer.

### UX-94 The Activity gadget and the bar do not contradict the screen
- **Problem.** (a) "Agent can use nothing yet" stands next to "Ready in login-app" and "Working" (T02.1 intermediate shot 011; T13.1, T18.1-window and T23.1 shots 001): `noToolsOpen` counts apps, not chats. (b) "Stopped: you took control" with "Nothing has happened yet" when nothing was running (T11.2 both, shot 002). (c) Take over also ticks "Ask before every action" and moves Browser to Ask without saying so (T28.2 intermediate).
- **Decision.**
  - `noToolsOpen` is true only when no app and no chat is open. With an open chat the line reads "The agent can use this chat" or is hidden.
  - The gadget text for control: with a running step "Stopped: you took control"; with nothing running "You are in control. The agent waits until you resume." The first line never appears over "Nothing has happened yet".
  - Take over shows once, in the bar: "You are in control. Browser is set to Ask until you resume." and Resume restores the earlier mode.
- **Acceptance.** `activity.test.ts` cases for chat open, nothing open and control with no step. T11.2 and T02.1 at both levels: no record mentions a contradiction. In every shot of T13.1, T18.1-window and T23.1 the line is absent or true.
- **Severity** 3. **Findings** TH-36. **Files** `R/desktop/{activity.ts,activity.test.ts,Gadgets.svelte,TopBar.svelte}`, `R/apps/control-centre/AgentsPage.svelte`.

### UX-95 The permission box and the Changes column agree
- **Problem.** T06.1 (TH-40): the permission box says "5 lines added, 0 removed. This replaces the whole file." (T07.1 shot 001, T14.1 shot 003); the Changes column says +3 / -3 (T08.2 shot 003). `ToolCallDiffs.fill` swallows a read error and leaves the old text null, which the box reads as "replaces the whole file".
- **Decision.** `fill` returns the error kind. When the old text cannot be read the box says "Agent7 could not read the current file, so it cannot show what changes." and does not claim a whole-file replacement. When the old text is read, the box and the Changes pane use the same counting function (one shared helper in `shared/`), and "replaces the whole file" appears only for a new file or a write that changes every line.
- **Acceptance.** `ToolCallDiffs.test.ts` covers read failure and a three-line change. In T07.1, T08.2 and T14.1 shots the numbers in the box equal the numbers in the Changes column for the same change.
- **Severity** 3. **Findings** TH-40. **Files** `M/application/vfs/ToolCallDiffs.ts`, `M/application/vfs/ToolCallDiffs.test.ts`, `M/application/PermissionBroker.ts`, `R/desktop/approval.ts`, new `shared/lineCounts.ts`. The Changes pane reads the helper through its own import (WP-D UX-111).

### UX-96 A failed chat says what happened and what to do next
- **Problem.** T23.1 (both): the chat status bar shows `store.error` as it comes ("ACP connection closed", `ChatApp.svelte` line 358); after Restart nothing says to press Send; T17.2 intermediate shows "Ready in Agent" over the error (TH-38, TH-39). The first-crash path ("Restart and send again") was never tested (H-58).
- **Decision.** `SessionProblems` maps raw errors to a sentence and a next step, and the status bar shows only that: "The agent stopped. Click Restart, then send your message again." Technical text stays behind "Details...". After Restart the composer is focused with the last message restored as a draft and the line "Restarted. Press Send to try again." The status "Ready in <agent>" is not shown while an error is open.
- **Acceptance.** `chatProblem.test.ts` covers ACP closed, spawn error, timeout. T23.1 (after H-58, first crash and second failure as two tasks) at both levels: no raw connection text outside Details; one Restart and one Send.
- **Severity** 3. **Findings** TH-38, TH-39. **Files** `R/apps/chat/ChatApp.svelte`, `R/app/session/{chatProblem.ts,chatProblem.test.ts,SessionView.svelte}`, `M/application/SessionProblems.ts`.

### UX-98 One name for each permission and each place it appears
- **Problem.** T06.3, T10.1, T10.2 (TH-37): the bar reads "Run commands: Ask", the Control Center row "Run commands (Terminal)", and the Control Center text says "Ask shows a permission request in the Action Center" while the request opens in the chat (T10.1 shot 002, SEQ 3). Ask versus Deny was hard to tell apart.
- **Decision.** The permission is "Run commands" in the bar, the row, the dialog and the manual; "(Terminal)" is only the tooltip. The help line says where the request appears: "Ask shows a request in the chat that wants to run something." Each mode has one sentence in the row: Allow "runs without asking", Ask "asks you each time", Deny "never runs". The dialog hint "Press Alt+A to allow or Alt+D to deny." stays visible (2.5 of SYNTHESIS, Deny focus is kept).
- **Acceptance.** `permissionsTable.test.ts` expects one label per permission. T10.1 and T10.2 novice SEQ 5 or more; `grep -rn "Run commands (Terminal)" src manuals` has only the tooltip.
- **Severity** 3. **Findings** TH-37. **Files** `R/apps/control-centre/{PermissionsPage.svelte,permissionsTable.ts,permissionsTable.test.ts}`, `R/desktop/{TopBar.svelte,approval.ts,UacDialog.svelte}`, `manuals/control-center.md`.

### UX-99 "Explain this" from the pane sends the selection
- **Problem.** T27.1 (both, TH-45): the pane chip "Explain this" sends only its label, while the right-click route (`R/apps/askChat.ts`) sends the selected lines; the menu has three similar entries. The "whole file" answer seen at novice is the script (H-56) and is not a product defect.
- **Decision.** The chip builds its message with the same function as the right-click route (`askChat`), so the selection travels and the chat shows "Explain lines 1 to 2 of index.ts" as the user message. The menu has two entries: "Ask the agent about this..." and "Explain this". The chip is disabled with the tooltip "Select some text first." when nothing is selected.
- **Acceptance.** `chatPane.test.ts` covers chip with and without selection. T27.1 at both levels (after H-56): the user message in the chat names the lines; both routes give the same message.
- **Severity** 3. **Findings** TH-45. **Files** `R/desktop/{chatPane.ts,chatPane.test.ts,AppChatPane.svelte}`, `R/apps/askChat.ts`.

### UX-100 A failed tool links to the Event Viewer
- **Problem.** T20.1 (TH-39): the error row of a failed tool shows "Show in Event Viewer" only in some places (T23.1); the tool-failure text in the chat has none.
- **Decision.** Every chat line for a failed tool ends with the link "Show in Event Viewer", which opens the viewer on that event. Plain sentence first, event name under Details (the UX-85 rule).
- **Acceptance.** T20.1: the novice reaches the right event in 3 steps from the chat text. `SessionView` test for the link.
- **Severity** 3. **Findings** TH-39. **Files** `R/app/session/*` (the tool row), `R/apps/event-viewer/{EventViewerApp.svelte,eventModel.ts}`.

### UX-101 Stop, End process and Pause all agents are told apart on the control
- **Problem.** T20.2 novice and T11.1 novice (TH-47, S4): three controls that stop things; the difference was learned from the dialog text.
- **Decision.** Tooltips and labels: Stop "Stop this step"; End process (Task Manager) "End this agent's process"; Pause all agents "Pause every agent on this desktop". Each dialog states what stays and what is lost in one line.
- **Acceptance.** T20.2 and T11.1 novice SEQ 5 or more. No record needs the dialog to learn the difference.
- **Severity** 4. **Findings** TH-47. **Files** `R/desktop/TopBar.svelte`, `R/apps/agent-manager/AgentManagerApp.svelte`, `R/apps/chat/*`.

---

## WP-C Browser and web tasks

### UX-102 The Browser has a visible way to ask the assistant about the page
- **Problem.** T19.1 (both INVALID, TH-35, TH-41): "Agent: can see this page" says what the assistant may do, not what it did; the Chat strip that starts the question is a collapsed edge tab that neither panelist noticed. Both expected "a button or a line like 'Ask the assistant to read this page'". The scenario wording is H-49.
- **Decision.** The status reads "Agent: can read this page" (tooltip: "The assistant can read this page when you ask it."). Next to it a button "Ask about this page" opens the chat strip with the draft "What does this page say?" and the page title as context. After the assistant reads the page, the status line shows "The agent read this page" for the session.
- **Acceptance.** T19.1 (after H-49) at both levels: the assistant's reply quotes the page ("Example Domain"); the check sees `browser_read`; 8 steps or fewer; nobody searches for the strip.
- **Severity** 3. **Findings** TH-35, TH-41. **Files** `R/apps/browser/{BrowserApp.svelte,pageStatus.ts,pageStatus.test.ts}`, `M/application/tools/browserTools.ts` (read event), `manuals/browser.md`.

### UX-103 The Browser bar describes the wait in words, not page text
- **Problem.** T28.1 (both, TH-38): "Waiting for Reacted (1)" and "Used 28 tools". `browserTools.ts` `browser_wait` announces `Waiting for "${text}"` with text taken from the page.
- **Decision.** The bar reads "Waiting for the page to change" (the wanted text goes in the tooltip and in Details). The collapsed chat line "Used 28 tools" reads "Used 28 steps in the browser (clicked, typed, read)" with the counts per kind in the tooltip.
- **Acceptance.** T28.1 at both levels: no page text in the bar while waiting; the answer is not blocked by technical lines. Test for the message in `browserTools` tests.
- **Severity** 3. **Findings** TH-38. **Files** `M/application/tools/browserTools.ts`, `R/apps/browser/BrowserApp.svelte`, `R/app/session/*` (the collapsed line; WP-B owns the folder, this is one string and is agreed as a small edit in a separate block).

---

## WP-D Code, review, Help

### UX-106 One action gives the file the whole window
- **Problem.** T27.2 intermediate FAIL (file area 578 of 772 px), T27.2 novice three separate closes (TH-33). The panelist hid the chat pane and judged it done; the Tasks and Changes panes still shared the window.
- **Decision.** A button "Focus on the file" at the right end of the Code toolbar (also View > Focus on the file, F11 inside Code) hides the chat pane, the tree and the side panes together and shows a "Show panes" button in the same place. The state is remembered per window. The same button works with a Markdown preview.
- **Acceptance.** T27.2 at both levels (with the H-64 wording): the file area is 90% of the window width or more (checker); one click or one key. `codeModel.test.ts` covers the toggle.
- **Severity** 2. **Findings** TH-33. **Files** `R/apps/code/{CodeApp.svelte,codeModel.ts,codeModel.test.ts,DockPane.svelte}`, `manuals/code.md`.

### UX-107 Git and Changes open the row's file, with line numbers
- **Problem.** T24.1 (TH-40): double-click in the Git list opens Code Review on the first file (login.ts), not on the row's file (shot 003); the list shows only "+3 / -3" with no line numbers.
- **Decision.** `showChanges` selects the path before it opens the window (it sets `selectedPath` after the open now) and passes it to Code Review. The Git row tooltip reads "redirect.ts: lines 1, 3 and 4 changed" (the hunks). Code Review already shows line numbers.
- **Acceptance.** T24.1 at both levels: the diff that opens is the row's file; the answer with the three line numbers (checker H-60). `gitModel.test.ts` covers the selection.
- **Severity** 3. **Findings** TH-40. **Files** `R/apps/code/{CodeApp.svelte,gitModel.ts,gitModel.test.ts}`, `R/apps/code-review/CodeReviewApp.svelte`.

### UX-108 Review controls are visible and named
- **Problem.** T26.1 intermediate (unlabeled check, pencil, bubble and X under each comment, shot 003) and T26.2 intermediate (the "+" shows on hover only); the novice used the line number (TH-35).
- **Decision.** Each comment action has a text label: "Resolve", "Edit", "Reply", "Delete". The "+" is always visible in the gutter at 40% contrast and full contrast on hover and focus, with the tooltip "Add a comment on this line"; the line number also opens the composer.
- **Acceptance.** T26.1 and T26.2 at both levels: no panelist hovers to find the control; axe has no unnamed button in Code Review.
- **Severity** 3. **Findings** TH-35. **Files** `R/apps/code-review/{ReviewComments,ReviewThread,ReviewDiff,ReviewComposer}.svelte`.

### UX-109 The chat has one name everywhere in review
- **Problem.** T26.1 (both), T10.1 (TH-37): the dialog lists "Chat 1 / E:\" while the chat window is "New chat - review-notes (E:)"; "E:\ - Code Review" does not match the desktop name. `chatLabel` in `reviewModel.ts` uses `Chat <id>`.
- **Decision.** `chatLabel` returns the chat title; for an untitled chat "New chat (review-notes)". The review window title is "Review - <project name>".
- **Acceptance.** `reviewModel.test.ts` covers the titled and untitled chat. T26.1 at both levels: the name in the dialog equals the window title.
- **Severity** 3. **Findings** TH-37. **Files** `R/apps/code-review/{reviewModel.ts,reviewModel.test.ts,SendToChatDialog.svelte,CodeReviewApp.svelte}`.

### UX-110 Help search finds the section, F1 lands on it
- **Problem.** T22.2 novice, T22.1 intermediate, T31.1 novice (TH-42): results are per topic with one snippet, "undo" ranks "Using Chat" first and not the Revert section; F1 opens at the top of the topic.
- **Decision.** The index covers sections (headings) and ranks a heading match above a body match. F1 opens the topic of the focused app at the section named by the app's help anchor. Results show the section title and the topic.
- **Acceptance.** `helpModel.test.ts`: "undo" returns the Revert section first. T22.1, T22.2, T31.1 at both levels without scrolling to find the section.
- **Severity** 3. **Findings** TH-42. **Files** `R/apps/help/{HelpApp.svelte,helpModel.ts,helpModel.test.ts,helpTopics.ts}`, `manuals/help.md`, `scripts/check-help-coverage.mjs` only to read anchors.

### UX-111 The Changes pane shows whole names and the counts column
- **Problem.** T08.1, T08.2 (TH-40): names cut ("r....ts" in T08.2 shot 003), the counts column off screen in a pane about five rows high; the box and the column disagree (see UX-95).
- **Decision.** The name column ellipsizes in the middle and keeps the extension; the pane has a minimum height of 8 rows; the counts column is fixed on the right and the pane scrolls horizontally only for the path. The counting function is the shared one of UX-95.
- **Acceptance.** T08.1 and T08.2 at both levels: the file name and "+7/-1" are in one shot at the default window size; SEQ 5 or more at novice.
- **Severity** 3. **Findings** TH-40. **Files** `R/app/shell/ChangesPane.svelte`, `R/app/changes/changeFormat.ts`, `R/kit/organisms/{ListView,DataGridView}.svelte`.

### UX-112 Every main action has a visible route
- **Problem.** T04.1, T12.1, T27.1 intermediate (TH-35, partly confirmed): "Start a chat here" in the Code tree, "Eject" in the Code tree and "Explain this" on a selection exist only in the right-click menu. File > New chat and the Explorer Eject button exist and were used.
- **Decision.** Code tree: a toolbar with "New chat here" and "Remove from desktop" (enabled for a project root) next to the existing menu entries; the File menu gets "New chat here". The selection menu entry has a toolbar button "Ask about selection" (UX-99 sends the same message).
- **Acceptance.** T04.1 and T12.1 at both levels: 3 actions or fewer without a context menu; axe names for the buttons.
- **Severity** 3. **Findings** TH-35. **Files** `R/apps/code/CodeApp.svelte`, `R/app/shell/FileTree.svelte`, `R/kit/organisms/MenuStrip.svelte`.

---

## Final

### UX-113 Wording sweep, round 3 (after WP-A to WP-D)
- **Problem.** TH-48 (S4, 6 runs): "Scripted demo", "Agent" as the name of an agent, "F:" without explanation, "private C: drive", and "Projects you used before" (T01.1, T02.1, T02.2, T03.1, T15.1, T17.1 novice).
- **Decision.** One vocabulary: the drive letter of a project is always shown with the project name; the delete dialog says "its private C: drive (files made on this desktop)"; the demo agent has a plain description in the agents list; "Projects you used before" has the tooltip "Folders that Agent7 opened before". Check the manuals for the same words.
- **Acceptance.** `grep -rniE "scripted demo|\\bAgent:\\b" src manuals e2e` shows only intended uses; the novices do not report these words.
- **Severity** 1. **Files** all; single developer.

---

## Harness and checker items (H-47 to H-64)

These live in `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process; the product packages do not edit them. The harness owner does them in about a day, before the rerun. Full descriptions, evidence and fixes: `panel/r3/SYNTHESIS.md` section 5.

| id | Where (in scripts/ux-panel unless noted) | Fix in one line |
|---|---|---|
| H-47 | `checks/features.mjs` T29.1 | Read the tab address from the `title` attribute of the tab button (two correct runs FAILed). |
| H-48 | `lib/tasktext.mjs` `budgetFor`, `session.mjs` | Map `novice` to `budgetNovice` and `intermediate` to `budgetExpert`; reject unknown levels. |
| H-49 | `docs/ux/tasks.md` T19.1, `checks/desktop.mjs` | Scenario "Open the page, then ask the assistant what it says."; check needs `browser_read` and "Example Domain". |
| H-50 | `docs/ux/tasks.md` T02.2 | Reword to "try to give it the same name; if the program will not allow it, say why"; the answer needs the reason. |
| H-51 | `presets/desktops.mjs` `four-desktops`, T14.1 | Create all desktops before opening the launcher, or call `checkAgents` and wait for `agentProblem`. |
| H-52 | `server.mjs` `move` | Wait 800 ms before the shot (or add `hover`); tell panelists to look again after a hover. |
| H-53 | `session.mjs check`, `PANELIST.md` | `stop` reads `- SEQ:` into `check.json`; `check` no longer takes `--seq`. |
| H-54 | `lib/tasktext.mjs` `asksQuestion` | A task asks a question when its entry has `Answer:`. |
| H-55 | `scripts/eject-victim.json`, `scripts/a2ui.json` | Paraphrase tool results; no "Error: true" or `surface "board"` in agent text. |
| H-56 | `scripts/aside.json` | `explain-lines` before `explain`, or `explain` answers for the selection. |
| H-57 | `presets/chat.mjs` T07.1 | Two different requests on two files; state check that the flag shows 2. |
| H-58 | `presets/chat.mjs` `crashed-agent`, `scripts/crash-recovery.json` | Crash once and assert "Restart and send again"; the second failure is its own task. |
| H-59 | `session.mjs check`, `FACILITATOR.md` | Refuse a verdict for an answer task without `--answer` or `--no-answer`. |
| H-60 | `checks/features.mjs` T24.1 | Require line numbers 1, 3 and 4 of redirect.ts and the three file names. |
| H-61 | `PANELIST.md` | Copy UI text from a shot and name it; the researcher checks the last shot before MANUAL. |
| H-62 | `checks/desktop.mjs` T19.2 | Keywords by cause: port, blocked, address, refused, not load. |
| H-63 | `presets/chat.mjs` `recycled-change`, `changes-to-review` | Dismiss the "Reopened ..." banner in the preset. |
| H-64 | `docs/ux/tasks.md` T27.2 | "Make the file use the whole window. Nothing else should share the window with the file." |

---

## Coverage of the round 3 findings

TH-32 UX-86. TH-33 UX-106. TH-34 UX-88. TH-35 UX-102, UX-108, UX-112. TH-36 UX-87, UX-93, UX-94. TH-37 UX-98, UX-109. TH-38 UX-96, UX-103 (H-55). TH-39 UX-91, UX-96, UX-100. TH-40 UX-95, UX-107, UX-111. TH-41 UX-102. TH-42 UX-110, UX-88. TH-43 UX-89. TH-44 UX-93. TH-45 UX-99. TH-46 UX-90. TH-47 UX-101. TH-48 UX-113.

Task to item map (failed, invalid or weak tasks): T02.1 UX-86, UX-94. T02.2 UX-89 (H-50). T04.1 UX-112. T06.1 UX-95. T06.3 UX-98. T07.1 UX-93. T08.1/T08.2 UX-111. T10.1/T10.2 UX-98. T11.2 UX-94. T12.1 UX-90, UX-112. T12.2 UX-88, UX-90. T13.1 UX-88. T14.1 UX-87 (H-51). T17.2 UX-96. T18.1-window/T18.2 UX-88. T19.1 UX-102 (H-49). T20.1 UX-91, UX-100. T20.2 UX-101. T22.1/T22.2 UX-110. T23.1 UX-96 (H-58). T24.1 UX-107 (H-60). T26.1 UX-108, UX-109. T26.2 UX-108. T27.1 UX-99 (H-56). T27.2 UX-106 (H-64). T28.1 UX-103. T30.2 UX-88. T31.1 UX-110.

The Deny focus default (UX-17, UX-62) is kept: SYNTHESIS 2.5. The performance finding (D10) stays with UX-84.

## Rerun plan

After the harness fixes (H-47 to H-64) and the packages above: rerun at novice and intermediate every row that is FAIL, INVALID or weak in `panel/r3/SYNTHESIS.md` (T02.1, T02.2, T07.1, T08.2, T10.1, T11.2, T14.1, T19.1, T19.2, T20.1, T22.1, T24.1, T27.2 and the other weak rows of section 1), the 32 carried intermediate rows whose code changed (H-41), and every task of J02, J07, J13, J14, J18, J19, J20, J23, J24, J26 and J27 with fresh panelists. Then the full pass at both levels on the packaged build for the release gate (all tasks pass, median SEQ 6 or more at each level, no task below 5). After the transcript virtualisation, re-measure D10 with `perf.mjs` (UX-84).
