# Fix backlog, round 7

Source: `panel/r7/SYNTHESIS.md` (themes TH-105 to TH-122, harness defects H-96 to H-105), `scorecard.md` (round 7), the 120 round 7 records, the session folders in `docs/ux/panel/r7/`, and the product source for every cause named below. Items of rounds 1 to 6 (UX-01 to UX-172) are not repeated unless R7 shows them not effective or only partly effective. R7 ran on the packaged build with a fresh panelist for every session, so its step counts and learnability findings stand.

**Severity.** Rubric scale of `rubric.md`: S1 blocker, S2 major, S3 minor, S4 cosmetic. There is no open S1. **Two S2 (UX-173, UX-174), five S3 (UX-175, UX-176, UX-179, UX-184, UX-188) and 13 S4 (UX-177, UX-178, UX-180, UX-181, UX-182, UX-183, UX-185, UX-186, UX-187, UX-189, UX-190, UX-191, UX-192)**, 20 new items (R6: one S2, eight S3 and six S4). S4 items are open until the UX lead accepts them in `findings.md`. The target of this backlog is every journey at 10/10, so the S4 items are in it. The two failed tasks of the round are UX-173 (T06.3 novice) and UX-174 (T17.2 novice).

**Migrations.** No work package needs a database migration. Reserved: none. The next free migration number stays **013**. A WP that finds it needs one takes 013 and tells the others in the merge request.

Paths: `R` = `src/renderer/src/lib`, `M` = `src/main`, `shared` = `src/shared`. The Task Manager is `R/apps/agent-manager/*` (registry id `agent-manager`).

## R6 backlog: verification with R7 evidence

15 items: **7 fixed, 7 fixed in part, 1 not fixed.** Shots are named `<task>-<level> <number>`. A record without a number was read, not viewed.

| R6 item | Verdict | Evidence in R7 |
|---|---|---|
| UX-158 diff in the permission box one to three rows tall | **Fixed in part** | `T06.1-novice 001`: one scroll area, about seven diff rows, the question and the path stay on top, "3 lines added, 3 removed". `T07.1-novice 001`: the same in two chats, with the link "Show the whole change". T06.1 passes at both levels (2 actions, SEQ 6 and 7). The changed lines 1, 3 and 4 still need one scroll, the transcript above the box is one row, and four records say the diff is short (T06.1 N and I, T07.1 I, T05.1 N). The R6 line "at least 8 rows visible" is not met. Residual S4: UX-177. |
| UX-159 permission chips look like labels | **Fixed in part** | The chips are bordered pills with a hover underline and open Control Center on Permissions (`T16.2-intermediate 002`, record step 2). `TopBar.svelte` has `title={chip.tooltip}`. Two records wrote "no tooltip" (T10.2 N, T16.2 I) but their shots were taken at once after the pointer moved (H-103), so I cannot confirm it. No record says that a chip was a guess. The words are still unclear: "Ask" (T10.2 N and I, T06.3 N), "Stopped: you took control" (T06.3 N). Residual S4: UX-178. |
| UX-160 second crash highlights Event Viewer | **Fixed** | `T23.1b-intermediate 001`: "Restart" is the highlighted button, then "Start a new chat (your text is kept in the box)", "Details...", and the sentence "The details are in Event Viewer." after the buttons. T23.1b intermediate SEQ 6 (R6 5), 5 of 9. A new problem with the same box: UX-175. |
| UX-161 manual says "Tasks and changes", window says "Changes" | **Fixed** | `T22.2-novice 002`: the chat's welcome text says "To undo a change, open Changes and click Revert." T22.2 answered in one action at both levels (R6 novice 12 of 16). `manuals/chat.md` has "Tasks and changes" only for the View menu item (line 115), which exists in `ChatApp.svelte` line 309. The button and the menu item still have two names: S4, UX-178. |
| UX-162 failed Send leaves a second "You" bubble | **Fixed** | `T23.2-novice 001`: one "You" bubble, "The connection to the assistant dropped. Could not send.", "Send again", and "Press Send to try again." above the box. T23.2 SEQ 6 and 7 (R6 intermediate 5). |
| UX-163 Chats icon opens Task Manager, no way back to a closed chat | **Fixed in part** | `T04.2-novice 003`: Task Manager opens on the Chats tab with "Open chat" and "End Task". A double-click on the row or "Open chat" reopens the chat (T13.1 N and I, "Reopened ... Your earlier messages are kept."). T04.2 SEQ 6 and 6 (R6 5 and 5), T13.1 SEQ 5 and 6 (R6 4 and 3). Not done: "Open chat" is greyed until a row is selected and no row is selected on open (T04.2 N record), the Chats icon still opens a window called "Task Manager" (T04.2 I record). The hint in the stop notice shows only after Stop is pressed (`StopNotice.svelte`), so T20.2 novice never saw it: 15 of 16 actions, SEQ 3. Residual: UX-176 (S3) and UX-180 (S4). |
| UX-164 launcher stays in front, nothing says what to do next | **Fixed in part** | Part 1 (launcher minimised) is in the code (`DesktopWindowManager.minimizeLauncher`) and the desktop is the window the panelists work in. The shot after "Create" still shows the launcher because the driver shoots before the new window is up (`T01.1-intermediate 003`, H-102). Part 3 is in: "You can add projects later." (T01.1 records). Part 2 is in but broken: the balloon "No project yet ... open Computer, then Plug in a project." names Computer and its button "Open Computer" closes the balloon and opens nothing (`T01.1-intermediate 004`, `005`, `006`, `008`). T01.1 intermediate SEQ 3. UX-179 (S3). |
| UX-165 Help: F1 opens the Keyboard topic, narrow window | **Fixed** | `T01.1-novice 004`: F1 on the new desktop opens "Using the Desktop". `T31.2-novice 005`: the Help window is about 750 px wide, inside the screen, the search box has a margin, the topic list is 200 px. Residual S4: the text above the target heading is cut at the top (`T31.2-novice 005`), the status bar repeats the title (`T01.1-novice 004`). UX-183. |
| UX-166 windows over the desktop icons | **Fixed** | All icons are visible in all R7 shots (`T20.2-novice 001`, `T06.3-novice 001`). T20.2 novice clicked Control Center at once. Residual S4: a new window covers the window that opened it (UX-181). |
| UX-167 cut text and silent greys in Changes and Review | **Fixed in part** | The Status column now fits "Reverted" (`T08.1-novice 006`). Still cut: the status "Mo..." and the path "E:\sr..." (`T05.1-novice 010`, `T09.1-novice 003`), the comment texts are fine, the Review banner repeats itself in a column about 90 px wide (`T26.1-novice 005`), "Showing 1 of 2 changed files" again (T25.1 N). Residual: UX-184 (S3, with the diff size), UX-191 (S4). |
| UX-168 a single click on a Git row only selects | **Fixed** | T24.1 N and I: a click on the redirect.ts row shows its diff in the pane below, no window (records steps 2 and 3). T24.1 SEQ 6 and 7. |
| UX-169 no Restore where a user looks | **Not fixed** | `T09.1-novice 003`: the reverted row is selected, the diff pane says "Select a changed file to view its diff.", Revert is greyed and there is no Restore. "Open Recycle Bin" is a text link at the top (novice: "easy to miss"). The novice took 5 actions with one dead end, SEQ 6. Now UX-185. |
| UX-170 raw tool ids in the status text | **Fixed** | `T28.1-novice 005`: "Working: Clicking on the page" in the top bar, "Agent is using this page: Clicking the button 'random'" on the page. `T28.1-novice 007`: "Used 28 steps in the browser (read, waited, typed). First: Opened 127.0.0.1:4174. Last: Waited for the page." No record contains "agent7.browser_" (0 of 120). |
| UX-171 Event Viewer hides the cause, Activity says nothing happened | **Fixed in part** | `T20.1-novice 001`: the Activity gadget says "Warning: Drive E: is not plugged in on this desktop...." and `003`: Event Viewer opens with the Warning row, "27 more: Show all" and the cause in the General tab. T20.1 novice SEQ 7 (R6 5), 2 actions. Still wrong: the sentence in the gadget ends in dots, and for a crash the gadget shows "Error: RUN_ERROR" and keeps it after recovery (`T23.1-intermediate 004`, `T23.1b-intermediate 001`, `T23.2-novice 001`). UX-188 (S3). |
| UX-172 page bar cut, "Take over" unexplained, hidden first sentence | **Fixed in part** | `T28.2-novice 002`: the page bar wraps to two lines and the button reads "Taken over". The box of "Ask about this page" holds the whole text (`T19.1-novice` record step 5). Still: the chat pane covers the right part of the page (T19.1 N and I), the novice asked whether Take over stops the assistant (T28.2 N record). UX-189. |

