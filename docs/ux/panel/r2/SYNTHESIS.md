# Panel round 2: synthesis

Lead UX researcher. Sources: `docs/ux/panel/r2/*.md` (85 records: 59 novice and 26 intermediate; no expert) and `r2/shots`, the session folders `/tmp/ux-sessions/r2/*` (`log.jsonl`, `check.json`, `state.json`), `panel/r1/SYNTHESIS.md` (method and format), `FIX-BACKLOG.md` (UX-01 to UX-50, all implemented), the checkers in `scripts/ux-panel/checks/*.mjs` and `tasks.mjs`. I also drove the built app (`out/`, one instance at a time) to settle three disputes: T21.1 (reproduced the checker defect), T28.2 (the Take over click and the vanishing bar) and T09.1 (the Changes list after a revert). Next steps: `docs/ux/FIX-BACKLOG-R2.md` and `docs/ux/scorecard.md`.

The product owner dropped the expert tier (Opus). Only novice (Haiku) and intermediate (Sonnet) count from now on, for the pass rates, the median SEQ and the release gate.

## Records read, missing and carried

- **Novice:** all 59 task rows T01.1 to T31.2 (T18.1 has three variants). One has no verdict: **T24.2** (the session was gone after the usage-limit outage, so `session.mjs check` found "no running session"; no `check.json`). I decided it from the record (2.2).
- **Intermediate:** 26 rows run in round 2: the round 1 failures and near-misses (T03.1, T04.1, T10.1, T11.1, T11.2, T12.1, T12.2, T17.2, T19.1, T19.2, T21.1, T22.1, T22.2) and the new tasks T25.1 to T31.2 (13). The other 33 rows are **carried** from round 1 and marked "(carried)". A first T21.1 intermediate run was aborted by a tool outage after 16 steps (`T21.1-intermediate-aborted`, no verdict); the rerun counts.
- **Round 1 intermediate** records for T17.2 to T24.2 were still pending when `r1/SYNTHESIS.md` was written. They exist now. I judged them with the round 1 rules: T17.2 FAIL, T19.1 FAIL, T19.2 PASS† (keyword checker only, H-19), T21.1 PASS† (the same checker defect as round 2, H-23), T22.2 PASS† (opened "Chat Help"; the Help check was wrong, H-07), the rest as recorded. The round 1 intermediate rate below is for all 46 rows and so differs from the 30 rows of the round 1 file (both 87%).
- **Stale carried rows.** T02.1, T02.2 and T12.2-style start states changed under the carried intermediate rows: round 1 ran with the native folder picker stubbed, round 2 uses the in-app Browse For Folder dialog (UX-01). The carried T02.1 and T02.2 passes of the intermediate level are therefore **not evidence for the current build**. They stay in the matrix as carried and are first in the rerun plan (H-41).
- Novice step counts are the harness counts (`session.mjs check`, click, move, drag, scroll, type and key). The two novice SEQ ratings of 2 after two-step passes (T30.1, T30.2, T31.1) do not match their own records and look like rating noise (H-36); I report the measured values.

## 1. Results matrix

Cell = verdict, steps used / budget, then SEQ. `†` = researcher decision overrides the checker (reasons in section 2). `at limit` = zero steps of slack; **OVER** = budget exceeded. INVALID = the start state or the checker made the run meaningless; it counts as not passed and is rerun after the harness fix. "(carried)" = round 1 result, not re-run. R1 columns are the round 1 verdicts after the round 1 decisions (novice from `r1/SYNTHESIS.md`; intermediate as described above). The last column shows the checker verdict when it differs from the final verdict.

