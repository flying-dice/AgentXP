# Fix backlog, round 4

Source: `panel/r4/SYNTHESIS.md` (themes TH-49 to TH-69, harness defects H-65 to H-76), `scorecard.md` (round 4), the 120 round 4 records, the session folders in `/tmp/ux-sessions/r4/`, and the product source for every cause named below. Round 1 to 3 items (UX-01 to UX-113) are not repeated; this file starts at UX-114 and ends at UX-137. UX-84 (performance measurement on the reference machine) is still open and belongs to another developer. Target: every task passes at novice (Haiku) and intermediate (Sonnet) with SEQ 6 or more, and every journey 10/10 under the rubric.

**Severity.** Rounds 1 to 3 used Nielsen 1 to 4 (1 = polish). Round 4 uses the rubric scale of `rubric.md`: S1 blocker, S2 major, S3 minor, S4 cosmetic. Rough map: Nielsen 4 = S1, 3 = S2, 2 = S3, 1 = S4. S4 items stay open until the UX lead accepts them in `findings.md` with a written reason; an open S4 caps the cell at 9, so they are in the backlog on purpose.

**R3 items shipped but not effective in the panel.** UX-95 (permission box shows the lines), UX-108 (labelled review "+"), UX-109 (review dialog names), UX-111 (Changes names and diff pane) and UX-79 (reverted rows). Each has a unit or component test that passes and each fails its acceptance in round 4. The new items below say what the old test missed. Rule for this round: an acceptance line names the stock flow (the scripted agent or the shipped default agent) and the panel task that must pass, not only a component test.

Do not change harness files in the product items; those fixes are in the harness section (H-65 to H-76). Four items depend on them and say so (UX-114 on H-76, UX-118 on H-70, UX-123 on H-65, UX-124 on H-65).

Paths: `R` = `src/renderer/src/lib`, `M` = `src/main`, `shared` = `src/shared`.

Only problems that I confirmed against the shots, logs and code are listed. Not confirmed, so no item: the T02.2 novice claim that the error comes only after Browse (shot 003 shows it earlier), the "cryptic final browser reply" (script text, H-71), the `state.json` flag `revertShownInList` (it only means the Recycle Bin holds the item), and the checker note "all permission groups Ask: false" (H-70).

## Work packages

| WP | Name | Items | Files owned (edit freely) |
|---|---|---|---|
| WP-A | Shell, windows, launcher, Task Manager, words | UX-119, UX-120, UX-130, UX-133, UX-136, UX-137 | `R/launcher/*`, `R/pages/{LauncherPage,DesktopPage}.svelte`, `R/desktop/{DesktopSurface,WindowLayer,AppWindowFrame,Balloon,DesktopController.svelte.ts,windowOrder.ts,geometry.ts,shellRegions.ts}`, `R/apps/{explorer,task-manager}/*`, `M/application/desktop/DesktopService.ts` (`openWindow`, placement, focus), `M/application/launcher/*`, `manuals/{explorer,projects,launcher,task-manager}.md` |
| WP-B | Approvals, permissions, chips, failures, Event Viewer | UX-114, UX-115, UX-118, UX-121, UX-123, UX-124, UX-125, UX-127 (shared items), UX-134 | `M/application/{PermissionBroker,SessionProblems,SessionRuntime,SessionService}.ts`, `M/application/vfs/{ToolCallDiffs,ToolCallPaths}.ts`, `shared/lineCounts.ts`, `R/desktop/{TopBar,TrayFlag,UacDialog,Gadgets,AppChatPane,NewChatDialog}.svelte`, `R/desktop/{activity,approval,chatPane,chatProblem}.ts`, `R/app/session/*` except `SurfaceRow*`, `R/apps/chat/*`, `R/apps/shared/*`, `R/apps/control-centre/*`, `R/apps/agent-manager/*`, `R/apps/event-viewer/*`, `R/kit/organisms/StartMenu.svelte` (System Tools entry only), `manuals/{chat,control-centre,agents,event-viewer}.md` |
| WP-C | Browser and surfaces: labels | UX-128, UX-135 | `R/apps/browser/*`, `R/app/session/SurfaceRow*`, `M/application/tools/browserTools.ts`, `M/infrastructure/browser/*`, `manuals/browser.md` |
| WP-D | Code, review, Changes pane, Help | UX-116, UX-117, UX-122, UX-126, UX-129, UX-131, UX-132 | `R/apps/{code,code-review,help}/*`, `R/app/shell/{ChangesPane,FileTree,TasksPane}.svelte`, `R/app/changes/*`, `R/kit/organisms/{ListView,DataGridView,MenuStrip,TabControl}.svelte`, `manuals/{code,code-review,help}.md` |
| final | Sweep | UX-127 (disabled reasons everywhere), rerun | one developer, after WP-A to WP-D are merged |

