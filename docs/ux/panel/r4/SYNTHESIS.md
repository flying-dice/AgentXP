# Panel round 4: synthesis

Lead UX researcher. Sources: `docs/ux/panel/r4/*.md` (120 records: 60 novice and 60 intermediate, the first full pass at both levels; no expert tier), the session folders `/tmp/ux-sessions/r4/<task>-<level>/` (`log.jsonl`, `check.json`, `state.json`, `shots/`), `panel/r3/SYNTHESIS.md` (method and format), `FIX-BACKLOG-R3.md` (UX-86 to UX-113, shipped), the checkers and presets in `scripts/ux-panel`, and the product source (`src/`) where a record needed a cause. I did not drive the app: every decision rests on the shots, `check.json`, `state.json`, the logs and the code. I viewed 29 screenshots to verify the claims I rely on (named below) and ran `scripts/check-help-coverage.mjs` (500 of 500 ids documented; R3 had 489). Next steps: `docs/ux/FIX-BACKLOG-R4.md` and `docs/ux/scorecard.md`.

Only novice (Haiku) and intermediate (Sonnet) count for the pass rates, the median SEQ and the release gate.

**Severity in this file** uses the rubric scale (`rubric.md`): S1 blocker, S2 major, S3 minor, S4 cosmetic. Round 3 wrote "Nielsen 1 to 4, 1 = polish" in its backlog but ranked its themes with the rubric numbers (Sev 2 for the FAIL causes, Sev 4 for polish); I use the rubric numbers only, so "severity 2 or higher" in the facilitator's wording means S3 and worse, and "severity 1 polish" means S4.

## Records read, missing and carried

- **Novice:** 60 records, one per task row (T01.1 to T31.2, T18.1 with three variants, plus the new T23.1-twice). 59 have a `check.json`. T23.1-twice has none (SETUP FAIL).
- **Intermediate:** 60 records, same rows. Nothing is carried from earlier rounds: R3 re-ran 27 of 59 intermediate rows and carried 32, so R4 is the first round where every intermediate row is current evidence (H-41 closed).
- **T23.1-twice** is a task of `scripts/ux-panel/tasks.mjs` only; it is not in `tasks.md`. It was a SETUP FAIL at both levels (novice after one retry; intermediate twice, the second attempt in `T23.1-twice-intermediate-b`, which has no record). I count it as an extra row, not passed (INVALID), and decide cause and consequence in 2.2. Percentages are given for the 59 rows of `tasks.md` and for all 60.
- **SEQ (facilitator note 1).** I use the rating written in each record. The 20 novice records T12.1 to T21.1 carry "SEQ corrected (scale was reversed)"; their `check.json` files still hold the reversed value. I checked all of them: 18 differ and the record is exactly 8 minus the file value (T12.1 2 to 6, T12.2 1 to 7, T13.1 2 to 6, T13.2 3 to 5, T14.1 2 to 6, T14.2 1 to 7, T15.1 2 to 6, T16.1 3 to 5, T17.1 3 to 5, T17.2 2 to 6, T18.1 inline, sidebar and window 1, 2, 1 to 7, 6, 7, T18.2 1 to 7, T19.1 2 to 6, T19.2 2 to 6, T20.2 2 to 6, T21.1 3 to 5); two (T16.2 at 4, T20.1 at 4) are the same either way. **Other records, checked for the same sign:** I read the SEQ line and the prose of all 120 records. The 40 novice records outside T12.1 to T21.1 and all 60 intermediate records agree with their text and with `check.json`, with one exception: **T22.1 novice**. Its `check.json` holds 1, the record says 6 with no "corrected" mark, and 8 minus 1 is 7. The prose ("the tooltip showed at once, the answer was in plain words") fits a 6 or a 7. I keep the record's 6; the median does not change either way (H-72). The `weak` flag of `check.json` was computed from the reversed values, so 19 novice rows carry a wrong `weak: true`; I recompute it (below).
- **Weak pass** (as in R3): a PASS with SEQ below 5, or with steps at the budget. **Budgets** are right this round: `check.json` shows novice budgets at 4 times Min (T01.1 4, T02.1 24, T20.1 20), so H-48 is fixed.

## 1. Results matrix

Cell = verdict, steps used / budget, then SEQ. `†` = researcher decision overrides the checker (reasons in section 2). `weak` = SEQ below 5; `at limit` = zero steps of slack. INVALID = the start state or the scenario made the run meaningless; it counts as not passed. R3 and R2 cells are copied from `panel/r3/SYNTHESIS.md` (`carried` = not re-run that round); R1 cells from `panel/r1/SYNTHESIS.md` (the R1 intermediate pass covered T01.1 to T17.1 only; T25.1 and later were first run in R2 or R3).

