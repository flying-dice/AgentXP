# Panel round 8: synthesis

Lead UX researcher. Sources: `docs/ux/panel/r8/*.md` (120 records: 60 novice and 60 intermediate, the fifth full pass at both levels, no expert tier), the session folders `docs/ux/panel/r8/<task>-<level>-session/` (`log.jsonl`, `check.json`, `session.json`, `state.json`, `shots/`; the working copies were under `/tmp/ux-sessions/r8/`), `panel/r7/SYNTHESIS.md` (method and format), `FIX-BACKLOG-R7.md` (UX-173 to UX-192, H-96 to H-105), the checkers and scripted agents in `scripts/ux-panel`, the product source (`src/`, `manuals/`) where a record needed a cause, and `scripts/check-help-coverage.mjs` (run now: 540 ids found, all documented, 0 ignored. R7 had 527). I did not drive the app and did not run axe, so there is no axe result for this round (section 4). I did not run git or npm. Every decision rests on the shots, `check.json`, `state.json`, the logs and the code. I viewed 27 screenshots to verify the claims I rely on (named below as `<task>-<level> <number>`). A record that I cite without a shot number was read, not viewed. Next steps: `docs/ux/FIX-BACKLOG-R8.md` and `docs/ux/scorecard.md`.

Only novice (Haiku) and intermediate (Sonnet) count for the pass rates, the median SEQ and the release gate.

**Severity** uses the rubric scale: S1 blocker, S2 major, S3 minor, S4 cosmetic. Round 8 findings are themes TH-123 to TH-143 and backlog items UX-193 to UX-216. A failed task of the novice or intermediate panelist is at least S2 (rubric, "User panel result as a gate"), unless the researcher shows that the cause is in the harness (2.1, T28.1 intermediate).

**Facts from the facilitator that shape every decision below.**
1. **The round ran against the packaged build, one commit.** All 120 `session.json` and `check.json` files say `build.packaged: true`, version 0.1.0, commit `662b12c8ef`. R7 had two commit ids; H-100 is verified (section 2.3).
2. **Every session had a fresh panelist.** `check.json.context.previousTasks` is empty in 120 of 120 files. Two sessions are reruns with fresh panelists: T28.1 novice and T29.1 novice (the first runs were lost when the panelists were cut off by a usage limit). One session was finished by the facilitator: T13.2 novice (the panelist stopped after acting; the facilitator ran check, record and stop from the hand-back). The results of the three stand. `check.json` does not carry the flags for them (`rerun` is null and `finishedByFacilitator` is false in all three: H-110).
3. **Raw tally.** Novice 59 of 60 (checker FAIL: T03.1), intermediate 58 of 60 (FAIL: T03.1, T28.1). After the facilitator override of T03.1 (stale checker, H-106, done): novice 60 of 60, intermediate 59 of 60. Low SEQ (below 5): T17.2 novice 2, T28.1 novice 4.
4. **The R7 fixes are in this build** (UX-173 to UX-192). Section 2.3 checks each one against the shots.
5. **The Time field is a placeholder in four records** (`<stop fills in>` in T06.1 novice, `<min>` in T12.2, T14.1 and T23.1b novice): `stop` does not fill it (H-109).
6. **No record contains "cannot read" or "Think-aloud"** (0 of 120 each). All 120 records have "Steps: N of M". The Evidence line carries a repository path in 120 of 120 (H-105).

## Records read, missing and carried

- **Novice:** 60 records and 60 `check.json` files, one per task row of `tasks.md` (T01.1 to T31.2, T18.1 with three variants, and T23.1b). Nothing is missing.
- **Intermediate:** 60 records and 60 `check.json` files. Nothing is missing. Nothing is carried from an earlier round.
- **Harness fixes visible as working:** H-96 (both T22.2 rows pass on the answer), H-97 (a working "Helper assistant" and "Scripted Agent" are in the list; T17.2 intermediate passes), H-98 (both T28.1 panelists typed only the request), H-99 (`check.json.notes` carries `userInControl` for T06.3, T11.2, T28.2), H-100 (one commit id), H-101 (`stepsToPass` 1 for both T01.1 rows, so neither is weak at the limit), H-102 (no record says the launcher stayed in front), H-103 (T16.2 intermediate waited 1.5 s before the shot), H-105 (the Evidence line, no empty "Researcher notes" line). H-104 is not fixed (`T03.1-novice 005`: "/tmp/a7ux-GpKvQZ/home/Documents/docs-site"). SEQ in the record equals `check.json` in 119 of 120 rows (T25.1 novice has `seq: null` in `check.json`, 7 in the record: H-111).
- **Weak pass** (as in R3 to R7): a PASS with SEQ below 5, or with steps at the budget (counted with `stepsToPass`). **Clean PASS** = PASS, SEQ 5 or more, steps under budget, one check run, no MANUAL. Check runs: one in 119 of 120 records; T17.2 novice has three (section 2.1).

## 1. Results matrix

Cell = verdict, steps used / budget, then SEQ. `†` = researcher decision overrides the checker (reasons in section 2). `‡` = rerun with a fresh panelist, or finished by the facilitator (the result stands). `weak` = SEQ below 5 or steps at the budget. `at limit` = steps equal to the budget. R7 to R1 cells are copied from `panel/r7/SYNTHESIS.md` (`carried` = not re-run that round).