WP-A to WP-D can run in parallel. Their file sets overlap only in the files below.

**Shared files to watch (small, additive edits in a separate block; merge in the order WP-B, WP-A, WP-C, WP-D, or rebase often):**
- `shared/lineCounts.ts`, `M/application/{PermissionBroker,vfs/ToolCallDiffs}.ts`: WP-B only (UX-114). WP-D reads `changeCounts` in the Changes pane (UX-116) and does not edit it.
- `M/application/desktop/DesktopService.ts`: WP-A edits `openWindow`, placement and focus (UX-119, UX-120). WP-B adds none. WP-D's Help window placement (UX-132) calls the existing placement option and does not edit the method.
- `R/desktop/DesktopController.svelte.ts` and `R/pages/DesktopPage.svelte`: WP-A owns. WP-B adds only the chip wording through its own `activity.ts`; WP-D adds nothing.
- `R/desktop/TopBar.svelte` and `R/desktop/activity.ts`: WP-B only (UX-118, UX-125). WP-A reads the bar height and does not edit the bar.
- `R/apps/control-centre/*`: WP-B only (UX-115, UX-118, UX-127). The window default size comes from the app registry (`shared/desktop-views.ts` or the app definition); WP-B changes the Control Center entry only, WP-A does not touch that file.
- `R/apps/browser/*`: WP-C only. UX-120 (WP-A) decides where the chat window opens and does not edit the Browser; UX-128 (WP-C) adds no placement logic.
- `R/app/shell/ChangesPane.svelte`: WP-D only (UX-116, UX-117). WP-B changes the permission box text and data, not the pane.
- `R/apps/code/CodeApp.svelte` embeds `R/apps/shared/EmbeddedChat.svelte` (WP-B): UX-126 in WP-D uses the existing pane props and does not edit EmbeddedChat internals; if it needs a prop, it asks WP-B for one named prop.
- `R/kit/organisms/StartMenu.svelte`: WP-B only (Event Viewer entry, UX-121). WP-A does not edit it (Ctrl+N hint, UX-137, goes through the existing shortcut-label prop).
- `shared/ipc.ts`, `shared/ipc-channels.ts`, `M/ipc/createApi.ts`, `R/app/fakeApi.ts`, `R/app/fakeDesktop.ts`: each WP adds its own channels in its own block (WP-B `desktop.openEventViewer` with a filter if needed; WP-D `help.open` with an anchor already exists).
- `manuals/*.md`: each WP edits only its own apps' manuals; `scripts/check-help-coverage.mjs` must stay green after each merge (500 of 500 ids today).

---

## WP-B Approvals, permissions, chips, failures

### UX-114 The permission box says it cannot read a file that exists
- **Problem.** TH-49, six runs: T05.1 N, T06.1 N and I, T07.1 N and I, T13.2 I (shot 003). The box reads "Agent7 could not read the current file, so it cannot show what changes." for `redirect.ts` and `login.ts`, which exist; the Changes pane for the same change shows +3 / -3. The novice spent the whole budget (4 of 4) finding the lines after Allow. Cause: `PermissionBroker.prompt` calls `ToolCallDiffs.complete` only when the permission request itself carries a diff with `oldText === null` (`needsText`). The scripted agent sends the change as a `tool_call` update and then asks with `toolCall: { toolCallId, title }`; the stored diff keeps `oldText: null`, so `changeCounts(null, ...)` is unknown and the box prints `CANNOT_READ_TEXT`. R3 UX-95's tests only use the diff-in-request shape.
- **Decision.** `prompt` completes the diff of the stored tool call for that `toolCallId` when the request has no diff or its diff has `oldText === null`, whichever shape arrives. If the read really fails, the box says why in plain words ("The file does not exist yet, so everything below is new" for a new file; "Agent7 cannot read E:\src\auth\redirect.ts: it is in use" otherwise) and still shows the new text. The text "could not read the current file" appears only when the read failed, never when the file exists.
- **Acceptance.** T05.1, T06.1, T07.1, T13.2 at both levels: the box shows the changed lines (+3 / -3, lines 1, 3 and 4 for `redirect.ts`) before Allow, and the sentence "could not read" is absent from every record. Broker integration tests for both shapes (diff inside the request; diff only in the earlier update), a new file, a missing file, a locked file. T06.1 passes in 2 actions or fewer at both levels.
- **Severity.** S2 (the main safety dialog states something untrue; caps D7 and D9 of J05, J06, J07 and J13 at 6).
- **Findings.** TH-49, `SYNTHESIS.md` 2.3, shot T06.1-intermediate 001, shot T13.2-intermediate 003.
- **Files.** `M/application/PermissionBroker.ts`, `M/application/vfs/ToolCallDiffs.ts`, `shared/lineCounts.ts`, `R/desktop/{UacDialog.svelte,approval.ts}`, tests (`PermissionBroker.test.ts`). Depends on H-76 for the scripted variant.