| Task | Novice R2 | Novice R1 | Intermediate R2 | Intermediate R1 | Checker said, where it differs |
|---|---|---|---|---|---|
| T01.1 Find the start | PASS 1/3 · 6 | PASS 3/3 · 6 at limit | PASS 3/3 · 6 (carried) at limit | PASS · 6 |  |
| T02.1 A desktop for a project | FAIL 19/18 · 2 OVER | PASS 6/18 · 5 | PASS 7/18 · 6 (carried) | PASS · 6 |  |
| T02.2 Name already used | FAIL 10/21 · 2 | PASS† 8/21 · 4 | PASS† 8/21 · 6 (carried) | PASS† · 6 |  |
| T03.1 Add another folder | FAIL 3/15 · 4 | FAIL 14/15 · 7 | PASS 3/15 · 6 | PASS · 5 |  |
| T04.1 Chat about one folder | FAIL 1/12 · 4 | FAIL 6/12 · 5 | PASS 2/12 · 7 | PASS · 5 |  |
| T04.2 Closed conversation back | PASS 1/9 · 6 | PASS 1/9 · 1 | PASS 1/9 · 7 (carried) | PASS · 7 |  |
| T05.1 Ask and watch | PASS 4/9 · 5 | PASS 4/9 · 2 | PASS 4/9 · 6 (carried) | PASS · 6 |  |
| T05.2 Stop the assistant | PASS 1/3 · 6 | PASS 1/3 · 1 | PASS 1/3 · 7 (carried) | PASS · 7 |  |
| T06.1 Allow after reading | PASS 1/3 · 5 | PASS 1/6 · 2 | PASS 1/6 · 6 (carried) | PASS · 6 |  |
| T06.2 Deny | PASS 1/3 · 6 | PASS 1/3 · 2 | PASS 1/3 · 6 (carried) | PASS · 6 |  |
| T06.3 Make it ask first | PASS 7/18 · 5 | no record | PASS 9/18 · 5 (carried) | PASS · 5 |  |
| T07.1 Answer what is waiting | PASS 2/15 · 5 | PASS 2/15 · 3 | PASS 3/15 · 6 (carried) | PASS · 6 |  |
| T08.1 Undo one file | PASS 4/15 · 5 | PASS 4/15 · 2 | PASS 4/15 · 6 (carried) | PASS · 6 |  |
| T08.2 Review everything | PASS 3/18 · 5 | PASS† 2/18 · 3 | PASS 6/18 · 5 (carried) | PASS · 5 |  |
| T09.1 Get it back | PASS 7/12 · 4 | PASS 4/12 · 2 | PASS 3/12 · 7 (carried) | PASS · 7 |  |
| T10.1 Take away the command line | PASS† 4/8 · 5 | FAIL 4/4 · 2 at limit | PASS† 4/8 · 6 | FAIL · 3 | N: MANUAL; I: MANUAL |
| T10.2 What can it touch? | PASS 0/3 · 6 | PASS 0/3 · 6 | PASS 0/3 · 7 (carried) | PASS · 7 |  |
| T11.1 Hold on | PASS 1/3 · 6 | FAIL 1/3 · 3 | PASS 1/3 · 7 | PASS · 7 |  |
| T11.2 Approve every step | PASS 1/9 · 6 | FAIL 9/9 · 2 at limit | PASS 1/9 · 6 | FAIL · 3 |  |
| T11.3 Carry on after a pause | FAIL 1/9 · 3 | PASS 4/9 · 4 | PASS 4/9 · 6 (carried) | PASS · 6 |  |
| T12.1 Take the project away | PASS 2/6 · 6 | FAIL 6/6 · 3 at limit | PASS 2/6 · 7 | FAIL · 3 |  |
| T12.2 It went away mid-job | FAIL 7/18 · 2 | INVALID† 5/18 · 2 | FAIL 14/18 · 2 | INVALID† · 3 |  |
| T13.1 Leave it running | PASS 3/9 · 6 | PASS† 3/9 · 5 | PASS† 2/9 · 6 (carried) | PASS† · 6 |  |
| T13.2 You were called back | PASS 2/12 · 6 | PASS 2/12 · 5 | PASS 2/12 · 7 (carried) | PASS · 7 |  |
| T14.1 Which one needs me? | PASS 2/6 · 6 | PASS† 2/6 · 6 | PASS† 1/6 · 7 (carried) | PASS† · 7 |  |
| T14.2 Rename | PASS 3/9 · 7 | PASS 4/9 · 6 | PASS 4/9 · 7 (carried) | PASS · 7 |  |
| T15.1 Throw one away | PASS 2/9 · 6 | PASS† 3/9 · 5 | PASS 3/9 · 7 (carried) | PASS · 7 |  |
| T16.1 Stop it editing by itself | PASS 4/15 · 5 | PASS 5/15 · 5 | PASS 6/15 · 6 (carried) | PASS · 6 |  |
| T16.2 What a setting covers | PASS† 2/12 · 5 | PASS 2/12 · 5 | PASS 3/12 · 6 (carried) | PASS · 6 | N: MANUAL |
| T17.1 Use a different assistant | PASS 7/24 · 6 | PASS 10/24 · 4 | PASS 10/24 · 6 (carried) | PASS · 6 |  |
| T17.2 It does not start | PASS† 9/9 · 3 at limit | FAIL 10/12 · 2 | PASS 1/9 · 7 | FAIL · 2 | N: MANUAL |
| T18.1-inline Form, inline | PASS 3/9 · 7 | PASS 4/12 · 6 | PASS 5/9 · 6 (carried) | PASS · 6 |  |
| T18.1-sidebar Form, sidebar | PASS 3/9 · 6 | PASS† 10/12 · 3 | PASS 4/9 · 7 (carried) | PASS · 7 |  |
| T18.1-window Form, window | PASS 7/9 · 4 | PASS 3/12 · 6 | PASS 4/9 · 7 (carried) | PASS · 7 |  |
| T18.2 A window you closed | PASS 1/6 · 7 | PASS 1/8 · 6 | PASS 1/6 · 7 (carried) | PASS · 7 |  |
| T19.1 Look at a web page | FAIL† 10/12 · 5 | FAIL 10/16 · 2 | PASS† 7/12 · 5 | FAIL · 3 | N: MANUAL; I: MANUAL |
| T19.2 No network | PASS 5/9 · 5 | PASS 9/12 · 4 | PASS 2/9 · 5 | PASS† · 4 |  |
| T20.1 Why was it refused? | PASS 6/15 · 5 | PASS 5/20 · 5 | PASS 5/15 · 6 (carried) | PASS · 6 |  |
| T20.2 Stuck assistant | PASS 5/12 · 5 | PASS 7/16 · 4 | PASS 5/12 · 6 (carried) | PASS · 6 |  |
| T21.1 No mouse | PASS† 19/36 · 6 | FAIL 19/48 · 2 | PASS† 18/36 · 4 | PASS† · 2 | N: FAIL; I: FAIL |
| T22.1 Ask for help | PASS† 1/6 · 2 | FAIL 9/8 · 3 OVER | PASS 2/6 · 7 | PASS · 5 | N: FAIL |
| T22.2 Find a topic by search | PASS 8/12 · 4 | PASS† 7/16 · 5 | PASS 5/12 · 7 | PASS† · 3 |  |
| T23.1 It crashed | PASS† 5/12 · 4 | PASS 3/16 · 5 | PASS 8/12 · 5 (carried) | PASS · 5 |  |
| T23.2 Connection dropped | PASS 1/9 · 6 | PASS 7/12 · 4 | PASS 5/9 · 5 (carried) | PASS · 5 |  |
| T24.1 What changed in git | PASS 4/15 · 5 | PASS 6/20 · 4 | PASS 5/15 · 6 (carried) | PASS · 6 |  |
| T24.2 Not a Git project | PASS† 1/12 · 6 | PASS 1/16 · 6 | PASS 2/12 · 7 (carried) | PASS · 7 | N: NO VERDICT |
| T25.1 The blocking comment | PASS 0/9 · 7 | not run | PASS 0/9 · 7 | not run |  |
| T25.2 The verdict | PASS† 0/6 · 6 | not run | PASS 0/6 · 7 | not run | N: FAIL |
| T26.1 Pass the remarks on | PASS 4/12 · 6 | not run | PASS 3/12 · 7 | not run |  |
| T26.2 Your own remark | PASS 12/15 · 4 | not run | PASS 7/15 · 5 | not run |  |
| T27.1 Explain these lines | PASS 4/9 · 5 | not run | PASS 3/9 · 7 | not run |  |
| T27.2 More room for the file | FAIL† 3/3 · 4 at limit | not run | FAIL† 3/3 · 5 at limit | not run | N: PASS; I: PASS |
| T28.1 Assistant reads a web page | PASS 4/9 · 4 | not run | PASS 3/9 · 6 | not run |  |
| T28.2 Take back the page | PASS† 1/3 · 4 | not run | FAIL 1/3 · 3 | not run | N: FAIL |
| T29.1 Two pages side by side | INVALID† 6/15 · 3 | not run | INVALID† 5/15 · 6 | not run | N: PASS; I: PASS |
| T30.1 Open a file from the list | PASS 2/12 · 2 | not run | PASS 3/12 · 7 | not run |  |
| T30.2 Which version? | PASS 2/6 · 2 | not run | PASS 2/6 · 7 | not run |  |
| T31.1 How do I save? | PASS 2/6 · 2 | not run | PASS 3/6 · 6 | not run |  |
| T31.2 Why can I not type here? | PASS 4/6 · 3 | not run | PASS 3/6 · 7 | not run |  |

