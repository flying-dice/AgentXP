# Agent7 UX Scorecard (round 2)

Status: phase 2 re-score by a fresh reviewer (the researcher who wrote `panel/r2/SYNTHESIS.md`; not the author of the round 1 baseline and not a fixer). Scores are from the round 2 panel evidence (novice, intermediate; the expert tier was dropped by the product owner), the axe scan and the driven runs of the current build listed below. The round 1 score of every cell is kept in brackets: `7 (6)` means 7 now, 6 in round 1. A cell without brackets did not change.

Cell format: the score from 1 to 10, or `n/a` (reason below the table). Dimensions: D1 Usability, D2 Learnability, D3 Efficiency, D4 Error prevention and recovery, D5 Accessibility, D6 Visual consistency, D7 Trust and transparency, D8 Content and copy, D9 Feedback and state, D10 Performance perception, D11 Documentation. Findings are in `findings.md`; the new problems of this round are the themes TH-18 to TH-31 of `panel/r2/SYNTHESIS.md` and the items UX-51 to UX-85 of `FIX-BACKLOG-R2.md`.

**Result: 0 of 31 journeys at 10/10.** No journey has all 11 cells at 10, and none could: D10 is capped at 8 everywhere (nothing is measured), D5 is capped at 8 (no manual checklist) and 7 wherever the axe scan reports `target-size` on window caption buttons, and the panel found at least one open S2 or S3 problem in every journey.

**How the scores were set.**
- Evidence used: the 85 round 2 records (59 novice, 26 intermediate) plus 33 carried intermediate rows, `panel/r2/SYNTHESIS.md` decisions, the axe 4.14 scan of the current build (`scripts/ux-panel/axe-scan.mjs`, 27 states, run for this scorecard), `scripts/check-help-coverage.mjs` (467 of 467 ids documented), and four driven runs of the built app (`out/`, one instance at a time): T21.1 keys (reproduced the checker defect H-23), T28.2 (Take over click and the vanishing bar), T09.1 (the Changes list after a revert), T01.1 (F1 in the launcher).
- The cap rule of `rubric.md` applies. A failure by the novice or the intermediate panelist is at least S2 (cap 6) for D1, D2 and the dimension of the cause. A task that passed only after dead ends or at 80 percent or more of its budget is scored 7 or lower on D1 and D3.
- "Not compared with the reference at native size" (D6) and "not walked" mean the cell has no new evidence; those cells were not raised above the round 1 value when the round 2 panel gave no reason to.
- A score marked 5 or lower on D1 means fewer than half of the runs of that journey (both levels, all its tasks) passed without help or detour.

**Global notes (each applies to every journey; the cell line says which).**
- D10 8: no timing was recorded in any round 2 run. The harness logs the screenshot time (about 700 ms per action), which is not a measure of the app. A reference-machine measurement is needed for 9 or 10 (backlog UX-84).
- D5 7: axe reports `target-size` (serious) for the inactive caption buttons (29x19 px) on every desktop window, plus per-app items: WordPad `label-content-name-mismatch` (Numbered list), Browser `aria-required-children` (critical, tab strip) and 16x16 px tab close, Paint `target-size` (24 nodes) and `scrollable-region-focusable`, Sticky Notes `aria-required-children` (critical), Help links 15 px high, Start menu `aria-required-parent` (critical), Code Review and Code chat pane `target-size`. The UAC dialog scan failed (the dialog did not open in the scan; harness item H-45). Launcher states, Explorer, Notepad, Code, Terminal, Event Viewer, Snipping Tool, Recycle Bin, Task Manager, Control Center, Chat and the Action Center flyout are clean apart from the caption buttons. Fixed since round 1: the launcher list (F-026), Start menu arrow (F-028).
- D11 8: manuals exist for every app and the coverage script is green; no procedure was run word for word by a fresh reviewer (rubric D11 (f), (g)). Journeys where the panel hit a Help defect are 7 or lower.
- D1 gate: no journey with a failed round 2 task (J02, J03, J04, J11, J12, J19, J27, J28) is above 6 on D1; none of them has a 10 on D2 either.

## Scorecard