**R6 harness items:** H-87 (T27.2: both rows pass), H-88 (T06.1 intermediate: "3 added, 3 removed" accepted), H-89 (T17.2 intermediate passes), H-90 (an Answer line in every answer record), H-91 (T13.1: both rows had a window of the original chat), H-93 (one "Steps" heading, `rerun` and `finishedByFacilitator` fields), H-94 (`build.packaged: true` in 120 of 120), H-95 (`flaky` script described in `tasks.md`): **fixed and seen working.** H-92: built, not used (`stepsToPass` equals `steps` in 120 of 120 because no `--steps-to-pass` was given: H-101).

R4 S4 items UX-133 to UX-137 (words: "Scripted demo", "plug in", "ENOENT", "port", "Notes" and "Board" for a form) are still open (T02.2 N 008 shows "Agent: Scripted demo", T19.2 N, T17.2 N, T18.1 sidebar N). The UX lead decides them in `findings.md`.

Only problems that I confirmed against the shots, logs and code are listed. Not product, so no item: the scripted reply "The page is titled Fixture page..." to a follow-up (T28.1 novice, H-98), the host paths "/tmp/a7ux-..." in the project list and in Browse For Folder (fixture, H-104), the desktop icon that needs a double-click (five novices, Windows convention, the balloon says so), the missing tooltip on the chips (shot timing, H-103), the launcher in the first shot after Create (shot timing, H-102).

## Work packages

