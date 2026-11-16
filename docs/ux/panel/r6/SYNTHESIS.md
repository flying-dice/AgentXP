# Panel round 6: synthesis

Lead UX researcher. Sources: `docs/ux/panel/r6/*.md` (120 records: 60 novice and 60 intermediate, the third full pass at both levels; no expert tier), the session folders `docs/ux/panel/r6/<task>-<level>-session/` (`log.jsonl`, `check.json`, `session.json`, `state.json`, `shots/`; the working copies were under `/tmp/ux-sessions/r6/`), `panel/r5/SYNTHESIS.md` (method and format), `FIX-BACKLOG-R5.md` (UX-138 to UX-157), the checkers in `scripts/ux-panel`, the product source (`src/`, `manuals/`) where a record needed a cause, and `scripts/check-help-coverage.mjs` (run now: 520 ids found, all documented; R5 had 514). I did not drive the app and did not run axe: there is no axe result for this round (see section 4). Every decision rests on the shots, `check.json`, `state.json`, the logs and the code. I viewed 37 screenshots to verify the claims I rely on (named below as `<task>-<level> <number>`). Records I cite without a shot number were read, not viewed. Next steps: `docs/ux/FIX-BACKLOG-R6.md` and `docs/ux/scorecard.md`.

Only novice (Haiku) and intermediate (Sonnet) count for the pass rates, the median SEQ and the release gate.

**Severity** uses the rubric scale: S1 blocker, S2 major, S3 minor, S4 cosmetic. Round 6 findings are themes TH-90 to TH-104 and backlog items UX-158 to UX-172. A failed task of the novice or intermediate panelist is at least S2 (rubric, "User panel result as a gate").

**Facts from the facilitator that shape every decision below.**
1. **Every session had a fresh panelist.** `check.json.context.previousTasks` is empty in 120 of 120 files and every record says "fresh panelist, previous tasks: none". This is the first round that meets H-80 and removes the batch carry-over of H-69 (R5: 16 records disclosed it). It is the main reason that several late-batch tasks got harder (T13.1, T20.2, T22.2: section 2.4). The packaged-build clause of the gate is still not evidenced: `session.json` has no build field (H-94).
2. **Process.** Three intermediate sessions were stopped by a model safety filter while writing their record: the instruction asked for "think-aloud verbatim". It now asks for a plain numbered step list ("Steps (the numbered step list of the final report)"); two of the three were re-run with fresh panelists, and the third (T06.1 intermediate) was finished by the facilitator from the panelist's hand-back, which its record says. Fourteen records written before the rewording still carry the old "Think-aloud" heading (H-93).
3. **UX-114 is re-verified (section 2.3).** No record contains "cannot read" or "cannot show what changes" (0 of 120; R5: 7).
4. **The checker of T27.2 was fixed after the panel** (the Focus bar has a Chat button and Show panes). Both T27.2 FAIL rows are overridden to PASS (2.1).

## Records read, missing and carried

- **Novice:** 60 records and 60 `check.json` files, one per task row of `tasks.md` (T01.1 to T31.2, T18.1 with three variants, and T23.1b, which the session folders now name `T23.1b`: H-86 is fixed). Nothing is missing.
- **Intermediate:** 60 records and 60 `check.json` files. Nothing is carried from an earlier round: R6 is a full pass at both levels.
- **Harness fixes visible as working:** H-77 (T06.1 reason now says a range such as "1 to 5" does not count; too strict in the other direction, H-88), H-78 (all 20 scrolls have dy of 100 or more), H-79 (the browser reply is one plain sentence, T19.1-novice 009: "The page is titled Fixture page. It says Example Domain."), H-80 (above), H-81 (the panelists number their steps correctly, scrolls included), H-83 ("Steps: N of M" is in 120 of 120 records), H-86. SEQ in every record equals `check.json` (120 of 120).
- **Weak pass** (as in R3 to R5): a PASS with SEQ below 5, or with steps at the budget. **Clean PASS** = PASS, SEQ 5 or more, steps under budget, one check run, no MANUAL. Every row has one check run (`check.json.runs` has one entry in 120 of 120).

## 1. Results matrix

Cell = verdict, steps used / budget, then SEQ. `†` = researcher decision overrides the checker (reasons in section 2). `weak` = SEQ below 5 or steps at the budget. `at limit` = steps equal to the budget. R5, R4, R3, R2 and R1 cells are copied from `panel/r5/SYNTHESIS.md` (`carried` = not re-run that round). The R6 cell of T23.1b is the second valid run of that row.