### UX-115 Control Center, Permissions page: layout and the jumping OK button
- **Problem.** TH-50, six runs (T06.3, T10.1, T16.2 at both levels). The window opens about 455 px wide with a list 160 px high; the header "Permission and what it covers / Setting" overlaps the first row; "Run commands" wraps to "Run command s"; "Not applied yet" appears beside OK and Apply in a four-line column and moves them (shots T06.3-intermediate 006 and 007, T16.2-novice 004). The window opens at a different size from the chip and from the desktop icon. T16.2 novice SEQ 4: the key sentence is below the fold.
- **Decision.** One default size for Control Center (at least 640 x 480, never larger than the work area), the same from every entry. The list fills the free height and scrolls inside itself; the header is a fixed row above the list with its own height. No wrapping of a row name: the name column has a minimum width of the longest name. The OK, Apply and Cancel buttons sit in a fixed footer; "Not applied yet" has its own reserved line to the left, so nothing moves when it appears. The sentence that says what "Code" and "Notepad" do and do not cover moves above the list in a callout, not below the fold.
- **Acceptance.** T06.3, T10.1, T16.2 at both levels: no overlap in a screenshot at the default size; "Run commands" is on one line; the position of OK is identical (same pixel) before and after the first toggle (a check that reads the button rectangle twice, added to `checks/chat.mjs`); T16.2 novice reaches the answer without scrolling; SEQ 6 or more.
- **Severity.** S3.
- **Findings.** TH-50, `SYNTHESIS.md` 2.6, R1 TH-02.
- **Files.** `R/apps/control-centre/*`, the Control Center entry in the app registry, `manuals/control-centre.md`.

### UX-118 Chips say Off while the setting says Ask or Deny
- **Problem.** TH-52, four runs: T11.2 both, T10.2 I, T16.1 I. After Take over the banner reads "Browser and all other tools are set to Ask until you resume." (`CONTROL_TEXT`, `activity.ts` line 151) while the chips read "Run commands: Off" and "Browser: Off". By design since UX-61 a chip reads Off when no app that provides the tool is open, so the behavior is right and the words contradict it. T10.2: the bar says "Off" and the setting says Deny.
- **Decision.** Keep the logic, change the words. A chip for a group whose app is closed reads "Ask (no Terminal open)" in the bar, or a distinct style with the setting visible; "Off" is used only when the setting is Deny ("Deny"). The take-over banner says "Tools that need an app ask first. Terminal and Browser are not open." when some chips are closed. One function names the state for the bar, the chips' tooltips, the take-over text and Control Center (so the four cannot disagree).
- **Acceptance.** T11.2, T10.2, T16.1 at both levels: the chip text and the banner text never contradict each other (a check that reads both, H-70); no record says "Off against Ask" or "Off against Deny". The tooltip names both the setting and the reason.
- **Severity.** S3.
- **Findings.** TH-52, `SYNTHESIS.md` 2.4, shot T11.2-novice 003.
- **Files.** `R/desktop/{activity.ts,TopBar.svelte,TrayFlag.svelte}`, `R/apps/control-centre/*` (read only the shared naming function), `manuals/control-centre.md`.