| Journey | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | At 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8 | 7 (6) | 9 | n/a | 8 (6) | 9 | n/a | 8 (7) | 8 | 8 | 8 (6) | 0 of 11 |
| J02 Create a desktop | 4 (8) | 5 (8) | 7 (8) | 6 (8) | 8 (6) | 9 | n/a | 6 (8) | 7 (8) | 8 | 7 | 0 of 11 |
| J03 Plug in a project | 6 (8) | 6 (8) | 8 | 8 | 7 (6) | 9 | 8 | 6 (8) | 6 (8) | 8 | 8 | 0 of 11 |
| J04 Start a chat | 6 (8) | 6 (7) | 8 | 8 (9) | 7 (6) | 9 | 8 | 7 (6) | 8 | 8 | 8 | 0 of 11 |
| J05 Send a prompt and follow progress | 8 (6) | 8 | 9 (8) | 8 | 7 (6) | 9 | 8 (7) | 8 (6) | 8 (6) | 8 | 8 | 0 of 11 |
| J06 Approve or deny a request (chat and UAC dialog) | 9 (8) | 8 | 9 (8) | 8 (7) | 7 | 9 | 8 (7) | 8 (9) | 9 (8) | 8 | 8 | 0 of 11 |
| J07 Approve from the Action Center | 8 | 7 | 8 | 8 | 7 | 9 | 8 | 8 | 7 (8) | 8 | 8 | 0 of 11 |
| J08 Review and revert changes (Chat, Code) | 8 (7) | 7 | 8 (7) | 8 | 7 (6) | 8 | 8 | 7 | 7 (8) | 8 | 8 | 0 of 11 |
| J09 Restore from the Recycle Bin | 7 (8) | 6 (8) | 7 (8) | 8 | 7 (6) | 9 | 8 | 7 (8) | 6 (9) | 8 | 8 | 0 of 11 |
| J10 Tools follow apps | 8 | 7 (8) | 8 (9) | n/a | 7 | 9 | 6 (9) | 7 | 8 (9) | 8 | 8 | 0 of 11 |
| J11 Pause and take control | 6 (8) | 7 (8) | 9 | 7 (8) | 7 (8) | 9 | 7 (8) | 7 (8) | 6 (7) | 8 | 8 | 0 of 11 |
| J12 Eject a drive | 5 (8) | 6 (7) | 7 (8) | 5 (8) | 7 (6) | 9 | 8 | 6 (7) | 6 (8) | 8 | 6 (8) | 0 of 11 |
| J13 Disconnect and reconnect while the agent runs | 8 | 7 (8) | 8 | 8 | 7 | 8 (9) | 8 | 7 (8) | 7 (8) | 8 | 8 | 0 of 11 |
| J14 Manage several desktops | 9 (8) | 8 | 9 (8) | 8 | 8 (6) | 9 | n/a | 8 | 6 (8) | 8 | 8 (7) | 0 of 11 |
| J15 Delete a desktop | 9 (8) | 8 | 9 (8) | 8 | 8 (6) | 9 | n/a | 8 | 8 | 8 | 8 (7) | 0 of 11 |
| J16 Choose permissions (Control Center) | 8 | 7 | 8 | 8 | 8 | 9 | 8 | 7 | 8 | 8 | 8 | 0 of 11 |
| J17 Add and choose agents | 7 (8) | 7 (8) | 8 | 6 (8) | 8 | 9 | 8 | 7 | 7 | 8 | 8 | 0 of 11 |
| J18 A2UI surfaces: inline, sidebar, window | 7 | 7 | 8 | 8 | 7 | 8 | 8 (7) | 7 (8) | 6 (8) | 8 | 8 | 0 of 11 |
| J19 Browse with the Browser | 5 (7) | 6 (8) | 8 | 6 | 7 (6) | 9 | 6 (7) | 6 (8) | 7 (5) | 8 | 7 (8) | 0 of 11 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 8 | 6 | 8 | 8 | 7 (6) | 9 | 8 | 6 | 8 | 8 | 8 | 0 of 11 |
| J21 Keyboard-only operation | 7 (6) | 6 (7) | 6 (7) | 8 | 6 | 9 | n/a | 8 | 7 (8) | 8 | 7 | 0 of 11 |
| J22 First-time help and discoverability | 7 | 6 | 8 | n/a | 7 (8) | 9 | n/a | 6 (5) | 6 (8) | 8 | 6 | 0 of 11 |
| J23 Recover from errors | 7 (6) | 7 | 8 | 6 | 7 | 9 | 8 | 7 | 6 | 8 | 8 | 0 of 11 |
| J24 Read code, git status and the gutter | 7 | 7 | 8 (7) | 8 | 7 (6) | 8 | 8 | 7 | 8 | 8 | 8 | 0 of 11 |
| J25 Review the agent's changes in Code Review | 9 (6) | 8 (7) | 9 (8) | 9 | 7 (6) | 8 (6) | 8 (7) | 7 (6) | 8 (7) | 8 | 8 | 0 of 11 |
| J26 Send review comments to a chat, and comment yourself | 7 (6) | 5 (7) | 6 (8) | 8 | 7 | 8 (6) | 8 | 7 | 8 (7) | 8 | 7 (8) | 0 of 11 |
| J27 Ask the chat pane about what you are looking at | 5 (8) | 6 | 8 | 9 | 7 (6) | 6 (7) | 7 | 7 | 6 (7) | 8 | 8 | 0 of 11 |
| J28 Let the agent use a web app in the Browser | 6 (7) | 6 (7) | 8 | 7 | 7 | 8 | 5 (6) | 5 | 5 (6) | 8 | 8 | 0 of 11 |
| J29 Browse with tabs and recover from a bad page | 7 (6) | 8 | 8 | 7 (6) | 7 (6) | 9 | 7 | 6 (8) | 7 (5) | 8 | 7 (8) | 0 of 11 |
| J30 Use menus, right-click and About in any app | 9 (8) | 8 (7) | 9 (8) | 9 | 7 | 8 (7) | 8 | 7 (6) | 8 | 8 | 8 | 0 of 11 |
| J31 Get help from inside an app (Help menu and F1) | 9 (8) | 7 (8) | 9 | n/a | 7 (8) | 9 | n/a | 7 (5) | 7 (8) | 8 | 7 (6) | 0 of 11 |