### Novice (Haiku)
| Task | R8 | R7 | R6 | R5 | R4 | R3 | R2 | R1 |
|---|---|---|---|---|---|---|---|---|
| T01.1 Find the start | PASS at limit 4/4 · 5 | PASS 3/4 · 6 | PASS weak at limit 4/4 · 4 | PASS 1/4 · 7 | PASS 3/4 · 6 | PASS 2/4 · 5 | PASS 1/3 · 6 | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 7/24 · 6 | PASS 7/24 · 7 | PASS 7/24 · 7 | PASS 6/24 · 6 | PASS 6/24 · 6 | FAIL 6/24 · 4 | FAIL 19/18 · 2 OVER | PASS 6/18 |
| T02.2 Name already used | PASS 9/28 · 6 | PASS 9/28 · 6 | PASS 9/28 · 6 | PASS 8/28 · 6 | PASS† 8/28 · 5 | PASS† 9/28 · 5 | FAIL 10/21 · 2 | PASS† 8/21 |
| T03.1 Add another folder | PASS† 5/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS weak 5/20 · 4 | FAIL 3/15 · 4 | FAIL 14/15 |
| T04.1 Chat about one folder | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 7 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS 2/16 · 6 | FAIL 1/12 · 4 | FAIL 6/12 |
| T04.2 Closed conversation back | PASS 3/12 · 6 | PASS 4/12 · 6 | PASS 6/12 · 5 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/12 · 6 | PASS 5/12 · 6 | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 4/12 · 5 | PASS weak 4/12 · 4 | PASS 4/9 · 5 | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | PASS 1/3 |
| T06.1 Allow after reading | PASS 3/4 · 6 | PASS 2/4 · 6 | PASS 3/4 · 6 | FAIL OVER 5/4 · 5 | PASS weak at limit 4/4 · 4 | PASS 1/4 · 5 | PASS 1/3 · 5 | PASS 1/6 |
| T06.2 Deny | PASS 1/4 · 7 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 5 | PASS 1/3 · 6 | PASS 1/3 |
| T06.3 Make it ask first | PASS 9/24 · 5 | FAIL 4/24 · 6 | PASS 8/24 · 6 | PASS 7/24 · 5 | PASS 8/24 · 5 | PASS 7/24 · 5 | PASS 7/18 · 5 | no record |
| T07.1 Answer what is waiting | PASS 5/20 · 6 | PASS 2/20 · 6 | PASS 2/20 · 6 | PASS weak 6/20 · 4 | PASS 2/20 · 5 | PASS weak 2/20 · 4 | PASS 2/15 · 5 | PASS 2/15 |
| T08.1 Undo one file | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 4/20 · 5 | PASS weak 4/20 · 4 | PASS 4/15 · 5 | PASS 4/15 |
| T08.2 Review everything | PASS 2/24 · 6 | PASS 10/24 · 6 | PASS 4/24 · 6 | PASS 4/24 · 5 | PASS 4/24 · 5 | PASS weak 6/24 · 4 | PASS 3/18 · 5 | PASS† 2/18 |
| T09.1 Get it back | PASS 5/16 · 6 | PASS 5/16 · 6 | PASS 4/16 · 6 | PASS 4/16 · 5 | PASS 4/16 · 5 | PASS weak 3/16 · 4 | PASS 7/12 · 4 | PASS 4/12 |
| T10.1 Take away the command line | PASS 8/10 · 6 | PASS 4/10 · 6 | PASS† 4/10 · 6 | PASS 4/10 · 6 | PASS 5/10 · 5 | PASS weak 4/10 · 3 | PASS† 4/8 · 5 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/3 · 6 | PASS 0/3 |
| T11.1 Hold on | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | FAIL 1/3 |
| T11.2 Approve every step | PASS 6/12 · 6 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS weak 1/12 · 4 | PASS 1/9 · 6 | FAIL 9/9 at limit |
| T11.3 Carry on after a pause | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS weak 1/12 · 3 | FAIL 1/9 · 3 | PASS 4/9 |
| T12.1 Take the project away | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 5 | PASS 2/6 · 6 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 3/24 · 6 | PASS 3/24 · 6 | PASS 2/24 · 7 | PASS 3/24 · 6 | PASS 2/24 · 7 | PASS 2/24 · 6 | FAIL 7/18 · 2 | INVALID (harness)† 5/18 |
| T13.1 Leave it running | PASS 3/12 · 6 | PASS 3/12 · 5 | PASS weak 8/12 · 4 | PASS 2/12 · 5 | PASS 2/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 3/9 |
| T13.2 You were called back | PASS‡ 2/16 · 6 | PASS 2/16 · 6 | PASS 2/16 · 6 | PASS 3/16 · 6 | PASS 2/16 · 5 | PASS 3/16 · 5 | PASS 2/12 · 6 | PASS 2/12 |
| T14.1 Which one needs me? | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | INVALID† 2/8 · 5 | PASS 2/6 · 6 | PASS† 2/6 |
| T14.2 Rename | PASS 3/12 · 6 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 4/12 · 6 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/9 |
| T15.1 Throw one away | PASS 2/12 · 7 | PASS 2/12 · 6 | PASS 2/12 · 7 | PASS 3/12 · 5 | PASS 2/12 · 6 | PASS 2/12 · 5 | PASS 2/9 · 6 | PASS† 3/9 |
| T16.1 Stop it editing by itself | PASS 5/20 · 6 | PASS 4/20 · 6 | PASS 5/20 · 6 | PASS 6/20 · 6 | PASS 4/20 · 5 | PASS 4/20 · 5 | PASS 4/15 · 5 | PASS 5/15 |
| T16.2 What a setting covers | PASS 4/16 · 5 | PASS 4/16 · 6 | PASS 4/16 · 6 | PASS 3/16 · 5 | PASS† weak 2/16 · 4 | PASS† 2/16 · 5 | PASS† 2/12 · 5 | PASS 2/12 |
| T17.1 Use a different assistant | PASS 8/32 · 6 | PASS 8/32 · 6 | PASS 8/32 · 6 | PASS 7/32 · 6 | PASS 8/32 · 5 | PASS 7/32 · 5 | PASS 7/24 · 6 | PASS 10/24 |
| T17.2 It does not start | PASS weak 9/12 · 2 | FAIL 9/12 · 2 | PASS† 5/12 · 5 | PASS 5/12 · 5 | PASS 4/12 · 6 | PASS 1/12 · 6 | PASS† 9/9 · 3 at limit | FAIL 10/12 |
| T18.1-inline Form, inline | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/12 |
| T18.1-sidebar Form, sidebar | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 10/12 |
| T18.1-window Form, window | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 7/9 · 4 | PASS 3/12 |
| T18.2 A window you closed | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 6 | PASS 1/6 · 7 | PASS 1/8 |
| T19.1 Look at a web page | PASS 6/16 · 6 | PASS 6/16 · 7 | PASS 6/16 · 7 | PASS 6/16 · 6 | PASS 6/16 · 6 | INVALID† 4/16 · 4 | FAIL† 10/12 · 5 | FAIL 10/16 |
| T19.2 No network | PASS 2/12 · 6 | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 3/12 · 5 | PASS 1/12 · 6 | PASS† 0/12 · 5 | PASS 5/9 · 5 | PASS 9/12 |
| T20.1 Why was it refused? | PASS 2/20 · 6 | PASS 2/20 · 7 | PASS 8/20 · 5 | PASS 2/20 · 6 | PASS weak 5/20 · 4 | PASS† weak 16/20 · 3 | PASS 6/15 · 5 | PASS 5/20 |
| T20.2 Stuck assistant | PASS 7/16 · 6 | PASS weak 15/16 · 3 | PASS weak 11/16 · 4 | PASS 4/16 · 5 | PASS 5/16 · 6 | PASS 5/16 · 5 | PASS 5/12 · 5 | PASS 7/16 |
| T21.1 No mouse | PASS 6/16 · 6 | PASS 5/16 · 6 | PASS 6/16 · 6 | PASS 4/16 · 6 | PASS 4/18 · 5 | PASS 5/18 · 5 | PASS† 19/36 · 6 | FAIL 19/48 |
| T22.1 Ask for help | PASS 4/8 · 7 | PASS 3/8 · 7 | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS† 3/8 · 6 | PASS† 1/6 · 2 | FAIL 9/8 **OVER +1** |
| T22.2 Find a topic by search | PASS 1/16 · 6 | PASS† 1/16 · 6 | PASS weak 12/16 · 4 | PASS 5/16 · 6 | PASS 5/16 · 6 | PASS 9/16 · 5 | PASS 8/12 · 4 | PASS† 7/16 |
| T23.1 It crashed | PASS 1/16 · 7 | PASS 1/16 · 7 | PASS 1/16 · 6 | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 5/12 · 4 | PASS 3/16 |
| T23.2 Connection dropped | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 7/12 |
| T24.1 What changed in git | PASS 3/20 · 6 | PASS 3/20 · 6 | PASS 2/20 · 6 | PASS 3/20 · 6 | PASS 2/20 · 6 | PASS† 4/20 · 5 | PASS 4/15 · 5 | PASS 6/20 |
| T24.2 Not a Git project | PASS 3/16 · 6 | PASS 2/16 · 6 | PASS 3/16 · 6 | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 1/12 · 6 | PASS 1/16 |
| T25.1 The blocking comment | PASS 0/12 · 7 | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 0/12 · 6 | PASS 2/12 · 6 | PASS 1/12 · 6 | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 1/8 · 5 | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS 0/8 · 6 | PASS 0/8 · 7 | PASS 0/8 · 7 | PASS† 0/6 · 6 | not run |
| T26.1 Pass the remarks on | PASS 2/16 · 6 | PASS 2/16 · 6 | PASS 2/16 · 6 | PASS 2/16 · 6 | PASS 2/16 · 5 | PASS 3/16 · 6 | PASS 4/12 · 6 | not run |
| T26.2 Your own remark | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 5 | PASS 4/20 · 6 | PASS 12/15 · 4 | not run |
| T27.1 Explain these lines | PASS 4/12 · 6 | PASS 5/12 · 6 | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 3/12 · 6 | PASS 4/12 · 6 | PASS 4/9 · 5 | not run |
| T27.2 More room for the file | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS† 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 3/4 · 6 | FAIL† 3/3 · 4 at limit | not run |
| T28.1 Assistant reads a web page | PASS‡ weak 6/12 · 4 | PASS weak 7/12 · 3 | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 4/12 · 6 | PASS 3/12 · 6 | PASS 4/9 · 4 | not run |
| T28.2 Take back the page | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 1/4 · 7 | PASS† 1/3 · 4 | not run |
| T29.1 Two pages side by side | PASS‡ 5/20 · 7 | PASS 5/20 · 7 | PASS 5/20 · 7 | PASS 5/20 · 6 | PASS 5/20 · 7 | PASS† 5/20 · 5 | INVALID† 6/15 · 3 | not run |
| T30.1 Open a file from the list | PASS 3/16 · 6 | PASS 4/16 · 6 | PASS 3/16 · 7 | PASS 3/16 · 6 | PASS 3/16 · 6 | PASS 2/16 · 7 | PASS 2/12 · 2 | not run |
| T30.2 Which version? | PASS 3/8 · 6 | PASS 2/8 · 7 | PASS 2/8 · 7 | PASS 3/8 · 7 | PASS 3/8 · 6 | PASS 4/8 · 5 | PASS 2/6 · 2 | not run |
| T31.1 How do I save? | PASS 3/8 · 7 | PASS 3/8 · 6 | PASS 4/8 · 6 | PASS 2/8 · 6 | PASS 1/8 · 7 | PASS 2/8 · 6 | PASS 2/6 · 2 | not run |
| T31.2 Why can I not type here? | PASS 4/8 · 6 | PASS 4/8 · 5 | PASS 5/8 · 5 | PASS 3/8 · 6 | PASS 2/8 · 6 | PASS 3/8 · 6 | PASS 4/6 · 3 | not run |
| T23.1b Crash twice (`T23.1-twice` in the R5 session folders) | PASS 2/12 · 6 | PASS 2/12 · 6 | PASS 2/12 · 6 | PASS weak 4/12 · 4 | INVALID† SETUP FAIL 0/16 · n/a | not run | not run | not run |

