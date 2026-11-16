# Agent7 UX Scorecard (round 4)

Status: round 4 re-score by the researcher who wrote `panel/r4/SYNTHESIS.md` (not a fixer of the round 3 backlog). Scores are from the round 4 panel evidence (120 records: 60 novice, 60 intermediate, a full pass at both levels; the expert tier is dropped), the researcher decisions of that file, 29 screenshots that I viewed, the code behind the open findings, and the help coverage script (500 of 500 ids documented, run for this scorecard). The round 3 score of each cell is kept in brackets: `7 (6)` means 7 now, 6 in round 3. A cell without brackets did not change. The round 3 scorecard is kept unchanged after the round 4 sections ("Round 3 scorecard (kept)"), then round 2, then the Performance section, which is current and which I did not edit.

Cell format: the score from 1 to 10, or `n/a` (reason below the table). Dimensions: D1 Usability, D2 Learnability, D3 Efficiency, D4 Error prevention and recovery, D5 Accessibility, D6 Visual consistency, D7 Trust and transparency, D8 Content and copy, D9 Feedback and state, D10 Performance perception, D11 Documentation. Findings are in `findings.md`; the new problems of this round are the themes TH-49 to TH-69 of `panel/r4/SYNTHESIS.md` and the items UX-114 to UX-137 of `FIX-BACKLOG-R4.md`.

**Result: 0 of 31 journeys at 10/10. The release gate is not met.** Details in "Release gate status, round 4" below.