### Novice (Haiku)
| Task | R6 | R5 | R4 | R3 | R2 | R1 |
|---|---|---|---|---|---|---|
| T01.1 Find the start | PASS weak at limit 4/4 · 4 | PASS 1/4 · 7 | PASS 3/4 · 6 | PASS 2/4 · 5 | PASS 1/3 · 6 | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 7/24 · 7 | PASS 6/24 · 6 | PASS 6/24 · 6 | FAIL 6/24 · 4 | FAIL 19/18 · 2 OVER | PASS 6/18 |
| T02.2 Name already used | PASS 9/28 · 6 | PASS 8/28 · 6 | PASS† 8/28 · 5 | PASS† 9/28 · 5 | FAIL 10/21 · 2 | PASS† 8/21 |
| T03.1 Add another folder | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 6 | PASS weak 5/20 · 4 | FAIL 3/15 · 4 | FAIL 14/15 |
| T04.1 Chat about one folder | PASS 2/16 · 7 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS 2/16 · 6 | FAIL 1/12 · 4 | FAIL 6/12 |
| T04.2 Closed conversation back | PASS 6/12 · 5 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 4/12 · 5 | PASS weak 4/12 · 4 | PASS 4/9 · 5 | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | PASS 1/3 |
| T06.1 Allow after reading | PASS 3/4 · 6 | FAIL OVER 5/4 · 5 | PASS weak at limit 4/4 · 4 | PASS 1/4 · 5 | PASS 1/3 · 5 | PASS 1/6 |
| T06.2 Deny | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 5 | PASS 1/3 · 6 | PASS 1/3 |
| T06.3 Make it ask first | PASS 8/24 · 6 | PASS 7/24 · 5 | PASS 8/24 · 5 | PASS 7/24 · 5 | PASS 7/18 · 5 | no record |
| T07.1 Answer what is waiting | PASS 2/20 · 6 | PASS weak 6/20 · 4 | PASS 2/20 · 5 | PASS weak 2/20 · 4 | PASS 2/15 · 5 | PASS 2/15 |
| T08.1 Undo one file | PASS 4/20 · 6 | PASS 4/20 · 6 | PASS 4/20 · 5 | PASS weak 4/20 · 4 | PASS 4/15 · 5 | PASS 4/15 |
| T08.2 Review everything | PASS 4/24 · 6 | PASS 4/24 · 5 | PASS 4/24 · 5 | PASS weak 6/24 · 4 | PASS 3/18 · 5 | PASS† 2/18 |
| T09.1 Get it back | PASS 4/16 · 6 | PASS 4/16 · 5 | PASS 4/16 · 5 | PASS weak 3/16 · 4 | PASS 7/12 · 4 | PASS 4/12 |
| T10.1 Take away the command line | PASS† 4/10 · 6 | PASS 4/10 · 6 | PASS 5/10 · 5 | PASS weak 4/10 · 3 | PASS† 4/8 · 5 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 1/4 · 6 | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/4 · 6 | PASS 0/3 · 6 | PASS 0/3 |
| T11.1 Hold on | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/3 · 6 | FAIL 1/3 |
| T11.2 Approve every step | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS weak 1/12 · 4 | PASS 1/9 · 6 | FAIL 9/9 at limit |
| T11.3 Carry on after a pause | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS weak 1/12 · 3 | FAIL 1/9 · 3 | PASS 4/9 |
| T12.1 Take the project away | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 5 | PASS 2/6 · 6 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 2/24 · 7 | PASS 3/24 · 6 | PASS 2/24 · 7 | PASS 2/24 · 6 | FAIL 7/18 · 2 | INVALID (harness)† 5/18 |
| T13.1 Leave it running | PASS weak 8/12 · 4 | PASS 2/12 · 5 | PASS 2/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 3/9 |
| T13.2 You were called back | PASS 2/16 · 6 | PASS 3/16 · 6 | PASS 2/16 · 5 | PASS 3/16 · 5 | PASS 2/12 · 6 | PASS 2/12 |
| T14.1 Which one needs me? | PASS 2/8 · 6 | PASS 2/8 · 6 | PASS 2/8 · 6 | INVALID† 2/8 · 5 | PASS 2/6 · 6 | PASS† 2/6 |
| T14.2 Rename | PASS 3/12 · 7 | PASS 4/12 · 6 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/9 |
| T15.1 Throw one away | PASS 2/12 · 7 | PASS 3/12 · 5 | PASS 2/12 · 6 | PASS 2/12 · 5 | PASS 2/9 · 6 | PASS† 3/9 |
| T16.1 Stop it editing by itself | PASS 5/20 · 6 | PASS 6/20 · 6 | PASS 4/20 · 5 | PASS 4/20 · 5 | PASS 4/15 · 5 | PASS 5/15 |
| T16.2 What a setting covers | PASS 4/16 · 6 | PASS 3/16 · 5 | PASS† weak 2/16 · 4 | PASS† 2/16 · 5 | PASS† 2/12 · 5 | PASS 2/12 |
| T17.1 Use a different assistant | PASS 8/32 · 6 | PASS 7/32 · 6 | PASS 8/32 · 5 | PASS 7/32 · 5 | PASS 7/24 · 6 | PASS 10/24 |
| T17.2 It does not start | PASS† 5/12 · 5 | PASS 5/12 · 5 | PASS 4/12 · 6 | PASS 1/12 · 6 | PASS† 9/9 · 3 at limit | FAIL 10/12 |
| T18.1-inline Form, inline | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/9 · 7 | PASS 4/12 |
| T18.1-sidebar Form, sidebar | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/12 · 6 | PASS 3/9 · 6 | PASS† 10/12 |
| T18.1-window Form, window | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | PASS 7/9 · 4 | PASS 3/12 |
| T18.2 A window you closed | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 7 | PASS 1/8 · 6 | PASS 1/6 · 7 | PASS 1/8 |
| T19.1 Look at a web page | PASS 6/16 · 7 | PASS 6/16 · 6 | PASS 6/16 · 6 | INVALID† 4/16 · 4 | FAIL† 10/12 · 5 | FAIL 10/16 |
| T19.2 No network | PASS 1/12 · 6 | PASS 3/12 · 5 | PASS 1/12 · 6 | PASS† 0/12 · 5 | PASS 5/9 · 5 | PASS 9/12 |
| T20.1 Why was it refused? | PASS 8/20 · 5 | PASS 2/20 · 6 | PASS weak 5/20 · 4 | PASS† weak 16/20 · 3 | PASS 6/15 · 5 | PASS 5/20 |
| T20.2 Stuck assistant | PASS weak 11/16 · 4 | PASS 4/16 · 5 | PASS 5/16 · 6 | PASS 5/16 · 5 | PASS 5/12 · 5 | PASS 7/16 |
| T21.1 No mouse | PASS 6/16 · 6 | PASS 4/16 · 6 | PASS 4/18 · 5 | PASS 5/18 · 5 | PASS† 19/36 · 6 | FAIL 19/48 |
| T22.1 Ask for help | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS 1/8 · 6 | PASS† 3/8 · 6 | PASS† 1/6 · 2 | FAIL 9/8 **OVER +1** |
| T22.2 Find a topic by search | PASS weak 12/16 · 4 | PASS 5/16 · 6 | PASS 5/16 · 6 | PASS 9/16 · 5 | PASS 8/12 · 4 | PASS† 7/16 |
| T23.1 It crashed | PASS 1/16 · 6 | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 5/12 · 4 | PASS 3/16 |
| T23.2 Connection dropped | PASS 1/12 · 6 | PASS 1/12 · 6 | PASS 1/12 · 7 | PASS 1/12 · 6 | PASS 1/9 · 6 | PASS 7/12 |
| T24.1 What changed in git | PASS 2/20 · 6 | PASS 3/20 · 6 | PASS 2/20 · 6 | PASS† 4/20 · 5 | PASS 4/15 · 5 | PASS 6/20 |
| T24.2 Not a Git project | PASS 3/16 · 6 | PASS 1/16 · 6 | PASS 1/16 · 7 | PASS 2/16 · 6 | PASS† 1/12 · 6 | PASS 1/16 |
| T25.1 The blocking comment | PASS 1/12 · 6 | PASS 0/12 · 6 | PASS 2/12 · 6 | PASS 1/12 · 6 | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 1/8 · 6 | PASS 0/8 · 6 | PASS 0/8 · 7 | PASS 0/8 · 7 | PASS† 0/6 · 6 | not run |
| T26.1 Pass the remarks on | PASS 2/16 · 6 | PASS 2/16 · 6 | PASS 2/16 · 5 | PASS 3/16 · 6 | PASS 4/12 · 6 | not run |
| T26.2 Your own remark | PASS 4/20 · 6 | PASS 5/20 · 6 | PASS 5/20 · 5 | PASS 4/20 · 6 | PASS 12/15 · 4 | not run |
| T27.1 Explain these lines | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 3/12 · 6 | PASS 4/12 · 6 | PASS 4/9 · 5 | not run |
| T27.2 More room for the file | PASS† 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 3/4 · 6 | FAIL† 3/3 · 4 at limit | not run |
| T28.1 Assistant reads a web page | PASS 4/12 · 6 | PASS 4/12 · 5 | PASS 4/12 · 6 | PASS 3/12 · 6 | PASS 4/9 · 4 | not run |
| T28.2 Take back the page | PASS 1/4 · 6 | PASS 1/4 · 6 | PASS 1/4 · 7 | PASS 1/4 · 7 | PASS† 1/3 · 4 | not run |
| T29.1 Two pages side by side | PASS 5/20 · 7 | PASS 5/20 · 6 | PASS 5/20 · 7 | PASS† 5/20 · 5 | INVALID† 6/15 · 3 | not run |
| T30.1 Open a file from the list | PASS 3/16 · 7 | PASS 3/16 · 6 | PASS 3/16 · 6 | PASS 2/16 · 7 | PASS 2/12 · 2 | not run |
| T30.2 Which version? | PASS 2/8 · 7 | PASS 3/8 · 7 | PASS 3/8 · 6 | PASS 4/8 · 5 | PASS 2/6 · 2 | not run |
| T31.1 How do I save? | PASS 4/8 · 6 | PASS 2/8 · 6 | PASS 1/8 · 7 | PASS 2/8 · 6 | PASS 2/6 · 2 | not run |
| T31.2 Why can I not type here? | PASS 5/8 · 5 | PASS 3/8 · 6 | PASS 2/8 · 6 | PASS 3/8 · 6 | PASS 4/6 · 3 | not run |
| T23.1b Crash twice (`T23.1-twice` in the R5 session folders) | PASS 2/12 · 6 | PASS weak 4/12 · 4 | INVALID† SETUP FAIL 0/16 · n/a | not run | not run | not run |