### Novice (Haiku)
| Task | R4 | R3 | R2 | R1 |
|---|---|---|---|---|
| T01.1 Find the start | PASS 3/4 · 6 | PASS 2/4 · 5 | PASS 1/3 · 6 | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 6/24 · 6 | FAIL 6/24 · 4 | FAIL 19/18 · 2 OVER | PASS 6/18 |
| T02.2 Name already used | PASS† 8/28 · 5 | PASS† 9/28 · 5 | FAIL 10/21 · 2 | PASS† 8/21 |
| T03.1 Add another folder | PASS 5/20 · 6 | PASS weak 5/20 · 4 | FAIL 3/15 · 4 | FAIL 14/15 |
| T04.1 Chat about one folder | PASS 2/16 · 6 | PASS 2/16 · 6 | FAIL 1/12 · 4 | FAIL 6/12 |
| T04.2 Closed conversation back | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/12 · 5 | PASS weak 4/12 · 4 | PASS 4/9 · 5 | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | PASS 1/3 |
| T06.1 Allow after reading | PASS weak at limit 4/4 · 4 | PASS 1/4 · 5 | PASS 1/3 · 5 | PASS 1/6 |
| T06.2 Deny | PASS 1/4 · 6 | PASS 1/4 · 5 | PASS 1/3 · 6 | PASS 1/3 |
| T06.3 Make it ask first | PASS 8/24 · 5 | PASS 7/24 · 5 | PASS 7/18 · 5 | no record |
| T07.1 Answer what is waiting | PASS 2/20 · 5 | PASS weak 2/20 · 4 | PASS 2/15 · 5 | PASS 2/15 |
| T08.1 Undo one file | PASS 4/20 · 5 | PASS weak 4/20 · 4 | PASS 4/15 · 5 | PASS 4/15 |
| T08.2 Review everything | PASS 4/24 · 5 | PASS weak 6/24 · 4 | PASS 3/18 · 5 | PASS† 2/18 |
| T09.1 Get it back | PASS 4/16 · 5 | PASS weak 3/16 · 4 | PASS 7/12 · 4 | PASS 4/12 |
| T10.1 Take away the command line | PASS 5/10 · 5 | PASS weak 4/10 · 3 | PASS† 4/8 · 5 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/3 · 6 | PASS 0/3 |
| T11.1 Hold on | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | FAIL 1/3 |
| T11.2 Approve every step | PASS 1/12 · 6 | PASS weak 1/12 · 4 | PASS 1/9 · 6 | FAIL 9/9 at limit |
| T11.3 Carry on after a pause | PASS 1/12 · 6 | PASS weak 1/12 · 3 | FAIL 1/9 · 3 | PASS 4/9 |
| T12.1 Take the project away | PASS 2/8 · 6 | PASS 2/8 · 5 | PASS 2/6 · 6 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 2/24 · 7 | PASS 2/24 · 6 | FAIL 7/18 · 2 | INVALID (harness)† 5/18 |
| T13.1 Leave it running | PASS 2/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 3/9 |
| T13.2 You were called back | PASS 2/16 · 5 | PASS 3/16 · 5 | PASS 2/12 · 6 | PASS 2/12 |
| T14.1 Which one needs me? | PASS 2/8 · 6 | INVALID† 2/8 · 5 | PASS 2/6 · 6 | PASS† 2/6 |
| T14.2 Rename | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/9 |
| T15.1 Throw one away | PASS 2/12 · 6 | PASS 2/12 · 5 | PASS 2/9 · 6 | PASS† 3/9 |
| T16.1 Stop it editing by itself | PASS 4/20 · 5 | PASS 4/20 · 5 | PASS 4/15 · 5 | PASS 5/15 |
| T16.2 What a setting covers | PASS† weak 2/16 · 4 | PASS† 2/16 · 5 | PASS† 2/12 · 5 | PASS 2/12 |
| T17.1 Use a different assistant | PASS 8/32 · 5 | PASS 7/32 · 5 | PASS 7/24 · 6 | PASS 10/24 |
| T17.2 It does not start | PASS 4/12 · 6 | PASS 1/12 · 6 | PASS† 9/9 · 3 at limit | FAIL 10/12 |
| T18.1-inline Form, inline | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/12 |
| T18.1-sidebar Form, sidebar | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 10/12 |
| T18.1-window Form, window | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 7/9 · 4 | PASS 3/12 |
| T18.2 A window you closed | PASS 1/8 · 7 | PASS 1/8 · 6 | PASS 1/6 · 7 | PASS 1/8 |
| T19.1 Look at a web page | PASS 6/16 · 6 | INVALID† 4/16 · 4 | FAIL† 10/12 · 5 | FAIL 10/16 |
| T19.2 No network | PASS 1/12 · 6 | PASS† 0/12 · 5 | PASS 5/9 · 5 | PASS 9/12 |
| T20.1 Why was it refused? | PASS weak 5/20 · 4 | PASS† weak 16/20 · 3 | PASS 6/15 · 5 | PASS 5/20 |
| T20.2 Stuck assistant | PASS 5/16 · 6 | PASS 5/16 · 5 | PASS 5/12 · 5 | PASS 7/16 |
| T21.1 No mouse | PASS 4/18 · 5 | PASS 5/18 · 5 | PASS† 19/36 · 6 | FAIL 19/48 |
| T22.1 Ask for help | PASS 1/8 · 6 | PASS† 3/8 · 6 | PASS† 1/6 · 2 | FAIL 9/8 **OVER +1** |
| T22.2 Find a topic by search | PASS 5/16 · 6 | PASS 9/16 · 5 | PASS 8/12 · 4 | PASS† 7/16 |
| T23.1 It crashed | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 5/12 · 4 | PASS 3/16 |
| T23.2 Connection dropped | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 7/12 |
| T24.1 What changed in git | PASS 2/20 · 6 | PASS† 4/20 · 5 | PASS 4/15 · 5 | PASS 6/20 |
| T24.2 Not a Git project | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 1/12 · 6 | PASS 1/16 |
| T25.1 The blocking comment | PASS 2/12 · 6 | PASS 1/12 · 6 | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 0/8 · 7 | PASS 0/8 · 7 | PASS† 0/6 · 6 | not run |
| T26.1 Pass the remarks on | PASS 2/16 · 5 | PASS 3/16 · 6 | PASS 4/12 · 6 | not run |
| T26.2 Your own remark | PASS 5/20 · 5 | PASS 4/20 · 6 | PASS 12/15 · 4 | not run |
| T27.1 Explain these lines | PASS 3/12 · 6 | PASS 4/12 · 6 | PASS 4/9 · 5 | not run |
| T27.2 More room for the file | PASS 1/4 · 7 | PASS 3/4 · 6 | FAIL† 3/3 · 4 at limit | not run |
| T28.1 Assistant reads a web page | PASS 4/12 · 6 | PASS 3/12 · 6 | PASS 4/9 · 4 | not run |
| T28.2 Take back the page | PASS 1/4 · 7 | PASS 1/4 · 7 | PASS† 1/3 · 4 | not run |
| T29.1 Two pages side by side | PASS 5/20 · 7 | PASS† 5/20 · 5 | INVALID† 6/15 · 3 | not run |
| T30.1 Open a file from the list | PASS 3/16 · 6 | PASS 2/16 · 7 | PASS 2/12 · 2 | not run |
| T30.2 Which version? | PASS 3/8 · 6 | PASS 4/8 · 5 | PASS 2/6 · 2 | not run |
| T31.1 How do I save? | PASS 1/8 · 7 | PASS 2/8 · 6 | PASS 2/6 · 2 | not run |
| T31.2 Why can I not type here? | PASS 2/8 · 6 | PASS 3/8 · 6 | PASS 4/6 · 3 | not run |
| T23.1-twice Crash twice (extra row) | INVALID† SETUP FAIL 0/16 · n/a | not run | not run | not run |


### Intermediate (Sonnet)
| Task | R4 | R3 | R2 | R1 |
|---|---|---|---|---|
| T01.1 Find the start | PASS at limit 3/3 · 6 | carried | PASS 3/3 · 6 (carried) at limit | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 7/18 · 6 | PASS 8/18 · 7 | PASS 7/18 · 6 (carried) | PASS 7/18 |
| T02.2 Name already used | PASS 8/21 · 7 | PASS† 9/21 · 6 | PASS† 8/21 · 6 (carried) | PASS† 8/21 |
| T03.1 Add another folder | PASS 5/15 · 6 | PASS 5/15 · 7 | PASS 3/15 · 6 | PASS 5/15 |
| T04.1 Chat about one folder | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 5/12 |
| T04.2 Closed conversation back | PASS 1/9 · 7 | carried | PASS 1/9 · 7 (carried) | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/9 · 6 | carried | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/3 · 7 | carried | PASS 1/3 · 7 (carried) | PASS 1/3 |
| T06.1 Allow after reading | PASS at limit 3/3 · 5 | carried | PASS 1/6 · 6 (carried) | PASS 1/6 |
| T06.2 Deny | PASS 1/3 · 7 | carried | PASS 1/3 · 6 (carried) | PASS 1/3 |
| T06.3 Make it ask first | PASS 10/18 · 5 | carried | PASS 9/18 · 5 (carried) | PASS 9/18 |
| T07.1 Answer what is waiting | PASS 2/15 · 7 | carried | PASS 3/15 · 6 (carried) | PASS 3/15 |
| T08.1 Undo one file | PASS 4/15 · 6 | carried | PASS 4/15 · 6 (carried) | PASS 4/15 |
| T08.2 Review everything | PASS 7/18 · 5 | carried | PASS 6/18 · 5 (carried) | PASS 6/18 |
| T09.1 Get it back | PASS 4/12 · 6 | carried | PASS 3/12 · 7 (carried) | PASS 3/12 |
| T10.1 Take away the command line | PASS 5/8 · 5 | carried | PASS† 4/8 · 6 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 0/3 · 7 | carried | PASS 0/3 · 7 (carried) | PASS 0/3 |
| T11.1 Hold on | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 |
| T11.2 Approve every step | PASS 1/9 · 6 | PASS 1/9 · 7 | PASS 1/9 · 6 | FAIL 8/9 |
| T11.3 Carry on after a pause | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T12.1 Take the project away | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 2/18 · 7 | PASS 2/18 · 7 | FAIL 14/18 · 2 | INVALID (harness)† 16/18 |
| T13.1 Leave it running | PASS 2/9 · 7 | carried | PASS† 2/9 · 6 (carried) | PASS† 2/9 |
| T13.2 You were called back | PASS 2/12 · 6 | carried | PASS 2/12 · 7 (carried) | PASS 2/12 |
| T14.1 Which one needs me? | PASS 1/6 · 6 | carried | PASS† 1/6 · 7 (carried) | PASS† 1/6 |
| T14.2 Rename | PASS 4/9 · 7 | carried | PASS 4/9 · 7 (carried) | PASS 4/9 |
| T15.1 Throw one away | PASS 3/9 · 7 | carried | PASS 3/9 · 7 (carried) | PASS 3/9 |
| T16.1 Stop it editing by itself | PASS 4/15 · 6 | carried | PASS 6/15 · 6 (carried) | PASS 6/15 |
| T16.2 What a setting covers | PASS† 4/12 · 5 | carried | PASS 3/12 · 6 (carried) | PASS 3/12 |
| T17.1 Use a different assistant | PASS 7/24 · 6 | carried | PASS 10/24 · 6 (carried) | PASS 10/24 |
| T17.2 It does not start | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | pending |
| T18.1-inline Form, inline | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 5/9 · 6 (carried) | pending |
| T18.1-sidebar Form, sidebar | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 4/9 · 7 (carried) | pending |
| T18.1-window Form, window | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 4/9 · 7 (carried) | pending |
| T18.2 A window you closed | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 (carried) | pending |
| T19.1 Look at a web page | PASS 6/12 · 6 | INVALID† 4/12 · 5 | PASS† 7/12 · 5 | pending |
| T19.2 No network | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 2/9 · 5 | pending |
| T20.1 Why was it refused? | PASS weak 7/15 · 4 | carried | PASS 5/15 · 6 (carried) | pending |
| T20.2 Stuck assistant | PASS 5/12 · 6 | carried | PASS 5/12 · 6 (carried) | pending |
| T21.1 No mouse | PASS 4/18 · 6 | PASS 4/18 · 6 | PASS† 18/36 · 4 | pending |
| T22.1 Ask for help | PASS† 2/6 · 7 | PASS† 2/6 · 7 | PASS 2/6 · 7 | pending |
| T22.2 Find a topic by search | PASS 2/12 · 7 | carried | PASS 5/12 · 7 | pending |
| T23.1 It crashed | PASS 1/12 · 7 | PASS 2/12 · 5 | PASS 8/12 · 5 (carried) | pending |
| T23.2 Connection dropped | PASS 1/9 · 7 | carried | PASS 5/9 · 5 (carried) | pending |
| T24.1 What changed in git | PASS 2/15 · 7 | carried | PASS 5/15 · 6 (carried) | pending |
| T24.2 Not a Git project | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 7 (carried) | pending |
| T25.1 The blocking comment | PASS 0/9 · 7 | carried | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 0/6 · 7 | carried | PASS 0/6 · 7 | not run |
| T26.1 Pass the remarks on | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 3/12 · 7 | not run |
| T26.2 Your own remark | PASS 3/15 · 6 | PASS 4/15 · 5 | PASS 7/15 · 5 | not run |
| T27.1 Explain these lines | PASS 3/9 · 6 | PASS 3/9 · 6 | PASS 3/9 · 7 | not run |
| T27.2 More room for the file | PASS 1/3 · 7 | FAIL 1/3 · 4 | FAIL† 3/3 · 5 at limit | not run |
| T28.1 Assistant reads a web page | PASS 4/9 · 6 | PASS 4/9 · 6 | PASS 3/9 · 6 | not run |
| T28.2 Take back the page | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 3 | not run |
| T29.1 Two pages side by side | PASS 5/15 · 7 | PASS† 5/15 · 7 | INVALID† 5/15 · 6 | not run |
| T30.1 Open a file from the list | PASS 3/12 · 6 | carried | PASS 3/12 · 7 | not run |
| T30.2 Which version? | PASS 3/6 · 7 | carried | PASS 2/6 · 7 | not run |
| T31.1 How do I save? | PASS 1/6 · 7 | carried | PASS 3/6 · 6 | not run |
| T31.2 Why can I not type here? | PASS 2/6 · 7 | carried | PASS 3/6 · 7 | not run |
| T23.1-twice Crash twice (extra row) | INVALID† SETUP FAIL 0/12 · n/a | not run | not run | not run |