**What 10/10 means here (my reading of the rule).** The rubric decides (`rubric.md`, rule 6): a journey is 10/10 only when all eleven cells are 10, and a cell is 10 only with zero known issues on that dimension and linked evidence. That requires no open S1, S2 or S3 finding, and every S4 finding either fixed or accepted in `findings.md` with a written reason (an unaccepted S4 caps its cell at 9; "no time" is not a reason). The facilitator's wording ("passes at both levels with SEQ of 6 or more and no open finding of severity 2 or higher; severity 1 polish may stay open only if the rubric allows it") is the same rule seen from the panel side: "severity 2 or higher" is S3 and worse in the rubric's numbers, "severity 1 polish" is S4, and the rubric allows an open S4 only when it is accepted with a reason. No S4 is accepted yet (acceptance is the UX lead's decision, not mine), so an open S4 blocks 10/10. Panel part of the rule (used in the "Panel gate" column): every task of the journey passes at both levels and every one of them has SEQ 6 or more.

**How the scores were set.**
- Evidence: the round 4 records and `check.json` of every row, the shots named in the lines below and in `SYNTHESIS.md` 2.5, the source files named in `FIX-BACKLOG-R4.md`, the Performance (UX-84) section (not edited), and `scripts/check-help-coverage.mjs`. I did not run the app and I did not re-run the axe scan.
- The cap rule applies: an open S2 caps its dimension at 6, an open S3 at 8, an S4 not yet accepted at 9. A passed task at SEQ 4, after dead ends, or at its budget is 7 or lower on D1 and D3 for that journey.
- SEQ values are the corrected ones of the records (novice T12.1 to T21.1 were reversed in `check.json`, `SYNTHESIS.md` "Records read").
- A cell that has no round 4 evidence keeps its round 3 value. Where round 4 shows the round 3 cause unchanged, the cell stays (for example J25 D8: the banner "Two comments, one of t..." is still cut in T25.2 intermediate; J29 D8: the tab label "Second pa..." is still cut, shot T29.1 novice 011).

**Global notes (each applies to every journey).**
- **D10 (the Performance section, not edited here).** I score it as the rubric says. The rubric anchor for 10 needs the numbers "measured, on the reference machine", at 60 fps with a 2,000-row transcript and 6 windows, and a memory run of 30 minutes. There is no reference-machine measurement and the soak is 4 minutes, so **no D10 cell can be 10**. The measured fps (scroll 52.7, drag 50.1, threshold 57; round 3 before the transcript was virtualised: 55.2 and 44.7) were taken on headless software rendering in this container with four shared vCPUs, so they are a lower bound and I do not read them as a product failure; the same section shows the remaining gap comes from having six windows on the software rasteriser (a two-window drag holds 60 fps; a 20-row transcript gives 54.4 and 48.4). I also do not raise any cell for the improvement. D10 stays at the round 3 values for all 31 journeys: 8 for journeys that open a chat, a transcript or several windows, 9 (no reference machine, no 30-minute soak) for J01, J14, J15, J16, J29, J30, J31. D10 reaches 10 only when `perf.mjs` is run on the reference machine, the fps rows pass and a 30-minute soak is recorded.
- **D5.** No axe re-scan and no manual checklist (zoom, forced colors, screen reader) in round 4, so every D5 cell stays at its round 3 value (7 or 8). The round 4 shots show nothing new against D5.
- **D11.** Coverage is 500 of 500 ids (R3: 489). F1 opened the right topic in every run that used it (T22.1 both, T22.2 intermediate, T31.1 both, T31.2 both; the Help link on the error page opened "Using Browser", T19.2 novice). No procedure was followed word for word by a fresh reviewer (rubric D11 (f), (g)), so no D11 cell is above 8.
- **D2 and J21.** Both T21.1 panelists used Ctrl+N from an earlier task in the same context (H-69), so J21 keeps D2 7: the round 4 run is no evidence that a newcomer finds the shortcut.

## Scorecard, round 4

| Journey | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | Panel gate | At 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8 | 7 | 9 | n/a | 8 | 9 | n/a | 8 | 8 | 9 | 8 | yes, min SEQ 6 | 0 of 11 |
| J02 Create a desktop | 8 (5) | 7 (6) | 9 (8) | 9 (7) | 8 | 9 (8) | n/a | 8 (7) | 8 (5) | 8 | 7 | no, min SEQ 5 | 0 of 11 |
| J03 Plug in a project | 9 (8) | 8 (7) | 9 (8) | 8 | 7 | 9 | 8 | 8 (7) | 8 | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J04 Start a chat | 9 (8) | 8 (7) | 9 | 8 | 7 | 8 | 8 | 8 (7) | 8 | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J05 Send a prompt and follow progress | 8 (7) | 7 | 9 | 8 | 7 | 8 | 6 (8) | 7 (8) | 6 (8) | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J06 Approve or deny a request (chat and UAC dialog) | 7 (9) | 7 | 6 (9) | 8 | 7 | 8 (9) | 6 (7) | 7 | 6 (9) | 8 | 8 | no, min SEQ 4 | 0 of 11 |
| J07 Approve from the Action Center | 8 (7) | 7 | 9 (8) | 8 | 7 | 9 | 6 (7) | 7 (8) | 6 (7) | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J08 Review and revert changes (Chat, Code) | 8 (7) | 7 | 8 (7) | 8 | 7 | 7 | 8 | 7 | 7 (8) | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J09 Restore from the Recycle Bin | 8 (7) | 7 | 9 | 8 | 7 | 9 | 8 | 7 | 7 (8) | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J10 Tools follow apps | 8 (7) | 7 | 8 | n/a | 7 | 8 (9) | 7 (6) | 7 | 8 | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J11 Pause and take control | 8 (7) | 7 | 9 | 8 | 7 | 9 | 7 | 7 | 7 (8) | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J12 Eject a drive | 8 | 8 (7) | 9 | 8 | 7 | 9 | 8 | 8 (6) | 8 | 8 | 7 | yes, min SEQ 6 | 0 of 11 |
| J13 Disconnect and reconnect while the agent runs | 8 | 7 | 9 (8) | 8 | 7 | 8 (7) | 6 (8) | 7 | 7 | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J14 Manage several desktops | 9 (8) | 8 | 9 | 8 | 8 | 9 | n/a | 8 | 8 (6) | 9 | 8 | yes, min SEQ 6 | 0 of 11 |
| J15 Delete a desktop | 9 | 8 | 9 | 8 | 8 | 9 | n/a | 8 | 8 | 9 | 8 | yes, min SEQ 6 | 0 of 11 |
| J16 Choose permissions (Control Center) | 7 (8) | 7 | 8 | 8 | 8 | 8 (9) | 8 | 7 | 7 (8) | 9 | 8 | no, min SEQ 4 | 0 of 11 |
| J17 Add and choose agents | 8 | 7 | 8 | 8 (7) | 8 | 9 | 8 | 7 | 7 | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J18 A2UI surfaces: inline, sidebar, window | 9 (8) | 8 (7) | 9 (8) | 8 | 7 | 8 (7) | 8 | 8 (6) | 8 (7) | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J19 Browse with the Browser | 8 (6) | 7 (6) | 8 | 8 (7) | 7 | 9 | 7 (6) | 7 | 7 | 8 | 8 (7) | yes, min SEQ 6 | 0 of 11 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 7 | 6 | 7 | 8 | 7 | 9 | 8 | 7 (6) | 8 | 8 | 8 | no, min SEQ 4 | 0 of 11 |
| J21 Keyboard-only operation | 8 | 7 | 9 | 8 | 7 | 9 | n/a | 8 | 8 | 8 | 7 | no, min SEQ 5 | 0 of 11 |
| J22 First-time help and discoverability | 9 (8) | 8 (7) | 9 (8) | n/a | 7 | 9 | n/a | 7 | 8 (6) | 8 | 8 (7) | yes, min SEQ 6 | 0 of 11 |
| J23 Recover from errors | 8 | 7 | 9 (8) | 7 | 7 | 8 | 8 | 8 (7) | 7 | 8 | 8 | no, T23.1-twice not passed | 0 of 11 |
| J24 Read code, git status and the gutter | 8 | 7 | 9 (8) | 8 | 7 | 8 (7) | 8 | 7 | 8 (7) | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J25 Review the agent's changes in Code Review | 9 | 8 | 9 | 9 | 7 | 8 | 8 | 7 | 8 | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J26 Send review comments to a chat, and comment yourself | 8 | 6 | 8 | 8 | 7 | 8 | 8 | 7 (6) | 7 (8) | 8 | 7 | no, min SEQ 5 | 0 of 11 |
| J27 Ask the chat pane about what you are looking at | 8 (6) | 7 (6) | 9 (8) | 9 | 7 | 8 (7) | 8 (7) | 7 | 7 | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J28 Let the agent use a web app in the Browser | 8 | 7 | 8 | 8 | 7 | 8 | 8 (7) | 7 (6) | 7 (8) | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J29 Browse with tabs and recover from a bad page | 9 (8) | 8 | 9 (8) | 7 | 7 | 9 | 7 | 6 | 8 | 9 | 7 | yes, min SEQ 7 | 0 of 11 |
| J30 Use menus, right-click and About in any app | 9 | 8 | 9 | 9 | 7 | 8 | 8 | 7 | 8 (7) | 9 | 8 | yes, min SEQ 6 | 0 of 11 |
| J31 Get help from inside an app (Help menu and F1) | 9 | 8 (7) | 9 | n/a | 7 | 9 | n/a | 7 | 7 | 9 | 8 | yes, min SEQ 6 | 0 of 11 |

`n/a` reasons: D4 is n/a where the journey has no destructive action or error branch (J01, J10, J22, J31); D7 is n/a where the agent does nothing in the journey (J01, J02, J14, J15, J21, J22, J31). "Panel gate" = every task passes at both levels and the lowest SEQ of any record is 6 or more (J23: T23.1-twice is not passed). "At 10" counts cells at 10: none, because D5 and D10 are capped for every journey (above).

## Round 3 to round 4 movement

Of the cells that have a number in both rounds, 64 are higher, 21 are lower and 245 are equal. Mean cell 7.84 (R3: 7.70).

| Dimension | Higher | Lower | Why |
|---|---|---|---|
| D1 Usability | 15 | 2 | T02.1, T14.1, T19.1, T27.2 now pass; the R3 weak rows rate 5 to 7; lower for J06 (T06.1 at its budget, SEQ 4 and 5) and J16 (T16.2 novice SEQ 4) |
| D2 Learnability | 9 | 0 | Create opens the desktop and says so; the tooltip and F1 land; File > New chat; "Ask about this page"; "Focus on the file" |
| D3 Efficiency | 11 | 1 | T21.1, T23.1, T27.2 in one to four actions; lower for J06 (T06.3 ten actions against Min 6, T06.1 three against Min 1) |
| D4 Recovery | 3 | 0 | duplicate-name error no longer moves the dialog (J02), the broken-agent box offers four named buttons (J17), the error page names the cause (J19) |
| D5 Accessibility | 0 | 0 | no re-scan |
| D6 Visual consistency | 5 | 3 | windows open below the top bar (J13, J18, J24, J27) and the dialog is stable (J02); lower for the Control Center list header overlap (J06, J10, J16) |
| D7 Trust | 4 | 4 | up: Take over is announced (J28), the Take over bar names the page (J19), "Explain this" shows the lines (J27), chips read right (J10); down: the permission box misstates the file (J05, J06, J07, J13, UX-114) |
| D8 Copy | 9 | 2 | script echoes gone (J18), "Safe To Remove Hardware" gone (J12), "Waiting for Reacted (1)" gone (J28), "ACP connection closed" gone (J23), the error page (J19); lower where the box sentence is wrong (J05, J07) |
| D9 Feedback | 6 | 9 | up: Create opens the desktop (J02), the broken-agent row shows (J14), the Git tab explains (J24), F1 lands on a section (J22); down: the box sentence (J05, J06, J07), the bar's "Working: Starting the agent..." (J06, J26, J28), lost Reverted rows (J08, J09), chips against banner (J11, J16) |
| D10 Performance | 0 | 0 | unchanged, see the global note |
| D11 Documentation | 2 | 0 | F1 and the Help link walked (J19, J22); coverage 500 of 500 |

| Journey group | Round 3 to round 4 |
|---|---|
| Getting set up (J01 to J04, J12) | Higher. J02 no longer fails: Create opens the desktop. J12 and J03 have only S3 or S4 left (disabled-button reason, vocabulary). |
| Working with the agent (J05 to J11, J13) | Mixed. The permission box (UX-114) lowers J05, J06, J07 and J13 on D7 and D9; J08 and J09 are held by the Changes pane (UX-116, UX-117); J10 and J16 by Control Center (UX-115); J11 by the chips (UX-118). |
| Desktops and agents (J14 to J17) | J14 and J15 higher or equal and free of S2 and S3; J16 lower (Control Center, chips); J17 equal (disabled "Set as Default"). |
| Web, errors and help (J18 to J24, J29) | J18, J19, J22, J24, J29 higher; J20 (Event Viewer, SEQ 4 at both levels) and J23 (crash loop, composer text, T23.1-twice) are the open ones. |
| New features (J25 to J31) | J25, J29, J30, J31 free of S2 and S3; J26 held by the "+" and the stale bar; J27 passes both tasks now; J28 by the chat covering the Browser. |

## Reasons for the changed scores, round 4

Only cells that moved are listed with the new reason. Every cell that did not move keeps its round 3 reason ("Reasons for every score below 10, round 3", kept below), unless a line at the end of the journey says otherwise. Lines that quote a shot name it as `<task>-<level> <number>`.

**J01 First launch and empty launcher.** No cell moved. T01.1 novice 3 of 4, SEQ 6; intermediate 3 of 3 (weak, at its budget, the third action was exploring after the goal), SEQ 6. Open: UX-119 (S3, the launcher stays behind the new window after Create), UX-133 (S4, "Scripted demo"). D9 stays 8.

**J02 Create a desktop.**
- D1 8 (5): T02.1 passes at both levels (novice 6 of 24, intermediate 7 of 18, SEQ 6); T02.2 passes (8 of 28 SEQ 5, 8 of 21 SEQ 7). R3 FAIL fixed: the dialog says "Agent7 opens the new desktop when you click Create." (T02.2-novice 003) and the desktop window is open at the end (T02.1 novice 008).
- D2 7 (6): "they appear as drives" and "Scripted demo" still need a second look (novice).
- D3 9 (8): six actions against Min 6; T02.2 eight against Min 7.
- D4 9 (7): the duplicate name is refused as you type (T02.2-novice 003: the red text is already there before Browse), with two one-click names; Browse stays at y 417 in shots 003 to 007, so the layout shift (UX-89) is fixed. The record's "error only after the folder" is not confirmed.
- D6 9 (8): the dialog layout is stable when the error appears.
- D8 8 (7): the refusal gives the reason and the way out; S4 words remain (UX-133).
- D9 8 (5): after Create the desktop opens and the launcher row keeps its selection (T02.1 novice 008). Not 9: the launcher stays behind (UX-119 not assigned here, T02.1 had no complaint) and "Agent can use nothing yet" shows next to "Ready in login-app" on the desktop (T02.1 novice record).

**J03 Plug in a project.** D1 9 (8): T03.1 passes at both levels, five actions against Min 5, SEQ 6 and 6 (R3 novice SEQ 4). D2 8 (7): the File menu entry is found; "project", "folder" and "drive" are still three words (S4, UX-133). D3 9 (8): five against five. D8 8 (7): "F:" in the toast is still not explained; the dialog says "plug in to this desktop" while the menu says "Plug in a project..." (S4).

**J04 Start a chat.** D1 9 (8): T04.1 2 of 12 and 2 of 16, SEQ 7 and 6; T04.2 one action, SEQ 7 at both levels; open S4 only. D2 8 (7): "New chat here" sits next to the folder in the Code window and was used at once (T04.1 intermediate); File > New chat exists. D8 8 (7): the window title "New chat" does not name the folder (S4).

**J05 Send a prompt and follow progress.**
- D1 8 (7): T05.1 passes 4 of 9 and 4 of 12 (SEQ 6 and 5); T05.2 one action, SEQ 7 and 6.
- D7 6 (8): the permission box says "Agent7 could not read the current file, so it cannot show what changes." for a readable file (T05.1 novice record; the same box in T06.1 intermediate 001). S2 (UX-114).
- D8 7 (8): the same sentence is untrue copy.
- D9 6 (8): the box's statement does not match the data (the Changes pane shows +3 / -3 for the same change); S2 (UX-114).

**J06 Approve or deny a request (chat and UAC dialog).**
- D1 7 (9): T06.1 passes only at the limit at both levels (novice 4 of 4, SEQ 4; intermediate 3 of 3, SEQ 5) because the box cannot show what changes (UX-114); T06.2 and T06.3 pass (SEQ 6 and 5).
- D3 6 (9): T06.3 intermediate 10 actions against Min 6 (a missed OK, two scrolls); T06.1 three actions where the box should have shown the lines.
- D6 8 (9): the Permissions page header overlaps the first row and "Run commands" wraps to "Run command s" (T06.3-intermediate 006).
- D7 6 (7): S2, UX-114, T06.1 intermediate 001.
- D9 6 (9): S2, UX-114; the bar reads "Working: Starting the agent..." while the new chat is Ready and Connected (T06.3-intermediate 006 and 007, UX-125).

**J07 Approve from the Action Center.** D1 8 (7): T07.1 passes in two actions (novice SEQ 5, intermediate 7); "Waiting for you: 2 requests to approve" is on the bar (UX-93 worked). D3 9 (8): two actions against Min 2. D7 6 (7): the login.ts prompt also says it cannot show what changes (T07.1 novice and intermediate records; UX-114). D8 7 (8): same sentence. D9 6 (7): S2, UX-114. Note: the count is right, the cap comes from the box.

**J08 Review and revert changes (Chat, Code).** D1 8 (7): T08.1 4 of 15 and 4 of 20 (SEQ 6 and 5); T08.2 7 of 18 and 4 of 24 (SEQ 5 and 5), no weak row. D3 8 (7): T08.2 intermediate maximised the window to read a diff; novice 4 actions. D9 7 (8): a reverted file stays in the list only while the window stays open (UX-117). D6 stays 7 and D8 7: names cut ("direct.t", "ession", "t.test.t", T08.2-novice 003) and a diff pane about five rows high (UX-116).

**J09 Restore from the Recycle Bin.** D1 8 (7): T09.1 passes at both levels (4 of 12, 4 of 16, SEQ 6 and 5); both panelists first looked in Changes (a dead end). D9 7 (8): after the reopen the reverted file is gone from Changes and no link to the Recycle Bin shows (T09.1-novice 002; T08.1-novice 008 has both in a live session); Revert and Open in editor are greyed with no reason (UX-127).

**J10 Tools follow apps.** D1 8 (7): T10.1 5 of 10 and 5 of 8 (SEQ 5 and 5), T10.2 no action (SEQ 6 and 7). D6 8 (9): the Control Center list (UX-115). D7 7 (6): both panelists read the chips right in T10.2; "Off" against "Deny" is still inconsistent (UX-118, S3).

**J11 Pause and take control.** D1 8 (7): T11.1, T11.2 and T11.3 pass at both levels at SEQ 6 and 7, none weak (R3 novice SEQ 3 and 4). D9 7 (8): the banner says "Browser and all other tools are set to Ask" while "Run commands: Off" and "Browser: Off" stay on the chips (T11.2-novice 003; UX-118).

**J12 Eject a drive.** D2 8 (7): the button reads "Remove from desktop" in the Management panel and the toast says "was removed from this desktop. Your files are still in the folder. Use Plug in again to add it back." D8 8 (6): "Safe To Remove Hardware" is gone; "Drive E:" in the chat text remains plain enough. D1 and D9 stay 8: "Remove from desktop" is greyed until a project is selected and nothing says why (T12.1 novice record, UX-127, S3).

**J13 Disconnect and reconnect while the agent runs.** D3 9 (8): two actions in each task. D6 8 (7): windows open below the top bar. D7 6 (8): T13.2 answers the same permission box with the untrue sentence (T13.2-intermediate 003; UX-114). Still open: the launcher stays in front after Connect, the button becomes "Show desktop" (T13.2-intermediate 002; UX-119); closing the chat gives no word that the job goes on (T13.1 novice; S4).

**J14 Manage several desktops.** D1 9 (8): T14.1 passes at both levels (SEQ 6 and 6), T14.2 SEQ 7 and 7; the preselected waiting row makes it easier than designed (H-73). D9 6 to 8: the row reads "Agent problem: The program 'not-a-real-command' was not found." from the start (T14.1-novice 001; UX-87 and H-51 worked); "Needs your approval" and "Agent problem" are alike in size and color, thumbnails are blank (S4, UX-136).

**J15 Delete a desktop.** No cell moved; D4 stays 8 (no new evidence). T15.1 passes (2 of 12, 3 of 9). "Private C: drive" is still jargon (S4).

**J16 Choose permissions (Control Center).** D1 7 (8): T16.2 novice SEQ 4 (the key sentence is below the fold) and T16.2 intermediate SEQ 5; T16.1 5 and 6. D6 8 (9): header overlap and clipped rows (T16.2-novice 004). D9 7 (8): the bar reads "Run commands: Off" while the list says Ask (T16.1 intermediate record); OK and Apply move when "Not applied yet" appears (UX-115, UX-118).

**J17 Add and choose agents.** D4 8 (7): the red box names the program and has four buttons (T17.2 intermediate, SEQ 7). D8 stays 7: Details shows ENOENT and AG-UI text (opt-in) and the broken agent is not named (UX-134). D9 stays 7: the new row is not marked as the default and "Set as Default" is greyed with no reason (T17.1-novice 010; UX-127).

**J18 A2UI surfaces: inline, sidebar, window.** D1 9 (8): all three T18.1 variants and T18.2 pass at both levels, three actions and one, SEQ 6 and 7. D2 8 (7): the card has Open and Show, the form is found at once. D3 9 (8): three actions. D6 8 (7): the Board window sits below the top bar (the shots of T18.1-window show it clear of the bar; it covers the desktop gadgets, S4). D8 8 (6): the chat reads "The agent opened a form: Board. (Open)" and "It is in the window 'Board - from the agent'"; the script echo "(surface board)" is gone (H-55). Open S4: "Board" against "Board - from the agent", the "Notes" tab for a form (UX-135). D9 8 (7): "(Closed)" with an Open button.

**J19 Browse with the Browser.**
- D1 8 (6): T19.1 passes at both levels in six actions (Browser, address, "Ask about this page", Send); the reply cites the page text. T19.2 passes (0 and 1 action).
- D2 7 (6): the link is a clipped status-bar label ("Ask about this pag", T19.1-novice 009) but it was found by both and prefilled "What does this page say?" (UX-128, S3).
- D4 8 (7): the page names the cause and the next step; "port" and ERR_UNSAFE_PORT stay S4 (UX-134).
- D7 7 (6): the yellow bar says what the agent does; it still says "Agent is using this page: Reading the page" after the read (T19.1-novice 009; UX-128).
- D11 8 (7): the Help link of the error page opened "Using Browser" with the Troubleshooting entry (T19.2 novice).

**J20 Investigate a problem (Event Viewer, Task Manager).** D8 7 (6): the warning row has its own icon and the text names the drive and the fix (T20.1 both). D1 stays 7 and D2 6: T20.1 novice and intermediate rate SEQ 4 (dead ends in the chat Tools and View menus and the Activity gadget; Event Viewer only in the Start menu; first window narrow, T20.1-intermediate 007; 28 events of ACP, AG-UI and MCP; UX-121). T20.2 passes at SEQ 6; the program is on the Processes tab, not the default Chats tab (UX-130, S4).

**J21 Keyboard-only operation.** No cell moved. T21.1 passes in four actions at both levels (SEQ 5 and 6), but both panelists knew Ctrl+N from an earlier task (H-69), so D2 keeps 7 and the learnability is unproven.

**J22 First-time help and discoverability.** D1 9 (8): T22.1 passes at both levels (1 of 8 and 2 of 6, SEQ 6 and 7); T22.2 passes (5 of 16 SEQ 6, 2 of 12 SEQ 7). D2 8 (7): the tooltip shows (T22.1-novice 002: "Plug in a project folder as a drive so that the agent can see its files. Press F1 for more.") and F1 opens "Using Explorer" (T22.1-intermediate 003). D3 9 (8): two actions in the intermediate T22.2. D9 8 (6): F1 opens "Using Explorer" and "Using Chat" at "5 - Common Tasks", the Help window opens beside the app, not over it; the Undo heading sits at the bottom edge and needs a scroll (UX-132) and Revert is greyed with no tooltip (UX-127). D11 8 (7): F1 opens the right topic in four runs. D8 stays 7: search was not used in round 4 (no new evidence for UX-110).

**J23 Recover from errors.** D3 9 (8): one action in T23.1 and T23.2. D8 8 (7): the red box reads "The agent stopped unexpectedly. Your request was not finished." and "The connection to the assistant dropped. Could not send."; "ACP connection closed" is gone. D4 stays 7: the second-failure branch (T23.1-twice) could not be run, and a crash after a good restart never reaches "It stopped again" (UX-123); the composer keeps the sent text after "Restart and send again" and "Send again" (T23.1-novice 004; UX-124). D2 stays 7 ("Disconnected" and "Reconnect" in the status bar are not explained, novice).

**J24 Read code, git status and the gutter.** D3 9 (8): two actions at both levels. D6 8 (7): a double-click on a row opens that file's diff (R3: the wrong file). D9 8 (7): the Git tab says why there are no change marks and offers "Turn on Git here...". D1 stays 8, D2 7, D8 7: the Review window opens at about 450 px and cuts the code (UX-129), the "New" column numbers must be guessed to be line numbers (novice), and the Changes tab still gives no reason for an empty list.

**J25 Review the agent's changes in Code Review.** No cell moved. T25.1 and T25.2 pass at both levels at SEQ 6 and 7, no action needed; D8 stays 7 because "Two comments, one of t..." is still cut in the banner (T25.2-intermediate) and "2 files changed, 1 shown" confused three of four panelists (S4, UX-131).

**J26 Send review comments to a chat, and comment yourself.** D8 7 (6): the dialog no longer reads "Chat 1 (E:\)" but "New chat (review-notes) E:\" next to "Start a new chat" (T26.1-novice 002; UX-122). D9 7 (8): the bar says "Working: Starting the agent..." beside a ready chat (T26.1-novice 002, T26.2-intermediate 001; UX-125). D2 stays 6: the "+" is tiny and unlabelled, a click on the line number only selects the line, the novice found the box by double-click (T26.2 both).

**J27 Ask the chat pane about what you are looking at.**
- D1 8 (6): T27.2 passes at both levels in one action (the button "Focus on the file", 764 of 772 px); T27.1 passes (SEQ 6 and 6).
- D2 7 (6): the button names its job and "Show panes" undoes it; "Ask about selection" is enabled once lines are selected.
- D3 9 (8): three actions against Min 3; one against Min 1.
- D6 8 (7): one toolbar button instead of three separate closes.
- D7 8 (7): "Explain this" now sends "Explain lines 1 to 2 of index.ts" with the lines in the question, and the answer is about lines 1 and 2 (T27.1-intermediate 005).
- D9 stays 7: the selection highlight is gone after the pane opens although the status bar reads "Selected 1-2" (T27.1-intermediate 003; UX-126).

**J28 Let the agent use a web app in the Browser.** D7 8 (7): Take over is announced in the top bar ("You are in control. Browser and all other tools are set to Ask until you resume.", T28.2). D8 7 (6): the bar now says "Waiting for the page to change", the summary says "Used 28 steps in the browser (read, waited, typed)"; the raw "DONE 1 match: [10] listitem" line is script text (H-71). D9 7 (8): the chat window covers the Browser while the agent works and sits behind it afterwards (T28.1-intermediate 001 and 007; UX-120); the bar reads "Working: Starting the agent..." beside a ready chat (UX-125).

**J29 Browse with tabs and recover from a bad page.** D1 9 (8): T29.1 passes at both levels in five actions, SEQ 7. D3 9 (8): five against Min 5. D8 stays 6 and D4 7: the tab label is still "Second pa..." (T29.1-novice 011), the "+" has no label or tooltip (novice), and the bad-page error was not re-walked in round 4.

**J30 Use menus, right-click and About in any app.** D9 8 (7): the Help window opens beside the app that asked (T22.1-intermediate 003, the same placement code; T30.2 itself used Help > About). D8 stays 7: the file type column still reads "Text document (M..." (T30.1-novice).

**J31 Get help from inside an app (Help menu and F1).** D2 8 (7): F1 opens "Using Notepad" with "Saving a file" visible and "Using Terminal" with "I cannot type" in Troubleshooting (T31.1 and T31.2, both levels, SEQ 7 and 6 to 7). D8 stays 7 ("read-only by design"), D9 stays 7 (the Terminal cursor still blinks while the status bar says Read-only, T31.2-novice).

## Release gate status, round 4

Gate of `process.md` (exit criteria), as you stated it: every task passes at both levels, median SEQ at least 6 at each level, every journey 10/10.

| Criterion | Status | Evidence |
|---|---|---|
| Every task passes at both levels | **Met for the 59 rows of `tasks.md`; not met if T23.1-twice counts (I count it)** | novice 59 of 59, intermediate 59 of 59 (2 decisions each, `SYNTHESIS.md` 2.1); T23.1-twice SETUP FAIL at both levels, INVALID. R3: 55 of 59 rows passed at both levels. |
| Median SEQ at least 6 at each level | **Met** | novice 6 (R3 5), intermediate 7 (R3 7). Four tasks still rate 4 (novice T06.1, T16.2, T20.1; intermediate T20.1). |
| Every journey 10/10 | **Not met: 0 of 31** | 11 journeys have no open S2 or S3 finding and 9 of them pass the panel part (J03, J04, J14, J15, J18, J25, J29, J30, J31); each is held by open S4 findings, by D5 (no re-scan) and by D10 (no reference machine). 20 journeys have an open S2 or S3 finding. |
| No S1 to S3 finding open (`process.md` criterion 3) | **Not met** | open: UX-114 (S2), UX-115 to UX-129 (15 x S3); S4: UX-130 to UX-137 (8). No S4 accepted. |
| Documentation gate | Partly | coverage 500 of 500, F1 right in every run that used it; no procedure followed by a fresh reviewer. |
| Accessibility scan | Not run in round 4 | D5 cells unchanged. |
| Performance (UX-84) | Not met | not measured on the reference machine; scroll 52.7 and drag 50.1 fps on software rendering; 4-minute soak (Performance section). |
| Packaged build, fresh panelists | Not met | panelists were not fresh across tasks (H-69); the records do not say that the build was the packaged one. |

**The gate is not met.** The panel part is close: the pass rate is 100% on the 59 rows at both levels and the medians are 6 and 7. What is left is product work (`FIX-BACKLOG-R4.md`: one S2, fifteen S3, eight S4), the T23.1-twice branch, the harness fixes that make the evidence fresh (H-65 to H-76), and the three measurements that are not panel work (axe, reference-machine performance, packaged build).

---

# Round 3 scorecard (kept)

The sections below are the round 3 scorecard as it was written, kept for comparison. Round 4 does not change them except for the headings. The Performance (UX-84) section after the round 2 block is current and is not part of this re-score.

Status: phase 3 re-score by the researcher who wrote `panel/r3/SYNTHESIS.md` (not a fixer of the round 2 backlog). Scores are from the round 3 panel evidence (86 records: 59 novice, 27 intermediate; the expert tier is dropped), the researcher decisions of that file, the screenshots and the code behind them, and the help coverage script (489 of 489 ids documented, run for this scorecard). The round 2 score of each cell is kept in brackets: `7 (6)` means 7 now, 6 in round 2. A cell without brackets did not change. The round 2 scorecard is kept unchanged at the end of the scoring sections ("Round 2 scorecard (kept)").

Cell format: the score from 1 to 10, or `n/a` (reason below the table). Dimensions: D1 Usability, D2 Learnability, D3 Efficiency, D4 Error prevention and recovery, D5 Accessibility, D6 Visual consistency, D7 Trust and transparency, D8 Content and copy, D9 Feedback and state, D10 Performance perception, D11 Documentation. Findings are in `findings.md`; the new problems of this round are the themes TH-32 to TH-48 of `panel/r3/SYNTHESIS.md` and the items UX-86 to UX-113 of `FIX-BACKLOG-R3.md`.

**Result: 0 of 31 journeys at 10/10.** The rule for this scorecard: a journey is 10/10 only when it passes at both levels with SEQ of 6 or more and has no open finding against it. Five journeys meet the panel part (J04, J18, J25, J28, J31: every task passes at both levels and no task has SEQ below 6) and each of them still has an open S3 or S4 finding (J04 right-click hint, J18 window under the top bar, J25 "2 comments" and "Two comments" together, J28 "Waiting for Reacted (1)", J31 "Save is dimmed" and the Terminal gives no feedback near the cursor). In addition D10 is held below 10 everywhere (see below), so no journey can reach 11 cells of 10 yet. Four journeys fail the panel part outright: J02 (T02.1 novice FAIL), J14 (T14.1 novice INVALID), J19 (T19.1 both INVALID), J27 (T27.2 intermediate FAIL).

**How the scores were set.**
- Evidence used: the round 3 records and `check.json` of every row, the shots that the decisions rest on (named in the lines below), `panel/r3/SYNTHESIS.md`, the source files named in `FIX-BACKLOG-R3.md`, the Performance section of this file (not edited, written by another developer), and `scripts/check-help-coverage.mjs`. I did not run the app and I did not re-run the axe scan this round.
- The cap rule of `rubric.md` applies: an open S2 caps its dimension at 6, an open S3 at 8, S4 not yet accepted at 9. A failed or INVALID task at the novice or intermediate level is at least S2 for D1, D2 and the dimension of the cause. A task that passed with SEQ below 5, after dead ends, or at 80 percent or more of its budget is 7 or lower on D1 and D3.
- Carried intermediate rows (round 2) are not evidence for the current build (H-41); where a journey has only a carried intermediate row, the score rests on the novice run and is marked "not re-walked" if no new evidence exists.
- A cell with "no new evidence in R3; score as in R2" was not raised: the round 3 panel did not walk that part.

**Global notes (each applies to every journey; the cell line says which).**
- D10: the Performance (UX-84) section below was measured with `perf.mjs` (not the reference machine, no GPU, 4-minute soak). Input response, window open, launcher and desktop connect meet their targets. Scrolling (55.2 fps) and dragging (44.7 fps) with a 2,000-row transcript and 6 windows fail, and the 30-minute soak is not done. A transcript virtualisation fix is in progress; I did not re-score D10 for it. D10 is 8 for journeys that open a chat or a long transcript, and 9 (not 10: no reference machine, no 30-minute soak) for journeys that never do: J01, J14, J15, J16, J29, J30, J31.
- D5: no axe re-scan in round 3. The R2 backlog UX-83 (24 px caption buttons, tab strip roles, Start menu role) shipped, but there is no scan that shows it worked, so every cell stays at its round 2 value except J21 (7, up from 6: with the mouse disabled both panelists used the Start hint, Ctrl+N and Alt+A/Alt+D without trouble). The manual checklist (zoom, forced colors, screen reader) has not been run, so no D5 cell is above 8.
- D11: the coverage script reports 489 of 489 ids documented. No procedure was followed word for word by a fresh reviewer (rubric D11 (f), (g)). Journeys where the panel hit a Help defect (J22 search and F1, J30 Help window covering the app) are 7.
- D1 gate: no journey with a failed or INVALID round 3 task (J02, J14, J19, J27) is above 6 on D1 except J14 (8: the INVALID is a harness start state); none has a 10 on D2.

## Scorecard, round 3 (kept)

| Journey | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | Panel gate | At 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8 | 7 | 9 | n/a | 8 | 9 | n/a | 8 | 8 | 9 (8) | 8 | no, min SEQ 5 | 0 of 11 |
| J02 Create a desktop | 5 (4) | 6 (5) | 8 (7) | 7 (6) | 8 | 8 (9) | n/a | 7 (6) | 5 (7) | 8 | 7 | no, a task fails, min SEQ 4 | 0 of 11 |
| J03 Plug in a project | 8 (6) | 7 (6) | 8 | 8 | 7 | 9 | 8 | 7 (6) | 8 (6) | 8 | 8 | no, min SEQ 4 | 0 of 11 |
| J04 Start a chat | 8 (6) | 7 (6) | 9 (8) | 8 | 7 | 8 (9) | 8 | 7 | 8 | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J05 Send a prompt and follow progress | 7 (8) | 7 (8) | 9 | 8 | 7 | 8 (9) | 8 | 8 | 8 | 8 | 8 | no, min SEQ 4 | 0 of 11 |
| J06 Approve or deny a request (chat and UAC dialog) | 9 | 7 (8) | 9 | 8 | 7 | 9 | 7 (8) | 7 (8) | 9 | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J07 Approve from the Action Center | 7 (8) | 7 | 8 | 8 | 7 | 9 | 7 (8) | 8 | 7 | 8 | 8 | no, min SEQ 4 | 0 of 11 |
| J08 Review and revert changes (Chat, Code) | 7 (8) | 7 | 7 (8) | 8 | 7 | 7 (8) | 8 | 7 | 8 (7) | 8 | 8 | no, min SEQ 4 | 0 of 11 |
| J09 Restore from the Recycle Bin | 7 | 7 (6) | 9 (7) | 8 | 7 | 9 | 8 | 7 | 8 (6) | 8 | 8 | no, min SEQ 4 | 0 of 11 |
| J10 Tools follow apps | 7 (8) | 7 | 8 | n/a | 7 | 9 | 6 | 7 | 8 | 8 | 8 | no, min SEQ 3 | 0 of 11 |
| J11 Pause and take control | 7 (6) | 7 | 9 | 8 (7) | 7 | 9 | 7 | 7 | 8 (6) | 8 | 8 | no, min SEQ 3 | 0 of 11 |
| J12 Eject a drive | 8 (5) | 7 (6) | 9 (7) | 8 (5) | 7 | 9 | 8 | 6 | 8 (6) | 8 | 7 (6) | no, min SEQ 5 | 0 of 11 |
| J13 Disconnect and reconnect while the agent runs | 8 | 7 | 8 | 8 | 7 | 7 (8) | 8 | 7 | 7 | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J14 Manage several desktops | 8 (9) | 8 | 9 | 8 | 8 | 9 | n/a | 8 | 6 | 9 (8) | 8 | no, a task fails, min SEQ 5 | 0 of 11 |
| J15 Delete a desktop | 9 | 8 | 9 | 8 | 8 | 9 | n/a | 8 | 8 | 9 (8) | 8 | no, min SEQ 5 | 0 of 11 |
| J16 Choose permissions (Control Center) | 8 | 7 | 8 | 8 | 8 | 9 | 8 | 7 | 8 | 9 (8) | 8 | no, min SEQ 5 | 0 of 11 |
| J17 Add and choose agents | 8 (7) | 7 | 8 | 7 (6) | 8 | 9 | 8 | 7 | 7 | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J18 A2UI surfaces: inline, sidebar, window | 8 (7) | 7 | 8 | 8 | 7 | 7 (8) | 8 | 6 (7) | 7 (6) | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J19 Browse with the Browser | 6 (5) | 6 | 8 | 7 (6) | 7 | 9 | 6 | 7 (6) | 7 | 8 | 7 | no, a task fails, min SEQ 4 | 0 of 11 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 7 (8) | 6 | 7 (8) | 8 | 7 | 9 | 8 | 6 | 8 | 8 | 8 | no, min SEQ 3 | 0 of 11 |
| J21 Keyboard-only operation | 8 (7) | 7 (6) | 9 (6) | 8 | 7 (6) | 9 | n/a | 8 | 8 (7) | 8 | 7 | no, min SEQ 5 | 0 of 11 |
| J22 First-time help and discoverability | 8 (7) | 7 (6) | 8 | n/a | 7 | 9 | n/a | 7 (6) | 6 | 8 | 7 (6) | no, min SEQ 5 | 0 of 11 |
| J23 Recover from errors | 8 (7) | 7 | 8 | 7 (6) | 7 | 8 (9) | 8 | 7 | 7 (6) | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J24 Read code, git status and the gutter | 8 (7) | 7 | 8 | 8 | 7 | 7 (8) | 8 | 7 | 7 (8) | 8 | 8 | no, min SEQ 5 | 0 of 11 |
| J25 Review the agent's changes in Code Review | 9 | 8 | 9 | 9 | 7 | 8 | 8 | 7 | 8 | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J26 Send review comments to a chat, and comment yourself | 8 (7) | 6 (5) | 8 (6) | 8 | 7 | 8 | 8 | 6 (7) | 8 | 8 | 7 | no, min SEQ 5 | 0 of 11 |
| J27 Ask the chat pane about what you are looking at | 6 (5) | 6 | 8 | 9 | 7 | 7 (6) | 7 | 7 | 7 (6) | 8 | 8 | no, a task fails, min SEQ 4 | 0 of 11 |
| J28 Let the agent use a web app in the Browser | 8 (6) | 7 (6) | 8 | 8 (7) | 7 | 8 | 7 (5) | 6 (5) | 8 (5) | 8 | 8 | yes, min SEQ 6 | 0 of 11 |
| J29 Browse with tabs and recover from a bad page | 8 (7) | 8 | 8 | 7 | 7 | 9 | 7 | 6 | 8 (7) | 9 (8) | 7 | no, min SEQ 5 | 0 of 11 |
| J30 Use menus, right-click and About in any app | 9 | 8 | 9 | 9 | 7 | 8 | 8 | 7 | 7 (8) | 9 (8) | 8 | no, min SEQ 5 | 0 of 11 |
| J31 Get help from inside an app (Help menu and F1) | 9 | 7 | 9 | n/a | 7 | 9 | n/a | 7 | 7 | 9 (8) | 8 (7) | yes, min SEQ 6 | 0 of 11 |

`n/a` reasons: D4 is n/a where the journey has no destructive action or error branch (J01, J10, J22, J31); D7 is n/a where the agent does nothing in the journey (J01, J02, J14, J15, J21, J22, J31). "Panel gate" = every task passes at both levels (carried intermediate rows count as passed) and the lowest SEQ of any row is 6 or more.

## Round 2 to round 3 movement (kept)

Of the cells that have a number in both rounds, 67 are higher, 26 are lower and 237 are equal. The score of a cell moves with the evidence: the round 2 backlog fixed the folder picker, Recently removed, Resume, the Take over bar, the Start-menu keys and the agent-problem text, and the panel confirmed it.

| Dimension | Higher | Lower | Why |
|---|---|---|---|
| D1 Usability | 16 | 6 | T02.2, T03.1, T04.1, T11.3, T12.2, T27.2 novice, T28.2 and T29.1 now pass; lower where the pass is weak (J05, J07, J08, J10, J20: SEQ 3 to 4) or the row is INVALID (J14) |
| D2 Learnability | 9 | 2 | the folder picker lists the project; File > New chat; the Start hint; lower for J05 and J06 (unannounced permission box, "Terminal" versus "Run commands") |
| D3 Efficiency | 6 | 2 | T17.2 1 action (R2 9), T26.2 4 (R2 12), T21.1 4 and 5 (R2 18 and 19); lower for J08 (6 actions to read one diff) and J20 (16 against Min 5) |
| D4 Recovery | 7 | 0 | Recently removed, the agent-problem box, Resume continues, Take over works |
| D5 Accessibility | 1 | 0 | J21 only |
| D6 Visual consistency | 1 | 8 | the first chat window opens with its title bar under the top bar (`TOP_BAR_HEIGHT` 30 against a 52 to 68 px bar), the Board window too, the duplicate-name error moves the dialog, the Changes names are cut; J27 up |
| D7 Trust | 1 | 2 | lower: the permission box misdescribes the change (J06), the bar says Working while a request waits (J07); up: Take over feedback (J28) |
| D8 Copy | 5 | 3 | the error page names the cause (J19); Common Tasks for saving; lower for "Chat 1" (J26), the script echoes (J18), the permission text (J06) |
| D9 Feedback | 11 | 3 | Resume, Take over, Recently removed, the refreshed Changes list, the toast after Plug in; lower for J02 (nothing after Create), J24, J30 |
| D10 Performance | 7 | 0 | journeys without a transcript: 9 on the measured numbers |
| D11 Documentation | 3 | 0 | "Recently removed" and "Saving a file" now exist |

| Journey group | Round 2 to round 3 |
|---|---|
| Getting set up (J01 to J04, J12) | Higher: the picker, the Plug in route and Recently removed work. J02 is the one open failure: Create does not open the desktop. |
| Working with the agent (J05 to J11, J13) | Equal or higher: Resume, Take over and Stop are clear. J07, J08, J10 are weak: waiting count, cut names, "Run commands" names. |
| Desktops and agents (J14 to J17) | Equal; J14 held back by the broken-agent row that reads Idle. |
| Web, errors and help (J18 to J24, J29) | Higher where R2 fixes held (J18, J23, J29); J19 and J22 still have the unanswered "can the assistant read it" and Help search; J20 Event Viewer depth. |
| New features (J25 to J31) | J25, J28, J30, J31 meet the panel part; J26 hides its main control (hover plus, unlabeled icons); J27 fails T27.2 at intermediate level. |

## Reasons for every score below 10, round 3 (kept)

One line per dimension; the `n/a` cells have none. Lines that quote a shot name it as `<task>-<level> <number>`.

**J01 First launch and empty launcher**
- D1 8: T01.1 novice found New... in 2 of 4 actions, SEQ 5; the empty text "What you can do: plug in a project folder..." was enough to start
- D2 7: novice: "desktop" and "agent" still not explained; the New desktop dialog offers "Scripted demo" with no word on what it is
- D3 9: two clicks (New..., Create) against Min 1
- D5 8: axe was clean for this journey's screens in R2; no re-scan in R3; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: not compared with the reference at native size
- D8 8: the empty text now says what to do (UX-58); "Scripted demo" and "Agent" unexplained in the dialog
- D9 8: desktop created and listed as "New desktop - Idle, No projects plugged in"; the dialog accepts an empty folder list without a word
- D10 9: no transcript in this journey: launcher 711 ms, connect 337 ms and window open 16 ms meet the targets (not the reference machine, 4-minute soak), so 9
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J02 Create a desktop**
- D1 5: T02.1 novice FAIL: created the desktop, saw "Idle", never pressed Connect, so no window was open (S2, cap 6); intermediate passed 8/18 at SEQ 7; T02.2 passed both with the "(2)" or "- docs-site" name
- D2 6: Browse For Folder now finds login-app and docs-site in 3 to 5 clicks ("Projects you used before", Documents; UX-51 worked); nothing says Create does not open the desktop (both levels)
- D3 8: T02.1 6 and 8 actions against Min 6; T02.2 9 against Min 7 (one wasted click on Browse)
- D4 7: duplicate name refused before Create with a one-click fix ("Use 'Fix login redirect (2)'"); the error line pushes Browse down 18 px and the click missed (both T02.2 runs, shots 003 and 004)
- D5 8: axe was clean for this journey's screens in R2; no re-scan in R3; manual checklist (zoom, forced colors, screen reader) not run
- D6 8: the dialog layout moves when the error appears
- D8 7: refusal text is plain and gives a way out; "Agent: Scripted demo" and "Projects you used before" are not explained
- D9 5: after Create the dialog closes and the list says "Idle"; no text says to select the row and press Connect (T02.1 novice shot 007); on the desktop "Agent can use nothing yet" sits next to "Ready in login-app"
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 7: F1 not used in R3; coverage script 489 of 489

**J03 Plug in a project**
- D1 8: T03.1 passed at both levels (5 of 15, SEQ 7 and 4); R2 novice FAIL fixed: File > Plug in a project..., an Explorer window opens on the drive, a toast confirms
- D2 7: novice: "project", "folder" and "drive" are three words for one thing; the tree must be expanded to find docs-site; SEQ 4
- D3 8: 5 actions against Min 5
- D4 8: already-plugged-in message box exists; not walked in R3
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 8: the toast says what was plugged in; what the agent can now see is still not stated
- D8 7: "F:" in "docs-site (F:) is ready to use" is not explained (novice)
- D9 8: toast "Project plugged in: docs-site (F:) is ready to use" and the Explorer window open at once (AutoPlay no longer in the way)
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J04 Start a chat**
- D1 8: T04.1 passed both (novice 2 of 12, SEQ 6; intermediate 2, SEQ 7); R2 novice FAIL fixed by File > New chat in the Code window; T04.2 passed 1 of 9
- D2 7: intermediate: "needed to guess that right-click was the way; nothing visible hints at it"; the novice found File > New chat; chat title "New chat" does not say the folder
- D3 9: 2 actions
- D4 8: not walked in R3
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 8: the first chat window opens with its title bar buttons under the top bar (T02.1 intermediate shot 011)
- D7 8: status bar shows "login-app (E:)"
- D8 7: "New chat" title without the folder; model box "Scripted 1" unexplained (novice)
- D9 8: "Reopened ... Your earlier messages are kept." is clear (T04.2); the Chats icon opens the last chat with no list and needs a double-click (novice)
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J05 Send a prompt and follow progress**
- D1 7: T05.1 novice passed 4 of 9 at SEQ 4 (a weak pass: the permission box was a surprise); T05.2 passed 1 step, SEQ 6
- D2 7: the permission box shows a diff the novice cannot judge and was not announced before Send
- D3 9: type, Enter, Allow
- D4 8: Stop works and says "You stopped this reply. The agent is waiting for your next message." (T05.2)
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 8: the chat window title bar sits under the top bar at first open
- D7 8: novice: not told before sending that a file change needs approval
- D8 8: "Done. I changed src/auth/redirect.ts..." is plain
- D9 8: status goes Working, Waiting for permission, Idle; "You allowed: Change src/auth/redirect.ts." is shown
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J06 Approve or deny a request (chat and UAC dialog)**
- D1 9: T06.1, T06.2 and T06.3 passed (1, 1 and 7 actions, SEQ 5 each)
- D2 7: novice cannot read the diff; "Terminal" in Control Center is not "Run commands" on the bar (T06.3)
- D3 9: one click on the right button
- D4 8: Deny keeps the initial focus (decision 2.3: right); Alt+A and Alt+D are shown
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: not compared with the reference at native size
- D7 7: the box says "5 lines added, 0 removed. This replaces the whole file." for a file that exists; the Changes column later shows +3 / -3 (T06.1, T07.1 shot 001)
- D8 7: "Running commands is set to Ask in Control Center" sits in the middle of the command text; Control Center says Ask shows the request "in the Action Center" but it appears in the chat (T06.3)
- D9 9: "You allowed:" and "You denied:" lines in the chat; "Test run result: The user declined"
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J07 Approve from the Action Center**
- D1 7: T07.1 novice passed 2 of 15 at SEQ 4 (weak): answered the same request in two windows without knowing why there were two
- D2 7: two chat windows with one request each look like one chat twice; the harness gives both the same change (H-57)
- D3 8: 2 actions
- D4 8: no new evidence in R3; score as in R2
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 7: the top bar says "Working: Change src/auth/redirect.ts" while both chats wait for permission (shot 001): workingText returns the running tool before it checks for a waiting request; no count of waiting requests
- D8 8: no new evidence in R3; score as in R2
- D9 7: waiting only shows in each window status bar; the taskbar flag badge "2" was noticed late
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J08 Review and revert changes (Chat, Code)**
- D1 7: T08.1 and T08.2 passed at SEQ 4 each (weak); the novice found Changes at once
- D2 7: "Reverted" and the Recycle Bin mention surprised the novice, then reassured them
- D3 7: T08.2 took 6 actions to read one diff in a pane about 5 rows high
- D4 8: revert asks first and names the Recycle Bin
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 7: Changes list name column is cut to "R...md", "l....ts", "r....ts", and two rows read the same (T08.2 shot 003)
- D7 8: no new evidence in R3; score as in R2
- D8 7: cut names; "which changed most" is not defined on screen
- D9 8: the list shows "Reverted" for redirect.ts and keeps login.ts as Modified (T08.1); no stale list (UX-79 worked)
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J09 Restore from the Recycle Bin**
- D1 7: T09.1 novice passed 3 of 12 at SEQ 4 (weak); R2 was 7 of 12
- D2 7: the novice went to the Recycle Bin only because the revert box named it; no Undo in Edit
- D3 9: 3 actions
- D4 8: "Restore this item" with a status line "Restored redirect.ts to E:\src\auth."
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 8: restore result visible in the bin and in Changes (2) again
- D8 7: the way back is named only in the revert box
- D9 8: Changes (2) lists both files again after the restore (UX-79 worked); "Restore this item" is greyed until a file is selected (novice thought it broken)
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J10 Tools follow apps**
- D1 7: T10.1 novice passed 4 of 10 at SEQ 3 (weak); T10.2 novice passed 0 actions, SEQ 6
- D2 7: "Run commands" on the bar and "Run commands (Terminal)" in the row; "Ask" sounds like it can still run, so the novice chose Deny
- D3 8: 4 actions by the chip route
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 6: chip "Read files: Off" while the Permissions row says Allow (T10.1 shot 002): the chip shows Off when no app is open
- D8 7: "Off", "Ask", "Deny" for one setting on two screens
- D9 8: "Saved. New requests use these settings." and the chip changes at once
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J11 Pause and take control**
- D1 7: T11.1, T11.2 and T11.3 passed at both levels; R2 novice T11.3 FAIL fixed (Resume continued the job); novice T11.3 SEQ 3 and T11.2 SEQ 4 are weak passes
- D2 7: Stop (one chat) versus Pause all agents is told only by the wording on the bar
- D3 9: 1 action each
- D4 8: Resume continues the stopped step: "Resumed. Continuing where you stopped." then "All steps done." (UX-59 worked)
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 7: Activity says "Stopped: you took control" over "Nothing has happened yet" (T11.2 novice shot 002); Run commands and Browser stay "Off" under "Ask before every action"
- D8 7: "Ask before every action" also changes the Browser to Ask without saying so (T28.2 intermediate)
- D9 8: the bar says Paused or "You are in control" with a way back; after Resume the novice still needed the chat to be sure the job ended
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J12 Eject a drive**
- D1 8: T12.1 and T12.2 passed at both levels (2 actions each); R2 FAIL fixed: Computer lists login-app under "Recently removed" and Plug in again works
- D2 7: Eject is a hardware word; the menu label "Eject (remove from this desktop)" helped the intermediate; right-click is the only route in the Code tree
- D3 9: 2 actions against Min 2 to 6
- D4 8: removed project can be plugged in again; the second Computer window next to the chat confused the novice
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 8: no new evidence in R3; score as in R2
- D8 6: balloon title "Safe To Remove Hardware" for a project, "Drive E" and "plug in" mix disk and project words (T12.1 both, T12.2 novice)
- D9 8: "Plug in again" works; the toast says files on disk were not changed
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 7: T12.2 used the assistant text, not F1; the Help text for "Recently removed" was not checked in R3

**J13 Disconnect and reconnect while the agent runs**
- D1 8: T13.1 and T13.2 passed (SEQ 6 and 5)
- D2 7: nothing says that closing the chat keeps the assistant working; the novice trusted the top bar
- D3 8: 3 and 3 actions
- D4 8: no new evidence in R3; score as in R2
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 7: the chat window title bar and its close button sit under the top bar (T13.1 shot 001); the novice used File > Close
- D7 8: the bar keeps saying Working after the window closes
- D8 7: "Needs your approval (1)" in a small orange line; "Connect" then "Show desktop" is two steps (T13.2)
- D9 7: no note on closing that the job keeps running
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J14 Manage several desktops**
- D1 8: T14.1 novice: INVALID (checker wanted "Docs site"; the row read Idle); T14.2 passed 3 of 9 at SEQ 6; the waiting row was preselected
- D2 8: novice: three rows only say "Idle" and "Needs your approval" is the only sign of a problem
- D3 9: 2 and 3 actions
- D4 8: no new evidence in R3; score as in R2
- D5 8: axe was clean for this journey's screens in R2; no re-scan in R3; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: no new evidence in R3; score as in R2
- D8 8: no new evidence in R3; score as in R2
- D9 6: the broken-agent desktop reads Idle at 5 s (T14.1 shot 001): the agent check runs when the launcher opens and every 30 s, not when the list changes (UX-87)
- D10 9: no transcript in this journey: launcher 711 ms, connect 337 ms and window open 16 ms meet the targets (not the reference machine, 4-minute soak), so 9
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J15 Delete a desktop**
- D1 9: T15.1 passed 2 of 9, SEQ 5
- D2 8: novice: "private C: drive" and "plugged in" read twice
- D3 9: 2 actions
- D4 8: no new evidence in R3; score as in R2
- D5 8: axe was clean for this journey's screens in R2; no re-scan in R3; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: no new evidence in R3; score as in R2
- D8 8: "private C: drive" is jargon; the warning is otherwise plain and says what stays
- D9 8: no new evidence in R3; score as in R2
- D10 9: no transcript in this journey: launcher 711 ms, connect 337 ms and window open 16 ms meet the targets (not the reference machine, 4-minute soak), so 9
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J16 Choose permissions (Control Center)**
- D1 8: T16.1 passed 4 of 15, SEQ 5; T16.2 passed (answer "No", matches the row text)
- D2 7: the chip opens Control Center, not a menu; the novice was not sure it was a button; "Run commands (Terminal)" shown as Ask
- D3 8: 4 actions
- D4 8: no new evidence in R3; score as in R2
- D5 8: axe was clean for this journey's screens in R2; no re-scan in R3; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: no new evidence in R3; score as in R2
- D7 8: the Permissions page states the effect of each row; the chip and the row use different names
- D8 7: the "What it covers" text is small; "Turning this off does not change Notepad" is not said
- D9 8: no new evidence in R3; score as in R2
- D10 9: no transcript in this journey: launcher 711 ms, connect 337 ms and window open 16 ms meet the targets (not the reference machine, 4-minute soak), so 9
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J17 Add and choose agents**
- D1 8: T17.1 passed 7 of 24, SEQ 5; T17.2 passed 1 action at both levels (R2 novice was 9 of 9)
- D2 7: "Arguments: one per line" and the Test button needed a guess (T17.1 novice)
- D3 8: 7 actions against Min 8
- D4 7: the error box names the missing program and offers Try again, Open Agents, Choose another agent, Details; intermediate: nothing says which button is the fix
- D5 8: axe was clean for this journey's screens in R2; no re-scan in R3; manual checklist (zoom, forced colors, screen reader) not run
- D6 9: no new evidence in R3; score as in R2
- D7 8: no new evidence in R3; score as in R2
- D8 7: "spawn not-a-real-command ENOENT" behind Details only (opt-in); the chat also says "Ready in Agent" above the red box
- D9 7: "Ready in Agent. What would you like to work on?" contradicts the error below it (T17.2 both)
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J18 A2UI surfaces: inline, sidebar, window**
- D1 8: all three T18.1 variants and T18.2 passed at both levels at 3 of 9 and 1 of 6, SEQ 6 to 7; the R2 window variant (7 of 9, SEQ 4) is fixed
- D2 7: novice: "Open" and "Show" both exist on the card; the form was found at once inline
- D3 8: 3 actions
- D4 8: no new evidence in R3; score as in R2
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 7: the Board window opens partly behind the chat and under the top bar so its title bar is cut (T18.1-window both, T18.2 intermediate, shot 001)
- D7 8: the grey "Example: Ann" hint can be read as a typed value
- D8 6: the chat repeats tool text: "Tool said: ok Shown in its own window ... (surface board)" (scripted agent echo, H-55); the card text itself is plain
- D9 7: the window variant needs a click to bring it forward; the card state (Open, Closed) is clear
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J19 Browse with the Browser**
- D1 6: T19.1 INVALID at both levels (nobody asked the assistant to read the page; the scenario is met by the status, decision 2.4); T19.2 passed at both (novice by content)
- D2 6: "Agent: can see this page" reads as done; the collapsed Chat strip was never noticed; nothing offers "Ask the assistant about this page"
- D3 8: 4 actions for T19.1; 0 for T19.2
- D4 7: the error page names the cause and the next step ("Check the number after the colon (here :9)", UX-69 worked)
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 6: no sign that the assistant has read the page, or has not (T19.1 both)
- D8 7: ERR_UNSAFE_PORT still shown; no word on what a blocked port is (T19.2 novice)
- D9 7: status "Agent: can see this page" says capability, not action
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 7: Help link from the error page not walked in R3

**J20 Investigate a problem (Event Viewer, Task Manager)**
- D1 7: T20.1 novice passed with the right answer at 16 actions (SEQ 3, three dead ends); T20.2 passed 5 of 12, SEQ 5
- D2 6: Event Viewer is four menus deep (Start, All Programs, System Tools); the chat text that reports the refusal has no link to it; End process versus Stop learned from the dialog
- D3 7: T20.1 16 actions against Min 5
- D4 8: End process confirms and warns about lost work
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 8: the event details name the removed drive
- D8 6: event names ACP, AG-UI, fs/read_text_file and a long list with no highlight on the warning (T20.1 novice)
- D9 8: after End process the chat says "The agent program was stopped" and offers Show in Event Viewer (good)
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J21 Keyboard-only operation**
- D1 8: T21.1 passed at both levels in 4 and 5 actions (R2: 18 and 19); the Start menu now shows "Ctrl+Esc opens this menu. Ctrl+N starts a new chat."
- D2 7: novice read the Start hint; intermediate guessed Ctrl+N; Enter on the highlighted New chat was not obvious
- D3 9: 4 and 5 actions against Min 6
- D4 8: Deny keeps the initial focus (decision 2.3); the hint "Press Alt+A to allow or Alt+D to deny." was enough
- D5 7: Alt+A and Alt+D and the Start hint worked with the mouse disabled; no axe re-run, and Help focus and Esc not walked in R3
- D6 9: no new evidence in R3; score as in R2
- D8 8: key hints are plain
- D9 8: "You allowed: Change NOTE.md." and "Saved NOTE.md" confirm the result
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 7: manuals/keyboard.md not reached from F1 in R3

**J22 First-time help and discoverability**
- D1 8: T22.1 passed (novice 3 of 6, intermediate 2 of 6, answers match the Command Bar text); T22.2 novice passed 9 of 12 at SEQ 5
- D2 7: novice pressed F1 after no tooltip was seen (the harness shot is taken before the 500 ms tooltip delay, H-52); "plug in" and "drive" need a second look
- D3 8: T22.2: 9 actions against Min 4, most of them scrolling a long topic
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D8 7: search shows one snippet per topic and the first hit of "undo" is the intro of Using Chat; the Revert section is not listed
- D9 6: a result opens the topic at the first match, not at the section that answers (T22.2 novice shot 006); F1 opens "Using Explorer" at the top
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 7: F1 opens the right topic; the Revert procedure is not a search hit for "undo"

**J23 Recover from errors**
- D1 8: T23.1 passed both (2 of 12, SEQ 6 and 5); T23.2 passed 1 of 9; R2 novice needed three sends, R3 one
- D2 7: "ACP connection" and "Event Viewer" mean nothing to the novice
- D3 8: 2 actions
- D4 7: after a plain Restart the old error vanishes and nothing says to press Send; the message stays in the box (both); the first-crash path was not exercised (H-58)
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 8: the chat title bar sits under the top bar at first open
- D7 8: no new evidence in R3; score as in R2
- D8 7: status bar shows "ACP connection closed" (T23.1 novice shot 001); the red box says "the agent program closed the connection"
- D9 7: no "Your message is saved" note (T23.2 novice); the status bar says Disconnected beside Send
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J24 Read code, git status and the gutter**
- D1 8: T24.1 novice passed (the answer 1, 3 and 4 is right and is visible in shot 006); T24.2 passed both (SEQ 6 and 7)
- D2 7: "Git (3)" and "+3 / -3" do not tell which lines are new; Changes says "No pending changes in this chat" while the reason is on the Git tab (T24.2 both)
- D3 8: 4 actions against Min 5
- D4 8: no new evidence in R3; score as in R2
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 7: a double-click on redirect.ts in the Git list opens Code Review on login.ts (shot 003); the dropdown fixes it
- D7 8: no new evidence in R3; score as in R2
- D8 7: "Old" and "New" columns; Changes tab gives no reason for an empty list
- D9 7: the Git tab states "not tracked with Git, so there are no change marks" (clear); the wrong file opens on double-click
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J25 Review the agent's changes in Code Review**
- D1 9: T25.1 and T25.2 passed in 1 and 0 actions (SEQ 6 and 7)
- D2 8: novice: not sure red means blocker until the Comments list was opened
- D3 9: answers read from the first screen
- D4 9: no new evidence in R3; score as in R2
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 8: no new evidence in R3; score as in R2
- D7 8: no new evidence in R3; score as in R2
- D8 7: the verdict bar reads "2 comments, 1 is a blocker." and, next to it, "Two comments, one of t..." (T26.1 shot 003): numbers in digits and words together
- D9 8: "Changes requested" bar is clear
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J26 Send review comments to a chat, and comment yourself**
- D1 8: T26.1 and T26.2 passed at both levels (T26.2 4 of 15, SEQ 6 and 5; R2 novice was 12 of 15)
- D2 6: intermediate: no obvious add-comment button; the "+" appears only on hover; the novice clicked the line number; four icon buttons per comment have no text
- D3 8: 4 actions against Min 5
- D4 8: the Send to chat dialog preselects the open chat
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 8: the Code Review window is titled "E:\ - Code Review" while the desktop is "Review notes"
- D7 8: no new evidence in R3; score as in R2
- D8 6: the dialog says "Chat 1 (E:\)" but the chat is "New chat - review-notes (E:)" (both levels, shot 003); "second line" is read two ways
- D9 8: comments change to "Sent to chat"; "3 open, 0 sent" is small
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 7: Common Tasks names the line number, the UI shows a hover-only plus

**J27 Ask the chat pane about what you are looking at**
- D1 6: T27.2 intermediate FAIL (editor 578 of 772 px, stopped after the chat pane, S2 cap 6); novice passed 3 of 4 (764 of 772 px); T27.1 passed both (SEQ 6)
- D2 6: no single "more room" action; the novice closed three panels one at a time and did not know whether they could return; three similar chat entries in the right-click menu
- D3 8: T27.1 3 and 4 actions against Min 3
- D4 9: no new evidence in R3; score as in R2
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 7: the editor stays narrow until every panel is closed; each panel has its own close
- D7 7: the pane chip "Explain this" sends only that text; the selection is not shown (T27.1 novice shot 008); the right-click route quotes lines 1-2 (intermediate shot 005)
- D8 7: ">" arrow on the chat pane has no label
- D9 7: closing a panel gives no hint that the toolbar can bring it back
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J28 Let the agent use a web app in the Browser**
- D1 8: T28.1 and T28.2 passed at both levels (SEQ 6 and 7); R2 intermediate FAIL fixed: Take over gives "You have control of this page. The agent stops and asks before it uses the page again." and Give control back
- D2 7: the bar and Take over were found by both; novice unsure whether Take over stops the assistant for good
- D3 8: 3 to 4 actions
- D4 8: Take over works in one click
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 8: the chat window is covered by the Browser while the agent works (T28.1 intermediate)
- D7 7: Take over also ticks "Ask before every action" and sets the Browser to Ask without saying so (intermediate); the bar now stays visible
- D8 6: "Waiting for 'Reacted (1)'" (browser_wait label shows the page text), "Worked in the Browser: 28 steps", "DONE 1 match" (T28.1 both)
- D9 8: bar, Activity and top bar agree after Take over
- D10 8: perf.mjs (UX-84): scroll 55.2 fps and drag 44.7 fps with a 2,000-row transcript and 6 windows fail; transcript virtualisation in progress; not re-scored until re-measured
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J29 Browse with tabs and recover from a bad page**
- D1 8: T29.1 passed at both levels (5 actions, SEQ 5 and 7); the checker FAIL is a defect (H-47); both tabs and the second page are in shots 007 and 006
- D2 8: the + button was found at once; "not sure if it opens a window or a tab" (novice)
- D3 8: 5 actions against Min 5
- D4 7: the error page for a refused connection was not shown in R3
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D7 7: no new evidence in R3; score as in R2
- D8 6: tab label "Second pa..." is cut; ERR_CONNECTION_REFUSED text not re-walked in R3
- D9 8: both tabs stay, the first tab shows its page again
- D10 9: no transcript in this journey: launcher 711 ms, connect 337 ms and window open 16 ms meet the targets (not the reference machine, 4-minute soak), so 9
- D11 7: Help link from the error page not walked in R3

**J30 Use menus, right-click and About in any app**
- D1 9: T30.1 and T30.2 passed (2 and 4 actions, SEQ 7 and 5)
- D2 8: the version is under "About Notepad", not "Version"; F1 shows no version (novice)
- D3 9: 2 and 4 actions against Min 4 and 2
- D4 9: no new evidence in R3; score as in R2
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 8: no new evidence in R3; score as in R2
- D7 8: no new evidence in R3; score as in R2
- D8 7: file type "Text document (M...)" cut; About line reads "Notepad, part of Agent7 version 0.1.0"
- D9 7: F1 opens Using Notepad in the same place as Notepad and hides it, so the novice used the taskbar (T30.2 shot 002)
- D10 9: no transcript in this journey: launcher 711 ms, connect 337 ms and window open 16 ms meet the targets (not the reference machine, 4-minute soak), so 9
- D11 8: coverage script 489 of 489 ids documented (run for this scorecard); no procedure followed word for word by a fresh reviewer

**J31 Get help from inside an app (Help menu and F1)**
- D1 9: T31.1 and T31.2 passed (2 and 3 actions, SEQ 6 each)
- D2 7: the "Saving a file" link is small in a table of contents; "Save is dimmed" is not clear to a novice
- D3 9: 2 and 3 actions
- D5 7: no axe re-run in R3; the R2 finding (caption buttons 29x19 px, `target-size`) stands until a re-scan shows that UX-83 worked
- D6 9: no new evidence in R3; score as in R2
- D8 7: "Save is dimmed" and "read-only by design" are tech phrases
- D9 7: typing into the read-only Terminal still gives no message near the cursor; the notice is in the status bar
- D10 9: no transcript in this journey: launcher 711 ms, connect 337 ms and window open 16 ms meet the targets (not the reference machine, 4-minute soak), so 9
- D11 8: "Saving a file" now exists (UX-81 worked); Troubleshooting for the Terminal found by F1

---

# Round 2 scorecard (kept)

The sections below are the round 2 scorecard as it was written, kept for comparison. Round 3 does not change them except for the headings. The Performance (UX-84) section after them is current and is not part of this re-score.


## Round 2 notes (kept)

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

## Scorecard, round 2 (kept)

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

## Reasons for every score below 10, round 2 (kept)

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

**Method.** Each metric is the median of 5 runs. Load for the fps, streaming and memory rows: 6 windows (the long chat, a second chat, Explorer, Notepad, WordPad, Paint) and one chat of 2,002 transcript entries (1,001 questions and 1,001 answers, seeded into the SQLite database with the app closed, then opened; 19,281 DOM nodes before the transcript was virtualised, 1,370 after). Input response: keydown `timeStamp` to the frame after the next paint (rAF plus a message task), median of 25 keystrokes per run. Window open: click `timeStamp` on the Start menu item to the first frame with the window visible. Launcher: process start to launcher list or empty state shown and New enabled, warm (the same user-data folder with a migrated database; the first start with an empty database was 755 ms). Desktop connect: the Connect click to the first painted frame of the desktop (taskbar). Scroll and drag fps: rAF frame count over 2.5 s of real mouse wheel or pointer events. Streaming: a `PerformanceObserver` for `longtask` while a 6,000-character markdown reply streams in 12-character chunks every 6 ms (about 1.7 s a turn). Agent start: Enter in the first chat message to the first of "Starting the agent...", the user message or Stop.

| Target (rubric D10) | Measured (median of 5) | Result |
|---|---|---|
| Input response under 100 ms, chat composer | 10 ms (worst run p95 19 ms) | PASS |
| Input response under 100 ms, Notepad | 11 ms | PASS |
| Input response under 100 ms, composer with 6 windows and 2,000 rows open | 11 ms | PASS |
| Window open under 200 ms (Start menu click to window visible) | Explorer 16 ms, Notepad 15 ms | PASS |
| Launcher to interactive under 1.5 s, warm | 711 ms | PASS |
| Desktop connect under 2 s | 337 ms | PASS |
| Scrolling at 60 fps, 2,000-row transcript and 6 windows | 52.7 fps (runs 49 to 56; p95 frame 33 ms, worst frame 50 ms). Before virtualisation: 55.2 fps | FAIL (threshold 57 fps), no longer depends on the transcript |
| Dragging at 60 fps, 2,000-row transcript and 6 windows | 50.1 fps (runs 48 to 51; p95 frame 33 ms, worst frame 34 ms). Before virtualisation: 44.7 fps. Control with two windows and no long transcript: 60 fps | FAIL (improved by 5 fps, still under 57) |
| No main-thread task over 50 ms during streaming | none reported in 5 turns (the Long Tasks API reports only tasks over 50 ms) | PASS |
| Agent start shows progress at once | 12 ms (the "Starting the agent..." line is already on screen when Enter is pressed) | PASS |
| Memory stable over a long run | 7.4 % growth of total working set over a 240 s soak (measured before virtualisation, not re-run) (1,293 to 1,388 MB, 47 cycles of window open, typing, streaming and scrolling); slope about 34 MB a minute | PASS by the 10 % rule, but see below |

**The soak is 4 minutes, not 30.** A 30-minute run is too long for one measurement pass, so this is a short soak; D10 "memory stable over a 30-minute run" is not proven. The working set was still rising at the end (about 34 MB a minute, mostly the renderer, which also holds the growing chats); at that rate 30 minutes would add roughly 1 GB, so a real 30-minute run is needed before the memory clause counts. Main process memory was flat (about 190 MB). The JS heap figure is not usable: `performance.memory` is quantised in this build.

**Failures and likely cause.**
- Scroll and drag fps. The transcript is now virtualised (`kit/organisms/VirtualList.svelte`: rows in view plus 600 px of overscan, measured heights cached, spacers for the rest), so the 2,000-row chat holds 1,370 DOM nodes in total instead of 19,281. Drag went from 44.7 to 50.1 fps; scroll stayed within the run-to-run spread (55.2 before, 52.7 after, runs 49 to 56 either way). Neither reaches 57 fps. A control run with the same 6 windows and a 20-row transcript (`--rows 20`) gives 54.4 fps scroll and 48.4 fps drag, the same as the 2,000-row run, so the transcript length no longer matters: the rest of the gap comes from having 6 windows open on the software rasteriser (the 2-window control drag holds 60 fps), not from the chat. Earlier attempts that did not help, kept out of the product: `content-visibility: auto` on the rows and `will-change: transform` on the window frame (worse: 46 fps). The machine is shared and has no GPU, so re-measure on the reference machine before accepting a failure here. The memory soak was not re-run after this change (`--soak-seconds 0`); its row above is from the run before virtualisation.

D10 stays below 10 until the fps rows pass on the reference machine and a 30-minute soak is recorded.

## Calibration

Not yet done. J06 is the proposed calibration journey; it needs a second blind reviewer. The round 1 expert scores and the round 2 scores above are from different reviewers, so the 74 lower cells are not a regression by themselves (see "Round 1 to round 2 movement").

## Sprint status

| Item | State |
|---|---|
| Discovery documents | Written. |
| Round 1 fixes (`FIX-BACKLOG.md`, UX-01 to UX-50) | Implemented. |
| Round 2 fixes (`FIX-BACKLOG-R2.md`, UX-51 to UX-85) | Shipped. Round 3 panel: novice 56 of 59 tasks passed (95%), intermediate 25 of 27 re-run rows (93%) and 57 of 59 with the carried rows (97%); gate not met (see `panel/r3/SYNTHESIS.md`). |
| Round 3 backlog | `FIX-BACKLOG-R3.md`, UX-86 to UX-113, four work packages; harness items H-47 to H-64. |
| Accessibility scan | Not re-run in round 3; see Global notes (D5). |
| Help coverage | 489 of 489 ids documented (run for round 3). |
| Performance | See the Performance (UX-84) section; scroll and drag fps fail, transcript virtualisation in progress. |
| Round 4 panel | Full pass at novice and intermediate: 59 of 59 rows passed at both levels (T23.1-twice SETUP FAIL, invalid); median SEQ novice 6, intermediate 7; gate not met (see `panel/r4/SYNTHESIS.md`). |
| Round 4 backlog | `FIX-BACKLOG-R4.md`, UX-114 to UX-137, four work packages; harness items H-65 to H-76. |
| Help coverage (round 4) | 500 of 500 ids documented. |
| Journeys at 10/10 | 0 of 31 (round 4; 9 meet the panel part and have no open S2 or S3) |