### UX-121 Event Viewer: discoverability, size, noise
- **Problem.** TH-54, T20.1 at both levels, both SEQ 4. Event Viewer is only in the Start menu; the chat's Tools and View menus and the Activity gadget do not lead to it; the first window is narrow with the Level column cut (shot T20.1-intermediate 007); 28 events of ACP, AG-UI and MCP traffic hide the one warning; "Records" is not a word the novice looks for.
- **Decision.** (1) An "Event Viewer" entry in the chat window's Tools menu and in the desktop Activity gadget's menu (and a double-click on the gadget opens it). (2) The tool-failure text in the chat ("Drive E: is not plugged in") ends with a link "Show in Event Viewer" that opens it with that event selected. (3) Default size at least 720 x 420, Level and Time columns never cut. (4) The default filter shows Warnings and Errors; a "Show all" check box shows the protocol events. (5) One name everywhere: "Event Viewer".
- **Acceptance.** T20.1 at both levels in 4 actions or fewer, SEQ 6 or more, no dead end in the log; a screenshot at the default size shows the Level column whole; the default list shows the warning without scrolling.
- **Severity.** S3.
- **Findings.** TH-54, `SYNTHESIS.md` 2.6, shots T20.1-novice 005 and T20.1-intermediate 007.
- **Files.** `R/apps/event-viewer/*`, `R/desktop/{Gadgets.svelte,chatPane.ts}`, `R/apps/chat/*` (menu entry and link), `R/kit/organisms/StartMenu.svelte` (label only), `manuals/event-viewer.md`.

### UX-123 A crash loop never reaches "It stopped again"
- **Problem.** TH-56, T23.1-twice at both levels (SETUP FAIL, invalid). `SessionRuntime.connect` calls `problems.recovered` on every successful start, which deletes the failure count. After "Restart and send again" starts a good agent that then crashes again, the count is 1 again, so `chatProblem.ts` (`repeatLine` at failures of 2 or more) never shows "It stopped again". A user in a real crash loop sees the same first-failure box forever and is never offered "Start a new chat".
- **Decision.** Reset the count when a turn completes (the agent answered without a failure), not when the agent starts. `SessionProblems.recovered` moves from `connect` to the end of `runTurn` success. A crash after a start that did not finish a turn counts as failure 2.
- **Acceptance.** Unit tests in `SessionProblems` and `SessionService`: start, crash, restart, crash gives failures 2 and "It stopped again" with "Start a new chat"; start, turn completes, crash gives failures 1. T23.1-twice (H-65) passes at both levels.
- **Severity.** S3.
- **Findings.** TH-56, `SYNTHESIS.md` 2.2.
- **Files.** `M/application/{SessionProblems,SessionRuntime,SessionService}.ts`, `R/desktop/chatProblem.ts` (read; text unchanged), tests.

### UX-124 The sent text stays in the message box after a restart
- **Problem.** TH-56, T23.1 N and T23.2 N. After "Restart and send again" and "Send again" the transcript holds the user message twice and the message box still holds "please do the slow job" with Send enabled (shot T23.1-novice 004).
- **Decision.** The box is cleared when the message is sent, and again when a recovery button re-sends it. An unsent draft is kept only if the user typed it after the failure.
- **Acceptance.** T23.1 and T23.2 at both levels: the box is empty after the recovery click; one transcript line per send.
- **Severity.** S3.
- **Findings.** TH-56, `SYNTHESIS.md` 2.6.
- **Files.** `R/apps/chat/*`, `R/apps/shared/*` (composer state).

### UX-125 "Working: Starting the agent..." beside a ready chat
- **Problem.** TH-57, five runs (T28.1 I, T26.1 N, T26.2 I, T06.3 I, plus T28.1 N). The chat reads "Ready ... What would you like to work on?" and "Connected", but the bar reads "Working: Starting the agent..." (`workingText` shows that text while a session is `connecting`, `activity.ts` line 41). It keeps showing after the chat is ready.
- **Decision.** The bar's working state follows the turn, not the connection: "Starting the agent..." only while no chat is ready for input; once a session is connected and idle, the bar reads the idle text. A test with a session that reaches `connected` while another is still `connecting`.
- **Acceptance.** In T28.1, T26.1, T26.2, T06.3 the bar never reads "Working" while a chat shows Ready and nothing is running.
- **Severity.** S3.
- **Findings.** TH-57, `SYNTHESIS.md` 2.6, shots T28.1-intermediate 001, T26.1-novice 002, T26.2-intermediate 001, T06.3-intermediate 006 and 007.
- **Files.** `R/desktop/{activity.ts,TopBar.svelte}`.

### UX-127 Disabled buttons give no reason (shared item, WP-B and the sweep)
- **Problem.** TH-59, five runs. "Remove from desktop" (T12.1 N, record), Revert and Open in editor (T09.1 N shot 002, T22.2 N), "Set as Default" for the row that is already the default (T17.1 both, shot 010).
- **Decision.** A disabled button shows its reason in the tooltip and in a one-line note near the button ("Select a project first", "Nothing is selected", "This is already the default"). One kit helper, `reasonFor(disabled)`, used by each. WP-B does the Management panel and Agent Manager buttons; WP-D does Revert and Open in editor in the Changes pane (as part of UX-117); the sweep checks the rest.
- **Acceptance.** Each disabled button named has a tooltip with a reason; a keyboard user gets the same text as the accessible description.
- **Severity.** S3.
- **Findings.** TH-59.
- **Files.** `R/apps/agent-manager/*`, `R/apps/control-centre/*`, `R/apps/explorer/*` (the Management panel; WP-A reviews), `R/kit/*` (new helper, additive).