### Totals after researcher decisions

| Level | Rows | PASS | FAIL | INVALID | Pass rate (INVALID counts as not passed) | Pass rate (INVALID excluded) | Raw checker PASS (before decisions) | Median SEQ | Tasks with SEQ below 5 | Weak passes |
|---|---|---|---|---|---|---|---|---|---|---|
| Novice R4, the 59 rows of `tasks.md` | 59 | 59 (2 with †) | 0 | 0 | **100%** | 100% | 57 of 59 (97%); 2 MANUAL | **6** | 3 | 3 |
| Novice R4, with the extra row T23.1-twice | 60 | 59 | 0 | 1 | **98%** | 100% | 57 of 60 (95%) | **6** | 3 | 3 |
| Novice R3 | 59 | 56 (7 with †) | 1 | 2 | **95%** | 98% | 50 of 59 (85%) | **5** | 12 | 10 |
| Novice R2 | 59 | 50 | 8 | 1 | **85%** | 86% | 44 of 59 (75%) | 5 | 21 | |
| Novice R1 | 45 | 34 | 10 | 1 | **76%** | 77% | 27 of 45 (60%) | 4 | 27 | |
| Intermediate R4, the 59 rows of `tasks.md` (all re-run) | 59 | 59 (2 with †) | 0 | 0 | **100%** | 100% | 57 of 59 (97%); 2 MANUAL | **7** | 1 | 3 |
| Intermediate R4, with T23.1-twice | 60 | 59 | 0 | 1 | **98%** | 100% | 57 of 60 (95%) | **7** | 1 | 3 |
| Intermediate R3, all rows (27 re-run and 32 carried) | 59 | 57 | 1 | 1 | **97%** | 98% | not recomputed | **7** | 1 | 0 |
| Intermediate R3, the 27 re-run rows | 27 | 25 | 1 | 1 | 93% | 96% | 22 of 27 (81%) | 7 | 1 | |
| Intermediate R2, all rows | 59 | 55 | 3 | 1 | **93%** | 95% | 21 of 26 re-run (81%) | 6 | 3 | |
| Intermediate R1 | 46 | 40 | 5 | 1 | **87%** | 89% | not recomputed | 6 | 8 | |

Median SEQ over the rating of each record, after the correction: novice 6 (mean 5.9; 42 of 59 rows at 6 or 7; rows: 3 at 4, 14 at 5, 28 at 6, 14 at 7), intermediate 7 (mean 6.5; 53 of 59 at 6 or more; 1 at 4, 5 at 5, 18 at 6, 35 at 7). Novice moves from 5 to 6 and meets the gate figure for the first time; intermediate holds at 7.

**Weak passes (counted as PASS, the margin is thin):** novice T06.1 (4 of 4, SEQ 4), T16.2 (SEQ 4), T20.1 (SEQ 4, five actions, three dead ends); intermediate T01.1 (3 of 3), T06.1 (3 of 3, SEQ 5), T20.1 (SEQ 4). R3 had ten novice weak passes and none at intermediate.

Rows that were FAIL or INVALID in R3 and now pass: novice 3 of 3 (T02.1, T14.1, T19.1); intermediate 2 of 2 (T27.2, T19.1). Rows that were SEQ 4 or lower at novice in R3 (12) now rate 5 or more except T06.1, T16.2 and T20.1 (the R3 weak rows T03.1, T05.1, T07.1, T08.1, T08.2, T09.1, T10.1, T11.2, T11.3 are all at 5 or 6).

**Release gate** (`process.md`, without the expert tier and without the fresh-panelist, packaged-build clause that no round has met yet):

| Gate | Novice | Intermediate | Met |
|---|---|---|---|
| All tasks pass | 59 of 59 rows pass; T23.1-twice not passed (INVALID) | 59 of 59; T23.1-twice not passed | **Yes for the 59 rows of `tasks.md`; no if T23.1-twice counts.** I count it (2.2): it exposed a product gap (UX-123), so J23 is not complete. |
| Median SEQ at least 6 | 6 | 7 | **Yes** at both levels. |
| No task below 5 (R3 working rule, not in `process.md`) | 3 tasks at 4 (T06.1, T16.2, T20.1) | 1 task at 4 (T20.1) | **No.** |
| Every journey 10/10 (`scorecard.md`) | | | **No: 0 of 31** (`scorecard.md`). |

**The gate is not met.** The panel part is within reach (59 of 59 rows pass at both levels, the medians are 6 and 7). The journey part is not: no journey scores 10/10, because every journey has an open finding or a dimension that the rubric caps (D5 not re-scanned, D10 not measured on the reference machine, S4 findings not accepted), and 20 of 31 journeys have an open S2 or S3 finding.