### Intermediate (Sonnet)
| Task | R6 | R5 | R4 | R3 | R2 | R1 |
|---|---|---|---|---|---|---|
| T01.1 Find the start | PASS weak at limit 3/3 · 5 | PASS 2/3 · 6 | PASS at limit 3/3 · 6 | carried | PASS 3/3 · 6 (carried) at limit | PASS 3/3 at limit |
| T02.1 A desktop for a project | PASS 7/18 · 7 | PASS 6/18 · 7 | PASS 7/18 · 6 | PASS 8/18 · 7 | PASS 7/18 · 6 (carried) | PASS 7/18 |
| T02.2 Name already used | PASS 8/21 · 7 | PASS† 9/21 · 6 | PASS 8/21 · 7 | PASS† 9/21 · 6 | PASS† 8/21 · 6 (carried) | PASS† 8/21 |
| T03.1 Add another folder | PASS 4/15 · 7 | PASS 7/15 · 5 | PASS 5/15 · 6 | PASS 5/15 · 7 | PASS 3/15 · 6 | PASS 5/15 |
| T04.1 Chat about one folder | PASS 2/12 · 6 | PASS 1/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 5/12 |
| T04.2 Closed conversation back | PASS 5/9 · 5 | PASS 1/9 · 7 | PASS 1/9 · 7 | carried | PASS 1/9 · 7 (carried) | PASS 1/9 |
| T05.1 Ask and watch | PASS 4/9 · 7 | PASS 4/9 · 6 | PASS 4/9 · 6 | carried | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T05.2 Stop the assistant | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | carried | PASS 1/3 · 7 (carried) | PASS 1/3 |
| T06.1 Allow after reading | FAIL at limit 3/3 · 5 | FAIL† 2/3 · 5 | PASS at limit 3/3 · 5 | carried | PASS 1/6 · 6 (carried) | PASS 1/6 |
| T06.2 Deny | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | carried | PASS 1/3 · 6 (carried) | PASS 1/3 |
| T06.3 Make it ask first | PASS 8/18 · 6 | PASS 8/18 · 7 | PASS 10/18 · 5 | carried | PASS 9/18 · 5 (carried) | PASS 9/18 |
| T07.1 Answer what is waiting | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS 2/15 · 7 | carried | PASS 3/15 · 6 (carried) | PASS 3/15 |
| T08.1 Undo one file | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 4/15 · 6 | carried | PASS 4/15 · 6 (carried) | PASS 4/15 |
| T08.2 Review everything | PASS 3/18 · 7 | PASS 6/18 · 5 | PASS 7/18 · 5 | carried | PASS 6/18 · 5 (carried) | PASS 6/18 |
| T09.1 Get it back | PASS 8/12 · 5 | PASS 3/12 · 7 | PASS 4/12 · 6 | carried | PASS 3/12 · 7 (carried) | PASS 3/12 |
| T10.1 Take away the command line | PASS 4/8 · 7 | PASS 4/8 · 7 | PASS 5/8 · 5 | carried | PASS† 4/8 · 6 | FAIL 4/4 at limit |
| T10.2 What can it touch? | PASS 1/3 · 7 | PASS 0/3 · 7 | PASS 0/3 · 7 | carried | PASS 0/3 · 7 (carried) | PASS 0/3 |
| T11.1 Hold on | PASS 1/3 · 6 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 |
| T11.2 Approve every step | PASS 1/9 · 7 | PASS 1/9 · 6 | PASS 1/9 · 6 | PASS 1/9 · 7 | PASS 1/9 · 6 | FAIL 8/9 |
| T11.3 Carry on after a pause | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 4/9 · 6 (carried) | PASS 4/9 |
| T12.1 Take the project away | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 2/6 · 7 | FAIL 6/6 at limit |
| T12.2 It went away mid-job | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | PASS 2/18 · 7 | FAIL 14/18 · 2 | INVALID (harness)† 16/18 |
| T13.1 Leave it running | PASS weak 8/9 · 3 | PASS 2/9 · 6 | PASS 2/9 · 7 | carried | PASS† 2/9 · 6 (carried) | PASS† 2/9 |
| T13.2 You were called back | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 6 | carried | PASS 2/12 · 7 (carried) | PASS 2/12 |
| T14.1 Which one needs me? | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 6 | carried | PASS† 1/6 · 7 (carried) | PASS† 1/6 |
| T14.2 Rename | PASS 4/9 · 7 | PASS 4/9 · 7 | PASS 4/9 · 7 | carried | PASS 4/9 · 7 (carried) | PASS 4/9 |
| T15.1 Throw one away | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | carried | PASS 3/9 · 7 (carried) | PASS 3/9 |
| T16.1 Stop it editing by itself | PASS 5/15 · 7 | PASS 7/15 · 6 | PASS 4/15 · 6 | carried | PASS 6/15 · 6 (carried) | PASS 6/15 |
| T16.2 What a setting covers | PASS 3/12 · 7 | PASS 2/12 · 7 | PASS† 4/12 · 5 | carried | PASS 3/12 · 6 (carried) | PASS 3/12 |
| T17.1 Use a different assistant | PASS 7/24 · 7 | PASS 7/24 · 7 | PASS 7/24 · 6 | carried | PASS 10/24 · 6 (carried) | PASS 10/24 |
| T17.2 It does not start | PASS 2/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | PASS 1/9 · 7 | pending |
| T18.1-inline Form, inline | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 5/9 · 6 (carried) | pending |
| T18.1-sidebar Form, sidebar | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 4/9 · 7 (carried) | pending |
| T18.1-window Form, window | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 4/9 · 7 (carried) | pending |
| T18.2 A window you closed | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 | PASS 1/6 · 7 (carried) | pending |
| T19.1 Look at a web page | PASS 6/12 · 7 | PASS 6/12 · 7 | PASS 6/12 · 6 | INVALID† 4/12 · 5 | PASS† 7/12 · 5 | pending |
| T19.2 No network | PASS 1/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 2/9 · 5 | pending |
| T20.1 Why was it refused? | PASS 2/15 · 7 | PASS 2/15 · 7 | PASS weak 7/15 · 4 | carried | PASS 5/15 · 6 (carried) | pending |
| T20.2 Stuck assistant | PASS 6/12 · 6 | PASS 6/12 · 6 | PASS 5/12 · 6 | carried | PASS 5/12 · 6 (carried) | pending |
| T21.1 No mouse | PASS 4/12 · 7 | PASS 4/12 · 7 | PASS 4/18 · 6 | PASS 4/18 · 6 | PASS† 18/36 · 4 | pending |
| T22.1 Ask for help | PASS 4/6 · 7 | PASS 2/6 · 7 | PASS† 2/6 · 7 | PASS† 2/6 · 7 | PASS 2/6 · 7 | pending |
| T22.2 Find a topic by search | PASS 7/12 · 7 | PASS 5/12 · 7 | PASS 2/12 · 7 | carried | PASS 5/12 · 7 | pending |
| T23.1 It crashed | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 5 | PASS 8/12 · 5 (carried) | pending |
| T23.2 Connection dropped | PASS 3/9 · 5 | PASS 1/9 · 7 | PASS 1/9 · 7 | carried | PASS 5/9 · 5 (carried) | pending |
| T24.1 What changed in git | PASS 2/15 · 7 | PASS 3/15 · 6 | PASS 2/15 · 7 | carried | PASS 5/15 · 6 (carried) | pending |
| T24.2 Not a Git project | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 1/12 · 7 | PASS 2/12 · 7 (carried) | pending |
| T25.1 The blocking comment | PASS 0/9 · 7 | PASS 0/9 · 7 | PASS 0/9 · 7 | carried | PASS 0/9 · 7 | not run |
| T25.2 The verdict | PASS 0/6 · 7 | PASS 0/6 · 7 | PASS 0/6 · 7 | carried | PASS 0/6 · 7 | not run |
| T26.1 Pass the remarks on | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 2/12 · 7 | PASS 3/12 · 7 | not run |
| T26.2 Your own remark | PASS 4/15 · 7 | PASS 4/15 · 7 | PASS 3/15 · 6 | PASS 4/15 · 5 | PASS 7/15 · 5 | not run |
| T27.1 Explain these lines | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 3/9 · 6 | PASS 3/9 · 6 | PASS 3/9 · 7 | not run |
| T27.2 More room for the file | PASS† 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 4 | FAIL† 3/3 · 5 at limit | not run |
| T28.1 Assistant reads a web page | PASS 3/9 · 7 | PASS 3/9 · 7 | PASS 4/9 · 6 | PASS 4/9 · 6 | PASS 3/9 · 6 | not run |
| T28.2 Take back the page | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | PASS 1/3 · 7 | FAIL 1/3 · 3 | not run |
| T29.1 Two pages side by side | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS 5/15 · 7 | PASS† 5/15 · 7 | INVALID† 5/15 · 6 | not run |
| T30.1 Open a file from the list | PASS 3/12 · 7 | PASS 3/12 · 7 | PASS 3/12 · 6 | carried | PASS 3/12 · 7 | not run |
| T30.2 Which version? | PASS 2/6 · 7 | PASS 2/6 · 7 | PASS 3/6 · 7 | carried | PASS 2/6 · 7 | not run |
| T31.1 How do I save? | PASS 4/6 · 7 | PASS 2/6 · 7 | PASS 1/6 · 7 | carried | PASS 3/6 · 6 | not run |
| T31.2 Why can I not type here? | PASS 4/6 · 6 | PASS 2/6 · 7 | PASS 2/6 · 7 | carried | PASS 3/6 · 7 | not run |
| T23.1b Crash twice (`T23.1-twice` in the R5 session folders) | PASS 6/9 · 5 | PASS 3/9 · 6 | INVALID† SETUP FAIL 0/12 · n/a | not run | not run | not run |

### Totals after researcher decisions

| Level | Rows | PASS | FAIL | INVALID | Pass rate (INVALID counts as not passed) | Raw checker PASS (before decisions) | Median SEQ | Tasks with SEQ below 5 | Weak passes |
|---|---|---|---|---|---|---|---|---|---|
| **Novice R6**, 60 rows (all in `tasks.md`) | 60 | 60 (3 with †) | 0 | 0 | **100%** | 57 of 60 (95%); 2 FAIL, 1 MANUAL | **6** | 4 | 4 |
| **Intermediate R6**, 60 rows (all re-run) | 60 | 59 (1 with †) | 1 (T06.1, answer and budget) | 0 | **98%** | 58 of 60 (97%); 2 FAIL | **7** | 1 | 2 |
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

**Median SEQ** over the rating of each record (all 60 rows): novice **6** (mean 6.05; 15 rows at 7, 37 at 6, 4 at 5, 4 at 4), intermediate **7** (mean 6.65; 48 at 7, 5 at 6, 6 at 5, 1 at 3). R5 was novice 6 (mean 5.87; 9 at 7, 36 at 6, 13 at 5, 2 at 4) and intermediate 7 (mean 6.75). Both medians hold. **The novice pass rate rises from 98% to 100%; the intermediate rate stays at 98%** (T06.1 fails again, for a new cause). Compared with R5 row by row: novice 20 rows higher, 8 lower, 32 equal; intermediate 7 higher, 10 lower, 43 equal. The novice mean rises because five R5 fixes worked: UX-114 and UX-138 (T05.1, T06.1, T07.1 from 5, 5 and 4 to 6, 6 and 6), UX-151 (T08.2 and T09.1 from 5 to 6), UX-140 (T23.1b from 4 to 6) and UX-150 (T15.1 from 5 to 7). The lower rows cluster in three places that fresh panelists exposed (2.4): the Chats icon and Task Manager (T04.2, T13.1, T20.2), the first screens (T01.1) and Help (T22.2, T31.2).

