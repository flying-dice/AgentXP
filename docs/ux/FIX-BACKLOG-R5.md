# Fix backlog, round 5

Source: `panel/r5/SYNTHESIS.md` (themes TH-70 to TH-89, harness defects H-77 to H-86), `scorecard.md` (round 5), the 120 round 5 records, the session folders in `/tmp/ux-sessions/r5/`, and the product source for every cause named below. Items of rounds 1 to 4 (UX-01 to UX-137) are not repeated unless R5 shows them not effective.

**Severity.** Rubric scale of `rubric.md`: S1 blocker, S2 major, S3 minor, S4 cosmetic. All 18 new product items are S3 except UX-139 and UX-155 (S4, open until the UX lead accepts them in `findings.md`). There is no open S1. UX-114 (S2) is not an item here: its root cause was fixed on the branch after the panel (AguiThread, AguiRunCoordinator, SessionStateModel, a regression unit test, `e2e/permission-diff.e2e.ts`). R5 still shows "cannot read <file>" in T05.1, T06.1, T07.1 and T21.1 because the panel ran the build before the fix. It is treated as fixed, waiting for re-verification by a fresh reviewer (rerun plan, step 2), not as an open defect.

**R4 items shipped and effective in R5** (no work): UX-115 (Control Center layout), UX-117 (Recycle Bin notice), UX-118 (chips and banner agree), UX-120 (chat no longer covers the Browser), UX-121 (Event Viewer link), UX-122 (review "+"), UX-123 (second failure), UX-131, UX-135 (partly), UX-127 (partly). **Not effective:** UX-119 (launcher stays in front, now UX-147), UX-116 (Changes names, now UX-151), UX-125 (status text, now UX-145), UX-132 (Help window, now UX-148).

Do not change harness files in the product items; those fixes are in the harness section (H-77 to H-86). UX-140 depends on H-80 and H-86 for its rerun.

Paths: `R` = `src/renderer/src/lib`, `M` = `src/main`, `shared` = `src/shared`.

Only problems that I confirmed against the shots, logs and code are listed. Not product, so no item: the "tiny scroll steps" in the Control Center list (five scrolls with dy 3 to 10 in three records are H-78: raw pixels; 13 other scrolls of 80 to 300 moved the list normally), the noisy browser reply (script text, H-79), and the T06.1 intermediate pass (checker false positive, H-77).

## Work packages

| WP | Name | Items | Files owned (edit freely) |
|---|---|---|---|
| WP-A | Approvals, chips, crash recovery, status text | UX-138, UX-139, UX-140, UX-141, UX-142, UX-143, UX-144, UX-145 | `R/app/session/{PermissionDialog.svelte,CommandLink.svelte,resumeNote.ts,UserMessage.svelte,chatProblem.ts}`, `R/desktop/{UacDialog.svelte,TopBar.svelte,activity.ts,approval.ts}`, `M/application/{SessionProblems,agentProblems,SessionRuntime,SessionService,PermissionBroker}.ts` |
| WP-B | Shell: Task Manager, launcher, Help, delete wording | UX-146, UX-147, UX-148, UX-150 | `R/desktop/{closeChat.ts,shellHints.ts,DesktopController.svelte.ts}`, `R/launcher/*`, `R/pages/{LauncherPage,DesktopPage}.svelte`, `R/apps/help/*`, `M/application/desktop/DesktopService.ts`, `manuals/help.md` |
| WP-C | Code: Changes, Git, Chat strip, Plug in | UX-151, UX-152, UX-153, UX-154, UX-155 | `R/apps/code/*`, `R/apps/code-review/*`, `R/app/shell/ChangesPane.svelte`, `R/apps/shared/EmbeddedChat.svelte`, `shared/lineCounts.ts` (read only) |
| WP-D | Browser and agents | UX-149, UX-156, UX-157 | `R/apps/browser/*`, `R/apps/control-centre/AgentsPage.svelte`, `R/app/session/{browserSteps.ts,toolTitles.ts}`, `M/application/tools/{browserLabels,browserTools}.ts` |
| final | Sweep | rerun | one developer, after WP-A to WP-D are merged |