What changed since round 3. **Fixed and confirmed in the shots:** T02.1 (Create opens the desktop; the dialog says "Agent7 opens the new desktop when you click Create."), T14.1 (the row reads "Agent problem: The program 'not-a-real-command' was not found.", shot 001), T19.1 ("Ask about this page" in the Browser status bar, six actions), T27.2 (one click on "Focus on the file", `Show panes` brings the panes back), T23.1 (one click on "Restart and send again"), T22.1 (tooltip "... Press F1 for more." now shows in the shot, F1 opens "Using Explorer"), T02.2 (no layout shift; Browse stays at y 417 in shots 003 to 007), T07.1 ("Waiting for you: 2 requests to approve"), windows (title bars below the top bar in every shot I viewed: T01.1, T06.1, T13.2, T20.1, T20.2, T28.1), T24.1 (double-click opens the row's file), T21.1 (four actions, keys only). **Not fixed or fixed in part:** the permission box (UX-95 acceptance fails, 2.3), the Changes pane names (UX-111, cut in six shots), the Control Center permissions list, the unlabelled review "+" (UX-108), Event Viewer depth (UX-91, UX-100), the chips (UX-61 meaning of "Off").

## 2. Researcher decisions

### 2.1 Every verdict that is not a clean PASS

A clean PASS = PASS at SEQ 5 or more with steps under the budget. Everything else is here: every MANUAL, SETUP FAIL and weak row of both levels.

| Cell | Checker said | Decision | Reason |
|---|---|---|---|
| T16.2 novice | MANUAL: nothing to verify in the app state; answer "No. Turning off Code would not stop Notepad writes ..." | **PASS†, weak (SEQ 4)** | The answer is right and comes from the screen: shot 004 shows the Notepad row "Open and read documents. Saving a file uses Write files." and the Code row "Open files, reveal lines and show diffs in Code"; the intro above the list says "'Code' and 'Notepad' cover only what their rows list". It matches `permissionsTable.ts` (checked in R3). The panelist did not toggle Code, which the scenario does not ask for. SEQ 4 (corrected from the reversed value; the same either way): the key sentence is below the fold and the Code row does not say what it leaves out. UX-115, UX-127 note. |
| T16.2 intermediate | MANUAL, same | **PASS†** | Same answer ("Writing files in any app including Notepad is covered by the separate Write files permission"), shot 004 shows the Notepad row; 4 of 12, SEQ 5. The first click missed because the bar was one row, not two (the chips wrap when more apps are open; UX-125 touches the bar). |
| T22.1 intermediate | MANUAL: state ok (topic `explorer` open); answer not passed to `check` | **PASS†** | Shot 003 shows the tooltip "Plug in a project folder as a drive so that the agent can see its files. Press F1 for more." and "Agent7 Help and Support: Using Explorer" at "5 - Common Tasks" with "Click Plug in a project...". The answer in the record ("it plugs a project folder in as a drive so the agent can see its files") matches that text and `manuals/explorer.md` line 44. 2 of 6, SEQ 7. The MANUAL is H-68 again (R3 H-59 asked `check` to refuse an answer task without `--answer`; it did not). |
| T22.1 novice | PASS (the answer gives the tooltip meaning; no Help window) | **PASS** | `tasks.md` accepts a tooltip answer. Shot 002 shows the tooltip with the quoted wording, so the record's quote is verified and H-52 (tooltip delay) is fixed. SEQ: record 6, `check.json` 1 (H-72). |
| T02.2 novice | MANUAL: state ok (two desktops, names differ, `docs-site` plugged in); the panelist ran `check` once with `--no-answer` | **PASS†** | The reason is in the record ("a desktop named 'Fix login redirect' already exists. Each desktop needs its own name so that you can tell them apart.") and shot 007 shows exactly that text with the links "Use 'Fix login redirect - docs-site'" and "Use 'Fix login redirect (2)'". One claim of the record is **not confirmed**: "the red error only appeared after I picked the folder". Shot 003, taken right after typing the name and before Browse, already shows the red message. The click on Browse (y 417) landed in shots 003 to 007, so UX-89 holds. 8 of 28, SEQ 5. |
| T06.1 novice | PASS, weak: 4 of 4 at the limit, SEQ 4; the record says `check` was run three times (the placeholder answer "x" wrote FAIL, then the real answer wrote PASS) | **PASS, weak** | State is right (Allow answered, `redirect.ts` on disk has the fix). The answer ("line 1 changed ... I could not read the rest in my budget") is true but partial: the change is +3 / -3 on lines 1, 3 and 4 of `redirect.ts` (`REDIRECT_BUG` against `REDIRECT_FIXED` in `lib/fixtures.mjs`; `@@ -1,5 +1,5 @@` in shot 005 of the intermediate). The checker passed it on the word "line" (H-74). The cause of the lost budget is the product, not the panelist: the box says "Agent7 could not read the current file, so it cannot show what changes." (2.3), so the lines could be read only after Allow, in a diff pane about five rows high. I do not fail the row: the success check ("the request was answered Allow, the file contains the fix") holds and the answer says what it saw; the weak flag and SEQ 4 carry the finding. |
| T06.1 intermediate | PASS, weak: 3 of 3 at the limit | **PASS, weak** | Same cause. Allow, Changes (1), click the file; the answer names the right counts ("3 lines removed and 3 added (+3 / -3)", header `@@ -1,5 +1,5 @@`). SEQ 5. The record says the file name in the list is cut ("direct.t"): confirmed in shot 005. |
| T01.1 intermediate | PASS, weak: 3 of 3 at the limit | **PASS, weak** | The success check ("the New desktop dialog is open, or a desktop was created") was met at action 2 (New..., Create; log: two clicks, shots 002 and 003, the desktop "New desktop - Agent7" in shot 004). The third action (double-click on Computer) was the panelist exploring after the goal, so the budget of 3 is not a product signal. Min is 1 and the first screen led straight to it. SEQ 6. Product notes: after Create the launcher stays behind the new window (UX-119), and the bar reads "Agent can use nothing yet" beside three "Off" chips, which is true here (no app is open). |
| T20.1 novice | PASS, weak (SEQ 4) | **PASS, weak** | Event Viewer open (shot 005), the answer names the drive and the warning (event "fs/read_text_file (response)", "Drive E: is not plugged in on this desktop ..."). 5 of 20 but SEQ 4 for two dead ends (the desktop Activity gadget does nothing when clicked; the chat Tools and View menus) and "Records is not a word I would look for" (UX-121). |
| T20.1 intermediate | PASS, weak (SEQ 4) | **PASS, weak** | 7 of 15: Tools and View menus of the chat, then the Start menu. Shot 007 shows the Event Viewer opened narrow, with the Level column and the event list cut, "Events: 28". UX-121. |
| T23.1-twice novice and intermediate | SETUP FAIL: timed out waiting for the "It stopped again" line (`presets/chat.mjs:160`) | **INVALID† (not passed); cause is both, see 2.2** | The premise of the task cannot be reached by the product as it is built, so the preset is wrong (H-65); and the reason it cannot be reached is a product gap (UX-123). |
| All other novice rows with the checker flag `weak: true` | T12.1, T12.2, T13.1, T13.2, T14.1, T14.2, T15.1, T16.1, T17.1, T17.2, T18.1 x3, T18.2, T19.1, T19.2, T20.2, T21.1 (the reversed SEQ) | **PASS, not weak** | Recomputed with the corrected SEQ (5 to 7); none is at its budget. |

### 2.2 T23.1-twice: product defect or harness defect?

**Both, and the product part is the root.** I traced the restart path in the code.

1. `SessionProblems.set` (R3 change) keeps `failures` at 1 while an `agent-stopped` problem is open, so the one SIGKILL that is reported twice (`SessionRuntime.onClosed` and `SessionService.runTurn`) counts once. That is right and is why T23.1 now shows "Restart and send again" at the first crash (both R4 records, 1 action, SEQ 7). The unit test at `SessionProblems.test.ts` line 19 states it. The stale comment above `'crashed-agent'` in `presets/chat.mjs` ("one SIGKILL mid-turn is counted as two failures") is wrong since R3.
2. The "Restart and send again" button calls `SessionService.restartAgent`, which does `problems.clear(id)` (the count stays) and then `runtime.ensureConnected`. `SessionRuntime.connect` calls `this.deps.problems?.recovered(sessionId)` as soon as the new agent **starts**, which does `failures.delete(sessionId)` (`SessionProblems.ts` lines 44 to 47: "the next failure is the first again"). The preset's second SIGKILL kills the restarted agent in the middle of the turn, so that crash is failure number 1 again and the line "It stopped again" (`repeatLine`, shown at `failures >= 2`) can never appear. The 20 s wait times out, as logged.
3. So the "It stopped again" state is reachable only when the restart itself fails (`start-failed` twice), never for an agent that starts and then dies on the same message. That was the case UX-65 and UX-96 wanted to catch ("the message is not sent into the same failure over and over"). A user whose agent starts and crashes on every send sees the same first-crash box ("Restart and send again") for ever. Each round is one click and the Event Viewer link is in the box, so this is S3, not S2.

Decision: **product defect UX-123 (S3)** (reset `failures` when a turn completes, not when the agent starts) and **harness defect H-65** (rewrite the preset after UX-123; until then drive the second failure through a start that fails). T23.1-twice counts as not passed for J23 until both are done. It does not change the pass rate of the 59 rows of `tasks.md`, because it is not in that file; I add it there as T23.1b with the fix. I did not run the app to reproduce; the evidence is the code path above, the unit tests named, the preset log (`T23.1-twice-intermediate/server.log`, the same stack in all three attempts) and the two R4 T23.1 records that show the first-crash box.

### 2.3 T06.1 intermediate: "Agent7 could not read the current file" for a file that exists

**A real product regression of UX-95, not an intermediate-only effect.** The sentence is in six runs at both levels, for both files (`redirect.ts` and `login.ts`): the records of T05.1 novice, T06.1 novice and intermediate and T07.1 novice and intermediate, and shot 003 of T13.2 intermediate (I viewed T06.1 intermediate 001 and T13.2 intermediate 003). In every case the file exists: the Changes pane for the same change reads "1 file, +3 -3" and shows `@@ -1,5 +1,5 @@` (T06.1 intermediate shot 005).

Cause (code): the path is not the problem. The box shows `E:\src\auth\redirect.ts`, so `ToolCallPaths` mapped the host path to the virtual path correctly, and `ToolCallDiffs.fill` would read it (the unit test reads `E:\src\a.ts`). The cause is earlier: `PermissionBroker.prompt` calls `ToolCallDiffs.complete` only when the **permission request itself** carries a diff with `oldText === null` (`needsText(toolCall)`). The scripted agent, like any agent that sends the change as a `tool_call` update and then asks with `toolCall: { toolCallId, title }` (`agents/scripted-agent/actions.ts`, `askPermission`), puts the diff in the earlier update. That update goes through `SessionEventBus` and `ToolCallPaths.event`, which map paths but never read the file, so the stored diff keeps `oldText: null`. `changeCounts(null, ...)` returns `unknown` and the box prints `CANNOT_READ_TEXT` (`shared/lineCounts.ts`). The error kind `oldTextError` is absent, so the box cannot even say why. I did not verify which shape the default agent (Claude Code) sends; the broker must handle both, and the harness must test both (H-76).

Severity: **S2**. It is the one dialog that asks the user to approve a write, it states something untrue about the system ("could not read" for a readable file), and the user cannot see what changes before choosing; the novice spent the whole budget (4 of 4, SEQ 4) finding the lines after Allow. D7 and D9 for J05, J06, J07 and J13 are capped at 6. UX-114 fixes it in `PermissionBroker.prompt` (complete the stored tool call's diff by `toolCallId`) with an integration test for the split shape.

### 2.4 T11.2 intermediate: the banner says Browser is Ask, the chips say Off

**A product inconsistency, S3 (UX-118), not a defect of the setting.** Shot T11.2-novice 003 (the intermediate shows the same): the bar reads "You are in control. Browser and all other tools are set to Ask until you resume." (`CONTROL_TEXT`, `activity.ts` line 151), the chips read "Read files: Ask", "Write files: Ask", "Code: Ask", but "Run commands: Off" and "Browser: Off". By design since UX-61 a chip reads Off while no app that provides the tool is open (`activity.ts` lines 108 to 117: `!open.has(group) ? 'Off'`, with the tooltip "Run commands is Off because no Terminal is open. The setting is Ask."). So the behavior is right: when a Terminal or Browser opens, its chip will read Ask and the request will ask. The words are wrong: "Off" reads as "blocked" next to a banner that says "Ask". Both panelists said so; the intermediate also met it in T10.2 ("Off" in the bar and "Deny" in settings) and T16.1 ("Run commands says Ask in the list but the bar says Off"). The check note "all permission groups Ask: false" is the checker reading `policy.groups`, which take-control does not change (it is an overlay, `userInControl`); the pass rests on `userInControl: true` and is correct (H-70).

### 2.5 Panelist claims checked

Each claim is checked against the shots, the logs and the code. "Not confirmed" claims are left out of the backlog.

| Claim (record) | Status | Evidence |
|---|---|---|
| The box cannot show what changes (T05.1 N, T06.1 both, T07.1 both) | Confirmed, S2 | 2.3. |
| File names in the Changes list are cut: "direct.t", "ession", "t.test.t" (T06.1, T08.1, T08.2 both) | Confirmed; R3 UX-111 not effective | T08.2 novice shot 003: the name column shows "README" cut, "login.ts" cut, "direct.t", "ession", "t.test.t"; the diff pane shows about five lines at the default window size. UX-116. |
| The Control Center list is tiny, its header garbled, "Run commands" wraps, OK jumps (T06.3 both, T10.1 both, T16.2 both) | Confirmed | T06.3 intermediate shots 006 and 007: the window is 455 px wide, the list 160 px high, the header "Permission and what it covers / Setting" overlaps the first row, the row reads "Run command s", and the note "Not applied yet" sits beside OK in a four-line column. Shot 004 of T16.2 novice (the window opened wide) shows 4.5 rows and a clipped header. The window opens at a different size from different entry points (the chip click, the desktop icon). UX-115. |
| The review "+" has no label; a single click on the line number does nothing (T26.2 both) | Confirmed | T26.2 intermediate shot 001: a 10 px "+" in the gutter, a second small "+" on hover (blue); the novice's click on the number only selected the line ("Change 1 of 3") and a double-click opened the box. R3 UX-108 asked for an always visible, labelled "+". UX-122. |
| The chat window covers the Browser while the agent works, and sits behind it afterwards (T28.1 both) | Confirmed | T28.1 intermediate shot 001: the "New chat" window sits over the Browser and hides its page; shot 007 after the run: the chat is again in front only because the panelist clicked the taskbar. The record's "cryptic final reply" is **not product text**: "DONE 1 match: [10] listitem <- You Second message via submit" is the script line `DONE {{mine}}` (`scripts/browser-agent.json` line 803) printing a raw page snapshot (H-71, like H-55). The product line above it ("Used 28 steps in the browser (read, waited, typed)", "First: Opened 127.0.0.1:4174. Last: Waited for the page.") is plain. |
| The launcher stays in front after Connect (T13.2 both) | Confirmed | T13.2 intermediate shot 002: the maximized launcher still fills the screen, the row reads "Connected", the button reads "Show desktop"; the new desktop window is behind it. UX-119. |
| Event Viewer is hard to find and opens cramped (T20.1 both) | Confirmed | Start menu only; shot 007 (intermediate): narrow window, Level column cut, 28 events of ACP, AG-UI and MCP. The chat's tool-failure text has no link. UX-121. |
| Task Manager opens on Chats with "End Task"; stopping the program is on Processes (T20.2 both) | Confirmed, S4 | T20.2 intermediate shot 002. Both panelists chose the right tab and the confirmation dialog explained the effect. UX-130. |
| The selection highlight is gone after "Ask about selection" (T27.1 intermediate) | Confirmed | Shot 003: the status bar reads "Selected 1-2" but lines 1 and 2 are not highlighted in the editor, and the pane is 330 px wide so the question and answer wrap. UX-126. |
| The chips say Off while the setting says Ask | Confirmed | 2.4. |
| Restart does not clear the message box; the text stays after "Restart and send again" and "Send again" (T23.1 N, T23.2 N) | Confirmed | T23.1 novice shot 004: the transcript holds the user message twice and the box still holds "please do the slow job" with Send enabled. UX-124. |
| The bar says "Working: Starting the agent..." beside a ready chat | Confirmed in four shots | T28.1 intermediate 001, T26.1 novice 002, T26.2 intermediate 001, T06.3 intermediate 006 and 007: chat "Ready ... What would you like to work on?" and "Connected", bar "Working: Starting the agent...". `workingText` shows that text while a session is `connecting` (`activity.ts` line 41). UX-125. |
| After a revert and a reopen, the file leaves the Changes list and nothing points to the Recycle Bin (T09.1 both) | Confirmed | T09.1 novice shot 002: "1 file", only `login.ts`, no grey "Reverted" row and no "Open Recycle Bin" link, while T08.1 novice shot 008 (live session) shows both. `ChangesPane.svelte` keeps `reverted` in component state (lines 33 to 41), so it is lost when the window reopens. Both panelists dead-ended there, then found the Recycle Bin by guessing. `state.json` says `revertShownInList: true`, which only means the Recycle Bin has the item. UX-117. |
| "Ask about this pag" in the Browser status bar looks like a label (T19.1 both); the yellow bar still says "Agent is using this page: Reading the page" after the read | Confirmed | T19.1 novice shot 009: truncated link in the status bar, the yellow bar with "Take over" still present while the Activity gadget shows "Read the page" done. UX-128. |
| The Review window is narrow and cuts the code (T24.1 both) | Confirmed | Both records; the double-click opens a second window at about 450 px. UX-129. |
| The dialog "New chat (review-notes)" sounds like a new chat (T26.1 novice) | Confirmed; R3 UX-109 only half done | Shot 002: "New chat (review-notes) E:\" for the open chat and "Start a new chat" below it. The chat is untitled, so the name is true but not distinguishable. UX-122. |
| Disabled buttons give no reason: "Remove from desktop" (T12.1 N), Revert (T22.2 N), "Set as Default" (T17.1 both) | Confirmed | T09.1 novice shot 002 (Revert and Open in editor greyed with nothing selected, no reason), T17.1 novice shot 010 ("Set as Default" greyed for the new default row); T12.1 novice per the record (not viewed). UX-127. |
| Both T21.1 panelists knew Ctrl+N from an earlier task | Confirmed | `log.jsonl`: the first action of both runs is `Control+N`; the novice says "the shortcut I had seen in the Start menu in T20.1", the intermediate "an earlier task in this batch". D2 evidence of J21 is void (H-69). |
| The waiting row was preselected when the launcher opened (T14.1 both) | Confirmed | T14.1 novice shot 001: "Fix login redirect" selected and "Connect" is the default button. Both panelists used it; the task tests finding the problem row (now visible) but not the waiting row. H-73. |
| "Details..." shows developer text (T17.2 intermediate); the broken agent is not named (T17.2 novice) | Confirmed, S4 | Details is by design (R3); the banner names the program, not the agent ("My assistant"). UX-134. |
| "Restore from the Recycle Bin" sounds risky (T08.1 novice) | Not a defect | The dialog says "You can get it back from the Recycle Bin" and the list has "Open Recycle Bin". Word-level doubt only. |
| The Control Center "Set all" is easy to press by mistake (T06.3 novice) | Not confirmed | It sits in the same panel and needs a second click on "Set all" after the dropdown; no panelist pressed it. |
| Quotes "written from screenshots no longer in the context" (T22.1 N, T22.2 N, T25.1 N, T26.1 N) | Two of four checked, both match | T22.1 novice shot 002 and T26.1 novice shot 002 contain the quoted words. H-61 followed up in the facilitator process; keep the line. |

### 2.6 Other decisions

- **T10.1 novice and intermediate PASS.** The state check (Terminal policy Deny, the bar says "Run commands: Deny", "Saved.") passed; the novice used the chip as the proof, which `tasks.md` allows ("show me how you can tell"). SEQ 5 for the Control Center layout (UX-115) and "Off" versus "Deny" (UX-118).
- **T11.2 both PASS** (2.4). **T12.2 both PASS:** the chat text says what happened and Computer lists "Recently removed" with "Plug in again"; "Drive E:" is plain enough (SEQ 7).
- **T14.1 both PASS** with the caveat of H-73. **T19.2 both PASS:** the page names the cause ("The address uses a port that the Browser blocks", "Check the number after the colon"); "port" and `ERR_UNSAFE_PORT` stay S4 (UX-134).
- **T21.1 both PASS** by the state check, four actions; the learnability part is not evidence (H-69). `tasks.md` still says Min 6; the real Min is 4 (Ctrl+N, type, Enter, Alt+A).
- **T27.1 both PASS:** "Explain this" now sends the selection ("Explain lines 1 to 2 of index.ts") and the answer is about lines 1 and 2; R3 H-56 is fixed. **T28.2 both PASS:** the page bar's Take over, `userInControl` true, no tool call in 3 s; the top bar's "Give control back" appears twice (page bar and top bar) and the novice found that confusing (S4, UX-136).
- **T26.1 and T26.2 both PASS;** the comment is on `notes.txt` line 2, open, not sent. The novice needed a double-click (UX-122).
- **Deny stays the keyboard default** (R3 decision 2.5): both T21.1 panelists used Alt+A at once; no change.
- **J25 (T25.1, T25.2):** both levels pass with no action; the banner "Changes requested. 2 comments, 1 is a blocker." answers both tasks. The status bar "2 files changed, 1 shown" confused three of four panelists (S4, UX-131).

## 3. Affinity map

Themes continue the round 3 list (TH-32 to TH-48). Ranked by severity (S1 to S4, rubric scale), then by the number of records that name or show the problem. "Runs" counts the records and the shots that I checked, out of 120. The first column of the last field is the backlog item in `FIX-BACKLOG-R4.md`.

| TH | Theme | Sev | Runs | Items |
|---|---|---|---|---|
| TH-49 | The permission box says it cannot read a file that exists, so the user approves a write without seeing what changes (UX-95 acceptance fails in the stock flow) | S2 | 6: T05.1 N, T06.1 N and I, T07.1 N and I, T13.2 I (shot 003) | UX-114 |
| TH-50 | Control Center > Permissions: a 160 px list in a 455 px window, a header that overlaps the first row, "Run command s", and OK and Apply that jump when "Not applied yet" appears (also in R1 as TH-02) | S3 | 6: T06.3, T10.1, T16.2 at both levels | UX-115 |
| TH-51 | Changes pane: cut names ("direct.t", "ession"), a diff pane of about five rows, and a reverted file that leaves the list after a reopen with no pointer to the Recycle Bin (R3 UX-111 and UX-79 not effective) | S3 | 8: T06.1 both, T08.1 both, T08.2 both, T09.1 both | UX-116, UX-117 |
| TH-52 | The chips say "Off" while the banner or the setting says Ask or Deny | S3 | 4: T11.2 both, T10.2 I, T16.1 I | UX-118 |
| TH-53 | Windows and focus: the launcher stays in front after Connect, and the chat window covers the Browser the agent is working in | S3 | 5: T13.2 both, T01.1 I, T28.1 both | UX-119, UX-120 |
| TH-54 | Event Viewer: not on the desktop, not linked from the failed tool text, opens narrow, 28 events of protocol noise | S3 | 2: T20.1 both (both SEQ 4) | UX-121 |
| TH-55 | Review controls: the "+" is tiny and unlabelled, a click on the line number does nothing, "New chat (review-notes)" reads as a new chat | S3 | 3: T26.2 both, T26.1 N | UX-122 |
| TH-56 | Crash recovery: a crash loop never reaches "It stopped again" (the count resets when the agent starts); the sent text stays in the message box; the second-failure branch cannot be tested | S3 | 4: T23.1-twice both (SETUP FAIL), T23.1 N, T23.2 N | UX-123, UX-124 |
| TH-57 | Status text that the screen contradicts: "Working: Starting the agent..." beside a ready chat; the yellow bar "Agent is using this page" after the read; "Nothing has happened yet" next to "You are in control" | S3 | 5: T28.1 I, T26.1 N, T26.2 I, T06.3 I (shots), T19.1 N (shot) | UX-125, UX-128 |
| TH-58 | After "Ask about selection" the selection highlight is gone and the pane is narrow | S3 | 2: T27.1 both | UX-126 |
| TH-59 | Disabled buttons give no reason: Remove from desktop, Revert, Set as Default | S3 | 5: T12.1 N (record), T09.1 N (shot), T22.2 N, T17.1 both | UX-127 |
| TH-60 | "Ask about this page" is a clipped status-bar link that looks like a label | S3 | 2: T19.1 both | UX-128 |
| TH-61 | The review window opens at about 450 px and cuts the code | S3 | 2: T24.1 both | UX-129 |
| TH-62 | Words: "they appear as drives", "plugged in", "private C: drive", "Scripted demo", long truncated folder paths | S4 | 5: T02.1 both, T03.1 N, T15.1 N, T22.1 N | UX-133 |
| TH-63 | Task Manager opens on Chats with End Task; the program is on Processes | S4 | 2: T20.2 both | UX-130 |
| TH-64 | Review status line "2 files changed, 1 shown" and the cut banner "Two comments, one of t..." | S4 | 4: T25.1 both, T25.2 both | UX-131 |
| TH-65 | Help: F1 lands at section 5 with the answer at the bottom edge, a long table of contents, Terminal cursor blinks while read-only | S4 | 4: T22.2 both, T31.1 N, T31.2 N | UX-132 |
| TH-66 | Error text: "port", ERR_UNSAFE_PORT, Details with ENOENT, the broken agent is not named | S4 | 4: T19.2 both, T17.2 both | UX-134 |
| TH-67 | Cut or mismatched labels: "Board" and "Board - from the agent", the "Notes" tab for a form, "Second pa...", "Text document (M..." | S4 | 5: T18.1 sidebar N and I, T18.1 window N, T29.1 N (shot), T30.1 N | UX-135 |
| TH-68 | Closing a chat window does not say the job goes on; "Needs your approval" and "Agent problem" look alike; "Give control back" in two places | S4 | 3: T13.1 N, T14.1 N, T28.2 N | UX-136 |
| TH-69 | Keyboard hints are small ("Press Alt+A..."), and Ctrl+N shows only in the Start menu | S4 | 2: T21.1 both (evidence not clean, H-69) | UX-137 |

What did not recur: the folder picker, Recently removed, Resume, Take over, the layout shift of the duplicate-name error, windows under the top bar, "ACP connection closed" in the status bar, the Browser "Waiting for Reacted (1)" text, "Explain this" answering about the whole file, the waiting count, "Eject" and "Safe To Remove Hardware". R3 fixes held for these.

## 4. Journey scores

The full re-score with the reason for each changed cell is in `scorecard.md` (round 4 table and "Reasons for the changed scores"). Summary: mean cell 7.84 (R3: 7.70); 64 cells higher, 21 lower, 245 equal against round 3. **0 of 31 journeys at 10/10.** Under the rule of the rubric, a journey is 10/10 only if all eleven cells are 10: that needs no open S1, S2 or S3 finding, every S4 accepted in `findings.md` with a written reason (none is), and the D5 and D10 evidence the rubric asks for (no axe re-scan in round 4; D10 not measured on the reference machine, see the scorecard). My reading of "severity 2 or higher" and "severity 1 polish": S3 and worse must be closed; an S4 may stay open only if the UX lead accepts it with a reason.

Eleven journeys have no open S2 or S3 finding (J02, J03, J04, J14, J15, J18, J21, J25, J29, J30, J31); **nine of them also pass the panel part** (every task passes at both levels, every task at SEQ 6 or more): J03, J04, J14, J15, J18, J25, J29, J30, J31. They are the closest to 10/10 and are held by S4 findings, by D5, and by D10. Twenty journeys have an open S3 or S2 finding (open S2: J05, J06, J07, J13, all UX-114). The panel part is met by 17 journeys (J01, J03, J04, J11, J12, J14, J15, J18, J19, J22, J24, J25, J27, J28, J29, J30, J31); J23 would be the 18th without T23.1-twice.

| Journey | Mean R4 | Mean R3 | Lowest cell | Lowest dimension | Panel gate (pass at both levels, min SEQ 6) |
|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8.2 | 8.2 | 7 | D2 7 | yes, min SEQ 6 |
| J02 Create a desktop | 8.1 | 6.9 | 7 | D2 7, D11 7 | no, min SEQ 5 |
| J03 Plug in a project | 8.2 | 7.8 | 7 | D5 7 | yes, min SEQ 6 |
| J04 Start a chat | 8.1 | 7.8 | 7 | D5 7 | yes, min SEQ 6 |
| J05 Send a prompt and follow progress | 7.5 | 7.8 | 6 | D7 6, D9 6 | no, min SEQ 5 |
| J06 Approve or deny a request (chat and UAC dialog) | 7.1 | 8.0 | 6 | D3 6, D7 6, D9 6 | no, min SEQ 4 |
| J07 Approve from the Action Center | 7.5 | 7.6 | 6 | D7 6, D9 6 | no, min SEQ 5 |
| J08 Review and revert changes (Chat, Code) | 7.5 | 7.5 | 7 | D2 7, D5 7, D6 7, D8 7, D9 7 | no, min SEQ 5 |
| J09 Restore from the Recycle Bin | 7.8 | 7.8 | 7 | D2 7, D5 7, D8 7, D9 7 | no, min SEQ 5 |
| J10 Tools follow apps | 7.6 | 7.5 | 7 | D2 7, D5 7, D7 7, D8 7 | no, min SEQ 5 |
| J11 Pause and take control | 7.7 | 7.7 | 7 | D2 7, D5 7, D7 7, D8 7, D9 7 | yes, min SEQ 6 |
| J12 Eject a drive | 8.0 | 7.7 | 7 | D5 7, D11 7 | yes, min SEQ 6 |
| J13 Disconnect and reconnect while the agent runs | 7.5 | 7.5 | 6 | D7 6 | no, min SEQ 5 |
| J14 Manage several desktops | 8.4 | 8.1 | 8 | D2 8, D4 8, D5 8, D8 8, D9 8, D11 8 | yes, min SEQ 6 |
| J15 Delete a desktop | 8.4 | 8.4 | 8 | D2 8, D4 8, D5 8, D8 8, D9 8, D11 8 | yes, min SEQ 6 |
| J16 Choose permissions (Control Center) | 7.7 | 8.0 | 7 | D1 7, D2 7, D8 7, D9 7 | no, min SEQ 4 |
| J17 Add and choose agents | 7.8 | 7.7 | 7 | D2 7, D8 7, D9 7 | no, min SEQ 5 |
| J18 A2UI surfaces: inline, sidebar, window | 8.1 | 7.5 | 7 | D5 7 | yes, min SEQ 6 |
| J19 Browse with the Browser | 7.6 | 7.1 | 7 | D2 7, D5 7, D7 7, D8 7, D9 7 | yes, min SEQ 6 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 7.5 | 7.5 | 6 | D2 6 | no, min SEQ 4 |
| J21 Keyboard-only operation | 7.9 | 7.9 | 7 | D2 7, D5 7, D11 7 | no, min SEQ 5 |
| J22 First-time help and discoverability | 8.1 | 7.4 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J23 Recover from errors | 7.7 | 7.5 | 7 | D2 7, D4 7, D5 7, D9 7 | no, T23.1-twice not passed |
| J24 Read code, git status and the gutter | 7.8 | 7.5 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J25 Review the agent's changes in Code Review | 8.1 | 8.1 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J26 Send review comments to a chat, and comment yourself | 7.5 | 7.5 | 6 | D2 6 | no, min SEQ 5 |
| J27 Ask the chat pane about what you are looking at | 7.8 | 7.3 | 7 | D2 7, D5 7, D8 7, D9 7 | yes, min SEQ 6 |
| J28 Let the agent use a web app in the Browser | 7.6 | 7.5 | 7 | D2 7, D5 7, D8 7, D9 7 | yes, min SEQ 6 |
| J29 Browse with tabs and recover from a bad page | 7.8 | 7.6 | 6 | D8 6 | yes, min SEQ 7 |
| J30 Use menus, right-click and About in any app | 8.2 | 8.1 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J31 Get help from inside an app (Help menu and F1) | 8.1 | 8.0 | 7 | D5 7, D8 7, D9 7 | yes, min SEQ 6 |

## 5. Harness and checker defects

Fixes to `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process. Not product work. H-01 to H-64 are in `r1/SYNTHESIS.md`, `r2/SYNTHESIS.md` and `r3/SYNTHESIS.md`. Round 3 fixes that I saw working in round 4: H-47 (T29.1 tabs read), H-48 (novice budgets), H-49 (T19.1 asks for the action; `browser_read` seen in both logs), H-50, H-51 (T14.1: the problem row shows at start), H-52 (the tooltip is in the T22.1 shots), H-54, H-55 (the form scripts no longer echo "surface"), H-56 (Explain this), H-57 (T07.1 two different files), H-58 (T23.1 starts at the first crash), H-60, H-62, H-63, H-64. Not working: H-53 (the SEQ still comes from the panelist's `--seq`) and H-59 (an answer task can still end MANUAL).

| id | Where | Defect | Fix |
|---|---|---|---|
| H-65 | `presets/chat.mjs` `crashed-agent` (option `twice`), `tasks.mjs`, `tasks.md` | The second-failure start state cannot occur: after "Restart and send again" the agent starts, `SessionRuntime.connect` calls `problems.recovered` and resets `failures`, so a crash after a good start is failure 1 again (2.2). The preset waits 20 s for "It stopped again" and throws; the comment above the preset ("one SIGKILL is counted as two failures") is stale since R3. T23.1-twice is not in `tasks.md`. | After UX-123 ships, keep the preset as it is and assert "It stopped again"; until then build the second failure with a start that fails twice (default agent command wrong, Try again, Try again). Delete the stale comment. Add T23.1b to `tasks.md` (Success: "Start a new chat" is offered and the first message is not resent into the same failure). |
| H-66 | `server.mjs` `start`, `session.mjs` | A preset that throws leaves the session open: the retry says "already holds a session; use a new folder", `stop` removes `server.log`, and the novice lost about three minutes; the intermediate needed a `-b` folder (`T23.1-twice-intermediate-b` has no record). | On a preset error, close the app, release the lock and keep `server.log` in the session folder; make `start` idempotent for the same task and level. |
| H-67 | `session.mjs check` | A later `check` overwrites the verdict: T06.1 novice ran with the placeholder answer "x" (FAIL), then the real answer (PASS); T10.1 novice MANUAL then PASS. The record has to explain it. | Append every run to `check.json.runs`; refuse answers shorter than five words; the record's verdict is the last run, the researcher sees all runs. |
| H-68 | `session.mjs check`, `checks/chat.mjs` T16.2, `checks/desktop.mjs` T02.2, T22.1 | H-59 is not in: T02.2 novice (`--no-answer` by mistake), T16.2 both and T22.1 intermediate ended MANUAL; four of 120 rows needed a researcher decision that a keyword check could make. | Refuse a verdict for an answer task without `--answer`. Add keyword checks: T16.2 ("no" and "Write files" or "separate"), T02.2 (a reason word: already, same name, own name, exists), T22.1 (project, folder, drive or see its files). |
| H-69 | `PANELIST.md`, `FACILITATOR.md`, `tasks.md` T21.1 | Panelists carry knowledge from earlier tasks of the same batch: both T21.1 runs press Ctrl+N first and say they saw it in the Start menu in an earlier task (T20.1 for the novice); T10.1 novice remembers where Control Center opened. The learnability evidence of J21 is void. `tasks.md` still says T21.1 "Min 6"; the real Min is 4. | One fresh panelist per task (or per journey, in an order that does not teach the next task); the T21.1 panelist must not run T20.1 or T22.x in the same context. Set T21.1 Min 4, budget 12 / 16. |
| H-70 | `checks/chat.mjs` T11.2 | The note "all permission groups Ask: false" reads like a failure. Take over sets `userInControl`, not the policy groups, so it is always false; the pass depends on `userInControl`. Both panelists asked the researcher about it. | Print "take over: userInControl true" and drop the groups line unless the route was Set all. Add a check that the bar banner and the chips agree (reads the chips); it would have caught UX-118 for free. |
| H-71 | `scripts/browser-agent.json` (last message) | The script ends with "DONE {{mine}}", a raw page snapshot ("DONE 1 match: [10] listitem <- You Second message via submit"). Both T28.1 panelists and the scorecard of R3 treat such text as product copy (the same fault as H-55). | "I sent the message and found it in #general." (one plain sentence). |
| H-72 | `session.mjs stop`/`check`, `check.json` | H-53 is not working: `--seq` is still passed by hand. 18 novice rows (T12.1 to T21.1) hold the reversed value, so their `weak` flag is wrong; T22.1 novice holds 1 while the record says 6 with no "corrected" mark. | `stop` reads `- SEQ:` from the record; `check` has no `--seq`; regenerate the 19 `check.json` files from the records; reject a SEQ outside 1 to 7. |
| H-73 | `presets/desktops.mjs` `four-desktops`, `tasks.md` T14.1 | The launcher preselects the row that needs approval, and both panelists used it ("already highlighted"); the scenario ("which one is waiting for you") is answered by the selection, not by reading the rows. | Preselect "Scratch pad" in the preset, or state in the T14.1 success check that the preselection is the product's intended help and add a second task that starts with another row selected. |
| H-74 | `checks/features.mjs` T06.1 | The answer check passes on the word "line", so the novice's partial answer ("line 1 ... I could not read the rest") passed. The change is +3 / -3 on lines 1, 3 and 4. | Require "1", "3" and "4", or "+3" and "-3", in the answer, as H-60 does for T24.1. |
| H-75 | `PANELIST.md` | Records misreport timing or quote from memory: T02.2 novice says the red error came only after the folder was picked (shot 003 shows it right after typing); four records carry the "Quote check" line. | The final report names the shot for every claim about timing; the researcher checks one claim per record (done in 2.5). |
| H-76 | `scripts/fix-redirect.json`, `two-edits.json`, `five-edits.json`, `M/**/PermissionBroker.test.ts` | The scripts send `requestPermission` with only `toolCallId` and `title` and put the diff in the earlier `tool_call`; no run tests the other shape (the diff inside the request). The unit tests of `ToolCallDiffs` use only that other shape and pass. | Add a script variant with the diff inside the request; add a broker integration test for both shapes (the split shape fails today). |

## 6. What the gate needs next

1. **Product (`FIX-BACKLOG-R4.md`).** UX-114 first: it is the only S2 and it sits on the main safety dialog (J05, J06, J07, J13). Then the three weak tasks that still rate 4 (T06.1, T16.2, T20.1): UX-114, UX-115 and UX-116, UX-121.
2. **Harness (about a day).** H-65 and H-66 (so that T23.1-twice can run), H-68, H-69 (fresh panelists: the gate asks for them), H-72.
3. **Rerun.** After the harness fixes: T23.1-twice and every weak or MANUAL row of section 2.1, plus every task of J05, J06, J07, J08, J09, J10, J13, J16, J20, J23, J26, J27, J28 with fresh panelists at both levels. Then the full pass on the packaged build for the release gate (the novice median must hold at 6 or more and no task below 5). Also outstanding for the gate and outside the panel: an axe re-scan and the manual checklist (D5), and D10 on the reference machine with the 30-minute soak.