### Intermediate (Sonnet)
| Task | R8 | R7 | R6 | R5 | R4 | R3 | R2 | R1 |
|---|---|---|---|---|---|---|---|---|
| T01.1 Find the start | PASS at limit 3/3 · 6 | PASS weak at limit 3/3 · 3 | PASS weak at limit 3/3 · 5 | PASS 2/3 · 6 | PASS at limit 3/3 · 6 | carried | PASS 3/3 · 6 (carried) at limit | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 7/18 · 6 | PASS 7/18 · 7 | PASS 7/18 · 7 | PASS 6/18 · 7 | PASS 7/18 · 6 | PASS 8/18 · 7 | PASS 7/18 · 6 (carried) | PASS 7/18 |
| T02.2 Name already used | PASS 9/21 · 6 | PASS 8/21 · 7 | PASS 8/21 · 7 | PASS† 9/21 · 6 | PASS 8/21 · 7 | PASS† 9/21 · 6 | PASS† 8/21 · 6 (carried) | PASS† 8/21 |
| T03.1 Add another folder | PASS† 5/15 · 6 | PASS 5/15 · 6 | PASS 4/15 · 7 | PASS 7/15 · 5 | PASS 5/15 · 6 | PASS 5/15 · 7 | PASS 3/15 · 6 | PASS 5/15 |
| T04.1 Chat about one folder | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 6 | PASS 1/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 5/12 |
| T04.2 Closed conversation back | PASS 3/9 · 6 | PASS 3/9 · 6 | PASS 5/9 · 5 | PASS 1/9 · 7 | PASS 1/9 · 7 | carried | PASS 1/9 · 7 (carried) | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 6 | PASS 4/9 · 6 | carried | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | carried | PASS 1/3 · 7 (carried) | PASS 1/3 |
| T06.1 Allow after reading | PASS weak at limit 3/3 · 6 | PASS 2/3 · 7 | FAIL at limit 3/3 · 5 | FAIL† 2/3 · 5 | PASS at limit 3/3 · 5 | carried | PASS 1/6 · 6 (carried) | PASS 1/6 |
| T06.2 Deny | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | carried | PASS 1/3 · 6 (carried) | PASS 1/3 |
| T06.3 Make it ask first | PASS 8/18 · 6 | PASS 8/18 · 6 | PASS 8/18 · 6 | PASS 8/18 · 7 | PASS 10/18 · 5 | carried | PASS 9/18 · 5 (carried) | PASS 9/18 |
| T07.1 Answer what is waiting | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | carried | PASS 3/15 · 6 (carried) | PASS 3/15 |
| T08.1 Undo one file | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 6 | carried | PASS 4/15 · 6 (carried) | PASS 4/15 |
| T08.2 Review everything | PASS 2/18 · 7 | PASS 3/18 · 7 | PASS 3/18 · 7 | PASS 6/18 · 5 | PASS 7/18 · 5 | carried | PASS 6/18 · 5 (carried) | PASS 6/18 |
| T09.1 Get it back | PASS 4/12 · 7 | PASS 5/12 · 7 | PASS 8/12 · 5 | PASS 3/12 · 7 | PASS 4/12 · 6 | carried | PASS 3/12 · 7 (carried) | PASS 3/12 |
| T10.1 Take away the command line | PASS 4/8 · 7 | PASS 4/8 · 6 | PASS 4/8 · 7 | PASS 4/8 · 7 | PASS 5/8 · 5 | carried | PASS† 4/8 · 6 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 1/3 · 7 | PASS 0/3 · 7 | PASS 1/3 · 7 | PASS 0/3 · 7 | PASS 0/3 · 7 | carried | PASS 0/3 · 7 (carried) | PASS 0/3 |
| T11.1 Hold on | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 6 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 |
| T11.2 Approve every step | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 6 | PASS 1/9 · 6 | PASS 1/9 · 7 | PASS 1/9 · 6 | FAIL 8/9 |
| T11.3 Carry on after a pause | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T12.1 Take the project away | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | FAIL 14/18 · 2 | INVALID (harness)† 16/18 |
| T13.1 Leave it running | PASS 3/9 · 7 | PASS 4/9 · 6 | PASS weak 8/9 · 3 | PASS 2/9 · 6 | PASS 2/9 · 7 | carried | PASS† 2/9 · 6 (carried) | PASS† 2/9 |
| T13.2 You were called back | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 6 | carried | PASS 2/12 · 7 (carried) | PASS 2/12 |
| T14.1 Which one needs me? | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 6 | carried | PASS† 1/6 · 7 (carried) | PASS† 1/6 |
| T14.2 Rename | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 7 | carried | PASS 4/9 · 7 (carried) | PASS 4/9 |
| T15.1 Throw one away | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | carried | PASS 3/9 · 7 (carried) | PASS 3/9 |
| T16.1 Stop it editing by itself | PASS 5/15 · 6 | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS 7/15 · 6 | PASS 4/15 · 6 | carried | PASS 6/15 · 6 (carried) | PASS 6/15 |
| T16.2 What a setting covers | PASS 3/12 · 6 | PASS 2/12 · 7 | PASS 3/12 · 7 | PASS 2/12 · 7 | PASS† 4/12 · 5 | carried | PASS 3/12 · 6 (carried) | PASS 3/12 |
| T17.1 Use a different assistant | PASS 7/24 · 7 | PASS 7/24 · 7 | PASS 7/24 · 7 | PASS 7/24 · 7 | PASS 7/24 · 6 | carried | PASS 10/24 · 6 (carried) | PASS 10/24 |
| T17.2 It does not start | PASS 5/9 · 6 | PASS 1/9 · 7 | PASS 2/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | pending |
| T18.1-inline Form, inline | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 5/9 · 6 (carried) | pending |
| T18.1-sidebar Form, sidebar | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 4/9 · 7 (carried) | pending |
| T18.1-window Form, window | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 4/9 · 7 (carried) | pending |
| T18.2 A window you closed | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 (carried) | pending |
| T19.1 Look at a web page | PASS 6/12 · 7 | PASS 6/12 · 7 | PASS 6/12 · 7 | PASS 6/12 · 7 | PASS 6/12 · 6 | INVALID† 4/12 · 5 | PASS† 7/12 · 5 | pending |
| T19.2 No network | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 2/9 · 5 | pending |
| T20.1 Why was it refused? | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS weak 7/15 · 4 | carried | PASS 5/15 · 6 (carried) | pending |
| T20.2 Stuck assistant | PASS 4/12 · 6 | PASS 7/12 · 5 | PASS 6/12 · 6 | PASS 6/12 · 6 | PASS 5/12 · 6 | carried | PASS 5/12 · 6 (carried) | pending |
| T21.1 No mouse | PASS 4/12 · 6 | PASS 4/12 · 7 | PASS 4/12 · 7 | PASS 4/12 · 7 | PASS 4/18 · 6 | PASS 4/18 · 6 | PASS† 18/36 · 4 | pending |
| T22.1 Ask for help | PASS 3/6 · 7 | PASS 3/6 · 7 | PASS 4/6 · 7 | PASS 2/6 · 7 | PASS† 2/6 · 7 | PASS† 2/6 · 7 | PASS 2/6 · 7 | pending |
| T22.2 Find a topic by search | PASS 1/12 · 7 | PASS† 1/12 · 7 | PASS 7/12 · 7 | PASS 5/12 · 7 | PASS 2/12 · 7 | carried | PASS 5/12 · 7 | pending |
| T23.1 It crashed | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 5 | PASS 8/12 · 5 (carried) | pending |
| T23.2 Connection dropped | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 3/9 · 5 | PASS 1/9 · 7 | PASS 1/9 · 7 | carried | PASS 5/9 · 5 (carried) | pending |
| T24.1 What changed in git | PASS 3/15 · 7 | PASS 3/15 · 7 | PASS 2/15 · 7 | PASS 3/15 · 6 | PASS 2/15 · 7 | carried | PASS 5/15 · 6 (carried) | pending |
| T24.2 Not a Git project | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 7 (carried) | pending |
| T25.1 The blocking comment | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | carried | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 0/6 · 7 | PASS 0/6 · 7 | PASS 0/6 · 7 | PASS 0/6 · 7 | PASS 0/6 · 7 | carried | PASS 0/6 · 7 | not run |
| T26.1 Pass the remarks on | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 3/12 · 7 | not run |
| T26.2 Your own remark | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 3/15 · 6 | PASS 4/15 · 5 | PASS 7/15 · 5 | not run |
| T27.1 Explain these lines | PASS 5/9 · 5 | PASS 7/9 · 5 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 3/9 · 6 | PASS 3/9 · 7 | not run |
| T27.2 More room for the file | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS† 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 4 | FAIL† 3/3 · 5 at limit | not run |
| T28.1 Assistant reads a web page | FAIL 5/9 · 5 | PASS 4/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 4/9 · 6 | PASS 4/9 · 6 | PASS 3/9 · 6 | not run |
| T28.2 Take back the page | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 3 | not run |
| T29.1 Two pages side by side | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS† 5/15 · 7 | INVALID† 5/15 · 6 | not run |
| T30.1 Open a file from the list | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | carried | PASS 3/12 · 7 | not run |
| T30.2 Which version? | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 3/6 · 7 | carried | PASS 2/6 · 7 | not run |
| T31.1 How do I save? | PASS 3/6 · 7 | PASS 3/6 · 7 | PASS 4/6 · 7 | PASS 2/6 · 7 | PASS 1/6 · 7 | carried | PASS 3/6 · 6 | not run |
| T31.2 Why can I not type here? | PASS 4/6 · 7 | PASS 3/6 · 7 | PASS 4/6 · 6 | PASS 2/6 · 7 | PASS 2/6 · 7 | carried | PASS 3/6 · 7 | not run |
| T23.1b Crash twice (`T23.1-twice` in the R5 session folders) | PASS 2/9 · 7 | PASS 5/9 · 6 | PASS 6/9 · 5 | PASS 3/9 · 6 | INVALID† SETUP FAIL 0/12 · n/a | not run | not run | not run |

### Totals after researcher decisions

| Level | Rows | PASS | FAIL | INVALID | Pass rate (INVALID counts as not passed) | Raw checker PASS (before decisions) | Median SEQ | Tasks with SEQ below 5 | Weak passes |
|---|---|---|---|---|---|---|---|---|---|
| **Novice R8**, 60 rows (all in `tasks.md`) | 60 | 60 (1 with †) | 0 | 0 | **100%** | 59 of 60 (98%); 1 FAIL | **6** | 2 | 2 |
| **Intermediate R8**, 60 rows (all re-run) | 60 | 59 (1 with †) | 1 (T28.1) | 0 | **98%** | 58 of 60 (97%); 2 FAIL | **7** | 0 | 1 |
| Novice R7, 60 rows | 60 | 58 (1 with †) | 2 (T06.3, T17.2) | 0 | 97% | 57 of 60 (95%) | 6 | 3 | 2 |
| Intermediate R7, 60 rows | 60 | 60 (1 with †) | 0 | 0 | 100% | 59 of 60 (98%) | 7 | 1 | 1 |
| Novice R6, 60 rows | 60 | 60 (3 with †) | 0 | 0 | 100% | 57 of 60 (95%) | 6 | 4 | 4 |
| Intermediate R6, 60 rows | 60 | 59 (1 with †) | 1 (T06.1, answer and budget) | 0 | 98% | 58 of 60 (97%) | 7 | 1 | 2 |
| Novice R5, 60 rows | 60 | 59 | 1 (T06.1, budget) | 0 | 98% | 59 of 60 (98%) | 6 | 2 | 2 |
| Intermediate R5, 60 rows | 60 | 59 (1 with †) | 1 (T06.1, answer †) | 0 | 98% | 59 of 60 (98%); 1 MANUAL | 7 | 0 | 0 |
| Novice R4, with the extra row | 60 | 59 | 0 | 1 | 98% | 57 of 60 (95%) | 6 | 3 | 3 |
| Intermediate R4, with T23.1-twice | 60 | 59 | 0 | 1 | 98% | 57 of 60 (95%) | 7 | 1 | 3 |
| Novice R3 | 59 | 56 (7 with †) | 1 | 2 | 95% | 50 of 59 (85%) | 5 | 12 | 10 |
| Intermediate R3, all rows (27 re-run and 32 carried) | 59 | 57 | 1 | 1 | 97% | not recomputed | 7 | 1 | 0 |
| Novice R2 | 59 | 50 | 8 | 1 | 85% | 44 of 59 (75%) | 5 | 21 | |
| Intermediate R2, all rows | 59 | 55 | 3 | 1 | 93% | 21 of 26 re-run (81%) | 6 | 3 | |
| Novice R1 | 45 | 34 | 10 | 1 | 76% | 27 of 45 (60%) | 4 | 27 | |
| Intermediate R1 | 46 | 40 | 5 | 1 | 87% | not recomputed | 6 | 8 | |

**Median SEQ** over the rating of each record (all 60 rows): novice **6** (mean 6.05: 13 rows at 7, 41 at 6, 4 at 5, 1 at 4, 1 at 2), intermediate **7** (mean 6.73: 46 rows at 7, 12 at 6, 2 at 5). R7 was novice 6 (mean 6.05) and intermediate 7 (mean 6.77). Both medians hold. **The novice pass rate returns to 100%** (T06.3 and T17.2 pass) **and the intermediate rate falls from 100% to 98%** (T28.1 fails). Compared with R7 row by row: novice 9 rows higher, 11 lower, 40 equal; intermediate 5 higher, 8 lower, 47 equal.

The rows that went up are the effect of R7 fixes. UX-176 (T20.2 novice 3 to 6 and 15 to 7 actions, intermediate 5 to 6 and 7 to 4 actions), UX-179 (T01.1 intermediate 3 to 6), UX-175 (T23.1b intermediate 6 to 7), UX-163 and UX-180 (T13.1 novice 5 to 6, intermediate 6 to 7), UX-190 (T31.2 novice 5 to 6). The rows that went down are mostly one point (T02.1, T04.1, T11.2, T14.2, T19.1, T20.1, T30.2 novice 7 to 6; T02.1, T02.2, T06.1, T16.1, T16.2, T17.2, T21.1 intermediate 7 to 6): with fresh panelists in both rounds, one point is within the spread between two panelists. The real drops are T01.1 novice (6 to 5: four actions cannot finish the setup), T06.3 novice (6 to 5: the detour through the take-control box), T16.2 novice and T25.2 novice (6 to 5), T27.1 intermediate (SEQ 5, partial line in the question), and T28.1 at both levels (novice 3 to 4 after a failed first attempt, intermediate 7 to 5 and FAIL: 2.1). T17.2 novice stays at 2.

