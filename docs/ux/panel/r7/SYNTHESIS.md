# Panel round 7: synthesis

Lead UX researcher. Sources: `docs/ux/panel/r7/*.md` (120 records: 60 novice and 60 intermediate, the fourth full pass at both levels, no expert tier), the session folders `docs/ux/panel/r7/<task>-<level>-session/` (`log.jsonl`, `check.json`, `session.json`, `state.json`, `shots/`; the working copies were under `/tmp/ux-sessions/r7/`), `panel/r6/SYNTHESIS.md` (method and format), `FIX-BACKLOG-R6.md` (UX-158 to UX-172, H-87 to H-95), the checkers in `scripts/ux-panel`, the product source (`src/`, `manuals/`) where a record needed a cause, and `scripts/check-help-coverage.mjs` (run now: 527 ids found, all documented, 0 ignored. R6 had 520). I did not drive the app and did not run axe, so there is no axe result for this round (section 4). I did not run git or npm. Every decision rests on the shots, `check.json`, `state.json`, the logs and the code. I viewed 38 screenshots to verify the claims I rely on (named below as `<task>-<level> <number>`). A record that I cite without a shot number was read, not viewed. Next steps: `docs/ux/FIX-BACKLOG-R7.md` and `docs/ux/scorecard.md`.

Only novice (Haiku) and intermediate (Sonnet) count for the pass rates, the median SEQ and the release gate.

**Severity** uses the rubric scale: S1 blocker, S2 major, S3 minor, S4 cosmetic. Round 7 findings are themes TH-105 to TH-122 and backlog items UX-173 to UX-192. A failed task of the novice or intermediate panelist is at least S2 (rubric, "User panel result as a gate").

**Facts from the facilitator that shape every decision below.**
1. **The round ran against the packaged build.** All 120 `session.json` and `check.json` files say `build.packaged: true`, version 0.1.0, and every record has a `Build:` line. This clears the packaged-build clause that R6 could not show (H-94 is verified, section 5). One thing to know: the commit is `840aaf8687` in 75 files and `f29521dd34` in the other 45 (T09.1 to T19.2 at both levels except T13.2, and T20.1 novice: the sessions that started after a docs-only commit landed mid-round). The facilitator pinned `UX_BUILD_COMMIT=840aaf8` for the later briefs. The facilitator states that the app code is identical in both commits. I cannot check this without git, so I take it as a stated fact and ask for a fix in the harness (H-100).
2. **Every session had a fresh panelist.** `check.json.context.previousTasks` is empty in 120 of 120 files and every record says "fresh panelist, previous tasks: none". As in R6, step counts and learnability findings stand.
3. **Raw tally.** Novice 57 of 60 (checker FAIL: T06.3, T17.2, T22.2), intermediate 59 of 60 (FAIL: T22.2). Low SEQ (4 or less): T17.2 novice 2, T20.2 novice 3, T28.1 novice 3, T01.1 intermediate 3.
4. **The first-run balloon, the Chats tab of Task Manager and the new chat welcome text are new in this build** (UX-164, UX-163 and UX-161 of the R6 backlog). Section 2.5 checks each one.
5. **No record contains "cannot read" or "Think-aloud"** (0 of 120 each). All 120 records have "Steps: N of M".

## Records read, missing and carried

- **Novice:** 60 records and 60 `check.json` files, one per task row of `tasks.md` (T01.1 to T31.2, T18.1 with three variants, and T23.1b). Nothing is missing.
- **Intermediate:** 60 records and 60 `check.json` files. Nothing is missing. Nothing is carried from an earlier round.
- **Harness fixes visible as working:** H-87 (both T27.2 rows pass), H-88 (T06.1 intermediate answer "3 added, 3 removed" is accepted), H-89 (T17.2 intermediate), H-90 (no record lacks an Answer line: `noAnswer` is false in 120 of 120), H-91 (both T13.1 rows had a window of the original chat open), H-93 (one "Steps" heading everywhere, `rerun` and `finishedByFacilitator` fields in all files), H-94 (build in 120 of 120), H-95 (the `flaky` script is described in `tasks.md`). H-92 is built but not used (section 5). SEQ in every record equals `check.json` (120 of 120).
- **Weak pass** (as in R3 to R6): a PASS with SEQ below 5, or with steps at the budget. **Clean PASS** = PASS, SEQ 5 or more, steps under budget, one check run, no MANUAL. Every row has one check run (`check.json.runs` has one entry in 120 of 120).

## 1. Results matrix

Cell = verdict, steps used / budget, then SEQ. `†` = researcher decision overrides the checker (reasons in section 2). `weak` = SEQ below 5 or steps at the budget. `at limit` = steps equal to the budget. R6 to R1 cells are copied from `panel/r6/SYNTHESIS.md` (`carried` = not re-run that round).