**Weak passes and non-clean rows.** Weak (counted as PASS, the margin is thin): novice T01.1 (4 of 4, SEQ 4), T13.1 (SEQ 4), T20.2 (SEQ 4), T22.2 (SEQ 4); intermediate T01.1 (3 of 3, SEQ 5) and T13.1 (SEQ 3). R5 had two at novice and none at intermediate: the count of weak rows is higher than in R5 at both levels, with the same medians. T13.1 intermediate is a pass I do not trust (2.1). SEQ 5 rows are listed in 2.1.

**Release gate** (`process.md`, without the expert tier):

| Gate | Novice | Intermediate | Met |
|---|---|---|---|
| All tasks pass | 60 of 60 (3 rows with †) | 59 of 60 (T06.1 FAIL) | **No.** T06.1 fails at the intermediate level, in the build that now shows the real diff but gives it a viewport of about three lines (2.4, TH-90). |
| Median SEQ at least 6 | 6 | 7 | **Yes** at both levels (R5 also yes). |
| No task below 5 (R3 working rule, not in `process.md`) | 4 tasks at 4 (T01.1, T13.1, T20.2, T22.2) | 1 task at 3 (T13.1) | **No** at both levels (R5: no at novice only). |
| Fresh panelists, packaged build (`process.md` 10) | fresh in 120 of 120 | same | **Partly.** Fresh: yes (H-80). Packaged build: not recorded (H-94). |
| Every journey 10/10 (`scorecard.md`) | | | **No: 0 of 31.** |
| No S1 to S3 finding open (`process.md` criterion 3) | | | **No.** One S2 (UX-158) and eight S3 items (UX-159 to UX-161, UX-163 to UX-165, UX-170, UX-171) are open. |

**The gate is not met.** The panel part is closer than in R5 on the novice side (100%, median 6) and equal on the intermediate side (98%, median 7). What blocks the gate: one failed task (T06.1 intermediate) with a product cause; four novice tasks and one intermediate task below SEQ 5; one S2 and eight S3 items; no S4 accepted; D5 (no axe re-scan, no manual checklist, no screen reader pass); D10 (no reference-machine run); and the packaged-build record.

What changed since round 5. **Fixed and confirmed in the shots:** UX-114 (the permission box shows the old and new lines: `T05.1-novice 004`, `T13.2-novice 003`; 0 of 120 records say "cannot read"), UX-138 (the box is a part of the chat layout, "1 of 2 waiting", the top-bar link names the chat, both buttons are inside the window: `T07.1-novice 001`; the setting note is its own line, T06.3 records), UX-139 (the key hint sits on the button row: `T06.1-intermediate 002`), UX-140 (after the second crash Restart says "Agent7 restarted. Your last request was not sent again" with a "Send it again" button: `T23.1b-novice 003`), UX-141 (one end in Task Manager says "The agent program was stopped." without "again": `T20.2-intermediate 007`), UX-143 (Take over: "You are in control. All tools ask first until you resume." and a Resume button: `T28.2-novice 002`), UX-144 ("Agent7 (automatic)": `T11.3-intermediate 003`), UX-145 ("Starting the agent" appears once in 120 records, during a real restart: T17.2 novice 006), UX-149 (Open Agents selects "My assistant", About shows the command: `T17.2-novice 003`), UX-150 ("Deletes this desktop: its chats, notes and logs. Your project folders stay where they are.": `T15.1-novice 002`), UX-154 ("Plug in a folder" in the Code Management panel: `T04.2-novice 002`), UX-156 (no yellow "using this page" bar after the turn: `T28.1-novice 007`). **Fixed in part:** UX-146, UX-148, UX-151, UX-152, UX-153, UX-155 (section 2.5). **Not fixed:** UX-142 (chips), UX-147 (the launcher stays in front: `T01.1-novice 003`, `T01.1-intermediate 003`), UX-157 (the step list says "Type on the page": `T28.1-novice 007`). **New:** the permission box diff viewport (TH-90, S2), the Chats icon dead end (TH-95), Help text against the button name (TH-93), the second-crash box that highlights Event Viewer (TH-92), raw tool ids in the top bar (TH-102).

## 2. Researcher decisions

### 2.1 Every verdict that is not a clean PASS

| Cell | Checker said | Decision | Reason |
|---|---|---|---|
| T27.2 novice and intermediate | FAIL: "the Code window still offers a way to show it again" (editor width 792 of window width 800) | **PASS†, checker bug (facilitator note verified)** | After "Focus on the file" only the file is shown. `T27.2-novice 003` shows no strip and no panes; the toolbar has a "Chat" button and "Show panes", which is the Focus bar of `EmbeddedChat` (testid `code-focus-chat`), not a hidden pane. The editor is 792 px of a 800 px window. The check treated the Focus bar's own way back as a visible pane. The checker has since been fixed (H-87). One action at both levels, SEQ 6 and 7. One note for the product: "Show panes" wraps to a second toolbar row (`T27.2-novice 003`), S4, and the pane toggles "Review changes", "Management" and "Changes and Git" stay in the toolbar beside it (T27.2 intermediate record). |
| T06.1 intermediate | FAIL: state ok (Allow answered), answer lacks line number 4 (want 1, 3, 4 as written, or +3 and -3) | **FAIL, product cause (S2, UX-158); checker also too strict (H-88)** | Verified in `T06.1-intermediate 002`: the box sits in the chat layout, the transcript above it keeps three rows, the composer below it, and the diff has a viewport of about three text rows, inside a box that has its own scroll bar (two scroll bars in the box: one for the box, one for the diff). The cause is in `PermissionDialog.svelte` (`max-height: 40%` with the body scrolling and the diff scrolling inside it). The panelist scrolled the diff once (action 1), allowed (2), opened Changes (3) and was out of its 3-step budget before it had read the changed lines; its answer is "3 lines added and 3 removed, in lines 1 to 5 (hunk -1,5 +1,5)". It does not name lines 1, 3 and 4. The checker's reason says "+3 and -3" is accepted, but its pattern did not match "3 lines added and 3 removed" (the sentence the box itself prints): H-88. With H-88 fixed the answer check would pass and the row would be a PASS at the budget limit (3 of 3, SEQ 5, weak). I do not credit it: the record was reconstructed by the facilitator after the session was cut off (its header says so), it does not give the changed lines the scenario asks for, and the evidence of a SEQ 5 at the limit is the same failure seen from the other side: the user cannot read the change in the box. The novice passed the same task in 3 of 4 actions with two scrolls of 36 px and 100 px (`T06.1-novice` record, shots 002 and 003), SEQ 6. Rerun after UX-158 and H-88. |
| T17.2 novice | FAIL: state ok, answer lacks the keywords (agents page, agents, agent manager, settings + edit, change, choose another, set as default, new chat) | **PASS†, checker too literal (H-89)** | The answer is "Default agent My assistant runs not-a-real-command, which was not found; set Claude Code as default." It names the wrong command, says "not found", and names a listed fix route (set another agent as default; `tasks.md` T17.2 lists "set a default" and "choose another agent"). The pattern wants the literal "set as default" and the answer has "set Claude Code as default". The panelist did it: `T17.2-novice 003` shows the Agents page with "My assistant" selected (the broken default, About shows the command) and "This is already the default" after the change (record step 5). It did not mention the Agents page by name, which the success check also lists; the route in the record (Choose another agent, then Set as Default) is the proof. Not weak (5 of 12, SEQ 5). |
| T10.1 novice | MANUAL: state ok (Terminal policy is Deny, Permissions route); `--no-answer` | **PASS†, with a note** | The record has no Answer line (H-90, the third round with this: H-82 is still not in). The task asks "show me how you can tell". The panelist's report states the proof in its own words: step 4 "top strip 'Run commands: Deny'" and step 5 "Permissions row 'Deny: never runs.'"; the proof is in `T10.1-novice 005` (chip "Run commands: Deny", row "Deny: never runs.", footer "Saved. New requests use these settings."). The success check names exactly those two (the chip list or the Deny policy). A task that asks a question and gets no answer is normally a FAIL, and I would fail a record that had nothing to read; this one states the proof in the steps and the shot agrees. This is the one judgement call in the pass counts: counted as FAIL, novice would be 59 of 60 (98%), the medians do not change, and the gate result does not change. 4 of 10, SEQ 6. |
| T01.1 novice | PASS: 4 of 4, SEQ 4 | **PASS, weak** | See 2.4. |
| T01.1 intermediate | PASS: 3 of 3, SEQ 5 | **PASS, weak (at the limit)** | See 2.4. |
| T13.1 novice | PASS: 8 of 12, SEQ 4 | **PASS, weak** | See 2.4. |
| T13.1 intermediate | PASS: 8 of 9, SEQ 3 | **PASS, weak, and not trusted** | The check passed on state ("the chat shows new progress", 13 of 30 against 0): the agent kept running while the window was closed. The panelist never got back to the original chat: it opened Task Manager, tried the Chats tab and the quick pane, and ended in a new empty chat ("Open as a chat window", record step 8). The scenario's last clause is "come back and see where it is", and this panelist did not. T13.1 has no check that a window of the same chat is open (T04.2 has: same session id). I keep the checker's PASS because the success check is written as state, and file H-91. With the check that the scenario implies this row is a FAIL, and the novice row, which reopened the chat from Start, "Recent chats" (`T13.1-novice 008`), is the pass. |
| T20.2 novice | PASS: 11 of 16, SEQ 4 | **PASS, weak** | See 2.4. |
| T22.2 novice | PASS: 12 of 16, SEQ 4, answer ok | **PASS, weak** | See 2.4. |
| T23.1b novice and intermediate | PASS 2 of 12 (SEQ 6) and 6 of 9 (SEQ 5) | **PASS** | Novice: Restart, then "Send it again" (`T23.1b-novice 003`), then "Done". Intermediate: SEQ 5 because it followed the highlighted "Show in Event Viewer" button first (`T23.1b-intermediate 001`, four actions): TH-92. |
| T23.2 intermediate | PASS: 3 of 9, SEQ 5 | **PASS** | Reconnect showed "Connected", the next Send failed again and left a second "You" bubble (`T23.2-intermediate 003`); "Send again" worked (record, shots 004 and 005). The scripted `flaky` agent may fail the first send after every connect: H-95 asks for the script to be documented before this is read as a product defect. The duplicate bubble is real (UX-162, S4). |
| T04.2 novice and intermediate | PASS: 6 of 12 and 5 of 9, SEQ 5 and 5 | **PASS** | R5 was SEQ 7 and 7. Both panelists double-clicked the Chats icon, got Task Manager with the row "hello" (`T04.2-novice 002`), double-clicked the row (it only selects), tried the Chat pane (a quick pane, not the saved chat) and found "Switch to chat" in the File menu (novice) or "Recent chats" in the Start menu (intermediate). TH-95. |
| T09.1 intermediate | PASS: 8 of 12, SEQ 5 | **PASS** | Edit has only Copy and Select All and a right-click on the changed file offers only Copy message, Copy code and Quote in reply (record steps 1 and 3; not viewed): two dead ends before "Open Recycle Bin". S4 (UX-169). |
| All other rows | PASS | **PASS** | I checked 24 PASS rows against their shots or against a last shot named in the record: T05.1 N (box with the real diff, 004), T06.1 N (record, shots 001 to 005), T07.1 N (001), T08.1 N (005: one file left and the reverted row), T08.2 N (002: five rows), T11.3 I (003), T13.2 N (003), T15.1 N (002), T17.2 I (002), T19.1 N (009), T20.1 N (001), T20.2 I (007), T21.1 N (002), T23.1b N (003), T24.1 N (001), T26.1 N (007), T27.1 N (001), T28.1 N (007), T28.1 I (005), T28.2 N (002), T31.2 N (003 and 005), T10.2 N (002), T10.1 N (005), T04.2 N (002). All agree with their `check.json` line. |