### Totals after researcher decisions

| Level | Rows | PASS | FAIL | INVALID | Pass rate (INVALID counts as not passed) | Pass rate (INVALID excluded) | Raw checker PASS (before decisions) | Median SEQ | Tasks with SEQ below 5 |
|---|---|---|---|---|---|---|---|---|---|
| Novice R2 | 59 | 50 | 8 | 1 | **85%** | 86% | 44 of 59 (75%); 4 MANUAL, 1 no verdict | **5** | 21 |
| Novice R1 | 45 | 34 | 10 | 1 | **76%** | 77% | 27 of 45 (60%) | 4 | 27 |
| Intermediate R2 (all rows, 26 run and 33 carried) | 59 | 55 | 3 | 1 | **93%** | 95% | 21 of 26 re-run (81%); 2 MANUAL | **6** | 3 |
| Intermediate R2 (26 re-run rows only) | 26 | 22 | 2 | 1 | 85% | 88% | 21 of 26 | 6.5 | 3 |
| Intermediate R1 (all 46 rows) | 46 | 40 | 5 | 1 | **87%** | 89% | not recomputed | 6 | 8 |

Like for like (the 45 tasks that round 1 ran at novice level): round 2 passes 38 of 45 (84%), median SEQ 5, against 34 of 45 (76%) and 4 in round 1.

**Release gate** (`process.md`, without the expert tier): every task passed by both levels in the final round, and median SEQ 6 or more at each level, with no task below 5.

| Gate | Novice | Intermediate | Met |
|---|---|---|---|
| All tasks pass | 8 FAIL (T02.1, T02.2, T03.1, T04.1, T11.3, T12.2, T19.1, T27.2), 1 INVALID (T29.1) | 3 FAIL (T12.2, T27.2, T28.2), 1 INVALID (T29.1) | **No.** 49 of 59 task rows pass at both levels (83%); 10 rows fail or are invalid at one level or both. |
| Median SEQ at least 6 | 5 | 6 | **No** (novice). |
| No task below 5 | 21 tasks at 4 or below | T12.2 (2), T21.1 (4), T28.2 (3) | **No.** |

What changed since round 1. Fixed: novice T11.1, T11.2, T12.1, T17.2 (weakly), T10.1 and the intermediate T04.1, T10.1, T11.2, T12.1, T17.2, T22.2; the Browser blank page is now an error page (T19.2 passes at both levels); the permission box, Stop, Pause, Eject in the tree menu, Ask before every action and the Add Agent dialog work for both levels. New or unchanged failures: T02.1, T02.2 and T12.2 (Browse For Folder cannot find a project and nothing offers a removed project, TH-18, TH-19), T11.3 (Resume), T04.1 and T03.1 at novice level (two entry points; AutoPlay), T19.1 (nothing says the assistant has the page), and the new J27 and J28 tasks (T27.2, T28.2). Three novice rows went from PASS to FAIL (T02.1, T02.2, T11.3). The T21.1 and T22.1 "improvements" are checker fixes, not product changes: the round 1 T21.1 FAIL verdicts (all three levels) were very probably the same checker defect H-23 as in round 2; the keyboard problems the panelists described are real (TH-23).