WP-A to WP-D can run in parallel. Their file sets overlap only in the files below.

**Shared files to watch (small, additive edits in a separate block; merge in the order WP-A, WP-C, WP-B, WP-D, or rebase often):**
- `R/desktop/TopBar.svelte`, `R/desktop/activity.ts`: WP-A only (UX-142, UX-143, UX-145). WP-B reads them (Task Manager hint) and does not edit them.
- `R/desktop/DesktopController.svelte.ts`, `R/pages/DesktopPage.svelte`: WP-B owns. WP-A adds no handler there; UX-138's link from the top bar uses the existing `openChat` call.
- `R/apps/shared/EmbeddedChat.svelte`: WP-C (UX-153) edits the collapsed strip only. WP-A edits the permission box and message rows in `R/app/session/*`, which `EmbeddedChat` embeds, and not `EmbeddedChat` itself.
- `R/apps/control-centre/*`: UX-142 (WP-A) only changes the chip's tooltip, role and label in the bar; UX-149 (WP-D) edits `AgentsPage.svelte` only.
- `R/app/session/SessionView.svelte` and `toolTitles.ts`: WP-D edits `toolTitles.ts` and `browserSteps.ts`; WP-A does not touch them.
- `M/application/SessionProblems.ts`: WP-A only (UX-140, UX-141).
- `manuals/*.md`: each WP edits only its own apps' manuals; `scripts/check-help-coverage.mjs` must stay green after each merge (514 of 514 ids today).

---

## WP-A Approvals, chips, crash recovery, status text

### UX-138 The approval box is clipped, hides the transcript, and its link does not say which chat
- **Problem.** TH-70, eight runs (T07.1 N and I, T13.2 N and I, T06.1 N, T21.1 N and I, T06.2). The box is cut by its chat window (shot T13.2-novice 005, T07.1-novice 001); it covers the transcript the user would read first; the top-bar link "Waiting for ..." opens one of two requests without naming its chat, and T07.1 novice allowed a request it had not read; the command line has "(Running commands is set to Ask in Control Center)" glued to the command.
- **Decision.** (1) The box is a part of the chat layout (above the composer, scrolling with a maximum height of 40% of the window), not an overlay. Allow and Deny are always inside the window. (2) The top-bar and Action Center entries name the chat ("Fix login redirect is waiting: run a command"); with two waiting requests the link opens the oldest and the box says "1 of 2 waiting". (3) The setting note moves to its own line below the command in small text, never inside the command text.
- **Acceptance.** T06.1, T06.2, T07.1, T13.2, T21.1 at both levels: both buttons are inside the window in a screenshot at the default window size; the command text of the record has no "Running commands is set to Ask"; T07.1 shows the chat name in the link; no record allows a request it did not read.
- **Severity.** S3.
- **Findings.** TH-70, `SYNTHESIS.md` 2.7.
- **Files.** `R/app/session/{PermissionDialog.svelte,CommandLink.svelte}`, `R/desktop/{UacDialog.svelte,approval.ts,TopBar.svelte}`.

### UX-139 Deny has the focus; the key hint is small and below the fold
- **Problem.** TH-87, three runs. Deny is focused by design (`autofocus` in `PermissionDialog` and `UacDialog`); the hint for the keys sits below the clipped part of the box.
- **Decision.** Keep Deny as the default focus (the safe choice; an Enter that allows would be worse). Show the hint "Enter denies. Press A to allow." on the same row as the buttons. Proposed for acceptance as S4 once the hint is visible.
- **Acceptance.** The hint is visible in the T21.1 shot without scrolling; focus order test unchanged.
- **Severity.** S4.
- **Findings.** TH-87, `SYNTHESIS.md` 2.5.
- **Files.** `R/app/session/PermissionDialog.svelte`, `R/desktop/UacDialog.svelte`.