**SEQ 5 rows (clean passes, listed so that the causes are not lost).** Novice (4): T04.2 (Chats icon opens Task Manager), T17.2 (ENOENT, "Try again" first), T20.1 (eight actions through Event Viewer for an answer that the chat already printed, `T20.1-novice 001`), T31.2 (the Terminal takes typing silently, Help cut at the bottom). Intermediate (6): T01.1 (at the limit), T04.2, T06.1 (FAIL), T09.1, T23.1b (Event Viewer detour), T23.2 (second failed send).

### 2.2 What fresh panelists change in the evidence

**Decision: R6 is the first round whose step counts and learnability findings stand.** Every record says "fresh panelist, previous tasks: none" and `check.json.context.previousTasks` is `[]` in 120 of 120 files. In R5 sixteen records disclosed carry-over and the D2 cells of J16 to J24 could not be raised. Now:
- **D2 evidence is valid.** J21: the intermediate pressed Ctrl+N as a guess ("it worked, but no visible hint told me so", T21.1-intermediate record), the novice began with a double-click on the Chats icon, which the session blocks for T21.1, and then used the keyboard; "I did not see a focus indicator until 002.png" (`T21.1-novice 002` shows a thin dotted frame on the Computer icon, visible but light). J21 D2 stays at 7 on evidence, not on a cap.
- **Late-batch tasks got harder.** T13.1 (novice SEQ 5 to 4, intermediate 6 to 3), T20.2 (novice 5 to 4), T22.2 (novice 6 to 4), T20.1 (novice 6 to 5), T31.2 (novice 6 to 5) are the tasks that R5 panelists ran late in a batch, after seeing the Start menu, Task Manager or Help. Without that knowledge the product's own signposts decide, and for these tasks they are weak (2.4). The R5 SEQ of these rows was inflated, not the R6 SEQ deflated.
- **Medians.** Unchanged by the change of method: novice 6, intermediate 7.
- **Still open for the gate:** the packaged build (H-94). The records do not say which build ran.

### 2.3 UX-114 is verified

`T05.1-novice 004` and `T13.2-novice 003` show the box with "3 lines added, 3 removed", `E:\src\auth\redirect.ts` and a diff that starts with "@@ -1,5 +1,5 @@" and the removed line "// BUG: the "next" address is dropped, so deep links are lost after sign-in." (old text present). `T07.1-novice 001` shows the same for `login.ts` ("1 line added, 1 removed", "@@ -1,6 +1,6 @@"), `T06.1-novice` records lines 1, 3 and 4 from the box. The new-file case that R5 asked for is verified in `T21.1-novice 006`: the box for `E:\NOTE.md` says "The file does not exist yet, so everything below is new (1 line)." and shows "+ Hello from the assistant." There the whole diff fits (one line), so the viewport problem of TH-90 does not appear. No record carries the old sentence (0 of 120). **UX-114: fixed and verified.** The cells that it capped (D7 and D9 of J05, J06, J07, J13; D1 of J06) are raised where R6 shows nothing else holding them, not to 8, because the box now shows the real text in a viewport of one to three rows (TH-90): D7 and D9 to 7 in J05, J06, J07; D7 to 7 in J13. J06 D1 stays 6 (T06.1 intermediate fails: S2).

### 2.4 Weak and low rows: design causes

**T01.1 (novice 4 of 4, SEQ 4; intermediate 3 of 3, SEQ 5).** The success check (a desktop was created) was met at action 2 in both sessions (Create). The remaining actions went to "start getting set up", the second half of the scenario. Both panelists were stopped by the first screens, not by the controls:
- After Create the desktop reads "No projects plugged in" in the launcher row and "Agent can use nothing yet. Open an app to give it a tool." in the top bar (`T01.1-novice 004`). Nothing says "Plug in a project: open Computer". The novice guessed F1 and got **"Keyboard: Use Agent7 Without a Mouse"** (`T01.1-novice 004`), not "Using the Desktop" (the contents list on the left shows it second); it then opened "Using the Desktop" by hand (record step 4). The intermediate double-clicked Computer (the right door: its "Plug in a project..." button is there, record steps 3 and 4) and ran out of budget one click short.
- After Create the maximized launcher is still in front and the new desktop is behind it (`T01.1-novice 003`, `T01.1-intermediate 003`: identical shots, "New desktop Connected", "No projects plugged in", Show desktop). R5 UX-147 is not fixed. The intermediate needed a free `windows` call to see the desktop (record).
- The New desktop dialog does not say that a project can be added later; the novice skipped Browse because it "could not tell if that was the right call" (record).
Product causes: UX-164 (launcher in front, no next step, project optional), UX-165 (F1 topic). Task design cause: Min 1 with a scenario that invites more steps; H-92 asks for "steps to pass" in `check.json`.

**T13.1 (novice 8 of 12, SEQ 4; intermediate 8 of 9, SEQ 3).** The closing toast now says "The agent keeps working. Open it again from Chats on the desktop." and carries an "Open Task Manager" button (`T13.1-novice 002`). The Chats icon opens **Task Manager** on its Processes tab (`T13.1-novice 003`); the Chats tab lists "start the long job, Scripted lo..., Working" with only an End Task button, and a double-click on the row only selects it; the right-hand "Chat" opens a quick pane "Chat about Agent (C:)" whose own text says "it ends when you close the window. For a chat that you can come back to, use Start > New chat." (`T13.1-novice 006`). The way back is the Start menu's "Recent chats" (`T13.1-novice 008`). The novice found it after seven actions; the intermediate did not (it clicked "Open as a chat window" and got an empty "New chat"). R5 UX-146 gave the toast a button but the destination cannot do what the toast promises. TH-95, UX-163 (S3).

**T20.2 (novice 11 of 16, SEQ 4; intermediate 6 of 12, SEQ 6).** The novice's first double-click on Control Center hit nothing because the chat window covered the icon (record step 1), the chat's Tools menu and File menu and Control Center have no "stop the program" action, and the way found was the Chats icon, which opens Task Manager (the novice: "this is where I went the wrong way, and it is how I found End process"). The intermediate found Task Manager in the Start menu. Both liked the End process dialog ("The chats and their messages stay"). Nothing near the chat's Stop button says that the program is ended in Task Manager. UX-163 includes a line next to Stop. The R5 defect "It stopped again" at the first stop is gone (UX-141, `T20.2-intermediate 007`).

