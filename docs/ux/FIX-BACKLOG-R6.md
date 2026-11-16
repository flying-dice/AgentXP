# Fix backlog, round 6

Source: `panel/r6/SYNTHESIS.md` (themes TH-90 to TH-104, harness defects H-87 to H-95), `scorecard.md` (round 6), the 120 round 6 records, the session folders in `docs/ux/panel/r6/`, and the product source for every cause named below. Items of rounds 1 to 5 (UX-01 to UX-157) are not repeated unless R6 shows them not effective or only partly effective. R6 is the first round with a fresh panelist for every session (H-80), so its step counts and learnability findings stand.

**Severity.** Rubric scale of `rubric.md`: S1 blocker, S2 major, S3 minor, S4 cosmetic. There is no open S1. **One S2 (UX-158), eight S3 (UX-159, UX-160, UX-161, UX-163, UX-164, UX-165, UX-170, UX-171) and six S4 (UX-162, UX-166, UX-167, UX-168, UX-169, UX-172)**, 15 new items (R5: 18 S3 and 2 S4). S4 items are open until the UX lead accepts them in `findings.md`. UX-114 is fixed and verified (T05.1, T13.2, T21.1 shots; 0 of 120 records say "cannot read"). The failed task of the round (T06.1 intermediate) is UX-158.

**Migrations.** No work package needs a database migration. Reserved: none. The next free migration number stays **013**; a WP that finds it needs one takes 013 and tells the others in the merge request.

Paths: `R` = `src/renderer/src/lib`, `M` = `src/main`, `shared` = `src/shared`. The Task Manager is `R/apps/agent-manager/*` (registry id `agent-manager`).

## R5 backlog: verification with R6 evidence

20 items: **11 fixed, 6 fixed in part, 3 not fixed.** Shots are named `<task>-<level> <number>`; a record without a number was read, not viewed.