| WP | Name | Items | Files owned (edit freely) |
|---|---|---|---|
| WP-A | Approvals, take-control, chat errors, chat menu | UX-173, UX-174, UX-175, UX-176, UX-177, UX-178 | `R/app/session/{PermissionDialog.svelte,ApprovalDetail.svelte,ErrorRow.svelte,SessionView.svelte,chatProblem.ts,StopNotice.svelte,UserMessage.svelte}`, `R/desktop/{UacDialog.svelte,TopBar.svelte,activity.ts,approval.ts}`, `R/apps/chat/ChatApp.svelte`, `M/application/{SessionRuntime,SessionService,SessionProblems}.ts`, `manuals/{chat,approvals}.md` |
| WP-B | Shell: balloon, Chats and Task Manager, window placement, folder dialog, Help, About | UX-179, UX-180, UX-181, UX-182, UX-183, UX-192 | `R/apps/agent-manager/*`, `R/desktop/{DesktopController.svelte.ts,DesktopSurface.svelte,Balloon.svelte,closeChat.ts,shellHints.ts,shellKeys.ts,geometry.ts}`, `R/pages/{LauncherPage,DesktopPage}.svelte`, `R/launcher/*`, `R/apps/registry.ts`, `R/apps/explorer/explorerContext.ts`, `R/apps/help/*`, `R/kit/organisms/{FolderBrowserDialog.svelte,folderBrowser.ts,AboutDialog.svelte}`, `M/application/desktop/DesktopService.ts`, `manuals/{desktop,launcher,help,agent-manager}.md` |
| WP-C | Code, Changes, Review | UX-184, UX-185, UX-186, UX-187, UX-191 | `R/apps/code/*`, `R/apps/code-review/*`, `R/app/shell/ChangesPane.svelte`, `R/apps/shared/{EmbeddedChat,ChatStrip}.svelte`, `manuals/{code,code-review,embedded-chat}.md` |
| WP-D | Activity gadget, Event Viewer, Browser, Terminal | UX-188, UX-189, UX-190 | `R/apps/event-viewer/*`, `R/desktop/Gadgets.svelte` (the Activity gadget block only), `R/apps/browser/*`, `R/apps/terminal/*`, `R/app/session/{browserSteps.ts,toolTitles.ts}`, `M/application/tools/{browserLabels,browserTools}.ts`, `manuals/{browser,event-viewer,terminal}.md` |
| final | Sweep | rerun | one developer, after WP-A to WP-D are merged |

WP-A to WP-D can run in parallel. The file sets are disjoint. The files below sit near a border, so each WP edits only the part named.

**Shared files to watch (small, additive edits in a separate block; merge in the order WP-A, WP-B, WP-C, WP-D, or rebase often):**
- `R/desktop/TopBar.svelte`, `R/desktop/activity.ts`: WP-A only (UX-173, UX-178). WP-D does not edit them. The Activity gadget text comes from `R/apps/event-viewer/eventModel.ts` (`lastProblem`), which WP-D owns.
- `R/desktop/DesktopController.svelte.ts`: WP-B owns. WP-A adds no handler there. UX-175 stays inside `SessionView.svelte`.
- `R/app/session/*`: WP-A owns the files listed in its row. WP-D owns `browserSteps.ts` and `toolTitles.ts`. No other file of the folder changes.
- `R/apps/chat/ChatApp.svelte`: WP-A only (the Tools menu entry of UX-176, the View menu label of UX-178).
- `R/apps/shared/EmbeddedChat.svelte`: WP-C only.
- `manuals/*.md`: each WP edits only the manuals listed. `scripts/check-help-coverage.mjs` must stay green after each merge (527 of 527 ids today).

---

## WP-A Approvals, take-control, chat errors, chat menu

### UX-173 "Ask before every action" reads like a saved setting and is not
- **Problem.** TH-105, three runs. T06.3 novice FAILED on it (4 of 24 actions, SEQ 6, check "not met: Terminal policy is allow"). `T06.3-novice 001`: the top bar has "Run commands: Allow" and an unchecked "Ask before every action". `T06.3-novice 002`: after one click all four chips read Ask, the bar says "You are in control. All tools ask first until you resume." with a Resume button, and the Activity gadget says the same. The saved policy is still Allow. The box is the take-control mode: `T28.2-novice 002` shows it ticked after "Take over". The scenario says "must never run commands without asking you first. Set things up that way". The panelist stopped, and a user who stops here is unprotected after Resume or a restart. The intermediate went to Control Center and passed (8 of 18) and wrote that the box "could be confused with this setting". `activity.ts` already puts "You are in control, so the agent asks first." in the chip tooltip, which a person sees only after a delay.
- **Decision.** (1) The box gets a label that says what it is: "Ask before every action (until I untick it)". (2) Next to the Resume button and in the Activity gadget the banner adds one sentence: "This is not saved. To keep a tool on Ask, change it in Control Center." with a link that opens Permissions. (3) While the box is ticked, a chip that differs from the saved policy reads "Run commands: Ask (now)" and its tooltip names the saved value ("Saved setting: Allow"). (4) `manuals/approvals.md` and the Permissions page tell the same two ways: this session only (the box) and always (Control Center).
- **Acceptance.** T06.3 at both levels: the novice either uses Control Center or reads the sentence and uses its link, and the Terminal policy in the saved policy is Ask or Deny. No record says that the box looks like a lasting setting. T11.2 and T28.2 unchanged (the box is the right tool there). Unit test on the chip label with the box ticked and a saved Allow. Needs H-99 for the route in `check.json`.
- **Severity.** S2 (a failed task of the panel).
- **Findings.** TH-105, `SYNTHESIS.md` 2.1 and 2.6.
- **Files.** `R/desktop/{TopBar.svelte,activity.ts}`, `manuals/approvals.md`.