**T22.2 (novice 12 of 16, SEQ 4; intermediate 7 of 12, SEQ 7).** The novice opened Changes first (empty: the scripted reply to "Add a comment at the top of the login file" is "I did not change any files or run any commands", twice, so there was nothing to undo: script behaviour, not a product defect), pressed F1 (opened "Using Chat" at the top, record step 8), tried "6 - Troubleshooting" and "7 - Need Help?" and found the numbered steps further up. The manual says "In a chat window, click **Tasks and changes** first" (`manuals/chat.md` lines 44, 71 and 247) and the window's button reads "Changes" (every chat shot, for example `T07.1-novice 001`). The intermediate used the Help menu and the search box and reached "Undo a Change of the Agent (Revert)" in seven actions. TH-93, UX-161 (S3).

### 2.5 Verification of the R5 backlog (details in `FIX-BACKLOG-R6.md`)

20 items: 11 fixed (UX-138, 139, 140, 141, 143, 144, 145, 149, 150, 154, 156), 6 fixed in part (UX-146, 148, 151, 152, 153, 155), 3 not fixed (UX-142, 147, 157). UX-114 fixed and verified (2.3). Harness: H-77, H-78, H-79, H-80, H-81, H-83, H-86 fixed; H-82 and H-85 not fixed; H-84 not exercised.

### 2.6 Panelist claims checked

Each claim is checked against the shots, the logs and the code. "Not confirmed" claims are left out of the backlog.

| Claim (record) | Status | Evidence |
|---|---|---|
| The diff in the permission box shows only two or three lines at a time (T06.1 I, T06.1 N, T05.1 N) | Confirmed | `T06.1-intermediate 002` (about three rows, two scroll bars), `T05.1-novice 004` (two rows), `T07.1-novice 001` (one row in each of the two chats), `T13.2-novice 003`. `PermissionDialog.svelte` has `max-height: 40%`. UX-158. |
| The Chats icon opens Task Manager, a double-click on a chat there only selects it (T04.2 N and I, T13.1 N and I, T20.2 N) | Confirmed | `T04.2-novice 002`, `T13.1-novice 003`, `006`, `008`. UX-163. |
| The launcher stays in front after Create (T01.1 N and I) | Confirmed (UX-147 not fixed) | `T01.1-novice 003`, `T01.1-intermediate 003`. UX-164. |
| F1 on the new desktop opens the Keyboard topic (T01.1 N) | Confirmed | `T01.1-novice 004`. UX-165. |
| Help window is narrow and cut at the right edge (T31.2 N) | Confirmed, milder than R5 | `T31.2-novice 005`: the window is inside the screen, 470 px wide, the "Search Help" box runs to the edge (x 1270 of 1280) and the topic column is about 200 px. R5 had the window past the edge. UX-165. |
| The manual calls the button "Tasks and changes", the window says "Changes" (T22.2 N) | Confirmed | `manuals/chat.md` lines 44, 71, 113, 118, 247; chat shots. UX-161. |
| After the second crash the highlighted button is Event Viewer, and Event Viewer explains nothing (T23.1b I) | Confirmed | `T23.1b-intermediate 001`: Restart, "Start a new chat (your text is kept in the box)", Details..., and a highlighted "Show in Event Viewer"; the error text ends "Show in Event Viewer shows the details." The record: the ACP list shows "No events." until "Show all" is ticked (005, 006; not viewed). UX-160, UX-171. |
| The Event Viewer hides the warning behind "Show all"; the Activity gadget says "Nothing has happened yet." while the chat shows the failure (T20.1 N, T20.1 I) | Confirmed | `T20.1-novice 001`: Activity "Nothing has happened yet." beside a chat that says "I could not read README.md: Drive E: is not plugged in on this desktop"; record: "Number of events: 1, 27 more with Show all". The answer was already in the chat. UX-171 (S3: the gadget misleads, the filter hides). |
| "Working: agent7.browser_type" in the top bar and "Working... agent7.browser_type" in the chat (T28.1 N, T28.1 I) | Confirmed | `T28.1-intermediate 005`: top bar "Working: agent7.browser_type"; chat row "Working... agent7.browser_type". UX-170. |
| The browser step list is too generic (T28.1 N) | Confirmed (UX-157 not fixed) | `T28.1-novice 007`: "Find something on the page", "Type on the page", "Wait for the page", "Click on the page". UX-170. |
| The permission chips look like labels and open Control Center without saying so (T10.1 N, T16.1 N, T06.3 N; no tooltip, T16.2 I, T10.2 N) | Confirmed (UX-142 not fixed) | `T10.2-novice 002`: the chip "Run commands: Ask (no Terminal open)" is a dashed pill, underlined on hover, no tooltip; T10.1 N: "The first click on the yellow pill was a guess". UX-159. |
| The reply to "Take over" now says what happens (T28.2 N) | Confirmed good | `T28.2-novice 002`: "You are in control. All tools ask first until you resume." and Resume; the page bar sentence is cut ("The agent stops and asks before it uses the p..."), S4 (UX-172). |
| The Changes tab says "The agent changed nothing in this chat. Git shows 3 changed files. Open Git" (T24.1 N) | Confirmed good | `T24.1-novice 001`. A single click on a row still only selects (T24.2 N record); S4 (UX-168). |
| The Changes list shows five rows for five files; the revert notice no longer squeezes it (T08.2 N, T08.1 N) | Confirmed good | `T08.2-novice 002`, `T08.1-novice 005`. Cut text remains ("redir... t.test.ts", "Reverted. Restore fr..."): S4 (UX-167). |
| The chat strip is unlabelled (T27.1 N) | Partly confirmed | `T27.1-novice 001` shows a right-edge tab with a chat icon and the word "Chat"; the novice called it unlabelled and guessed. UX-153 fixed in shape, not in effect for this novice (SEQ 6, was 5). |
| "Comments (0)" disagrees with the banner (R5) | Fixed | `T26.1-novice 007`: "Comments (2)" and "2 comments". The status bar is cut ("0 open, 0 resolved, 2 s..."), S4 (UX-167). |
| After Send to chat nothing says the fix is running; Stop is disabled (T26.1 N) | Not confirmed as a product defect | `T26.1-novice 007`: the scripted reply is "Fixing the review comments now." and the turn is over. Script text. |
| The sent message has text that was not in the box (T19.1 N) | Confirmed, S4 | `T19.1-novice 009`: "I have a question about the page "Fixture page" at http://127.0.0.1:43015/." above the box text. UX-172. |
| Reconnect, then Send fails again and leaves a duplicate bubble (T23.2 I) | Confirmed, cause unclear | `T23.2-intermediate 003`. Script behaviour (H-95) and a product behaviour (the failed attempt keeps its bubble, UX-162). |
| The Terminal accepts typing silently; the reason shows only after typing (T31.2 N) | Confirmed, S4 | `T31.2-novice 003`: the yellow line appears after the keystrokes; the status bar already said "Read-only" before. |
| The desktop icon needs a double-click (T16.2 N) | Not a defect | Windows convention; the "Welcome to your desktop: Double-click an icon to open it." balloon says so (`T27.1-novice 001`). |
| "Ask (no Terminal open)" is not obviously off (T10.2 N and I) | Confirmed, S4 | Unchanged from R5, left to the UX lead's S4 list. |
| The chat window covers the desktop icons it opens over (T20.2 N, T12.2 N) | Confirmed, S4 | Records; UX-166. |

### 2.7 Other decisions

- **T05.1, T05.2, T06.2, T06.3 both PASS.** T06.1 N PASS (3 of 4, SEQ 6), T06.1 I FAIL (2.1). The in-layout box works (both buttons in the window, "1 of 2 waiting", the key hint on the button row); its diff area is the defect.
- **T07.1 both PASS, none weak.** The panelists answered each chat from its own box; the first shot already shows two waiting chats, and the top-bar link names the chat and the file ("Fix the login redirect bug s... is waiting: change src/auth/redirect.ts (1 of 2 waiting)", `T07.1-novice 001`). The record text of the novice says the chat titles are cut ("Fix the login redirect bug so that deep...", `T07.1-novice 001`), S4.
- **T10.1 and T10.2 both PASS.** T10.2 answered from the bar with one action at both levels (SEQ 6 and 7).
- **T11.1, T11.2, T11.3 both PASS**, none weak (SEQ 6 and 7).
- **T12.1 and T12.2 both PASS.** "Remove from desktop" is still greyed with no hint (T12.1 N record), S4 (UX-167).
- **T14.1, T14.2 both PASS**, T14.1 novice reads "waiting" ambiguously (S4).
- **T16.1 and T16.2 both PASS** (SEQ 6 and 7).
- **T17.1 both PASS**; T17.1 novice found no agent setting in the Code window's Tools menu (record; S4).
- **T18.1, T18.2 all PASS** at SEQ 7. Open S4: "Notes" and "Board" against "Form" (T18.1 sidebar N).
- **T19.1, T19.2 both PASS.** T19.2 novice SEQ 6 (R5 5): the error page names the cause and fix; one sentence is cut ("the number after the...").
- **T21.1 both PASS.** Deny has the focus; the hint "Enter denies. Press A to allow." is on the button row now (UX-139). The novice still wants Allow as default (S4; decision unchanged: keep Deny).
- **T24.1, T24.2, T25.1, T25.2, T26.1, T26.2, T27.1, T28.1, T28.2, T29.1, T30.1, T30.2, T31.1 both PASS.** "2 files changed. Showing 1 (the one you opened)" confused a novice again (T25.1 N, S4).