| R5 item | Verdict | Evidence in R6 |
|---|---|---|
| UX-114 (the box says it cannot read a file; not an R5 item, fixed on the branch) | **Verified fixed** | `T05.1-novice 004`, `T13.2-novice 003`, `T07.1-novice 001` (old and new lines, "3 lines added, 3 removed"); `T21.1-novice 006` ("The file does not exist yet, so everything below is new (1 line)."); 0 of 120 records contain "cannot read". |
| UX-138 approval box in the layout, link names the chat, note on its own line | **Fixed** | `T07.1-novice 001`: box above the composer, both buttons inside the window, "1 of 2 waiting", top-bar link "Fix the login redirect bug s... is waiting: change src/auth/redirect.ts (1 of 2 waiting)"; T06.3 records: "Running commands is set to Ask in Control Center." as its own line. Its side effect is the new UX-158. |
| UX-139 key hint on the button row | **Fixed** | `T06.1-intermediate 002`, `T07.1-novice 001`: "Enter denies. Press A to allow." next to Allow and Deny. Deny stays the default (decision of R3, kept); T21.1 novice would prefer Allow (S4, no change). |
| UX-140 request lost after Restart | **Fixed** | `T23.1b-novice 003`: "Agent7 restarted. Your last request was not sent again: "please do the slow job"" and "Send it again"; "Start a new chat (your text is kept in the box)" in `T23.1b-intermediate 001`. T23.1b novice SEQ 6 (R5 4). |
| UX-141 "It stopped again" at the first stop | **Fixed** | `T20.2-intermediate 007`: "The agent program was stopped." and "Restart and send again"; no record has "again" except the two T23.1b records (second crash, correct). |
| UX-142 chips look like labels | **Not fixed** | `T10.2-novice 002`: dashed pill, underlined on hover, no tooltip; T10.1 N "the first click on the yellow pill was a guess", T16.1 N "guessing that it was clickable", T06.3 N, T16.2 I "no tooltip". Now UX-159. |
| UX-143 Take over says what it does | **Fixed** | `T28.2-novice 002`: "You are in control. All tools ask first until you resume." and a Resume button. The page-bar sentence is cut (S4, UX-172). |
| UX-144 "Please continue where you stopped." labelled "You" | **Fixed** | `T11.3-intermediate 003`: "Agent7 (automatic)". |
| UX-145 "Working: Starting the agent..." beside a ready chat | **Fixed** | One sighting in 120 records, during a real restart (T17.2 novice 006). |
| UX-146 Task Manager named in the toast, cannot be found | **Fixed in part** | The toast says "Open it again from Chats on the desktop" and has an "Open Task Manager" button; the Task Manager shows its CPU column (`T13.1-novice 002`, `003`). But the Chats icon opens Task Manager, from which the closed chat cannot be reopened (`T13.1-novice 006`, `008`). Now UX-163. |
| UX-147 launcher stays in front after Create | **Not fixed** | `T01.1-novice 003`, `T01.1-intermediate 003`: identical shots, the maximized launcher with "New desktop Connected"; T13.2 I after Connect. Now UX-164. |
| UX-148 Help opens partly off-screen and partway down | **Fixed in part** | The window is inside the work area (`T01.1-novice 004`) but 470 px wide with the search box at the edge (`T31.2-novice 005`); F1 on the new desktop opens the Keyboard topic. Now UX-165. |
| UX-149 "Open Agents" does not select the broken agent | **Fixed** | `T17.2-novice 003`, `T17.2-intermediate 002`: "My assistant" selected on open, About shows `not-a-real-command`, "This is already the default". |
| UX-150 "removes your files (C:)" | **Fixed** | `T15.1-novice 002`: "Deletes this desktop: its chats, notes and logs. Your project folders stay where they are." T15.1 SEQ 7 and 7. |
| UX-151 Changes pane: four rows, cut names, revert notice squeezes the list | **Fixed in part** | `T08.2-novice 002`: five rows for five files; `T08.1-novice 005`: the notice is one line above the list and the second file is visible. Cut text remains ("redir... t.test.ts", "Reverted. Restore fr..."). Residual S4: UX-167. |
| UX-152 single click on a Git row; "No pending changes" beside a non-empty Git list | **Fixed in part** | `T24.1-novice 001`: "The agent changed nothing in this chat. Git shows 3 changed files. Open Git"; a single click still only selects (T24.2 novice record). Residual S4: UX-168. |
| UX-153 collapsed Chat strip not recognised | **Fixed in part** | `T27.1-novice 001`: right-edge tab with a chat icon and "Chat"; `T27.2-novice 003`: Focus bar has a Chat button. T27.1 novice SEQ 6 (R5 5) but still "a guess at an unlabelled spot". Residual S4: UX-167 (hint with the key). |
| UX-154 Code has no Plug in control | **Fixed** | `T04.2-novice 002`: "New chat here", "Plug in a folder", "Remove from desktop" in the Management panel; T03.1 intermediate "visible at once", SEQ 7 and 6. |
| UX-155 greyed buttons without reason; counts disagree | **Fixed in part** | `T26.1-novice 007`: "Comments (2)" agrees with "2 comments". "Add comment" and "Remove from desktop" are still greyed with no tooltip; the Review status bar is cut. Residual S4: UX-167. |
| UX-156 yellow bar stays after the turn | **Fixed** | `T28.1-novice 007`: no bar after the final reply; `T28.1-intermediate 005`: the bar names the live step while it works. |
| UX-157 step list too generic | **Not fixed** | `T28.1-novice 007`: "Find something on the page", "Type on the page", "Click on the page"; new: raw ids in the top bar. Now UX-170. |

R4 S4 items UX-133 to UX-137 (words: "Scripted demo", "plug in", "ENOENT", "port", "Notes" and "Board" for a form) are still open (T02.1 N, T17.2 N, T19.2 N, T18.1 sidebar N, T18.1 window I); the UX lead decides them in `findings.md`.

Only problems that I confirmed against the shots, logs and code are listed. Not product, so no item: the scripted reply "Fixing the review comments now." with a disabled Stop (T26.1 novice, script text), "I did not change any files or run any commands." (T22.2 novice, the scripted agent does not edit on that prompt), the desktop icons needing a double-click (T16.2 novice, Windows convention and the balloon says so), the tiny diff scrolls (T06.1 novice, that is UX-158, not a scroll unit: H-78 is fixed).

## Work packages