### UX-140 After the second crash, Restart goes idle and the request is lost without a word
- **Problem.** TH-71, T23.1b N (SEQ 4, weak) and I. Restart reconnects, the chat is idle, and nothing says the message was not sent again (shot T23.1-twice-novice 004). "Start a new chat" does not say the text must be typed again.
- **Decision.** After Restart the chat shows one line in the transcript: "Agent7 restarted. Your last request was not sent again: [Send it again]" with the text, a button that resends it. The error panel's "Start a new chat" says "(your text is kept in the box)" and keeps the text in the composer.
- **Acceptance.** T23.1b at both levels: the line is present after Restart; SEQ 6 or more at the novice level; resend works in one click. Unit test on the resume note.
- **Severity.** S3.
- **Findings.** TH-71, `SYNTHESIS.md` 2.4.
- **Files.** `R/app/session/{resumeNote.ts,chatProblem.ts}`, `M/application/{SessionRuntime,SessionService}.ts`. Rerun depends on H-80, H-86.

### UX-141 "It stopped again" at the first stop
- **Problem.** TH-72, T20.2 N and I (shots 009 and 007). Ending the agent once in Task Manager reports "It stopped again" and "ended again". `SessionProblems.set` dedupes a repeated report only for kind `agent-stopped`; the Task Manager end is `agent-ended`, so the count is 2.
- **Decision.** Treat `agent-ended` like `agent-stopped` in the dedupe, and count a failure only after a start that came after the earlier report.
- **Acceptance.** T20.2: one end gives "The agent was ended" without "again"; a second end after a restart still says "again". Unit test in `SessionProblems.test.ts`.
- **Severity.** S3.
- **Findings.** TH-72, `SYNTHESIS.md` 2.8.
- **Files.** `M/application/{SessionProblems,agentProblems}.ts`.

### UX-142 The permission chips look like labels and open Control Center
- **Problem.** TH-74, T06.3 N and I, T16.1 N ("I only found it by guessing that it was clickable").
- **Decision.** Chips get a button look (border and hover), the tooltip "Open Control Center" and `aria-label="Run commands: Ask. Open Control Center to change."`; a click opens Control Center on the Permissions page.
- **Acceptance.** T06.3, T16.1 at both levels: no record says it did not know the chip was clickable; axe still clean.
- **Severity.** S3.
- **Findings.** TH-74.
- **Files.** `R/desktop/{TopBar.svelte,activity.ts}`.

### UX-143 Take over silently switches every tool to Ask
- **Problem.** TH-73, T28.2 N and I. One click on "Take over" in the page bar switches all tools to Ask and ticks "Ask before every action"; no sentence says so.
- **Decision.** The button's tooltip and the bar after the click say "You are in control. All tools ask first until you resume." with a "Resume" button; the same sentence in the Activity tile.
- **Acceptance.** T28.2 at both levels: the sentence is visible in the shot after Take over.
- **Severity.** S3.
- **Findings.** TH-73, shot T28.2-intermediate 002.
- **Files.** `R/desktop/{activity.ts,TopBar.svelte}`, `R/apps/browser/BrowserApp.svelte` only for the button tooltip text constant (shared with WP-D: one constant, in `activity.ts`).

### UX-144 A message Agent7 wrote is labelled "You"
- **Problem.** TH-75, T11.3 I (shot 003). The auto-sent "Please continue where you stopped." appears as a user message.
- **Decision.** Label it "Agent7 (automatic)" with the muted style of system notes; it keeps its place in the transcript.
- **Acceptance.** T11.3 at both levels: the label is not "You".
- **Severity.** S3.
- **Findings.** TH-75.
- **Files.** `R/app/session/{UserMessage.svelte,resumeNote.ts}`.

### UX-145 "Working: Starting the agent..." beside a ready chat
- **Problem.** TH-81, T04.1 I, T06.3 N (shot 002), T24.1 I (shot 004). R4 UX-125 is not effective: the bar keeps the start text when the chat is ready.
- **Decision.** The status text derives from the session state of the focused chat only (ready, working, waiting); "Starting the agent..." is shown only while that session's state is `starting`.
- **Acceptance.** No record or shot has "Starting the agent" with a chat that accepts input. Unit test for `activity.ts`.
- **Severity.** S3.
- **Findings.** TH-81.
- **Files.** `R/desktop/{activity.ts,TopBar.svelte}`.

---

## WP-B Shell: Task Manager, launcher, Help, delete wording