Weak passes to remember (counted as PASS, listed because the margin is thin): T17.2 novice (9 of 9 steps, SEQ 3, no answer), T19.1 intermediate (guessed from a chip), T22.1 novice (answered from a tooltip, SEQ 2), T23.1 novice (three sends), T26.2 novice (12 of 15, five dead ends), T09.1 novice (7 of 12, SEQ 4), T18.1-window novice (7 of 9, SEQ 4), T21.1 both (the product path took trial and error), T02.2 intermediate (carried, stale), T01.1 (3 of 3 at limit in round 1).

## 2. Researcher decisions

### 2.1 Every MANUAL

| Cell | Checker said | Decision | Reason |
|---|---|---|---|
| T10.1 novice | MANUAL: state ok (Terminal = Deny) | **PASS** | The panelist saved Deny and named the proof: the bar chip "Run commands (off)" and the Deny policy. Both are valid proofs (tasks.md). It used the chip route, 4 of 8 steps. The word mismatch "Run commands (asks)" vs "Terminal (run commands)" is a product finding (TH-25, UX-61). |
| T10.1 intermediate | MANUAL: state ok | **PASS** | Same, with the Permissions row and the chip named explicitly. Also saw "Read files (off)" while the row says Allow (TH-25). |
| T16.2 novice | MANUAL: no state to check | **PASS** | The answer ("No. Code only covers what its row lists. Notepad writing falls under Write files... Notepad's row only covers open and read.") matches the page header and the Notepad row text "Open and read documents in Notepad" (`permissionsTable.ts`). The "What it covers" column was cut off at default size, so the header carried the answer (TH-25, UX-67). |
| T17.2 novice | MANUAL: state ok, answer unchecked | **PASS†** (weak) | No final answer was asked or given, but the think-aloud names the cause ("The program 'not-a-real-command' was not found"), the Agents page ("Open Agents", then Edit showed `not-a-real-command`) and the app was not restarted (same pid). It then changed the default agent and the chat kept the broken one, so "what to do" was only half understood. 9 of 9 steps, SEQ 3. TH-24, UX-63. |
| T19.1 intermediate | MANUAL: state ok | **PASS†** (weak) | Browser shows the page, Browser chip on, and the panelist said the assistant can now see the page, on the strength of the chip only ("had to guess"). Same rule as the round 1 expert (T19.1 PASS†). No confirmation exists in the product (TH-21, UX-70). |
| T19.1 novice | MANUAL: state ok, assistant read not seen | **FAIL†** | The panelist went to the Chat pane, got "No scripted rule matches" three times and ended unsure. Part of that is the harness (the `browser-agent` script has no fallback, H-40), but the product gives no sign that the assistant has the page, which is the goal of the task. Consistent with round 1 (novice FAIL). |
| T24.2 novice | no verdict (session gone) | **PASS†** | The checker for T24.2 passes the state unconditionally and the answer needs "git", "repository" or "version control". The panelist's answer ("Not a Git repository... This folder is not tracked, so there are no change marks") contains them and matches the screen text. H-30. |

### 2.2 Disputed checker verdicts