| WP | Name | Items | Files owned (edit freely) |
|---|---|---|---|
| WP-A | Approvals, chips, chat errors, chat manual | UX-158, UX-159, UX-160, UX-161, UX-162 | `R/app/session/{PermissionDialog.svelte,ApprovalDetail.svelte,ErrorRow.svelte,chatProblem.ts,UserMessage.svelte}`, `R/desktop/{UacDialog.svelte,TopBar.svelte,activity.ts,approval.ts}`, `R/apps/chat/ChatApp.svelte`, `M/application/{SessionRuntime,SessionService,SessionProblems}.ts`, `manuals/{chat,approvals}.md` |
| WP-B | Shell: Chats and Task Manager, launcher, Help | UX-163, UX-164, UX-165, UX-166 | `R/apps/agent-manager/*`, `R/desktop/{closeChat.ts,shellHints.ts,shellKeys.ts,geometry.ts,DesktopController.svelte.ts,DesktopSurface.svelte}`, `R/apps/registry.ts`, `R/app/session/StopNotice.svelte`, `R/launcher/*`, `R/pages/{LauncherPage,DesktopPage}.svelte`, `R/apps/help/*`, `M/application/desktop/DesktopService.ts`, `manuals/{desktop,launcher,help,agent-manager}.md` |
| WP-C | Code, Changes, Review | UX-167, UX-168, UX-169 | `R/apps/code/*`, `R/apps/code-review/*`, `R/app/shell/ChangesPane.svelte`, `R/apps/shared/{EmbeddedChat,ChatStrip}.svelte`, `manuals/{code,code-review,embedded-chat}.md` |
| WP-D | Browser and Event Viewer | UX-170, UX-171, UX-172 | `R/apps/browser/*`, `R/apps/event-viewer/*`, `R/desktop/Gadgets.svelte` (the Activity gadget block only), `R/app/session/{browserSteps.ts,toolTitles.ts}`, `M/application/tools/{browserLabels,browserTools}.ts`, `manuals/{browser,event-viewer}.md` |
| final | Sweep | rerun | one developer, after WP-A to WP-D are merged |

WP-A to WP-D can run in parallel. Their file sets overlap only in the files below.

**Shared files to watch (small, additive edits in a separate block; merge in the order WP-A, WP-B, WP-C, WP-D, or rebase often):**
- `R/desktop/TopBar.svelte`, `R/desktop/activity.ts`: WP-A only (UX-159). WP-D reads `activity.ts` for the status text of UX-170 (the raw id comes from the tool title, so the fix is in `toolTitles.ts`, WP-D) and does not edit it.
- `R/desktop/DesktopController.svelte.ts`: WP-B owns. WP-A adds no handler there.
- `R/app/session/*`: WP-A owns the permission and error files listed; WP-D owns `browserSteps.ts` and `toolTitles.ts`; WP-B owns `StopNotice.svelte` (one line, UX-163). No other file of the folder changes.
- `R/apps/shared/EmbeddedChat.svelte`: WP-C only.
- `R/apps/chat/ChatApp.svelte`: WP-A only (the tooltip of the Changes button, UX-161).
- `manuals/*.md`: each WP edits only the manuals listed; `scripts/check-help-coverage.mjs` must stay green after each merge (520 of 520 ids today).

---

## WP-A Approvals, chips, chat errors, chat manual

### UX-158 The diff in the permission box is one to three rows tall
- **Problem.** TH-90, five runs; T06.1 intermediate FAILED on it (3 of 3 actions, answer without the lines). `T06.1-intermediate 002`: the box is in the chat layout (UX-138), the transcript above it keeps three rows and the composer below it, the diff viewport is about three text rows high, and the box has its own scroll bar next to the diff's (two nested scroll areas). `T05.1-novice 004` shows two rows, `T07.1-novice 001` one row in each of the two chats. The novice scrolled twice (36 px, then to the end) to read lines 1, 3 and 4. Cause: `PermissionDialog.svelte` sets `max-height: 40%` and lets the body scroll while the diff scrolls inside it. The R5 acceptance asked for the buttons inside the window and met it; it did not ask for a readable diff.
- **Decision.** (1) The diff gets a minimum of 8 rows (about 160 px) and shows up to 14 rows before it scrolls; the box takes what the diff needs up to 55% of the window and the transcript shrinks first. (2) One scroll area: the box does not scroll around a diff that scrolls; the question, the file path and the counts stay on top, the diff scrolls alone. (3) When the window is too small for 8 rows, a link "Show the whole change" in the box opens the diff in Changes (the pane opens on the file). (4) The same in `UacDialog.svelte`. (5) Add a story with a 5-line change in a 480 px high chat window.
- **Acceptance.** T06.1 at both levels: the three changed lines of `redirect.ts` (1, 3 and 4) are visible without scrolling or with one scroll, in a screenshot at the default window size; T05.1, T07.1 (both chats), T13.2: at least 8 diff rows visible; T21.1 (one-line new file) unchanged. Unit test for the height rule; axe still clean in the "chat with a pending request" state.
- **Severity.** S2 (a failed task of the panel).
- **Findings.** TH-90, `SYNTHESIS.md` 2.1 and 2.6.
- **Files.** `R/app/session/{PermissionDialog.svelte,ApprovalDetail.svelte}`, `R/desktop/UacDialog.svelte`. Rerun depends on H-88.