### UX-174 The crash box makes "Try again" the default for a program that is not there, and the second error has no route
- **Problem.** TH-106, two runs. T17.2 novice FAILED (9 of 12, SEQ 2). `T17.2-novice 002`: after the first "Try again" the box says "My assistant could not start: the program 'not-a-real-command' was not found." and "It stopped again: ...", with "Try again" highlighted (the blue default) before "Open Agents", "Choose another agent", "Start a new chat" and "Details...". A retry cannot find a program that is not there. After the panelist set Claude Code as default, `T17.2-novice 009` says "Claude Code could not start: the program 'npx' stopped before it was ready." and highlights "Try again" again. The text gives no cause that a novice can use ("I did not know what npx is") and the Details show "Internal error" and "Query closed before response received" (`T17.2-novice` record steps 8 and 10). The sandbox cannot run `npx` (H-97), which is the fixture part of the cause. `chatProblem.ts` puts `retry` first in the actions of `start-failed`.
- **Decision.** (1) For `start-failed`, the highlighted button is "Choose another agent" when the program was not found, and after any second failure for every cause. "Try again" stays in the row, second. (2) The text names the next step in one sentence: "The program was not found. Check the command in Agents, or choose another agent." For a program that stops at once: "The program stopped before it was ready. Check that it is installed, or choose another agent." (3) After the user changed the default agent, the box says "The default agent is now Claude Code. It could not start either." and keeps "Choose another agent" highlighted. (4) Details never starts with "Internal error": the first line is the plain sentence of the box.
- **Acceptance.** T17.2 at both levels: the answer has the cause, the Agents page and an action, with a working second agent in the fixture (H-97). T17.2 novice 8 actions or fewer and SEQ 5 or more. In `T17.2` shots the highlighted button is not "Try again". Unit test on `chatProblem.ts` for the default action per cause and per failure count.
- **Severity.** S2 (a failed task of the panel).
- **Findings.** TH-106, `SYNTHESIS.md` 2.1 and 2.4.
- **Files.** `R/app/session/{chatProblem.ts,ErrorRow.svelte}`, `M/application/SessionProblems.ts`, `manuals/chat.md`.

### UX-175 "Start a new chat (your text is kept in the box)" keeps the text in the old window
- **Problem.** TH-109, T23.1b intermediate (SEQ 6, 5 of 9 actions). `T23.1b-intermediate 001` offers the button with that label. `T23.1b-intermediate 003`: the new "New chat" window is empty and the message box of the old, disconnected window holds "please do the slow job". The panelist retyped the text. The source says this is intended (`SessionView.svelte` line 179: "the text of the failed message stays in this chat's message box first"), but the label does not say which box.
- **Decision.** The text goes into the new chat's message box, so that Enter sends it, and the old box is emptied. If that cannot be done in this WP, the label reads "Start a new chat (copy your text there)" and the new chat opens with the text already in its box by the same route. The old window keeps its error and says "Continued in a new chat".
- **Acceptance.** T23.1b at both levels: after "Start a new chat" the new window's box holds the failed text, one Enter sends it, SEQ 6 or more in 3 or 4 actions. No record says the text was in the wrong window.
- **Severity.** S3.
- **Findings.** TH-109.
- **Files.** `R/app/session/{SessionView.svelte,chatProblem.ts}`.