`n/a` reasons: D4 is n/a where the journey has no destructive action or error branch (J01, J10, J22, J31). D7 is n/a where the agent does nothing in the journey (J01, J02, J14, J15, J21, J22, J31).

## Round 1 to round 2 movement

Of the cells that have a number in both rounds, 65 are higher, 74 are lower and 191 are equal. The round 1 sheet was an expert estimate with many "not walked" cells (the `*` journeys), so the lower cells are mostly estimates replaced by evidence: the panel now shows the problem. The higher cells are the round 1 fixes that held: the launcher definition and F1 (J01, F1 seen in this round), the Browser error page instead of a blank page (J19, J29), chips that open the right Control Center page (J10, J16), Code Review showing its comments at default size (J25), the Terminal and Help status texts (J31), and the Ask before every action control (J11).

| Journey group | Round 1 to round 2 |
|---|---|
| Getting set up (J01 to J04, J12) | Lower: the in-app Browse For Folder dialog cannot find a project folder (TH-18), and Recently removed never appears (TH-19). |
| Working with the agent (J05 to J11, J13) | Mixed: approvals and Stop are clear now; Resume, chips and Changes refresh are not (TH-20, TH-25, TH-27). |
| Desktops and agents (J14 to J17) | Equal or higher: launcher rows, rename, delete and permissions pass for both levels. |
| Web, errors and help (J18 to J24, J29) | Lower where the panel ran (windows behind the chat, error advice, Help search, restart loops). |
| New features (J25 to J31) | J25, J30, J31 are the best journeys (0 to 4 actions, SEQ 6 to 7); J26, J27, J28 hide their main control (TH-21, TH-22, TH-20). |

## Reasons for every score below 10

One line per dimension. The global notes above explain D10, D5 and D11 lines that quote them.