### Novice (Haiku)
| Task | R7 | R6 | R5 | R4 | R3 | R2 | R1 |
|---|---|---|---|---|---|---|---|
| T01.1 Find the start | PASS 3/4 · 6 | PASS weak at limit 4/4 · 4 | PASS 1/4 · 7 | PASS 3/4 · 6 | PASS 2/4 · 5 | PASS 1/3 · 6 | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 7/24 · 7 | PASS 7/24 · 7 | PASS 6/24 · 6 | PASS 6/24 · 6 | FAIL 6/24 · 4 | FAIL 19/18 · 2 OVER | PASS 6/18 |
| T02.2 Name already used | PASS 9/28 · 6 | PASS 9/28 · 6 | PASS 8/28 · 6 | PASS† 8/28 · 5 | PASS† 9/28 · 5 | FAIL 10/21 · 2 | PASS† 8/21 |
| T03.1 Add another folder | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS weak 5/20 · 4 | FAIL 3/15 · 4 | FAIL 14/15 |
| T04.1 Chat about one folder | PASS 1/16 · 7 | PASS 2/16 · 7 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS 2/16 · 6 | FAIL 1/12 · 4 | FAIL 6/12 |
| T04.2 Closed conversation back | PASS 4/12 · 6 | PASS 6/12 · 5 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 1/9 |
| T05.1 Ask and watch | PASS 5/12 · 6 | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 4/12 · 5 | PASS weak 4/12 · 4 | PASS 4/9 · 5 | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | PASS 1/3 |
| T06.1 Allow after reading | PASS 2/4 · 6 | PASS 3/4 · 6 | FAIL OVER 5/4 · 5 | PASS weak at limit 4/4 · 4 | PASS 1/4 · 5 | PASS 1/3 · 5 | PASS 1/6 |
| T06.2 Deny | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 5 | PASS 1/3 · 6 | PASS 1/3 |
| T06.3 Make it ask first | FAIL 4/24 · 6 | PASS 8/24 · 6 | PASS 7/24 · 5 | PASS 8/24 · 5 | PASS 7/24 · 5 | PASS 7/18 · 5 | no record |
| T07.1 Answer what is waiting | PASS 2/20 · 6 | PASS 2/20 · 6 | PASS weak 6/20 · 4 | PASS 2/20 · 5 | PASS weak 2/20 · 4 | PASS 2/15 · 5 | PASS 2/15 |
| T08.1 Undo one file | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 4/20 · 5 | PASS weak 4/20 · 4 | PASS 4/15 · 5 | PASS 4/15 |
| T08.2 Review everything | PASS 10/24 · 6 | PASS 4/24 · 6 | PASS 4/24 · 5 | PASS 4/24 · 5 | PASS weak 6/24 · 4 | PASS 3/18 · 5 | PASS† 2/18 |
| T09.1 Get it back | PASS 5/16 · 6 | PASS 4/16 · 6 | PASS 4/16 · 5 | PASS 4/16 · 5 | PASS weak 3/16 · 4 | PASS 7/12 · 4 | PASS 4/12 |
| T10.1 Take away the command line | PASS 4/10 · 6 | PASS† 4/10 · 6 | PASS 4/10 · 6 | PASS 5/10 · 5 | PASS weak 4/10 · 3 | PASS† 4/8 · 5 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/3 · 6 | PASS 0/3 |
| T11.1 Hold on | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | FAIL 1/3 |
| T11.2 Approve every step | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS weak 1/12 · 4 | PASS 1/9 · 6 | FAIL 9/9 at limit |
| T11.3 Carry on after a pause | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS weak 1/12 · 3 | FAIL 1/9 · 3 | PASS 4/9 |
| T12.1 Take the project away | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 5 | PASS 2/6 · 6 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 3/24 · 6 | PASS 2/24 · 7 | PASS 3/24 · 6 | PASS 2/24 · 7 | PASS 2/24 · 6 | FAIL 7/18 · 2 | INVALID (harness)† 5/18 |
| T13.1 Leave it running | PASS 3/12 · 5 | PASS weak 8/12 · 4 | PASS 2/12 · 5 | PASS 2/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 3/9 |
| T13.2 You were called back | PASS 2/16 · 6 | PASS 2/16 · 6 | PASS 3/16 · 6 | PASS 2/16 · 5 | PASS 3/16 · 5 | PASS 2/12 · 6 | PASS 2/12 |
| T14.1 Which one needs me? | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | INVALID† 2/8 · 5 | PASS 2/6 · 6 | PASS† 2/6 |
| T14.2 Rename | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 4/12 · 6 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/9 |
| T15.1 Throw one away | PASS 2/12 · 6 | PASS 2/12 · 7 | PASS 3/12 · 5 | PASS 2/12 · 6 | PASS 2/12 · 5 | PASS 2/9 · 6 | PASS† 3/9 |
| T16.1 Stop it editing by itself | PASS 4/20 · 6 | PASS 5/20 · 6 | PASS 6/20 · 6 | PASS 4/20 · 5 | PASS 4/20 · 5 | PASS 4/15 · 5 | PASS 5/15 |
| T16.2 What a setting covers | PASS 4/16 · 6 | PASS 4/16 · 6 | PASS 3/16 · 5 | PASS† weak 2/16 · 4 | PASS† 2/16 · 5 | PASS† 2/12 · 5 | PASS 2/12 |
| T17.1 Use a different assistant | PASS 8/32 · 6 | PASS 8/32 · 6 | PASS 7/32 · 6 | PASS 8/32 · 5 | PASS 7/32 · 5 | PASS 7/24 · 6 | PASS 10/24 |
| T17.2 It does not start | FAIL 9/12 · 2 | PASS† 5/12 · 5 | PASS 5/12 · 5 | PASS 4/12 · 6 | PASS 1/12 · 6 | PASS† 9/9 · 3 at limit | FAIL 10/12 |
| T18.1-inline Form, inline | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/12 |
| T18.1-sidebar Form, sidebar | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 10/12 |
| T18.1-window Form, window | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 7/9 · 4 | PASS 3/12 |
| T18.2 A window you closed | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 6 | PASS 1/6 · 7 | PASS 1/8 |
| T19.1 Look at a web page | PASS 6/16 · 7 | PASS 6/16 · 7 | PASS 6/16 · 6 | PASS 6/16 · 6 | INVALID† 4/16 · 4 | FAIL† 10/12 · 5 | FAIL 10/16 |
| T19.2 No network | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 3/12 · 5 | PASS 1/12 · 6 | PASS† 0/12 · 5 | PASS 5/9 · 5 | PASS 9/12 |
| T20.1 Why was it refused? | PASS 2/20 · 7 | PASS 8/20 · 5 | PASS 2/20 · 6 | PASS weak 5/20 · 4 | PASS† weak 16/20 · 3 | PASS 6/15 · 5 | PASS 5/20 |
| T20.2 Stuck assistant | PASS weak 15/16 · 3 | PASS weak 11/16 · 4 | PASS 4/16 · 5 | PASS 5/16 · 6 | PASS 5/16 · 5 | PASS 5/12 · 5 | PASS 7/16 |
| T21.1 No mouse | PASS 5/16 · 6 | PASS 6/16 · 6 | PASS 4/16 · 6 | PASS 4/18 · 5 | PASS 5/18 · 5 | PASS† 19/36 · 6 | FAIL 19/48 |
| T22.1 Ask for help | PASS 3/8 · 7 | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS† 3/8 · 6 | PASS† 1/6 · 2 | FAIL 9/8 **OVER +1** |
| T22.2 Find a topic by search | PASS† 1/16 · 6 | PASS weak 12/16 · 4 | PASS 5/16 · 6 | PASS 5/16 · 6 | PASS 9/16 · 5 | PASS 8/12 · 4 | PASS† 7/16 |
| T23.1 It crashed | PASS 1/16 · 7 | PASS 1/16 · 6 | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 5/12 · 4 | PASS 3/16 |
| T23.2 Connection dropped | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 7/12 |
| T24.1 What changed in git | PASS 3/20 · 6 | PASS 2/20 · 6 | PASS 3/20 · 6 | PASS 2/20 · 6 | PASS† 4/20 · 5 | PASS 4/15 · 5 | PASS 6/20 |
| T24.2 Not a Git project | PASS 2/16 · 6 | PASS 3/16 · 6 | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 1/12 · 6 | PASS 1/16 |
| T25.1 The blocking comment | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 0/12 · 6 | PASS 2/12 · 6 | PASS 1/12 · 6 | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS 0/8 · 6 | PASS 0/8 · 7 | PASS 0/8 · 7 | PASS† 0/6 · 6 | not run |
| T26.1 Pass the remarks on | PASS 2/16 · 6 | PASS 2/16 · 6 | PASS 2/16 · 6 | PASS 2/16 · 5 | PASS 3/16 · 6 | PASS 4/12 · 6 | not run |
| T26.2 Your own remark | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 5 | PASS 4/20 · 6 | PASS 12/15 · 4 | not run |
| T27.1 Explain these lines | PASS 5/12 · 6 | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 3/12 · 6 | PASS 4/12 · 6 | PASS 4/9 · 5 | not run |
| T27.2 More room for the file | PASS 1/4 · 6 | PASS† 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 3/4 · 6 | FAIL† 3/3 · 4 at limit | not run |
| T28.1 Assistant reads a web page | PASS weak 7/12 · 3 | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 4/12 · 6 | PASS 3/12 · 6 | PASS 4/9 · 4 | not run |
| T28.2 Take back the page | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 1/4 · 7 | PASS† 1/3 · 4 | not run |
| T29.1 Two pages side by side | PASS 5/20 · 7 | PASS 5/20 · 7 | PASS 5/20 · 6 | PASS 5/20 · 7 | PASS† 5/20 · 5 | INVALID† 6/15 · 3 | not run |
| T30.1 Open a file from the list | PASS 4/16 · 6 | PASS 3/16 · 7 | PASS 3/16 · 6 | PASS 3/16 · 6 | PASS 2/16 · 7 | PASS 2/12 · 2 | not run |
| T30.2 Which version? | PASS 2/8 · 7 | PASS 2/8 · 7 | PASS 3/8 · 7 | PASS 3/8 · 6 | PASS 4/8 · 5 | PASS 2/6 · 2 | not run |
| T31.1 How do I save? | PASS 3/8 · 6 | PASS 4/8 · 6 | PASS 2/8 · 6 | PASS 1/8 · 7 | PASS 2/8 · 6 | PASS 2/6 · 2 | not run |
| T31.2 Why can I not type here? | PASS 4/8 · 5 | PASS 5/8 · 5 | PASS 3/8 · 6 | PASS 2/8 · 6 | PASS 3/8 · 6 | PASS 4/6 · 3 | not run |
| T23.1b Crash twice (`T23.1-twice` in the R5 session folders) | PASS 2/12 · 6 | PASS 2/12 · 6 | PASS weak 4/12 · 4 | INVALID† SETUP FAIL 0/16 · n/a | not run | not run | not run |

