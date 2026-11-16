# Fix backlog, round 8

Source: `panel/r8/SYNTHESIS.md` (themes TH-123 to TH-143, harness defects H-106 to H-119), `scorecard.md` (round 8), the 120 round 8 records, the session folders in `docs/ux/panel/r8/`, the owner report of the Code Review bug (UX-193), and the product source for every cause named below. Items of rounds 1 to 7 (UX-01 to UX-192) are not repeated unless R8 shows them not effective or only partly effective. R8 ran on the packaged build (one commit, `662b12c8ef`) with a fresh panelist for every session, so its step counts and learnability findings stand.

**Severity.** Rubric scale of `rubric.md`: S1 blocker, S2 major, S3 minor, S4 cosmetic. There is no open S1 and no open S2. **Nine S3 (UX-193 to UX-198, UX-207, UX-212, UX-213) and 15 S4 (UX-199 to UX-206, UX-208 to UX-211, UX-214 to UX-216)**, 24 new items (R7: two S2, five S3 and 13 S4). S4 items are open until the UX lead accepts them in `findings.md`. The target of this backlog is every journey at 10/10, so the S4 items are in it. The one failed task of the round, T28.1 intermediate, has its first cause in the harness (H-108); its product part is UX-195.

**Migrations.** No work package needs a database migration. Reserved: none. The next free migration number stays **013**. A WP that finds it needs one takes 013 and tells the others in the merge request.

Paths: `R` = `src/renderer/src/lib`, `M` = `src/main`, `shared` = `src/shared`. The Task Manager is `R/apps/agent-manager/*` (registry id `agent-manager`).

## R7 backlog: verification with R8 evidence

20 items: **8 fixed, 9 fixed in part, 3 not fixed or worse.** Shots are named `<task>-<level> <number>`. A record without a number was read, not viewed.

| R7 item | Verdict | Evidence in R8 |
|---|---|---|
| UX-173 "Ask before every action" reads like a saved setting | **Fixed** | `T06.3-novice 002`: label "(until I untick it)", chips "Ask (now)", "This is not saved. To keep a tool on Ask, change it in Control Center." with a link. T06.3 passes at both levels (novice 9 of 24, SEQ 5; intermediate 8 of 18, SEQ 6). Residue: three phrases that contradict each other (UX-199). |
| UX-174 crash box default, second error | **Fixed in part** | `T17.2-novice 001`, `008`: "Choose another agent" is highlighted, the text says "Check that it is installed, or choose another agent." T17.2 intermediate 5 of 9, SEQ 6. Still: Details and Event Viewer say "Internal error" (`009`, `011`, `012`), the Agents list offers an agent that cannot start (`002`). T17.2 novice SEQ 2. UX-196, UX-197, UX-213. |
| UX-175 text kept in the old window | **Fixed** | T23.1b intermediate step 1, `002`: "Start a new chat with your text" puts the text in the new chat. SEQ 7. Residue UX-201. |
| UX-176 no door to End process | **Fixed** | T20.2 intermediate 4 of 12, SEQ 6 (R7 7 of 12, SEQ 5); novice 7 of 16, SEQ 6 (R7 15 of 16, SEQ 3). File > "End the agent program...", the status link, the launcher sentence (`T14.1-novice 001`). Residue UX-201. |
| UX-177 permission diff one scroll short | **Fixed in part** | `T06.1-novice 001`: about seven rows, status bar "Waiting for your answer". The link does nothing (`002`): UX-194. |
| UX-178 words | **Fixed in part** | Chips read "Ask (now)" in take-control mode. Still "Ask (Terminal is closed)", Stop against Pause all agents, no visible chip tooltip. UX-200. |
| UX-179 dead balloon button | **Fixed** | T01.1 both: "Open Computer" opens Computer. SEQ 6 and 5 (R7 3). |
| UX-180 Chats icon, Task Manager | **Fixed in part** | `T04.2-novice 003`: row selected, "Open chat" works. The title and the list do not say it reopens closed chats. UX-204. |
| UX-181 windows over the window that opened them | **Not fixed (Plug in part fixed)** | `T03.1-novice 007`: no Explorer window after Plug in. Computer, Code, Control Center and Event Viewer still open over or behind the chat (T12.2, T08.1, T08.2 I, T06.3 I, `T20.1-novice 002`); the second chat is narrow (`T07.1-novice 001`). UX-203. |
| UX-182 Browse For Folder duplicates | **Fixed** | `T03.1-novice 005`. |
| UX-183 Help residue | **Fixed in part** | Status bar once, "Save a file" in the contents. Heading still cut (`T22.1-novice 004`). UX-205. |
| UX-184 Changes pane | **Fixed in part** | `T08.2-novice 002`: tall diff pane, 2 actions (R7 10). Status and Path still cut (`T09.1-novice 003`). UX-207. |
| UX-185 no Restore | **Fixed** | `T09.1-novice 003`: message and "Restore..." on the row. Residue UX-209. |
| UX-186 line number column | **Fixed** | `T27.1-intermediate 002`, `003`. Residue UX-210. |
| UX-187 Changes tab wording | **Fixed in part** | "Nothing to revert yet." (`T22.2-novice 002`). The contradiction with the Git tab stays (T24.1 N 001). UX-208. |
| UX-188 Activity gadget | **Not fixed (worse)** | "RUN_ERROR" is gone, but "Nothing has happened yet." beside a warning (`T20.1-novice 001`, `002`), during a job (`T13.1-novice 005`) and after a crash (`T23.1-novice 002`). UX-212. |
| UX-189 Browser | **Not fixed** | T28.2 N, T29.1 N, T19.1 N, T28.1 I records. UX-214. |
| UX-190 Terminal silent typing | **Fixed in part** | `T31.2-novice 003`: the note shows at open. Typing still gives no sign. UX-215. |
| UX-191 Review banner | **Fixed** | `T26.1-novice 005`, `T25.2-novice 001`. Residue UX-211. |
| UX-192 About and Open | **Fixed in part** | `T30.2-novice 003`; two Notepad entries (T30.1 N and I). UX-206. |

**R7 harness items:** H-96, H-97, H-98, H-99, H-100, H-101, H-102, H-105: **fixed and seen working.** H-103: built; shows a second cause (H-112). H-104: **not fixed** (`T03.1-novice 005`: "/tmp/a7ux-GpKvQZ/home/Documents/docs-site"). R8 harness: H-106 (the T03.1 checker, done mid-round) and H-107 to H-119 below.