**J01 First launch and empty launcher**
- D1 8: T01.1 novice found New... in 1 step but the screen does not answer "what can I do first"
- D2 7: novice: "desktop" and "agent" still not explained after the definition line
- D3 9: one click to the dialog; not timed against a reference
- D5 8: axe scan clean for this journey's screens; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: not compared with the reference at native size
- D8 8: empty text defines desktop, not agent or what to do next
- D9 8: loading text only seen as "Loading..."; no error state
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: F1 opens "Using Desktop Connection" (seen); coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J02 Create a desktop**
- D1 4: T02.1 and T02.2 failed for the novice (19/18 steps, gave up); Browse For Folder cannot find the project, typed names refused
- D2 5: novice: "Home" looks empty and "project folder" gives no place to look
- D3 7: folder tree walk of 10 to 19 actions against Min 6
- D4 6: duplicate-name message shows before Create (good) but "(2)" breaks the task and "not a full folder path" names no next step
- D5 8: axe scan clean for this journey's screens; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: not compared with the reference at native size
- D8 6: "not a full folder path", "cannot be opened... permission" are system texts with no next step
- D9 7: "Opening the folder list..." exists; empty Home and refused typing give no hint
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 7: F1 opened Help behind the New desktop dialog (T02.2 novice); coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J03 Plug in a project**
- D1 6: T03.1 novice failed: took the tree view as "open" and chose "Take no action" in AutoPlay
- D2 6: "Plug in a project..." and AutoPlay are two steps with USB wording; novice unsure what Explorer would show
- D3 8: 3 actions against Min 5 for the intermediate; AutoPlay adds one
- D4 8: already-plugged-in message box exists; not walked in R2
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: drive appears at once in the tree; what the agent can now see is not stated
- D8 6: AutoPlay text "Explorer", "Agent7" does not say what each choice shows
- D9 6: AutoPlay opens after the folder is already in the tree, so state is unclear (both levels)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J04 Start a chat**
- D1 6: T04.1 novice failed: took the Chat pane for the conversation (1 step, stopped)
- D2 6: two creation paths; Chat pane says "Ready" without the folder; right-click "Start a chat here" has no visible hint
- D3 8: 2 actions for the intermediate
- D4 8: not walked in R2
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: status bar shows "login-app (E:)"; Chat pane does not
- D8 7: "Chat pane", "conversation" and the Chats icon mean different things
- D9 8: reopened chat shows "Reopened ... Your earlier messages are kept." (T04.2); Chats icon double-click gives no list
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J05 Send a prompt and follow progress**
- D1 8: T05.1 passed 4/9, SEQ 5; novice did not know before sending that a file would change
- D2 8: permission box shows code the novice cannot judge
- D3 9: type, Enter, Allow: at the minimum plus one
- D4 8: Stop works (T05.2); not stress tested
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: novice: not told in advance that a write needs approval
- D8 8: reply "Done. I changed src/auth/redirect.ts..." is plain; tool text not audited
- D9 8: permission, then Done; long-turn scroll not walked in R2
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J06 Approve or deny a request (chat and UAC dialog)**
- D1 9: T06.1 and T06.2 passed in 1 step at SEQ 5 to 6
- D2 8: novice could not read the diff; "This replaces the whole file" worried them
- D3 9: one click on the right button
- D4 8: "This replaces the whole file" does not show what is lost; Deny stays default
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: the box names the file and lines added; removed lines for a replaced file not shown
- D8 8: plain text; the changed lines were not named by the novice
- D9 9: declined message "The user declined" confirms the result
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J07 Approve from the Action Center**
- D1 8: T07.1 novice passed 2/15 but answered the same request twice
- D2 7: two chat windows with the same request look like two chats
- D3 8: 2 actions for the novice
- D4 8: not walked in R2
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: top bar says only "Working" while a request waits
- D8 8: not audited in R2
- D9 7: waiting state only in the window status text (T07.1 novice)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J08 Review and revert changes (Chat, Code)**
- D1 8: T08.1 and T08.2 passed (novice SEQ 5); novice answered T08.2 from the first row only
- D2 7: "Reverted (in the Recycle Bin)" was a surprise (T08.1 novice)
- D3 8: 4 actions against Min 5 (T08.1)
- D4 8: revert asks first and names the Recycle Bin (T08.1 shot 008)
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 8: Changes list too narrow, maximize needed (T08.2 novice)
- D7 8: revert result shown in the list in the same window
- D8 7: names cut ("redirect" without extension) and counts column off screen (T08.2)
- D9 7: Changes list stays stale after a revert done elsewhere (T09.1 start state)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J09 Restore from the Recycle Bin**
- D1 7: T09.1 novice passed 7/12 at SEQ 4 by remembering the revert box
- D2 6: no Undo in Edit; chat gives no link to the Recycle Bin (T09.1 novice)
- D3 7: 7 actions against Min 4
- D4 8: restore works with a status message
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: restore result is visible; chat is not told
- D8 7: the way back is named only in the revert box
- D9 6: "Changes (2)" still lists the reverted file (T09.1 start state, my run)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J10 Tools follow apps**
- D1 8: T10.1 and T10.2 passed (4/8, 0/3)
- D2 7: novice and intermediate: chip words ("asks", "off") differ from the Permissions row "Terminal (run commands)"
- D3 8: 4 actions against Min 1 by the chip route (budget 8)
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 6: chip "Read files (off)" while the row says Allow: two screens disagree (T10.1 intermediate)
- D8 7: "Run commands (asks)", "Browser" with no suffix, "(off)" mixed
- D9 8: "Not applied yet" and "Saved. New requests use these settings." are clear
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J11 Pause and take control**
- D1 6: T11.3 novice failed: Resume agents returned to Idle and nothing continued
- D2 7: chat Stop vs Pause all agents are not explained until after use (T11.1 novice)
- D3 9: 1 action for T11.1 and T11.2
- D4 7: a stopped step stays stopped and the note depends on renderer memory
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 7: Ask before every action covers only enabled groups; "off" vs "asks" labels (T11.2)
- D8 7: "Resume agents" does not say that the job will not restart
- D9 6: no feedback after Resume: bar says Idle, chat unchanged (T11.3 novice)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J12 Eject a drive**
- D1 5: T12.1 passed (2/6) but T12.2 failed for both levels
- D2 6: "Eject" is a hardware word (T12.1 novice); T12.2: no way to see the removed project
- D3 7: T12.2 took 7 to 14 actions without reaching the goal
- D4 5: no "Recently removed" list, "Plug in again" always greyed (T12.2 both levels)
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: toast says files on disk were not changed
- D8 6: "plug the project in" with no how-to; picker cannot find the folder
- D9 6: "Plug in again" is disabled with no reason (T12.2)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 6: Help describes "Recently removed" that never appears (T12.2 intermediate)