### Intermediate (Sonnet)
| Task | R7 | R6 | R5 | R4 | R3 | R2 | R1 |
|---|---|---|---|---|---|---|---|
| T01.1 Find the start | PASS weak at limit 3/3 · 3 | PASS weak at limit 3/3 · 5 | PASS 2/3 · 6 | PASS at limit 3/3 · 6 | carried | PASS 3/3 · 6 (carried) at limit | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 7/18 · 7 | PASS 7/18 · 7 | PASS 6/18 · 7 | PASS 7/18 · 6 | PASS 8/18 · 7 | PASS 7/18 · 6 (carried) | PASS 7/18 |
| T02.2 Name already used | PASS 8/21 · 7 | PASS 8/21 · 7 | PASS† 9/21 · 6 | PASS 8/21 · 7 | PASS† 9/21 · 6 | PASS† 8/21 · 6 (carried) | PASS† 8/21 |
| T03.1 Add another folder | PASS 5/15 · 6 | PASS 4/15 · 7 | PASS 7/15 · 5 | PASS 5/15 · 6 | PASS 5/15 · 7 | PASS 3/15 · 6 | PASS 5/15 |
| T04.1 Chat about one folder | PASS 2/12 · 7 | PASS 2/12 · 6 | PASS 1/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 5/12 |
| T04.2 Closed conversation back | PASS 3/9 · 6 | PASS 5/9 · 5 | PASS 1/9 · 7 | PASS 1/9 · 7 | carried | PASS 1/9 · 7 (carried) | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 6 | PASS 4/9 · 6 | carried | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | carried | PASS 1/3 · 7 (carried) | PASS 1/3 |
| T06.1 Allow after reading | PASS 2/3 · 7 | FAIL at limit 3/3 · 5 | FAIL† 2/3 · 5 | PASS at limit 3/3 · 5 | carried | PASS 1/6 · 6 (carried) | PASS 1/6 |
| T06.2 Deny | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | carried | PASS 1/3 · 6 (carried) | PASS 1/3 |
| T06.3 Make it ask first | PASS 8/18 · 6 | PASS 8/18 · 6 | PASS 8/18 · 7 | PASS 10/18 · 5 | carried | PASS 9/18 · 5 (carried) | PASS 9/18 |
| T07.1 Answer what is waiting | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | carried | PASS 3/15 · 6 (carried) | PASS 3/15 |
| T08.1 Undo one file | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 6 | carried | PASS 4/15 · 6 (carried) | PASS 4/15 |
| T08.2 Review everything | PASS 3/18 · 7 | PASS 3/18 · 7 | PASS 6/18 · 5 | PASS 7/18 · 5 | carried | PASS 6/18 · 5 (carried) | PASS 6/18 |
| T09.1 Get it back | PASS 5/12 · 7 | PASS 8/12 · 5 | PASS 3/12 · 7 | PASS 4/12 · 6 | carried | PASS 3/12 · 7 (carried) | PASS 3/12 |
| T10.1 Take away the command line | PASS 4/8 · 6 | PASS 4/8 · 7 | PASS 4/8 · 7 | PASS 5/8 · 5 | carried | PASS† 4/8 · 6 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 0/3 · 7 | PASS 1/3 · 7 | PASS 0/3 · 7 | PASS 0/3 · 7 | carried | PASS 0/3 · 7 (carried) | PASS 0/3 |
| T11.1 Hold on | PASS 1/3 · 7 | PASS 1/3 · 6 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 |
| T11.2 Approve every step | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 6 | PASS 1/9 · 6 | PASS 1/9 · 7 | PASS 1/9 · 6 | FAIL 8/9 |
| T11.3 Carry on after a pause | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T12.1 Take the project away | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | FAIL 14/18 · 2 | INVALID (harness)† 16/18 |
| T13.1 Leave it running | PASS 4/9 · 6 | PASS weak 8/9 · 3 | PASS 2/9 · 6 | PASS 2/9 · 7 | carried | PASS† 2/9 · 6 (carried) | PASS† 2/9 |
| T13.2 You were called back | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 6 | carried | PASS 2/12 · 7 (carried) | PASS 2/12 |
| T14.1 Which one needs me? | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 6 | carried | PASS† 1/6 · 7 (carried) | PASS† 1/6 |
| T14.2 Rename | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 7 | carried | PASS 4/9 · 7 (carried) | PASS 4/9 |
| T15.1 Throw one away | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | carried | PASS 3/9 · 7 (carried) | PASS 3/9 |
| T16.1 Stop it editing by itself | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS 7/15 · 6 | PASS 4/15 · 6 | carried | PASS 6/15 · 6 (carried) | PASS 6/15 |
| T16.2 What a setting covers | PASS 2/12 · 7 | PASS 3/12 · 7 | PASS 2/12 · 7 | PASS† 4/12 · 5 | carried | PASS 3/12 · 6 (carried) | PASS 3/12 |
| T17.1 Use a different assistant | PASS 7/24 · 7 | PASS 7/24 · 7 | PASS 7/24 · 7 | PASS 7/24 · 6 | carried | PASS 10/24 · 6 (carried) | PASS 10/24 |
| T17.2 It does not start | PASS 1/9 · 7 | PASS 2/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | pending |
| T18.1-inline Form, inline | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 5/9 · 6 (carried) | pending |
| T18.1-sidebar Form, sidebar | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 4/9 · 7 (carried) | pending |
| T18.1-window Form, window | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 4/9 · 7 (carried) | pending |
| T18.2 A window you closed | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 (carried) | pending |
| T19.1 Look at a web page | PASS 6/12 · 7 | PASS 6/12 · 7 | PASS 6/12 · 7 | PASS 6/12 · 6 | INVALID† 4/12 · 5 | PASS† 7/12 · 5 | pending |
| T19.2 No network | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 2/9 · 5 | pending |
| T20.1 Why was it refused? | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS weak 7/15 · 4 | carried | PASS 5/15 · 6 (carried) | pending |
| T20.2 Stuck assistant | PASS 7/12 · 5 | PASS 6/12 · 6 | PASS 6/12 · 6 | PASS 5/12 · 6 | carried | PASS 5/12 · 6 (carried) | pending |
| T21.1 No mouse | PASS 4/12 · 7 | PASS 4/12 · 7 | PASS 4/12 · 7 | PASS 4/18 · 6 | PASS 4/18 · 6 | PASS† 18/36 · 4 | pending |
| T22.1 Ask for help | PASS 3/6 · 7 | PASS 4/6 · 7 | PASS 2/6 · 7 | PASS† 2/6 · 7 | PASS† 2/6 · 7 | PASS 2/6 · 7 | pending |
| T22.2 Find a topic by search | PASS† 1/12 · 7 | PASS 7/12 · 7 | PASS 5/12 · 7 | PASS 2/12 · 7 | carried | PASS 5/12 · 7 | pending |
| T23.1 It crashed | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 5 | PASS 8/12 · 5 (carried) | pending |
| T23.2 Connection dropped | PASS 1/9 · 7 | PASS 3/9 · 5 | PASS 1/9 · 7 | PASS 1/9 · 7 | carried | PASS 5/9 · 5 (carried) | pending |
| T24.1 What changed in git | PASS 3/15 · 7 | PASS 2/15 · 7 | PASS 3/15 · 6 | PASS 2/15 · 7 | carried | PASS 5/15 · 6 (carried) | pending |
| T24.2 Not a Git project | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 7 (carried) | pending |
| T25.1 The blocking comment | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | carried | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 0/6 · 7 | PASS 0/6 · 7 | PASS 0/6 · 7 | PASS 0/6 · 7 | carried | PASS 0/6 · 7 | not run |
| T26.1 Pass the remarks on | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 3/12 · 7 | not run |
| T26.2 Your own remark | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 3/15 · 6 | PASS 4/15 · 5 | PASS 7/15 · 5 | not run |
| T27.1 Explain these lines | PASS 7/9 · 5 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 3/9 · 6 | PASS 3/9 · 7 | not run |
| T27.2 More room for the file | PASS 1/3 · 7 | PASS† 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 4 | FAIL† 3/3 · 5 at limit | not run |
| T28.1 Assistant reads a web page | PASS 4/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 4/9 · 6 | PASS 4/9 · 6 | PASS 3/9 · 6 | not run |
| T28.2 Take back the page | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 3 | not run |
| T29.1 Two pages side by side | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS† 5/15 · 7 | INVALID† 5/15 · 6 | not run |
| T30.1 Open a file from the list | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | carried | PASS 3/12 · 7 | not run |
| T30.2 Which version? | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 3/6 · 7 | carried | PASS 2/6 · 7 | not run |
| T31.1 How do I save? | PASS 3/6 · 7 | PASS 4/6 · 7 | PASS 2/6 · 7 | PASS 1/6 · 7 | carried | PASS 3/6 · 6 | not run |
| T31.2 Why can I not type here? | PASS 3/6 · 7 | PASS 4/6 · 6 | PASS 2/6 · 7 | PASS 2/6 · 7 | carried | PASS 3/6 · 7 | not run |
| T23.1b Crash twice (`T23.1-twice` in the R5 session folders) | PASS 5/9 · 6 | PASS 6/9 · 5 | PASS 3/9 · 6 | INVALID† SETUP FAIL 0/12 · n/a | not run | not run | not run |

### Totals after researcher decisions

| Level | Rows | PASS | FAIL | INVALID | Pass rate (INVALID counts as not passed) | Raw checker PASS (before decisions) | Median SEQ | Tasks with SEQ below 5 | Weak passes |
|---|---|---|---|---|---|---|---|---|---|
| **Novice R7**, 60 rows (all in `tasks.md`) | 60 | 58 (1 with †) | 2 (T06.3, T17.2) | 0 | **97%** | 57 of 60 (95%); 3 FAIL | **6** | 3 | 2 |
| **Intermediate R7**, 60 rows (all re-run) | 60 | 60 (1 with †) | 0 | 0 | **100%** | 59 of 60 (98%); 1 FAIL | **7** | 1 | 1 |
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

**Median SEQ** over the rating of each record (all 60 rows): novice **6** (mean 6.05: 15 rows at 7, 40 at 6, 2 at 5, 2 at 3, 1 at 2), intermediate **7** (mean 6.77: 51 rows at 7, 6 at 6, 2 at 5, 1 at 3). R6 was novice 6 (mean 6.05) and intermediate 7 (mean 6.65). Both medians hold. **The novice pass rate falls from 100% to 97%** (two failed tasks, T06.3 and T17.2) **and the intermediate rate rises from 98% to 100%** (T06.1 passes now). Compared with R6 row by row: novice 7 rows higher, 6 lower, 47 equal; intermediate 9 higher, 5 lower, 46 equal.