## 3. Affinity map

Themes continue the round 5 list (TH-70 to TH-89). Ranked by severity (S1 to S4, rubric scale), then by the number of records that name or show the problem. "Runs" counts the records and the shots that I checked, out of 120. The last column is the backlog item in `FIX-BACKLOG-R6.md`. No S1 theme. One S2 theme.

| TH | Theme | Sev | Runs | Items |
|---|---|---|---|---|
| TH-90 | The permission box shows the real change but gives the diff a viewport of one to three rows, inside a box that scrolls on its own (nested scroll bars); T06.1 intermediate ran out of budget reading it | S2 | 5: T06.1 I (FAIL, shot 002), T06.1 N, T05.1 N (004), T07.1 N (001), T13.2 N (003) | UX-158 |
| TH-95 | The Chats icon opens Task Manager; a closed running chat cannot be reopened from it (double-click selects, the quick pane is a new chat); the toast and the Stop button do not lead to the right place | S3 | 6: T04.2 N and I, T13.1 N and I (shots 003, 006, 008), T20.2 N | UX-163 |
| TH-96 | The launcher stays in front after Create and Connect; nothing says what to do next, or that a project is optional (R5 UX-147 not fixed) | S3 | 3: T01.1 N and I (shots 003), T13.2 I (after Connect, record) | UX-164 |
| TH-97 | Help: F1 on the new desktop opens the Keyboard topic; the window opens narrow at the right edge with the search box at the edge; text cut at the bottom | S3 | 5: T01.1 N (004), T31.2 N (005), T31.1 N, T22.1 I, T22.2 I | UX-165 |
| TH-93 | The manual names a "Tasks and changes" button that the window calls "Changes"; the undo steps are deep in "Using Chat" | S3 | 2: T22.2 N, T22.2 I (search only) | UX-161 |
| TH-91 | The permission chips look like labels, open Control Center on a click and have no tooltip (R5 UX-142 not fixed) | S3 | 5: T10.1 N, T16.1 N, T06.3 N, T16.2 I, T10.2 N (002) | UX-159 |
| TH-92 | After the second crash the highlighted button is "Show in Event Viewer", not Restart; the error text sends the user there | S3 | 1: T23.1b I (001) | UX-160 |
| TH-102 | Browser: the status text shows raw tool ids ("Working: agent7.browser_type"); the step list says "Type on the page" with no target (R5 UX-157 not fixed) | S3 | 2: T28.1 N (007; top-bar title in the record) and T28.1 I (005) | UX-170 |
| TH-103 | Event Viewer: the default list hides the cause (1 of 28 events, "No events." until Show all); the Activity gadget says "Nothing has happened yet." beside a failure | S3 | 3: T20.1 N (001), T20.1 I, T23.1b I | UX-171 |
| TH-94 | A failed Send leaves a second "You" bubble; Reconnect shows Connected but the next Send fails again | S4 | 1: T23.2 I (003) | UX-162 |
| TH-98 | Windows open over the desktop icons they were started from; the chat window hides the Control Center icon | S4 | 2: T20.2 N, T12.2 N | UX-166 |
| TH-99 | Cut text and silent greys: "Reverted. Restore fr...", "redir... t.test.ts", the Review status bar, comment texts, "Remove from desktop" greyed, "2 files changed. Showing 1" | S4 | 8: T08.1 N and I, T09.1 N and I, T08.2 I, T25.1 N, T25.2 N, T12.1 N | UX-167 |
| TH-100 | Git and Code: a single click only selects; a click opens the Review window without warning | S4 | 3: T24.1 N, T24.2 N, T24.1 I | UX-168 |
| TH-101 | No Restore where users look: Edit has no Undo, a right-click on a changed file offers copy only | S4 | 1: T09.1 I | UX-169 |
| TH-104 | Browser page bar sentence cut; "Take over" unexplained to a novice; the chat pane covers the page; the sent question has a hidden first sentence | S4 | 4: T28.2 N (002), T28.1 N, T19.1 N (009), T19.1 I | UX-172 |
| TH-89 | Words carried from R4: "Scripted demo", "plug in", "ENOENT", "port", "Notes" for a form, "Board" for a form | S4 | 5: T02.1 N, T17.2 N, T19.2 N, T18.1 sidebar N, T18.1 window I | R4 UX-133 to UX-135, still open |
| TH-87 | Deny has the focus; the novice wants Allow | S4 | 1: T21.1 N | decision: keep Deny (UX-139 fixed: the hint is on the button row) |

What did not recur: "Agent7 cannot read", the clipped approval box, "It stopped again" at the first stop, "Working: Starting the agent..." beside a ready chat, "removes your files (C:)", the cut Review banner, the launcher-less Plug in, the stale yellow Browser bar, the sentence "Running commands is set to Ask in Control Center" glued to the command, the dead "Open Agents", the unlabelled message "Please continue where you stopped." as "You", and the silent loss of the request after the second crash.

## 4. Journey scores

The full re-score with the reason for each changed cell is in `scorecard.md` (round 6 table and "Reasons for the changed scores, round 6"). Summary: mean cell 7.84 (R5: 7.83); 25 cells higher, 18 lower and 287 equal against round 5 (330 numeric cells). **0 of 31 journeys at 10/10.** Under the rubric a journey is 10/10 only if all eleven cells are 10: no open S1, S2 or S3 finding, every S4 accepted in `findings.md` with a written reason (none is), and the D5 and D10 evidence the rubric asks for. D5: no axe result exists for R6 (the R5 scan found one violation, the 18.8 px suggestion chip, since fixed in code and not re-scanned), the manual checklist and the screen reader pass are not done, so D5 stays at its R5 values. D10: still waits for the reference-machine run (the Performance (UX-84) section is not edited by this round).

Seventeen journeys have no open S2 or S3 finding (J03, J08, J09, J11, J12, J14, J15, J17, J18, J19, J21, J24, J25, J26, J27, J29, J30; R5: nine); **fifteen of them also pass the panel part** (all but J09 and J17, whose lowest SEQ is 5). They are the closest to 10/10 and are held by S4 findings, by D5 and by D10. Fourteen journeys have an open S2 or S3 item (J01, J02, J04, J05, J06, J07, J10, J13, J16, J20, J22, J23, J28, J31). The panel part is met by 21 journeys (R5: 17): J02, J03, J05, J07, J08, J10, J11, J12, J14, J15, J16, J18, J19, J21, J24, J25, J26, J27, J28, J29, J30. J06 has a failed task; J13 has a SEQ 3 task; J01, J20 and J22 have SEQ 4 tasks.