**J13 Disconnect and reconnect while the agent runs**
- D1 8: T13.1 and T13.2 passed (SEQ 6)
- D2 7: "Close" does not say that the job keeps running (T13.1 novice)
- D3 8: 3 and 2 actions
- D4 8: not walked in R2
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 8: chat title buttons hidden behind the top bar (T13.1 novice)
- D7 8: bar keeps saying Working after close
- D8 7: close and disconnect wording not audited; File > Close is the only route
- D9 7: no note that closing keeps the job running
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J14 Manage several desktops**
- D1 9: T14.1 and T14.2 passed (SEQ 6 and 7)
- D2 8: novice: three rows only say "Idle"
- D3 9: preselected rows keep it at 2 and 3 actions
- D4 8: Delete next to Connect; not walked here
- D5 8: axe scan clean for this journey's screens; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: not compared with the reference at native size
- D8 8: not audited in R2
- D9 6: the broken-agent desktop row still reads Idle (T14.1 novice list)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J15 Delete a desktop**
- D1 9: T15.1 passed (2/9, SEQ 6)
- D2 8: novice: "C: drive" of a desktop is not explained
- D3 9: 2 actions
- D4 8: Delete button sits beside Connect; confirm text is clear
- D5 8: axe scan clean for this journey's screens; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: not compared with the reference at native size
- D8 8: "C: drive" jargon in the delete text
- D9 8: row disappears; no balloon
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J16 Choose permissions (Control Center)**
- D1 8: T16.1 and T16.2 passed; T16.2 needed the page header because the covers column is cut off
- D2 7: chip does not look clickable; "Write files" vs "Terminal (run commands)"
- D3 8: 4 to 7 actions against Min 5
- D4 8: Apply flow shows "Saved"; no set-all check
- D5 8: axe scan clean for this journey's screens; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: not compared with the reference at native size
- D7 8: chips now open the right page; states differ by wording
- D8 7: "What it covers" column cut off at default size (T16.2 novice)
- D9 8: "Not applied yet" and "Saved" shown
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J17 Add and choose agents**
- D1 7: T17.1 passed; T17.2 novice passed at the limit (9/9, SEQ 3)
- D2 7: Name field optional but unclear; Test button purpose unknown (T17.1 novice)
- D3 8: 7 actions against Min 8
- D4 6: chat keeps the broken agent, "Try again" fails the same way, Details did nothing (T17.2 novice)
- D5 8: axe scan clean for this journey's screens; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: not compared with the reference at native size
- D7 8: agent list does not show which agent is default
- D8 7: command column cut off ("not-a-rea...", "node my-age...")
- D9 7: dialog Open Agents helps; edit buttons greyed without a hint
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J18 A2UI surfaces: inline, sidebar, window**
- D1 7: all three T18.1 variants passed; window variant took 7/9 at SEQ 4
- D2 7: novice: where is the form? "Board" window name says nothing
- D3 8: 3 actions inline and sidebar
- D4 8: not walked in R2
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 8: window opens behind the chat
- D7 8: grey "Ann" hint reads as typed text
- D8 7: "sidebar called Notes", "Board" titles
- D9 6: Show does not raise the window, taskbar button hides it (T18.1-window); T18.2 reopens behind the chat
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J19 Browse with the Browser**
- D1 5: T19.1 novice failed; intermediate guessed from the chip
- D2 6: chip "Browser" has no suffix and no tooltip; nothing says the assistant can read the page
- D3 8: 2 to 10 actions
- D4 6: ERR_UNSAFE_PORT page says "check that your computer is online"; Refresh cannot help (T19.2 both)
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows); Browser tab strip critical aria-required-children
- D6 9: not compared with the reference at native size
- D7 6: no sign that the assistant has the page (T19.1 both)
- D8 6: technical error code, advice does not match the cause
- D9 7: error page replaces the blank page (R1 F-001 fixed) but advice is wrong
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 7: Help link opens the manual top, not the section (T19.2 intermediate)