### UX-159 The permission chips look like labels and open Control Center without saying so
- **Problem.** TH-91, five runs (T10.1 N, T16.1 N, T06.3 N, T16.2 I, T10.2 N shot 002). R5 UX-142 is not effective: `T10.2-novice 002` shows a dashed pill that is underlined on hover, with no tooltip and no change of the pointer. "The first click on the yellow pill was a guess."
- **Decision.** Chips get a button look (solid border, hover fill, pointer), the tooltip "Open Control Center to change this" and `aria-label="Run commands: Ask. Open Control Center to change."`; the dashed style is kept only for the read-only chips that have no setting ("no app open"). A chip that opens Control Center opens it on the Permissions page with its row selected.
- **Acceptance.** T10.1, T16.1, T16.2, T06.3 at both levels: no record says that the chip was a guess or that it has no tooltip; the click opens Permissions with the row selected; axe clean.
- **Severity.** S3.
- **Findings.** TH-91.
- **Files.** `R/desktop/{TopBar.svelte,activity.ts}`.

### UX-160 After the second crash the highlighted button is Event Viewer, not Restart
- **Problem.** TH-92, T23.1b intermediate (SEQ 5, four wasted actions). `T23.1b-intermediate 001`: the box offers Restart, "Start a new chat (your text is kept in the box)", Details... and a highlighted "Show in Event Viewer"; the text ends "Show in Event Viewer shows the details." The Event Viewer showed "ACP connection closed" and "No events." until Show all was ticked (record steps 3 to 6).
- **Decision.** The highlighted (default) button of a crash box is the recovery that works: Restart. "Show in Event Viewer" becomes a plain link in the Details line and the sentence says "The details are in Event Viewer." only after the buttons. The first-crash box keeps its "Restart and send again".
- **Acceptance.** T23.1b at both levels: the highlighted button is Restart (or Restart and send again); the intermediate takes 2 or 3 actions, SEQ 6 or more. Unit test on `chatProblem.ts` (default action per kind).
- **Severity.** S3.
- **Findings.** TH-92.
- **Files.** `R/app/session/{chatProblem.ts,ErrorRow.svelte}`.

### UX-161 The manual names a button that the window does not have; the undo steps are deep in the page
- **Problem.** TH-93, T22.2 novice (SEQ 4, 12 of 16). `manuals/chat.md` lines 44, 71, 113, 118 and 247 say "the **Tasks and changes** button" and "In a chat window, click **Tasks and changes** first"; the window's button reads "Changes" or "Changes (n)" (`R/apps/chat/ChatApp.svelte` line 327; every chat shot). F1 in the chat opens "Using Chat" at the top; the revert steps ("Undo a Change of the Agent (Revert)") are in section 5, found by the intermediate through the Help search in seven actions and by the novice after two wrong sections and two requests to the assistant.
- **Decision.** (1) Rename the button in the manual to "Changes" everywhere (heading, tables, steps); step 1 of the revert steps reads "Click **Changes** at the top of the chat window". (2) Put "Undo a change of the agent" in the contents of "Using Chat" as its own line at the top level, and in the chat's welcome text ("To undo a change, open Changes and click Revert."). (3) The tooltip of the Changes button says "Changes the agent made: review, revert". The help coverage script stays green.
- **Acceptance.** T22.2 novice: 8 actions or fewer, SEQ 6 or more; `grep -n "Tasks and changes" manuals/` finds only a label that exists in the UI; `scripts/check-help-coverage.mjs` 520 of 520 or more.
- **Severity.** S3.
- **Findings.** TH-93, `SYNTHESIS.md` 2.4.
- **Files.** `manuals/chat.md`, `R/apps/chat/ChatApp.svelte` (tooltip only).