| Journey | Mean R6 | Mean R5 | Lowest cell | Lowest dimension | Panel gate (pass at both levels, min SEQ 6) |
|---|---|---|---|---|---|
| J01 First launch and empty launcher | 7.8 | 8.3 | 7 | D1 7, D2 7, D3 7, D11 7 | no, min SEQ 4 |
| J02 Create a desktop | 8.0 | 8.0 | 7 | D2 7, D11 7 | yes, min SEQ 6 |
| J03 Plug in a project | 8.2 | 7.9 | 7 | D5 7 | yes, min SEQ 6 |
| J04 Start a chat | 7.8 | 8.1 | 7 | D2 7, D5 7 | no, min SEQ 5 |
| J05 Send a prompt and follow progress | 7.6 | 7.5 | 7 | D2 7, D5 7, D7 7, D8 7, D9 7 | yes, min SEQ 6 |
| J06 Approve or deny a request (chat and UAC dialog) | 7.3 | 7.0 | 6 | D1 6, D3 6 | no, min SEQ 5, T06.1 intermediate fails |
| J07 Approve from the Action Center | 7.6 | 7.2 | 7 | D2 7, D5 7, D7 7, D8 7, D9 7 | yes, min SEQ 6 |
| J08 Review and revert changes (Chat, Code) | 7.9 | 7.5 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J09 Restore from the Recycle Bin | 7.7 | 7.7 | 7 | D2 7, D5 7, D8 7 | no, min SEQ 5 |
| J10 Tools follow apps | 7.8 | 7.8 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J11 Pause and take control | 8.0 | 7.9 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J12 Eject a drive | 8.0 | 8.0 | 7 | D5 7, D11 7 | yes, min SEQ 6 |
| J13 Disconnect and reconnect while the agent runs | 7.2 | 7.5 | 6 | D2 6 | no, min SEQ 3 |
| J14 Manage several desktops | 8.4 | 8.4 | 8 | D2 8, D4 8, D5 8, D8 8, D9 8, D11 8 | yes, min SEQ 6 |
| J15 Delete a desktop | 8.4 | 8.3 | 8 | D2 8, D4 8, D5 8, D8 8, D9 8, D11 8 | yes, min SEQ 7 |
| J16 Choose permissions (Control Center) | 7.9 | 7.9 | 7 | D2 7, D8 7 | yes, min SEQ 6 |
| J17 Add and choose agents | 7.9 | 7.9 | 7 | D2 7, D8 7 | no, min SEQ 5 |
| J18 A2UI surfaces: inline, sidebar, window | 8.1 | 8.1 | 7 | D5 7 | yes, min SEQ 7 |
| J19 Browse with the Browser | 7.6 | 7.6 | 7 | D2 7, D5 7, D7 7, D8 7, D9 7 | yes, min SEQ 6 |
| J20 Investigate a problem (Event Viewer, Task Manager) | 7.6 | 7.8 | 6 | D2 6 | no, min SEQ 4 |
| J21 Keyboard-only operation | 7.9 | 7.9 | 7 | D2 7, D5 7, D11 7 | yes, min SEQ 6 |
| J22 First-time help and discoverability | 7.6 | 8.0 | 7 | D1 7, D3 7, D5 7, D8 7, D11 7 | no, min SEQ 4 |
| J23 Recover from errors | 7.6 | 7.5 | 7 | D2 7, D4 7, D5 7, D9 7 | no, min SEQ 5 |
| J24 Read code, git status and the gutter | 7.9 | 7.8 | 7 | D2 7, D5 7 | yes, min SEQ 6 |
| J25 Review the agent's changes in Code Review | 8.1 | 8.1 | 7 | D5 7, D8 7 | yes, min SEQ 6 |
| J26 Send review comments to a chat, and comment yourself | 7.5 | 7.5 | 7 | D2 7, D5 7, D8 7, D9 7, D11 7 | yes, min SEQ 6 |
| J27 Ask the chat pane about what you are looking at | 7.8 | 7.8 | 7 | D2 7, D5 7, D8 7, D9 7 | yes, min SEQ 6 |
| J28 Let the agent use a web app in the Browser | 7.7 | 7.6 | 7 | D2 7, D5 7, D8 7 | yes, min SEQ 6 |
| J29 Browse with tabs and recover from a bad page | 7.9 | 7.9 | 7 | D4 7, D5 7, D7 7, D8 7, D11 7 | yes, min SEQ 7 |
| J30 Use menus, right-click and About in any app | 8.2 | 8.2 | 7 | D5 7, D8 7 | yes, min SEQ 7 |
| J31 Get help from inside an app (Help menu and F1) | 8.0 | 8.1 | 7 | D5 7, D8 7, D9 7 | no, min SEQ 5 |

## 5. Harness and checker defects

Fixes to `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process. Not product work. H-01 to H-86 are in `r1` to `r5/SYNTHESIS.md`. Status of the R5 harness items in R6: **fixed and seen working** H-77 (T06.1 reason: "a range such as '1 to 5' does not count"; now too strict, H-88), H-78 (all 20 scrolls have dy of 100 or more), H-79 (T19.1-novice 009), H-80 (`context.previousTasks` is `[]` in 120 of 120), H-81 (panelists number steps correctly), H-83 (120 of 120 records have "Steps: N of M"), H-86 (folders are `T23.1b-*`). **Not fixed:** H-82 (T10.1 novice ended MANUAL with `--no-answer`, again: H-90) and H-85 (T07.1 reason prints "(selected | selected)", no order and no time in `check.json.notes`). **Not exercised:** H-84 (no T31.1 clause was added without a shot: not tested), H-66, H-75, H-76.

| id | Where | Defect | Fix |
|---|---|---|---|
| H-87 | `checks/features.mjs` T27.2 | The check read the Focus bar's "Chat" and "Show panes" buttons (testid `code-focus-chat`) as a pane that is still shown and failed both T27.2 rows (editor 792 of 800 px). The facilitator has fixed it since the panel; both rows are overridden to PASS (2.1). | Verify on the rerun: the check counts only the panes and the strip, not the Focus bar; add a unit test with the R6 state. |
| H-88 | `checks/chat.mjs` T06.1 | The answer check wants "1, 3, 4 as written, or +3 and -3". The box prints "3 lines added, 3 removed" and the panelist wrote "3 lines added and 3 removed"; the reason text says "+3 and -3" is accepted, the pattern did not match. T06.1 intermediate failed on it (partly). | Accept "3 added", "3 removed" and "+3 / -3" in any order and spelling; keep rejecting ranges and "could not tell"; add a unit test with the R6 answer. Decide whether the lines themselves are required (the scenario asks "which lines"). |
| H-89 | `checks/desktop.mjs` T17.2 | The keyword pattern wants the literal "set as default"; "set Claude Code as default" failed a correct answer (T17.2 novice). | Match `set\s+(\S+\s+){0,3}as\s+default`, "default" with "agent", "choose another"; keep "new chat". |
| H-90 | `session.mjs check`, `session.mjs stop` | H-82 again: T10.1 novice was written with `--no-answer` and ended MANUAL with no Answer line in the record. Third round with this defect (R4 T02.2, R5 T02.2 and T10.1). | Refuse a verdict for an answer task without `--answer`; `stop` must refuse a record without an "Answer:" line for tasks that have an Answer field in `tasks.md`. |
| H-91 | `checks/chat.mjs` T13.1, `tasks.md` T13.1 | The check passes on state ("the chat shows new progress", 13 of 30 against 0) without a window of the original chat being open. T13.1 intermediate never reopened the original chat and passed (SEQ 3). | As T04.2: require a chat window with the same session id after the close, or record `reopened: false` and make the verdict MANUAL. |
| H-92 | `tasks.md` T01.1, `check.json` | T01.1 has Min 1 and the check is met at the second action; the scenario's second clause ("start getting set up") invites more, and both panelists spent the budget (at limit, weak). | Write `stepsToPass` (steps when the check first held) into `check.json` and use it for the budget and the weak rule, or end the scenario at the point where the check holds. |
| H-93 | `PANELIST.md`, `session.mjs stop` (record template) | The instruction "think-aloud verbatim" made a model safety filter stop three intermediate sessions while writing the record. The template still prints "Think-aloud (verbatim, from the final report)" in 14 records written before the rewording. A record that the facilitator finished has no field for it. | One heading everywhere: "Steps (the numbered step list of the final report)". Add `check.json.rerun: true` with the reason and `finishedByFacilitator: true` so the synthesis can count them. |
| H-94 | `session.json`, record header | The gate asks for the packaged build; `session.json` and the records do not say which build ran. | Write `build: {packaged, version, commit}` into `session.json` and the record header; refuse to count a round for the gate without `packaged: true`. |
| H-95 | `scripts/ux-panel` scripted agent `flaky` (T23.2) | After Reconnect (status "Connected") the intermediate's next Send failed again and left a duplicate "You" bubble (`T23.2-intermediate 003`). It is not known whether the script drops the first send after every connect. | Document the script in `tasks.md` T23.2; if it fails once per connection, say so in the start state, otherwise raise the product item UX-162. |

## 6. What the gate needs next

1. **Product (`FIX-BACKLOG-R6.md`).** One S2 item (UX-158), eight S3 items and six S4 items in four work packages (A approvals, chips and chat errors: UX-158 to UX-162; B shell, Chats and Task Manager, launcher, Help: UX-163 to UX-166; C Code, Changes and Review: UX-167 to UX-169; D Browser and Event Viewer: UX-170 to UX-172). The failed task first: T06.1 (UX-158). Then the two clusters behind the weakest rows: the Chats icon and Task Manager (UX-163, five rows between SEQ 3 and 5) and the first screens and Help (UX-164, UX-165, UX-161).
2. **Harness (about half a day).** H-88 (T06.1 answer), H-91 (T13.1 check), H-89 (T17.2 keywords), H-90 (answer tasks), H-94 (build id), H-92, H-93, H-95. H-87 is done; verify it.
3. **Rerun.** After UX-158 and H-88: T06.1 at both levels. After UX-163 and UX-164: T01.1, T04.2, T13.1, T20.2 at both levels. After UX-161 and UX-165: T22.2 and T31.2 at both levels. Every task of J05, J06, J07, J13 (the approval box), J20 and J23 (UX-163, UX-171, UX-160), with fresh panelists (as in R6), then the full pass on the packaged build for the release gate: all tasks pass at both levels, no task below 5, median 6 or more, no open S2 or S3.
4. **Outside the panel.** D5: run the axe scan (28 states, with the 24 px suggestion chip) and the manual checklist (zoom 200%, forced colors, reduced motion, screen reader on J01, J02, J05, J06, J07) with a second reviewer. D10: the reference-machine run and the 30-minute soak, which the project owner was asked to do. The UX lead accepts or rejects each open S4 in `findings.md`; with the S4 items of R4 to R6 still unaccepted no journey can reach 10.