R4 S4 items UX-133 to UX-137 (words: "Scripted demo", "plug in", "ENOENT", "port", "Notes" and "Board" for a form) are still open and are not repeated.

Only problems that I confirmed against the shots, logs and code are listed. Not product, so no item: the scripted replies that ignore or misread a request (T10.1 N, T11.3 N, T12.2 N, T19.1 N, T27.1 N), the single click on a desktop icon (four novices, Windows convention, the balloon says so), the "Ask t..." cut in the chat (`T20.1-novice 001` shows the whole sentence), the host path in the folder field (fixture, H-104), the timeout of the scripted browser agent (H-108).

## Work packages

| WP | Name | Items | Files owned (edit freely) |
|---|---|---|---|
| WP-A | Approvals, take-control, chat errors, Control Center | UX-194, UX-195, UX-196, UX-197, UX-198, UX-199, UX-200, UX-201 | `R/app/session/{PermissionDialog.svelte,ApprovalDetail.svelte,diffViewport.ts,ErrorRow.svelte,SessionView.svelte,chatProblem.ts,StopNotice.svelte,notResponding.ts,UserMessage.svelte}`, `R/desktop/{UacDialog.svelte,TopBar.svelte,activity.ts,approval.ts}`, `R/apps/chat/ChatApp.svelte`, `R/apps/control-centre/*`, `M/application/{SessionRuntime,SessionService,SessionProblems}.ts`, `manuals/{chat,approvals,control-centre,agent-does-not-start}.md` |
| WP-B | Shell: launcher, window placement, Task Manager, Help, Explorer menu, About | UX-202, UX-203, UX-204, UX-205, UX-206 | `R/apps/agent-manager/*`, `R/desktop/{DesktopController.svelte.ts,DesktopSurface.svelte,Balloon.svelte,closeChat.ts,shellHints.ts,shellKeys.ts,geometry.ts,WindowLayer.svelte,AppWindowFrame.svelte}`, `R/pages/{LauncherPage,DesktopPage}.svelte`, `R/launcher/*`, `R/apps/registry.ts`, `R/apps/explorer/*`, `R/apps/help/*`, `R/kit/organisms/AboutDialog.svelte`, `M/application/desktop/DesktopService.ts`, `manuals/{desktop,launcher,help,agent-manager,explorer}.md` |
| WP-C | Code, Changes, Review | UX-207, UX-208, UX-209, UX-210, UX-211 | `R/apps/code/*`, `R/apps/code-review/*`, `R/app/shell/ChangesPane.svelte`, `R/app/changes/*`, `R/apps/shared/{EmbeddedChat,ChatStrip}.svelte`, `manuals/{code,code-review,embedded-chat}.md` |
| WP-D | Activity gadget, Event Viewer, Browser, Terminal, A2UI forms | UX-212, UX-213, UX-214, UX-215, UX-216 | `R/apps/event-viewer/*`, `R/desktop/Gadgets.svelte` (the Activity gadget block only), `R/apps/browser/*`, `R/apps/terminal/*`, `R/a2ui/*`, `R/apps/surface/*`, `R/app/session/{A2uiActivity.svelte,browserSteps.ts,toolTitles.ts}`, `M/application/tools/{browserLabels,browserTools}.ts`, `manuals/{browser,event-viewer,terminal,surface}.md` |
| Harness | Panel scripts and process | H-107 to H-119 (H-106 done) | `scripts/ux-panel/*`, `docs/ux/tasks.md` |
| outside | Code Review by the chat | UX-193 (in progress, S3) | `M/application/tools/{reviewTools,catalog}.ts`, `shared/review.ts`, the chat and review session wiring. Being fixed in a separate work item. |
| final | Sweep | rerun | one developer, after WP-A to WP-D are merged |

WP-A to WP-D can run in parallel. The file sets are disjoint. The files below sit near a border, so each WP edits only the part named.

**Shared files to watch (small, additive edits in a separate block; merge in the order WP-A, WP-B, WP-C, WP-D, or rebase often):**
- `R/desktop/TopBar.svelte`, `R/desktop/activity.ts`: WP-A only (UX-199, UX-200). WP-D does not edit them. The Activity gadget text comes from `R/apps/event-viewer/eventModel.ts` (`lastProblem`) and `R/desktop/Gadgets.svelte` (line 103, "Nothing has happened yet."), which WP-D owns. The sentence "This is not saved ..." comes from `activity.ts` (`NOT_SAVED_NOTE`): WP-A edits the constant, WP-D leaves the line that uses it.
- `R/app/session/*`: WP-A owns the files listed in its row. WP-D owns `A2uiActivity.svelte`, `browserSteps.ts` and `toolTitles.ts`. No other file of the folder changes.
- `R/desktop/DesktopController.svelte.ts`, `geometry.ts`: WP-B owns. WP-A adds no handler there (UX-201 stays inside `SessionView.svelte` and `ChatApp.svelte`).
- `R/apps/chat/ChatApp.svelte`: WP-A only. `R/apps/shared/EmbeddedChat.svelte`: WP-C only.
- If UX-197 needs a small main-process call to test whether an agent's program exists, WP-A adds one additive method in `shared/agents.ts` and `M/application/SessionService.ts` and says so in the merge request.
- `manuals/*.md`: each WP edits only the manuals listed. `scripts/check-help-coverage.mjs` must stay green after each merge (540 of 540 ids today).

---

## UX-193 Code Review: the chat asked for a review cannot use the review tools (outside the work packages)