- **T21.1 novice and intermediate: FAIL becomes PASS†.** The screens show "hello" sent, Allow chosen and "Saved NOTE.md.". I reproduced it in this round: start `keyboard-only`, `Ctrl+Esc`, type "new chat", Enter, type "hello", Enter, Shift+Tab, Enter, then `session.mjs check` still said FAIL. The transcript read through the admin socket has `permission.outcome = "selected"`, `selectedOptionId = "allow"`, and a user message whose first block is a `resource` (`agent7://desktop/state`, a JSON dump of the desktop) followed by the text block `hello`. The checker joins every block with `textOf` and tests `^\s*hello\s*$`, so it can never match (H-23; `features.mjs` T27.1 has the same blind spot, its note "question:" is empty). Not a usability result. The product findings stand: no Ctrl+N, no New chat in the menus, Ctrl+Esc found by trial, Enter in Start does nothing until text is typed, Help takes no focus and ignores Esc, Deny is the default focus (TH-23). Budget: novice 19 of 36 and intermediate 18 of 36, SEQ 6 and 4. The round 1 FAIL verdicts of T21.1 were most likely the same defect.
- **T22.1 novice: FAIL becomes PASS†.** The scenario says "find out without leaving the program"; the panelist hovered "Plug in a project..." and the tooltip answered it ("Plug in a project folder as a drive so that the agent can see its files."), which is exactly what UX-11 built. The checker demands an open Help window (H-24). The intermediate did both (hover, then F1) and passed. Finding kept: the novice did not know Help was the place to ask (SEQ 2, TH-29).
- **T23.1 novice: PASS†, verified.** The checker said PASS (last turn success, a request sent after the crash, agent answered, chat Idle) and asked me to verify because the last screen showed the "New messages" pill. The log and shots 004, 012 and 033 show that the first "Restart and send again" already ran the request to its end: the `errors` script's "slow" rule waits 60 seconds and then prints "never shown", so "Waiting... never shown" is the finished answer, and the novice read it as a second failure and sent twice more. So the product recovered on the first click; the novice did not recognise it (script text H-31, the pill covering the newest message TH-24, UX-65, and the restart gave no progress text, UX-63). SEQ 4.
- **T25.2 novice: FAIL becomes PASS†.** The answer "two" in words (read from "Two comments, one of them a blocker") is the right number. The checker wants the digit "2" (`countWords` exists in `util.mjs` but T25.2 does not use it, H-25). The mixed formats ("Two comments" vs "Comments (2)") are a product finding (UX-77).
- **T27.2 novice and intermediate: PASS becomes FAIL†.** The scenario is "make the file use the whole window". The checker only looks for a hidden chat pane and an edge to bring it back. Both panelists hid the pane, then closed Changes, Git and Management one by one (3 of 3 steps) and the final screens show the file in a column about 320 px wide with an empty grey area to its right. The goal is not met and the panelists said so. The checker is too lax (H-26: it must also measure that the editor fills the window). The product cause is the fixed editor width (UX-75). Both at SEQ 4 and 5.
- **T29.1 novice and intermediate: PASS becomes INVALID†.** The panelists did the whole scenario (new tab, address, Enter, back to the first tab; both tabs kept). The checker passed on "2 tabs, first active". But the address in the scenario (`http://127.0.0.1:4173/second`) is not served in a session: the fixture page runs on a per-session port (33717 and similar), so the second page always shows `ERR_CONNECTION_REFUSED`. The task asked for "a second page", so the run does not test what it says (H-28, a leftover of H-08), and it cannot count as a pass. The friendly error page itself is the correct product behaviour; the advice text is a finding (TH-26, UX-69). Counted as not passed, rerun after H-28.
- **T28.2 novice: FAIL becomes PASS†; intermediate: FAIL stands.** Cause found by driving it: the "Agent is using this page" bar closes 8 seconds after the last announced action (`ACTIVITY_MS = 8000` in `BrowserApp.svelte`), and `browser_read` does not announce, so the `browser-slow` job (reads every 1.8 s) has no bar for most of its minute; the preset comment assumes 2.5 s (H-27). My own click on the bar's Take over, after the bar had gone, changed nothing (`userInControl` false); calling `desktop.setUserInControl` through the API set it true and the checker said PASS, so the button works and the click missed (F-006 predicted this). The intermediate's click is the same case: the bar vanished and the agent kept reading, so the goal "make the assistant leave it alone" was not reached (FAIL stands, TH-20). The novice never saw the bar, used "Pause all agents", the top bar said "Paused: no agent will act until you resume" and the turn was cancelled: the assistant left the page alone, which is the scenario, so PASS† (the checker only accepts `userInControl`, H-33). Weak: it stopped every agent, not one page.
- **T11.2 novice and intermediate: PASS stands.** `userInControl` is true after the "Ask before every action" checkbox; the checker note "all permission groups Ask: false" is about Run commands and Browser, which are "(off)" and cannot act. An off group needs no approval. The label mix ("asks" vs "off") is a finding (UX-61).
- **T11.3 novice: FAIL stands.** After "Resume agents" the bar said Idle, nothing continued, and the panelist waited and gave up after one step. Two causes: the product (UX-16's resume note and Continue button come from renderer memory only, and nothing restarts the stopped step) and the harness (the `paused-desktop` preset pauses through the API, so no note exists, H-35). A real user who pauses, closes the window and comes back meets the same screen. The checker is right.
- **T12.2 novice and intermediate: FAIL stands (product plus harness).** The assistant's refusal was found by both ("Drive E: is not plugged in on this desktop"). Neither could bring the folder back: "Plug in again" always greyed, no "Recently removed" list, the picker's Home empty and `/` unmapped, F1 text describing a list that never appears. Cause: `recentlyRemoved` is renderer memory filled only by the Eject command in that window, and `eject-mid-job` ejects through the API (H-35); the project lives in a random `/tmp` path that no place shortcut shows (H-32). A user on a real machine would see "Documents", but the "Recently removed" gap is real (TH-19). INVALID in round 1 (the native dialog was invisible); now a true FAIL.
- **T02.1 and T02.2 novice: FAIL stands.** The in-app dialog works (R1 UX-01) but the novice could not find `login-app` (tree: Home empty, `/` > home > user...), typed "login-app" (refused: "'login-app' is not a full folder path.") and a full path of a missing folder. Part harness (fixtures in `/tmp/a7ux-*/fixtures`, no shortcut leads there, H-32), part product (typed names refused, no recent folders, TH-18). The same-name task T02.2 additionally met the "(2)" offer that "breaks the task"; the round 1 decision stands that the task tests recovery from the refusal (the refusal is by design). The intermediate pass of T02.1 and T02.2 is carried and stale (H-41).
- **T03.1 novice: FAIL stands.** "Plug in a project..." added docs-site (files visible in the tree) and AutoPlay then opened; the novice chose "Take no action", reading the tree as "open". The task says "open it so that you can see the files": the tree does show files, so the reading is reasonable, but the success check (an Explorer window on the drive root) is the specified state and the scenario is not changed to pass (`tasks.md` rule). The intermediate passed (3 of 15). TH-18, UX-53.
- **T04.1 novice: FAIL stands.** The Code window's collapsed Chat strip opened the Chat pane ("Ask about what you are looking at. The conversation ends when you close this window."), and the novice stopped after one step, taking it for the conversation. The checker is right (a chat window with the login-app drive as folder). The intermediate found "Start a chat here" by right-click. UX-66.
- **T09.1 novice: PASS stands, weak.** The restore worked (Recycle Bin, "Restore this item"). In my run the start state shows "Changes (2)" and both files Modified after the harness reverted redirect.ts: the Changes list does not refresh when a change is reverted outside that pane (UX-79); the novice found the way back only from the revert box text they remembered. SEQ 4, 7 of 12.
- **T14.1 novice: PASS.** The waiting row was preselected when the launcher opened (recorded as the checker asks). The other three rows read "Idle", including the broken-agent desktop (UX-58).
- **T18.1-window novice: PASS stands, weak** (7 of 9, SEQ 4): window behind the chat, Show does nothing, taskbar button hides it (TH-30).
- **T06.1 novice, T08.2 novice, T27.1 both: PASS stands.** T06.1: the lines were not named in the moment (a note, the diff is inline). T08.2: the answer is right again, the novice read only the first row (as in round 1). T27.1: the question did not name `index.ts` (checker note) and the reply echoed the question (`aside` script, H-38).
- **T12.1 both: PASS.** Round 1 FAIL at novice and intermediate; round 2 both found Eject in the project tree's right-click menu in 2 steps (UX-03 worked). "Eject" is still a hardware word to the novice (UX-85).

## 3. Affinity map

Each theme: what happened, tasks and levels, root cause, backlog items (`FIX-BACKLOG-R2.md`). TH ids continue the round 1 list (TH-01 to TH-17).

### TH-18 Browse For Folder cannot find the user's project
- Novice T02.1 FAIL (19 of 18), T02.2 FAIL (gave up), T12.2 both levels, T03.1/T02.1 intermediate walked the tree. "Home looked empty", `/ > home > user`, typed `login-app` refused, a typed full path to a missing folder gets "may not exist, or you may not have permission".
- Root cause: the dialog lists the disk (Computer, Home, Documents, Desktop) but not the folders Agent7 already knows (`folders` table with `lastOpenedAt`); a typed bare name is rejected instead of resolved; harness fixtures sit in a random `/tmp` path (H-32).
- Items: UX-51, UX-53.

### TH-19 A removed project cannot be brought back
- T12.2 both levels FAIL: "Plug in again" greyed, no "Recently removed" list, Help describes a list that does not exist.
- Root cause: `recentlyRemoved` is renderer memory (`DesktopController`), filled only by the Eject command of that window; not filled by API ejects, other windows, or after a reconnect.
- Items: UX-52.

### TH-20 Resume, Take over and the agent bar give no feedback
- T11.3 novice FAIL (Resume returned to Idle, nothing continued). T28.2 intermediate FAIL (Take over: bar vanished, still Working, Activity grew), T28.2 novice found no bar and used Pause all agents.
- Root cause: the resume note comes from renderer memory; "Resume" does not restart anything; `userInControl` is a hidden flag with no status text; the Browser bar is timer-driven (8 s) and tool reads do not announce; Take over moves with the bar.
- Items: UX-59, UX-60, UX-68.

### TH-21 Main controls are hidden
- Adding a review comment works only from the line number (T26.2 both: five dead ends, novice 12 of 15, SEQ 4); "Start a chat here" only by right-click (T04.1); the collapsed "Chat" strip is small (T27.1, T19.1 novice); the Chats icon needs a double-click and shows no list (T04.2); the Send button of the comments sits inside a small panel (T26.1 novice).
- Root cause: affordances without visible controls, tiny edge strips, no hover cue.
- Items: UX-76, UX-66, UX-77, UX-70, UX-58.

### TH-22 Closing panels does not give the file room
- T27.2 FAIL both: editor stays about 320 px wide with a grey area; the chat collapse arrow is tiny and unlabelled; Changes list narrow (T08.2 novice maximized).
- Root cause: the editor has a fixed width inside the Code window; panel controls are separate and unlabelled.
- Items: UX-75, UX-79.

### TH-23 Keyboard-only path
- T21.1 both levels finished only by trial: no Ctrl+N, no New chat in menus, Ctrl+Esc by guess, Enter in Start does nothing before typing, Help takes no focus and ignores Esc, Deny is the initial focus (no hint for Allow).
- Root cause: no global shortcut table in the shell; Start menu activation by highlight missing; Help window not part of the focus model.
- Items: UX-57, UX-62, UX-80.

### TH-24 Failure recovery repeats and hides the cause
- T17.2 novice 9 of 9 (modal dialog covered Details; "Try again" kept the broken agent; Ctrl+N nothing); T23.1 novice sent three times; the pill covers the newest message.
- Root cause: error UI is a modal with fixed buttons, the retry reuses the failed agent, and nothing says why the second attempt ended.
- Items: UX-63, UX-65.

### TH-25 Top-bar chips and the Permissions page disagree
- T10.1 both ("Run commands (asks)" vs "Terminal (run commands)", "Read files (off)" vs Allow, click opens Control Center), T10.2, T11.2 ("asks" vs "off"), T16.1/T16.2 (chip not seen as clickable, covers column cut off), T19.1 (Browser with no suffix).
- Root cause: chips derive "(off)" from which apps are open, not from the policy; labels are not the Permissions row names; no tooltip.
- Items: UX-61, UX-67.

### TH-26 Error page advice and Help links
- T19.2 both: ERR_UNSAFE_PORT page says "check that your computer is online"; Refresh cannot help; the Help link lands on the manual top. T29.1 both: ERR_CONNECTION_REFUSED, no next step.
- Root cause: one list of hints for every error (`FAILURE_HINTS`); Help links have no section anchors.
- Items: UX-69, UX-80.

### TH-27 Changes and Git lists
- T24.1 novice: double-click opened login.ts instead of redirect.ts; "Git (3)" unexplained. T09.1: the Changes list stays stale after a revert elsewhere. T08.2: names cut, counts off screen.
- Root cause: list activation uses the wrong row; no live refresh event for reverts; fixed column widths.
- Items: UX-78, UX-79.

### TH-28 Technical agent and activity text
- T28.1 both: bar "Typing into [6]", reply "[10] listitem", "Used 28 tools". T27.1: echo reply (harness). T19.1: "No scripted rule matches" (harness).
- Root cause: labels built from element numbers and tool names; collapsed group has no plain summary; scripted agent replies (H-38, H-40).
- Items: UX-64, UX-71.

### TH-29 Help search and content
- T22.2 novice: result click does not open the section, text names no Revert button; T31.1 both: no heading for saving, new file not covered; T22.1: Help not seen as the place to ask; T02.2: Help opened behind the dialog; T31.2: typing in the Terminal gives no feedback.
- Root cause: search results are not links to sections, content lacks task headings, Help is not placed in front of dialogs.
- Items: UX-80, UX-81, UX-73.

### TH-30 Windows open behind, same names
- T18.1-window (7 of 9, SEQ 4), T18.2, T28.1 novice (chat behind the Browser), T19.2 novice (second Browser window instead of raising the failing one), T07.1 (same chat twice). The driver lists every window as "Agent7".
- Root cause: new and reopened windows are not raised; "Show" does not call a raise; icons always open a new window; OS window titles are all "Agent7".
- Items: UX-55, UX-56, UX-72.

### TH-31 Wording, number formats and small accessibility items
- "Two comments" vs "Comments (2)" (T25.2), "Minor" severity preselected with no explanation (T26.2), duplicate-name "(2)" suggestion (T02.2), AutoPlay wording (T03.1), "Eject" (T12.1), "C: drive" (T15.1), "Markdown document" and "Agent7 version" (T30.x), "Initialize Git here" (T24.2). axe: caption buttons 29x19 px, Browser tab strip, WordPad, Paint, Sticky Notes, Start menu role, Help links.
- Root cause: no number-format rule, no vocabulary table for these screens; kit hit areas below 24 px.
- Items: UX-54, UX-74, UX-77, UX-82, UX-83, UX-85.

## 4. Harness and checker defects

Fixes to `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process. Not product work. H-01 to H-22 are in `r1/SYNTHESIS.md`; the round 1 fixes H-02, H-03, H-06, H-07, H-10, H-12 and H-19 are in place in the code (`countWords`, `nameWords`, `helpInfo`, `userInControl or all Ask`).

| id | Where | Defect | Fix |
|---|---|---|---|
| H-23 | `checks/advanced.mjs` T21.1; `checks/util.mjs` `textOf`; `checks/features.mjs` T27.1 note | `textOf` joins every block; the first user message carries a `resource` block (`agent7://desktop/state`, JSON) so `^\s*hello\s*$` never matches. Reproduced in round 2: all keys right, check says FAIL. Same blind spot makes the T27.1 note "question:" empty. Probably also behind the round 1 T21.1 FAILs. | `userText(entry)` = only `kind: 'text'` blocks; use it for every user-message test. Add a unit test with a resource block. |
| H-24 | `checks/settings.mjs` T22.1, `tasks.md` T22.1 | Needs an open Help window; the scenario says "find out"; a tooltip is a valid answer (UX-11). | Pass when a Help window with topic `explorer` is open or the answer contains the tooltip meaning ("project folder", "drive", "see its files"); keep the Help route as the Min. |
| H-25 | `checks/features.mjs` T25.2, T24.1 | Keyword `'2'`; "two" fails. `countWords` exists but is not used here. T24.1 uses `'3'`. | Use `countWords(2)` and `countWords(3)` (digit or word) for every count. |
| H-26 | `checks/features.mjs` T27.2 | Passes when the pane is hidden and an edge exists; the goal is that the file fills the window. | Also read the editor's bounding box and require width at least 90 percent of the Code window client width; record the width in the note. |
| H-27 | `presets/features.mjs` `web-app-busy`, `scripts/browser-slow.json` | The script comment says the bar stays 2.5 s; the app keeps it 8 s from the last announce; `browser_read` does not announce, so the bar is gone for most of the minute and a novice never sees Take over. | Until UX-68 ships, add a click or scroll to every cycle of the script so the bar refreshes; assert the bar is visible at the start of the check. |
| H-28 | `tasks.md` T29.1, `tasks.mjs`, `checks/features.mjs` | The scenario address is `http://127.0.0.1:4173/second`; sessions serve the page on a per-session port, so the second page is refused. The checker never checks that the second page loaded. | Scenario `{TEST_PAGE_URL}second` (the facilitator substitutes, as for T19.1) and the server answers `/second`; the checker requires the second tab to have that URL and a non-error title. |
| H-29 | `FACILITATOR.md`, `PANELIST.md`, `session.mjs check` | Tasks with a question end in MANUAL because the facilitator did not pass `--answer` (T10.1 both, T16.2, T17.2, T19.1); some records have no explicit answer line. | The final report must contain `Answer: ...`; the facilitator passes it to `check --answer`; `check` warns when the task asks a question and `--answer` is missing. |
| H-30 | `session.mjs stop` | A session lost to an outage was archived with no `check.json` (T24.2): "no verdict". | `stop` refuses to archive without a `check.json` unless `--no-check`; on "no running session" print a restart hint and keep the folder. |
| H-31 | `agents/scripted-agent/scripts/errors.json` (rule `slow`), `presets/chat.mjs` `crashed-agent` | After a restart the same prompt waits 60 s and ends with the text "never shown"; the novice read the finished turn as a failure and sent three times. | A `crash-recovery` script: first turn "Working on it..." then crash; the retry ends in under 5 s with "Done. The slow job is finished." |
| H-32 | `lib/fixtures.mjs`, `presets/*` | `login-app`, `docs-site` and `notes-folder` live in `/tmp/a7ux-*/fixtures`; the in-app dialog lists Home, Documents, Desktop of the real user, so a panelist cannot find them (T02.1, T02.2, T03.1, T12.2). | Create the fixtures under a sandbox home (`<tmp>/home/Documents/login-app`, `.../docs-site`) and start the app with that `HOME` (and `USERPROFILE`) so "Documents" and "Home" show them. |
| H-33 | `checks/features.mjs` T28.2, `tasks.md` T28.2 | Accepts only `userInControl`; Pause all agents also makes the assistant leave the page alone (the novice's route). | Pass when `userInControl` or `paused` is true and no tool call completed in the last 3 s; record which control (log: click on the bar, the top bar or the taskbar). |
| H-34 | `presets/chat.mjs` `recycled-change`, `changes-to-review` | The revert is made through the API after the chat window opened, so the open Changes list is stale ("Changes (2)") and the novice cannot see the revert. | Revert before the windows open, or reload the window; keep a note "revert shown in the list" as a start-state check. |
| H-35 | `presets/chat.mjs` `eject-mid-job`, `paused-desktop` | Both act through the API: the eject never reaches the renderer's `recentlyRemoved`, the pause never reaches `stoppedByPause`. The panel cannot tell a harness gap from a product gap. | After UX-52 and UX-59 persist these in main, the presets work as they are; until then drive the UI path (Eject command, the Pause button) in the preset. |
| H-36 | `PANELIST.md`, `FACILITATOR.md` | Panelists stop early (T08.2 novice after 3 steps, T11.3 novice after 1, T04.1 novice after 1); SEQ ratings of 2 after 2-step passes (T30.1, T30.2, T31.1) contradict the record. | Add: "Before the final report, re-read the scenario and name each part you did"; "Give the SEQ with one sentence why". Flag SEQ values that differ by 3 or more from the frustrations list. |
| H-37 | `tasks.md` T21.1 | Min 12 and budget 36 assume no shortcut; with Ctrl+N (UX-57) Min is 6. | Min 6, budget 18 novice and 18 intermediate after UX-57; until then keep 36. |
| H-38 | `agents/scripted-agent/scripts/aside.json`, `checks/features.mjs` T27.1 | The `aside` script echoes the question ("Short answer: Please explain..."); the question is not checked to name `index.ts`. | A reply that explains lines 1 and 2 of the open file; require the question to contain a line number or "index.ts" or accept a quoted selection in the user message. |
| H-39 | `tasks.md` T14.1, `presets/desktops.mjs` | The scenario never asks about the error desktop, so the error row is untested; the launcher shows "Idle" for it. | Scenario "...find the one that is waiting for you and open it, and tell me which workspace has a problem" (after UX-58); the checker requires the name in the answer. |
| H-40 | `scripts/browser-agent.json`, `tasks.mjs` T19.1 | The script answers any other prompt with "No scripted rule matches 'Summarise this page'." and the scenario's success depends on "the assistant can read it", which no screen confirms. | Add a fallback reply "I can read the page that is open in the Browser."; add a rule for "summar" that calls `browser_read` and reports the title; the checker verifies that a `browser_read` call happened after the page loaded. |
| H-41 | `process.md`, this file | Carried intermediate rows whose start state or stub changed (T02.1, T02.2, T12.2) are not evidence. | Rule: a carried row is valid only when neither the start state, the checker nor the journey code changed; otherwise rerun. |
| H-42 | `checks/settings.mjs` T17.2, `tasks.md` T17.2 | The check asks for the wrong command and the Agents page but not for what to do ("tell me what to do"); a panelist who only describes the cause passes. | Keywords: cause group + one of `edit|change|choose another|set as default|new chat`; the final report needs an `Answer:` line (H-29). |
| H-43 | `ux.mjs windows`, `session.mjs` | Every window is listed as "Agent7"; panelists switched to the wrong window (T18.1-window, T28.1). | Print the window URL kind (launcher, desktop) in the list; after UX-56 the titles differ. |
| H-44 | `tasks.md` T06.1, T08.2 | "Names the changed lines" and "look at every line" are not enforced; both pass without them. | Make the answer part of the scenario ("tell me which lines changed") and check it with keywords. |
| H-45 | `axe-scan.mjs` | The "UAC dialog" state timed out (`locator.waitFor`), so the dialog is not scanned. | Trigger a pending request with a `fix-redirect` chat before the scan and wait for `[data-testid=uac-dialog]`. |
| H-46 | `session.mjs check` | A pass at the budget limit or with SEQ below 5 prints only PASS (T17.2 novice 9 of 9, T27.2 3 of 3, T01.1 3 of 3). | Print "weak pass: at the budget limit" and write `weak: true` in `check.json`. |

## 5. What the gate needs next

1. Fix H-23 to H-46 (a day of harness work) and re-judge T21.1, T22.1, T24.2, T25.2, T28.2 with the fixed checkers; most of these flip to PASS without a product change.
2. Product: the four packages of `FIX-BACKLOG-R2.md`; the items that move the most failed tasks are UX-51 and UX-52 (T02.1, T02.2, T12.2), UX-59 and UX-60 (T11.3, T28.2), UX-75 (T27.2), UX-66 and UX-53 (T04.1, T03.1), UX-70 (T19.1).
3. Rerun with fresh panelists at novice and intermediate level: every FAIL, INVALID and weak row, the stale carried rows, then the full pass on the packaged build. The novice median SEQ (5) is the second blocker: the 21 novice tasks at SEQ 4 or below are mostly the same themes (TH-18, TH-19, TH-20, TH-21, TH-29, TH-30).