The rows that went up are the effect of R6 fixes. UX-165 and the F1 topic (T01.1 novice 4 to 6), UX-161 (T22.2 novice 4 to 6, the answer is now on the chat's welcome text), UX-163 (T04.2 at both levels 5 to 6, T13.1 intermediate 3 to 6, T13.1 novice 4 to 5), UX-171 (T20.1 novice 5 to 7), UX-158 (T06.1 intermediate 5 to 7), UX-160 and UX-162 (T23.1b intermediate 5 to 6, T23.2 intermediate 5 to 7). The rows that went down are mostly new causes: T17.2 novice (5 to 2: the fixture has no working second agent and the error box has no route, 2.4), T20.2 novice (4 to 3) and intermediate (6 to 5) because nothing leads to Task Manager before Stop is pressed (TH-107), T28.1 novice (6 to 3: the scenario wording, 2.4), T01.1 intermediate (5 to 3: the balloon button does nothing), T27.1 intermediate (7 to 5: a text selection did not show). Five more rows lost one point (novice T12.2, T15.1 and T30.1, intermediate T03.1 and T10.1). With fresh panelists in both rounds, one point is within the spread between two panelists.

**Weak passes and non-clean rows.** Weak (counted as PASS, the margin is thin): novice T20.2 (15 of 16, SEQ 3) and T28.1 (7 of 12, SEQ 3), intermediate T01.1 (3 of 3, SEQ 3, at the limit). R6 had four at novice and two at intermediate, so the count is lower at both levels. T17.2 novice is a FAIL at SEQ 2, not a weak pass. SEQ 5 rows are listed in 2.1.

**Release gate** (`process.md`, without the expert tier):

| Gate | Novice | Intermediate | Met |
|---|---|---|---|
| All tasks pass | 58 of 60 (T22.2 by †) | 60 of 60 (T22.2 by †) | **No.** T06.3 and T17.2 fail at the novice level (2.1, TH-105, TH-106). |
| Median SEQ at least 6 | 6 | 7 | **Yes** at both levels (R6 also yes). |
| No task below 5 (R3 working rule, not in `process.md`) | 3 tasks (T17.2 at 2, T20.2 at 3, T28.1 at 3) | 1 task (T01.1 at 3) | **No** at both levels (R6: 4 and 1). |
| Fresh panelists, packaged build (`process.md` 10) | fresh in 120 of 120, packaged in 120 of 120 | same | **Yes.** Caveat: two commit ids in the records, H-100. |
| Every journey 10/10 (`scorecard.md`) | | | **No: 0 of 31.** |
| No S1 to S3 finding open (`process.md` criterion 3) | | | **No.** Two S2 (UX-173, UX-174) and five S3 items (UX-175, UX-176, UX-179, UX-184, UX-188) are open. |

**The gate is not met.** The panel part is close at the intermediate level (100%, median 7, one task below 5) and not met at the novice level (two failed tasks, three tasks below 5). What blocks the gate: two failed novice tasks with a product cause; two S2 and five S3 items; 13 S4 items and the old R4 words (none accepted, so no journey can reach 10); D5 (no axe re-scan, no manual checklist, no screen reader pass); D10 (no reference-machine run).

What changed since round 6. **Fixed and confirmed in the shots:** UX-158 in part (the permission box has one scroll area and about seven diff rows: `T06.1-novice 001`, `T07.1-novice 001`), UX-160 (the highlighted button of the crash box is Restart: `T23.1b-intermediate 001`), UX-161 (the chat welcome text says "To undo a change, open Changes and click Revert.": `T22.2-novice 002`), UX-162 (one "You" bubble and "Press Send to try again": `T23.2-novice 001`), UX-163 in part (Task Manager opens on the Chats tab with an "Open chat" button: `T04.2-novice 003`, T13.1 records), UX-164 in part (F1 opens "Using the Desktop": `T01.1-novice 004`, the balloon names Computer: `T01.1-intermediate 004`), UX-165 (Help window 750 px wide, centred, search box inside: `T31.2-novice 005`, `T01.1-novice 004`), UX-168 (a click on a Git row shows its diff: T24.1 records), UX-170 (no raw tool id, "Working: Clicking on the page", "Used 28 steps in the browser (read, waited, typed)": `T28.1-novice 005`, `007`), UX-171 in part (the Activity gadget shows the warning, Event Viewer opens on warnings: `T20.1-novice 001`, `003`), UX-172 in part (the page bar wraps to two lines: `T28.2-novice 002`). **Not fixed:** UX-169 (a reverted row has no Restore: `T09.1-novice 003`). **New:** the take-control checkbox that reads like a setting (TH-105, S2), the crash box default button when the program is missing (TH-106, S2), no way to end the agent program before pressing Stop (TH-107), the dead balloon button (TH-108), the text kept in the wrong window (TH-109), "Error: RUN_ERROR" in the Activity gadget (TH-110), the small diff in the Changes pane (TH-111).

## 2. Researcher decisions

### 2.1 Every verdict that is not a clean PASS

| Cell | Checker said | Decision | Reason |
|---|---|---|---|
| T06.3 novice | FAIL: "not met: Terminal policy is allow" (4 of 24, SEQ 6) | **FAIL, product cause (S2, UX-173)** | The panelist ticked "Ask before every action" in the top bar (`T06.3-novice 001` shows it unchecked, `002` shows it checked). That box is the take-control mode. It turns every chip to Ask ("Run commands: Ask"), shows "You are in control. All tools ask first until you resume." and a Resume button, and leaves the saved policy at Allow. The panelist then asked for the tests and the request did appear (record step 4, `T06.3-novice 005`), so the run itself asked first. But the scenario says the assistant "must never run commands without asking you first. Set things up that way." The take-control mode ends with Resume and is not saved: the check is right to say the policy stays Allow. The panelist read the checkbox as a lasting setting ("the checkbox label matched the goal", record SEQ line), the chips agreed with this reading (all four turned to Ask), and only the small banner said "until you resume". I do not override: a user who stops here believes that commands are safe for good, and after Resume or a restart they are not. The intermediate went to Control Center and passed (8 of 18, SEQ 6) and wrote that the checkbox "could be confused with this setting" (record). The same checkbox is ticked in `T28.2-novice 002` after Take over: it is one state with two doors. The checker is right (H-99 asks it to record the checkbox state so the route is visible). |
| T17.2 novice | FAIL: state ok, answer lacks the keywords (9 of 12, SEQ 2) | **FAIL (S2, UX-174), cause shared with the fixture (H-97)** | The panelist found the cause (`T17.2-novice 002`: "My assistant could not start: the program 'not-a-real-command' was not found.") but pressed the highlighted "Try again" first (second line "It stopped again"), then did the fix itself: Open Agents, Claude Code, Set as Default, Try again. The new default needs `npx`, which the sandbox cannot run, so the chat never started: "Claude Code could not start: the program 'npx' stopped before it was ready." (`T17.2-novice 009`). The answer ("The default agent points to not-a-real-command; after I set Claude Code as default, it fails with npx stopped before it was ready.") names the cause and what it did, but gives no advice and no Agents page, and the scenario says "tell me what to do". The fixture is part of the cause: the only other agent cannot run (H-97). The product is the other part. The box offers a retry as its default for a program that is not there, and the second error has no route (UX-174). Under the rubric a failed task is at least S2. The intermediate passed in one action (SEQ 7): its answer names the command and the Open Agents and Choose another agent buttons. |
| T22.2 novice and intermediate | FAIL: "no Help window is open" (1 of 16 and 1 of 12, SEQ 6 and 7) | **PASS†, scenario and checker (H-96)** | The scenario is "Find out how to undo a change that the assistant made." It does not ask for Help. Both panelists read the answer from the chat's welcome text ("To undo a change, open Changes and click Revert.", `T22.2-novice 002`, R6 UX-161) and clicked Changes to check it. The answers ("Open Changes and click Revert") are right. The Changes pane has a Revert button and "Select a changed file first." appears once a file is listed. I checked the Changes pane (`T22.2-novice 002`): Revert is greyed because the chat has no change, with no line that says why (S4, UX-187). The checker demands an open Help window for this task. For T22.1 the same case was decided in R3 (H-24): a correct answer without Help passes when the product answers in place. The R6 fix made the product answer in place, so the task no longer tests the Help search. The answer is short (no "select the file first"), but it matches the screen. Counted as PASS. H-96 changes the checker or the scenario. |
| T01.1 intermediate | PASS: 3 of 3, SEQ 3 | **PASS, weak (at the limit), real bug (S3, UX-179)** | The check (a desktop was created) held at action 2 (Create). Action 3 was the balloon button "Open Computer" (`T01.1-intermediate 004`). It closed the balloon and opened no window (`005`, `006`, `008`: no Computer, no taskbar button). The panelist: "Open Computer does not open Computer and gives no feedback". `check.json` shows `stepsToPass` 3 because the facilitator gave no `--steps-to-pass` (H-101), so the budget rule still counts the third action. 2.4. |
| T20.2 novice | PASS: 15 of 16, SEQ 3 | **PASS, weak (S3, UX-176)** | See 2.4. |
| T28.1 novice | PASS: 7 of 12, SEQ 3 | **PASS, weak, mostly scenario wording (H-98)** | See 2.4. |
| T13.1 novice | PASS: 3 of 12, SEQ 5 | **PASS** | Closed the chat (toast "The chat is closed. "start the long job" is still working. Open it again from Chats on the desktop.", `T13.1-novice 002`), double-clicked Chats and got Task Manager (record: "dead end", the Chats icon opens Task Manager), double-clicked the row and the chat reopened with "Reopened ... Your earlier messages are kept." (record step 4, shot 004). The check had a window of the original chat open (H-91 works). One surprise, not a failure. R6 was SEQ 4 and 8 of 12 actions. |
| T13.1 intermediate | PASS: 4 of 9, SEQ 6 | **PASS** | Selected the row, clicked "Open chat" (record step 3), and saw the progress go on (8 of 30). In R6 this panelist never got back to the chat (H-91). |
| T27.1 intermediate | PASS: 7 of 9, SEQ 5 | **PASS, with a note (S4, UX-186)** | A drag over lines 1 to 2 and Home with Shift+Down showed no selection (`T27.1-intermediate 002`, `005`: the status stays "Ln 1, Col 1"). Both started in the line number column (x 335 and 345, text starts at x 361). Ctrl+A worked and the whole file was sent (lines 1-6) and the assistant answered about lines 1 and 2 in the pane. The task asks for the explanation of the first two lines, and the answer is right. The check does not read which lines were sent. |
| T20.2 intermediate | PASS: 7 of 12, SEQ 5 | **PASS** | Control Center (no stop), a stray click, Computer (dead end), then Start, Task Manager, End process, Yes. "The agent program was stopped." in the chat (record step 7). UX-176. |
| T31.2 novice | PASS: 4 of 8, SEQ 5 | **PASS** | Typed into the read-only Terminal first (the reason shows after the typing, `T31.2-novice` record step 2), then F1 and "6 - Troubleshooting" (`T31.2-novice 005`). The Help window is whole on screen now. |
| T23.1b novice and intermediate | PASS: 2 of 12 (SEQ 6) and 5 of 9 (SEQ 6) | **PASS** | `T23.1b-intermediate 001`: Restart is the highlighted button, the sentence "The details are in Event Viewer." comes after the buttons (UX-160 verified). The intermediate used "Start a new chat (your text is kept in the box)", and the text stayed in the old window while the new chat was empty (`T23.1b-intermediate 003`, TH-109, S3). |
| T06.1 novice and intermediate | PASS: 2 of 4 and 2 of 3 (SEQ 6 and 7) | **PASS** | R6 failed the intermediate here. `T06.1-novice 001`: the box shows about seven diff rows in one scroll area, the changed lines 1, 3 and 4 need one scroll. Both answers give the lines or the counts ("3 added, 3 removed"). H-88 works. UX-158 is fixed in part (UX-177). |
| T10.1 novice | PASS | **PASS** | The record has an Answer line (H-90 works). |
| All other rows | PASS | **PASS** | I checked 18 more PASS rows against their shots or against a last shot named in the record: T02.2 N (008: the name error, the "Use ..." links), T03.1 N (005), T05.1 N (010), T07.1 N (001), T08.1 N (006), T09.1 N (003), T10.2 N (002), T13.1 N (002), T15.1 N (004), T16.2 I (002), T21.1 N (007), T23.1 I (004), T23.2 N (001), T24.1 N (001), T26.1 N (005), T28.2 N (002), T31.2 N (005), T20.1 N (001, 003). All agree with their `check.json` line. |

**SEQ 5 rows (clean passes, listed so that the causes are not lost).** Novice (2): T13.1 (the Chats icon opens Task Manager first), T31.2 (typing into the Terminal first). Intermediate (2): T20.2 (two dead ends before Start, Task Manager), T27.1 (the selection).

### 2.2 Build and method

**Decision: R7 is the first round that counts for the packaged-build clause.** `session.json.build` is `{packaged: true, version: "0.1.0", commit}` in 120 of 120 files and every record has the `Build:` line (H-94 is verified). The packaged Linux build is the electron-builder dir output, as the facilitator says. The commit differs: `840aaf8687` in 75 files, `f29521dd34` in 45 (list in H-100). The facilitator says that the only change between them is docs and harness files, and that later briefs pin `UX_BUILD_COMMIT=840aaf8`. I did not check this (no git). I did not find a record whose behaviour differs between the two groups. For the clause I treat the round as one build. H-100 asks the harness to read the commit from the packaged app itself, so that the id is the commit of the binary.

**Fresh panelists.** As in R6: `previousTasks` is `[]` in 120 of 120 files. The step counts and the D2 evidence stand.

**Records that did not look at every shot.** Four records say that the panelist did not open some shots (T06.3 novice 003, T19.1 novice 003, 004, 007, 008, T28.1 novice 004, 009, T29.1 novice 003, 004). Their steps rest on the action output. The checks and my shots agree with them, so I did not discount them. H-105 asks the facilitator to tell the panelist to open every shot.

### 2.3 The R6 permission box and the new welcome text are verified

`T06.1-novice 001`: the box is in the chat layout, the question and the file path stay on top ("E:\src\auth\redirect.ts", "3 lines added, 3 removed"), the diff has one scroll bar and about seven rows (`@@ -1,5 +1,5 @@` and the first changed lines), and the transcript above it keeps one row. The changed lines 1, 3 and 4 need one scroll (the record: "scrolled the diff one notch"). `T07.1-novice 001` shows two chats, "1 of 2 waiting" and "2 of 2 waiting", the link "Show the whole change" under each diff, and the same diff area. That meets the R6 acceptance (one scroll area, link) but not the line "at least 8 rows visible". UX-158 is fixed in part, left as S4 (UX-177). `T22.2-novice 002` shows the new chat welcome: "Ready in login-app. What would you like to work on? To undo a change, open Changes and click Revert." The button the sentence names, "Changes", is where the sentence says. UX-161 is fixed.

### 2.4 Weak and low rows: design causes

**T01.1 (novice 3 of 4, SEQ 6; intermediate 3 of 3, SEQ 3).** Both new-desktop screens are better than in R6. The New desktop dialog says "You can add projects later." (`T01.1-novice` record step 2). F1 on the new desktop opens "Using the Desktop" with the contents list (`T01.1-novice 004`, UX-165 verified). The desktop shows a first-run balloon "No project yet. Plug in a project to let the agent work on it: open Computer, then Plug in a project." with a button (`T01.1-intermediate 004`, UX-164 part 2). The balloon button is dead (`T01.1-intermediate 005`, `006`, `008`). The code calls `desktop.openApp({ app: 'explorer', path: '' })`, the same call as the Computer icon and the Start menu (`DesktopPage.svelte` lines 153 and 246), and those two work (T20.2 intermediate opened Computer by icon, `004`). `DesktopController.test.ts` line 361 tests the label of the button and never a click through the page. I could not find the cause by reading the code. UX-179 asks for the fix and for a test that clicks the button in the page. One more point: the shot after "Create" shows the launcher (`T01.1-intermediate 003`: "New desktop Connected", "Show desktop") and the next shot shows the desktop. The launcher is minimised by the product (UX-164 part 1, `DesktopWindowManager.minimizeLauncher`), and the driver took the shot before the new window was up (H-102). The panelist of T13.2 intermediate read the same shot as "the launcher stayed in front". I do not count that as a product defect.

**T17.2 (novice 9 of 12, SEQ 2; intermediate 1 of 9, SEQ 7).** See 2.1. The novice's route, in order: Try again (the highlighted default, `T17.2-novice 002`: second line "It stopped again"), Open Agents (the Agents page with "My assistant" selected, "This is already the default" after the change: UX-149 holds), Set as Default on Claude Code, Try again, Details ("Internal error", log lines), Try again, Event Viewer ("Query closed before response received", `T17.2-novice` record step 10). Three of the five buttons in `T17.2-novice 009` are right (Open Agents, Choose another agent, Start a new chat) but "Try again" is the blue default, and the text "the program 'npx' stopped before it was ready" does not say what to do. The panelist: "I did not know what npx is." UX-174 and H-97.

**T20.2 (novice 15 of 16, SEQ 3; intermediate 7 of 12, SEQ 5).** The novice did not press the chat's Stop because the scenario says to stop the program, not the conversation (record step 1). So it never saw the line that Stop prints: "To end the agent program, use Task Manager, Processes." (`StopNotice.svelte`, shown only for the stop reason `cancelled`). The way to Task Manager from the chat does not exist: File has New chat, Clear transcript and Close (record step 4), Tools has Review changes, Open in Code and Event Viewer (`T20.2-novice 007`), Control Center has Agents, Permissions, Appearance and About (record step 2). The window's close button opens the launcher "Closing a desktop window only disconnects it. Its agents keep running." (record step 8). The panelist found Task Manager only in the Start menu at action 12. The intermediate did the same in 7 actions (Control Center, Computer, then Start). R6 UX-163 (4) put the hint where a person looks after Stop, and a person who is stuck has not pressed Stop. TH-107 and UX-176. Both liked the End process dialog ("The chats and their messages stay.") and the chat's message "The agent program was stopped." with Restart (record steps 15 and 7).

**T28.1 (novice 7 of 12, SEQ 3).** The panelist typed the whole scenario into the chat, including "While it works, watch the web page. Then tell me how you could see that the assistant was using the page, and what it did there." (record step 2). The scripted `browser-agent` answered "I sent the message and found it in #general." (`T28.1-novice 007`) and, to the follow-up, a canned "The page is titled Fixture page. It says Example Domain." (record, not viewed). The product did what it should: the yellow bar named the step ("Agent is using this page: Clicking the button 'random'" with Take over, `T28.1-novice 005`), the top bar said "Working: Clicking on the page", and after the turn the chat kept "Used 28 steps in the browser (read, waited, typed). First: Opened 127.0.0.1:4174. Last: Waited for the page." (`007`). The answer ("Yellow banner 'Agent is using this page' at top of page (005.png); assistant searched Standup in #general", record) is right. The cause is the scenario wording (the sentence "tell me" reads as a message to the assistant) and a fixture that answers every follow-up with the same text (H-98). I found no product angle that needs an item.

### 2.5 Verification of the R6 backlog (details in `FIX-BACKLOG-R7.md`)

15 items: **7 fixed** (UX-160, 161, 162, 165, 166, 168, 170), **7 fixed in part** (UX-158, 159, 163, 164, 167, 171, 172), **1 not fixed** (UX-169). Harness: H-87, H-88, H-89, H-90, H-91, H-93, H-94, H-95 fixed and seen working. H-92 is built and not used.

### 2.6 Panelist claims checked

Each claim is checked against the shots, the logs and the code. "Not confirmed" claims are left out of the backlog.

| Claim (record) | Status | Evidence |
|---|---|---|
| "Ask before every action" looks like the setting that makes the assistant ask first (T06.3 N; T06.3 I "could be confused") | Confirmed | `T06.3-novice 001`, `002` (all four chips flip to Ask, the saved policy stays Allow), `T28.2-novice 002` (same box ticked by Take over). UX-173. |
| The diff in the permission box is short, needs a scroll (T06.1 N, T06.1 I, T07.1 I, T05.1 N) | Confirmed, milder | `T06.1-novice 001`: about seven rows, one scroll. `T07.1-novice 001`: the same in two chats, with the link "Show the whole change". UX-177 (S4). |
| The Chats icon opens Task Manager, not a chat list (T04.2 N and I, T13.1 N and I) | Confirmed, works now | `T04.2-novice 003`: Chats tab, one row "hello", "Open chat" and "End Task", the row selected. A double-click or "Open chat" reopens the chat (T13.1 records). UX-180 (S4): "Open chat" is greyed until a row is selected (T04.2 N record). |
| The closed-chat toast leads to the wrong place (T13.1 N) | Not confirmed as a defect | `T13.1-novice 002`: "Open it again from Chats on the desktop." and an "Open Task Manager" button. Both lead to the Chats tab where the chat reopens. |
| "Open Computer" in the balloon only closes it (T01.1 I) | Confirmed | `T01.1-intermediate 004`, `005`, `006`, `008`. UX-179. |
| Nothing says how to end the agent program (T20.2 N, T20.2 I) | Confirmed | `T20.2-novice 007` (Tools menu), record steps 2 to 8; `StopNotice.svelte`. UX-176. |
| The first error box has "It stopped again" and "Try again" is the first button (T17.2 N) | Confirmed | `T17.2-novice 002`, `009`. UX-174. |
| "Your text is kept in the box" puts the text in the old window (T23.1b I) | Confirmed | `T23.1b-intermediate 003`: the old window's box holds "please do the slow job", the new chat's box is empty. UX-175. |
| The Activity gadget keeps "Error: RUN_ERROR" after recovery (T23.1 I) | Confirmed | `T23.1-intermediate 004`: the chat is "Connected" and finished ("Done. The slow job is finished."), the gadget says "Error: RUN_ERROR". Also `T23.1b-intermediate 001` and `T23.2-novice 001`. UX-188. |
| The Activity text is cut ("...choose ...", T20.1 N) | Confirmed | `T20.1-novice 001`: "Warning: Drive E: is not plugged in on this desktop...." ends in dots. UX-188. |
| The Changes list cuts the status and the path; the diff pane is small (T05.1 N, T08.2 N and I, T24.1 N and I, T09.1 N) | Confirmed | `T05.1-novice 010`: "Mo..." and "E:\sr...", one row in a list that takes half the height, the diff below it about six rows. `T09.1-novice 003`: same. `T08.2-novice` record: five files, ten actions, four extra scrolls. UX-184. |
| A reverted row has no Restore, the diff pane stays empty (T09.1 N) | Confirmed (UX-169 not fixed) | `T09.1-novice 003`: the row is selected, "Select a changed file to view its diff.", Revert greyed. UX-185. |
| Revert is greyed with no reason (T22.2 N and I) | Confirmed, S4 | `T22.2-novice 002`: "No pending changes in this chat." and a greyed Revert. UX-187. |
| The Changes tab says "The agent changed nothing" beside a Git list (T24.1 N) | Confirmed, S4 | `T24.1-novice 001`: "The agent changed nothing in this chat. Git shows 3 changed files. Open Git". The text is true, the novice read it as a contradiction. UX-187. |
| The browse list shows Documents and Desktop twice (T03.1 N) | Confirmed, S4 | `T03.1-novice 005`: "Home > Documents" and a top-level "Documents", same for Desktop. The folder field shows a host path "/tmp/a7ux-.../home/Documents/docs-site": the path is the fixture's, not a product defect. UX-182. |
| The new Explorer window covers the Code tree after Plug in (T03.1 N and I) | Confirmed, S4 | T03.1 records (not viewed): "the Explorer window covers it". UX-181. |
| The Help window is whole and inside the screen (T31.2 N) | Confirmed good | `T31.2-novice 005`: 750 px wide, search box inside, topic list 200 px. The text above the highlighted heading is cut at the top ("5 - Common Tasks" half visible): S4, UX-183. |
| F1 on the new desktop opens "Using the Desktop" (T01.1 N) | Confirmed good | `T01.1-novice 004`. |
| The page bar wraps and the button reads "Taken over" (T28.2 N) | Confirmed good | `T28.2-novice 002`. The novice still asked whether Take over stops the assistant (record). S4, UX-189. |
| The chat pane covers the right part of the page (T19.1 N and I) | Confirmed, S4 | `T19.1-novice` record (006 not viewed): page text cut at "W". UX-189. |
| The step list names the action and the status text is plain (T28.1 N) | Confirmed good | `T28.1-novice 005`, `007`. |
| The Terminal accepts typing silently (T31.2 N) | Confirmed, S4 | `T31.2-novice` record step 2. The reason line shows only after the typing. UX-190. |
| Chat windows open over the app that opened them (T09.1 I, T04.1 I, T12.2 N, T20.1 N and I) | Confirmed, S4 | `T20.1-novice 003`: Event Viewer over the chat; `T09.1-intermediate` record: Code behind the chat. UX-181. |
| The right-hand chat's Send button is hidden (T07.1 I) | Confirmed, S4 | `T07.1-novice 001`: the second chat window runs to the bottom, its "Send" is under the tooltip and the balloon. UX-181. |
| A selection by drag does not show (T27.1 I) | Confirmed, cause likely the line number column | `T27.1-intermediate 002`, `005`. UX-186. |
| The review banner repeats itself in a narrow column (T26.1 N) | Confirmed, S4 | `T26.1-novice 005`: "Changes requested. 2 comments, 1 is a blocker." and again "Two comments, one of them a blocker." wrapped in a column about 90 px wide, "Showing 1 of 2 changed files". UX-191. |
| Chips show no tooltip (T10.2 N, T16.2 I) | Not confirmed as a defect | `T16.2-intermediate 002` is taken at once after the pointer moved, so a tooltip with its normal delay cannot show (H-103). `TopBar.svelte` has `title={chip.tooltip}` and the chip opens Permissions (`T16.2-intermediate` record step 2). UX-178 covers the words, not the tooltip. |
| "Ask" is not obviously "asks you first" (T10.2 N and I, T06.3 N) | Confirmed, S4 | `T10.2-novice 002`: "Run commands: Ask (no Terminal open)". UX-178. |
| "Stop" and "Pause all agents" look alike (T05.2 N, T11.1 N and I) | Confirmed, S4 | records; the confirm text on the pause button is clear. UX-178. |
| Deny has the focus; a plain Enter refuses (T21.1 N, T05.1 I, T21.1 I) | Confirmed, decision unchanged | `T21.1-novice 007` follows the hint "Enter denies. Press A to allow." Keep Deny (R3 decision), TH-87. |
| The desktop icon needs a double-click (T16.2 N, T17.1 N, T20.2 N, T30.1 N, T24.2 N) | Not a defect | Windows convention. The "Welcome to your desktop: Double-click an icon to open it." balloon says so (`T06.3-novice 001`). Five novices still tried one click: noted, no item. |
| The scripted agent answers nothing useful to a follow-up (T28.1 N) | Not a product defect | H-98. |

### 2.7 Other decisions

- **T05.1, T05.2, T06.1, T06.2 both PASS.** T06.2 novice asked for plain words for the command ("node -e console.log(...)"), S4, not logged: the box shows the command as the agent sent it.
- **T07.1 both PASS**, none weak (SEQ 6 and 7).
- **T10.1, T10.2 both PASS.** T10.1 intermediate wrote that the Terminal window "gives no direct sign of the change" (S4, not logged).
- **T11.1, T11.2, T11.3 both PASS.** T11.2 novice: the banner "You are in control. All tools ask first until you resume." matches the chips. This is the take-control mode, which is right here (the scenario says "approve every step").
- **T12.1, T12.2 both PASS.** T12.1 novice asks whether removing the project also takes the access away: S4, not logged (the top bar names no project). T12.2 novice: the notice says "Use Plug in again", the item says "Double-click to plug in again" (record): S4, folded into UX-181 (wording of the balloon).
- **T14.1, T14.2 both PASS.** T14.1 novice: after Connect the new window showed only on the second shot (H-102, the same timing).
- **T15.1 both PASS.** T15.1 novice: "Closing a desktop window only disconnects it" on the launcher can be read as covering delete: S4, not logged.
- **T16.1, T16.2, T17.1 both PASS.** T17.1 novice: the Command placeholder is cut at the field edge (`T17.1-novice` record, shot 008, not viewed): S4, not logged.
- **T18.1, T18.2 all PASS** at SEQ 7. The line under Send disappears by itself (T18.1 inline and sidebar I): S4, not logged.
- **T19.1, T19.2 both PASS.** T19.2 novice: the error page says "port" without explaining it (R4 UX-135, still open).
- **T21.1 both PASS.** **T23.1, T23.2 both PASS**, T23.1b see 2.1.
- **T24.1, T24.2, T25.1, T25.2, T26.1, T26.2, T27.2, T28.2, T29.1, T30.1, T30.2, T31.1 both PASS.** T26.2: "second line" is ambiguous when a line was added at the top (record, both levels): the panelists used the New column and the check agreed. T31.1 novice: the Help contents have no "Save" entry (record), S4, folded into UX-183.

## 3. Affinity map

Themes continue the round 6 list (TH-90 to TH-104). Ranked by severity (S1 to S4, rubric scale), then by the number of records that name or show the problem. "Runs" counts the records and the shots that I checked, out of 120. The last column is the backlog item in `FIX-BACKLOG-R7.md`. No S1 theme. Two S2 themes.

| TH | Theme | Sev | Runs | Items |
|---|---|---|---|---|
| TH-105 | "Ask before every action" is the take-control mode but reads like a saved setting: the chips turn to Ask, the policy stays Allow, the banner says "until you resume" | S2 | 3: T06.3 N (FAIL, shots 001, 002), T06.3 I (record), T28.2 N (002) | UX-173 |
| TH-106 | The start-failed box makes "Try again" the default for a program that is not there; after a switch to another agent the second error has no cause and no route | S2 | 2: T17.2 N (FAIL, shots 002, 009), T17.2 I (record: Details do not say which button) | UX-174 |
| TH-107 | Ending the agent program has no door before Stop is pressed: not in the chat's File or Tools menu, not in Control Center, only in Start | S3 | 2: T20.2 N (15 actions, SEQ 3, shots 001, 007), T20.2 I (SEQ 5) | UX-176 |
| TH-108 | The first-run balloon button "Open Computer" closes the balloon and opens nothing | S3 | 1: T01.1 I (SEQ 3, shots 004, 005, 006, 008) | UX-179 |
| TH-109 | "Start a new chat (your text is kept in the box)" keeps the text in the old window and leaves the new chat empty | S3 | 1: T23.1b I (shots 001, 003) | UX-175 |
| TH-110 | The Activity gadget shows the protocol word "Error: RUN_ERROR", keeps it after the chat recovered, and cuts the sentence of a warning | S3 | 4: T23.1 I (004), T23.1b I (001), T23.2 N (001), T20.1 N (001) | UX-188 |
| TH-111 | The Changes pane: the file list and the diff share the height, the diff shows about six rows, the status and path columns are cut ("Mo...", "E:\sr...") | S3 | 6: T05.1 N (010), T09.1 N (003), T08.2 N and I, T24.1 N and I | UX-184 |
| TH-115 | Words: "Ask" is not explained, "Stop" against "Pause all agents", the View menu says "Tasks and changes" while the button says "Changes"; the permission box diff is still one scroll short | S4 | 8: T10.2 N (002) and I, T06.3 N, T05.2 N, T11.1 N and I, T06.1 N (001) and I | UX-177, UX-178 |
| TH-112 | The Chats icon opens "Task Manager"; "Open chat" is greyed until a row is selected, no row is selected on open; the closing toast leaves after a few seconds | S4 | 4: T04.2 N (003) and I, T13.1 N (002) and I | UX-180 |
| TH-113 | New windows open over the window that opened them: Computer behind the chat, Code behind the chat, Event Viewer over the chat, the second chat's Send hidden, Explorer over the Code tree after Plug in | S4 | 8: T12.2 N, T09.1 I, T04.1 I, T20.1 N (003) and I, T07.1 I, T03.1 N and I | UX-181 |
| TH-114 | Browse For Folder lists Documents and Desktop twice | S4 | 1: T03.1 N (005) | UX-182 |
| TH-116 | Help: the text above the heading is cut at the top after a jump; the status bar says the title twice; no "Save" entry in the contents | S4 | 3: T31.2 N (005), T01.1 N (004), T31.1 N | UX-183 |
| TH-117 | A reverted row has no Restore, the diff pane stays empty (R6 UX-169 not fixed) | S4 | 2: T09.1 N (003), T08.1 N (006) | UX-185 |
| TH-118 | Code: a click in the line number column does not select a line; "Ask about selection" is greyed with no reason that shows | S4 | 1: T27.1 I (002, 005) | UX-186 |
| TH-119 | Changes tab wording: "changed nothing" beside a Git list, "No pending changes" without saying why, Revert greyed with no reason | S4 | 4: T24.1 N (001), T24.2 N and I, T22.2 N (002) | UX-187 |
| TH-120 | Browser and Terminal: the chat pane covers the page, "Take over" asks a novice a question, the new tab "+" has no label, the Terminal takes typing silently | S4 | 5: T19.1 N and I, T28.2 N (002), T29.1 N, T31.2 N | UX-189, UX-190 |
| TH-121 | Code Review: the banner says the same thing twice in a narrow column; "Showing 1 of 2 changed files" | S4 | 2: T26.1 N (005), T25.1 N | UX-191 |
| TH-122 | About says "part of Agent7 version 0.1.0" (whose version?), the Explorer menu item "Open" does not say which program | S4 | 2: T30.2 N, T30.1 N | UX-192 |
| TH-89 | Words carried from R4: "Scripted demo", "plug in", "ENOENT", "port", "Notes" for a form, "Board" for a form | S4 | 4: T02.2 N (008, "Agent: Scripted demo"), T17.2 N, T19.2 N, T18.1 sidebar N | R4 UX-133 to UX-137, still open |
| TH-87 | Deny has the focus; the novice wants Allow | S4 | 3: T21.1 N (007), T21.1 I, T05.1 I | decision: keep Deny |


What did not recur: the one-row permission diff in a scrolling box, "It stopped again" at the first stop, the highlighted "Show in Event Viewer" in the crash box, the manual button "Tasks and changes" against the button "Changes", the duplicate "You" bubble after a failed send, "Working: agent7.browser_type", the cut Help window, F1 on the desktop opening the Keyboard topic, "Nothing has happened yet." beside a failure, a double-click that only selects a chat row, the page bar cut at the right, the hidden first sentence of "Ask about this page".

## 4. Journey scores

The full re-score with the reason for each changed cell is in `scorecard.md` (round 7 table and "Reasons for the changed scores, round 7"). Summary: mean cell 7.85 (R6: 7.84). 21 cells higher, 17 lower and 292 equal against round 6 (330 numeric cells). **0 of 31 journeys at 10/10.** Under the rubric a journey is 10/10 only if all eleven cells are 10: no open S1, S2 or S3 finding, every S4 accepted in `findings.md` with a written reason (none is), and the D5 and D10 evidence the rubric asks for. D5: no axe result exists for R7. The R5 scan found one violation (the 18.8 px suggestion chip, since fixed in code and still not re-scanned), the manual checklist and the screen reader pass are not done, so D5 stays at its R5 and R6 values. D10: still waits for the reference-machine run.

Twenty-two journeys have no open S2 or S3 finding (R6: 17). Nine journeys have an open S2 or S3 item (J01, J06, J08, J09, J16, J17, J20, J23, J24). The panel part (pass at both levels, every task SEQ 6 or more) is met by 22 journeys (R6: 21). **Eighteen journeys have neither an open S2 or S3 item nor a panel miss** (J02, J03, J04, J05, J07, J10, J11, J12, J14, J15, J18, J19, J21, J22, J25, J26, J29, J30). They are held by S4 items, by D5 and by D10. J06 and J16 hold the failed T06.3, J17 holds the failed T17.2, J01 and J20 and J28 have a SEQ 3 task, J13, J27 and J31 have a SEQ 5 task.

| Journey | Mean R7 | Mean R6 | Lowest cell | Lowest dimension | Panel gate (pass at both levels, min SEQ 6) |
|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8.0 | 7.8 | 7 | D1 7, D3 7 | no, min SEQ 3 |
| J02 Create a desktop | 8.0 | 8.0 | 7 | D2 7, D11 7 | yes, min SEQ 6 |
| J03 Plug in a project | 8.0 | 8.2 | 7 | D5 7 | yes, min SEQ 6 |
| J04 Start a chat | 8.1 | 7.8 | 7 | D5 7 | yes, min SEQ 6 |
| J05 Send a prompt and follow progress | 7.8 | 7.6 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J06 Approve or deny a request (chat and UAC dialog) | 7.3 | 7.3 | 6 | D1 6, D2 6 | no, T06.3 novice fails (min SEQ 6) |
| J07 Approve from the Action Center | 7.8 | 7.6 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J08 Review and revert changes (Chat, Code) | 7.7 | 7.9 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J09 Restore from the Recycle Bin | 7.7 | 7.7 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J10 Tools follow apps | 7.8 | 7.8 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J11 Pause and take control | 8.0 | 8.0 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J12 Eject a drive | 8.0 | 8.0 | 7 | D5 7, D11 7 | yes, min SEQ 6 |
| J13 Disconnect and reconnect while the agent runs | 7.6 | 7.2 | 7 | D2 7, D5 7, D8 7, D9 7 | no, min SEQ 5 |
| J14 Manage several desktops | 8.4 | 8.4 | 8 | D2 8, D4 8, D5 8, D8 8, D9 8, D11 8 | yes, min SEQ 6 |
| J15 Delete a desktop | 8.4 | 8.4 | 8 | D2 8, D4 8, D5 8, D8 8, D9 8, D11 8 | yes, min SEQ 6 |
| J16 Choose permissions (Control Center) | 7.5 | 7.9 | 6 | D1 6, D2 6 | no, T06.3 novice fails (min SEQ 6) |
| J17 Add and choose agents | 7.4 | 7.9 | 6 | D1 6, D4 6, D8 6 | no, T17.2 novice fails (SEQ 2) |
| J18 A2UI surfaces: inline, sidebar, window | 8.1 | 8.1 | 7 | D5 7 | yes, min SEQ 7 |
| J19 Browse with the Browser | 7.7 | 7.6 | 7 | D2 7, D5 7, D8 7, D9 7 | yes, min SEQ 6 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 7.5 | 7.6 | 6 | D2 6, D3 6 | no, min SEQ 3 |
| J21 Keyboard-only operation | 7.9 | 7.9 | 7 | D2 7, D5 7, D11 7 | yes, min SEQ 6 |
| J22 First-time help and discoverability | 7.9 | 7.6 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J23 Recover from errors | 7.5 | 7.6 | 7 | D2 7, D4 7, D5 7, D8 7, D9 7 | yes, min SEQ 6 |
| J24 Read code, git status and the gutter | 7.9 | 7.9 | 7 | D2 7, D5 7 | yes, min SEQ 6 |
| J25 Review the agent's changes in Code Review | 8.1 | 8.1 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J26 Send review comments to a chat, and comment yourself | 7.5 | 7.5 | 7 | D2 7, D5 7, D8 7, D9 7, D11 7 | yes, min SEQ 6 |
| J27 Ask the chat pane about what you are looking at | 7.7 | 7.8 | 7 | D2 7, D5 7, D8 7, D9 7 | no, min SEQ 5 |
| J28 Let the agent use a web app in the Browser | 7.6 | 7.7 | 7 | D1 7, D2 7, D3 7, D5 7 | no, min SEQ 3 |
| J29 Browse with tabs and recover from a bad page | 7.9 | 7.9 | 7 | D4 7, D5 7, D7 7, D8 7, D11 7 | yes, min SEQ 7 |
| J30 Use menus, right-click and About in any app | 8.2 | 8.2 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J31 Get help from inside an app (Help menu and F1) | 8.1 | 8.0 | 7 | D5 7, D8 7 | no, min SEQ 5 |

## 5. Harness and checker defects

Fixes to `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process. Not product work. H-01 to H-95 are in `r1` to `r6/SYNTHESIS.md`. Status of the R6 harness items in R7: **fixed and seen working** H-87 (both T27.2 rows pass), H-88 (T06.1 intermediate: "3 added, 3 removed" accepted), H-89 (T17.2 intermediate passes; the novice answer is a real miss), H-90 (`noAnswer` false in 120 of 120), H-91 (both T13.1 rows had a window of the original chat: `check.json.notes` has "reopened: true"), H-93 (no "Think-aloud" heading, `rerun` and `finishedByFacilitator` in all files), H-94 (`build.packaged: true` in 120 of 120), H-95 (T23.2 describes the `flaky` script: after Reconnect the first send fails again, and neither T23.2 panelist met a second failure). **Built, not used:** H-92 (`stepsToPass` is in 120 of 120 files and equals `steps` in all of them, because the facilitator gave no `--steps-to-pass`: H-101).

| id | Where | Defect | Fix |
|---|---|---|---|
| H-96 | `checks/settings.mjs` T22.2, `tasks.md` T22.2 | The check fails a correct answer when no Help window is open. The product now answers in place (the chat's welcome text), so both panelists answered in one action without Help and both rows failed (overridden to PASS†, 2.1). The scenario does not ask for Help. T22.1 has the rule (H-24). | Apply the T22.1 rule: no Help window, but an answer with "Changes" and "Revert" (or Recycle Bin) passes. If the aim is to test the Help search, write a task whose answer is not on the screen (for example "find out what the Recycle Bin keeps") and keep the Help check there. |
| H-97 | `presets/` `bad-default-agent`, `tasks.md` T17.2 | The only other agent in the list is Claude Code (`npx`), and the sandbox cannot run it. A panelist who does the right fix (Set as Default) ends in a second error and cannot finish: T17.2 novice FAIL. | Add a second, scripted agent ("Scripted demo") to the preset so that "choose another agent" works; keep Claude Code in the list. State in the scenario that the panelist may change the setting. Check that a fix leads to a chat that answers. |
| H-98 | `tasks.md` T28.1, scripted agents `browser-agent` | The scenario says "Then tell me how you could see ...". The novice typed the whole text into the chat and the scripted agent answered the follow-up with canned text ("The page is titled Fixture page..."). SEQ 3 for a wording problem. | Say "Then tell the facilitator ..." and put the request to type in quotes on its own line. Give the scripted agent a neutral reply to any text that is not the scripted request ("This is a scripted assistant. It only runs the page task."). |
| H-99 | `checks/chat.mjs` T06.3 | The check reads only the saved policy. A panelist who used the take-control checkbox fails with "Terminal policy is allow" and the record does not show why. The facilitator needs the route. | Write `askBeforeEveryAction: true/false` and `userInControl` into `check.json.notes` for T06.3 (and T11.2, T28.2). Keep the FAIL. |
| H-100 | `lib/build.mjs`, `session.json` | The commit in the build id is read from the repository at run time. 45 of 120 files carry `f29521dd34` and 75 carry `840aaf8687` for one binary. Files with `f29521dd34`: T09.1 to T19.2 at both levels except T13.2 (all rows from T09.1, T10.1, T10.2, T11.x, T12.x, T13.1, T14.x, T15.1, T16.x, T17.x, T18.1 in three variants, T18.2, T19.x), and T20.1 novice. | Write the commit into the packaged app at build time (`build-info.json` in the resources) and read it from there. Refuse a round that shows two commit ids unless the facilitator confirms. |
| H-101 | `session.mjs check`, `scripts/ux-panel/FACILITATOR.md` | H-92 is built but `--steps-to-pass` was not given. T01.1 intermediate shows `stepsToPass` 3 and is weak "at the limit" although Create (the check) was action 2. | The facilitator reads the first action that met the check from `log.jsonl` and passes it. Better: for T01.1 and T02.1 run the check after every action in the log replay. |
| H-102 | `ux.mjs` shot, `click` | A shot taken at once after "Create" or "Connect" shows the launcher because the new window is not up yet. Two panelists read it as "the launcher stayed in front" (T13.2 I, T01.1 I, `T01.1-intermediate 003`). Others wrote "the window only showed up after another shot" (T14.1 N). | After a click that can open a window, wait up to 1.5 s for a new window and shoot that one, or print the window name on the shot. |
| H-103 | `ux.mjs` move | A `move` then a shot at once cannot show a tooltip (the tooltip has a delay). T16.2 I and T10.2 N wrote "no tooltip" and the code has one. | `move` waits 1.2 s before the shot. Tell the panelist to hover and wait. |
| H-104 | `lib/context.mjs` presets | The fixture home is `/tmp/a7ux-...`, so the New desktop list and Browse For Folder show host paths ("/tmp/a7ux-AFB8Ri/home/Documents/docs-site"). Two novices asked about them. They are not product defects. | Make the home look like a user folder for the panel, or tell the panelist that the path is a test path. |
| H-105 | `PANELIST.md`, record template | Four records say that shots were not opened (T06.3 N, T19.1 N, T28.1 N, T29.1 N). The Evidence line is `/tmp/ux-sessions/...` in most records and a repository path in some. The Researcher notes line is "(none yet)" in 120 of 120. | Tell the panelist to open every shot it lists. Write the repository path in the Evidence line. Drop the empty "Researcher notes" line from the template or fill it in `stop`. |

## 6. What the gate needs next

1. **Product (`FIX-BACKLOG-R7.md`).** Two S2 items first: UX-173 (the take-control checkbox) and UX-174 (the crash box when the program is missing). Then five S3 items: UX-176 (a door to end the agent program), UX-179 (the dead balloon button), UX-175 (the text kept in the old window), UX-184 (the Changes pane), UX-188 (the Activity gadget). Then 13 S4 items. They are in four work packages (A approvals, take-control and chat errors: UX-173 to UX-178; B shell, launcher, Task Manager, Help, About: UX-179 to UX-183 and UX-192; C Code, Changes, Review: UX-184 to UX-187 and UX-191; D Browser, Terminal, Event Viewer and Activity: UX-188 to UX-190).
2. **Harness (about half a day).** H-96 (T22.2), H-97 (T17.2 fixture), H-98 (T28.1 wording), H-99 (T06.3 route), H-100 (build id), H-101 (steps to pass), then H-102, H-103, H-104 and H-105.
3. **Rerun.** After UX-173 and H-99: T06.3 at both levels and T11.2, T28.2 (the same checkbox). After UX-174 and H-97: T17.2 at both levels, T23.1, T23.1b. After UX-176: T20.2 at both levels. After UX-179 and H-102: T01.1, T02.1, T13.2 and T14.1 at both levels. After UX-184 and UX-185: T05.1, T08.1, T08.2, T09.1, T24.1. After UX-188: T20.1, T23.1, T23.1b, T23.2. After H-96 and H-98: T22.2 and T28.1. Then a full pass on the packaged build for the release gate: all tasks pass at both levels, no task below 5, median 6 or more, no open S2 or S3, with fresh panelists.
4. **Outside the panel.** D5: run the axe scan (28 states, with the 24 px suggestion chip) and the manual checklist (zoom 200%, forced colors, reduced motion, screen reader on J01, J02, J05, J06, J07) with a second reviewer. D10: the reference-machine run and the 30-minute soak. The UX lead accepts or rejects each open S4 in `findings.md`. With the S4 items of R4 to R7 unaccepted, no journey can reach 10.
