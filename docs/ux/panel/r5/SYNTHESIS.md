# Panel round 5: synthesis

Lead UX researcher. Sources: `docs/ux/panel/r5/*.md` (120 records: 60 novice and 60 intermediate, the second full pass at both levels; no expert tier), the session folders `/tmp/ux-sessions/r5/<task>-<level>/` (`log.jsonl`, `check.json`, `state.json`, `shots/`), `panel/r4/SYNTHESIS.md` (method and format), `FIX-BACKLOG-R4.md` (UX-114 to UX-137, shipped in PR #12), the checkers in `scripts/ux-panel`, the product source (`src/`) where a record needed a cause, `scripts/check-help-coverage.mjs` (run now: 514 ids found, all documented; R4 had 500) and the axe result `axe.json` of the scratchpad. I did not drive the app: every decision rests on the shots, `check.json`, `state.json`, the logs and the code. I viewed 37 screenshots to verify the claims I rely on (named below). Next steps: `docs/ux/FIX-BACKLOG-R5.md` and `docs/ux/scorecard.md`.

Only novice (Haiku) and intermediate (Sonnet) count for the pass rates, the median SEQ and the release gate.

**Severity** uses the rubric scale: S1 blocker, S2 major, S3 minor, S4 cosmetic. Round 5 findings are themes TH-70 to TH-91 and backlog items UX-138 to UX-157. The older theme TH-49 (UX-114) keeps its number.

**Three facts from the facilitator that shape every decision below.**
1. **UX-114 was fixed after the panel ran.** R5 still shows "Agent7 cannot read E:\src\auth\redirect.ts, so it cannot show what changes." in T05.1, T06.1 and T07.1 at both levels (and in the T21.1 box for NOTE.md). The cause was found afterwards: the AG-UI thread state never received the old text that the broker read (fix in `AguiThread`, `AguiRunCoordinator` and `SessionStateModel`, a regression unit test and `e2e/permission-diff.e2e.ts`). I treat UX-114 as **fixed, awaiting re-verification**: it is not in the R5 backlog as a product defect, and no cell that it caps is raised (2.3).
2. **Panelists ran batches of 10 tasks in one context** (H-69 again). I decide in 2.2 how much that weakens the evidence.
3. **T23.1-twice now starts** (the R4 SETUP FAIL is gone). It passes at both levels. The novice pass is weak (SEQ 4).

## Records read, missing and carried

- **Novice:** 60 records and 60 `check.json` files, one per task row of `tasks.md` (T01.1 to T31.2, T18.1 with three variants, and T23.1b, which the session folders still call `T23.1-twice`). Nothing is missing.
- **Intermediate:** 60 records and 60 `check.json` files. Nothing is carried from an earlier round: R5 is a full pass at both levels, so every row is current evidence (H-41). The facilitator's R4 harness fixes H-65, H-67, H-70, H-71, H-72 and H-73 are visible as working (T23.1-twice runs, `check.json.runs` lists every run, T11.2 prints "take over: userInControl true", the browser script ends "I sent the message and found it in #general.", SEQ in every `check.json` equals the SEQ of its record in all 120 rows, the T14.1 start row is "Scratch pad", not the waiting row).
- **SEQ.** All 120 record values equal `check.json` (H-72 fixed). Seven intermediate records (T18.1-sidebar, T18.1-window, T18.2, T19.1, T19.2, T20.1, T20.2) lack the "Steps: N of M" text in the Result line; the numbers are in `check.json` (H-83).
- **Weak pass** (as in R3 and R4): a PASS with SEQ below 5, or with steps at the budget. Budgets are right: novice budgets are 4 times Min (T01.1 4, T06.1 4, T02.1 24, T17.1 32).
- **Clean PASS** = PASS, SEQ 5 or more, steps under budget, one check run, no MANUAL. Everything else is decided in 2.1.

## 1. Results matrix

Cell = verdict, steps used / budget, then SEQ. `†` = researcher decision overrides the checker (reasons in section 2). `weak` = SEQ below 5. `OVER` = more steps than the budget. R4, R3, R2 and R1 cells are copied from `panel/r4/SYNTHESIS.md` (`carried` = not re-run that round; the R1 intermediate pass covered T01.1 to T17.1 only). The R5 cell of T23.1-twice is the first valid run of that row.

### Novice (Haiku)
| Task | R5 | R4 | R3 | R2 | R1 |
|---|---|---|---|---|---|
| T01.1 Find the start | PASS 1/4 · 7 | PASS 3/4 · 6 | PASS 2/4 · 5 | PASS 1/3 · 6 | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 6/24 · 6 | PASS 6/24 · 6 | FAIL 6/24 · 4 | FAIL 19/18 · 2 OVER | PASS 6/18 |
| T02.2 Name already used | PASS 8/28 · 6 | PASS† 8/28 · 5 | PASS† 9/28 · 5 | FAIL 10/21 · 2 | PASS† 8/21 |
| T03.1 Add another folder | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS weak 5/20 · 4 | FAIL 3/15 · 4 | FAIL 14/15 |
| T04.1 Chat about one folder | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS 2/16 · 6 | FAIL 1/12 · 4 | FAIL 6/12 |
| T04.2 Closed conversation back | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/12 · 5 | PASS 4/12 · 5 | PASS weak 4/12 · 4 | PASS 4/9 · 5 | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/4 · 7 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | PASS 1/3 |
| T06.1 Allow after reading | FAIL OVER 5/4 · 5 | PASS weak at limit 4/4 · 4 | PASS 1/4 · 5 | PASS 1/3 · 5 | PASS 1/6 |
| T06.2 Deny | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 5 | PASS 1/3 · 6 | PASS 1/3 |
| T06.3 Make it ask first | PASS 7/24 · 5 | PASS 8/24 · 5 | PASS 7/24 · 5 | PASS 7/18 · 5 | no record |
| T07.1 Answer what is waiting | PASS weak 6/20 · 4 | PASS 2/20 · 5 | PASS weak 2/20 · 4 | PASS 2/15 · 5 | PASS 2/15 |
| T08.1 Undo one file | PASS 4/20 · 6 | PASS 4/20 · 5 | PASS weak 4/20 · 4 | PASS 4/15 · 5 | PASS 4/15 |
| T08.2 Review everything | PASS 4/24 · 5 | PASS 4/24 · 5 | PASS weak 6/24 · 4 | PASS 3/18 · 5 | PASS† 2/18 |
| T09.1 Get it back | PASS 4/16 · 5 | PASS 4/16 · 5 | PASS weak 3/16 · 4 | PASS 7/12 · 4 | PASS 4/12 |
| T10.1 Take away the command line | PASS 4/10 · 6 | PASS 5/10 · 5 | PASS weak 4/10 · 3 | PASS† 4/8 · 5 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/3 · 6 | PASS 0/3 |
| T11.1 Hold on | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | FAIL 1/3 |
| T11.2 Approve every step | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS weak 1/12 · 4 | PASS 1/9 · 6 | FAIL 9/9 at limit |
| T11.3 Carry on after a pause | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS weak 1/12 · 3 | FAIL 1/9 · 3 | PASS 4/9 |
| T12.1 Take the project away | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 5 | PASS 2/6 · 6 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 3/24 · 6 | PASS 2/24 · 7 | PASS 2/24 · 6 | FAIL 7/18 · 2 | INVALID (harness)† 5/18 |
| T13.1 Leave it running | PASS 2/12 · 5 | PASS 2/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 3/9 |
| T13.2 You were called back | PASS 3/16 · 6 | PASS 2/16 · 5 | PASS 3/16 · 5 | PASS 2/12 · 6 | PASS 2/12 |
| T14.1 Which one needs me? | PASS 2/8 · 6 | PASS 2/8 · 6 | INVALID† 2/8 · 5 | PASS 2/6 · 6 | PASS† 2/6 |
| T14.2 Rename | PASS 4/12 · 6 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/9 |
| T15.1 Throw one away | PASS 3/12 · 5 | PASS 2/12 · 6 | PASS 2/12 · 5 | PASS 2/9 · 6 | PASS† 3/9 |
| T16.1 Stop it editing by itself | PASS 6/20 · 6 | PASS 4/20 · 5 | PASS 4/20 · 5 | PASS 4/15 · 5 | PASS 5/15 |
| T16.2 What a setting covers | PASS 3/16 · 5 | PASS† weak 2/16 · 4 | PASS† 2/16 · 5 | PASS† 2/12 · 5 | PASS 2/12 |
| T17.1 Use a different assistant | PASS 7/32 · 6 | PASS 8/32 · 5 | PASS 7/32 · 5 | PASS 7/24 · 6 | PASS 10/24 |
| T17.2 It does not start | PASS 5/12 · 5 | PASS 4/12 · 6 | PASS 1/12 · 6 | PASS† 9/9 · 3 at limit | FAIL 10/12 |
| T18.1-inline Form, inline | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/12 |
| T18.1-sidebar Form, sidebar | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 10/12 |
| T18.1-window Form, window | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 7/9 · 4 | PASS 3/12 |
| T18.2 A window you closed | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 6 | PASS 1/6 · 7 | PASS 1/8 |
| T19.1 Look at a web page | PASS 6/16 · 6 | PASS 6/16 · 6 | INVALID† 4/16 · 4 | FAIL† 10/12 · 5 | FAIL 10/16 |
| T19.2 No network | PASS 3/12 · 5 | PASS 1/12 · 6 | PASS† 0/12 · 5 | PASS 5/9 · 5 | PASS 9/12 |
| T20.1 Why was it refused? | PASS 2/20 · 6 | PASS weak 5/20 · 4 | PASS† weak 16/20 · 3 | PASS 6/15 · 5 | PASS 5/20 |
| T20.2 Stuck assistant | PASS 4/16 · 5 | PASS 5/16 · 6 | PASS 5/16 · 5 | PASS 5/12 · 5 | PASS 7/16 |
| T21.1 No mouse | PASS 4/16 · 6 | PASS 4/18 · 5 | PASS 5/18 · 5 | PASS† 19/36 · 6 | FAIL 19/48 |
| T22.1 Ask for help | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS† 3/8 · 6 | PASS† 1/6 · 2 | FAIL 9/8 **OVER +1** |
| T22.2 Find a topic by search | PASS 5/16 · 6 | PASS 5/16 · 6 | PASS 9/16 · 5 | PASS 8/12 · 4 | PASS† 7/16 |
| T23.1 It crashed | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 5/12 · 4 | PASS 3/16 |
| T23.2 Connection dropped | PASS 1/12 · 6 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 7/12 |
| T24.1 What changed in git | PASS 3/20 · 6 | PASS 2/20 · 6 | PASS† 4/20 · 5 | PASS 4/15 · 5 | PASS 6/20 |
| T24.2 Not a Git project | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 1/12 · 6 | PASS 1/16 |
| T25.1 The blocking comment | PASS 0/12 · 6 | PASS 2/12 · 6 | PASS 1/12 · 6 | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 0/8 · 6 | PASS 0/8 · 7 | PASS 0/8 · 7 | PASS† 0/6 · 6 | not run |
| T26.1 Pass the remarks on | PASS 2/16 · 6 | PASS 2/16 · 5 | PASS 3/16 · 6 | PASS 4/12 · 6 | not run |
| T26.2 Your own remark | PASS 5/20 · 6 | PASS 5/20 · 5 | PASS 4/20 · 6 | PASS 12/15 · 4 | not run |
| T27.1 Explain these lines | PASS 4/12 · 5 | PASS 3/12 · 6 | PASS 4/12 · 6 | PASS 4/9 · 5 | not run |
| T27.2 More room for the file | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 3/4 · 6 | FAIL† 3/3 · 4 at limit | not run |
| T28.1 Assistant reads a web page | PASS 4/12 · 5 | PASS 4/12 · 6 | PASS 3/12 · 6 | PASS 4/9 · 4 | not run |
| T28.2 Take back the page | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 1/4 · 7 | PASS† 1/3 · 4 | not run |
| T29.1 Two pages side by side | PASS 5/20 · 6 | PASS 5/20 · 7 | PASS† 5/20 · 5 | INVALID† 6/15 · 3 | not run |
| T30.1 Open a file from the list | PASS 3/16 · 6 | PASS 3/16 · 6 | PASS 2/16 · 7 | PASS 2/12 · 2 | not run |
| T30.2 Which version? | PASS 3/8 · 7 | PASS 3/8 · 6 | PASS 4/8 · 5 | PASS 2/6 · 2 | not run |
| T31.1 How do I save? | PASS 2/8 · 6 | PASS 1/8 · 7 | PASS 2/8 · 6 | PASS 2/6 · 2 | not run |
| T31.2 Why can I not type here? | PASS 3/8 · 6 | PASS 2/8 · 6 | PASS 3/8 · 6 | PASS 4/6 · 3 | not run |
| T23.1-twice Crash twice (T23.1b in tasks.md) | PASS weak 4/12 · 4 | INVALID† SETUP FAIL 0/16 · n/a | not run | not run | not run |

### Intermediate (Sonnet)
| Task | R5 | R4 | R3 | R2 | R1 |
|---|---|---|---|---|---|
| T01.1 Find the start | PASS 2/3 · 6 | PASS at limit 3/3 · 6 | carried | PASS 3/3 · 6 (carried) at limit | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 6/18 · 7 | PASS 7/18 · 6 | PASS 8/18 · 7 | PASS 7/18 · 6 (carried) | PASS 7/18 |
| T02.2 Name already used | PASS† 9/21 · 6 | PASS 8/21 · 7 | PASS† 9/21 · 6 | PASS† 8/21 · 6 (carried) | PASS† 8/21 |
| T03.1 Add another folder | PASS 7/15 · 5 | PASS 5/15 · 6 | PASS 5/15 · 7 | PASS 3/15 · 6 | PASS 5/15 |
| T04.1 Chat about one folder | PASS 1/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 5/12 |
| T04.2 Closed conversation back | PASS 1/9 · 7 | PASS 1/9 · 7 | carried | PASS 1/9 · 7 (carried) | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/9 · 6 | PASS 4/9 · 6 | carried | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/3 · 7 | PASS 1/3 · 7 | carried | PASS 1/3 · 7 (carried) | PASS 1/3 |
| T06.1 Allow after reading | FAIL† 2/3 · 5 | PASS at limit 3/3 · 5 | carried | PASS 1/6 · 6 (carried) | PASS 1/6 |
| T06.2 Deny | PASS 1/3 · 7 | PASS 1/3 · 7 | carried | PASS 1/3 · 6 (carried) | PASS 1/3 |
| T06.3 Make it ask first | PASS 8/18 · 7 | PASS 10/18 · 5 | carried | PASS 9/18 · 5 (carried) | PASS 9/18 |
| T07.1 Answer what is waiting | PASS 2/15 · 7 | PASS 2/15 · 7 | carried | PASS 3/15 · 6 (carried) | PASS 3/15 |
| T08.1 Undo one file | PASS 4/15 · 7 | PASS 4/15 · 6 | carried | PASS 4/15 · 6 (carried) | PASS 4/15 |
| T08.2 Review everything | PASS 6/18 · 5 | PASS 7/18 · 5 | carried | PASS 6/18 · 5 (carried) | PASS 6/18 |
| T09.1 Get it back | PASS 3/12 · 7 | PASS 4/12 · 6 | carried | PASS 3/12 · 7 (carried) | PASS 3/12 |
| T10.1 Take away the command line | PASS 4/8 · 7 | PASS 5/8 · 5 | carried | PASS† 4/8 · 6 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 0/3 · 7 | PASS 0/3 · 7 | carried | PASS 0/3 · 7 (carried) | PASS 0/3 |
| T11.1 Hold on | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 |
| T11.2 Approve every step | PASS 1/9 · 6 | PASS 1/9 · 6 | PASS 1/9 · 7 | PASS 1/9 · 6 | FAIL 8/9 |
| T11.3 Carry on after a pause | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T12.1 Take the project away | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | FAIL 14/18 · 2 | INVALID (harness)† 16/18 |
| T13.1 Leave it running | PASS 2/9 · 6 | PASS 2/9 · 7 | carried | PASS† 2/9 · 6 (carried) | PASS† 2/9 |
| T13.2 You were called back | PASS 2/12 · 7 | PASS 2/12 · 6 | carried | PASS 2/12 · 7 (carried) | PASS 2/12 |
| T14.1 Which one needs me? | PASS 1/6 · 7 | PASS 1/6 · 6 | carried | PASS† 1/6 · 7 (carried) | PASS† 1/6 |
| T14.2 Rename | PASS 4/9 · 7 | PASS 4/9 · 7 | carried | PASS 4/9 · 7 (carried) | PASS 4/9 |
| T15.1 Throw one away | PASS 3/9 · 7 | PASS 3/9 · 7 | carried | PASS 3/9 · 7 (carried) | PASS 3/9 |
| T16.1 Stop it editing by itself | PASS 7/15 · 6 | PASS 4/15 · 6 | carried | PASS 6/15 · 6 (carried) | PASS 6/15 |
| T16.2 What a setting covers | PASS 2/12 · 7 | PASS† 4/12 · 5 | carried | PASS 3/12 · 6 (carried) | PASS 3/12 |
| T17.1 Use a different assistant | PASS 7/24 · 7 | PASS 7/24 · 6 | carried | PASS 10/24 · 6 (carried) | PASS 10/24 |
| T17.2 It does not start | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | pending |
| T18.1-inline Form, inline | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 5/9 · 6 (carried) | pending |
| T18.1-sidebar Form, sidebar | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 4/9 · 7 (carried) | pending |
| T18.1-window Form, window | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 4/9 · 7 (carried) | pending |
| T18.2 A window you closed | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 (carried) | pending |
| T19.1 Look at a web page | PASS 6/12 · 7 | PASS 6/12 · 6 | INVALID† 4/12 · 5 | PASS† 7/12 · 5 | pending |
| T19.2 No network | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 2/9 · 5 | pending |
| T20.1 Why was it refused? | PASS 2/15 · 7 | PASS weak 7/15 · 4 | carried | PASS 5/15 · 6 (carried) | pending |
| T20.2 Stuck assistant | PASS 6/12 · 6 | PASS 5/12 · 6 | carried | PASS 5/12 · 6 (carried) | pending |
| T21.1 No mouse | PASS 4/12 · 7 | PASS 4/18 · 6 | PASS 4/18 · 6 | PASS† 18/36 · 4 | pending |
| T22.1 Ask for help | PASS 2/6 · 7 | PASS† 2/6 · 7 | PASS† 2/6 · 7 | PASS 2/6 · 7 | pending |
| T22.2 Find a topic by search | PASS 5/12 · 7 | PASS 2/12 · 7 | carried | PASS 5/12 · 7 | pending |
| T23.1 It crashed | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 5 | PASS 8/12 · 5 (carried) | pending |
| T23.2 Connection dropped | PASS 1/9 · 7 | PASS 1/9 · 7 | carried | PASS 5/9 · 5 (carried) | pending |
| T24.1 What changed in git | PASS 3/15 · 6 | PASS 2/15 · 7 | carried | PASS 5/15 · 6 (carried) | pending |
| T24.2 Not a Git project | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 7 (carried) | pending |
| T25.1 The blocking comment | PASS 0/9 · 7 | PASS 0/9 · 7 | carried | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 0/6 · 7 | PASS 0/6 · 7 | carried | PASS 0/6 · 7 | not run |
| T26.1 Pass the remarks on | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 3/12 · 7 | not run |
| T26.2 Your own remark | PASS 4/15 · 7 | PASS 3/15 · 6 | PASS 4/15 · 5 | PASS 7/15 · 5 | not run |
| T27.1 Explain these lines | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 3/9 · 6 | PASS 3/9 · 7 | not run |
| T27.2 More room for the file | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 4 | FAIL† 3/3 · 5 at limit | not run |
| T28.1 Assistant reads a web page | PASS 3/9 · 7 | PASS 4/9 · 6 | PASS 4/9 · 6 | PASS 3/9 · 6 | not run |
| T28.2 Take back the page | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 3 | not run |
| T29.1 Two pages side by side | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS† 5/15 · 7 | INVALID† 5/15 · 6 | not run |
| T30.1 Open a file from the list | PASS 3/12 · 7 | PASS 3/12 · 6 | carried | PASS 3/12 · 7 | not run |
| T30.2 Which version? | PASS 2/6 · 7 | PASS 3/6 · 7 | carried | PASS 2/6 · 7 | not run |
| T31.1 How do I save? | PASS 2/6 · 7 | PASS 1/6 · 7 | carried | PASS 3/6 · 6 | not run |
| T31.2 Why can I not type here? | PASS 2/6 · 7 | PASS 2/6 · 7 | carried | PASS 3/6 · 7 | not run |
| T23.1-twice Crash twice (T23.1b in tasks.md) | PASS 3/9 · 6 | INVALID† SETUP FAIL 0/12 · n/a | not run | not run | not run |

### Totals after researcher decisions

| Level | Rows | PASS | FAIL | INVALID | Pass rate (INVALID counts as not passed) | Raw checker PASS (before decisions) | Median SEQ | Tasks with SEQ below 5 | Weak passes |
|---|---|---|---|---|---|---|---|---|---|
| **Novice R5**, 60 rows (all in `tasks.md`) | 60 | 59 | 1 (T06.1, budget) | 0 | **98%** | 59 of 60 (98%) | **6** | 2 | 2 |
| Novice R5, without T23.1b (the 59 rows of R4) | 59 | 58 | 1 | 0 | 98% | 58 of 59 | 6 | 1 | 1 |
| Novice R4, with the extra row | 60 | 59 | 0 | 1 | 98% | 57 of 60 (95%) | 6 | 3 | 3 |
| Novice R4, the 59 rows of `tasks.md` | 59 | 59 (2 with †) | 0 | 0 | 100% | 57 of 59 (97%); 2 MANUAL | 6 | 3 | 3 |
| Novice R3 | 59 | 56 (7 with †) | 1 | 2 | 95% | 50 of 59 (85%) | 5 | 12 | 10 |
| Novice R2 | 59 | 50 | 8 | 1 | 85% | 44 of 59 (75%) | 5 | 21 | |
| Novice R1 | 45 | 34 | 10 | 1 | 76% | 27 of 45 (60%) | 4 | 27 | |
| **Intermediate R5**, 60 rows (all re-run) | 60 | 59 (1 with †) | 1 (T06.1, answer †) | 0 | **98%** | 59 of 60 (98%); 1 MANUAL (T02.2) | **7** | 0 | 0 |
| Intermediate R5, without T23.1b | 59 | 58 | 1 | 0 | 98% | 58 of 59 | 7 | 0 | 0 |
| Intermediate R4, with T23.1-twice | 60 | 59 | 0 | 1 | 98% | 57 of 60 (95%) | 7 | 1 | 3 |
| Intermediate R4, the 59 rows | 59 | 59 (2 with †) | 0 | 0 | 100% | 57 of 59 (97%); 2 MANUAL | 7 | 1 | 3 |
| Intermediate R3, all rows (27 re-run and 32 carried) | 59 | 57 | 1 | 1 | 97% | not recomputed | 7 | 1 | 0 |
| Intermediate R2, all rows | 59 | 55 | 3 | 1 | 93% | 21 of 26 re-run (81%) | 6 | 3 | |
| Intermediate R1 | 46 | 40 | 5 | 1 | 87% | not recomputed | 6 | 8 | |

**Median SEQ** over the rating of each record (all 60 rows): novice **6** (mean 5.87; 9 rows at 7, 36 at 6, 13 at 5, 2 at 4), intermediate **7** (mean 6.75; 48 at 7, 9 at 6, 3 at 5, none below 5). R4 was novice 6 (mean 5.9; 14 at 7, 28 at 6, 14 at 5, 3 at 4) and intermediate 7 (mean 6.5). Both medians hold. **The pass rate falls by one row at each level (100% to 98%): T06.1 fails at both levels**, for the same cause (the box could not show the lines, UX-114, pre-fix build). Counting T06.1 as a pass would give 60 of 60 at both levels.

**Robustness against H-69.** I recomputed the medians without the 16 records whose text discloses knowledge from an earlier task of the same batch (list in 2.2): novice 6 (46 rows, mean 5.83), intermediate 7 (58 rows, mean 6.74). The medians do not depend on the carried-over rows.

**Weak passes and non-clean rows.** Weak (counted as PASS, the margin is thin): novice T07.1 (SEQ 4, one request allowed without being read) and T23.1b (SEQ 4, Restart dropped the request silently). Intermediate: none. R4 had three at each level. Rows that were SEQ 4 or lower at novice in R4 (T06.1, T16.2, T20.1) are now 5, 5 and 6. The R4 rows that were MANUAL or SETUP FAIL (T16.2 both, T22.1 I, T02.2 N, T23.1-twice both) all end PASS. Rows that were FAIL or INVALID in R3 stay PASS.

**Release gate** (`process.md`, without the expert tier; the fresh-panelist, packaged-build clause has not been met by any round):

| Gate | Novice | Intermediate | Met |
|---|---|---|---|
| All tasks pass | 59 of 60 (T06.1 FAIL) | 59 of 60 (T06.1 FAIL†) | **No.** T06.1 fails at both levels, in the build that still had UX-114. It is expected to pass after the re-verification. |
| Median SEQ at least 6 | 6 | 7 | **Yes** at both levels (R4 also yes). |
| No task below 5 (R3 working rule, not in `process.md`) | 2 tasks at 4 (T07.1, T23.1b) | none | **No** at novice. |
| Fresh panelists, packaged build (`process.md` 10) | batches of 10 in one context (H-69) | same | **No.** The records do not say that the build was the packaged one. |
| Every journey 10/10 (`scorecard.md`) | | | **No: 0 of 31.** |

**The gate is not met.** The panel part is as close as in R4 (98% at both levels, medians 6 and 7) and one product cause (UX-114) explains the lost row at each level. What blocks the gate: one failed task that waits for a re-verification of UX-114; two novice tasks at SEQ 4; 18 open S3 items and two S4 items in `FIX-BACKLOG-R5.md`; no S4 accepted; D5 (the axe scan found one violation, now fixed in code and not re-scanned; the manual checklist and the screen reader pass are not done); D10 (no reference-machine run); and evidence that is not fresh (H-69, no packaged-build record).

What changed since round 4. **Fixed and confirmed in the shots:** T14.1 (the preselected row is "Scratch pad", so both panelists had to read the rows, shot T14.1-novice 001), T20.1 (the Activity gadget has an "Event Viewer" link; both panelists in two actions, SEQ 6 and 7), T26.2 (the gutter "+" is visible and opened a labelled box at the first click, shot T26.1-novice 008), T23.1-twice (the box reads "It stopped again" and offers "Start a new chat", shot T23.1-twice-novice 001), T09.1 (a reverted file keeps "Reverted. Restore from the Recycle Bin." and "Open Recycle Bin" after the window reopens, shot T09.1-novice 002; UX-117), Control Center permissions (window about 750 x 520, list 4.5 rows high, fixed footer, no overlapping header, shots T06.3-novice 002 and T16.1-novice 016; UX-115), chips against banner (T11.2 both: "Read files: Ask" to "Run commands: Ask (no Terminal open)", the banner agrees; UX-118), the chat no longer covers the Browser (T28.1 shots: the chat sits to the right of the Browser; UX-120), the Review banner is no longer cut ("Two comments, one of them a blocker." wraps, shot T25.1-intermediate 001; UX-131), the tab "Second page" is whole (T29.1 novice), "Select an agent first" explains the greyed buttons of the Agents page (shot T17.2-intermediate 002; part of UX-127). **Not fixed or fixed in part:** the permission box (UX-114, pre-fix build), the Changes list (UX-116: four rows, cut names, and now a revert notice that squeezes the list to a sliver, shots T08.1-intermediate 005 and T09.1-novice 002), the launcher (UX-119: still in front after Create, shot T01.1-intermediate 003), "Working: Starting the agent..." (UX-125: shots T06.3-novice 002 and T24.1-intermediate 004), the yellow Browser bar (UX-128: still there after the turn, shot T28.1-intermediate 005) and the Help window (UX-132: opens partly off-screen and partway down, shots T31.2-intermediate 002 and T31.1 records).

## 2. Researcher decisions

### 2.1 Every verdict that is not a clean PASS

| Cell | Checker said | Decision | Reason |
|---|---|---|---|
| T06.1 novice | FAIL: 5 steps of 4 (state ok: Allow answered, `redirect.ts` holds the fix; answer ok; nearMiss) | **FAIL (budget), cause is the product** | The budget rule has not changed since R1 (R1 T22.1 9 of 8 FAIL, R2 T02.1 19 of 18 FAIL) and a scenario is never changed to make it pass. The log shows the five actions: scroll in the box, Allow, Changes, select the file, scroll in the diff (`log.jsonl`; the `wait` is not a step). The panelist did not count the two scrolls (their record says so), which is H-81, but that does not change the result. The cause of the lost steps is UX-114: the box said it could not show the change, so the first scroll (shot 002) looked for lines that were not there and the answer came from the Changes diff (shot 006: `@@ -1,5 +1,5 @@`, +3 / -3, lines 1, 3 and 4). The answer ("lines 1, 3 and 4 ... the comment on line 1, and lines 3 and 4") is right. A near miss, not a panelist failure. T06.1 is rerun after the UX-114 re-verification; with the lines in the box the Min of 1 is real. Not counted as a pass in the meantime. |
| T06.1 intermediate | PASS: 2 of 3, SEQ 5, answer ok | **FAIL† (checker false positive, H-77)** | The success check says the answer "must name lines 1, 3 and 4, or +3 and -3" (H-74). The answer reads: "The box could not say which lines change ... It only showed the new code, lines 1 to 5". It does not name the changed lines: it says it could not tell. `numbersIn` expands "1 to 5" to 1 2 3 4 5, so the line numbers 3 and 4 were credited and the check passed. The panelist had one action left (Changes) and did not use it. The state is right, but the task asks "tell me which lines it changes" and that was not answered. The honest answer of the panelist is also the product finding of TH-49. Not counted as a pass. |
| T02.2 intermediate | MANUAL: state ok (two desktops, names differ, `docs-site` plugged in); `--no-answer` by mistake | **PASS†** | The reason is in the record ("A desktop named 'Fix login redirect' already exists. Each desktop needs its own name so that you can tell them apart.") and shot 003 shows exactly that text with the link "Use 'Fix login redirect (2)'" and Create greyed. 9 of 21, SEQ 6. The wrong click (the "Projects you used before" group moved the rows) is a layout note, not a defect: the group appears once a folder was used before. H-82 (H-68 is still not in). |
| T02.2 novice, T10.1 novice | run 1 MANUAL (`--no-answer`), run 2 PASS with the answer | **PASS** | `check.json.runs` lists both runs and the reason differs only by the missing answer (H-67 works). T02.2: the answer matches shot 003 text. T10.1: the proof (chip "Run commands: Deny" and the row "Deny: never runs.") is in shot 005. |
| T07.1 novice | PASS: 6 of 20, SEQ 4 | **PASS, weak** | Both requests were answered (the success check says "any answer"). The record is honest that one Allow was given without reading: the top-bar link "Waiting for you: 2 requests to approve" opened the approval of `login.ts` (shot 005), the second chat's request, and the panelist allowed it because "that is the one the top bar opened". Shot 005 shows the dialog (the UAC box, "Allow the agent to change src/auth/login.ts?") with the line "Requested by the agent in Trim the user name in src/auth/login.ts..." in small italics and the same "cannot show what changes" sentence, so the panelist had no lines to read. The answer text names only `redirect.ts`; the check cannot tell this (H-85). I do not fail the row: the allow was a click on a clearly labelled button, and the scenario accepts any answer. TH-70 and UX-138 carry the finding; if the same accidental Allow shows up in the rerun it becomes S2. The first two actions were clicks on the Chats icon, which gave no feedback (the icon only highlights, shot 005). |
| T23.1-twice (T23.1b) novice | PASS: 4 of 12, SEQ 4 | **PASS, weak** | First valid run of the row. The start state is right (shot 001: "It stopped again: the agent program closed the connection." with Restart and Start a new chat). The panelist chose Restart (shot 002), the chat reconnected and went idle with no error and no "Done" (shot 004: the transcript holds "Working on it..." twice, the status bar says Connected, the top bar Idle), waited 8 s (shot 006), typed the request again and got "Done. The slow job is finished." (shot 014, last). Pass by the success check ("in the same chat after Restart"). The weak SEQ is a real finding: nothing tells the user that Restart does not send the request again (UX-140, S3). |
| T23.1-twice (T23.1b) intermediate | PASS: 3 of 9, SEQ 6 | **PASS** | The panelist chose the highlighted "Start a new chat", retyped the request and got "Done". The new chat is titled "please do the slow job (2)" and the failed chat stays open with its error (record; not viewed). Not weak. |
| T11.1 novice, T28.2 both, T28.1 novice, T30.2 novice, T31.1 novice | checker notes for the researcher ("no new tool call may have run", "control used is not clear", "confirm the message", "dialog was closed", topic only) | **PASS** | T11.1: shots 002 and 003 show no new step after the pause (record). T28.2: `log.jsonl` shows the click at (546, 211), the page bar's Take over, in the novice run; the intermediate record names the banner button; shot 002 (intermediate) shows "You have control of this page." and "Taken over". T28.1 novice: the chat line "I sent the message and found it in #general." and "Used 28 steps in the browser" are in the intermediate's last shot; the novice's own last shot is mid-run, so I rely on the checker's job state. T30.2: both quote "Notepad, part of Agent7 version 0.1.0". T31.1 novice: the "File then Save As" clause of the answer was not read on screen (the record says so) and is not evidence; the Ctrl+S part is (H-84). |
| All other rows | PASS | **PASS** | 12 PASS rows checked against their last shot: T08.1 I (one file left, Changes 1), T09.1 I (Recycle Bin "Restored 'redirect.ts' ... 0 items", Changes 2), T11.3 I ("Resumed. Continuing where you stopped.", "All steps done."), T12.1 N (only docs-site left, toast "Your files are still in the folder"), T14.2 N ("Experiments" in the list), T19.1 N (the reply under the page), T23.1b N (Done), T25.1 I (banner and the blocker at line 4), T26.1 N (chat holds both comments, cards read "Sent to chat"), T27.2 N (only the file, "Show panes" and the Chat strip), T28.1 I and T28.2 I. All agree with their `check.json` line. |

**SEQ 5 rows (clean passes, listed so that the causes are not lost).** Novice (13): T05.1 (box cannot show the change), T06.3 (the chip opens Control Center, the chat is hidden behind it), T08.2 (four-row list), T09.1 (expected a Restore button in Changes), T13.1 (Task Manager in the toast), T15.1 ("Your files (C:)"), T16.2 ("Saving a file uses Write files"), T17.2 (ENOENT), T19.2 ("port"), T20.2 (the "stopped again" card), T27.1 (the Chat strip), T28.1 (generic step list); T06.1 is the FAIL above. Intermediate (3): T03.1 (the toolbar folder icon opens Open file), T06.1 (FAIL†), T08.2 (four rows).

### 2.2 H-69: how much do batches of 10 weaken the evidence?

**Decision: they weaken the learnability claims and the step counts of the later tasks in a batch, not the pass or fail of a task, not the product defects seen in the shots, and not the medians.**

- The disclosure is real and specific. Thirteen records say so in words: T15.1 I (knew the button positions from an earlier task), T16.2 I (had seen the Permissions page in T16.1), T17.1 N (same agent ran T17.2 to T20.2 after it), T17.2 N, T18.1 inline, sidebar and window N, T18.2 N, T19.1 N, T19.2 N, T20.1 N, T20.2 N, T22.2 N (had seen the Plug in tooltip in T22.1). Three more say that nothing was known "beyond the T22/T23 screens in this agent session" (T23.1 N, T23.2 N, T24.1 N). That is 16 records. The other 104 do not say, and a panelist that disclosed only where it mattered may have carried more.
- **What stays valid.** Pass or fail is read from the app state by the checker, so it does not depend on what the panelist knew. The defects I rely on are in shots (named in 2.7). The medians do not move without the 16 disclosed rows (novice 6, intermediate 7).
- **What is void.** D2 (first-time discoverability) and the step counts and SEQ of rows late in a batch: a person who knew where Control Center opens, where the Help menu is, or what Plug in means took fewer steps and rated higher than a first-time user. J21 is the clearest case: both T21.1 panelists press Ctrl+N as the first action ("from habit", "I guess a keyboard shortcut"), and T21.1 is the task that tests whether a newcomer finds Ctrl+N; it needs a fresh panelist (`tasks.md` T21.1 says so). D2 of J21 stays at 7. No D2 cell is raised on R5 evidence where a record discloses carry-over (J16, J17, J18, J19, J20, J22, J24).
- **Gate.** The release gate asks for fresh panelists on the packaged build. R5 cannot serve as that round whatever its results. H-69 and H-80 come first in the harness work; the final round needs one fresh panelist per task (or per journey in an order that does not teach the next task).

### 2.3 UX-114: the "cannot read" sentence is a pre-fix sighting

Sightings in R5: T05.1 N and I, T06.1 N and I (shots T06.1-novice 001, which also shows five lines of the new text with a scroll bar and no old lines), T07.1 N and I (shots T07.1-novice 001 and 005: the in-chat box and the UAC box both carry it) and T21.1 N (shot 004: "Agent7 cannot read E:\NOTE.md"). Seven records (T21.1 I may show it too; I did not view that shot). **T13.2 shows the right box** ("3 lines added, 3 removed", the diff with lines 1, 3 and 4, shot T13.2-novice 005): the request raised while the chat window was closed and reopened by Connect reads its old text from the replayed state, which is consistent with the cause the facilitator names (the live thread state never got the old text). Status of UX-114: **fixed on the branch, not verified**. For this round:
- It is not in `FIX-BACKLOG-R5.md` as a product item. It is a rerun condition: T05.1, T06.1, T07.1, T13.2 and T21.1 at both levels with fresh panelists. T06.1 must pass in 2 actions or fewer at both levels and no record may contain "cannot read" unless the file is really unreadable. The regression e2e covers an existing file; the rerun must also cover a new file (T21.1 writes `E:\NOTE.md`: the box must say "The file does not exist yet, so everything below is new") and a file in use.
- The cells that UX-114 capped in R4 (D7 and D9 of J05, J06, J07, J13, and D1 of J06) are **not raised**. The rubric scores what the built app does, a fixer cannot set a score, and the evidence build still had the defect. J13 D7 is the one cell where R5 itself shows the right box (T13.2); I keep it at 6 because the same dialog misstated the file in the same build whenever the request was raised while the chat was open, and the fix is not verified. When a fresh reviewer verifies UX-114 these cells can move to 8; the scorecard notes which.
- T06.1 is a FAIL at both levels in R5 for the reasons in 2.1 and is a failed task that logs at least S2 (rubric, user panel as a gate), so J06 D1 is capped at 6.

### 2.4 T23.1b: product defect found, S3

R4 UX-123 works: the second failure now reaches "It stopped again" (shot 001) and offers "Start a new chat". What the novice run shows next is a new defect. "Restart" (not "Restart and send again": by design the request is not sent into the same failure again, UX-96) reconnects the chat and the box disappears. The chat is Connected, the top bar is Idle, the transcript ends with the old "Working on it...", and the message box is empty. Nothing says that the request was not sent again, so the user waits (the panelist waited 8 s) and then guesses. One click and a retype recover it, so S3 (UX-140). The intermediate run chose "Start a new chat" (the highlighted button) and retyped; the box does not say that the text has to be typed again either. The same "silent" family: after the first crash "Restart and send again" says what it does (T23.1 both, SEQ 6 and 7).

A second defect of the same code path showed up in T20.2 at both levels and is new. After the user ends the agent in Task Manager (one End process, one Yes), the chat shows "The agent program was stopped. **It stopped again:** the agent program was ended from Task Manager." and the status bar says "The agent program was ended again" (shots T20.2-intermediate 007 and T20.2-novice 009). It is the first stop. Cause (code): `SessionProblems.set` counts a repeated report once only for `kind === 'agent-stopped'`; the Task Manager end is `agent-ended` (`agentProblems.ts`), the process closing and the running turn both report it, and the count reaches 2, which `chatProblem.ts` turns into `repeatLine`. The same fix as UX-123 for the other kind. S3 (UX-141). The novice said "stopped again was confusing because I had only stopped it once."

### 2.5 Deny has the focus: decision

**Keep Deny as the default.** Reasons: the rubric asks for the safe choice as default (D4: "with the safe choice as default"; D7: "destructive default buttons are the safe ones"), the Windows 7 guidelines name the safest likely action as the default button, and the R3 decision (2.5 of `panel/r3/SYNTHESIS.md`, kept in R4) stands. The cost is real but small: three runs noticed it (T13.2 N, T21.1 N and I), all three read the printed hint ("Press Alt+A to allow or Alt+D to deny.") and pressed Alt+A, and nobody pressed Enter and lost a request. Enter on Deny leaves nothing broken: "Nothing changes. You can tell Scripted keyboard what to do instead." What I change is the hint, which is a 12 px grey line under the buttons, below the fold in the clipped box (UX-139, S4): show it where the eye is, and underline the access keys (Allow, Deny) all the time in this dialog. No change to the default.

### 2.6 "The Control Center list scrolls in tiny steps": not a product defect

Five small scrolls in three records (T06.1 I, T08.2 I, T16.1 I: `scroll 5`, `scroll 5`, `scroll 3`, `scroll 10`, `scroll -10`) moved the content "a few pixels". `ux.mjs scroll <x> <y> <dy>` passes `dy` as raw pixels (the wheel event's `deltaY`) and `PANELIST.md` says only "scroll (positive = down)". A `dy` of 200 to 300 (13 other scrolls in R5, from 80 to 300) moves the Permissions list by about five rows (T16.1-novice 016). The panelists who used 3 to 10 read a 3 to 10 px move as a product problem. Not in the backlog; harness defect H-78 (document the unit: 100 = one wheel notch). Whether a real mouse wheel notch moves the list by a comfortable step in the packaged build is not measured here.

### 2.7 Panelist claims checked

Each claim is checked against the shots, the logs and the code. "Not confirmed" claims are left out of the backlog.

| Claim (record) | Status | Evidence |
|---|---|---|
| The close-chat toast names a Task Manager that is not on the desktop (T13.1 N and I) | Confirmed | Shot T13.1-novice 004: toast "The chat is closed. The agent keeps working. Open it again from the Task Manager."; desktop icons are Computer, Chats, Code, Terminal, Browser, Control Center, Recycle Bin; no taskbar button. T20.2 both found Task Manager only in the Start menu. `closeChat.ts` line 6. UX-146. |
| The Changes list is about four rows, names cut ("r..direct.ts", "redir...t.test.ts"), the diff pane is large (T08.2 both) | Confirmed | Shot T08.2-novice 002: four rows and the fifth under a scroll bar, "r..direct.ts", paths cut ("E:\src\a..."), the diff pane three times taller than the list. UX-151. |
| A revert notice squeezes the list (T08.1 I) | Confirmed, worse than described | Shot T08.1-intermediate 005 and T09.1-novice 002: the file list is one clipped row (the header and a scroll bar) above "Reverted. Restore from the Recycle Bin." and the link, while "1 file, +1 -1" says one file is listed. The remaining file cannot be seen. UX-151. |
| Single click on a Git row shows nothing; the Changes tab says "No pending changes" while Git has files (T24.1 both) | Confirmed | Shot T24.1-novice 001: tab "Git (3)" and the Changes tab "No pending changes in this chat." with "0 files, +0 -0"; both records needed a double-click. UX-152. |
| The collapsed Chat strip is unlabelled and stays in Focus mode (T27.1 N, T27.2 N) | Partly confirmed | Shot T27.2-novice 002: after "Focus on the file" only the file is shown, plus a 26 px strip with a chevron and the word "Chat" in small rotated text. It has an aria-label "Show chat" but the visible word does not say what a click does. The novice (T27.1 SEQ 5) did not recognise it as the way in. The strip in Focus mode is by design (`EmbeddedChat.svelte`). UX-153. |
| Help opens partway down a page and partly off-screen (T22.2 I, T31.1 N, T31.2 both) | Confirmed | Shot T31.2-intermediate 002: the window runs past the right edge (the search box and the controls are cut at x 1280), the page shows "5 - Common Tasks" and the answer "6 - Troubleshooting" starts at the bottom edge, and the welcome balloon covers its footer. UX-148. |
| "Take over" silently switches every tool to Ask (T28.2 I) | Confirmed, not silent but unexplained | Shot T28.2-intermediate 002: the page bar says "You have control of this page. The agent stops and asks before it uses the pag..." (cut); the top bar changes to "You are in control. Tools that need an app ask first. Terminal is not open." with every chip at Ask and "Ask before every action" ticked, and no sentence says that the one click changed the whole desktop. UX-143. |
| The yellow Browser bar is stale after the agent finishes (T28.1 I) | Confirmed | Shot T28.1-intermediate 005: top bar Idle, chat "I sent the message and found it in #general.", status bar "The agent read this page", yellow bar "Agent is using this page: Waiting for the page to change" with Take over. `BrowserApp.svelte` clears the bar 20 s after the last step (`ACTIVITY_MS`), not at the end of the turn. UX-156. |
| After a second crash Restart goes idle and the request is lost silently (T23.1b N) | Confirmed | 2.4, shots 001, 004, 006, 014. UX-140. |
| The permission chips look like labels but open Control Center (T06.3 N, T16.1 N) | Confirmed | Shot T06.3-novice 002 (the chip "Run commands: Allow" is a dashed pill like the "no app open" labels; one click opens Control Center on Permissions). UX-142. |
| The auto-sent "Please continue where you stopped." is labelled "You" (T11.3 I) | Confirmed | Shot T11.3-intermediate 003: "You / Resumed. Continuing where you stopped. / Please continue where you stopped." `resumeNote.ts`, `UserMessage.svelte`. UX-144. |
| Open Agents does not select the broken agent; the About column is blank for user agents (T17.2 I, T17.1 both) | Confirmed | Shot T17.2-intermediate 002: Agents page with "My assistant" and an empty About cell, nothing selected, "Select an agent first". T17.1: the new row "node my-age..." with an empty About. UX-149. |
| The browser step log is too generic (T28.1 N) | Confirmed | `browserSteps.ts` writes "Clicked on the page" and "Typed on the page" (`toolTitles.ts`: "Type on the page"): no element and no text. The live bar and `browserLabels.ts` do name them ("Clicking the button 'Send'"). The record could not tell what was typed. UX-157. |
| The approval box covers the chat context and is clipped; an approval was given by accident when two were waiting (T07.1 N, T13.2 N) | Confirmed | Shots T13.2-novice 005 (the box sits inside the chat window, its title bar half hidden under the toolbar and the key hint at the bottom edge) and T07.1-novice 001 and 005. UX-138. |
| The Chats desktop icon gave no feedback on click and double-click (T07.1 N) | Confirmed, S4 | Shot T07.1-novice 005: the icon is highlighted, nothing opens (two chat windows are open). Included in UX-146. |
| The launcher stays in front after Create (T01.1 I) | Confirmed (UX-119 not effective on this path) | Shot T01.1-intermediate 003: the maximized "Agent7 Desktop Connection" with "New desktop Connected" and "Show desktop"; the desktop window is behind. UX-147. |
| "Working: Starting the agent..." beside a ready chat (T04.1 I, T06.3 N, T24.1 I) | Confirmed (UX-125 not effective) | Shots T06.3-novice 002 and T24.1-intermediate 004. UX-145. |
| The toolbar folder icon of Code opens "Open file", and Management has no Plug in (T03.1 both) | Confirmed | Shot T03.1-intermediate 002: "Open file, Look in: E:\" from the toolbar icon; the Management panel offers New chat here and Remove from desktop only. UX-154. |
| "The red error only appeared after I picked the folder" (T02.2 N, R4 claim) | Not repeated | R5 T02.2 N says it was an ordering slip; shot 003 (intermediate) shows the message before Browse. |
| The agent's reply in T19.1 is noisy ("viewport 414x447", "Lines 1-2 of 2") (both) | Not product text | Script echo of the read result (`browser-agent.json`), as H-55 and H-71. H-79. |
| The Control Center list scrolls in tiny steps (T06.1 I, T08.2 I, T16.1 I) | Not confirmed | 2.6. |
| "Run commands: Ask (no Terminal open)" is not obviously off (T10.2 both) | Confirmed, S4 | Shot T10.2-novice 001 text; the chip carries two meanings (the setting and the reason). Left to the UX lead's S4 list (not a new item). |
| A single window "New chat" title does not name the folder (T04.1 N) | Unchanged S4 | Kept from R4 (UX-135 family); not re-listed. |
| The dialog "Your files (C:)" worried me about my own documents (T15.1 N) | Confirmed | Shot not viewed; the dialog text is quoted in both records (`Deleting this desktop removes your files (C:), chats, notes and logs.`). UX-150. |
| The Task Manager list hides CPU columns (T20.2 N) | Confirmed, S4 | Shot T20.2-novice 009: columns Agent, PID, Desktop, Chats, Memory, "CPU" cut at the right edge of a 520 px window. Included in UX-146. |

### 2.8 Other decisions

- **T10.1, T10.2 both PASS.** T10.2 answered from the bar with no action (0 of 3 and 0 of 4). The chips read "Run commands: Ask (no Terminal open)", and both panelists understood Ask as "it must ask me". R4 UX-118 held.
- **T11.1, T11.2, T11.3 both PASS**, none weak. The banner and chips agree (R4 TH-52 did not recur). T11.2 I: the Activity tile says "The agent waits until you resume." after "Ask before every action", which sounds like a pause (S4 wording, not a new item).
- **T12.1 and T12.2 both PASS.** "Remove from desktop" is greyed with no hint (T12.1 N): S4, UX-155.
- **T14.1 both PASS and valid again** (H-73 fixed: the preselected row is "Scratch pad"; both panelists found "Fix login redirect" and "Docs site" by reading the rows).
- **T20.1 both PASS** (the Activity gadget link, two actions). T20.2 both PASS (Start menu, Processes tab, End process, Yes) with the new defect in 2.4.
- **T21.1 both PASS** in four actions; the learnability part is void (2.2).
- **T24.1 both PASS** after a double click; T24.2 both PASS (the Git tab explains in plain words).
- **T25.1, T25.2 both PASS** with no action. "2 files changed. Showing 1" confused three of four panelists again (S4, UX-131 family, not re-listed: the banner is fixed).
- **T26.1, T26.2 both PASS.** After "Send to chat" the review shows "Comments (0)" while the banner still says "2 comments" (T26.1 I, shot T26.1-novice 008): S4, UX-155.
- **T27.1 both PASS**; **T27.2 both PASS** in one action ("Focus on the file").
- **T28.1, T28.2 both PASS.** The yellow bar is stale (2.7). The chat reply is the plain script line (H-71 fixed).
- **T29.1 both PASS**, five actions, SEQ 6 and 7. The "+" has no label (S4, unchanged).
- **T30.1 and T30.2 both PASS.** **T31.1 and T31.2 both PASS** (Help opens on the right manual both times).

## 3. Affinity map

Themes continue the round 4 list (TH-49 to TH-69). Ranked by severity (S1 to S4, rubric scale), then by the number of records that name or show the problem. "Runs" counts the records and the shots that I checked, out of 120. The last column is the backlog item in `FIX-BACKLOG-R5.md`. No S1 theme. No S2 theme is open as a product defect.

| TH | Theme | Sev | Runs | Items |
|---|---|---|---|---|
| TH-49 | The permission box says it cannot read a file that exists, so the user approves a write without seeing what changes (UX-95 acceptance fails in the stock flow). **Fixed on the branch after the panel, awaiting re-verification.** | S2 (pending) | 7 seen: T05.1 N and I, T06.1 N and I, T07.1 N and I, T21.1 N (shot 004). T13.2 shows the right box. | none (rerun condition, 2.3) |
| TH-70 | The approval box is clipped by its chat window, covers the transcript the user would read first, the top-bar link opens a request without naming its chat, the command text has "(Running commands is set to Ask in Control Center)" glued to it, and one request was allowed without being read | S3 | 8: T07.1 N (accident) and I, T13.2 N and I (clipped), T05.1 N, T06.2 N and I, T06.3 I | UX-138 |
| TH-71 | Crash recovery: after the second crash, Restart reconnects, goes idle and drops the request with no word; "Start a new chat" does not say the text must be typed again | S3 | 2: T23.1b N, T23.1b I | UX-140 |
| TH-72 | "It stopped again" on the first stop: ending the agent once in Task Manager reports a second failure | S3 | 2: T20.2 N and I (shots 009 and 007) | UX-141 |
| TH-73 | Take over (one click in the page bar) switches every tool to Ask and ticks "Ask before every action", and no sentence says so | S3 | 2: T28.2 I, T28.2 N | UX-143 |
| TH-74 | The permission chips look like labels, open Control Center on a click, and no hint says so | S3 | 3: T06.3 N, T16.1 N, T06.3 I | UX-142 |
| TH-75 | A message that Agent7 wrote is labelled "You" ("Please continue where you stopped.") | S3 | 1: T11.3 I (shot 003; both records read it as typed by the user) | UX-144 |
| TH-76 | Changes pane: about four rows, cut names, a diff pane three times as tall, and a revert notice that squeezes the list to a clipped row (R3 UX-111 and R4 UX-116 not effective) | S3 | 6: T08.1 I, T08.2 N and I, T09.1 N (shot 002), T06.1 N and I (the diff pane is small) | UX-151 |
| TH-77 | Git and Changes: a single click on a Git row does nothing, the Changes tab says "No pending changes in this chat." and "0 files" while Git lists 3 files | S3 | 4: T24.1 N and I, T24.2 N and I | UX-152 |
| TH-78 | Task Manager is named in the close-chat toast but is only in the Start menu; the Chats icon gives no feedback when chats are open; the Task Manager list hides its right columns | S3 | 5: T13.1 N and I, T20.2 N and I, T07.1 N | UX-146 |
| TH-79 | Help: the window opens partly off-screen (search box and buttons cut), F1 opens partway down a page, the welcome balloon covers its footer | S3 | 5: T22.1 I, T22.2 I, T31.1 N, T31.2 I and N | UX-148 |
| TH-80 | The collapsed Chat strip says only "Chat" in small rotated text, is not recognised as the way in, and stays in Focus mode | S3 | 3: T27.1 N, T27.2 N and I | UX-153 |
| TH-81 | "Working: Starting the agent..." in the top bar beside a ready, connected chat (R4 UX-125 not effective) | S3 | 3: T04.1 I, T06.3 N (shot 002), T24.1 I (shot 004) | UX-145 |
| TH-82 | Browser: the yellow bar "Agent is using this page" stays after the turn ends (it clears 20 s after the last step); the chat's step list says "Clicked on the page" and "Typed on the page" with no target | S3 | 3: T28.1 I (stale bar, shot 005), T28.1 N and I (step list) | UX-156, UX-157 |
| TH-83 | Agents page: "Open Agents" does not select the broken agent, the About column is blank for user agents, the new row is cut ("node my-age...") | S3 | 4: T17.1 N and I, T17.2 N and I | UX-149 |
| TH-84 | Code has no Plug in control: the toolbar folder icon opens "Open file", Management offers New chat here and Remove from desktop only | S3 | 2: T03.1 N and I | UX-154 |
| TH-85 | The launcher stays in front after Create (R4 UX-119 not effective on this path) | S3 | 1: T01.1 I (shot 003) | UX-147 |
| TH-86 | The delete confirmation says "removes your files (C:)" and the novice feared for their own documents | S3 | 1: T15.1 N | UX-150 |
| TH-87 | Deny has the focus: the key hint is small and sits below the fold of the clipped box | S4 | 3: T13.2 N, T21.1 N and I | UX-139 (decision: keep Deny) |
| TH-88 | Small review and button items: "Comments (0)" against the banner "2 comments" after Send; "Add comment" and "Remove from desktop" greyed with no reason; "2 files changed. Showing 1" | S4 | 8: T26.1 I, T26.2 N, T12.1 N, T25.1 N and I, T25.2 N and I | UX-155 |
| TH-89 | Words carried from R4: "Scripted demo", "plug in", "ENOENT", "port", "Notes" for a form, "Board" for a form | S4 | 6: T02.1 N, T03.1 N, T12.2 N, T17.2 N, T19.2 N, T18.1 sidebar and window | R4 UX-133 to UX-135, still open |

What did not recur: "Agent7 cannot read" is the only R4 sentence that did; the Control Center layout, the reverted-file notice after a reopen, the chat over the Browser, the cut Review banner, the cut "Second page" tab, "Off" against "Ask" on the chips, the dead end for the Event Viewer, the unlabelled review "+", the preselected waiting row, the second-crash box that could not be reached. R4 fixes held for these (2.7 and section 1).

## 4. Journey scores

The full re-score with the reason for each changed cell is in `scorecard.md` (round 5 table and "Reasons for the changed scores, round 5"). Summary: mean cell 7.83 (R4: 7.84); 13 cells higher, 13 lower and 304 equal against round 4 (330 numeric cells). **0 of 31 journeys at 10/10.** Under the rubric a journey is 10/10 only if all eleven cells are 10: no open S1, S2 or S3 finding, every S4 accepted in `findings.md` with a written reason (none is), and the D5 and D10 evidence the rubric asks for. D5: the axe scan (28 states, 27 clean, one `target-size` violation of the 18.8 px suggestion chip in "Code with chat pane open", now 24 px in code and not re-scanned) is the first automated evidence and the only one; the manual checklist and the screen reader pass are not done, so D5 stays at its R4 values. D10: still waits for the reference-machine run that the project owner was asked to do (the Performance (UX-84) section is not edited by this round).

Nine journeys have no open S2 or S3 finding (J12, J14, J18, J19, J21, J25, J26, J29, J30); **eight of them also pass the panel part** (J12, J14, J18, J21, J25, J26, J29, J30; J19 does not: T19.2 novice rates 5). They are the closest to 10/10 and are held by S4 findings, by D5 and by D10. R4 had eleven such journeys: five of them (J02, J03, J04, J15, J31) now carry a new S3 item and three (J12, J19, J26) joined. Twenty-two journeys have an open S3 item. The panel part is met by 17 journeys (J01, J02, J04, J10, J11, J12, J14, J16, J18, J21, J22, J24, J25, J26, J29, J30, J31). J06 has a failed task; J23 has a SEQ 4 task; J07 a SEQ 4 task.

| Journey | Mean R5 | Mean R4 | Lowest cell | Lowest dimension | Panel gate (pass at both levels, min SEQ 6) |
|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8.3 | 8.2 | 7 | D2 7 | yes, min SEQ 6 |
| J02 Create a desktop | 8.0 | 8.1 | 7 | D2 7, D11 7 | yes, min SEQ 6 |
| J03 Plug in a project | 7.9 | 8.2 | 7 | D2 7, D5 7 | no, min SEQ 5 |
| J04 Start a chat | 8.1 | 8.1 | 7 | D5 7 | yes, min SEQ 7 |
| J05 Send a prompt and follow progress | 7.5 | 7.5 | 6 | D7 6, D9 6 | no, min SEQ 5 |
| J06 Approve or deny a request (chat and UAC dialog) | 7.0 | 7.1 | 6 | D1 6, D3 6, D7 6, D9 6 | no, min SEQ 5, T06.1 fails |
| J07 Approve from the Action Center | 7.2 | 7.5 | 6 | D7 6, D9 6 | no, min SEQ 4 |
| J08 Review and revert changes (Chat, Code) | 7.5 | 7.5 | 7 | D2 7, D5 7, D6 7, D8 7, D9 7 | no, min SEQ 5 |
| J09 Restore from the Recycle Bin | 7.7 | 7.8 | 7 | D2 7, D5 7, D8 7, D9 7 | no, min SEQ 5 |
| J10 Tools follow apps | 7.8 | 7.6 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J11 Pause and take control | 7.9 | 7.7 | 7 | D2 7, D5 7, D7 7, D8 7 | yes, min SEQ 6 |
| J12 Eject a drive | 8.0 | 8.0 | 7 | D5 7, D11 7 | yes, min SEQ 6 |
| J13 Disconnect and reconnect while the agent runs | 7.5 | 7.5 | 6 | D7 6 | no, min SEQ 5 |
| J14 Manage several desktops | 8.4 | 8.4 | 8 | D2 8, D4 8, D5 8, D8 8, D9 8, D11 8 | yes, min SEQ 6 |
| J15 Delete a desktop | 8.3 | 8.4 | 7 | D8 7 | no, min SEQ 5 |
| J16 Choose permissions (Control Center) | 7.9 | 7.7 | 7 | D2 7, D8 7 | yes, min SEQ 6 |
| J17 Add and choose agents | 7.9 | 7.8 | 7 | D2 7, D8 7 | no, min SEQ 5 |
| J18 A2UI surfaces: inline, sidebar, window | 8.1 | 8.1 | 7 | D5 7 | yes, min SEQ 7 |
| J19 Browse with the Browser | 7.6 | 7.6 | 7 | D2 7, D5 7, D7 7, D8 7, D9 7 | no, min SEQ 5 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 7.8 | 7.5 | 7 | D2 7, D5 7, D8 7 | no, min SEQ 5 |
| J21 Keyboard-only operation | 7.9 | 7.9 | 7 | D2 7, D5 7, D11 7 | yes, min SEQ 6 |
| J22 First-time help and discoverability | 8.0 | 8.1 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J23 Recover from errors | 7.5 | 7.7 | 7 | D1 7, D2 7, D3 7, D4 7, D5 7, D9 7 | no, min SEQ 4 |
| J24 Read code, git status and the gutter | 7.8 | 7.8 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J25 Review the agent's changes in Code Review | 8.1 | 8.1 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J26 Send review comments to a chat, and comment yourself | 7.5 | 7.5 | 7 | D2 7, D5 7, D8 7, D9 7, D11 7 | yes, min SEQ 6 |
| J27 Ask the chat pane about what you are looking at | 7.8 | 7.8 | 7 | D2 7, D5 7, D8 7, D9 7 | no, min SEQ 5 |
| J28 Let the agent use a web app in the Browser | 7.6 | 7.6 | 7 | D2 7, D5 7, D8 7, D9 7 | no, min SEQ 5 |
| J29 Browse with tabs and recover from a bad page | 7.9 | 7.8 | 7 | D4 7, D5 7, D7 7, D8 7, D11 7 | yes, min SEQ 6 |
| J30 Use menus, right-click and About in any app | 8.2 | 8.2 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J31 Get help from inside an app (Help menu and F1) | 8.1 | 8.1 | 7 | D5 7, D8 7, D9 7 | yes, min SEQ 6 |

## 5. Harness and checker defects

Fixes to `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process. Not product work. H-01 to H-76 are in `r1`, `r2`, `r3` and `r4/SYNTHESIS.md`. R4 fixes that I saw working in round 5: H-65 (T23.1b runs), H-67 (`check.json.runs`), H-70 ("take over: userInControl true"), H-71 (the browser script ends in a plain sentence), H-72 (SEQ read from the record: 120 of 120 agree), H-73 (T14.1 preselects "Scratch pad"), H-74 in part (a partial answer fails; see H-77). Not working: H-68 (an answer task can still end MANUAL: T02.2 I, T02.2 N run 1, T10.1 N run 1) and H-69 (batches). Not exercised: H-66, H-75, H-76.

| id | Where | Defect | Fix |
|---|---|---|---|
| H-77 | `checks/util.mjs` `numbersIn`, `checks/chat.mjs` T06.1 | `numbersIn` expands a range ("lines 1 to 5" gives 1 2 3 4 5), so an answer that says the box could not show the changed lines but lists "lines 1 to 5" gets the credit for lines 3 and 4. T06.1 intermediate passed on it; the researcher decision is FAIL (2.1). | For T06.1 and T24.1 require the numbers as written (no range expansion) or "+3" and "-3"; reject an answer that says it could not tell (cannot, could not, no idea, unclear). Add a unit test with the R5 answer. |
| H-78 | `ux.mjs` help, `PANELIST.md` | `scroll <x> <y> <dy>` takes raw pixels and the briefing says only "positive = down". Five scrolls with dy 3, 5, 5, 10 and -10 in three records moved "a few pixels" and were read as a product problem. | Document the unit ("100 is one wheel notch; use 200 to 300 to move a page"), print the scroll position change in the output, warn when `abs(dy) < 20`. |
| H-79 | `scripts/browser-agent.json` (read reply) | The reply to "What does this page say?" repeats the tool result ("Title: Fixture page URL: ... viewport 414x447, page scrolled 0 of 0 px down Lines 1-2 of 2 (text). End of page."). Both T19.1 panelists called it noisy; it is script text, as H-55 and H-71. | Reply in one plain sentence: "The page is titled Fixture page. It says Example Domain." |
| H-80 | `FACILITATOR.md`, `session.mjs start`, `check.json` | H-69 is still not met: batches of 10 tasks in one context. 16 records disclose carry-over and the other 104 may carry it silently. J21's learnability evidence is void again. | One fresh panelist per task. Write `context: {previousTasks: [...]}` into `session.json` and the record, and refuse to start T21.1, T22.x and T31.x in a context that ran T20.x, T22.x or any task that shows the Start menu, Help or the approval hints. |
| H-81 | `ux.mjs`, `lib/log.mjs` | The panelist is not told the running step count. T06.1 novice did not count two scrolls and found out afterwards ("5, not 3"). A scroll is one step. | Print "step N" in the output of every action command (the budget stays secret). |
| H-82 | `session.mjs check`, `checks/desktop.mjs` T02.2 and T10.1 | H-68 is not in: a verdict for an answer task is still written with `--no-answer`. T02.2 I ended MANUAL for good; T02.2 N and T10.1 N needed a second run. | Refuse a verdict for an answer task without `--answer`; add keyword checks for T02.2 (already, own name, same name, exists), T10.1 (Deny, never) and T16.2 (done in R5). |
| H-83 | `session.mjs stop` (record template) | Seven intermediate records have no "Steps: N of M" in the Result line (T18.1 sidebar and window, T18.2, T19.1, T19.2, T20.1, T20.2). | `stop` writes the line from `check.json` when it is missing. |
| H-84 | `PANELIST.md`, `checks/features.mjs` T31.1 | A panelist adds an answer clause it did not see on screen (T31.1 N: "File then Save As"; the text was cut off in shot 005). The check judges the topic only and the clause passes. T31.2 answers are cut at the bottom of the shot in both levels. | The final report quotes only text that is in a shot and names the shot; T31.1 gets a keyword check ("Ctrl+S"); the researcher spot-checks one answer clause per record (H-75). |
| H-85 | `checks/chat.mjs` T07.1, `tasks.md` T07.1 | "Both requests answered (any answer)" cannot tell a read-and-allow from an Allow clicked without reading, and the scenario ("somewhere") does not say which of the two chats is meant. T07.1 N allowed a request that the record says it had not read. | Log in `check.json.notes` the order of the two answers and the seconds from opening each box to the click; state in the scenario that either chat may be answered first. |
| H-86 | session folder names, `tasks.md` | T23.1b is `T23.1-twice` in the session folders, in the records and in `tasks.mjs` and `T23.1b` in `tasks.md` and `scorecard.md`. | Use one id (T23.1b) in the folders, the records and `tasks.mjs`. |

## 6. What the gate needs next

1. **Re-verify UX-114** (fixed on the branch, not verified): T05.1, T06.1, T07.1, T13.2 and T21.1 at both levels with fresh panelists, including a new file (T21.1) and a file in use. Until then T06.1 stays failed and the cells it caps stay at 6.
2. **Product (`FIX-BACKLOG-R5.md`).** 18 S3 items and 2 S4 items in four work packages (A approvals, failures and the top bar: UX-138 to UX-145; B shell, launcher, Help, Agents and words: UX-146 to UX-150; C Code, Changes, Git and Review: UX-151 to UX-155; D Browser: UX-156 and UX-157). The two weakest tasks first: T07.1 (UX-138) and T23.1b (UX-140), both at SEQ 4 at novice.
3. **Harness (about a day).** H-80 (fresh panelists: the gate asks for them, and R5 cannot be the final round without it), H-77 (T06.1 false pass), H-82, H-78, H-81.
4. **Rerun.** After the harness fixes: T06.1, T07.1, T23.1b, T02.2 at both levels, every task of J05, J06, J07, J08, J09, J13, J17, J20, J23, J24, J27, J28 with fresh panelists, then the full pass on the packaged build for the release gate (novice median 6 or more, no task below 5, no record that contains the sentences named in the acceptance lines).
5. **Outside the panel.** D5: re-run the axe scan after the 24 px chip fix (28 states) and do the manual checklist (zoom 200%, forced colors, reduced motion, screen reader on J01, J02, J05, J06, J07) with a second reviewer. D10: the reference-machine run and the 30-minute soak, which the project owner was asked to do. The UX lead accepts or rejects each open S4 in `findings.md`.
