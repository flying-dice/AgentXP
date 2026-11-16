# Panel round 3: synthesis

Lead UX researcher. Sources: `docs/ux/panel/r3/*.md` (86 records: 59 novice and 27 intermediate; no expert tier), the session folders `/tmp/ux-sessions/r3/<task>-<level>/` (`log.jsonl`, `check.json`, `state.json`, `shots/`), `panel/r2/SYNTHESIS.md` (method and format), `FIX-BACKLOG-R2.md` (UX-51 to UX-85, shipped), the checkers in `scripts/ux-panel/checks/*.mjs`, `tasks.mjs`, `lib/tasktext.mjs` and `server.mjs`, and the source of the product (`src/`) where a record needed a cause. I did not drive the app this round: every decision below rests on the screenshots, `check.json`, `state.json`, the logs and the code. I ran `scripts/check-help-coverage.mjs` (489 of 489 ids documented). Next steps: `docs/ux/FIX-BACKLOG-R3.md` and `docs/ux/scorecard.md`.

Only novice (Haiku) and intermediate (Sonnet) count for the pass rates, the median SEQ and the release gate.

## Records read, missing and carried

- **Novice:** all 59 task rows (T01.1 to T31.2, T18.1 with three variants). Every record has a `check.json`; none is missing.
- **Intermediate:** 27 rows re-run: the R2 failures and weak rows (T02.1, T02.2, T03.1, T04.1, T11.1 to T11.3, T12.1, T12.2, T17.2, T19.1, T19.2, T21.1, T22.1, T23.1, T24.2) and the changed or new tasks (T18.1 x3, T18.2, T26.1, T26.2, T27.1, T27.2, T28.1, T28.2, T29.1). The other 32 intermediate rows are **carried** from round 2. The round 2 backlog changed code under almost every journey, so a carried row is weak evidence for the current build (H-41). I report the intermediate rate for the 27 re-run rows and for all 59 rows, and the gate uses all 59.
- **SEQ.** I use the rating written in each record, not the `--seq` that was passed to `check`. Three novice panelists passed the placeholder `--seq 2` (T04.1, T05.2, T11.1; their ratings are 6) and T08.2 passed 5 (rating 4); the "weak pass: SEQ 2 is below 5" lines of those records are wrong, and the weak flag of every row is recomputed here (H-53). A weak pass is a PASS with SEQ below 5 or with steps at the budget.
- **Step budgets are wrong for the novice (H-48).** `budgetFor` returns the novice budget only for the level name `haiku`; the sessions run as `novice`, so every novice row got the intermediate budget (3 times Min) instead of 4 times Min. Examples from `check.json`: T20.1 budget 15 (should be 20), T29.1 15 (20), T01.1 3 (4), T02.1 18 (24). The same defect was in round 2 (T02.1 novice "19/18 OVER", T17.2 novice "9/9 at limit"). In the matrix below I show the corrected novice budget (the second number of the task's budget in `tasks.md`); the R2 column keeps the numbers printed in R2. Only one verdict changes (T20.1).

## 1. Results matrix

Cell = verdict, steps used / budget, then SEQ. `†` = researcher decision overrides the checker (reasons in section 2). `weak` = SEQ below 5 or steps at the budget. `at limit` = zero steps of slack; `OVER` = budget exceeded. INVALID = the start state, the scenario or the checker made the run meaningless; it counts as not passed and is rerun after the harness fix. `carried` = not re-run in round 3 (the round 2 value is in the next column). The last column shows the checker verdict when it differs from the final verdict.

| Task | Novice R3 | Novice R2 | Intermediate R3 | Intermediate R2 | Checker said, where it differs |
|---|---|---|---|---|---|
| T01.1 Find the start | PASS 2/4 · 5 | PASS 1/3 · 6 | carried | PASS 3/3 · 6 (carried) at limit |  |
| T02.1 A desktop for a project | FAIL 6/24 · 4 | FAIL 19/18 · 2 OVER | PASS 8/18 · 7 | PASS 7/18 · 6 (carried) |  |
| T02.2 Name already used | PASS† 9/28 · 5 | FAIL 10/21 · 2 | PASS† 9/21 · 6 | PASS† 8/21 · 6 (carried) | N: MANUAL; I: MANUAL |
| T03.1 Add another folder | PASS weak 5/20 · 4 | FAIL 3/15 · 4 | PASS 5/15 · 7 | PASS 3/15 · 6 |  |
| T04.1 Chat about one folder | PASS 2/16 · 6 | FAIL 1/12 · 4 | PASS 2/12 · 7 | PASS 2/12 · 7 |  |
| T04.2 Closed conversation back | PASS 1/12 · 6 | PASS 1/9 · 6 | carried | PASS 1/9 · 7 (carried) |  |
| T05.1 Ask and watch | PASS weak 4/12 · 4 | PASS 4/9 · 5 | carried | PASS 4/9 · 6 (carried) |  |
| T05.2 Stop the assistant | PASS 1/4 · 6 | PASS 1/3 · 6 | carried | PASS 1/3 · 7 (carried) |  |
| T06.1 Allow after reading | PASS 1/4 · 5 | PASS 1/3 · 5 | carried | PASS 1/6 · 6 (carried) |  |
| T06.2 Deny | PASS 1/4 · 5 | PASS 1/3 · 6 | carried | PASS 1/3 · 6 (carried) |  |
| T06.3 Make it ask first | PASS 7/24 · 5 | PASS 7/18 · 5 | carried | PASS 9/18 · 5 (carried) |  |
| T07.1 Answer what is waiting | PASS weak 2/20 · 4 | PASS 2/15 · 5 | carried | PASS 3/15 · 6 (carried) |  |
| T08.1 Undo one file | PASS weak 4/20 · 4 | PASS 4/15 · 5 | carried | PASS 4/15 · 6 (carried) |  |
| T08.2 Review everything | PASS weak 6/24 · 4 | PASS 3/18 · 5 | carried | PASS 6/18 · 5 (carried) |  |
| T09.1 Get it back | PASS weak 3/16 · 4 | PASS 7/12 · 4 | carried | PASS 3/12 · 7 (carried) |  |
| T10.1 Take away the command line | PASS weak 4/10 · 3 | PASS† 4/8 · 5 | carried | PASS† 4/8 · 6 |  |
| T10.2 What can it touch? | PASS 0/4 · 6 | PASS 0/3 · 6 | carried | PASS 0/3 · 7 (carried) |  |
| T11.1 Hold on | PASS 1/4 · 6 | PASS 1/3 · 6 | PASS 1/3 · 7 | PASS 1/3 · 7 |  |
| T11.2 Approve every step | PASS weak 1/12 · 4 | PASS 1/9 · 6 | PASS 1/9 · 7 | PASS 1/9 · 6 |  |
| T11.3 Carry on after a pause | PASS weak 1/12 · 3 | FAIL 1/9 · 3 | PASS 1/9 · 7 | PASS 4/9 · 6 (carried) |  |
| T12.1 Take the project away | PASS 2/8 · 5 | PASS 2/6 · 6 | PASS 2/6 · 7 | PASS 2/6 · 7 |  |
| T12.2 It went away mid-job | PASS 2/24 · 6 | FAIL 7/18 · 2 | PASS 2/18 · 7 | FAIL 14/18 · 2 |  |
| T13.1 Leave it running | PASS 3/12 · 6 | PASS 3/9 · 6 | carried | PASS† 2/9 · 6 (carried) |  |
| T13.2 You were called back | PASS 3/16 · 5 | PASS 2/12 · 6 | carried | PASS 2/12 · 7 (carried) |  |
| T14.1 Which one needs me? | INVALID† 2/8 · 5 | PASS 2/6 · 6 | carried | PASS† 1/6 · 7 (carried) | N: FAIL |
| T14.2 Rename | PASS 3/12 · 6 | PASS 3/9 · 7 | carried | PASS 4/9 · 7 (carried) |  |
| T15.1 Throw one away | PASS 2/12 · 5 | PASS 2/9 · 6 | carried | PASS 3/9 · 7 (carried) |  |
| T16.1 Stop it editing by itself | PASS 4/20 · 5 | PASS 4/15 · 5 | carried | PASS 6/15 · 6 (carried) |  |
| T16.2 What a setting covers | PASS† 2/16 · 5 | PASS† 2/12 · 5 | carried | PASS 3/12 · 6 (carried) | N: MANUAL |
| T17.1 Use a different assistant | PASS 7/32 · 5 | PASS 7/24 · 6 | carried | PASS 10/24 · 6 (carried) |  |
| T17.2 It does not start | PASS 1/12 · 6 | PASS† 9/9 · 3 at limit | PASS 1/9 · 7 | PASS 1/9 · 7 |  |
| T18.1-inline Form, inline | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 5/9 · 6 (carried) |  |
| T18.1-sidebar Form, sidebar | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS 3/9 · 7 | PASS 4/9 · 7 (carried) |  |
| T18.1-window Form, window | PASS 3/12 · 6 | PASS 7/9 · 4 | PASS 3/9 · 6 | PASS 4/9 · 7 (carried) |  |
| T18.2 A window you closed | PASS 1/8 · 6 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 (carried) |  |
| T19.1 Look at a web page | INVALID† 4/16 · 4 | FAIL† 10/12 · 5 | INVALID† 4/12 · 5 | PASS† 7/12 · 5 | N: FAIL; I: FAIL |
| T19.2 No network | PASS† 0/12 · 5 | PASS 5/9 · 5 | PASS 0/9 · 7 | PASS 2/9 · 5 | N: FAIL |
| T20.1 Why was it refused? | PASS† weak 16/20 · 3 | PASS 6/15 · 5 | carried | PASS 5/15 · 6 (carried) | N: FAIL |
| T20.2 Stuck assistant | PASS 5/16 · 5 | PASS 5/12 · 5 | carried | PASS 5/12 · 6 (carried) |  |
| T21.1 No mouse | PASS 5/18 · 5 | PASS† 19/36 · 6 | PASS 4/18 · 6 | PASS† 18/36 · 4 |  |
| T22.1 Ask for help | PASS† 3/8 · 6 | PASS† 1/6 · 2 | PASS† 2/6 · 7 | PASS 2/6 · 7 | N: MANUAL; I: MANUAL |
| T22.2 Find a topic by search | PASS 9/16 · 5 | PASS 8/12 · 4 | carried | PASS 5/12 · 7 |  |
| T23.1 It crashed | PASS 2/16 · 6 | PASS† 5/12 · 4 | PASS 2/12 · 5 | PASS 8/12 · 5 (carried) |  |
| T23.2 Connection dropped | PASS 1/12 · 6 | PASS 1/9 · 6 | carried | PASS 5/9 · 5 (carried) |  |
| T24.1 What changed in git | PASS† 4/20 · 5 | PASS 4/15 · 5 | carried | PASS 5/15 · 6 (carried) |  |
| T24.2 Not a Git project | PASS 2/16 · 6 | PASS† 1/12 · 6 | PASS 1/12 · 7 | PASS 2/12 · 7 (carried) |  |
| T25.1 The blocking comment | PASS 1/12 · 6 | PASS 0/9 · 7 | carried | PASS 0/9 · 7 |  |
| T25.2 The verdict | PASS 0/8 · 7 | PASS† 0/6 · 6 | carried | PASS 0/6 · 7 |  |
| T26.1 Pass the remarks on | PASS 3/16 · 6 | PASS 4/12 · 6 | PASS 2/12 · 7 | PASS 3/12 · 7 |  |
| T26.2 Your own remark | PASS 4/20 · 6 | PASS 12/15 · 4 | PASS 4/15 · 5 | PASS 7/15 · 5 |  |
| T27.1 Explain these lines | PASS 4/12 · 6 | PASS 4/9 · 5 | PASS 3/9 · 6 | PASS 3/9 · 7 |  |
| T27.2 More room for the file | PASS 3/4 · 6 | FAIL† 3/3 · 4 at limit | FAIL 1/3 · 4 | FAIL† 3/3 · 5 at limit |  |
| T28.1 Assistant reads a web page | PASS 3/12 · 6 | PASS 4/9 · 4 | PASS 4/9 · 6 | PASS 3/9 · 6 |  |
| T28.2 Take back the page | PASS 1/4 · 7 | PASS† 1/3 · 4 | PASS 1/3 · 7 | FAIL 1/3 · 3 |  |
| T29.1 Two pages side by side | PASS† 5/20 · 5 | INVALID† 6/15 · 3 | PASS† 5/15 · 7 | INVALID† 5/15 · 6 | N: FAIL; I: FAIL |
| T30.1 Open a file from the list | PASS 2/16 · 7 | PASS 2/12 · 2 | carried | PASS 3/12 · 7 |  |
| T30.2 Which version? | PASS 4/8 · 5 | PASS 2/6 · 2 | carried | PASS 2/6 · 7 |  |
| T31.1 How do I save? | PASS 2/8 · 6 | PASS 2/6 · 2 | carried | PASS 3/6 · 6 |  |
| T31.2 Why can I not type here? | PASS 3/8 · 6 | PASS 4/6 · 3 | carried | PASS 3/6 · 7 |  |

### Totals after researcher decisions

| Level | Rows | PASS | FAIL | INVALID | Pass rate (INVALID counts as not passed) | Pass rate (INVALID excluded) | Raw checker PASS (before decisions) | Median SEQ | Tasks with SEQ below 5 |
|---|---|---|---|---|---|---|---|---|---|
| Novice R3 | 59 | 56 (7 with †) | 1 | 2 | **95%** | 98% | 50 of 59 (85%); 6 FAIL, 3 MANUAL | **5** | 12 |
| Novice R2 | 59 | 50 | 8 | 1 | **85%** | 86% | 44 of 59 (75%) | 5 | 21 |
| Novice R1 | 45 | 34 | 10 | 1 | **76%** | 77% | 27 of 45 (60%) | 4 | 27 |
| Intermediate R3, 27 re-run rows | 27 | 25 (3 with †) | 1 | 1 | **93%** | 96% | 22 of 27 (81%); 3 FAIL, 2 MANUAL | **7** | 1 |
| Intermediate R3, all rows (27 re-run + 32 carried) | 59 | 57 | 1 | 1 | **97%** | 98% | not recomputed | **7** | 1 |
| Intermediate R2, all rows | 59 | 55 | 3 | 1 | **93%** | 95% | 21 of 26 re-run (81%) | 6 | 3 |
| Intermediate R2, 26 re-run rows | 26 | 22 | 2 | 1 | 85% | 88% | 21 of 26 | 6.5 | 3 |
| Intermediate R1, all rows | 46 | 40 | 5 | 1 | **87%** | 89% | not recomputed | 6 | 8 |

Rows that failed or were INVALID in round 2 and now pass: novice 7 of 9 (R2 FAIL or INVALID: T02.1, T02.2, T03.1, T04.1, T11.3, T12.2, T19.1, T27.2, T29.1; R3 passes all but T02.1 (FAIL) and T19.1 (INVALID)); intermediate 3 of 4 (R2 FAIL or INVALID: T12.2, T27.2, T28.2, T29.1; R3 fails only T27.2).

**Release gate** (`process.md`, without the expert tier): every task passed by both levels in the final round, median SEQ 6 or more at each level, no task below 5.

| Gate | Novice | Intermediate | Met |
|---|---|---|---|
| All tasks pass | 1 FAIL (T02.1), 2 INVALID (T14.1, T19.1) | 1 FAIL (T27.2), 1 INVALID (T19.1) | **No.** 55 of 59 task rows pass at both levels (93%; round 2: 49 of 59). Four rows do not: T02.1, T14.1, T19.1, T27.2. |
| Median SEQ at least 6 | 5 | 7 | **No** (novice). |
| No task below 5 | 12 tasks at 4 or below (T02.1, T03.1, T05.1, T07.1, T08.1, T08.2, T09.1, T10.1, T11.2, T11.3, T19.1, T20.1); round 2: 21 | T27.2 (4) | **No.** |

What changed since round 2. **Fixed:** T03.1 and T04.1 novice (File > Plug in a project... and File > New chat are found; the AutoPlay detour is gone), T11.3 both (Resume continues the job), T12.2 both (Computer lists "Recently removed", Plug in again works), T27.2 novice, T28.2 intermediate (Take over gives feedback), T17.2 novice (1 action; R2 was 9 of 9), T23.1 novice (one send; R2 was three), T26.2 novice (4 actions; R2 was 12 of 15), T21.1 (4 and 5 actions; R2 was 18 and 19, Ctrl+N and the Start hint exist), T22.1 and T30/T31 novice SEQ (R2 had rating noise of 2). **Still failing:** T02.1 novice (Create does not open the desktop), T27.2 intermediate (no single way to give the file room), and the two INVALID rows T14.1 and T19.1. **New defects of the harness** hid or invented four failures (T29.1 both, T19.2 novice, T20.1 novice) and two start-state gaps (T14.1, T09.1).

Weak passes to remember (counted as PASS, listed because the margin is thin): novice T03.1 (SEQ 4), T05.1 (4), T07.1 (4), T08.1 (4), T08.2 (4), T09.1 (4), T10.1 (3), T11.2 (4), T11.3 (3), T20.1 (3, 16 of 20, three dead ends). Intermediate: none by the SEQ rule (T23.1 and T26.2 are at SEQ 5).

## 2. Researcher decisions

### 2.1 Every verdict that is not a clean PASS

A clean PASS = PASS at SEQ 5 or more with steps under the budget. Everything else is here: every FAIL, MANUAL and weak row of both levels.

| Cell | Checker said | Decision | Reason |
|---|---|---|---|
| T29.1 novice and intermediate | FAIL: "the first tab still shows the test page ()", "the second tab has the address .../second ()" | **PASS†** (both) | Harness defect H-47. The readings in the parentheses are empty because `judgeTabs` reads `button.tabtitle` for the address, and the tab in `BrowserApp.svelte` is one `button.tab` with `title={tab.url}` and no `.tabtitle` child (the close button was moved out of the tab). The shots show what happened: novice 007 has "Second page - Browser" at `http://127.0.0.1:40175/second` loaded ("Second page / This is the second page of the test harness"), two tabs; 008 has the first tab "Fixture page" active at `http://127.0.0.1:40175/`; intermediate 006 the same. The scenario was done at 5 actions (Min 5). R2's INVALID cause (the page was refused) is fixed (H-28). Counted as passed, SEQ 5 and 7. |
| T14.1 novice | FAIL: state ok, the answer lacks "Docs site" | **INVALID†** (not passed; rerun after H-51) | The scenario asks "which workspace has a problem". The only problem the panelist could see was the approval ("Needs your approval (1)"): shot 001 shows the broken-agent desktop "Docs site" as "Idle", like the two idle rows. UX-58 (shipped) puts the agent problem on the row, but `LauncherPage.svelte` calls `checkAgents` when it mounts and every 30 s, and the `four-desktops` preset creates the broken desktop after the launcher opened, so the first check ran before the row existed and the next was due after the 30 s the panelist did not wait. A real user who creates a desktop with a bad agent and looks at the launcher meets the same screen for up to 30 s, so the product has a gap (UX-87), but the run does not test the row as designed. Not a pass: the answer is wrong by the panelist's view of the screen, and not a fail of the product: INVALID. The waiting row was preselected (recorded as the checker asks). |
| T19.2 novice | FAIL: answer lacks "could not connect ... refresh" | **PASS†** | The checker's keyword list is about connection words; the start state is `ERR_UNSAFE_PORT` (127.0.0.1:9). The answer ("The address 127.0.0.1:9 uses a port that the Browser blocks ... check the number after the colon and ask whoever gave me the address for the right one, then type it in the address box") names the cause and the next step and matches the error page text. The intermediate's answer contains "does not load" and passed on the same content. H-62 (keywords by cause: port, blocked, address). |
| T20.1 novice | FAIL: 16 steps against a budget of 15 | **PASS†, weak** | The budget is wrong (H-48): the novice budget in `tasks.md` is 20, and 16 is within it (80%). The state check passed (Event Viewer open) and the answer names the drive and the warning ("Drive E: is not plugged in ... Plug in again", event 22, ACP, `fs/read_text_file`). Weak: SEQ 3, three dead ends (chat View menu, Tools menu, the MCP log) and four menus to reach the Event Viewer (TH-39). |
| T22.1 novice | MANUAL: state ok, answer not passed to `check` | **PASS†** | The answer ("Plug in a project... plugs in a project folder as a drive so that the agent can see its files") is in the record and matches the Command Bar section of `manuals/explorer.md` line 44 and the tooltip text in `ExplorerApp.svelte` line 433. Route: hover (no tooltip seen), then F1, then The Command Bar. SEQ 6. The "no tooltip" is not a product result, see 2.4. |
| T22.1 intermediate | MANUAL: answer not passed (the panelist's mistake) | **PASS†** | F1 opened "Using Explorer"; the answer matches the Command Bar text. 2 of 6, SEQ 7. |
| T16.2 novice | MANUAL: no state to check | **PASS†** | The answer ("No. Notepad saving uses Write files, which is Ask; turning Code off would not stop it") matches the Permissions rows: `permissionsTable.ts` has Notepad "Open and read documents. Saving a file uses Write files." and Write files "Create and change files in any app (Notepad, Code)". The panelist did not toggle Code, which the scenario does not ask for. |
| T02.2 novice and intermediate | MANUAL: state ok (two desktops, names differ); the reason for the refusal must be verified | **PASS†** (both) | Task success in `tasks.md` is "a second desktop with a different, valid name, and states why the first name was refused". Novice: "Fix login redirect - docs-site", reason stated ("the program will not allow two desktops with the same name"), matches the red message in shot 004: "A desktop named 'Fix login redirect' already exists. Each desktop needs its own name so that you can tell them apart." with the offer "Use 'Fix login redirect (2)'". Intermediate: "(2)" accepted, same reason. The product is right, the scenario is wrong (2.2). Both lost a click on Browse to the layout shift (UX-89). |
| T24.1 novice | PASS, but the panelist says the answer was never verified | **PASS†** | The answer ("login.ts modified, redirect.ts modified, session.ts new; new lines in redirect.ts 1, 3 and 4") is right and was on screen: shot 006 is Code Review on redirect.ts with the New column marked "+" at lines 1, 3 and 4 (and "-" at old 1, 3, 4). The record says the panelist "never saw the line-by-line diff" and "stayed on the file list": that is not what shot 006 shows, so the account is inaccurate (the panelist did not trust what they saw), the answer is not a guess. Product finding stands: the double-click on the redirect.ts row (shot 002, row 2) opened Code Review on login.ts (shot 003), and the Git list has no line numbers (UX-107). |
| T19.1 novice and intermediate | FAIL: no `browser_read` call | **INVALID†** (both; not passed; rerun after H-49) | Neither panelist asked the assistant anything. The scenario is "Open the web page at {TEST_PAGE_URL} on this desktop, and let the assistant read it too." The page was open, the chip read "Browser: Allow", the status bar "Agent: can see this page". By the words of the scenario and by the success check in `tasks.md` ("the panelist said the assistant can now see it") the state is met; the stricter `browser_read` rule came with H-40, and the scenario text was not changed to ask for the action. See 2.3 for the product part. |
| T27.2 intermediate | FAIL: file area 578 px of 772 px | **FAIL** (stands) | The scenario ends "Make the file use the whole window". The panelist hid the chat pane (shot 002), judged it done, and the checker measures 578 of 772 px (75%, want 90%) with the Management tree and the Changes and Git panel still open. The record says so ("stopped too early"). The cause is also the product: no single action gives the file the room (TH-33, UX-106); R2 TH-22 stands in part. |
| T27.2 novice | PASS, weak (3 of 3 at the limit) | **PASS** | The limit is the wrong budget (H-48: 3 of 4). The pane is hidden, the Chat tab can bring it back, and the editor is 764 of 772 px (99%). The route took three separate closes and the novice did not know whether a closed panel could return (UX-106). SEQ 6. |
| T02.1 novice | FAIL: its window is open | **FAIL** (stands) | The panelist created "Fix login redirect" with login-app (all four steps worked; the list showed "E: login-app", Idle), then stopped: "I did not know a desktop had to be opened". Shot 007 shows the row selected, `Connect` the default button, and no text on what to do next. The scenario ("set things up so that you could start asking it for help") cannot be met without opening the desktop, so the scenario is right (Min 6 includes Connect) and the product guidance is the cause: the intermediate also noted it ("Not obvious that Create does not open the desktop"). UX-86. |
| T03.1 novice | PASS, weak (SEQ 4) | **PASS** (weak) | 5 of 20. File > Plug in a project..., Documents tree, OK; Explorer opened on the drive by itself and a toast confirmed. SEQ 4 is wording ("project", "folder", "drive") and the tree. |
| T05.1 novice | PASS, weak (SEQ 4) | **PASS** (weak) | The permission box was unannounced and its diff unreadable for the novice; the work was done and understood ("Done. I changed src/auth/redirect.ts"). |
| T07.1 novice | PASS, weak (SEQ 4) | **PASS** (weak) | Both requests answered. The top bar read "Working: Change src/auth/redirect.ts" while both chats waited (shot 001): `workingText` returns the running tool's title before it checks for a waiting request. No count of waiting requests (UX-93). The two identical requests are a fixture effect (H-57). The "--answer missing" warning is the harness false positive H-54. |
| T08.1 novice | PASS, weak (SEQ 4) | **PASS** (weak) | Revert done, asked first, "Recycle Bin" named. SEQ 4 for the cut file names ("l....ts", "r....ts"). |
| T08.2 novice | PASS, weak (SEQ 4; checked with `--seq 5`) | **PASS** (weak) | Answer right (README.md, +7/-1). Six actions to read one diff in a pane about five rows high; names cut (shot 003: two rows read "r....ts"); UX-111. The question "which changed most" is by lines count, the panelist's reading is valid. |
| T09.1 novice | PASS, weak (SEQ 4) | **PASS** (weak) | 3 of 12, R2 was 7 of 12. The panelist says the double-click on the Recycle Bin also reopened the chat; not confirmed (2.4): the "Reopened 'Update the sign-in code'" banner is already in the start shot 001. |
| T10.1 novice | PASS, weak (SEQ 3) | **PASS** (weak) | Terminal = Deny saved, shown on the bar and on the Permissions page. SEQ 3 for "Run commands" versus "Run commands (Terminal)" and Ask versus Deny (UX-98). The bar in shot 002 reads "Read files: Off" while the page says Allow (Off = no app open, by design since UX-61). |
| T11.2 novice | PASS, weak (SEQ 4) | **PASS** (weak) | `userInControl` is true. The Activity gadget reads "Stopped: you took control" over "Nothing has happened yet" (shot 002): nothing was running (UX-94). |
| T11.3 novice | PASS, weak (SEQ 3) | **PASS** (weak) | R2 FAIL is fixed: Resume produced "Resumed. Continuing where you stopped." and "All steps done." SEQ 3: the novice could not tell from the bar that the job had finished. |
| T01.1 novice | PASS; warning "--answer missing" | **PASS** | The warning is a false positive: `asksQuestion` matches "find out" and "what" (H-54). Same for T07.1. |
| T04.1, T05.2, T11.1 novice | PASS; "weak pass: SEQ 2" | **PASS** (not weak) | The `--seq 2` was a placeholder; the ratings are 6 (H-53). |
| T02.1 intermediate and others | PASS | PASS | Not weak. |

### 2.2 T02.2: is the scenario wrong or the product?

The scenario is wrong; the product is right. A launcher with two desktops of one name cannot tell them apart in the launcher, the taskbar or the Task Manager, and the refusal comes before Create with an explanation and a one-click way out (`DesktopNameField.svelte`). Both panelists understood the reason at once. The scenario says "with the same name", which no user can do, so the task as written tests recovery from the refusal (round 1 decision). H-50 rewrites it: "Make another one for docs-site. Try to give it the same name. If the program will not allow that, say why and finish with a name that works." The one real product defect is the layout shift (UX-89). Verdict PASS for both levels.

### 2.3 T19.1: product problem or task wording?

Both. The scenario wording is the main cause of the verdict, so the rows are INVALID, not FAIL. The Browser says "Agent: can see this page" and the chip says "Browser: Allow"; both statements are true and both panelists read them as the answer to "let the assistant read it too". The status tells what the assistant may do, not what it did, and the `browser_read` check asks for an action that the scenario does not name. That is H-49 (the scenario, not the checker, must ask for the action: "Open the page, then ask the assistant what it says").

The product part is real and smaller (S3, UX-102). A person who wants the assistant to read the page has no visible way to start that: the Chat strip is a collapsed edge tab that neither panelist noticed (T19.1 intermediate: "never noticed as the way to make the assistant read it"), and both said they would expect "a button or a line like 'Ask the assistant to read this page'". The wording "can see this page" is not misleading in itself; it is incomplete. Keep it, change it to "Agent: can read this page" with the tooltip, and add the action.

### 2.4 Panelist claims checked

Each claim is checked against the shots, the log and the code. "Not confirmed" claims are left out of the backlog.

| Claim (record) | Status | Evidence |
|---|---|---|
| Create does not open the desktop and does not prompt Connect (T02.1 both) | Confirmed | T02.1 novice shot 007; intermediate record. UX-86. |
| "Agent can use nothing yet" contradicts a ready chat (T02.1 intermediate) | Confirmed | Shot 011 of T02.1 intermediate and shots 001 of T13.1, T18.1-window and T23.1: the line shows next to "Ready in login-app" and "Working". The line counts apps, not chats (`noToolsOpen` in `activity.ts`). UX-94. |
| Right-click-only actions (T04.1, T12.1, T27.1 intermediate) | Confirmed in part | "Start a chat here", "Eject" in the Code tree and "Explain this" on a selection are menu-only; File > New chat (T04.1 novice) and the Eject button in Computer exist. UX-112. |
| Windows land under the top bar or behind the chat (T13.1, T18.1-window, T18.2, T30.2, T12.2) | Confirmed | T13.1 and T18.1-window shots 001: title bars and close buttons under the bar. Cause: `TOP_BAR_HEIGHT = 30` in `src/shared/desktop-views.ts`, while the bar is about 52 px with the chips row and 68 px with the "nothing yet" line, so `WINDOW_MIN_Y` is 34 and windows start under it. Help opens in the same place as the app that asked (T30.2 shot 002). UX-88. |
| Technical text: "surface", "Error: true", "spawn ENOENT", "ACP connection closed" | Split | "ACP connection closed" is product text in the chat status bar (`ChatApp.svelte` line 358 shows `store.error`; T23.1 novice shot 001): UX-96. "spawn ... ENOENT" shows only behind "Details..." (by design). "Error: true. Result: ..." (T12.2 shot 001) and `(surface "board")` (T18.1 shots) are text of the scripted agents echoing a tool result (`scripts/eject-victim.json`, `a2ui.json`): harness, H-55. |
| Duplicate-name error shifts the layout (T02.2 both) | Confirmed | Shots 003 and 004: Browse moves from y 388 to y 406 when the two-line error and the suggestion appear; the panelists' click at y 388 missed. `.error` has `min-height: 15px` for a two-line message. UX-89. |
| "Stopped: you took control" with nothing running (T11.2 both) | Confirmed | T11.2 novice shot 002: the gadget reads "Stopped: you took control" and "Nothing has happened yet." UX-94. |
| Missing tooltips on Plug in a project and Take over | Not confirmed | The code has both (`ExplorerApp.svelte` line 433 `ToolTip`, `BrowserApp.svelte` line 375 `title`). No panelist hovered Take over. For Plug in a project the harness takes the shot 150 ms after `move` (`server.mjs`) and `ToolTip` waits 500 ms, so a tooltip can never be in a `move` shot (H-52). |
| Help search lands on whole topics (T22.2 novice) | Confirmed in part | Shot 006: results are per topic with one snippet; "undo" ranks "Using Chat" first on the intro line ("... you can stop the agent, undo its file changes") and the Revert section is not a hit. UX-110. |
| Restart after a crash does not resend (T23.1 both) | Confirmed for a repeated failure | Both runs started at the second-failure state ("It stopped again", buttons Restart / Start a new chat, by design of UX-65); after Restart nothing says to press Send. The first-crash path ("Restart and send again") was never exercised (H-58). UX-96. |
| Git double-click does not open the diff, no line numbers (T24.1) | Confirmed in part | It opens Code Review on the first file (login.ts), not on the row's file (shot 003); Code Review does show line numbers (shot 006); the Git list shows only "+3 / -3". UX-107. |
| "Explain this" answers about the whole file (T27.1 novice) | Not a product defect | The pane chip "Explain this" sends that text; `scripts/aside.json` rule `explain` matches "explain this" and answers about the file, while the right-click route sends a long prompt that reaches rule `explain-lines` and answers for lines 1 and 2 (T27.1 intermediate shot 005). H-56. The product part is real: the chip does not show or send the selection like the menu does (UX-99). |
| "Chat 1 (E:\)" does not match the chat title (T26.1 both) | Confirmed | Shot 003: dialog "Chat 1 / E:\", window "New chat - review-notes (E:)". `chatLabel` in `reviewModel.ts` uses the id for a chat titled "New chat". UX-109. |
| No single "more room" action in Code (T27.2 both) | Confirmed | UX-106. |
| Eject and "Safe To Remove Hardware" wording (T12.1 both) | Confirmed | Balloon shot (T12.2 intermediate 001) and `DesktopController.svelte.ts` line 794. UX-90. |
| Event Viewer buried; the chat warning has no link (T20.1) | Confirmed | Start > All Programs > System Tools; the error row has "Show in Event Viewer" (T23.1) but the tool-failure text in the chat has none. UX-91, UX-100. |
| Stop versus End process (T20.2) | Confirmed, S4 | The novice learned the difference from the dialog text. UX-101. |
| Run commands naming mismatches (T06.3, T10.1, T10.2) | Confirmed | Shot T10.1-002: bar "Run commands: Ask", row "Run commands (Terminal)", Control Center text "Ask shows a permission request in the Action Center" while the request opens in the chat. UX-98. |
| Permission box line counts differ from the Changes column (T06.1) | Confirmed | The box says "5 lines added, 0 removed. This replaces the whole file." (shots T07.1-001, T14.1-003); the Changes column says +3 / -3 (T08.2-003). `ToolCallDiffs` is meant to read the current file text; here the old text stays `null`. UX-95. |
| No count of waiting approvals (T07.1) | Confirmed | Shot 001: the bar says "Working: ..." and no number; only the taskbar flag has a badge. Cause in `workingText`. UX-93. |
| Recycle Bin double-click also reopens a chat (T09.1) | Not confirmed | The "Reopened 'Update the sign-in code'" banner is already in the start shot 001, before the first click; the preset reopens the chat (H-63). |
| "Waiting for Reacted (1)" in the Browser bar (T28.1 both) | Confirmed | `browserTools.ts` `browser_wait` announces `Waiting for "${text}"` with text from the page. UX-103. |
| Deny is the default focus (T21.1 intermediate) | Decision: keep | See 2.5. |
| Hover-only "+" (T26.2 intermediate) | Confirmed | The novice used the line number; the intermediate found the plus only by hovering. UX-108. |
| Unlabeled comment icons (T26.1 intermediate) | Confirmed | Shot T26.1-003: check, pencil, bubble and X under each comment, no text. UX-108. |

### 2.5 The Deny focus default: right, keep it

Deny is the initial focus of the permission dialog (UX-17, UX-62). It is the right default: an accidental Enter must not let an agent change a file, and the cost of a wrong Deny is one more click. In round 3 neither keyboard user was blocked: the Start menu shows "Ctrl+Esc opens this menu. Ctrl+N starts a new chat.", and the dialog says "Press Alt+A to allow or Alt+D to deny." The novice used Alt+A at once; the intermediate hesitated because Deny "looked focused" and then used Alt+A. No change; UX-98 only asks that the hint stay visible. Close the finding.

### 2.6 Other decisions

- **T12.2 both PASS (R2 FAIL).** Both opened Computer from the chat's text and found "Recently removed" with Plug in again (2 actions, SEQ 6 and 7). The "Error: true" text is the script (H-55).
- **T23.1 both PASS.** One Restart and one Send. Both runs began in the "It stopped again" state, which the task did not intend (H-58).
- **T26.2 both PASS.** The comment is on notes.txt line 2, open, not sent. "The second line" was read as the file's line 2 by both (the scenario is ambiguous in the diff view; no change).
- **T28.2 both PASS.** Take over was used in one click on the bar; `userInControl` true and no tool call in 3 s. The intermediate noted that Take over also ticked "Ask before every action" and moved Browser to Ask (UX-94 text).
- **T21.1 both PASS.** Keys only, 4 and 5 actions.

## 3. Affinity map

Themes continue the round 2 list (TH-18 to TH-31). Ranked by severity (Nielsen 1 to 4, as in the rubric), then by the number of records that name or show the problem. "Runs" counts the records and the screenshots that I checked, out of 86.

| TH | Theme | Sev | Runs | Items |
|---|---|---|---|---|
| TH-32 | Create does not open the desktop and nothing says to press Connect | 2 | 2 (T02.1 both; one FAIL) | UX-86 |
| TH-33 | No single way to give the file the whole window | 2 | 2 (T27.2 both; one FAIL, one three-click pass) | UX-106 |
| TH-34 | New windows land under the top bar, behind the chat, or on top of the app that opened them | 3 | 6 (T13.1, T18.1-window x2, T18.2, T30.2, T12.2 novice) | UX-88 |
| TH-35 | Main controls with no visible route: right-click only, hover only, unlabeled icons, edge tabs | 3 | 9 (T04.1, T12.1, T27.1, T26.2, T26.1 intermediate; T19.1 both; T04.2, T13.1 novice) | UX-102, UX-108, UX-112 |
| TH-36 | The bar and Activity say things the screen contradicts | 3 | 9: "Agent can use nothing yet" next to a ready chat (T02.1 intermediate and the shots of T13.1, T18.1-window, T23.1); "Working" while a request waits (T07.1 and the shots of T13.2, T14.1); "Stopped: you took control" with nothing running (T11.2 both) | UX-93, UX-94 |
| TH-37 | One thing, two names: "Chat 1 (E:\)" and the chat title, "Run commands" and "Run commands (Terminal)", "E:\ - Code Review" and the desktop name | 3 | 5 (T26.1 both, T06.3, T10.1, T10.2 novice) | UX-98, UX-109 |
| TH-38 | Technical or script text in what the user reads | 3 | 9 (T23.1 "ACP connection closed"; T28.1 both "Waiting for Reacted (1)", "28 steps"; T20.1 event names; T17.2 both Details; T12.2 intermediate, T18.1 sidebar and window intermediate script echoes) | UX-96, UX-103; H-55 |
| TH-39 | Failure recovery: Restart does not say what happens next; Event Viewer four menus deep | 3 | 5 (T23.1 both; T20.1; T17.2 intermediate "Ready in Agent" over the error; T23.2) | UX-91, UX-96, UX-100 |
| TH-40 | Changes and Git lists: wrong file on double-click, cut names, no line numbers, box and column counts disagree | 3 | 5 (T24.1; T08.1 and T08.2; T06.1; T07.1 shot) | UX-95, UX-107, UX-111 |
| TH-41 | Browser: nothing makes the assistant read the page, or shows it did | 3 | 2 (T19.1 both; both INVALID) | UX-102 |
| TH-42 | Help: search finds topics, F1 lands at the top, Help covers the app | 3 | 4 (T22.2, T22.1 intermediate, T30.2, T31.1 novice) | UX-110, UX-88 |
| TH-43 | Duplicate-name error moves the dialog | 3 | 2 (T02.2 both) | UX-89 |
| TH-44 | Waiting approvals are not counted | 3 | 3 (T07.1; T13.2 and T14.1 "easy to miss") | UX-93 |
| TH-45 | "Explain this" from the pane does not show the selection; three similar menu entries | 3 | 2 (T27.1 both) | UX-99 |
| TH-46 | Hardware words for projects: Eject, "Safe To Remove Hardware", "Drive E" | 3 | 3 (T12.1 both, T12.2 novice) | UX-90 |
| TH-47 | Stop, End process and Pause all agents: three stops, told apart by reading | 4 | 2 (T20.2, T11.1 novice) | UX-101 |
| TH-48 | Small unexplained words: "Scripted demo", "Agent", "F:", "private C: drive", "Projects you used before" | 4 | 6 (T01.1, T02.1, T02.2, T03.1, T15.1, T17.1 novice) | UX-113 |

What did not recur: the folder picker (TH-18), the removed project (TH-19), Resume (TH-20 for T11.3), the keyboard path (TH-23), the Take over bar (TH-20 for T28.2), the Chat strip as the only route to Start a chat (T04.1 novice used File > New chat). R2 fixes held for these.

## 4. Journey scores

The full re-score with evidence per dimension is in `scorecard.md` (round 3 table and "Reasons for every score below 10"). Summary: mean cell 7.7 (R2: 7.5); 67 cells higher, 26 lower, 237 equal against round 2. **0 of 31 journeys at 10/10.** 10/10 needs a journey that passes at both levels with SEQ of 6 or more and no open finding; five journeys meet the panel part (J04, J18, J25, J28, J31: pass at both levels, no task below SEQ 6) and each has an open S3 or S4 finding. D10 is held at 8 (9 for journeys without a transcript) by the scroll (55 fps) and drag (45 fps) failures of the performance section; a transcript virtualisation fix is in progress and I did not re-score D10 for it.

| Journey | Mean R3 | Mean R2 | Lowest cell | Lowest dimension | Panel gate (pass at both levels, min SEQ 6) |
|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8.2 | 8.1 | 7 | D2 7 | no, min SEQ 5 |
| J02 Create a desktop | 6.9 | 6.7 | 5 | D1 5, D9 5 | no, a task fails, min SEQ 4 |
| J03 Plug in a project | 7.8 | 7.3 | 7 | D2 7, D5 7, D8 7 | no, min SEQ 4 |
| J04 Start a chat | 7.8 | 7.5 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J05 Send a prompt and follow progress | 7.8 | 8.1 | 7 | D1 7, D2 7, D5 7 | no, min SEQ 4 |
| J06 Approve or deny a request (chat and UAC dialog) | 8.0 | 8.3 | 7 | D2 7, D5 7, D7 7, D8 7 | no, min SEQ 5 |
| J07 Approve from the Action Center | 7.6 | 7.8 | 7 | D1 7, D2 7, D5 7, D7 7, D9 7 | no, min SEQ 4 |
| J08 Review and revert changes (Chat, Code) | 7.5 | 7.6 | 7 | D1 7, D2 7, D3 7, D5 7, D6 7, D8 7 | no, min SEQ 4 |
| J09 Restore from the Recycle Bin | 7.8 | 7.4 | 7 | D1 7, D2 7, D5 7, D8 7 | no, min SEQ 4 |
| J10 Tools follow apps | 7.5 | 7.6 | 6 | D7 6 | no, min SEQ 3 |
| J11 Pause and take control | 7.7 | 7.4 | 7 | D1 7, D2 7, D5 7, D7 7, D8 7 | no, min SEQ 3 |
| J12 Eject a drive | 7.7 | 6.6 | 6 | D8 6 | no, min SEQ 5 |
| J13 Disconnect and reconnect while the agent runs | 7.5 | 7.6 | 7 | D2 7, D5 7, D6 7, D8 7, D9 7 | no, min SEQ 5 |
| J14 Manage several desktops | 8.1 | 8.1 | 6 | D9 6 | no, a task fails, min SEQ 5 |
| J15 Delete a desktop | 8.4 | 8.3 | 8 | D2 8, D4 8, D5 8, D8 8, D9 8, D11 8 | no, min SEQ 5 |
| J16 Choose permissions (Control Center) | 8.0 | 7.9 | 7 | D2 7, D8 7 | no, min SEQ 5 |
| J17 Add and choose agents | 7.7 | 7.5 | 7 | D2 7, D4 7, D8 7, D9 7 | no, min SEQ 5 |
| J18 A2UI surfaces: inline, sidebar, window | 7.5 | 7.5 | 6 | D8 6 | yes, min SEQ 6 |
| J19 Browse with the Browser | 7.1 | 6.8 | 6 | D1 6, D2 6, D7 6 | no, a task fails, min SEQ 4 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 7.5 | 7.6 | 6 | D2 6, D8 6 | no, min SEQ 3 |
| J21 Keyboard-only operation | 7.9 | 7.2 | 7 | D2 7, D5 7, D11 7 | no, min SEQ 5 |
| J22 First-time help and discoverability | 7.4 | 7.0 | 6 | D9 6 | no, min SEQ 5 |
| J23 Recover from errors | 7.5 | 7.4 | 7 | D2 7, D4 7, D5 7, D8 7, D9 7 | no, min SEQ 5 |
| J24 Read code, git status and the gutter | 7.5 | 7.6 | 7 | D2 7, D5 7, D6 7, D8 7, D9 7 | no, min SEQ 5 |
| J25 Review the agent's changes in Code Review | 8.1 | 8.1 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J26 Send review comments to a chat, and comment yourself | 7.5 | 7.2 | 6 | D2 6, D8 6 | no, min SEQ 5 |
| J27 Ask the chat pane about what you are looking at | 7.3 | 7.0 | 6 | D1 6, D2 6 | no, a task fails, min SEQ 4 |
| J28 Let the agent use a web app in the Browser | 7.5 | 6.6 | 6 | D8 6 | yes, min SEQ 6 |
| J29 Browse with tabs and recover from a bad page | 7.6 | 7.4 | 6 | D8 6 | no, min SEQ 5 |
| J30 Use menus, right-click and About in any app | 8.1 | 8.1 | 7 | D5 7, D8 7, D9 7 | no, min SEQ 5 |
| J31 Get help from inside an app (Help menu and F1) | 8.0 | 7.8 | 7 | D2 7, D5 7, D8 7, D9 7 | yes, min SEQ 6 |

## 5. Harness and checker defects

Fixes to `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process. Not product work. H-01 to H-46 are in `r1/SYNTHESIS.md` and `r2/SYNTHESIS.md`; the round 2 fixes that I saw working in round 3: H-23 (`userText`), H-26 (the file width check: T27.2 reads 578 and 764 px), H-28 (`{TEST_PAGE_URL}second` is served), H-29 (the `--answer` warning exists), H-32 (fixtures under a sandbox `Documents`), H-33, H-46 (the weak line).

| id | Where | Defect | Fix |
|---|---|---|---|
| H-47 | `checks/features.mjs` `T29.1` | The tab readout looks for `button.tabtitle` and `.label` inside each `[data-testid^="browser-tab-"]`; the tab is now one `button` with `title={tab.url}` (`BrowserApp.svelte`), so every address reads `''` and every correct run FAILs ("()"). Two correct runs failed. `judgeTabs` is unit tested only with synthetic data. | Read `e.getAttribute('title')` for the address; add a test that mounts the real tab markup; make `check` print a stale-selector warning when a reading is empty. |
| H-48 | `lib/tasktext.mjs` `budgetFor`, `session.mjs` | The novice budget is chosen only for the level `haiku`; sessions run as `novice` and `intermediate`, so the novice gets 3 x Min instead of 4 x Min (T20.1 15, should be 20). R2 had the same defect (T02.1 "19/18 OVER", T17.2 "9/9 at limit"). | Map `novice` to `budgetNovice` and `intermediate` to `budgetExpert`; reject unknown level names; recompute the R2 OVER and at-limit flags. |
| H-49 | `tasks.md` T19.1, `checks/desktop.mjs` | The scenario ("let the assistant read it too") is satisfied by the chip and the status line; the check (H-40) needs a `browser_read` call that the scenario never asks for. Both levels INVALID. | Scenario "Open the page at {TEST_PAGE_URL}, then ask the assistant what it says." The check needs `browser_read` and the page title ("Example Domain") in the answer. |
| H-50 | `tasks.md` T02.2 | "With the same name" cannot be met (2.2); the record of a literal panelist reads as a failed task. | Reword (2.2); the check also needs the reason ("already", "same name", "own name", "exists") in the answer. |
| H-51 | `presets/desktops.mjs` `four-desktops`, `tasks.md` T14.1 | The launcher opens before the broken-agent desktop exists; the first `checkAgents` ran at mount and the next is 30 s later, so the row reads Idle for the whole task. | Create all desktops, then open the launcher; or call `launcher.checkAgents` at the end of the preset and wait for `agentProblem`. State check: the row shows the problem before the panelist starts. |
| H-52 | `server.mjs` `move` | `move` waits 150 ms before the screenshot; the tooltip delay is 500 ms. A hover shot never shows a tooltip, and a panelist concludes that none exists (T22.1 novice). | Wait 800 ms after `move` (or a `hover` command that waits and then shoots); say in `PANELIST.md` to look again after a hover. |
| H-53 | `session.mjs check`, `PANELIST.md` | `--seq` is passed as a placeholder (2) or not at all (`seq: null` in most `check.json`), so the weak flag is wrong in both directions (T04.1, T05.2, T11.1 flagged weak at rating 6). | Take the rating from the record: `session.mjs stop` reads `- SEQ:` and writes it to `check.json`; `check` no longer accepts `--seq`. |
| H-54 | `lib/tasktext.mjs` `asksQuestion` | The regex matches "find out", "what", "which" and "show me"; T01.1 ("Find out what you can do first") and T07.1 ("Find out what it wants") get "the scenario asks a question but --answer was not given". | A task asks a question when its `tasks.md` entry has `Answer:`; or the regex only matches `?`, "tell me" and "answer". |
| H-55 | `scripts/eject-victim.json`, `scripts/a2ui.json` | The scripts print raw tool-result fields into the chat: "Error: true. Result: ...", `Tool said: ok Shown in its own window "Board - from the agent" (surface "board")`. Panelists report them as product jargon (T12.2 intermediate, T18.1 sidebar and window intermediate). | The scripts paraphrase: "I could not read the file: <message>"; "I opened the form." |
| H-56 | `scripts/aside.json` | Rule `explain` ("explain this") comes before `explain-lines` and answers about the whole file ("index.ts exports a small constant and a function"), so the pane chip "Explain this" gets a different answer from the right-click route. | Put `explain-lines` first, or make `explain` answer for `appContext.selection`. |
| H-57 | `presets/chat.mjs` (T07.1 start state) | Both chats ask for the same change to the same file, so the panelist asks why there are two and the waiting count cannot be judged. | One request on `redirect.ts`, one on `login.ts`, and a state check that the taskbar flag shows 2. |
| H-58 | `presets/chat.mjs` `crashed-agent`, `scripts/crash-recovery.json` | Both T23.1 runs start at the second failure ("It stopped again", plain Restart), not at the first crash the task describes; the "Restart and send again" path is never tested. | Crash once; assert the red box has "Restart and send again". Run the second-failure state as its own task. |
| H-59 | `session.mjs check`, `FACILITATOR.md` | A task with an answer ends MANUAL when the panelist does not pass `--answer` (T22.1 both, T16.2, T02.2 both). | `check` refuses to write a verdict for an answer task without `--answer` or `--no-answer`. |
| H-60 | `checks/features.mjs` `T24.1` | The check needs the keyword `3` (`countWords`), so an answer with wrong lines passes. | Require the three line numbers 1, 3 and 4 of redirect.ts and the three file names. |
| H-61 | `PANELIST.md` | Records quote UI text "from notes" (T02.2 novice) and describe screens the shots contradict (T24.1: "never saw the diff"; T09.1: "the double-click reopened the chat"). | Final report: copy UI text from a shot, name the shot, and say what you saw last. The researcher checks the last shot before a MANUAL. |
| H-62 | `checks/desktop.mjs` `T19.2` | The keywords are connection words; the start state is a blocked port, whose correct answer has none of them (novice FAIL on content). | Keywords by cause: `port`, `blocked`, `address`, `refused`, `not load`. |
| H-63 | `presets/chat.mjs` (`recycled-change`, `changes-to-review`) | The chat window is reopened with the banner "Reopened ... Your earlier messages are kept." in the start state (T09.1 shot 001); the panelist blamed the Recycle Bin. | Dismiss the banner in the preset. |
| H-64 | `tasks.md` T27.2 | "The side panel next to the file" is read as the chat pane only (intermediate). | Keep "make the file use the whole window"; drop "side panel" and add "Nothing else should share the window with the file." |

## 6. What the gate needs next

1. Fix H-47 to H-64 (about a day) and re-judge T29.1, T14.1, T19.1, T19.2, T20.1, T22.1, T02.2 with the fixed checkers. T29.1, T19.2 and T20.1 already count as passed here.
2. Product: the four packages of `FIX-BACKLOG-R3.md`. The items that move the open rows are UX-86 (T02.1), UX-106 (T27.2), UX-87 (T14.1) and UX-102 (T19.1). The novice median SEQ (5) is the second blocker: the 12 novice tasks at SEQ 4 or below mostly come from TH-32, TH-36, TH-37, TH-40, TH-44 and the Run commands wording (TH-37).
3. Rerun with fresh panelists at both levels: every FAIL, INVALID and weak row of this file, the 32 carried intermediate rows (their code changed under them, H-41), then the full pass on the packaged build. After the transcript virtualisation, re-measure D10 with `perf.mjs`.