### UX-162 A failed Send leaves a second "You" bubble; Connected does not mean the next Send works
- **Problem.** TH-94, T23.2 intermediate (SEQ 5). `T23.2-intermediate 003`: Reconnect shows "Connected", the next Send fails again, and the transcript shows the same message twice ("You / Please list the files in my project" twice) above "Could not send." with "Send again". It stays twice after the reply (record shot 005). Whether the scripted `flaky` agent drops the first send after each connect is not documented (H-95).
- **Decision.** A message whose send failed is shown once: the failed bubble is marked "Not sent" and is replaced by the sent one when "Send again" succeeds. Reconnect keeps the text in the box and the box says "Press Send to try again" until a send works.
- **Acceptance.** T23.2 at both levels: one bubble per message after the retry; no record says it is unclear whether the message was sent. Unit test in `SessionService` or the transcript model.
- **Severity.** S4.
- **Findings.** TH-94.
- **Files.** `R/app/session/UserMessage.svelte`, `M/application/{SessionRuntime,SessionService}.ts`. Depends on H-95.

---

## WP-B Shell: Chats and Task Manager, launcher, Help

### UX-163 The Chats icon opens Task Manager; a closed running chat cannot be reopened from it
- **Problem.** TH-95, six runs (T04.2 N and I SEQ 5 and 5, T13.1 N and I SEQ 4 and 3, T20.2 N SEQ 4). R5 UX-146 gave the toast a button but not a destination: `T13.1-novice 002` the toast says "Open it again from Chats on the desktop" and "Open Task Manager"; `T13.1-novice 003` the Chats icon opens Task Manager on its Processes tab; the Chats tab lists the chat with only an End Task button (`T04.2-novice 002`) and a double-click only selects; the right-hand "Chat" opens a quick pane whose text says it ends with its window (`T13.1-novice 006`). The way back is Start, "Recent chats" (`T13.1-novice 008`) or File, "Switch to chat" (T04.2 novice). T13.1 intermediate never reached the original chat. In T20.2 the novice found "End process" only because the Chats icon opened Task Manager; nothing near the chat's Stop says that the program is ended there.
- **Decision.** (1) A double-click, Enter or a button "Open chat" on a row of the Chats tab opens that chat's window (same session) and brings it to the front. (2) The Chats icon opens Task Manager on the Chats tab, not the Processes tab, when chats exist; the toast's button does the same and names the row ("start the long job is still working"). (3) The side "Chat" pane is not offered on the Chats tab. (4) The stop notice under the chat's Stop button gets one line: "To end the agent program, use Task Manager, Processes." with a link. (5) Task Manager's Chats tab shows the progress text of a working chat if it has one (the "N of 30" line) so the user can see where it is.
- **Acceptance.** T04.2, T13.1 and T20.2 at both levels: the original chat opens from Task Manager in 3 actions or fewer (T04.2: same session id, the 3 messages); no record says that the Chats icon opened the wrong thing; T13.1 SEQ 5 or more at both levels; T20.2 novice 8 actions or fewer.
- **Severity.** S3.
- **Findings.** TH-95, `SYNTHESIS.md` 2.4.
- **Files.** `R/apps/agent-manager/*`, `R/desktop/{closeChat.ts,shellHints.ts,DesktopController.svelte.ts}`, `R/apps/registry.ts`, `R/app/session/StopNotice.svelte` (one line), `manuals/agent-manager.md`. Rerun depends on H-91.

### UX-164 The launcher stays in front after Create; nothing says what to do next
- **Problem.** TH-96, three runs (T01.1 N and I, shots 003; T13.2 I after Connect). R5 UX-147 is not fixed: `T01.1-novice 003` and `T01.1-intermediate 003` are the same shot: the maximized launcher with "New desktop Connected", "No projects plugged in", Show desktop; the desktop is behind. On the new desktop the top bar says "Agent can use nothing yet. Open an app to give it a tool." (`T01.1-novice 004`) and nothing names Computer or Plug in a project. The New desktop dialog does not say that a project is optional (T01.1 novice, record). T01.1 passed at action 2 and then ended at its budget in both sessions.
- **Decision.** (1) After Create and after Connect the launcher is minimized and the desktop is in front (one code path for Create, Open and Connect). (2) A desktop with no project shows a first-run balloon: "Plug in a project to let the agent work on it: open Computer, then Plug in a project." with a button that opens Computer. (3) The New desktop dialog says under the project list: "You can add projects later."
- **Acceptance.** T01.1, T02.1, T13.2 at both levels: the first shot after Create or Connect shows the desktop; T01.1 novice does not need F1; the balloon names Computer.
- **Severity.** S3.
- **Findings.** TH-96, `SYNTHESIS.md` 2.4.
- **Files.** `R/launcher/*`, `R/pages/{LauncherPage,DesktopPage}.svelte`, `R/desktop/DesktopSurface.svelte` (balloon), `M/application/desktop/DesktopService.ts`, `manuals/{launcher,desktop}.md`. Rerun depends on H-92.