### UX-134 Error text: "port", ERR_UNSAFE_PORT, ENOENT, unnamed broken agent
- **Problem.** TH-66, S4. Browser error page says "port" and shows ERR_UNSAFE_PORT; Details shows ENOENT and AG-UI text (opt-in, by design); the banner names the program but not the agent ("My assistant") (T17.2).
- **Decision.** "The address uses a port that the Browser blocks" gets "(the number after the colon)" in plain words; the code stays in the opt-in Details only. The banner reads "My assistant could not start: the program 'x' was not found."
- **Acceptance.** No ERR_ or ENOENT in the default view; the banner names the agent.
- **Severity.** S4.
- **Findings.** TH-66.
- **Files.** `R/apps/chat/*`, `R/desktop/chatProblem.ts`, `R/apps/browser/errorPage*` (one line, WP-C informed).

---

## WP-A Shell, windows, launcher, Task Manager, words

### UX-119 The launcher stays in front after Connect and Create
- **Problem.** TH-53, T13.2 both and T01.1 I. After Connect the maximized launcher still fills the screen, the row reads "Connected" and the button "Show desktop"; the new desktop window is behind it (shot T13.2-intermediate 002).
- **Decision.** After Connect or Create the desktop window comes to the front and has focus; the launcher is minimized (or restored to its normal size behind), not left maximized in front. The row keeps its selection.
- **Acceptance.** T01.1, T02.1, T13.2 at both levels: the last shot shows the desktop in front; a check reads the window order.
- **Severity.** S3.
- **Findings.** TH-53, `SYNTHESIS.md` 2.6.
- **Files.** `R/launcher/*`, `R/pages/LauncherPage.svelte`, `M/application/desktop/DesktopService.ts` (focus), `manuals/launcher.md`.

### UX-120 The chat window covers the Browser the agent is working in
- **Problem.** TH-53, T28.1 both. The chat opens on top of the Browser while the agent works on the page, and goes behind it afterwards (shots T28.1-intermediate 001 and 007), so the user cannot watch the page.
- **Decision.** Placement: a chat started from a Browser task opens beside the Browser (the half of the work area the Browser does not use), never over it. Opening a window from an agent action does not take the foreground from the window the agent is acting in.
- **Acceptance.** T28.1 at both levels: in the last shot the Browser content and the chat do not overlap by more than 10%.
- **Severity.** S3.
- **Findings.** TH-53.
- **Files.** `M/application/desktop/DesktopService.ts`, `R/desktop/{WindowLayer,windowOrder.ts,geometry.ts}`.

### UX-130 Task Manager default tab
- **Problem.** TH-63, T20.2 both (S4). Task Manager opens on Chats with "End Task"; stopping the program is on Processes (shot T20.2-intermediate 002). Both panelists found the right tab.
- **Decision.** Open on Processes when the user came from a problem or a program named in an error; otherwise keep Chats. The confirmation dialog stays.
- **Acceptance.** T20.2: no tab change is needed.
- **Severity.** S4.
- **Findings.** TH-63.
- **Files.** `R/apps/task-manager/*`.

### UX-133 Words: "appear as drives", "plugged in", "private C: drive", "Scripted demo"
- **Problem.** TH-62, S4, five runs. Project, folder and drive are three words for one thing in one dialog; "Scripted demo" means nothing to a newcomer; long folder paths are cut.
- **Decision.** Pick "project" in text and add "(it appears as a drive)" once, in the New desktop dialog only. "Private C: drive" becomes "Your files (C:)". "Scripted demo" becomes "Demo assistant". Paths are cut in the middle, not at the end.
- **Acceptance.** `docs/DOCUMENTATION_STYLE.md` vocabulary list has the three terms; a grep of the renderer finds no "Scripted demo".
- **Severity.** S4.
- **Findings.** TH-62.
- **Files.** `R/launcher/*`, `R/apps/explorer/*`, `manuals/{explorer,projects}.md`.