**J20 Investigate a problem (Event Viewer, Task Manager)**
- D1 8: T20.1 and T20.2 passed (SEQ 5 each)
- D2 6: Event Viewer hidden under All Programs > System Tools; End Task vs End process look the same (T20.2 novice)
- D3 8: 6 and 5 actions against Min 5 and 4
- D4 8: End process confirms and warns about lost work
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: event details name the removed drive
- D8 6: event names ACP, AG-UI, fs/read_text_file; "Scripted long-turn" process name
- D9 8: window opens small, maximize needed (T20.1)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J21 Keyboard-only operation**
- D1 7: T21.1 completed by both levels (18 and 19 of 36) but only after finding Ctrl+Esc by trial
- D2 6: no Ctrl+N, no hint for the Start-menu route (both levels)
- D3 6: 19 actions against Min 12
- D4 8: Deny is the default focus; Allow reachable with Shift+Tab
- D5 6: F1 does not move focus into Help, Esc does not close it, Enter in Start does nothing until search (T21.1)
- D6 9: not compared with the reference at native size
- D8 8: not audited in R2
- D9 7: Allow result not confirmed on screen for the intermediate
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 7: manuals/keyboard.md exists but F1 on the desktop never reached it (T21.1)

**J22 First-time help and discoverability**
- D1 7: T22.1 novice answered from a tooltip (SEQ 2); T22.2 novice 8/12
- D2 6: novice did not know Help is the place to ask
- D3 8: 1 to 8 actions against Min 2 and 4
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows) on Help links
- D6 9: not compared with the reference at native size
- D8 6: Help text says "undo" but not the Revert button; result order puts Notepad undo first
- D9 6: clicking a search result does not open the section (T22.2 novice)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 6: Help window opens behind a dialog; no Saving or Revert steps in the text found

**J23 Recover from errors**
- D1 7: T23.1 novice passed after three sends (SEQ 4); T23.2 passed 1/9
- D2 7: "Details" and "Show in Event Viewer" not tried; Restart and send again unclear
- D3 8: 5 actions against Min 4 (T23.1)
- D4 6: same buttons each time, no cause, retry looks like it fails (T23.1 novice)
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 9: not compared with the reference at native size
- D7 8: composer keeps the message (T23.2) and "Send again" works
- D8 7: "The agent stopped unexpectedly" is plain; scripted text "Waiting... never shown" is a harness artefact
- D9 6: "New messages. Click to go to the end." covers the newest message (T23.1 shot 033); status bar shows Disconnected beside Send again
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J24 Read code, git status and the gutter**
- D1 7: T24.1 and T24.2 passed (SEQ 5 and 6)
- D2 7: "Git (3)" and "git init" unexplained (novice)
- D3 8: 4 and 1 actions
- D4 8: "Initialize Git here" changes the folder; a confirm was not seen
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 8: Code Review window opened for the wrong file (T24.1)
- D7 8: not walked in R2
- D8 7: "git init" jargon; new-line columns Old and New
- D9 8: Not a Git repository message gives the cause
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J25 Review the agent's changes in Code Review**
- D1 9: T25.1 and T25.2 passed in 0 actions (SEQ 7, 7; novice 7, 6)
- D2 8: header and verdict bar small at first look (novice)
- D3 9: answers read from the first screen
- D4 9: no destructive action in the journey
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows); Code Review target-size (3)
- D6 8: default size now shows comments; not compared with the reference
- D7 8: status bar says "2 files" but one file is shown
- D8 7: "Two comments" in the bar, "Comments (2)" on the button (mixed number formats)
- D9 8: Changes requested bar clear
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J26 Send review comments to a chat, and comment yourself**
- D1 7: T26.1 passed; T26.2 passed after five dead ends (novice 12/15)
- D2 5: adding a comment works only from the line number; send button hidden behind a small count link (both levels)
- D3 6: T26.2 novice 12 actions against Min 5
- D4 8: Send to chat dialog preselects the open chat
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows)
- D6 8: comments panel is small at default size
- D7 8: "3 open, 0 sent" status is clear
- D8 7: "Minor" preselected with no explanation; "Ask the agent to review..." misleads
- D9 8: comments marked "Sent to chat"
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 7: Help Common Tasks names the line number but the UI does not