### UX-165 Help: F1 on the new desktop opens the Keyboard topic; the window is narrow with the search box at the edge
- **Problem.** TH-97, five runs. `T01.1-novice 004`: F1 on the new desktop opens "Keyboard: Use Agent7 Without a Mouse" (the contents list has "Using the Desktop" second). `T31.2-novice 005`: the window is inside the screen (R5 UX-148 partly fixed) but about 470 px wide at the right edge, the search box runs to x 1270 of 1280, the topic column is about 200 px. T31.1 novice: the "Saving a file" heading sat at the bottom edge of the visible text; T22.1 and T22.2 intermediate: the window covers part of the app it explains.
- **Decision.** (1) F1 with the desktop focused opens "Using the Desktop" (or "Using Desktop Connection" in the launcher), never the Keyboard topic. (2) The Help window opens at 760 x 520 or the work area minus 40 px, centred, not narrower than 640 px; the search box has a margin of 8 px inside the window. (3) A topic opened by F1 or a Help menu item scrolls to its first heading with 8 px above it.
- **Acceptance.** T01.1, T22.1, T22.2, T31.1, T31.2: the whole window and the search box are in the shot; the F1 topic of the desktop is "Using the Desktop"; no record says text is cut at the bottom edge.
- **Severity.** S3.
- **Findings.** TH-97.
- **Files.** `R/apps/help/*`, `R/desktop/shellKeys.ts`, `M/application/desktop/DesktopService.ts` (placement only), `manuals/help.md`.

### UX-166 Windows open over the desktop icons they were started from
- **Problem.** TH-98, T20.2 N, T12.2 N. The chat window opens over the Control Center icon; a double-click on a covered icon does nothing and the panelist did not know why (record step 1). In T12.2 the chat was behind the Computer window.
- **Decision.** New app windows are placed so that they do not cover the icon column (left 100 px of the work area) and a chat opened by an agent event opens in front.
- **Acceptance.** T20.2, T12.2 at both levels: no record says that an icon was covered.
- **Severity.** S4.
- **Findings.** TH-98.
- **Files.** `R/desktop/DesktopController.svelte.ts` (placement only, coordinate with UX-163), `R/desktop/geometry.ts`.

---

## WP-C Code, Changes, Review