### UX-146 Task Manager is named in a toast but cannot be found
- **Problem.** TH-78, five runs (T13.1 N and I, T20.2 N and I, T07.1 N). `CLOSE_CHAT_TEXT` says "Open it again from the Task Manager"; Task Manager is only in the Start menu; the Chats icon gives no feedback when chats are open; the Task Manager list hides its right columns.
- **Decision.** The toast carries a button "Open Task Manager"; the text names the place the user can see ("Open it from Chats in the top bar"). Chats opens a visible list, also when chats are open. The Task Manager window opens wide enough for all columns.
- **Acceptance.** T13.1, T20.2 at both levels: the toast has the button; no record says the Task Manager was not found.
- **Severity.** S3.
- **Findings.** TH-78, shot T13.1-novice 004.
- **Files.** `R/desktop/{closeChat.ts,shellHints.ts,DesktopController.svelte.ts}`, Task Manager app default size.

### UX-147 The launcher stays in front after Create
- **Problem.** TH-85, T01.1 I (shot 003). R4 UX-119 is not effective on this path: the maximized launcher covers the new desktop.
- **Decision.** After Create the launcher is minimized or closed and the new desktop is in front; Create and Open do the same.
- **Acceptance.** T01.1, T02.1 at both levels: the first shot after Create shows the desktop.
- **Severity.** S3.
- **Findings.** TH-85.
- **Files.** `R/launcher/*`, `R/pages/LauncherPage.svelte`, `M/application/desktop/DesktopService.ts`.

### UX-148 Help opens partly off-screen and partway down
- **Problem.** TH-79, five runs (T22.1 I, T22.2 I, T31.1 N, T31.2 I and N). R4 UX-132 not effective: the search box and buttons are cut; F1 opens partway down a page; the welcome balloon covers its footer.
- **Decision.** The Help window opens inside the work area (size from the work area, not fixed); F1 opens the topic at its top; the balloon is dismissed when Help opens.
- **Acceptance.** T22.1, T22.2, T31.1, T31.2: the whole window is in the shot; the topic title is the first line.
- **Severity.** S3.
- **Findings.** TH-79, shot T31.2-intermediate 002.
- **Files.** `R/apps/help/*`, `M/application/desktop/DesktopService.ts` (placement only).

### UX-150 "removes your files (C:)"
- **Problem.** TH-86, T15.1 N. The delete confirmation says "removes your files (C:), chats, notes and logs"; the novice feared for their own documents.
- **Decision.** "Deletes this desktop: its chats, notes and logs. Your project folders stay where they are."
- **Acceptance.** T15.1: the novice says that project folders are safe. Find the text with `grep -rn "removes your files" src/renderer`.
- **Severity.** S3.
- **Findings.** TH-86.
- **Files.** the file that holds the text (WP-B owns it); `manuals/desktops.md`.

---

## WP-C Code: Changes, Git, Chat strip, Plug in

### UX-151 Changes pane: four rows, cut names, revert notice squeezes the list
- **Problem.** TH-76, six runs (T08.1 I, T08.2 N and I, T09.1 N shot 002, T06.1 N and I). R3 UX-111 and R4 UX-116 are not effective: about four rows, names cut ("r..direct.ts"), a diff pane three times as tall, and after a revert the notice leaves a clipped row (shot T08.1-intermediate 005).
- **Decision.** The list takes at least 50% of the pane height and the diff pane at most 50%; names are shown with a middle ellipsis that keeps the file name and the end of the path; the revert notice is one line above the list and does not take height from the list (it scrolls with it).
- **Acceptance.** T08.1, T08.2, T09.1 at both levels: at least 6 rows visible with 5 files; the whole file name readable; after revert the list is not clipped.
- **Severity.** S3.
- **Findings.** TH-76.
- **Files.** `R/app/shell/ChangesPane.svelte`.