### UX-176 Nothing leads to "End process" before the user has pressed Stop
- **Problem.** TH-107, two runs. T20.2 novice (15 of 16 actions, SEQ 3, weak) and intermediate (7 of 12, SEQ 5). The novice did not press the chat's Stop because the scenario says to stop the program, not the conversation, so it never saw "To end the agent program, use Task Manager, Processes." (that line is only shown for the stop reason `cancelled`, `StopNotice.svelte`). The doors it tried: Control Center (Agents, Permissions, Appearance, About), the Event Viewer link, File (New chat, Clear transcript, Close), Tools (Review changes, Open in Code, Event Viewer: `T20.2-novice 007`), the window's close button (opens the launcher: "Closing a desktop window only disconnects it. Its agents keep running."), Show Options and Connect on the launcher. It found Task Manager in the Start menu at action 12. The intermediate tried Control Center and Computer first. Both liked the End process dialog.
- **Decision.** (1) The chat's Tools menu gets "Task Manager..." and the File menu gets "End the agent program..." that opens Task Manager on the Processes tab with the row selected. (2) While a chat has been working for more than 20 seconds the status line under the transcript adds a link "Not responding? End the agent program" (same target). (3) The closing sentence of the launcher ("Its agents keep running.") gets "To end them, use Task Manager" with a link. (4) The stop notice keeps its line.
- **Acceptance.** T20.2 at both levels: 6 actions or fewer, SEQ 5 or more, the novice does not open Control Center or Event Viewer first; no record says there is no way to end the program from the chat. The R6 acceptance for UX-163 (T20.2 novice 8 actions) is carried.
- **Severity.** S3.
- **Findings.** TH-107, `SYNTHESIS.md` 2.4.
- **Files.** `R/apps/chat/ChatApp.svelte`, `R/app/session/StopNotice.svelte`, `manuals/chat.md`. (The launcher sentence is UX-179's file set: WP-B adds it in `R/launcher/*`.)

### UX-177 The permission box diff is still one scroll short
- **Problem.** TH-115, four runs. `T06.1-novice 001`: about seven diff rows in one scroll area, the changed lines 1, 3 and 4 need one scroll ("scrolled the diff one notch"), no hint that it scrolls (T06.1 I record), and the transcript above the box keeps one row. `T07.1-novice 001`: the same for two chats. T05.1 novice: "Waiting for permission" is a small status at the bottom right. R6 UX-158 asked for 8 rows and a 55% box.
- **Decision.** The diff shows at least 9 rows when the window is 480 px high or more (the box takes up to 55%, the transcript shrinks to one row but never to zero). The last visible row is half cut only when more rows follow, so a scroll bar is not the only hint. The status bar says "Waiting for your answer" when a box is open.
- **Acceptance.** T06.1, T05.1, T07.1: the three changed lines of `redirect.ts` are visible without a scroll at the default window size; no record says the diff is short.
- **Severity.** S4.
- **Findings.** TH-115.
- **Files.** `R/app/session/{PermissionDialog.svelte,ApprovalDetail.svelte}`, `R/desktop/UacDialog.svelte`.

### UX-178 Words: "Ask", "Stop" against "Pause all agents", "Tasks and changes" against "Changes"
- **Problem.** TH-115, eight runs. "Run commands: Ask (no Terminal open)" is not obviously "asks you first" (T10.2 N and I, `T10.2-novice 002`, T06.3 N). "Stopped: you took control" is unclear (T06.3 N). The chat's Stop and the bar's "Pause all agents" look alike (T05.2 N, T11.1 N and I). The View menu says "Tasks and changes" while the button says "Changes" (`ChatApp.svelte` line 309, `manuals/chat.md` line 115). The chip tooltip is there but a person must wait for it (H-103).
- **Decision.** Chip words: "Ask" stays, the chip adds a second line in the tooltip and in the aria label ("Asks you first"). "(no Terminal open)" becomes "(Terminal is closed)". The Activity text reads "You are in control. The agent asks first." instead of "Stopped: you took control". The Stop button gets the tooltip "Stop this chat's answer now" and the bar button "Pause every agent on this desktop". The View menu item reads "Changes". The chip also shows its tooltip on keyboard focus.
- **Acceptance.** T10.2, T11.1, T05.2, T22.2: no record says that "Ask" or "Stop" is unclear. `grep -n "Tasks and changes" manuals src` finds nothing.
- **Severity.** S4.
- **Findings.** TH-115.
- **Files.** `R/desktop/{TopBar.svelte,activity.ts}`, `R/apps/chat/ChatApp.svelte`, `manuals/chat.md`.

---

## WP-B Shell: balloon, Chats and Task Manager, window placement, folder dialog, Help, About

### UX-179 The first-run balloon button "Open Computer" closes the balloon and opens nothing
- **Problem.** TH-108, T01.1 intermediate (3 of 3 actions, SEQ 3, weak, at the limit). `T01.1-intermediate 004`: the balloon "No project yet. Plug in a project to let the agent work on it: open Computer, then Plug in a project." with the button "Open Computer". After the click (`005`, `006`, `008`) the balloon is gone and no window or taskbar button appeared. The code calls `desktop.openApp({ app: 'explorer', path: '' })` (`DesktopController.svelte.ts` line 1003), the same call as the Computer icon and the Start menu (`DesktopPage.svelte` lines 153 and 246), and those open Computer (T20.2 intermediate `004`). `DesktopController.test.ts` line 361 tests the label only. I could not find the cause by reading. The panelist: "Open Computer does not open Computer and gives no feedback".
- **Decision.** Find and fix the cause (start with the click path: `Balloon.svelte` button, `balloonAction` in `DesktopPage.svelte`, `existingWindowFor` and `openWindow` with `path: ''` on a desktop that has no project). Add a component test that mounts the desktop, shows the project hint, clicks `balloon-action` and expects an Explorer window with `path: ''` and a taskbar button. The balloon closes after the window is open, and it stays on screen until the user closes it or opens Computer (the balloon timer of 9 s is too short for a first read on a desktop that has nothing else on it).
- **Acceptance.** T01.1 at both levels: a click on "Open Computer" opens Computer in front with "Plug in a project..." visible; the intermediate finishes the scenario within the budget at SEQ 6 or more. The component test exists.
- **Severity.** S3.
- **Findings.** TH-108.
- **Files.** `R/desktop/{DesktopController.svelte.ts,Balloon.svelte,DesktopSurface.svelte,shellHints.ts}`, `R/pages/DesktopPage.svelte`. Rerun depends on H-101 and H-102.

### UX-180 The Chats icon opens "Task Manager"; "Open chat" is greyed until a row is selected
- **Problem.** TH-112, four runs. `T04.2-novice 003`: the Chats icon opens a window titled "Task Manager" on the Chats tab, one row "hello", "Open chat" and "End Task". "Open chat" stayed greyed until the row was selected (T04.2 N record) and the title does not match the icon name (T04.2 I record). The closing toast leaves after a few seconds (T13.1 I). The way back works (double-click or "Open chat").
- **Decision.** The Chats tab selects its first row when it opens, so "Open chat" is enabled. A one-line hint under the list: "Double-click a chat to open it." The window opened from the Chats icon or from the toast is titled "Chats - Task Manager". The toast stays 15 seconds and until the pointer leaves it.
- **Acceptance.** T04.2 and T13.1 at both levels: no record says that "Open chat" was greyed or that the window had the wrong name; SEQ 6 or more.
- **Severity.** S4.
- **Findings.** TH-112.
- **Files.** `R/apps/agent-manager/*`, `R/desktop/{closeChat.ts,DesktopController.svelte.ts}` (toast time only), `manuals/agent-manager.md`.

### UX-181 New windows open over the window that opened them
- **Problem.** TH-113, eight runs. Computer is behind the chat (T12.2 N: "the first click was a guess at a visible strip", `T12.2-novice` record); Code is behind the chat (T09.1 I, T04.1 I: "hides the file tree"); Event Viewer opens over the chat that it explains (`T20.1-novice 003`, T20.1 I); the second chat window runs to the bottom of the screen and its Send button is under the tooltip and the balloon (`T07.1-novice 001`, T07.1 I); the Explorer window that "Plug in a folder" opens covers the Code tree where the new project should show (T03.1 N and I). The balloon "Project removed" says "Use Plug in again" while the item says "Double-click to plug in again" (T12.2 N).
- **Decision.** A window opened from another window is placed beside it (to the right, then below) and fully inside the work area. After "Plug in a folder" in Code, no Explorer window opens (the tree shows the new project and selects it). Event Viewer opens beside the chat. The balloon says "Double-click it in Computer to plug it in again."
- **Acceptance.** T03.1, T12.2, T20.1, T07.1, T09.1: no record says that a window covered the one it came from; the Send button of every chat window is visible; the new project shows in the Code tree in the first shot after Plug in.
- **Severity.** S4.
- **Findings.** TH-113.
- **Files.** `R/desktop/{DesktopController.svelte.ts,geometry.ts}`, `M/application/desktop/DesktopService.ts` (placement and the Explorer after Plug in), `manuals/desktop.md`.

### UX-182 Browse For Folder lists Documents and Desktop twice
- **Problem.** TH-114, T03.1 novice. `T03.1-novice 005`: "Projects you used before", "Home" with "Desktop" and "Documents" (docs-site, login-app, notes-folder), then "Documents" and "Desktop" again at the top level, then "Computer". The novice: "two Documents entries, which is confusing". The folder field shows the host path (a fixture path, H-104).
- **Decision.** Home is the only place for Desktop and Documents; the top-level duplicates are removed when they point to the same folder. "Plug in a folder" gets the tooltip "Give the agent a folder of your computer to work on".
- **Acceptance.** T03.1 at both levels: the browse list shows each folder once; the novice finds docs-site in 3 clicks or fewer after the dialog opens.
- **Severity.** S4.
- **Findings.** TH-114.
- **Files.** `R/kit/organisms/{FolderBrowserDialog.svelte,folderBrowser.ts}`.

### UX-183 Help: cut heading, repeated status text, no "Save" entry in the contents
- **Problem.** TH-116, three runs. `T31.2-novice 005`: the text above the highlighted heading is cut at the top ("5 - Common Tasks" half visible). `T01.1-novice 004`: the status bar says "Using the Desktop" in both panes. T31.1 novice: the contents have no "Save" entry, "View Help" in the Help menu does not say that it opens the manual.
- **Decision.** A jump scrolls so that the heading has 8 px above it. The status bar shows the topic once on the left and the section on the right. The contents of "Using Notepad" and "Using Code" get a line "Save a file" that links to the steps. The Help menu entry reads "View Help (F1)".
- **Acceptance.** T31.1 and T31.2: no record says text is cut; T31.1 novice 3 actions or fewer.
- **Severity.** S4.
- **Findings.** TH-116.
- **Files.** `R/apps/help/*`, `manuals/{help,notepad,code}.md` (the contents line only; `manuals/code.md` is shared with WP-C, add the line in a separate block).

### UX-192 About says "part of Agent7 version 0.1.0"; the menu item "Open" does not say which program
- **Problem.** TH-122, T30.2 novice and T30.1 novice. "part of Agent7 version 0.1.0" does not say whether 0.1.0 is the Notepad version or the suite version. "Open" in the Explorer context menu sits next to "Open with Notepad" and "Open with Code" and does not say which program it uses for a .md file.
- **Decision.** The About text reads "Notepad, part of Agent7. Agent7 version 0.1.0." The item "Open" reads "Open (default program)" or names the program that Explorer will use.
- **Acceptance.** T30.1 and T30.2: no record asks which version or which program.
- **Severity.** S4.
- **Findings.** TH-122.
- **Files.** `R/kit/organisms/AboutDialog.svelte`, `R/apps/explorer/explorerContext.ts`.

---

## WP-C Code, Changes, Review

### UX-184 The Changes pane gives the diff six rows and cuts the columns
- **Problem.** TH-111, six runs. `T05.1-novice 010`: the file list has one row and takes half of the pane height, the diff below it shows about six rows, and the columns read "Mo..." (status) and "E:\sr..." (path). `T09.1-novice 003` shows the same layout. T08.2 novice read five diffs in 10 actions with four extra scrolls ("the diff pane is small"). T08.2 I ("the File column is narrow and truncates 'Modified'"), T24.1 N and I ("the file list has empty space that could be used for the diff"). R6 UX-167 fixed the Status column text only.
- **Decision.** The list takes only the height of its rows (at least two rows, at most 35% of the pane) and the diff gets the rest, at least 12 rows at the default window. The Status column shows the word in full (a width of 90 px or the first letter and a tooltip) and the path uses a middle ellipsis with the full path in a tooltip. The diff scrolls alone.
- **Acceptance.** T08.2 novice reads all five diffs in 7 actions or fewer; T05.1, T09.1, T24.1: no record says the diff pane is small or that a column is cut.
- **Severity.** S3.
- **Findings.** TH-111.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/apps/code/*` (the same pane in the Code window), `manuals/{code,embedded-chat}.md`.

### UX-185 A reverted row has no Restore where a user looks
- **Problem.** TH-117, T09.1 novice (5 of 16, one dead end, SEQ 6) and T08.1 novice 006. `T09.1-novice 003`: the row redirect.ts "Reverted" is selected, the diff says "Select a changed file to view its diff.", Revert is greyed, and the only way on is the text link "Open Recycle Bin" at the top ("easy to miss"). R6 UX-169 is not fixed.
- **Decision.** Selecting a reverted row shows "This change was undone. Restore it from the Recycle Bin." with a button "Restore..." that opens the Recycle Bin on that item. The right-click menu of a reverted row offers "Restore from the Recycle Bin".
- **Acceptance.** T09.1 at both levels: 4 actions or fewer, no dead end, SEQ 6 or more.
- **Severity.** S4.
- **Findings.** TH-117.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/apps/code/*`.

### UX-186 Code: a click in the line number column does not select a line
- **Problem.** TH-118, T27.1 intermediate (7 of 9, SEQ 5). `T27.1-intermediate 002`: a drag from x 335 (the number column, the text starts at x 361) selects nothing; `005`: Home and Shift+Down after a click at x 345 leave the status at "Ln 1, Col 1". Ctrl+A worked and the whole file went to the chat. "Ask about selection" is greyed with no reason that shows (the tooltip is on a disabled button).
- **Decision.** A click on a line number selects the line, a drag over the numbers selects the lines, and a click there also focuses the editor so that the keys work. When "Ask about selection" is disabled, the status bar says "Select some lines first".
- **Acceptance.** T27.1 at both levels: a drag over lines 1 and 2 selects them, the question names "lines 1-2"; SEQ 6 or more.
- **Severity.** S4.
- **Findings.** TH-118.
- **Files.** `R/apps/code/*`.

### UX-187 Changes tab wording: "changed nothing" beside a Git list, "No pending changes" without a reason, Revert greyed
- **Problem.** TH-119, four runs. `T24.1-novice 001`: "The agent changed nothing in this chat. Git shows 3 changed files. Open Git" reads as a contradiction (novice). T24.2 N and I: "No pending changes in this chat." does not say that the folder is not under Git. `T22.2-novice 002`: Revert is greyed with no line that says why.
- **Decision.** The empty text reads "This chat did not change any file." and, when Git is on, a second line "Git shows 3 changed files from before. Open Git." For a folder without Git: "This folder is not tracked by Git, so there is nothing else to show." Under the Revert button: "Nothing to revert yet." while the list is empty and "Select a changed file first." when it is not.
- **Acceptance.** T24.1, T24.2, T22.2: no record calls the text contradicting or asks why a button is grey.
- **Severity.** S4.
- **Findings.** TH-119.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/apps/code/*`.

### UX-191 The Review banner says the same thing twice in a narrow column
- **Problem.** TH-121, T26.1 novice and T25.1 novice. `T26.1-novice 005`: the pink banner reads "Changes requested. 2 comments, 1 is a blocker." and again "Two comments, one of them a blocker." wrapped in a column about 90 px wide next to "2 comments"; the status bar says "Showing 1 of 2 changed files" (R6 UX-167 residual, confused T25.1 novice).
- **Decision.** One sentence in the banner, full width, with the link "2 comments" at its end. The status bar says "Showing redirect.ts (1 of 2 changed files)".
- **Acceptance.** T25.1, T26.1: no record names a repeated or cut sentence.
- **Severity.** S4.
- **Findings.** TH-121.
- **Files.** `R/apps/code-review/*`.

---

## WP-D Activity gadget, Event Viewer, Browser, Terminal

### UX-188 The Activity gadget shows "Error: RUN_ERROR", keeps it after recovery and cuts the sentence of a warning
- **Problem.** TH-110, four runs. `T23.1-intermediate 004`: the chat is "Connected" and finished ("Done. The slow job is finished.") and the Activity gadget still says "Error: RUN_ERROR". The same in `T23.1b-intermediate 001` and `T23.2-novice 001`. `T20.1-novice 001`: "Warning: Drive E: is not plugged in on this desktop...." ends in dots and the full reason shows only in Event Viewer. R6 UX-171 made the gadget show the last problem (`lastProblem` in `eventModel.ts`) and it shows the protocol name of the event, not a sentence.
- **Decision.** The gadget shows a plain sentence per event kind ("The agent stopped unexpectedly", "The connection dropped", "Drive E: was removed") and never a protocol word. The line is cleared when the same chat has a later successful turn, and it wraps to three lines (no dots). The link "Event Viewer" stays.
- **Acceptance.** T23.1, T23.1b, T23.2, T20.1: no record contains "RUN_ERROR"; after recovery the gadget says "Nothing has happened yet." or the last tool; the whole sentence of a warning shows.
- **Severity.** S3.
- **Findings.** TH-110.
- **Files.** `R/apps/event-viewer/eventModel.ts`, `R/desktop/Gadgets.svelte` (the Activity gadget block only), `manuals/event-viewer.md`.

### UX-189 Browser: the chat pane covers the page, "Take over" asks a question, the "+" has no label
- **Problem.** TH-120, five runs. The chat pane covers the right part of the page and the page does not reflow (T19.1 N: page text cut at "W", T19.1 I). T28.2 novice asked whether Take over stops the assistant or only pauses the page (`T28.2-novice 002` shows the wrapped bar and "Taken over"). The top bar says "Working: Clicking on the page" while the page bar names the target (`T28.1-novice 005`). The new tab "+" has no label (T29.1 N).
- **Decision.** The page narrows when the pane opens. "Take over" has the tooltip "Stop the agent here and use the page yourself". The top bar and the chat row use the same sentence as the page bar ("Clicking the button 'random'"). The "+" gets the tooltip "New tab".
- **Acceptance.** T19.1, T28.1, T28.2, T29.1: no record names covered text, a question about Take over or an unlabelled button.
- **Severity.** S4.
- **Findings.** TH-120.
- **Files.** `R/apps/browser/*`, `R/app/session/{browserSteps.ts,toolTitles.ts}`.

### UX-190 The Terminal takes typing silently
- **Problem.** TH-120, T31.2 novice (4 of 8, SEQ 5). The status bar says "Read-only: the agent is the only user of this shell. You can watch, not type." (`T31.2-novice` record step 1), the panelist missed it and typed "dir". Nothing appeared and the yellow note came after the typing ("Read-only: the agent runs the commands here. You can watch but not type. Ask the agent in Chat to run a command.").
- **Decision.** The yellow note shows when the window opens and stays until the first click in the text area. A click in the text area shows the note at once.
- **Acceptance.** T31.2 novice: 2 or 3 actions, SEQ 6 or more, no typing into the Terminal first.
- **Severity.** S4.
- **Findings.** TH-120.
- **Files.** `R/apps/terminal/*`, `manuals/terminal.md`.

---

## Harness

Not product work. Owner: facilitator. Details and evidence in `panel/r7/SYNTHESIS.md` section 5. R6 harness items H-87 to H-91, H-93, H-94 and H-95 are fixed and seen working. H-92 is built but not used (H-101).

| id | Where | Fix |
|---|---|---|
| H-96 | `checks/settings.mjs` T22.2, `tasks.md` | Accept a correct answer without a Help window (the T22.1 rule, H-24), or write a task whose answer is not on the screen and keep the Help check there. T22.2 failed twice on this in R7. |
| H-97 | `presets/` `bad-default-agent`, `tasks.md` T17.2 | Add a working scripted second agent so that "choose another agent" can be done; keep Claude Code in the list; say in the scenario that the panelist may change the setting. |
| H-98 | `tasks.md` T28.1, scripted agent `browser-agent` | "Then tell the facilitator ..." and the quoted request on its own line; a neutral reply to any text that is not the scripted request. |
| H-99 | `checks/chat.mjs` T06.3 | Write `askBeforeEveryAction` and `userInControl` to `check.json.notes` for T06.3, T11.2 and T28.2. Keep the FAIL. |
| H-100 | `lib/build.mjs`, `session.json` | Read the commit from a `build-info.json` inside the packaged app; refuse a round with two commit ids unless the facilitator confirms. 45 of 120 files carry `f29521dd34`, 75 carry `840aaf8687`. |
| H-101 | `session.mjs check`, `FACILITATOR.md` | Pass `--steps-to-pass` from `log.jsonl` (T01.1 intermediate: Create was action 2, not 3), or replay the check after every action for T01.1 and T02.1. |
| H-102 | `ux.mjs` shot, `click` | After a click that can open a window, wait up to 1.5 s for the new window and shoot it, or print the window name on the shot. |
| H-103 | `ux.mjs` move | `move` waits 1.2 s before the shot; tell the panelist to hover and wait. |
| H-104 | `lib/context.mjs` presets | Make the fixture home look like a user folder, or say in the brief that the path is a test path. |
| H-105 | `PANELIST.md`, record template | Tell the panelist to open every shot it lists; write the repository path in the Evidence line; drop or fill the empty "Researcher notes" line. |

## Coverage of findings

| Theme | Item |
|---|---|
| TH-87 Deny has the focus | decision: keep Deny |
| TH-89 words | R4 UX-133 to UX-137, still open |
| TH-105 take-control box reads like a setting | UX-173 |
| TH-106 crash box default and second error | UX-174 |
| TH-107 no door to end the agent program | UX-176 |
| TH-108 dead balloon button | UX-179 |
| TH-109 text kept in the old window | UX-175 |
| TH-110 Activity gadget RUN_ERROR | UX-188 |
| TH-111 Changes pane layout | UX-184 |
| TH-112 Chats icon and Task Manager | UX-180 |
| TH-113 windows over the window that opened them | UX-181 |
| TH-114 Browse For Folder duplicates | UX-182 |
| TH-115 words and the diff box residue | UX-177, UX-178 |
| TH-116 Help residue | UX-183 |
| TH-117 reverted row without Restore | UX-185 |
| TH-118 Code selection | UX-186 |
| TH-119 Changes tab wording | UX-187 |
| TH-120 Browser and Terminal residue | UX-189, UX-190 |
| TH-121 Review banner | UX-191 |
| TH-122 About and Open | UX-192 |
| T06.3 novice failure | UX-173, H-99 |
| T17.2 novice failure | UX-174, H-97 |
| T20.2 weak rows | UX-176 |
| T01.1 intermediate weak row | UX-179, H-101, H-102 |
| T22.2 checker failure | H-96 |
| T28.1 weak row | H-98 |

## Rerun plan

1. WP-A first (UX-173 and UX-174 are the failed tasks), then WP-B, WP-C and WP-D in parallel. Harness H-96 to H-105 in parallel. H-99 before the T06.3 rerun, H-97 before the T17.2 rerun, H-100 before any round that is meant to count for the gate.
2. Rerun with fresh panelists (one per task, as in R7): T06.3, T11.2 and T28.2 at both levels (UX-173), T17.2, T23.1 and T23.1b at both levels (UX-174, UX-175), T20.2 at both levels (UX-176), T01.1, T02.1, T13.2 and T14.1 (UX-179), T04.2 and T13.1 (UX-180), T03.1, T07.1, T09.1, T12.2 and T20.1 (UX-181), T05.1, T08.1, T08.2, T09.1, T24.1 and T24.2 (UX-184, UX-185, UX-187), T27.1 (UX-186), T20.1, T23.1, T23.2 (UX-188), T22.2 and T28.1 (H-96, H-98).
3. Full pass on the packaged build for the release gate: all 60 tasks at both levels, every task passes, no task below 5, median 6 or more, no open S2 or S3, every journey at 10 (which needs the S4 items fixed or accepted, D5 and D10).
4. Outside the panel: axe scan (28 states, with the 24 px chip), manual checklist and screen reader pass (D5); `perf.mjs` on the reference machine and a 30-minute soak (D10, UX-84). The UX lead accepts or rejects each open S4 in `findings.md`.