### UX-136 Closing a chat; "Needs your approval" and "Agent problem" look alike; "Give control back" in two places
- **Problem.** TH-68, S4. T13.1 N: closing a chat gives no word that the job goes on. T14.1 N: two row states are alike in size and color. T28.2 N: "Give control back" is in the page bar and in the top bar.
- **Decision.** A toast on close "The agent keeps working. Open it again from the Task Manager." when a turn is running. Agent problem rows use the error color and icon. One "Give control back" button (top bar); the page bar shows the state only.
- **Acceptance.** T13.1, T14.1, T28.2: the three observations are gone.
- **Severity.** S4.
- **Findings.** TH-68.
- **Files.** `R/desktop/{Balloon.svelte,DesktopController.svelte.ts}`, `R/launcher/*`.

### UX-137 Keyboard hints are small; Ctrl+N only in the Start menu
- **Problem.** TH-69, S4. T21.1 both (evidence void, H-69). "Press Alt+A..." hints are small; Ctrl+N is shown only in the Start menu.
- **Decision.** Show the shortcut in the File menu item "New chat" and in the tooltip of the launcher "New" button; hint text at the same size as the body text.
- **Acceptance.** T21.1 with a fresh panelist (H-69) in 4 actions at both levels.
- **Severity.** S4.
- **Findings.** TH-69.
- **Files.** `R/launcher/*`, `R/desktop/*` (menu labels).

---

## WP-C Browser and surfaces: labels

### UX-128 "Ask about this page" looks like a label; the yellow bar goes stale
- **Problem.** TH-60 and TH-57, T19.1 both. The link is a clipped label in the status bar ("Ask about this pag", shot T19.1-novice 009); it was found, but it looks like text. The yellow bar still reads "Agent is using this page: Reading the page" after the read is done, with Take over still present.
- **Decision.** "Ask about this page" is a button in the toolbar (always visible, full text, tooltip). The yellow bar changes to "The agent read this page." when the read is done and goes after 5 seconds, unless the agent is still working on it.
- **Acceptance.** T19.1 both levels: the full label in the shot; the yellow bar text matches the Activity gadget.
- **Severity.** S3.
- **Findings.** TH-60, TH-57, `SYNTHESIS.md` 2.6.
- **Files.** `R/apps/browser/*`, `manuals/browser.md`.

### UX-135 Cut or mismatched labels
- **Problem.** TH-67, S4, five runs. "Board" against "Board - from the agent"; the "Notes" tab for a form; the tab label "Second pa..." (shot T29.1-novice 011); "Text document (M..." in the file type column (T30.1 N). Browser "+" has no label or tooltip.
- **Decision.** One name per surface everywhere (window title, chat card, tab). A form's tab is called "Form". Tab labels cut with an ellipsis at the end only after 14 characters, with the full title in the tooltip. File type column wide enough for its longest value. Tooltip "New tab" on the Browser "+".
- **Acceptance.** The listed shots show full labels; every cut label has a tooltip.
- **Severity.** S4.
- **Findings.** TH-67.
- **Files.** `R/apps/browser/*`, `R/app/session/SurfaceRow*`, `R/apps/explorer/*` (column width only).

---

## WP-D Code, review, Changes pane, Help