### UX-152 Single click on a Git row does nothing; Changes says "No pending changes" while Git has files
- **Problem.** TH-77, four runs (T24.1, T24.2 N and I; shot T24.1-novice 001). The Changes tab shows "No pending changes in this chat." and "0 files" while Git (3) lists three files.
- **Decision.** A single click on a Git row opens its diff in the review pane (a double click stays as is). The Changes tab says "The agent changed nothing in this chat. Git shows 3 changed files: [Open Git]" when the two differ.
- **Acceptance.** T24.1, T24.2: one click opens the diff; the tab text never says "No pending changes" beside a non-empty Git list.
- **Severity.** S3.
- **Findings.** TH-77.
- **Files.** `R/apps/code/{CodeApp.svelte,DockPane.svelte,gitModel.ts,codeModel.ts}`, `R/app/shell/ChangesPane.svelte` (text only; coordinate with UX-151 in one block).

### UX-153 The collapsed Chat strip is not recognised and stays in Focus mode
- **Problem.** TH-80, T27.1 N, T27.2 N and I. The strip says "Chat" in small rotated text (`aria-label` "Show chat") and is not seen as the way in; in Focus mode it stays visible.
- **Decision.** The strip gets a chat icon, the text "Chat (Ctrl+J)" horizontally in the tab, and a pulse when the chat has news; hidden in Focus mode with an entry in the Focus-mode bar.
- **Acceptance.** T27.1, T27.2: no record hesitates over how to open the chat; SEQ 6 or more for T27.1 novice.
- **Severity.** S3.
- **Findings.** TH-80.
- **Files.** `R/apps/shared/EmbeddedChat.svelte`, `R/apps/code/CodeApp.svelte`.

### UX-154 Code has no Plug in control
- **Problem.** TH-84, T03.1 N and I (SEQ 5 with a dead end). The toolbar folder icon opens "Open file, Look in: E:\" (shot T03.1-intermediate 002); Management offers "New chat here" and "Remove from desktop" only.
- **Decision.** Add "Plug in a folder" to the Code Management menu and to the empty-state of the Code tree; the folder icon's tooltip says "Open a file".
- **Acceptance.** T03.1 at both levels: no dead end; SEQ 6 or more.
- **Severity.** S3.
- **Findings.** TH-84.
- **Files.** `R/apps/code/*`.

### UX-155 Greyed buttons without reason; comment counts disagree
- **Problem.** TH-88, eight runs. "Add comment" and "Remove from desktop" greyed without a reason; "Comments (0)" against the banner "2 comments" after Send; "2 files changed. Showing 1 (the one ..." cut.
- **Decision.** A tooltip with the reason on every disabled control of these two views; the count in the tab follows the banner; the banner wraps instead of cutting.
- **Acceptance.** T12.1, T25.1, T25.2, T26.1, T26.2: no record asks why a button is grey; the counts agree.
- **Severity.** S4.
- **Findings.** TH-88.
- **Files.** `R/apps/code-review/*`, `R/apps/code/*` (the Management menu).

---

## WP-D Browser and agents

### UX-149 "Open Agents" does not select the broken agent; About blank; row cut
- **Problem.** TH-83, T17.1 N and I, T17.2 N and I (shot T17.2-intermediate 002). The About column is blank for user agents and the new row is cut ("node my-age...").
- **Decision.** "Open Agents" opens the page with the agent selected and scrolled into view; About shows the command for user agents; the row shows the name first and truncates the command.
- **Acceptance.** T17.1, T17.2: the agent is selected on open; no blank About.
- **Severity.** S3.
- **Findings.** TH-83.
- **Files.** `R/apps/control-centre/AgentsPage.svelte`.

### UX-156 The yellow "Agent is using this page" bar stays after the turn
- **Problem.** TH-82, T28.1 I (shot 005). `BrowserApp` clears the bar `ACTIVITY_MS = 20000` after the last step, so it says "Agent is using this page: Waiting for the page to change" after the turn ended.
- **Decision.** Clear the bar on the end of the turn event (or when the session leaves `working`); keep the 20 s timer only as a fallback.
- **Acceptance.** T28.1: no yellow bar in the shot after the final reply.
- **Severity.** S3.
- **Findings.** TH-82.
- **Files.** `R/apps/browser/{BrowserApp.svelte,pageStatus.ts}`.