### UX-167 Cut text and silent greys in Changes and Review
- **Problem.** TH-99, eight runs. "Reverted. Restore fr..." is cut in the Status column (`T08.1-novice 005`); the long file name is cut ("redir... t.test.ts", `T08.2-novice 002`); the Review status bar is cut ("0 open, 0 resolved, 2 s...", `T26.1-novice 007`) and "2 files changed. Showing 1 (the one you opened)." confused a novice again (T25.1 N); the comment texts in the panel are cut ("Is...", "breaks...", T25.2 N); "Add comment" and "Remove from desktop" are greyed with no reason (T12.1 N); the right-edge Chat tab has no hint of its key (T27.1 N). R5 UX-151, UX-153 and UX-155 residuals.
- **Decision.** The Status column wraps or shows "Reverted" with the full text in a tooltip and the notice above the list; file names use a middle ellipsis; the Review status bar drops the lowest-priority field instead of cutting; the comments panel wraps; every disabled control in these views has a tooltip with the reason ("Select a line first", "Select a project first"); the Chat tab's tooltip says "Chat (Ctrl+J)".
- **Acceptance.** T08.1, T08.2, T12.1, T25.1, T25.2, T26.1: no record names cut text or a grey button without a reason.
- **Severity.** S4.
- **Findings.** TH-99.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/apps/code-review/*`, `R/apps/code/*` (Management menu), `R/apps/shared/ChatStrip.svelte`.

### UX-168 Git and Code: a single click only selects
- **Problem.** TH-100, three runs. A single click on a changed file in Git or in the tree only selects it (T24.2 N record); a click opens the Review window "without warning" (T24.1 N); both T24.1 panelists needed a double-click. R5 UX-152 fixed the Changes text only.
- **Decision.** A single click on a row of the Git list shows its diff in the pane below (no window); a double-click opens Review as now and the status line says "Opening Review...".
- **Acceptance.** T24.1, T24.2 at both levels: the diff shows after one click; no record is surprised by a new window.
- **Severity.** S4.
- **Findings.** TH-100.
- **Files.** `R/apps/code/{CodeApp.svelte,DockPane.svelte,gitModel.ts}`.

### UX-169 No Restore where a user looks
- **Problem.** TH-101, T09.1 I (SEQ 5, 8 of 12). Edit has only Copy and Select All; a right-click on the changed file in the Changes list offers Copy message, Copy code and Quote in reply (record steps 1 and 3). The route is Changes, "Open Recycle Bin", Restore this item.
- **Decision.** The right-click menu of a reverted row offers "Restore from the Recycle Bin"; of a changed row "Revert"; the Edit menu of the chat has "Undo revert" while the last action was a revert.
- **Acceptance.** T09.1 intermediate: SEQ 6 or more, no dead end.
- **Severity.** S4.
- **Findings.** TH-101.
- **Files.** `R/app/shell/ChangesPane.svelte`, `R/apps/code/*`.

---

## WP-D Browser and Event Viewer

### UX-170 Raw tool ids in the status text; the step list says "Type on the page"
- **Problem.** TH-102, two runs plus R5 UX-157 not fixed. `T28.1-intermediate 005`: the top bar says "Working: agent7.browser_type" and the chat row "Working... agent7.browser_type"; `T28.1-novice 007`: the list reads "Find something on the page", "Type on the page", "Wait for the page", "Click on the page" with no target ("The list does not show exactly where the typed text went", T28.1 N). The live bar names the step ("Typing into the search messages box") but the chat and the top bar do not.
- **Decision.** The status text and the chat row use the same plain sentence as the live bar ("Typing into the search messages box", "Reading the page"); the step list carries the target and the text ("Typed 'Standup' in the search messages box", "Clicked the button 'Send'"); no tool id is ever shown outside Details.
- **Acceptance.** T28.1 at both levels: no record contains "agent7.browser_"; the step list names the target and the typed text.
- **Severity.** S3.
- **Findings.** TH-102, `SYNTHESIS.md` 2.6.
- **Files.** `R/app/session/{browserSteps.ts,toolTitles.ts}`, `M/application/tools/{browserLabels,browserTools}.ts`.

### UX-171 Event Viewer hides the cause; the Activity gadget says nothing happened
- **Problem.** TH-103, three runs. `T20.1-novice 001`: the Activity gadget says "Nothing has happened yet." beside a chat that says "I could not read README.md: Drive E: is not plugged in on this desktop."; the novice needed eight actions (budget 20, SEQ 5). Event Viewer shows "Number of events: 1, 27 more with Show all" and the ACP list says "No events." until Show all is ticked (T20.1 N, T23.1b I steps 3 to 6); the Details JSON is cut at the box edge. The Event Viewer link is the way out of the second-crash box (UX-160) but does not explain it.
- **Decision.** The Activity gadget shows the last warning or error ("Drive E: was removed") with the Event Viewer link; Event Viewer opens on warnings and errors first, with the count of hidden entries as a link; "No events." is replaced by "Nothing to show with this filter. Show all (27)"; the Details box wraps.
- **Acceptance.** T20.1 at both levels: 2 or 3 actions; T23.1b: the Event Viewer shows the closing reason in the first view.
- **Severity.** S3.
- **Findings.** TH-103.
- **Files.** `R/apps/event-viewer/*`, `R/desktop/Gadgets.svelte` (the Activity gadget; WP-D edits only that block), `manuals/event-viewer.md`.

### UX-172 Page bar sentence cut, "Take over" unexplained, hidden first sentence in the sent question
- **Problem.** TH-104, four runs. `T28.2-novice 002`: "You have control of this page. The agent stops and asks before it uses the p..." is cut; T28.1 N does not understand "Take over" and "agent7.browser_read"; the chat pane covers half the page (T19.1 N, T19.1 I, `T19.1-novice 009`); the question sent from "Ask about this page" has a first sentence that was not in the box ("I have a question about the page "Fixture page" at http://127.0.0.1:43015/.", `T19.1-novice 009`).
- **Decision.** The page bar wraps to two lines; "Take over" has a tooltip ("Stop the agent and use the page yourself"); the box shows the whole text that will be sent.
- **Acceptance.** T28.2, T28.1, T19.1: no record names a cut sentence or a hidden text.
- **Severity.** S4.
- **Findings.** TH-104.
- **Files.** `R/apps/browser/*`.

---

## Harness

Not product work; owner: facilitator. Details and evidence in `panel/r6/SYNTHESIS.md` section 5. R5 harness items: H-77, H-78, H-79, H-80, H-81, H-83, H-86 fixed; H-82 and H-85 not fixed (H-82 continues as H-90); H-84 not exercised.

| id | Where | Fix |
|---|---|---|
| H-87 | `checks/features.mjs` T27.2 | Fixed after the panel (Focus bar Chat and Show panes are not panes); verify on the rerun; unit test. |
| H-88 | `checks/chat.mjs` T06.1 | Accept "3 added", "3 removed", "+3 / -3" in any spelling; reject ranges and "could not tell"; unit test with the R6 answer; decide whether the lines are required. |
| H-89 | `checks/desktop.mjs` T17.2 | Match "set ... as default" with up to three words between; accept "default" with "agent". |
| H-90 | `session.mjs check` and `stop` | Refuse a verdict for an answer task without `--answer` and a record without an Answer line (H-82 again; T10.1 novice). |
| H-91 | `checks/chat.mjs` T13.1, `tasks.md` | Require a window of the original chat (same session id) after the close, or make the verdict MANUAL; T13.1 intermediate passed without it. |
| H-92 | `tasks.md` T01.1, `check.json` | Write `stepsToPass` and use it for the budget and the weak rule, or end the scenario where the check holds. |
| H-93 | `PANELIST.md`, `session.mjs stop` | One plain heading "Steps (the numbered step list of the final report)"; `rerun` and `finishedByFacilitator` flags in `check.json`. |
| H-94 | `session.json`, record header | Record `build: {packaged, version, commit}`; do not count a round for the gate without `packaged: true`. |
| H-95 | scripted agent `flaky` (T23.2), `tasks.md` | Document what the script does after Reconnect; if it fails once per connection, say so in the start state. |

## Coverage of findings

| Theme | Item |
|---|---|
| TH-87 Deny has the focus | UX-139 fixed; decision keep Deny |
| TH-89 words | R4 UX-133 to UX-135, still open |
| TH-90 diff viewport | UX-158 |
| TH-91 chips | UX-159 |
| TH-92 second crash default | UX-160 |
| TH-93 manual and button | UX-161 |
| TH-94 failed send | UX-162 |
| TH-95 Chats icon and Task Manager | UX-163 |
| TH-96 launcher in front, no next step | UX-164 |
| TH-97 Help window and F1 | UX-165 |
| TH-98 windows over icons | UX-166 |
| TH-99 cut text, silent greys | UX-167 |
| TH-100 Git single click | UX-168 |
| TH-101 no Restore where looked | UX-169 |
| TH-102 raw ids, step list | UX-170 |
| TH-103 Event Viewer | UX-171 |
| TH-104 page bar, Take over, hidden text | UX-172 |
| T06.1 intermediate failure | UX-158, H-88 |
| T13.1, T04.2, T20.2 weak rows | UX-163 (H-91) |
| T01.1 weak rows | UX-164, UX-165 (H-92) |
| T22.2 weak row | UX-161, UX-165 |

## Rerun plan

1. WP-A first (UX-158 is the failed task), then WP-B, WP-C and WP-D in parallel; harness H-88 to H-95 in parallel; H-91 before the T13.1 rerun, H-94 before any round that is meant to count for the gate.
2. Rerun with fresh panelists (one per task, as in R6): T06.1 at both levels, T01.1, T04.2, T13.1, T20.2 at both levels (UX-163, UX-164), T22.2 and T31.2 at both levels (UX-161, UX-165), T23.1b, T23.2 (UX-160, UX-162), T20.1 (UX-171), T28.1 (UX-170), and every task of J05, J06, J07, J13 (approval box), J10 and J16 (chips).
3. Full pass on the packaged build for the release gate: all 60 tasks at both levels, every task passes, no task below 5, median 6 or more, no open S2 or S3, no record with a sentence named in an acceptance line.
4. Outside the panel: axe scan (28 states, with the 24 px chip), manual checklist and screen reader pass (D5); `perf.mjs` on the reference machine and a 30-minute soak (D10, UX-84). The UX lead accepts or rejects each open S4 in `findings.md`.