**J27 Ask the chat pane about what you are looking at**
- D1 5: T27.2 failed for both levels: the file does not use the whole window
- D2 6: Chat strip on the right edge is small and does not say it opens a panel
- D3 8: T27.1 3 to 4 actions against Min 3
- D4 9: no destructive action
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows); Code with chat pane target-size (6)
- D6 6: editor stays in a narrow column with empty grey space after panels close (T27.2)
- D7 7: reply echoes the question (harness script), not an explanation
- D8 7: "Chat pane", ">" arrow unlabelled
- D9 6: closing panels gives no layout change (T27.2)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J28 Let the agent use a web app in the Browser**
- D1 6: T28.2 failed for both levels; T28.1 passed (SEQ 6 and 4)
- D2 6: Take over lives in a bar that disappears; novice found only Pause all agents
- D3 8: 3 to 4 actions
- D4 7: Take over click on the vanishing bar misses; nothing confirms it
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows); Browser tab strip critical aria-required-children
- D6 8: chat window hidden behind the Browser (T28.1 novice)
- D7 5: bar vanishes after 8 s with no new announce while the agent keeps reading (my T28.2 run)
- D8 5: chat reply "[10] listitem", bar "Typing into [6]", "Used 28 tools" (T28.1 both)
- D9 5: Take over gives no "taken over" state, status stays Working (T28.2 intermediate)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J29 Browse with tabs and recover from a bad page**
- D1 7: T29.1 panelists opened the tab and returned (both levels) but the second page never loaded
- D2 8: the + button is recognisable
- D3 8: 5 and 6 actions against Min 5
- D4 7: connection-refused page gives no next step (novice)
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows); Browser tab strip critical aria-required-children, close button 16x16 px
- D6 9: not compared with the reference at native size
- D7 7: tab shows the failed address; what happened to the second page is technical
- D8 6: ERR_CONNECTION_REFUSED, "The website did not answer"
- D9 7: error page shown; Refresh does not explain
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 7: Help link lands at the top of the manual

**J30 Use menus, right-click and About in any app**
- D1 9: T30.1 and T30.2 passed in 2 to 3 actions
- D2 8: "Markdown document" and "Agent7 version 0.1.0" under Notepad confuse the novice
- D3 9: 2 to 3 actions against Min 4 and 2
- D4 9: no destructive action
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows); WordPad label-content-name-mismatch
- D6 8: not compared with the reference at native size
- D7 8: not walked in R2
- D8 7: file type name and About line ambiguous
- D9 8: file opens at once
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 8: coverage script clean (467 of 467 ids); no procedure followed word for word by a fresh reviewer

**J31 Get help from inside an app (Help menu and F1)**
- D1 9: T31.1 and T31.2 passed in 2 to 4 actions
- D2 7: novice: save shortcut sits in a paragraph, not a heading
- D3 9: F1 opens the right topic in 1 action
- D5 7: axe target-size: inactive window caption buttons are 29x19 px (WCAG 2.5.8, all desktop windows) on Help links
- D6 9: not compared with the reference at native size
- D8 7: "a file that has a name and a change" unexplained; no topic for saving a new file
- D9 7: typing in the read-only Terminal gives no feedback (T31.2 novice)
- D10 8: no timings recorded; no jank seen in the R2 runs (rubric needs measured values for 9 or 10)
- D11 7: no "Saving a new file" topic; Terminal read-only only in the status bar

## Performance (UX-84)

Measured with `scripts/ux-panel/perf.mjs` (the built app through Playwright `_electron`, one instance at a time, test ids only). Raw numbers: `docs/ux/evidence/perf.json`. Command: `node scripts/ux-panel/perf.mjs --out docs/ux/evidence/perf.json` (builds, then runs under `xvfb-run` when there is no display).

**Machine (NOT the reference machine; read every number with this caveat).** Intel Xeon @ 2.10 GHz (from `/proc/cpuinfo`), 4 vCPUs, 15.7 GB RAM, Linux 6.18 container, headless `xvfb-run` at 1920x1200x24 with software rendering (no GPU), Electron 45.3.2 (Chrome 156). The Playwright driver ran on the same 4 CPUs and competes with the app during the fps runs, so fps is a lower bound. Timings of the input, window and connect steps are far under their targets; the fps verdicts need the reference machine before they are final.