### UX-116 Changes pane: cut names and a cramped diff pane
- **Problem.** TH-51, eight runs (T06.1, T08.1, T08.2, T09.1 at both levels). Names read "direct.t", "ession", "t.test.t" (shot T08.2-novice 003); the diff pane shows about five lines at the default window size; the intermediate maximised the window to read a diff. R3 UX-111 was not effective.
- **Decision.** The name column is at least as wide as the longest file name in the list, or the name shows folder and name with the cut in the middle ("src\auth\...\redirect.ts"), never at the front of the name. The diff pane gets at least 40% of the pane height (a splitter, saved per window); at the default window size at least 12 lines show. Full path in the tooltip.
- **Acceptance.** T08.1 and T08.2 at both levels: no cut file name in the shot for the names in the test project; the diff pane shows 12 lines or more at the default size; a component test with a 30-character name.
- **Severity.** S3.
- **Findings.** TH-51, `SYNTHESIS.md` 2.6.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/app/changes/*`, `R/kit/organisms/{ListView,DataGridView}.svelte`.

### UX-117 Reverted files vanish from Changes after a reopen
- **Problem.** TH-51, T09.1 both. After revert and reopen the file leaves the Changes list and no "Open Recycle Bin" link shows (shot T09.1-novice 002), while a live session (T08.1-novice 008) shows both. `ChangesPane.svelte` keeps `reverted` in component state (lines 33 to 41). Both panelists dead-ended there. R3 UX-79 was not effective.
- **Decision.** Keep the reverted rows in the main store of the chat (per chat, saved with it), not in component state; the grey "Reverted" row and the link "Open Recycle Bin" survive closing and reopening the pane and the window. Revert and Open in editor, greyed with nothing selected, carry a reason (UX-127).
- **Acceptance.** T09.1 at both levels: after reopening, the Reverted row and the link are in the shot; the Recycle Bin is reached in 2 actions or fewer; a test that unmounts and remounts the pane.
- **Severity.** S3.
- **Findings.** TH-51, `SYNTHESIS.md` 2.6.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/app/changes/*`, the chat session store (additive).

### UX-122 Review: the unlabelled "+" and the new-chat dialog
- **Problem.** TH-55, T26.2 both, T26.1 N. A 10 px "+" in the gutter, a second small blue "+" on hover; a click on the line number only selects the line, and the novice found the box by double-click (shot T26.2-intermediate 001). The dialog says "New chat (review-notes) E:\" for the open chat and "Start a new chat" below it, so the choice is not distinguishable (shot T26.1-novice 002). R3 UX-108 and UX-109 were not effective.
- **Decision.** (1) A toolbar button "Add comment" (enabled when a line is selected) and a click on the line number selects and opens the comment box. (2) The gutter "+" is at least 16 px with the tooltip "Add a comment on this line". (3) The dialog lists the open chat as "Chat: review-notes (in E:\)" and the other choice as "Start a new chat for these comments".
- **Acceptance.** T26.2 both levels in 3 actions or fewer, no double-click needed; T26.1 novice names the difference in the dialog without help.
- **Severity.** S3.
- **Findings.** TH-55, `SYNTHESIS.md` 2.6.
- **Files.** `R/apps/code-review/*`, `R/apps/code/*` (gutter shared), `R/app/changes/*`.

### UX-126 "Ask about selection" loses the selection highlight
- **Problem.** TH-58, T27.1 both. After the pane opens, the status bar reads "Selected 1-2" but lines 1 and 2 are not highlighted, and the pane is 330 px wide so the question and answer wrap (shot T27.1-intermediate 003).
- **Decision.** Keep the highlight (a lighter color when the editor loses focus). The pane opens at least 420 px wide.
- **Acceptance.** T27.1 at both levels: the highlight is in the shot after the question is sent; the pane is 420 px or wider.
- **Severity.** S3.
- **Findings.** TH-58.
- **Files.** `R/apps/code/*`.

### UX-129 The Review window opens narrow and cuts the code
- **Problem.** TH-61, T24.1 both. A double-click on a Changes row opens a second window at about 450 px wide with the code cut.
- **Decision.** Open at 70% of the work area width (at least 720 px), beside, not over, the Code window.
- **Acceptance.** T24.1 at both levels: the last shot shows whole code lines for the test file.
- **Severity.** S3.
- **Findings.** TH-61.
- **Files.** `R/apps/code-review/*`, the window size entry in the app registry.

### UX-131 Review status line and cut banner
- **Problem.** TH-64, S4. "2 files changed, 1 shown" confused three of four panelists; the banner "Two comments, one of t..." is cut (T25.2 intermediate).
- **Decision.** "2 files changed. Showing 1 (the one you opened)." The banner wraps to two lines instead of cutting.
- **Acceptance.** T25.1 and T25.2: no cut text in the banner.
- **Severity.** S4.
- **Findings.** TH-64.
- **Files.** `R/apps/code-review/*`.

### UX-132 Help: F1 lands at section 5 with the answer at the bottom edge
- **Problem.** TH-65, S4. F1 opens "Using Explorer" and "Using Chat" at "5 - Common Tasks", but the Undo heading sits at the bottom edge and needs a scroll; the table of contents is long; Help opens beside the app, not over it; the Terminal cursor blinks while the status bar says Read-only (T31.2 N).
- **Decision.** Scroll the anchor to the top third of the Help pane. Collapse the table of contents to the current chapter. The Terminal cursor is a steady block when the terminal is read-only.
- **Acceptance.** T22.2 both levels: the anchor heading is in the top half of the first shot; T31.2: no blink.
- **Severity.** S4.
- **Findings.** TH-65.
- **Files.** `R/apps/help/*`, `R/apps/terminal/*` (cursor style, one line).

---

## Harness

Not product work; owner: facilitator. Details and evidence in `panel/r4/SYNTHESIS.md` section 5.

| id | Where | Fix |
|---|---|---|
| H-65 | `presets/chat.mjs` `crashed-agent` (`twice`), `tasks.mjs`, `tasks.md` | After UX-123 ships assert "It stopped again"; until then force the second failure with a start that fails twice. Delete the stale comment ("one SIGKILL is counted as two failures"). Add T23.1b to `tasks.md`. |
| H-66 | `server.mjs` `start`, `session.mjs` | A preset that throws closes the app, releases the lock and keeps `server.log`; `start` is idempotent for the same task and level. |
| H-67 | `session.mjs check` | Append every run to `check.json.runs`; refuse answers shorter than five words; the record shows all runs. |
| H-68 | `session.mjs check`, `checks/chat.mjs` T16.2, `checks/desktop.mjs` T02.2 and T22.1 | Refuse a verdict for an answer task without `--answer`; add keyword checks for T16.2, T02.2, T22.1. |
| H-69 | `PANELIST.md`, `FACILITATOR.md`, `tasks.md` T21.1 | One fresh panelist per task (or per journey in an order that does not teach the next task); T21.1 Min 4, budget 12 / 16. |
| H-70 | `checks/chat.mjs` T11.2 | Print "take over: userInControl true", drop the groups line; add a banner-against-chips check (for UX-118). |
| H-71 | `scripts/browser-agent.json` (last message) | Replace "DONE {{mine}}" with "I sent the message and found it in #general." |
| H-72 | `session.mjs stop` and `check`, `check.json` | `stop` reads `- SEQ:` from the record; remove `--seq`; regenerate the 19 `check.json` files (18 reversed rows and T22.1 novice); reject SEQ outside 1 to 7. |
| H-73 | `presets/desktops.mjs` `four-desktops`, `tasks.md` T14.1 | Preselect another row in the preset or add a second task that starts with another row selected. |
| H-74 | `checks/features.mjs` T06.1 | Require "1", "3" and "4", or "+3" and "-3", in the answer. |
| H-75 | `PANELIST.md` | The final report names the shot for every claim about timing; the researcher checks one claim per record. |
| H-76 | `scripts/fix-redirect.json`, `two-edits.json`, `five-edits.json`, `PermissionBroker.test.ts` | Add a variant with the diff inside the request and a broker integration test for both shapes (the split shape fails today); needed for UX-114. |

## Coverage of findings

| Theme | Item |
|---|---|
| TH-49 permission box | UX-114 |
| TH-50 Control Center layout | UX-115 |
| TH-51 Changes names, diff pane, reverted rows | UX-116, UX-117 |
| TH-52 chips against the setting | UX-118 |
| TH-53 launcher in front, chat over Browser | UX-119, UX-120 |
| TH-54 Event Viewer | UX-121 |
| TH-55 review "+" and dialog | UX-122 |
| TH-56 crash loop and composer | UX-123, UX-124 (harness H-65, H-66) |
| TH-57 status text | UX-125, UX-128 |
| TH-58 selection highlight | UX-126 |
| TH-59 disabled reasons | UX-127 |
| TH-60 "Ask about this page" | UX-128 |
| TH-61 review window | UX-129 |
| TH-62 words | UX-133 |
| TH-63 Task Manager tab | UX-130 |
| TH-64 review status | UX-131 |
| TH-65 Help | UX-132 |
| TH-66 error text | UX-134 |
| TH-67 labels | UX-135 |
| TH-68 closing chat, row states, two buttons | UX-136 |
| TH-69 keyboard hints | UX-137 |
| T23.1-twice, T06.1 defects | UX-123 and H-65; UX-114 and H-76 |
| "Cryptic final browser reply" | H-71 (harness, not product) |

## Rerun plan

1. WP-B first (UX-114 is the only S2); then WP-A, WP-C, WP-D in parallel.
2. Harness H-65 to H-76 in parallel with the product work; H-69 (fresh panelists) before any rerun.
3. Rerun with fresh panelists at both levels: T23.1-twice (and T23.1b), every weak or MANUAL row of `SYNTHESIS.md` 2.1, and every task of J05, J06, J07, J08, J09, J10, J13, J16, J20, J23, J26, J27, J28.
4. Full pass on the packaged build for the release gate: the novice median 6 or more, no task below 5, no record contains the sentences named in the acceptance lines above.
5. Outside the panel: the axe re-scan and manual checklist (D5), `perf.mjs` on the reference machine and a 30-minute soak (D10, UX-84). The UX lead accepts or rejects each open S4 in `findings.md`.