- **Problem.** Owner report, S3, TH-129. In the Code Review app, the chat that the user asked for a review could not use the review tools (`review_list_changes`, `review_read_diff`, `review_add_comment`, `review_submit`): they work only for the Code Review window's own reviewer session. The chat said so and listed the comments as text for the user to add by hand. Intended flow: the chat adds the inline comments in Code Review, and when the review is submitted the conversation returns to the IDE chat.
- **Decision.** Being fixed now in a separate work item (status: in progress). The fix lets the requesting chat call the review tools for the review window it was asked about, and returns the user to that chat when `review_submit` runs.
- **Acceptance.** (1) A chat that the user asks for a review adds inline comments in Code Review (the comments show with the chat as the author, the banner counts them). (2) No chat message lists comments as text in place of the tools. (3) After `review_submit` the banner shows the verdict and the IDE chat window comes to the front with a line that says the review is done. (4) A chat that is not the reviewer of a window still cannot comment in it. (5) Unit test for the tool catalog (who may call what) and an e2e spec for the flow. (6) The round 9 re-test passes at both levels: H-115 (task T25.3).
- **Severity.** S3 (an advertised flow does not work; the user has to do the chat's job by hand).
- **Findings.** TH-129, F-069.
- **Files.** Outside the WPs (see the table).

---

## WP-A Approvals, take-control, chat errors, Control Center

### UX-194 "Show the whole change" does nothing in a short window
- **Problem.** TH-123, three runs. `T06.1-novice 001` and `002` are identical: the click on "Show the whole change" changes nothing. T06.1 intermediate pressed it, saw nothing and scrolled (3 of 3 actions, weak at the limit; R7 2 of 3). `T07.1-novice 001`: in the second chat window (about 450 px wide) the diff of login.ts shows three rows and its link is the same. The first window shows about seven rows and the third added line is cut. `ApprovalDetail.svelte` line 52 toggles `expanded`; the box cannot grow because the window is only about 480 px high and the box already takes its limit.
- **Decision.** (1) When the click cannot show more rows, the link does not show at all. (2) When it can, the diff grows to the whole change and the transcript shrinks to one row; the link then reads "Show fewer lines". (3) If the window is too small for the whole change, the click opens the change in the Changes pane of the chat (the same diff, full height) and the link reads "Open the whole change in Changes". (4) The last visible row is half cut only when more rows follow. The status bar keeps "Waiting for your answer".
- **Acceptance.** T06.1, T05.1, T07.1: a click on the link visibly changes the screen (more rows, or the Changes pane) or the link is absent; no record says that the link does nothing. T06.1 at both levels in 2 actions, the three changed lines of `redirect.ts` visible without a scroll at the default size, or one click on the link. Unit test on `diffViewport.ts` for "can grow" per window height.
- **Severity.** S3 (a control that does nothing: same class as the R7 dead balloon button).
- **Findings.** TH-123, F-070, R7 UX-177.
- **Files.** `R/app/session/{PermissionDialog.svelte,ApprovalDetail.svelte,diffViewport.ts}`.

### UX-195 A failed turn ends in "The agent did not answer in time." with no route
- **Problem.** TH-124, two runs. T28.1 intermediate FAILED and T28.1 novice lost an attempt (cause in the fixture: H-108). `T28.1-intermediate 006` and `T28.1-novice 006`: the red box says "The agent did not answer in time." with one button, Details...; the status bar says "The agent did not answer in time. Click D" (cut) and "Disconnected" with Reconnect; the message box still holds the request and Send is active. Details show a script log ("expect failed: variable "w4" does not contain "Done waiting"; it is "Timed out after 5183 ms waiting for \"Standup notes\"", `T28.1-novice 007`). Reconnect shows "Connected" and sends nothing (`008`). The novice: "I did not know whether to wait, press Send, or press Reconnect." `chatProblem.ts` line 28 `isTimeout` matches any text with "timed out", so a step that timed out inside the agent's own work reads as "the agent did not answer". The "Send again" line is used only for an unanswered message (line 36); here the message had been answered with steps.
- **Decision.** (1) The box for a failed turn has two buttons: "Send again" (highlighted: it resends the last request in the same chat) and "Details...". (2) The sentence names what happened and what to do: "The agent stopped before it finished. Click Send again to try again." For a tool step that timed out: "A step took too long (waiting for the page). Click Send again to try again." (3) The status bar line fits its field (a shorter sentence or "Failed. Click Send again."). (4) Reconnect after a failed turn either resends or says "Your request was not sent again. Click Send." in the box. (5) Details start with the plain sentence of the box, the log below it.
- **Acceptance.** T28.1 with a forced timeout (H-108 test hook): the panelist presses "Send again" once and the job finishes, SEQ 5 or more, no record says the status text is cut or that Reconnect did nothing. Unit tests on `chatProblem.ts` (timeout in a tool step against no answer) and on the Reconnect message.
- **Severity.** S3 (the only failed task of the round; the product gave no route).
- **Findings.** TH-124, F-071.
- **Files.** `R/app/session/{chatProblem.ts,ErrorRow.svelte,SessionView.svelte}`, `M/application/SessionProblems.ts`, `manuals/chat.md`.

### UX-196 A start failure says "Internal error" in Details
- **Problem.** TH-125, part 1 (T17.2 novice, SEQ 2, weak). `T17.2-novice 008` has the right words. The novice then pressed Details: `009` and `010` show "Internal error" and "ACP session/new (response) (error)", then "RUN_FINISHED", with no cause. UX-174 point (4) asked that Details never start with "Internal error"; it is not done for the case that the program starts and stops.
- **Decision.** The first line of Details is the sentence of the box ("The program 'npx' stopped before it was ready. Check that it is installed, or choose another agent."), then one line "What to do: open Agents and choose another agent." The protocol lines stay below a rule, labelled "Technical details". "Internal error" and "ACP session/new" never lead.
- **Acceptance.** T17.2 at both levels: Details (if opened) show the plain sentence first; no record quotes "Internal error" as the only text. Unit test on the Details text for `start-failed`.
- **Severity.** S3.
- **Findings.** TH-125, F-072, R7 UX-174.
- **Files.** `R/app/session/{ErrorRow.svelte,chatProblem.ts}`, `M/application/SessionProblems.ts`, `manuals/{chat,agent-does-not-start}.md`.

### UX-197 The Agents list offers an agent that cannot start
- **Problem.** TH-125, part 2 (T17.2 novice). `T17.2-novice 002`: the list shows "Claude Code" first, then "Scripted Agent", "My assistant" (not-a-real-command) and "Helper assistant", with no state. The novice picked the first row, pressed Set as Default and ended in "The program 'npx' stopped before it was ready." (`008`). A user without Node meets the same list on a real install. The intermediate picked "Scripted Agent" and passed.
- **Decision.** The Agents page checks, when it opens, whether the program of each agent exists, and shows "Not found" or "Not installed" in the About column for an agent whose program is missing. Set as Default on such a row asks: "This program was not found. Make it the default anyway?" with No as the default. The default agent's own state shows the same words.
- **Acceptance.** T17.2 with the fixture of H-107: a row that cannot start is marked, and no record says that the first row was a trap. Unit test on `agentRows.ts` for the state per agent. Needs H-107 for the fixture (or the fixture shows the real state).
- **Severity.** S3.
- **Findings.** TH-125, F-073.
- **Files.** `R/apps/control-centre/{AgentsPage.svelte,agentRows.ts,agentRows.test.ts}`, `shared/agents.ts` and `M/application/SessionService.ts` (one additive probe call), `manuals/control-centre.md`.

### UX-198 The Permissions page is squeezed into a 100 px column when the chat pane is open
- **Problem.** TH-126, one run. `T10.1-novice 006`: with the Chat tab of Control Center open, the Permissions page keeps a column about 100 px wide with 30 lines of help text, and the row "Set every permission to: Ask, Set all" falls off the bottom edge. The panelist: "the permission help text wraps into a very narrow column and is hard to read."
- **Decision.** The help text of the page takes the full width above the table (or collapses to its first two sentences with a "More" link) when the page is narrower than 520 px. The "Set every permission to" row stays inside the page and scrolls with it. The pane opens at a width that leaves the page at least 420 px.
- **Acceptance.** T10.1 with the pane open: no text column under 300 px; the whole page is reachable. Component test at three widths.
- **Severity.** S3 (a core page unreadable in a state the user can reach with one click).
- **Findings.** TH-126, F-074.
- **Files.** `R/apps/control-centre/{PermissionsPage.svelte,ControlCentreApp.svelte}`, `manuals/control-centre.md`.

### UX-199 The take-control box and its note contradict each other
- **Problem.** TH-130, three runs. `T06.3-novice 002`: the label says "until I untick it", the bar says "until you resume", the note says "This is not saved". The novice: "the checkbox says 'until I untick it' but its banner says 'not saved', which contradicts itself." T06.3 novice took 9 of 24 actions, SEQ 5 (intermediate 8 of 18, SEQ 6). T11.2 novice: "the top-bar checkbox should state whether it will persist after a restart."
- **Decision.** One phrase for the mode in all three places: "Ask before every action (this session only)". The banner reads "You are in control. All tools ask first until you click Resume. This is not saved." The note keeps its Control Center link. The Permissions page says the same two ways in one table row each.
- **Acceptance.** T06.3 novice 6 actions or fewer or SEQ 6; no record says that the label and the note disagree. T11.2 and T28.2 unchanged.
- **Severity.** S4.
- **Findings.** TH-130, F-075, R7 UX-173.
- **Files.** `R/desktop/{TopBar.svelte,activity.ts}`, `manuals/approvals.md`.

### UX-200 Words: chips, Stop against Pause all agents, the idle bar text, the chip tooltip
- **Problem.** TH-131, seven runs. (a) "Run commands: Ask (Terminal is closed)" does not say what Ask means (T10.2 N, `T10.2-novice 002`). (b) "Stop" against "Pause all agents" (T05.2 N, T11.1 N and I). (c) The stop notice mixes "stop this reply", "stop all agents" and "Task Manager, Processes" (T05.2 N). (d) "Agent can use nothing yet. Open an app to give it a tool." reads like a failure while the chat is ready (`T02.1-novice` 007). (e) No chip tooltip is visible in three records (T10.2 N and I, T16.2 I): the chips use the browser `title`, a native tooltip that a shot cannot show and that waits for the OS delay; the app's own tooltip shows elsewhere (T22.1 I).
- **Decision.** (a) The chip says "Run commands: Ask first" and the closed-app part moves to the tooltip. (b) The pause button's tooltip says "Pause all agents on this desktop. Stop in a chat stops that chat only." (c) The stop notice says one thing: "You stopped this reply. The agent waits for your next message." and a second line only when the agent program is still running: "To end the agent program, use File > End the agent program." (d) The text reads "Open an app (Terminal, Browser, Code) to give the agent a tool." in a neutral colour. (e) The chips use the app's own tooltip with the same delay as other controls.
- **Acceptance.** T10.2, T11.1, T05.2, T02.1: no record asks what Ask means or says that the bar looks like a failure; a shot after a hover shows the chip tooltip.
- **Severity.** S4.
- **Findings.** TH-131, F-076, R7 UX-178.
- **Files.** `R/desktop/{TopBar.svelte,activity.ts}`, `R/app/session/StopNotice.svelte`, `manuals/{chat,approvals}.md`.

### UX-201 Recovery residue: the red box for the user's own action, the refilled box, the old window, the doubled request
- **Problem.** TH-132, four runs. (a) After "End the agent program..." the chat shows a red box "The agent program was stopped." with "Restart and send again", the message box is refilled with "start the long job" and Send is active, and the status text is cut ("...send your message ag", `T20.2-novice 008`, `009`). (b) After Restart the request is not sent again, so a second click on "Send it again" is needed (T23.1b N `002`). (c) After "Start a new chat with your text" the old window keeps its red box and "Disconnected" (T23.1b I record step 3). (d) After a restart the request is listed twice and the first "Working on it..." stays (`T23.1-novice 002`).
- **Decision.** (a) A stop that the user asked for shows as a plain notice (no red icon): "You ended the agent program. Click Restart to use the chat again." The box is not refilled and Send is off until the agent runs. (b) Restart resends the last request when the turn was cut off, and the notice says so; a Restart after an end by the user does not. (c) The old window shows "Continued in a new chat" in grey and no red box. (d) The cut-off turn is marked "Stopped" once and the repeat is labelled "Sent again".
- **Acceptance.** T20.2, T23.1, T23.1b at both levels: no record says that the red box is wrong, that the text was resent by mistake or that the old window looks alive; T23.1b 2 actions.
- **Severity.** S4.
- **Findings.** TH-132, F-077, R7 UX-175 and UX-176.
- **Files.** `R/app/session/{ErrorRow.svelte,SessionView.svelte,StopNotice.svelte,notResponding.ts,UserMessage.svelte}`, `R/apps/chat/ChatApp.svelte`, `manuals/chat.md`.

---

## WP-B Shell: launcher, window placement, Task Manager, Help, Explorer menu, About

### UX-202 The launcher preselects the first row, not the row that waits for the user
- **Problem.** TH-133, two runs. `T14.1-novice 001`: "Scratch pad" (Idle) is highlighted; "Fix login redirect" with "Needs your approval (1)" is the fourth row. T14.1 intermediate: "the first row ... was preselected on opening, not the waiting row." The novice reported both the waiting and the failed desktop because the question has two parts ("Docs site" shows a red "Agent problem").
- **Decision.** When the launcher opens, it selects the first row that needs the user (a pending approval, then an agent problem), else the last used desktop. The rows that need the user sort to the top, or carry a marker in the first column. Connect then opens that desktop.
- **Acceptance.** T14.1 at both levels in 1 or 2 actions with the waiting row selected on open; T13.2 unchanged. Unit test on `launcherModel.ts` for the preselected row.
- **Severity.** S4.
- **Findings.** TH-133, F-078.
- **Files.** `R/launcher/{launcherModel.ts,DesktopRow.svelte}`, `R/pages/LauncherPage.svelte`, `manuals/launcher.md`.

### UX-203 New windows open over or behind the window that opened them
- **Problem.** TH-134, seven runs (UX-181 not fixed; the Plug in part is fixed). Computer opens behind the chat (T12.2 N and I: "I had to bring it forward myself"). Code is behind the chat at the start (T08.1 N `001`, T08.2 I). Control Center stays open over the chat after OK (T06.3 I: "no sign that the chat window is behind it"). Event Viewer opens over the chat (`T20.1-novice 002`). The second chat window is about 450 px wide with its Send button on a second row and a three-row diff (`T07.1-novice 001`).
- **Decision.** A window that an app opens for a task comes to the front and is placed beside the window that opened it when the screen has room, else cascaded by 24 px with the new one on top. Control Center after OK returns the focus to the window it came from. A second chat window opens at the same size as the first (at least 560 px wide).
- **Acceptance.** T12.2, T08.1, T06.3, T20.1, T07.1: no record says a window was hidden or that a button was off the window.
- **Severity.** S4.
- **Findings.** TH-134, F-079, R7 UX-181.
- **Files.** `R/desktop/{geometry.ts,WindowLayer.svelte,AppWindowFrame.svelte,DesktopController.svelte.ts}`, `manuals/desktop.md`.

### UX-204 "Chats - Task Manager" does not say it reopens closed chats
- **Problem.** TH-135, two runs. `T04.2-novice 003`: the window is titled "Chats - Task Manager" and the list says only "Idle" and "Context" (T04.2 N: "does not say that it reopens closed chats ... does not say whether a chat is closed or open"). T13.1 novice: "the Task Manager row could say the chat is still running."
- **Decision.** The Chats tab has a line above the list: "Closed chats stay here. Double-click a chat to open it again." A column "Window" says Open or Closed. A running chat shows "Working" and its progress.
- **Acceptance.** T04.2 and T13.1 at both levels, SEQ 6 or more; no record says it could not tell open from closed.
- **Severity.** S4.
- **Findings.** TH-135, F-080, R7 UX-180.
- **Files.** `R/apps/agent-manager/*`, `manuals/agent-manager.md`.

### UX-205 Help: cut heading, long topics, F1 at the top, an unnumbered entry
- **Problem.** TH-136, four runs. `T22.1-novice 004`: the heading "7 - Need Help?" above the target is half cut at the top after the jump. The topic "Using Explorer" is 4284 px high and the button description needs two scrolls (T22.1 N and I: "F1 landed at the top of the page, so the table needed one more click"). "Save a file" sits between "5 - Common Tasks" and "6 - Troubleshooting" without a number (T31.1 I). T19.2 N: "I had to scroll to section 6."
- **Decision.** A jump scrolls with a 24 px margin above the heading. F1 from a control opens the topic at the section of that control when the window knows it (the Help id of the focused control). "Save a file" gets a number or moves under "5 - Common Tasks" as a section.
- **Acceptance.** T22.1, T31.1, T19.2: the target heading is whole after a jump; F1 on a control lands on its section. `scripts/check-help-coverage.mjs` stays green.
- **Severity.** S4.
- **Findings.** TH-136, F-081, R7 UX-183.
- **Files.** `R/apps/help/*`, `manuals/help.md`.

### UX-206 The Explorer menu has two Notepad entries; About names no Notepad version
- **Problem.** TH-137, three runs. `T30.1` (both): the context menu has "Open (default: Notepad)" and "Open with Notepad"; both open Notepad and "look redundant". `T30.2-novice 003`: "Notepad, part of Agent7. Agent7 version 0.1.0." The novice: "does not show a separate Notepad version number."
- **Decision.** The menu shows "Open" when the default program is Notepad and "Open with" > the other programs; Notepad appears once. About says "Notepad is part of Agent7 (version 0.1.0). It has no separate version."
- **Acceptance.** T30.1 and T30.2 at both levels, no record names two entries as confusing or asks for a Notepad version.
- **Severity.** S4.
- **Findings.** TH-137, F-082, R7 UX-192.
- **Files.** `R/apps/explorer/*`, `R/kit/organisms/AboutDialog.svelte`, `manuals/explorer.md`.

---

## WP-C Code, Changes, Review

### UX-207 The Changes pane cuts Status and Path and contradicts itself under a selected row
- **Problem.** TH-128, five runs (UX-184 fixed in part: the diff is tall now, the columns are not). `T08.2-novice 002`: Status reads "Modi...", "M...", "A..." and Path "E:\..."; `T09.1-novice 003`: the reverted row reads "R..." (the novice: "I could not read the word"). The line "Select a changed file first." stays under the list while a row is selected (`T09.1-novice 003`). T05.1 novice: the file name is cut at the left edge ("re direct.ts"). T24.1 N and I: the diff pane is small for a short hunk.
- **Decision.** The list columns size to their content: File takes the free width, Status shows its whole word ("Modified", "Added", "Reverted"), Path shows the folder with a tooltip for the whole path, and the status words may be icons plus words. The hint line shows "Select a changed file first." only when no row is selected. The diff pane keeps at least 12 rows at the default window.
- **Acceptance.** T05.1, T08.2, T09.1, T24.1: no cut word in Status or File at the default window; no record says a path or a status is cut. Unit test on `changesLayout.ts`.
- **Severity.** S3 (R7 UX-184 acceptance not met: the status words are the information).
- **Findings.** TH-128, F-083, R7 UX-184.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/app/changes/{changesLayout.ts,changeFormat.ts}`, `manuals/code.md`.

### UX-208 Changes tab wording: "did not change any file" beside a Git list
- **Problem.** TH-138, four runs. T24.1 N (001): "This chat did not change any file" and "Nothing to revert yet" while the Git (3) tab lists three files ("The Changes tab and the Git (3) tab disagree on the first screen"). T24.2 N: the Changes tab of a plain folder "does not say why there are no change marks". T22.2 N: "Revert is greyed out" (it now says "Nothing to revert yet.": R7 UX-187 part 2 is fixed).
- **Decision.** The Changes tab says "This chat did not change any file. Git shows 3 changed files from before: open the Git tab." with a link when Git has changes, and "This folder is not tracked by Git, so there are no change marks." for a plain folder. Revert's reason stays.
- **Acceptance.** T24.1, T24.2, T22.2: no record says the two tabs disagree or asks why there are no marks.
- **Severity.** S4.
- **Findings.** TH-138, F-084, R7 UX-187.
- **Files.** `R/app/changes/changesText.ts`, `R/app/shell/ChangesPane.svelte`, `manuals/code.md`.

### UX-209 "Restore..." opens the Recycle Bin instead of restoring
- **Problem.** TH-138, one run (T09.1 N, steps 3 to 5). `T09.1-novice 003`: the row says "This change was undone. Restore it from the Recycle Bin." with a "Restore..." button. The click opens the Recycle Bin window, where the item must be selected and "Restore this item" pressed: "reads like a direct restore." T09.1 5 actions (intermediate 4).
- **Decision.** The button restores the file in one click (with the Recycle Bin item selected behind it) and the row shows "Restored". If a direct restore is not possible (the original folder is gone), the button reads "Open Recycle Bin..." and the sentence says why.
- **Acceptance.** T09.1 at both levels in 3 actions. Unit test on `openRecycleBin.ts` for the direct path.
- **Severity.** S4.
- **Findings.** TH-138, F-085, R7 UX-185.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/app/changes/{openRecycleBin.ts,revertedChanges.svelte.ts}`.

### UX-210 Code: the question quotes half a line, the editor is narrow with the pane open
- **Problem.** TH-139, two runs. `T27.1-intermediate 003`: the status bar says "Selected 1-2" and the prefilled question ends in `export const question = "what is` because the drag stopped mid-line. With the pane open the editor is about 190 px wide, the Changes and Git pane about 200 px, and the status bar is cut ("Line 2...", "Selecte..."). T27.1 N: the Chat entry is "only a narrow tab with the word Chat ... nothing says that it opens a chat about the open file."
- **Decision.** "Ask about selection" quotes whole lines (the lines the status bar names). The window grows (up to the screen) when the pane opens, or the Management and Changes panes close while the pane is open and return after. The Chat tab reads "Ask about this file" with the chat icon.
- **Acceptance.** T27.1 at both levels, SEQ 6 or more; the quoted lines match the status bar; the editor is at least 400 px wide with the pane open.
- **Severity.** S4.
- **Findings.** TH-139, F-086, R7 UX-186, expert F-008.
- **Files.** `R/apps/code/*`, `R/apps/shared/EmbeddedChat.svelte`, `manuals/{code,embedded-chat}.md`.

### UX-211 Code Review: no sign that the comments reached the chat; no focus in the comment box; an empty chat
- **Problem.** TH-140, three runs. T26.1 N (`005`): after "Send comments to chat..." the chat stays on "Fixing the review comments now." and the review window still reads "Changes requested": "I am not sure it worked" (the fixture agent stops there; the review window gives no line of its own). T26.2 N: "the comment box gives no clear sign that the text area has focus." T25.2 N (`001`): the chat panel is empty and "Blocker" and "Minor" are small coloured dots and words; "Showing notes.txt (1 of 2 changed files)" stays.
- **Decision.** After sending, the review banner adds "2 comments sent to the chat. Waiting for the assistant." and the button reads "Comments sent". The comment box shows a blue focus border and a caret on open. The Comments list names the level in words beside the colour. The status line reads "notes.txt (file 1 of 2 changed files)".
- **Acceptance.** T25.2, T26.1, T26.2: no record asks whether the comments were sent, where the typing goes, or what "Blocker" means.
- **Severity.** S4.
- **Findings.** TH-140, F-087, R7 UX-191.
- **Files.** `R/apps/code-review/*`, `manuals/code-review.md`.

---

## WP-D Activity gadget, Event Viewer, Browser, Terminal, A2UI forms

### UX-212 The Activity gadget says "Nothing has happened yet." beside a warning, during a job and after a crash
- **Problem.** TH-127, four runs (UX-188 not fixed; "RUN_ERROR" is gone). `T20.1-novice 001`: "Nothing has happened yet." with the toast "Project removed" and, in `002`, a Warning in Event Viewer (R7 showed "Warning: Drive E: is not plugged in ..."). `T13.1-novice 005`: "Nothing has happened yet." while the top bar says "Working: start the long job" and 6 of 30 steps are done. `T23.1-novice 002` and T23.1b N (004): "Error: The connection dropped" changes to "Nothing has happened yet." after a restart, "with no explanation". `Gadgets.svelte` line 103 shows the muted line when `feed` is empty and `problem` is null; `lastProblem` (`eventModel.ts` line 221) drops a notable event when `recovered` finds a later event.
- **Decision.** The gadget shows, in order: a warning or error that has no later success ("Warning: Drive E: is not plugged in on this desktop."), the running job ("Working: start the long job, 6 of 30"), the last finished item ("The agent restarted. Your request was sent again."). "Nothing has happened yet." shows only on a desktop with no event at all. A warning that Event Viewer lists is never hidden by a later event of another kind.
- **Acceptance.** T20.1, T13.1, T23.1, T23.1b: the gadget agrees with Event Viewer and the top bar in every shot; no record says the gadget says nothing while something happened. Unit test on `lastProblem` for a warning followed by an unrelated success.
- **Severity.** S3 (the gadget is the desktop's own status area and contradicts the rest of the screen).
- **Findings.** TH-127, F-088, R7 UX-188.
- **Files.** `R/desktop/Gadgets.svelte` (Activity block), `R/apps/event-viewer/eventModel.ts`, `manuals/event-viewer.md`.

### UX-213 Event Viewer shows protocol words and no plain sentence for a start failure
- **Problem.** TH-125 part 3 and TH-141, three runs. `T17.2-novice 011`: the Error row is named "← session/new (response)", the General tab says "Internal error" and the Details tab says "Query closed before response received" (`012`). `T20.1-novice 002`: the Warning row is "→ fs/read_text_file (response)" and the Chat column is cut ("Check th"); the header says "Number of events: 1" beside "25 more: Show all" (T20.1 I: "slightly confusing"). The panelist finds the cause only in the chat.
- **Decision.** Each warning and error row has a plain sentence in a "What happened" column (the same sentence as the chat's box: "The program 'npx' stopped before it was ready." / "Drive E: is not plugged in on this desktop.") and the General tab leads with it plus "What to do". The raw names ("session/new (response)") move to the Details tab. The Chat column is wide enough for a chat title (at least 160 px). "Number of events: 1" reads "1 warning shown. 25 other events hidden: Show all."
- **Acceptance.** T17.2 and T20.1 at both levels: the first line of the General tab is a sentence a novice can act on; no record says it shows only "Internal error".
- **Severity.** S3 (TH-125: the second place that a user is sent to for a start failure has no cause).
- **Findings.** TH-125, TH-141, F-089.
- **Files.** `R/apps/event-viewer/*`, `manuals/event-viewer.md`.

### UX-214 Browser: "Taken over", the "+", the covered page, the vanishing bar
- **Problem.** TH-142, four runs (UX-189 not fixed). T28.2 N: "'Taken over' is greyed out after the click, so it reads like a status, not a second action. The top bar's 'Pause all agents' ... does not say" it stops every agent. T29.1 N: "The '+' new-tab button and the address bar are unlabelled icons." T19.1 N: the chat pane covers the right part of the page. T28.1 I: the yellow bar vanishes when the agent stops.
- **Decision.** After Take over the bar stays and reads "You have the page. The agent waits. Click Give back to let it continue." with a Give back button. The "+" has a text tooltip "New tab" in the app's own tooltip. The page narrows when the pane opens. The bar stays for 5 seconds after the agent's last action and says "The agent stopped using this page."
- **Acceptance.** T28.2, T29.1, T19.1 at both levels: no record asks whether Take over stops the assistant or what the "+" is; no text is covered.
- **Severity.** S4.
- **Findings.** TH-142, F-090, R7 UX-189.
- **Files.** `R/apps/browser/*`, `manuals/browser.md`.

### UX-215 Terminal: typing gives no sign
- **Problem.** TH-143 part 1, two runs. `T31.2-novice 003`: the note "Read-only: the agent runs the commands here. You can watch but not type. Ask the agent in Chat to run a command." now shows at open, and the novice still typed "dir" and saw nothing ("Typing gets no feedback"). T31.2 I: "the typed text gives no feedback at the moment of typing."
- **Decision.** A key press in the screen flashes the note (a 1 second highlight) and the status bar reads "Read-only: nothing was typed". The note moves to the top of the window.
- **Acceptance.** T31.2 at both levels, no record says typing gave no sign.
- **Severity.** S4.
- **Findings.** TH-143, F-091, R7 UX-190.
- **Files.** `R/apps/terminal/*`, `manuals/terminal.md`.

### UX-216 A2UI forms: the "Sent." line disappears; "(Closed)" is the only state sign
- **Problem.** TH-143 part 2, five runs. T18.1 inline I and sidebar I: the line "Sent. The agent answered..." under the form is gone in the next shot; only the chat shows the answer (`A2uiSurface.svelte`, `A2uiActivity.svelte`). T18.2 N: "the card's '(Closed)' and '(Open)' text is the only state signal". T18.1 sidebar N: the card says "Notes" and the panel tab says "Form". The form's button "Send" has the same label as the chat's Send (a fixture text: H-117).
- **Decision.** The confirmation stays under the form until the user edits a field again. The card shows a button "Open" when closed and "Show" when open, with the state in words. The card and the tab use one name for the surface (the title the agent gave, else "Form").
- **Acceptance.** T18.1 (three variants) and T18.2: the confirmation is visible in the shot after Send; no record asks whether the form is the same thing as the card.
- **Severity.** S4.
- **Findings.** TH-143, F-092, R4 UX-133 to UX-137 (words).
- **Files.** `R/a2ui/*`, `R/apps/surface/*`, `R/app/session/A2uiActivity.svelte`, `manuals/surface.md`.

---

## Harness

Not product work. Owner: facilitator. Details and evidence in `panel/r8/SYNTHESIS.md` section 5. R7 harness items H-96 to H-103 and H-105 are fixed and seen working. H-104 is not fixed.

| id | Status | Where | Fix and acceptance |
|---|---|---|---|
| H-106 | **Done** (mid-round) | `checks/files.mjs` T03.1 | The check accepts the project in the Code tree after Plug in. Both T03.1 rows were stale FAIL and are PASS† (facilitator override). Acceptance: T03.1 passes without an override in round 9. |
| H-107 | open | `presets/` `bad-default-agent`, `tasks.md` T17.2 | Claude Code is listed first and cannot start (`npx`). Make it "not installed" or unavailable in the fixture, or list the working agents first. Acceptance: a panelist who picks any row that looks usable ends in a chat that answers. |
| H-108 | open (blocks the gate) | `scripts/ux-panel/scripts/browser-agent.json`, fixture page, `browserTools.ts` | The first Send of T28.1 failed in 2 of 2 sessions at "older messages load (2)" (`browser_wait` "Standup notes", 5183 ms, default `timeoutMs` 5000). Same screen both times; R7 passed with 28 steps. Run `e2e/browser-agent.e2e.ts` on `662b12c8ef` and find the change (the lazy load in the fixture page, `browser_scroll`, `browser_wait`). Give the lazy-load waits an explicit `timeoutMs` of 15000 and a plain failure sentence. Acceptance: T28.1 passes on the first Send in three runs at both levels. |
| H-109 | open | `session.mjs stop`, record template | `stop` fills Time from the log (4 records show `<stop fills in>` or `<min>`; 10 have no unit; 11 say "not measured" or "not timed"). Refuse a record with a placeholder. |
| H-110 | open | `session.mjs`, `FACILITATOR.md` | Pass `--rerun` and `--finished-by-facilitator`; write the reason in `check.json.notes`. T28.1 N, T29.1 N (reruns) and T13.2 N (finished by the facilitator) have `rerun: null` and `finishedByFacilitator: false`. Keep the lost run as `<task>-<level>-session-lost`. |
| H-111 | open | `session.mjs record` | T25.1 novice: `check.json.seq` is null, the record says 7. `record` fails when `--seq` is missing. |
| H-112 | open | `ux.mjs move`, `TopBar.svelte` | Browser `title` tooltips are not in shots (T10.2 N and I, T16.2 I). `move` prints the `title` of the element under the pointer; the brief says that browser tooltips are not in the shots. Product part: UX-200. |
| H-113 | open | `PANELIST.md`, session folder | T30.2 novice read the record folder and `check.json` after its verdict. Run the panelist in a folder without `check.json`; only the facilitator runs `check` and `stop`; the log cannot show file reads. |
| H-114 | open | `FACILITATOR.md` | Add the usage-limit rerun procedure (keep the lost log, fresh panelist, flags of H-110, reason in the synthesis). Two first runs were lost in R8. |
| H-115 | open | `tasks.md`, `checks/review.mjs`, `presets/features.mjs` | **Re-test of UX-193 for round 9.** Add **T25.3 - The chat reviews** to J25: Scenario: "Ask the assistant in the chat to review the changes in this project and leave its remarks in the review window. When it has finished, tell me how many remarks it left and where you were taken afterwards." Start state: `review-notes` with a chat open (the IDE chat) and the Code Review window open; scripted agent `chat-review` that calls `review_list_changes`, `review_read_diff`, `review_add_comment` twice and `review_submit` through the chat's own session. Success check: two comments exist in the review with the chat's agent as author; the verdict is set; no chat message lists the comments as text in place of the tools; after `review_submit` the IDE chat window is the active window; the answer says 2 remarks and the chat. Min 4 (type the request, Send, read the banner, read the chat). Budget 12 / 16. Run at both levels in round 9 with T25.1, T25.2, T26.1 and T26.2. Add the task to the coverage table (J25). |
| H-116 | open | `PANELIST.md` | A panelist quoted a cut text from the wrong window (T20.1 N: "Ask t..." is the Event Viewer column; the chat shows the whole sentence). Tell the panelist to name the window when it quotes cut text. Low priority. |
| H-117 | open | `scripts/ux-panel/scripts/a2ui*.json` | The form button says "Send" like the chat's Send (T18.1, four records); the speaker label is "Scripted a2ui". Name the button "Send name" and the speaker "Helper". |
| H-118 | open | `ux.mjs type`, `PANELIST.md` | `type` with a line break presses Enter, which sends a chat message (T27.1 I: `type ['it?"\nPlease explain these two lines.']`). Print "Enter pressed" per line break and say it in the brief. |
| H-119 | open | `session.mjs check` | `check` prints the words it needs ("the answer lacks: ..."). T17.2 N ran it three times and rewrote the answer twice until it passed. `check` prints PASS or FAIL only to the panelist; the reason goes to `check.json`. Better: only the facilitator runs `check`. |
| H-104 | open (R7) | `lib/context.mjs` presets | Still not fixed: the folder field shows "/tmp/a7ux-GpKvQZ/home/Documents/docs-site" (`T03.1-novice 005`). Make the fixture home look like a user folder or say in the brief that it is a test path. |

## Coverage of findings

| Theme | Item |
|---|---|
| TH-87 Deny has the focus | decision: keep Deny |
| TH-89 words | R4 UX-133 to UX-137, still open |
| TH-123 "Show the whole change" does nothing | UX-194 |
| TH-124 failed turn, no route | UX-195, H-108 |
| TH-125 start failure dead end | UX-196, UX-197, UX-213, H-107 |
| TH-126 Permissions page squeezed | UX-198 |
| TH-127 Activity gadget | UX-212 |
| TH-128 Changes columns cut | UX-207 |
| TH-129 Code Review by the chat | UX-193, H-115 |
| TH-130 take-control wording | UX-199 |
| TH-131 words and chip tooltip | UX-200, H-112 |
| TH-132 recovery residue | UX-201 |
| TH-133 launcher preselect | UX-202 |
| TH-134 window placement | UX-203 |
| TH-135 Task Manager Chats tab | UX-204 |
| TH-136 Help | UX-205 |
| TH-137 Explorer menu and About | UX-206 |
| TH-138 Changes tab wording, Restore | UX-208, UX-209 |
| TH-139 Code selection and pane | UX-210 |
| TH-140 Code Review feedback | UX-211 |
| TH-141 Event Viewer words | UX-213 |
| TH-142 Browser | UX-214 |
| TH-143 Terminal and A2UI | UX-215, UX-216, H-117 |
| T28.1 intermediate failure | H-108, UX-195 |
| T17.2 novice weak pass (SEQ 2) | UX-196, UX-197, UX-213, H-107, H-119 |
| T03.1 stale FAIL (both) | H-106 (done) |
| T06.3 novice detour | UX-199 |
| T13.2, T28.1, T29.1 novice flags | H-110, H-114 |
| T30.2 novice protocol slip | H-113 |
| Time placeholders | H-109 |
| T25.1 novice `seq` null | H-111 |

## Rerun plan

1. H-108 first (the only failed task; three runs of T28.1 at both levels), then WP-A (UX-194 to UX-198 are S3), WP-B, WP-C and WP-D in parallel. UX-193 lands in its own work item. Harness H-107, H-109 to H-119 in parallel. H-110 and H-114 before any round that has reruns, H-113 and H-119 before the next round starts, H-115 before the UX-193 re-test.
2. Rerun with fresh panelists (one per task, as in R8): T28.1 (H-108, UX-195), T17.2, T23.1 and T23.1b (UX-196, UX-197, UX-213, H-107), T05.1, T06.1 and T07.1 (UX-194), T10.1, T06.3, T16.1 and T16.2 (UX-198, UX-199), T13.1, T20.1, T23.1 and T23.1b (UX-212), T05.1, T08.1, T08.2, T09.1, T24.1 and T24.2 (UX-207, UX-208, UX-209), T27.1 (UX-210), T25.1, T25.2, T26.1, T26.2 and the new T25.3 (UX-193, UX-211, H-115), T20.2 and T23.1b (UX-201), T14.1 (UX-202), T12.2, T08.1 and T07.1 (UX-203), T04.2 and T13.1 (UX-204), T22.1, T31.1 and T19.2 (UX-205), T30.1 and T30.2 (UX-206), T28.2, T29.1 and T19.1 (UX-214), T31.2 (UX-215), T18.1 and T18.2 (UX-216), T03.1 (H-106).
3. Full pass on the packaged build for the release gate: all tasks at both levels (61 with T25.3), every task passes, no task below 5, median 6 or more, no open S2 or S3, every journey at 10 (which needs the S4 items fixed or accepted, D5 and D10).
4. Outside the panel: axe scan (28 states, with the 24 px chip), manual checklist and screen reader pass (D5); `perf.mjs` on the reference machine and a 30-minute soak (D10, UX-84). The UX lead accepts or rejects each open S4 in `findings.md`.