**Weak passes and non-clean rows.** Weak (counted as PASS, the margin is thin): novice T17.2 (9 of 12, SEQ 2, three check runs) and T28.1 (6 of 12, SEQ 4, a rerun), intermediate T06.1 (3 of 3, SEQ 6, at the limit). R7 had two at novice and one at intermediate. SEQ 5 rows are listed in 2.1.

**Release gate** (`process.md` exit criteria 2 to 5 and the panel rules of R3 to R7; without the expert tier). Every criterion:

| Criterion | Novice | Intermediate | Met |
|---|---|---|---|
| All tasks pass | 60 of 60 (T03.1 by †) | 59 of 60 (T03.1 by †; T28.1 FAIL) | **No.** T28.1 fails at the intermediate level (2.1, H-108, UX-195). |
| Median SEQ at least 6 | 6 | 7 | **Yes** at both levels (R7 also yes). |
| No task below 5 (R3 working rule, not in `process.md`) | 2 tasks (T17.2 at 2, T28.1 at 4) | 0 tasks | **No** at the novice level, yes at the intermediate level (R7: 3 and 1). |
| Fresh panelists, packaged build (`process.md` 10) | fresh in 120 of 120, packaged in 120 of 120 | same | **Yes, without the R7 caveat:** one commit id (`662b12c8ef`) in 120 of 120 (H-100 verified). |
| Every journey 10/10 (`scorecard.md`) | | | **No: 0 of 31.** |
| No S1 to S3 finding open (`process.md` criterion 3) | | | **No.** 0 S1, 0 S2, 9 S3 (UX-193 to UX-198, UX-207, UX-212, UX-213) and 15 S4 items are open (R7: 2 S2, 5 S3, 13 S4). |
| Documentation gate | | | **Partly.** Coverage 540 of 540 ids; F1 opens the right topic (T01.1 novice, T22.1, T31.1, T31.2); the Help text above a jump target is still cut (`T22.1-novice 004`, UX-205). No procedure was followed word for word by a fresh reviewer. |
| Accessibility scan (D5, `process.md` 4) | | | **No.** No axe result, no manual checklist, no screen reader pass. |
| Performance (D10, `process.md` 5) | | | **No.** Waits for the reference-machine run. |
| Code Review by the chat (UX-193, new) | | | **Open.** The owner reported that a chat asked for a review could not use the review tools. A fix is in progress. The round 9 re-test is H-115. |

**The gate is not met.** The panel part is close and better than in R7: no S2 item is open, no task failed because of a product cause, both medians hold, the novice pass rate is 100%, and the packaged-build clause is clean. What blocks the gate: one failed intermediate task (T28.1) with an open harness cause, two novice tasks below SEQ 5 (T17.2 at 2, T28.1 at 4), nine S3 items, 15 S4 items and the S4 acceptance by the UX lead, D5 (no axe re-scan, no manual checklist, no screen reader pass), D10 (no reference-machine run), and the UX-193 re-test.

What changed since round 7. **Fixed and confirmed in the shots:** UX-173 (the box reads "Ask before every action (until I untick it)", the chips read "Ask (now)", the note "This is not saved. To keep a tool on Ask, change it in Control Center." is under the bar and in the Activity gadget: `T06.3-novice 002`), UX-174 in part ("Choose another agent" is the highlighted button and the text says "Check that it is installed, or choose another agent.": `T17.2-novice 001`, `008`), UX-175 (T23.1b intermediate: "Start a new chat with your text" opens a New chat with the text in its box), UX-176 (File > "End the agent program...", the status link, the launcher sentence "To end them, use Task Manager": `T14.1-novice 001`, `T20.2-novice 008`), UX-179 (T01.1 both: the balloon button opens Computer), UX-182 (`T03.1-novice 005`: Documents and Desktop once), UX-185 (`T09.1-novice 003`: "This change was undone. Restore it from the Recycle Bin." and a Restore... button), UX-186 (`T27.1-intermediate 002`, `003`: "Selected 1-2"), UX-191 (`T26.1-novice 005`, `T25.2-novice 001`: one sentence, full width). **Fixed in part:** UX-177, UX-178, UX-180, UX-183, UX-184, UX-187, UX-190, UX-192. **Not fixed or got worse:** UX-181 (windows over windows), UX-188 (the Activity gadget now says "Nothing has happened yet." beside a warning: `T20.1-novice 001`, `002`), UX-189 (Browser). **New:** "Show the whole change" does nothing in a short window (TH-123, S3), the failed turn "The agent did not answer in time." with no route (TH-124, S3), the start-failure dead end (TH-125, S3), the Permissions page squeezed by the chat pane (TH-126, S3).

## 2. Researcher decisions

### 2.1 Every verdict that is not a clean PASS