**Method.** Each metric is the median of 5 runs. Load for the fps, streaming and memory rows: 6 windows (the long chat, a second chat, Explorer, Notepad, WordPad, Paint) and one chat of 2,002 transcript entries (1,001 questions and 1,001 answers, seeded into the SQLite database with the app closed, then opened; 19,281 DOM nodes). Input response: keydown `timeStamp` to the frame after the next paint (rAF plus a message task), median of 25 keystrokes per run. Window open: click `timeStamp` on the Start menu item to the first frame with the window visible. Launcher: process start to launcher list or empty state shown and New enabled, warm (the same user-data folder with a migrated database; the first start with an empty database was 755 ms). Desktop connect: the Connect click to the first painted frame of the desktop (taskbar). Scroll and drag fps: rAF frame count over 2.5 s of real mouse wheel or pointer events. Streaming: a `PerformanceObserver` for `longtask` while a 6,000-character markdown reply streams in 12-character chunks every 6 ms (about 1.7 s a turn). Agent start: Enter in the first chat message to the first of "Starting the agent...", the user message or Stop.

| Target (rubric D10) | Measured (median of 5) | Result |
|---|---|---|
| Input response under 100 ms, chat composer | 10 ms (worst run p95 19 ms) | PASS |
| Input response under 100 ms, Notepad | 11 ms | PASS |
| Input response under 100 ms, composer with 6 windows and 2,000 rows open | 11 ms | PASS |
| Window open under 200 ms (Start menu click to window visible) | Explorer 16 ms, Notepad 15 ms | PASS |
| Launcher to interactive under 1.5 s, warm | 711 ms | PASS |
| Desktop connect under 2 s | 337 ms | PASS |
| Scrolling at 60 fps, 2,000-row transcript and 6 windows | 55.2 fps (runs 48 to 58; p95 frame 33 ms, worst frame 50 ms) | FAIL (threshold 57 fps) |
| Dragging at 60 fps, 2,000-row transcript and 6 windows | 44.7 fps (runs 42 to 47; p95 frame 33 ms, worst frame 50 ms). Control with two windows and no long transcript: 60 fps | FAIL |
| No main-thread task over 50 ms during streaming | none reported in 5 turns (the Long Tasks API reports only tasks over 50 ms) | PASS |
| Agent start shows progress at once | 12 ms (the "Starting the agent..." line is already on screen when Enter is pressed) | PASS |
| Memory stable over a long run | 7.4 % growth of total working set over a 240 s soak (1,293 to 1,388 MB, 47 cycles of window open, typing, streaming and scrolling); slope about 34 MB a minute | PASS by the 10 % rule, but see below |

**The soak is 4 minutes, not 30.** A 30-minute run is too long for one measurement pass, so this is a short soak; D10 "memory stable over a 30-minute run" is not proven. The working set was still rising at the end (about 34 MB a minute, mostly the renderer, which also holds the growing chats); at that rate 30 minutes would add roughly 1 GB, so a real 30-minute run is needed before the memory clause counts. Main process memory was flat (about 190 MB). The JS heap figure is not usable: `performance.memory` is quantised in this build.

**Failures and likely cause.**
- Scroll and drag fps. The control drag (two windows, no long transcript) holds 60 fps, so the drag cost comes from the large window: the transcript renders every row (no virtualisation, about 19,000 DOM nodes), and on the software rasteriser each frame of a moved or scrolled window repaints that big layer. Scroll is borderline (55 fps median, individual runs 48 to 58). No single-task jank: p95 frame 33 ms, worst 50 ms. Two cheap fixes were tried and measured: `content-visibility: auto` on the transcript rows (scroll and drag moved by less than the run-to-run spread, and one full run was worse) and `will-change: transform` on the window frame (worse: 46 fps). Both were reverted, so the product is unchanged. The real fix is a windowed (virtualised) transcript list, which is more than a small change in `src/`; to be decided by the UX lead. Re-measure on the reference machine with a GPU before accepting a failure here.

D10 stays below 10 until the fps rows pass on the reference machine and a 30-minute soak is recorded.

## Calibration

Not yet done. J06 is the proposed calibration journey; it needs a second blind reviewer. The round 1 expert scores and the round 2 scores above are from different reviewers, so the 74 lower cells are not a regression by themselves (see "Round 1 to round 2 movement").

## Sprint status

| Item | State |
|---|---|
| Discovery documents | Written. |
| Round 1 fixes (`FIX-BACKLOG.md`, UX-01 to UX-50) | Implemented. Round 2 panel: novice 50 of 59 tasks passed (85%), intermediate 55 of 59 (93%); gate not met (see `panel/r2/SYNTHESIS.md`). |
| Round 2 backlog | `FIX-BACKLOG-R2.md`, UX-51 to UX-85, four work packages. |
| Accessibility scan | 27 states; remaining violations listed in Global notes (D5). |
| Help coverage | 467 of 467 ids documented. |
| Journeys at 10/10 | 0 of 31 |