### UX-157 The step list is too generic
- **Problem.** TH-82, T28.1 N and I. The chat says "Clicked on the page" and "Typed on the page" with no target.
- **Decision.** Include the target text from the tool call ("Clicked the button 'Send'", "Typed in 'Message #general'").
- **Acceptance.** T28.1: the step list names the target.
- **Severity.** S3.
- **Findings.** TH-82.
- **Files.** `R/app/session/{browserSteps.ts,toolTitles.ts}`, `M/application/tools/{browserLabels,browserTools}.ts`.

---

## Harness

Not product work; owner: facilitator. Details and evidence in `panel/r5/SYNTHESIS.md` section 5.

| id | Where | Fix |
|---|---|---|
| H-77 | `checks/util.mjs` `numbersIn`, `checks/chat.mjs` T06.1 | No range expansion; require the numbers as written or "+3" and "-3". |
| H-78 | `ux.mjs` help, `PANELIST.md` | Document the scroll unit (100 per notch, 200 to 300 per page), print the position change, warn under 20. |
| H-79 | `scripts/browser-agent.json` | Reply in one plain sentence. |
| H-80 | `FACILITATOR.md`, `session.mjs start`, `check.json` | One fresh panelist per task; write `context.previousTasks`; refuse T21.1, T22.x, T31.x after the tasks that teach them. |
| H-81 | `ux.mjs`, `lib/log.mjs` | Print "step N" after each action. |
| H-82 | `session.mjs check`, `checks/desktop.mjs` | Refuse a verdict for an answer task without `--answer`; keyword checks for T02.2, T10.1. |
| H-83 | `session.mjs stop` | Write the "Steps: N of M" line from `check.json`. |
| H-84 | `PANELIST.md`, `checks/features.mjs` T31.1 | Quote only text visible in a shot and name it; keyword check "Ctrl+S". |
| H-85 | `checks/chat.mjs` T07.1, `tasks.md` | Log the order and time of the two answers; say which chat is meant. |
| H-86 | session folder names, `tasks.md` | One id, T23.1b, everywhere. |

## Coverage of findings

| Theme | Item |
|---|---|
| TH-49 (UX-114) | fixed on the branch; re-verification in the rerun plan |
| TH-70 approval box | UX-138 |
| TH-71 crash recovery | UX-140 |
| TH-72 "It stopped again" | UX-141 |
| TH-73 Take over | UX-143 |
| TH-74 chips | UX-142 |
| TH-75 "You" label | UX-144 |
| TH-76 Changes list | UX-151 |
| TH-77 Git and Changes | UX-152 |
| TH-78 Task Manager | UX-146 |
| TH-79 Help | UX-148 |
| TH-80 Chat strip | UX-153 |
| TH-81 status text | UX-145 |
| TH-82 Browser bar and steps | UX-156, UX-157 |
| TH-83 Agents page | UX-149 |
| TH-84 Plug in | UX-154 |
| TH-85 launcher in front | UX-147 |
| TH-86 delete wording | UX-150 |
| TH-87 Deny focus | UX-139 (keep Deny) |
| TH-88 small review items | UX-155 |
| TH-89 words | R4 UX-133 to UX-135, still open |
| Tiny scroll steps | H-78 (harness) |
| T06.1 failure | UX-114 (fixed), UX-138, H-77 |

## Rerun plan

1. Verify UX-114 first with a fresh reviewer (including a new-file case, T21.1's NOTE.md, and a file in use); rerun T05.1, T06.1, T07.1, T13.2, T21.1 at both levels.
2. WP-A first, then WP-C, WP-B, WP-D in parallel; harness H-77 to H-86 in parallel; H-80 (fresh panelists) before any rerun.
3. Rerun with fresh panelists: T06.1, T07.1, T23.1b, T27.1, T28.1, T19.2, T15.1, every weak row of `SYNTHESIS.md` 2.1, and every task of J05 to J11, J13, J16, J17, J20, J23, J24, J27, J28.
4. Full pass on the packaged build for the release gate: all 60 tasks at both levels, novice median 6 or more, no task below 5, no record with the sentences named in the acceptance lines.
5. Outside the panel: axe re-scan (the 24 px chip), manual checklist and screen reader pass (D5); `perf.mjs` on the reference machine and a 30-minute soak (D10, UX-84). The UX lead accepts or rejects each open S4 in `findings.md`.