| Cell | Checker said | Decision | Reason |
|---|---|---|---|
| T03.1 novice and intermediate | FAIL: "not met: an Explorer window shows its root" (5 of 20 and 5 of 15, SEQ 6 and 6) | **PASS†, stale checker (facilitator override, H-106 done)** | Since UX-181 Plug in shows the new project in the Projects tree of Code and opens no Explorer window. `T03.1-novice 007`: docs-site (F:) is selected in the tree with its `docs`, `index.md`, `README.md`, and the toast "Project plugged in: docs-site (F:) is ready to use." The checker still looked for an Explorer window. The scenario's goal (make the folder available and see its files) is met in 5 actions at both levels. H-106 changed the checker mid-round. The records are not re-run. |
| T28.1 intermediate | FAIL: "not met: the assistant finished the web app job" (5 of 9, SEQ 5) | **FAIL, harness cause first (H-108), product route missing (UX-195, S3)** | The assistant opened the page, read it, clicked "random" and "general", scrolled and waited (15 steps), then the chat said "The agent did not answer in time." (`T28.1-intermediate 006`). The cause is in the scripted `browser-agent`: its step "older messages load (2)" waits for the text "Standup notes" and `browser_wait` gives up after its default 5000 ms ("Timed out after 5183 ms waiting for "Standup notes"", `T28.1-novice 007`). The product then shows its generic timeout sentence because the failure text contains "Timed out" (`chatProblem.ts` `isTimeout`). It is not load: **2 of 2 first attempts failed at the same step with the same screen** (`T28.1-intermediate 006` and `T28.1-novice 006` are identical: messages 161 to 173 in #general, 15 steps) and the novice's second Send passed (`T28.1-novice 011`). R7 had no timeout (28 steps, both rows passed). So something changed between R7 and this build, in the fixture page, in `browser_scroll` or in `browser_wait`, and I cannot tell which without running it (section 5, H-108). I do not override: the intermediate panelist ended without the result. The rubric floor of S2 for a failed task goes to H-108 (harness) and not to a product finding, because the product did what it should for the failure it was given. If H-108 shows a product cause, it becomes S2. The product part is real: the status text is cut ("The agent did not answer in time. Click D"), there is no "Send again" button (the line says "Click Details" because the turn was not unanswered), Reconnect does not resend, and Details show a script log (UX-195). |
| T28.1 novice | PASS: 6 of 12, SEQ 4 | **PASS, weak, rerun with a fresh panelist, same cause (H-108, UX-195)** | The first attempt failed at the same step (`T28.1-novice 006`, 007). The novice pressed Details (a script log it could not use), Reconnect (`008`: "Connected" and the text stayed in the box, nothing was sent), then Send again, and the retry finished: "I sent the message and found it in #general." (`011`). The answer ("Yellow banner read Agent is using this page: Scrolling top (004.png); it searched #general for Standup") names the bar and the work. |
| T17.2 novice | PASS: 9 of 12, SEQ 2, **three check runs** | **PASS, weak (S3, UX-196, UX-197, UX-213; fixture H-107, H-119)** | The panelist found the cause at once (`T17.2-novice 001`: "the program 'not-a-real-command' was not found ... Check the command in Agents, or choose another agent."), clicked **Open Agents** (not the highlighted "Choose another agent"), picked **Claude Code**, the first row of the list (`002`), pressed Set as Default and Try again with Claude Code. Claude Code needs `npx`, which the panel sandbox cannot run, so the chat showed "The default agent is now Claude Code. It could not start either. The program 'npx' stopped before it was ready. Check that it is installed, or choose another agent." (`008`). The list also had "Scripted Agent" and "Helper assistant", which work (T17.2 intermediate picked "Scripted Agent" and passed in 5 of 9, SEQ 6). The novice then read Details ("Internal error", "ACP session/new (response) (error)", `009`, `010`) and Event Viewer (`011`: General says "Internal error", Details say "Query closed before response received", `012`), and gave up with SEQ 2. The answer names the cause and says to use the Agents page and choose another agent, so the scenario is met. **Check runs:** run 1 and run 2 failed only on the answer words (`check.json.runs`: "state ok but the answer lacks: ..." with the regular expressions), and run 3 passed. The facts did not change between runs, but the check output tells the panelist the words it needs, so a panelist can tune the answer until it passes (H-119). The result stands, because the first answer already had the cause and the Agents page and the third adds the action the panelist had done. |
| T06.3 novice | PASS: 9 of 24, SEQ 5 | **PASS (UX-173 works, a detour remains: UX-199)** | The panelist ticked "Ask before every action (until I untick it)" first. `T06.3-novice 002`: all chips read "Ask (now)", the bar says "You are in control. All tools ask first until you resume." with Resume, and the line "This is not saved. To keep a tool on Ask, change it in Control Center." has a Control Center link. The panelist read the note, went to Control Center, Permissions, set Run commands to Ask, OK ("Saved. New requests use these settings." `007`), and the check holds (`notes`: userInControl true, policy Ask). The panelist wrote that the label ("until I untick it") and the note ("not saved") contradict each other. R7 failed here. Two more actions than the intermediate (8 of 18, SEQ 6), which went to the Run commands chip at once. |
| T06.1 intermediate | PASS: 3 of 3, SEQ 6, weak (at the limit) | **PASS, weak (S3, UX-194)** | The panelist pressed "Show the whole change" (`002`: nothing changed) and then scrolled the diff. R7: 2 of 3 and SEQ 7. T06.1 novice did the same (3 of 4, SEQ 6; `T06.1-novice 001` and `002` are identical apart from the pointer). |
| T13.2 novice | PASS: 2 of 16, SEQ 6 | **PASS, finished by the facilitator** | See the facts above. The check, record and stop are the facilitator's. The record has a "Researcher notes" line that says so. |
| T29.1 novice | PASS: 5 of 20, SEQ 7 | **PASS, rerun with a fresh panelist** | The first run was lost to the usage limit. The rerun has no errors. |
| T01.1 novice and intermediate | PASS: 4 of 4 (SEQ 5) and 3 of 3 (SEQ 6) | **PASS, not weak** | Both are at the budget, but the check held at the first action (`stepsToPass` 1, H-101 works) and the panelists went on to plug in a project (novice: "ran out of actions at the Browse For Folder dialog"). The balloon button works (UX-179): `T01.1-intermediate` steps 3 and 4. |
| T22.2 novice and intermediate | PASS: 1 of 16 and 1 of 12 (SEQ 6 and 7) | **PASS** | The check now accepts the answer without a Help window (H-96 works): "no Help window; the answer decides". The chat's welcome text answers. `T22.2-novice 002`: Revert is greyed and says "Nothing to revert yet." (R7: no reason). |

**SEQ 5 rows (clean passes, listed so that the causes are not lost).** Novice (4): T01.1 (four actions cannot finish the setup), T06.3 (the take-control detour), T16.2 (a single click on the Control Center icon, then a scroll to the Notepad row), T25.2 (the empty chat panel and the words "Blocker" and "Minor"). Intermediate (2): T27.1 (the question quotes half of line 2, and the typed text contained a line break that sent the message: H-118), T28.1 (FAIL, above).

### 2.2 Build and method

**Decision: R8 is the first round with one build id.** `session.json.build` is `{packaged: true, version: "0.1.0", commit: "662b12c8ef..."}` in 120 of 120 files and every record has the `Build:` line. The R7 caveat (two commit ids) is gone, so H-100 is verified.

**Fresh panelists.** `previousTasks` is `[]` in 120 of 120 files. The step counts and the D2 evidence stand. Two reruns and one facilitator finish are explained in the facts above.

**Records that did not look at every shot.** One record says that a shot was not opened (T20.2 novice, 004). R7 had four. H-105 works.

**A protocol slip.** T30.2 novice read the record folder and `check.json` after the PASS verdict (facilitator note). The log shows only five driver actions (`T30.2-novice-session/log.jsonl`), so file reads are not visible. The slip came after the verdict and changed nothing in the steps or the answer ("Notepad is part of Agent7, version 0.1.0", the same as in the record steps). The row counts. H-113 asks for a guard.

### 2.3 Verification of the R7 backlog (details in `FIX-BACKLOG-R8.md`)

20 items: **8 fixed** (UX-173, 175, 176, 179, 182, 185, 186, 191), **9 fixed in part** (UX-174, 177, 178, 180, 183, 184, 187, 190, 192), **3 not fixed or worse** (UX-181, 188, 189). Shots are named `<task>-<level> <number>`. A record without a number was read, not viewed.

| R7 item | Verdict | Evidence in R8 |
|---|---|---|
| UX-173 "Ask before every action" reads like a saved setting | **Fixed** | `T06.3-novice 002`: label "(until I untick it)", chips "Ask (now)", "This is not saved. To keep a tool on Ask, change it in Control Center." with a link, in the bar and the Activity gadget. T06.3 passes at both levels (novice 9 of 24 SEQ 5, intermediate 8 of 18 SEQ 6). T11.2 (SEQ 6 and 7) and T28.2 (SEQ 6 and 7) unchanged. Residue: the label and the note use three phrases ("until I untick it", "until you resume", "not saved") and the novice found them contradictory: UX-199 (S4). |
| UX-174 crash box default and second error | **Fixed in part** | `T17.2-novice 001`: "Choose another agent" is the highlighted button, "Try again" second; text "Check the command in Agents, or choose another agent." `008`: "The default agent is now Claude Code. It could not start either. ... Check that it is installed, or choose another agent." T17.2 intermediate passes in 5 of 9 (SEQ 6). Still wrong: Details start with "Internal error" and "ACP session/new (response) (error)" (`009`, `010`), Event Viewer says "Internal error" and "Query closed before response received" (`011`, `012`), and the Agents list offers Claude Code, which cannot start (`002`). T17.2 novice SEQ 2. UX-196, UX-197, UX-213, H-107. |
| UX-175 "Start a new chat (your text is kept in the box)" | **Fixed** | T23.1b intermediate record step 1 and `002`: "Start a new chat with your text" opens a New chat with "please do the slow job" in its box; Send once. SEQ 7. Residue: the old window keeps its red box and "Disconnected" (T23.1b intermediate record): UX-201 (S4). |
| UX-176 no door to "End process" | **Fixed** | T20.2 intermediate: File > "End the agent program..." opens Task Manager, 4 of 12 actions, SEQ 6 (R7 7 of 12, SEQ 5); a "Not responding? End the agent program" button in the status bar. T20.2 novice: 7 of 16, SEQ 6 (R7 15 of 16, SEQ 3): Control Center and its File menu were two dead ends, then the chat's File menu. `T14.1-novice 001`: the launcher says "To end them, use Task Manager" with a link. `T20.2-novice 008`: Task Manager opens on Processes with "Select a program first". Residue: the red box "The agent program was stopped." for an action the user took, the box refilled with the old message and Send active, the status text cut (`T20.2-novice 008`, `009`): UX-201. |
| UX-177 diff in the permission box one scroll short | **Fixed in part** | `T06.1-novice 001`: about seven diff rows, the third added line is cut, the status bar says "Waiting for your answer". The link "Show the whole change" does nothing (`002`): UX-194 (S3). `T07.1-novice 001`: the second chat window is about 450 px wide, its diff shows three rows and its Send button wraps under the others. |
| UX-178 words | **Fixed in part** | The chips now say "Ask (now)" in take-control mode. Still: "Ask (Terminal is closed)" (T10.2 N record: "does not say what Ask means"), "Stop" against "Pause all agents" (T05.2 N, T11.1 N and I), the stop notice that mixes "stop this reply" with "stop all agents" and "Task Manager, Processes" (T05.2 N), "Agent can use nothing yet" reads like a failure (`T02.1-novice` record, 007), no hover tooltip on the chips in three records (T10.2 N and I, T16.2 I: the chips use the browser `title`, which a shot cannot show, H-112; the app's own tooltip works elsewhere: T22.1 intermediate). UX-200 (S4). |
| UX-179 dead balloon button | **Fixed** | T01.1 intermediate steps 2 and 3 and T01.1 novice steps 3 and 4: "Open Computer" opens Computer with "Plug in a project..." and "No projects plugged in". SEQ 6 and 5 (R7 3). |
| UX-180 Chats icon and Task Manager | **Fixed in part** | `T04.2-novice 003`: a double-click on the Chats icon opens "Chats - Task Manager", a row is selected, End Task is enabled; the chat reopens with "Reopened 'hello'. Your earlier messages are kept." T04.2 SEQ 6 and 6; T13.1 SEQ 6 and 7 (R7 5 and 6). Still: the window title "Chats - Task Manager" does not say it reopens closed chats and the list says only "Idle" (T04.2 N record): UX-204 (S4). |
| UX-181 new windows over the window that opened them | **Not fixed (Plug in part fixed)** | Plug in: no Explorer window, the project shows in the tree (`T03.1-novice 007`). Still: Computer behind the chat (T12.2 N and I records), Code behind the chat (T08.1 N, T08.2 I), Control Center covers the chat after OK (T06.3 I), Event Viewer over the chat (`T20.1-novice 002`), the second chat window narrow (`T07.1-novice 001`). UX-203 (S4). |
| UX-182 Browse For Folder duplicates | **Fixed** | `T03.1-novice 005`: Desktop once, Documents once (docs-site, login-app, notes-folder), "Projects you used before" on top. The folder field still shows the fixture path (H-104). |
| UX-183 Help residue | **Fixed in part** | The status bar shows "Using Explorer" once (`T22.1-novice 004`); the contents have "Save a file" (T31.1 intermediate record). Still: the text above the target heading is cut ("7 - Need Help?" half visible, `T22.1-novice 004`), F1 lands at the top of a long topic (4284 px, T22.1 N and I records), "Save a file" has no number (T31.1 I). UX-205 (S4). |
| UX-184 Changes pane diff six rows, columns cut | **Fixed in part** | `T08.2-novice 002`: the list shows five rows and the diff pane is tall; T08.2 takes 2 actions at both levels (R7 novice 10). Still cut: "Modi...", "M...", "A...", "R..." in Status and "E:\..." in Path (`T08.2-novice 002`, `T09.1-novice 003`), and the line "Select a changed file first." sits under a selected row (`T09.1-novice 003`). UX-207 (S3). |
| UX-185 reverted row has no Restore | **Fixed** | `T09.1-novice 003`: "This change was undone. Restore it from the Recycle Bin." and a "Restore..." button on the row. T09.1 SEQ 6 and 7, 5 and 4 actions. Residue: "Restore..." opens the Recycle Bin and does not restore (record steps 3 to 5): UX-209 (S4). |
| UX-186 Code: a click in the line number column | **Fixed** | `T27.1-intermediate 002`, `003`: a drag selects lines 1 to 2 ("Selected 1-2", the button is enabled). Residue: the question quotes half of line 2 (`003`: `export const question = "what is`): UX-210 (S4). |
| UX-187 Changes tab wording | **Fixed in part** | Revert greyed now says why: "Nothing to revert yet." (`T22.2-novice 002`, `T03.1-novice 007`). Still: "This chat did not change any file" beside "Git (3)" with the files (T24.1 N record, 001), and the Changes tab of a plain folder does not say why there are no change marks (T24.2 N). UX-208 (S4). |
| UX-188 Activity gadget | **Not fixed (worse)** | "Error: RUN_ERROR" is gone (T23.1 I record, no mention). But `T20.1-novice 001`: "Nothing has happened yet." beside a project removed and, in `002`, a Warning in Event Viewer (R7: the gadget showed the Warning); `T13.1-novice 005`: "Nothing has happened yet." while the top bar says "Working: start the long job"; `T23.1-novice 002`, T23.1b N 004: after a crash and a restart it reads "Nothing has happened yet." UX-212 (S3). |
| UX-189 Browser | **Not fixed** | T28.2 N: "Taken over" is greyed and reads like a status, "Pause all agents" looks like the same thing (record); T29.1 N: the "+" has no label; T19.1 N: the chat pane covers part of the page; T28.1 I: the yellow bar vanishes when the agent stops. UX-214 (S4). |
| UX-190 Terminal silent typing | **Fixed in part** | `T31.2-novice 003`: the note "Read-only: the agent runs the commands here. You can watch but not type. Ask the agent in Chat to run a command." shows when the window opens (R7: only after typing). The typing itself still gives no sign (T31.2 N and I). UX-215 (S4). |
| UX-191 Review banner | **Fixed** | `T26.1-novice 005`, `T25.2-novice 001`: "Changes requested. 1 comment is a blocker. 2 comments" on one line across the window. "Showing notes.txt (1 of 2 changed files)" stays: UX-211 (S4). |
| UX-192 About and Open | **Fixed in part** | `T30.2-novice 003`: "Notepad, part of Agent7. Agent7 version 0.1.0." The context menu says "Open (default: Notepad)" and also "Open with Notepad" (T30.1 N and I: "look redundant"). UX-206 (S4). |

**R7 harness items:** H-96, H-97 (the list has a working agent; the fixture still lists a Claude Code that cannot run), H-98, H-99, H-100, H-101, H-102 and H-105 are verified working. H-103 is built (the wait works) and shows a second cause (H-112). H-104 is not fixed.

### 2.4 Weak and low rows: design causes

**T17.2 (novice 9 of 12, SEQ 2, weak; intermediate 5 of 9, SEQ 6).** See 2.1. The two panelists took the same first step ("Choose another agent" and "Open Agents" both lead to the Agents page) and then chose different rows. The intermediate chose a working agent, the novice chose the first row, the one named after a product. The Agents list gives no sign that Claude Code cannot start here (`T17.2-novice 002`: "Claude Code: an AI assis..." with no state). In a real install a user without Node meets the same list. After the second failure the box has the right words and the right highlighted button (`008`), but the novice did not use them: it tried Details and Event Viewer, and both start with "Internal error". UX-196 (plain first line in Details), UX-197 (mark an agent that cannot start), UX-213 (Event Viewer), H-107 (fixture: make Claude Code unavailable or "not installed").

**T28.1 (novice SEQ 4, intermediate FAIL).** See 2.1. Both lost one attempt to the same fixture timeout. The product side: the chat shows a cut status line, no "Send again", a Reconnect that sends nothing, and a log in Details. R7 shows no such failure with the same build of the product (28 steps, SEQ 3 and 7), so the first thing to check is the fixture page and `browser_wait` (H-108).

**T06.3 (novice SEQ 5, 9 of 24).** The take-control box is still the first door a novice sees, but now the note under the bar sends the user to Control Center (UX-173 works as designed). The novice lost four actions. The label says "until I untick it" while the note says "not saved": UX-199.

**T01.1 (novice SEQ 5 at 4/4, intermediate SEQ 6 at 3/3).** Both followed the balloon. The novice ran out of actions at the folder dialog. The budget is 4 for a task whose own text says "start getting set up", so the weak rule uses `stepsToPass` (H-101). No product item.

**T25.2 (novice SEQ 5).** The verdict is on the first screen (`T25.2-novice 001`: "Changes requested. 1 comment is a blocker. 2 comments"). The panelist hesitated over the empty chat panel ("Ready in review-notes ... To undo a change, open Changes and click Revert.") and over "Blocker" and "Minor". UX-211 (S4).

**T27.1 (intermediate SEQ 5, 5 of 9).** The drag works now. The prefilled question quotes the half line the drag covered while the status bar says "Selected 1-2" (`T27.1-intermediate 003`), then the panelist typed a text with a line break and the driver pressed Enter, which sent the message early (`log.jsonl`: `type ['it?"\nPlease explain these two lines.']`, H-118). The editor is about 190 px wide with the pane open and the status bar is cut ("Line 2...", "Selecte..."). UX-210.

### 2.5 Panelist claims checked

Each claim is checked against the shots, the logs and the code. "Not confirmed" claims are left out of the backlog.

| Claim (record) | Status | Evidence |
|---|---|---|
| "Show the whole change" shows no visible change (T06.1 N and I, T07.1 N) | Confirmed | `T06.1-novice 001` and `002` are identical; `ApprovalDetail.svelte` toggles `expanded`, and the box cannot grow in a window about 480 px high. UX-194. |
| The checkbox label contradicts its own note (T06.3 N) | Confirmed | `T06.3-novice 002`: "(until I untick it)", "until you resume", "This is not saved". UX-199. |
| The chat message is cut at "Ask t..." (T20.1 N) | Not confirmed in the chat | `T20.1-novice 001` shows the whole sentence in the chat ("... Ask the user to open Computer and choose Plug in again."). The cut text is in the Event Viewer list, where the Chat column is narrow ("Check th", `002`). Folded into UX-213 as a column width. |
| The Activity gadget says nothing happened while Event Viewer holds a Warning (T20.1 N) | Confirmed, worse than R7 | `T20.1-novice 001` and `002`. UX-212. |
| The error status is cut ("Click D") and the chat has no next step (T28.1 I and N) | Confirmed | `T28.1-intermediate 006`, `T28.1-novice 006`. UX-195. |
| Reconnect did not resend the request (T28.1 N, T23.1b N "Restart did not resend") | Confirmed, partly intended | T28.1 N record step 5 and `008`; T23.1b N `002` ("Your last request was not sent again ... [Send it again]"). The Restart note is plain; the extra click remains. UX-195 and UX-201 (S4). |
| Claude Code is the first row and cannot start (T17.2 N) | Confirmed | `T17.2-novice 002`, `008`. H-107, UX-197. |
| Event Viewer says only "Internal error" and "Query closed before response received" (T17.2 N) | Confirmed | `T17.2-novice 011` (General: "Internal error", Event 9, ACP, `session/new (response)`); `012` is in the record. UX-213. |
| The launcher preselects "Scratch pad", not the waiting row (T14.1 N and I; researcher note) | Confirmed | `T14.1-novice 001`: the first row is highlighted, "Fix login redirect" with "Needs your approval (1)" is the fourth. UX-202. |
| Chips show no tooltip (T10.2 N and I, T16.2 I) | Confirmed, S4 | The chip uses `title={chip.tooltip}` (`TopBar.svelte`), a native tooltip that a shot of the window cannot show; T16.2 I waited 1.5 s and still saw none. The app's own tooltip works on other controls (T22.1 I). UX-200 and H-112. |
| The Permissions page is squeezed when the chat pane is open (T10.1 N) | Confirmed | `T10.1-novice 006`: a text column about 100 px wide and "Set every permission to" cut at the bottom. UX-198. |
| "Restore..." opens the Recycle Bin instead of restoring (T09.1 N) | Confirmed | `T09.1-novice 003`, record steps 3 to 5. UX-209. |
| The status column is cut to "R..." (T09.1 N) and the path to "E:\sr..." (T08.2 N) | Confirmed | `T09.1-novice 003`, `T08.2-novice 002`. UX-207. |
| The Changes tab and the Git tab disagree on the first screen (T24.1 N) | Confirmed, S4 | T24.1 N record, 001. UX-208. |
| "The agent changed nothing" / "Nothing to revert yet" with no reason (T22.2 N) | Partly fixed | `T22.2-novice 002` shows "Nothing to revert yet."; the novice still asked when Revert turns on. S4, UX-208. |
| The read-only note is small and at the bottom (T31.2 N) | Confirmed, S4 | `T31.2-novice 003`: a yellow two-line note under the screen and a status bar line. Typing gives no feedback. UX-215. |
| Taken over is greyed and reads like a status (T28.2 N) | Confirmed | T28.2 N record. UX-214. |
| The "+" has no label (T29.1 N) | Confirmed, carried | T29.1 N record. UX-214. |
| The second chat window hides its Send button (T07.1) | Confirmed in a milder form | `T07.1-novice 001`: the right window is about 450 px wide, its Send button wraps to a second row. UX-203. |
| The speaker label "Scripted demo", "Scripted fix-redirect", "Scripted a2ui" is jargon (T07.1 N, T10.1 N, T18.1 sidebar N) | Confirmed, carried | R4 UX-133 to UX-137, still open. |
| Two "Send" buttons (form and chat) (T18.1 N and I) | Confirmed, fixture first | The form button text comes from the scripted a2ui script. H-117. |
| The inline "Sent." confirmation disappears (T18.1 inline and sidebar I) | Confirmed, S4 | T18.1 inline I record (004 against 005). UX-216. |
| After "End the agent program" the message box is refilled and Send is active (T20.2 N) | Confirmed | `T20.2-novice 008`: "start the long job" in the box, a red box "The agent program was stopped.", status text cut ("...send your message ag"). UX-201. |
| The Terminal accepts typing silently (T31.2 N and I) | Confirmed | `T31.2-novice` record step 3. UX-215. |
| A single click on a desktop icon only selects (T11.2 N, T16.2 N, T17.1 N, T24.2 N for a file) | Not a defect | Windows convention; the welcome balloon says "Double-click an icon to open it." (R7 decision kept; four of 60 novices, R7 five). |
| The reply "Working on it..." stays after the folder is plugged in again (T12.2 N) | Not a product defect | The text is the scripted `eject-victim` reply (`T20.1-novice 001`). |
| The assistant's reply is partly wrong or ignores the request (T27.1 N, T10.1 N, T19.1 N, T11.3 N) | Not a product defect | Scripted replies. |
| The review window never says the fix finished (T26.1 N) | Fixture first | The scripted `review` agent stops at "Fixing the review comments now."; the banner "Changes requested" is correct until a new review. S4 UX-211 asks for a line that says the comments went to the chat. |
| T30.2 N read the record folder after the verdict | Not visible in the log | `log.jsonl` has five driver actions. H-113. |

### 2.6 Other decisions

- **T02.1, T02.2 both PASS.** T02.1 novice: "Agent can use nothing yet. Open an app to give it a tool." reads as a failure while the chat is ready (`T02.1-novice 007`, S4, UX-200). "Scripted demo" in the Agent list: R4 words. T02.2 novice: the suggested name appears only after the folder is ticked (record, S4, not logged).
- **T04.1, T04.2, T05.1, T05.2, T06.2 all PASS.** T06.2 novice asks for a reason next to the command (S4, not logged). T05.1 novice: the Changes list shows "re direct.ts" at the left edge (UX-207).
- **T07.1 both PASS.** UX-194, UX-203.
- **T08.1, T08.2, T09.1 all PASS.** T08.1 novice: the button "Changes (2)" is labelled with a count only (S4, not logged); the button says "Revert" while the dialog says "back to how it was before the agent edited it".
- **T10.1, T10.2 both PASS.** T10.1 novice also opened the chat pane in Control Center (UX-198).
- **T11.1, T11.2, T11.3 all PASS.** T11.3 novice: "All steps done." does not say what the job did (scripted text).
- **T12.1, T12.2 both PASS.** T12.1 novice: the greyed "Remove from desktop" gives no hint that a folder must be selected first, and the reassurance that files are kept comes only after the action (S4, not logged).
- **T13.1, T13.2 both PASS.** T13.2 novice: the launcher row says "Needs your approval (1)" and no Allow button on the row (S4, not logged).
- **T14.1, T14.2 both PASS.** UX-202.
- **T15.1 both PASS.** T15.1 I: say in the dialog that deleting cannot be undone (S4, not logged).
- **T16.1, T16.2, T17.1 all PASS.** T16.1 I: "Not applied yet" next to OK, Cancel and Apply is slightly unclear (S4, not logged).
- **T18.1 (three variants), T18.2 all PASS** at SEQ 7. UX-216, H-117.
- **T19.1, T19.2 both PASS.** T19.2: "Check the port" without a port, "ERR_UNSAFE_PORT" in Details (R4 UX-135, still open).
- **T21.1 both PASS.** Deny keeps the focus (decision TH-87, keep). The desktop shows no focus cue until the first Tab (T21.1 N; D5 manual checklist).
- **T22.1 both PASS.** UX-205.
- **T23.1, T23.1b, T23.2 all PASS.** UX-201, UX-212. T23.1 N: the request shows twice in the history after a restart (`T23.1-novice 002`: the first "Working on it..." stays; S4, UX-201).
- **T24.1, T24.2 both PASS.** UX-208. T24.2 N: a single click on notes.txt only selects it (Windows convention).
- **T25.1, T25.2, T26.1, T26.2 all PASS.** T26.2 N: the comment box does not show that it has focus (S4, UX-211). The ambiguity of "second line" (R7) did not come up.
- **T27.2 both PASS.** T29.1, T30.1, T30.2, T31.1, T31.2 all PASS. UX-206, UX-215.

## 3. Affinity map

Themes continue the round 7 list (TH-105 to TH-122). Ranked by severity (S1 to S4, rubric scale), then by the number of records that name or show the problem. "Runs" counts the records and the shots that I checked, out of 120. The last column is the backlog item in `FIX-BACKLOG-R8.md`. No S1 theme. No S2 theme. Seven S3 themes (six from the panel and the owner report UX-193).

| TH | Theme | Sev | Runs | Items |
|---|---|---|---|---|
| TH-123 | "Show the whole change" does nothing in a short window; the third changed line stays cut | S3 | 3: T06.1 N (001, 002), T06.1 I (weak, 3 of 3), T07.1 N (001) | UX-194 |
| TH-124 | A failed turn ends in "The agent did not answer in time." with a cut status line, no "Send again", a Reconnect that sends nothing and a script log in Details | S3 | 2: T28.1 I (FAIL, 006), T28.1 N (006, 007, 008) | UX-195 |
| TH-125 | A start failure has no way out in plain words: Details and Event Viewer say "Internal error", the Agents list offers an agent that cannot start | S3 | 2: T17.2 N (SEQ 2; 002, 008, 011, 012), T17.2 I (record) | UX-196, UX-197, UX-213 |
| TH-126 | The Permissions page of Control Center is squeezed into a 100 px column when the chat pane is open | S3 | 1: T10.1 N (006) | UX-198 |
| TH-127 | The Activity gadget says "Nothing has happened yet." beside a warning, during a running job and after a crash | S3 | 4: T20.1 N (001, 002), T13.1 N (005), T23.1 N (002), T23.1b N | UX-212 |
| TH-128 | The Changes pane cuts the Status and Path columns ("R...", "Modi...", "E:\...") and says "Select a changed file first." under a selected row | S3 | 5: T09.1 N (003), T08.2 N (002), T05.1 N, T24.1 N and I (the diff pane is small) | UX-207 |
| TH-129 | Code Review: the chat that was asked for a review could not use the review tools and listed the comments as text (owner report) | S3 | owner report, not a panel run | UX-193 (in progress) |
| TH-130 | The take-control box and its note use three phrases and contradict each other | S4 | 3: T06.3 N (002), T11.2 N, T28.2 N | UX-199 |
| TH-131 | Chip and button words: "Ask (Terminal is closed)", Stop against Pause all agents, the mixed stop notice, "Agent can use nothing yet", no visible chip tooltip | S4 | 7: T10.2 N and I, T16.2 I, T05.2 N, T11.1 N and I, T02.1 N (007) | UX-200 |
| TH-132 | Recovery residue: the user's own "End the agent program" shows a red box, the box is refilled, the old window keeps its error, the request shows twice | S4 | 4: T20.2 N (008, 009), T23.1b N and I, T23.1 N (002) | UX-201 |
| TH-133 | The launcher preselects the first row, not the row that waits for the user | S4 | 2: T14.1 N (001), T14.1 I | UX-202 |
| TH-134 | New windows open over or behind the window that opened them; the second chat window is narrow | S4 | 7: T12.2 N and I, T08.1 N, T08.2 I, T06.3 I, T20.1 N (002), T07.1 N (001) | UX-203 |
| TH-135 | Chats - Task Manager: the title and the list do not say it reopens closed chats | S4 | 2: T04.2 N (003), T13.1 N | UX-204 |
| TH-136 | Help: the text above a jump target is cut, F1 lands at the top of a long topic, "Save a file" has no number | S4 | 4: T22.1 N (004) and I, T31.1 I, T19.2 N | UX-205 |
| TH-137 | The Explorer menu has two Notepad entries; the About text names no Notepad version | S4 | 3: T30.1 N and I, T30.2 N (003) | UX-206 |
| TH-138 | Changes tab wording and the Restore button label | S4 | 4: T24.1 N (001), T24.2 N, T22.2 N (002), T09.1 N | UX-208, UX-209 |
| TH-139 | Code with the chat pane: the question quotes half a line, the editor is 190 px wide, the Chat tab is a narrow label | S4 | 2: T27.1 I (003), T27.1 N | UX-210 |
| TH-140 | Code Review: no sign that the comments reached the chat, the comment box shows no focus, the chat panel starts empty | S4 | 3: T26.1 N (005), T26.2 N, T25.2 N (001) | UX-211 |
| TH-141 | Event Viewer: raw event names, "Number of events: 1" beside "25 more", narrow Chat column | S4 | 3: T20.1 N (002), T20.1 I, T17.2 N (011) | UX-213 |
| TH-142 | Browser: "Taken over" reads like a status, the "+" has no label, the pane covers the page, the yellow bar vanishes | S4 | 4: T28.2 N, T29.1 N, T19.1 N, T28.1 I | UX-214 |
| TH-143 | Terminal typing gives no sign; A2UI forms: the "Sent." line disappears, "(Closed)" is the only state signal | S4 | 5: T31.2 N (003) and I, T18.1 inline I, sidebar I, T18.2 N | UX-215, UX-216 |
| TH-89 | Words carried from R4: "Scripted demo", "Scripted fix-redirect", "plug in", "ERR_UNSAFE_PORT", "Notes" and "Board" for a form | S4 | 6: T02.1 N, T07.1 N, T10.1 N, T03.1 N, T19.2 N, T18.1 sidebar N | R4 UX-133 to UX-137, still open |
| TH-87 | Deny has the focus | S4 | 3: T21.1 N, T21.1 I, T13.2 I | decision: keep Deny |

What did not recur: the "Ask before every action" fail, the highlighted "Try again" for a missing program, the dead balloon button, the text in the old window, a Chats icon without a way back, the hidden way to end the agent program, "Error: RUN_ERROR", Documents and Desktop twice, the Review banner in a 90 px column, the reverted row without Restore, the read-only note that shows only after typing, the Explorer window over the Code tree after Plug in.

## 4. Journey scores

The full re-score with the reason for each changed cell is in `scorecard.md` (round 8 table and "Reasons for the changed scores, round 8"). Summary: mean cell 7.88 (R7: 7.85). 18 cells higher, 6 lower and 306 equal against round 7 (330 numeric cells). **0 of 31 journeys at 10/10.** Under the rubric a journey is 10/10 only if all eleven cells are 10: no open S1, S2 or S3 finding, every S4 finding accepted in `findings.md` with a written reason (none is), and the D5 and D10 evidence the rubric asks for. D5: no axe result exists for R8. The R5 scan found one violation (the 18.8 px suggestion chip, since fixed in code and still not re-scanned), the manual checklist and the screen reader pass are not done, so D5 stays at its R5 to R7 values. D10: still waits for the reference-machine run.

Sixteen journeys have no open S2 or S3 finding (R7: 22; the count is lower because this round adds seven S3 themes). Fifteen journeys have an open S3 item (J05, J06, J07, J08, J09, J10, J13, J16, J17, J20, J23, J24, J25, J26, J28). No journey has an open S2 item (R7: J06, J16, J17). The panel part (pass at both levels, every task SEQ 6 or more) is met by 24 journeys (R7: 22): not met by J01 (T01.1 novice SEQ 5), J06 and J16 (T06.3 novice SEQ 5, T16.2 novice SEQ 5), J17 (T17.2 novice SEQ 2), J25 (T25.2 novice SEQ 5), J27 (T27.1 intermediate SEQ 5), J28 (T28.1 intermediate fails). **Fourteen journeys have neither an open S2 or S3 item nor a panel miss** (J02, J03, J04, J11, J12, J14, J15, J18, J19, J21, J22, J29, J30, J31). They are held by S4 items, by D5 and by D10.

| Journey | Mean R8 | Mean R7 | Lowest cell | Lowest dimension | Panel gate (pass at both levels, min SEQ 6) |
|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8.0 | 8.0 | 7 | D1, D3 | no, min SEQ 5 |
| J02 Create a desktop | 8.0 | 8.0 | 7 | D2, D11 | yes, min SEQ 6 |
| J03 Plug in a project | 8.2 | 8.0 | 7 | D5 | yes, min SEQ 6 |
| J04 Start a chat | 8.1 | 8.1 | 7 | D5 | yes, min SEQ 6 |
| J05 Send a prompt and follow progress | 7.8 | 7.8 | 7 | D2, D5, D8 | yes, min SEQ 6 |
| J06 Approve or deny a request (chat and UAC dialog) | 7.5 | 7.3 | 7 | D1, D2, D3, D5, D9 | no, min SEQ 5 |
| J07 Approve from the Action Center | 7.8 | 7.8 | 7 | D2, D5, D8 | yes, min SEQ 6 |
| J08 Review and revert changes (Chat, Code) | 7.7 | 7.7 | 7 | D2, D5, D8 | yes, min SEQ 6 |
| J09 Restore from the Recycle Bin | 7.9 | 7.7 | 7 | D5, D8 | yes, min SEQ 6 |
| J10 Tools follow apps | 7.8 | 7.8 | 7 | D2, D5, D8 | yes, min SEQ 6 |
| J11 Pause and take control | 8.0 | 8.0 | 7 | D2, D5, D8 | yes, min SEQ 6 |
| J12 Eject a drive | 8.0 | 8.0 | 7 | D5, D11 | yes, min SEQ 6 |
| J13 Disconnect and reconnect while the agent runs | 7.7 | 7.6 | 7 | D5, D8, D9 | yes, min SEQ 6 |
| J14 Manage several desktops | 8.4 | 8.4 | 8 | D2, D4, D5, D8, D9, D11 | yes, min SEQ 6 |
| J15 Delete a desktop | 8.4 | 8.4 | 8 | D2, D4, D5, D8, D9, D11 | yes, min SEQ 7 |
| J16 Choose permissions (Control Center) | 7.8 | 7.5 | 7 | D1, D2, D8 | no, min SEQ 5 |
| J17 Add and choose agents | 7.5 | 7.4 | 6 | D3 | no, T17.2 novice SEQ 2 |
| J18 A2UI surfaces: inline, sidebar, window | 8.1 | 8.1 | 7 | D5 | yes, min SEQ 7 |
| J19 Browse with the Browser | 7.7 | 7.7 | 7 | D2, D5, D8, D9 | yes, min SEQ 6 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 7.5 | 7.5 | 7 | D1, D2, D3, D5, D8, D9 | yes, min SEQ 6 |
| J21 Keyboard-only operation | 7.9 | 7.9 | 7 | D2, D5, D11 | yes, min SEQ 6 |
| J22 First-time help and discoverability | 7.9 | 7.9 | 7 | D5, D8 | yes, min SEQ 6 |
| J23 Recover from errors | 7.7 | 7.5 | 7 | D2, D5, D9 | yes, min SEQ 6 |
| J24 Read code, git status and the gutter | 7.9 | 7.9 | 7 | D2, D5 | yes, min SEQ 6 |
| J25 Review the agent's changes in Code Review | 8.0 | 8.1 | 7 | D5, D8 | no, min SEQ 5 |
| J26 Send review comments to a chat, and comment yourself | 7.5 | 7.5 | 7 | D2, D5, D8, D9, D11 | yes, min SEQ 6 |
| J27 Ask the chat pane about what you are looking at | 7.7 | 7.7 | 7 | D2, D5, D8, D9 | no, min SEQ 5 |
| J28 Let the agent use a web app in the Browser | 7.5 | 7.6 | 6 | D1 | no, T28.1 intermediate fails |
| J29 Browse with tabs and recover from a bad page | 7.9 | 7.9 | 7 | D4, D5, D7, D8, D11 | yes, min SEQ 7 |
| J30 Use menus, right-click and About in any app | 8.2 | 8.2 | 7 | D5, D8 | yes, min SEQ 6 |
| J31 Get help from inside an app (Help menu and F1) | 8.1 | 8.1 | 7 | D5, D8 | yes, min SEQ 6 |

## 5. Harness and checker defects

Fixes to `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process. Not product work. H-01 to H-105 are in `r1` to `r7/SYNTHESIS.md`. H-106 (the T03.1 checker) was fixed during the round by the facilitator. Status of the R7 harness items in R8: **fixed and seen working** H-96, H-97 (the list has a working agent; the fixture still lists a Claude Code that cannot run: H-107), H-98, H-99, H-100, H-101, H-102, H-103 (the wait is built; the cause of "no tooltip" is native `title`: H-112), H-105. **Not fixed:** H-104 (`T03.1-novice 005`, `T03.1-intermediate` record: the folder field shows "/tmp/a7ux-GpKvQZ/home/Documents/docs-site").

| id | Where | Defect | Fix |
|---|---|---|---|
| H-106 | `checks/files.mjs` T03.1 | **Done (facilitator, mid-round).** The check demanded an Explorer window after Plug in. Since UX-181 the project shows in the Code tree, so both rows were stale FAIL (overridden to PASS†, 2.1). | Done: the check accepts the project in the tree of Code. Re-run T03.1 at both levels in the next round to see it pass without an override. |
| H-107 | `presets/` `bad-default-agent`, `tasks.md` T17.2 | Claude Code is the first row of the Agents list and cannot start in the panel sandbox (`npx` stops). A novice who picks the first row ends in a second error and gives up (T17.2 N SEQ 2). | Make Claude Code "not installed" or unavailable in the fixture, or sort the working agents first. Keep the scenario text ("you may change the setting"). Check that a fix leads to a chat that answers. |
| H-108 | `scripts/ux-panel/scripts/browser-agent.json`, fixture page, `browserTools.ts` | The first Send of T28.1 failed in 2 of 2 sessions at the step "older messages load (2)": `browser_wait` for "Standup notes" timed out after 5183 ms (default `timeoutMs` 5000). Same screen, same 15 steps. R7 passed both rows with 28 steps. The second Send passed. A turn timeout under load would not give the same step twice. | Run `e2e/browser-agent.e2e.ts` on `662b12c8ef` and the fixture alone. Find what changed since R7: the lazy load of older messages in the fixture page (it may need the window in front or a longer delay), `browser_scroll`, or `browser_wait`. Give the three `browser_wait` steps of the lazy load an explicit `timeoutMs` of 15000, and let the script say in its own words when it fails ("The page did not load older messages."). Re-run T28.1 three times at both levels before the next round. |
| H-109 | `session.mjs stop`, record template | `stop` does not fill the Time line: `<stop fills in>` (T06.1 N), `<min>` (T12.2, T14.1, T23.1b N). Many Time values have no unit ("1", "2": 10 records) or say "not measured" or "not timed" (11). | `stop` writes the time from the first and last log timestamps. Refuse a record whose Time is a placeholder. |
| H-110 | `session.mjs`, `FACILITATOR.md` | `check.json` has `rerun: null` and `finishedByFacilitator: false` for T28.1 N, T29.1 N (reruns after the usage limit) and T13.2 N (finished by the facilitator). The flags of H-93 exist and were not given. | Pass `--rerun` and `--finished-by-facilitator` in the facilitator's commands, and write the reason (usage limit) into `check.json.notes`. Keep the lost first run's folder as `<task>-<level>-session-lost`. |
| H-111 | `session.mjs record` | T25.1 novice: `check.json.seq` is null and the record says SEQ 7. 119 of 120 agree. | `record` fails when `--seq` is missing. |
| H-112 | `ux.mjs move`, `TopBar.svelte` | The chips use the browser `title`, which a window shot cannot show. Three records say "no tooltip" (T10.2 N and I, T16.2 I, after a 1.5 s wait). The app's own tooltip appears in shots (T22.1 I). | `move` prints the `title` attribute of the element under the pointer. Tell the panelist that browser tooltips are not in the shots. The product part is UX-200. |
| H-113 | `PANELIST.md`, session folder | T30.2 novice read the record folder and `check.json` after its PASS verdict. The log cannot show file reads. | Run the panelist with a working directory that has no `check.json` (the facilitator runs `check` and `stop` from another folder), or print only "ok" to the panelist. Add the rule to `PANELIST.md`: the verdict is the facilitator's. |
| H-114 | `scripts/ux-panel/FACILITATOR.md` | Two first runs were lost to a usage limit and rerun. The process has no step for it. | Add a section: keep the lost log, rerun with a fresh panelist, set the flags (H-110), record the reason in the synthesis. |
| H-115 | `tasks.md`, `checks/review.mjs`, `presets/features.mjs` | **UX-193 re-test.** No task covers a review that the chat itself performs. | Add T25.3 to J25 (text in `FIX-BACKLOG-R8.md`, H-115) and a check for it. Run it in round 9 at both levels. |
| H-116 | `PANELIST.md` | A panelist reads a cut sentence from the wrong window (T20.1 N: "Ask t..." is in the Event Viewer column, not in the chat). The shot is right. | Tell the panelist to name the window when it quotes a cut text. Low priority. |
| H-117 | `scripts/ux-panel/scripts/a2ui*.json` | The form's button says "Send", the same as the chat's Send (T18.1 N and I, four records). The speaker label is "Scripted a2ui". | Name the form button "Send name". Give the scripts a plain speaker name ("Helper"). |
| H-118 | `ux.mjs type`, `PANELIST.md` | `type` with a line break presses Enter, which sends a chat message (T27.1 I: `type ['it?"\nPlease explain these two lines.']`). The panelist did not know. | Print "Enter pressed" for every line break in a `type` and say it in `PANELIST.md`. |
| H-119 | `session.mjs check` | `check` prints the words it needs ("the answer lacks: not-a-real-command|not found + agents page|..."). T17.2 N ran it three times and rewrote the answer twice until it passed. | `check` prints only PASS or FAIL to the panelist and keeps the reason in `check.json` for the facilitator. Better: only the facilitator runs `check`. |

## 6. What the gate needs next

1. **Product (`FIX-BACKLOG-R8.md`).** First the S3 items: UX-193 (Code Review by the chat, in progress), UX-194 ("Show the whole change"), UX-195 (the failed turn), UX-196 and UX-197 and UX-213 (the start failure), UX-198 (Permissions squeezed), UX-207 (Changes columns), UX-212 (the Activity gadget). Then 15 S4 items. They are in four work packages (A approvals, take-control, chat errors, Control Center: UX-194 to UX-201; B shell, launcher, Task Manager, Help, menus: UX-202 to UX-206; C Code, Changes, Review: UX-207 to UX-211; D Activity gadget, Event Viewer, Browser, Terminal, A2UI: UX-212 to UX-216). UX-193 is outside the work packages.
2. **Harness (about half a day).** H-108 first (the only failed task), then H-107, H-119, H-110, H-109, H-111, H-112, H-113, H-114, H-115 (the UX-193 re-test), H-117 and H-118. H-104 is still open.
3. **Rerun.** After H-108: T28.1 at both levels (three runs each, to see whether the timeout is gone). After H-107 and UX-196, UX-197, UX-213: T17.2 at both levels, T23.1 and T23.1b. After UX-194: T05.1, T06.1, T07.1. After UX-198: T10.1, T06.3, T16.1, T16.2. After UX-207 and UX-209: T05.1, T08.1, T08.2, T09.1, T24.1. After UX-212: T13.1, T20.1, T23.1, T23.1b. After UX-199 to UX-201: T06.3, T11.2, T20.2, T23.1b. After UX-202: T14.1. After H-106: T03.1. After UX-193 and H-115: T25.3 (new) at both levels, T25.1, T25.2, T26.1, T26.2. Then a full pass on the packaged build for the release gate: all tasks pass at both levels, no task below 5, median 6 or more, no open S2 or S3, with fresh panelists.
4. **Outside the panel.** D5: run the axe scan (28 states, with the 24 px suggestion chip) and the manual checklist (zoom 200%, forced colors, reduced motion, screen reader on J01, J02, J05, J06, J07) with a second reviewer. D10: the reference-machine run and the 30-minute soak. The UX lead accepts or rejects each open S4 in `findings.md`. With the S4 items of R4 to R8 unaccepted, no journey can reach 10.
