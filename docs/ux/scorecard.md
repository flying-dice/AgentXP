# Agent7 UX Scorecard

Status: phase 1 baseline by the expert evaluator (a single reviewer, so this is not yet the fresh-reviewer score that `process.md` needs for sign-off). The panel runs are in progress and not yet merged. Every score is below 10 on purpose: no journey has zero open findings.

Cell format: the score from 1 to 10, or `n/a` (reason below the table). Findings are in `findings.md`. Dimensions: D1 Usability, D2 Learnability, D3 Efficiency, D4 Error prevention and recovery, D5 Accessibility, D6 Visual consistency, D7 Trust and transparency, D8 Content and copy, D9 Feedback and state, D10 Performance perception, D11 Documentation. Panel column: result of the user-panel tasks (`Haiku/Sonnet/Opus`).

**How scores were set.** A journey marked with `*` was only partly walked: the screens, empty states, keyboard checks and the axe scan were done, but not the whole flow end to end. Its scores are expert estimates, capped by the findings that exist, and need a full walk by a fresh reviewer. A journey without `*` was walked on the built app with the panel driver (J05, J06, J19, J21, J22 and J25 to J31 in the parts named in `findings.md`). The cap rule of `rubric.md` applies: a Nielsen 3 finding is rubric S2 (cap 6), a Nielsen 2 finding is S3 (cap 8).

**Global notes.**
- A. D10 is 8 everywhere because nothing is measured. No freeze or jank was seen in about 70 driver actions. The rubric needs recorded numbers for 9 or 10.
- B. D5 stays at 6 or 7 where the axe scan found critical or serious violations in the screens of the journey (F-025 to F-031). Terminal, Snipping Tool, Task Manager, Control Centre and Help had no violations. The manual checklist (zoom, forced colors, screen reader) was not run, so D5 is never above 8.
- C. D11: manuals exist for every app and `check-help-coverage.mjs` reports 391 of 391 ids documented. No procedure was followed word for word yet, so D11 is capped at 8.
- D. D1 and D2 cannot be 10 until the panel passes (rubric: user panel as a gate).

| Journey | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | Panel | At 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J01 First launch and empty launcher | 8 | 6 | 9 | n/a | 6 | 9 | n/a | 7 | 8 | 8 | 6 | not yet merged | 0 of 11 |
| J02 Create a desktop * | 8 | 8 | 8 | 8 | 6 | 9 | n/a | 8 | 8 | 8 | 7 | not yet merged | 0 of 11 |
| J03 Plug in a project * | 8 | 8 | 8 | 8 | 6 | 9 | 8 | 8 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J04 Start a chat * | 8 | 7 | 8 | 9 | 6 | 9 | 8 | 6 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J05 Send a prompt and follow progress | 6 | 8 | 8 | 8 | 6 | 9 | 7 | 6 | 6 | 8 | 8 | not yet merged | 0 of 11 |
| J06 Approve or deny a request (chat and UAC dialog) | 8 | 8 | 8 | 7 | 7 | 9 | 7 | 9 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J07 Approve from the Action Center * | 8 | 7 | 8 | 8 | 7 | 9 | 8 | 8 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J08 Review and revert changes (Chat, Code) * | 7 | 7 | 7 | 8 | 6 | 8 | 8 | 7 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J09 Restore from the Recycle Bin * | 8 | 8 | 8 | 8 | 6 | 9 | 8 | 8 | 9 | 8 | 8 | not yet merged | 0 of 11 |
| J10 Tools follow apps * | 8 | 8 | 9 | n/a | 7 | 9 | 9 | 7 | 9 | 8 | 8 | not yet merged | 0 of 11 |
| J11 Pause and take control * | 8 | 8 | 9 | 8 | 8 | 9 | 8 | 8 | 7 | 8 | 8 | not yet merged | 0 of 11 |
| J12 Eject a drive * | 8 | 7 | 8 | 8 | 6 | 9 | 8 | 7 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J13 Disconnect and reconnect while the agent runs * | 8 | 8 | 8 | 8 | 7 | 9 | 8 | 8 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J14 Manage several desktops * | 8 | 8 | 8 | 8 | 6 | 9 | n/a | 8 | 8 | 8 | 7 | not yet merged | 0 of 11 |
| J15 Delete a desktop * | 8 | 8 | 8 | 8 | 6 | 9 | n/a | 8 | 8 | 8 | 7 | not yet merged | 0 of 11 |
| J16 Choose permissions (Control Centre) * | 8 | 7 | 8 | 8 | 8 | 9 | 8 | 7 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J17 Add and choose agents * | 8 | 8 | 8 | 8 | 8 | 9 | 8 | 7 | 7 | 8 | 8 | not yet merged | 0 of 11 |
| J18 A2UI surfaces: inline, sidebar, window * | 7 | 7 | 8 | 8 | 7 | 8 | 7 | 8 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J19 Browse with the Browser | 7 | 8 | 8 | 6 | 6 | 9 | 7 | 8 | 5 | 8 | 8 | not yet merged | 0 of 11 |
| J20 Investigate a problem (Event Viewer, Task Manager) * | 8 | 6 | 8 | 8 | 6 | 9 | 8 | 6 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J21 Keyboard-only operation | 6 | 7 | 7 | 8 | 6 | 9 | n/a | 8 | 8 | 8 | 7 | not yet merged | 0 of 11 |
| J22 First-time help and discoverability | 7 | 6 | 8 | n/a | 8 | 9 | n/a | 5 | 8 | 8 | 6 | not yet merged | 0 of 11 |
| J23 Recover from errors * | 6 | 7 | 8 | 6 | 7 | 9 | 8 | 7 | 6 | 8 | 8 | not yet merged | 0 of 11 |
| J24 Read code, git status and the gutter * | 7 | 7 | 7 | 8 | 6 | 8 | 8 | 7 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J25 Review the agent's changes in Code Review | 6 | 7 | 8 | 9 | 6 | 6 | 7 | 6 | 7 | 8 | 8 | not yet merged | 0 of 11 |
| J26 Send review comments to a chat, and comment yourself | 6 | 7 | 8 | 8 | 7 | 6 | 8 | 7 | 7 | 8 | 8 | not yet merged | 0 of 11 |
| J27 Ask the chat pane about what you are looking at | 8 | 6 | 8 | 9 | 6 | 7 | 7 | 7 | 7 | 8 | 8 | not yet merged | 0 of 11 |
| J28 Let the agent use a web app in the Browser | 7 | 7 | 8 | 7 | 7 | 8 | 6 | 5 | 6 | 8 | 8 | not yet merged | 0 of 11 |
| J29 Browse with tabs and recover from a bad page | 6 | 8 | 8 | 6 | 6 | 9 | 7 | 8 | 5 | 8 | 8 | not yet merged | 0 of 11 |
| J30 Use menus, right-click and About in any app | 8 | 7 | 8 | 9 | 7 | 7 | 8 | 6 | 8 | 8 | 8 | not yet merged | 0 of 11 |
| J31 Get help from inside an app (Help menu and F1) | 8 | 8 | 9 | n/a | 8 | 9 | n/a | 5 | 8 | 8 | 6 | not yet merged | 0 of 11 |

`n/a` reasons: D4 is n/a where the journey has no destructive action or error branch. D7 is n/a where the agent does nothing in the journey.

## Reasons for every score below 10

One line per dimension. "Not walked" means the cell is an estimate (see the `*` rule). Notes A to D above apply to D10, D5, D11, D1 and D2 and are not repeated.

**J01 First launch and empty launcher**
- D1 8: F-011 the empty text never says what a desktop is
- D2 6: F-010, F-011 no help in the Launcher, desktop undefined
- D3 9: F-010 no access keys
- D5 6: F-026 critical axe finding on the empty list, F-010
- D6 9: Launcher not compared with the reference at native size
- D8 7: F-032 semicolon, F-011
- D9 8: No loading state seen
- D11 6: F-010 F1 does nothing

**J02 Create a desktop**
- D1 8: Dialog opens (axe only); flow not run end to end
- D2 8: Not walked
- D3 8: Not walked
- D4 8: Name check not run
- D5 6: F-026 on the dialog
- D6 9: Not compared
- D8 8: Not audited
- D9 8: Not walked
- D11 7: F-010

**J03 Plug in a project**
- D1 8: Explorer toolbar seen; flow not run
- D2 8: Not walked
- D3 8: Not walked
- D4 8: Not walked
- D5 6: F-027 splitter, F-028
- D6 9: Not compared
- D7 8: Not walked
- D8 8: Not audited
- D9 8: Not walked
- D11 8: Manual not followed

**J04 Start a chat**
- D1 8: New chat dialog not scanned or walked
- D2 7: F-016 chat title
- D3 8: Not walked
- D4 9: Estimate, see notes
- D5 6: F-027, F-028
- D6 9: Not compared
- D7 8: Not walked
- D8 6: F-016 New session, F-015
- D9 8: Not walked
- D11 8: Manual not followed

**J05 Send a prompt and follow progress**
- D1 6: F-004 the final answer is below the fold after a long turn
- D2 8: Tool cards need Show to understand
- D3 8: Long turn needs a scroll
- D4 8: Stop works; not stress tested
- D5 6: F-029 contrast of the author label, F-026
- D6 9: Not compared
- D7 7: F-007 raw tool names
- D8 6: F-007, F-016
- D9 6: F-004
- D11 8: Manual not followed

**J06 Approve or deny a request (chat and UAC dialog)**
- D1 8: Dialog is clear; diff incomplete (F-023)
- D2 8: Show details not walked
- D3 8: Two Tabs to reach Allow (F-041)
- D4 7: F-023 removed lines not shown, so Allow rests on partial information
- D5 7: F-041 no initial focus, F-029
- D6 9: Not compared with reference
- D7 7: F-023
- D8 9: Estimate, see notes
- D9 8: Waiting state seen; Action Center not walked
- D11 8: Manual not followed

**J07 Approve from the Action Center**
- D1 8: Flyout opened for axe only
- D2 7: Flag with a badge is small
- D3 8: Not walked
- D4 8: Not walked
- D5 7: F-029 contrast in the flyout
- D6 9: Not compared
- D7 8: Not walked
- D8 8: Not audited
- D9 8: Not walked
- D11 8: Manual not followed

**J08 Review and revert changes (Chat, Code)**
- D1 7: Code seen empty only
- D2 7: F-022 dead buttons, Logs & others
- D3 7: Not walked
- D4 8: Revert not run
- D5 6: F-027, F-029, F-028
- D6 8: Toolbar has dead icons
- D7 8: Not walked
- D8 7: F-022
- D9 8: Not walked
- D11 8: Manual not followed

**J09 Restore from the Recycle Bin**
- D1 8: Empty state seen; restore not run
- D2 8: Not walked
- D3 8: Not walked
- D4 8: Not walked
- D5 6: F-027 splitter
- D6 9: Not compared
- D7 8: Not walked
- D8 8: Not audited
- D9 9: Estimate, see notes
- D11 8: Manual not followed

**J10 Tools follow apps**
- D1 8: Chips seen; not run
- D2 8: Not walked
- D3 9: Estimate, see notes
- D5 7: F-028
- D6 9: Not compared
- D7 9: Estimate, see notes
- D8 7: F-046 USB drives shown without explanation
- D9 9: Estimate, see notes
- D10 8: Not measured
- D11 8: Manual not followed

**J11 Pause and take control**
- D1 8: Not walked
- D2 8: Not walked
- D3 9: Estimate, see notes
- D4 8: Not walked
- D5 8: Not scanned
- D6 9: Estimate, see notes
- D7 8: F-005 what Take control does is unclear
- D8 8: Estimate, see notes
- D9 7: F-042 Working shown for an idle chat, F-005
- D11 8: Manual not followed

**J12 Eject a drive**
- D1 8: Not walked
- D2 7: Tray icon not walked
- D3 8: Not walked
- D4 8: Not walked
- D5 6: F-028
- D6 9: Not compared
- D7 8: Not walked
- D8 7: USB drive term shown
- D9 8: Not walked
- D11 8: Manual not followed

**J13 Disconnect and reconnect while the agent runs**
- D1 8: Not walked
- D2 8: Not walked
- D3 8: Not walked
- D4 8: Not walked
- D5 7: Not scanned
- D6 9: Not compared
- D7 8: Not walked
- D8 8: Not audited
- D9 8: Not walked
- D11 8: Manual not followed

**J14 Manage several desktops**
- D1 8: Not walked
- D2 8: Not walked
- D3 8: F-010 no access keys
- D4 8: Not walked
- D5 6: F-026 on the Launcher list
- D6 9: Not compared
- D8 8: Not audited
- D9 8: Not walked
- D11 7: F-010

**J15 Delete a desktop**
- D1 8: Not walked
- D2 8: Not walked
- D3 8: Not walked
- D4 8: Confirmation not walked
- D5 6: F-026
- D6 9: Not compared
- D8 8: Not audited
- D9 8: Not walked
- D11 7: F-010

**J16 Choose permissions (Control Centre)**
- D1 8: Agents page seen; Permissions not walked
- D2 7: Not walked
- D3 8: Not walked
- D4 8: Not walked
- D5 8: No axe violations; keyboard not run
- D6 9: Not compared
- D7 8: Not walked
- D8 7: F-035 Centre spelling
- D9 8: Not walked
- D11 8: Manual not followed

**J17 Add and choose agents**
- D1 8: Not walked
- D2 8: Not walked
- D3 8: Not walked
- D4 8: Not walked
- D5 8: No axe violations; keyboard not run
- D6 9: Not compared
- D7 8: Not walked
- D8 7: F-039 command cut, F-035
- D9 7: F-039
- D11 8: Manual not followed

**J18 A2UI surfaces: inline, sidebar, window**
- D1 7: Not walked
- D2 7: Not walked
- D3 8: Not walked
- D4 8: Not walked
- D5 7: Not scanned
- D6 8: Not walked
- D7 7: Spoofing test not run
- D8 8: Not audited
- D9 8: Not walked
- D11 8: Manual not followed

**J19 Browse with the Browser**
- D1 7: F-001 a failed page is silent
- D2 8: F-021 blank new tab
- D3 8: Shortcuts not checked
- D4 6: F-001 no error page
- D5 6: F-026 tab strip, F-028 16 px tab close
- D6 9: Not compared
- D7 7: F-021 Protected Mode claim, cookie sharing not stated
- D8 8: F-021 fixed status text
- D9 5: F-001 Done after a failure
- D11 8: Manual not followed

**J20 Investigate a problem (Event Viewer, Task Manager)**
- D1 8: Empty states seen; filters not run
- D2 6: F-034 ACP, AG-UI, MCP
- D3 8: Not walked
- D4 8: End task not run
- D5 6: F-027 splitters
- D6 9: Not compared
- D7 8: Not walked
- D8 6: F-034, F-038
- D9 8: Not walked
- D11 8: Manual not followed

**J21 Keyboard-only operation**
- D1 6: Launcher F1 and Alt+N fail (F-010), splitters need keys (F-027)
- D2 7: Alt underlines appear only after Alt
- D3 7: F-010
- D4 8: UAC focus F-041
- D5 6: F-027, F-031, F-028
- D6 9: Not compared
- D8 8: Not audited
- D9 8: Not walked
- D11 7: F-010

**J22 First-time help and discoverability**
- D1 7: F1 and Help menu work in apps; not in the Launcher (F-010)
- D2 6: F-009, F-010, F-011
- D3 8: Search not timed
- D5 8: Help window no axe violations; keyboard not run fully
- D6 9: Not compared
- D8 5: F-009 test ids and spec text in Help, F-040
- D9 8: Search no-result not walked
- D11 6: F-009, F-010

**J23 Recover from errors**
- D1 6: F-001 offline Browser; agent crash not walked
- D2 7: Not walked
- D3 8: Not walked
- D4 6: F-001 no error page
- D5 7: Not scanned
- D6 9: Not compared
- D7 8: Not walked
- D8 7: Not audited
- D9 6: F-001
- D11 8: Manual not followed

**J24 Read code, git status and the gutter**
- D1 7: Code seen without a Git project
- D2 7: F-022
- D3 7: Not walked
- D4 8: Revert hunk not run
- D5 6: F-027, F-029, F-031
- D6 8: Not compared
- D7 8: Not walked
- D8 7: F-022 Logs & others
- D9 8: Not walked
- D11 8: Manual not followed

**J25 Review the agent's changes in Code Review**
- D1 6: F-002 clipped toolbar, F-012 comments hidden at open
- D2 7: F-037 U and M, HEAD
- D3 8: Not timed
- D4 9: Errors (bad ref, no repository) not walked
- D5 6: F-026, F-029, F-028
- D6 6: F-002, F-003 layout, F-036 menu name
- D7 7: F-007 raw tool names; reviewer is a scripted agent
- D8 6: F-007, F-037
- D9 7: F-012, F-042; no error state walked
- D11 8: Manual not followed

**J26 Send review comments to a chat, and comment yourself**
- D1 6: F-003 panel clipped; own comment not run
- D2 7: F-015 chat naming
- D3 8: Send all is 3 actions (minimum)
- D4 8: Delete and Resolve not run
- D5 7: F-026, F-029
- D6 6: F-002, F-003
- D7 8: Not walked
- D8 7: F-015, F-016
- D9 7: F-017 sent comments struck through
- D11 8: Manual not followed

**J27 Ask the chat pane about what you are looking at**
- D1 8: Explain this works and the pane answers
- D2 6: F-019, F-020 pane is hard to find
- D3 8: Not timed
- D4 9: Estimate, see notes
- D5 6: F-027 resizer, F-028 edge strip 12 px
- D6 7: F-008 squeezed Code
- D7 7: Pane agent permissions not walked
- D8 7: F-018, F-033
- D9 7: F-018 Disconnected before the first message, F-043
- D11 8: Manual not followed

**J28 Let the agent use a web app in the Browser**
- D1 7: F-004 the answer is below the fold; Take control works at the top bar
- D2 7: F-006 the bar is transient
- D3 8: Not timed
- D4 7: Take control then Deny loop (F-005)
- D5 7: F-026, F-028
- D6 8: Window stacking hides the Browser (F-006)
- D7 6: F-005, F-006; cookie sharing not stated
- D8 5: F-005 raw JSON in a dialog title, F-007
- D9 6: F-004, F-006
- D11 8: Manual not followed

**J29 Browse with tabs and recover from a bad page**
- D1 6: F-001 failed page is silent; tabs work (e2e)
- D2 8: F-021
- D3 8: Ctrl+T and Ctrl+W not checked
- D4 6: F-001
- D5 6: F-026, F-028
- D6 9: Not compared
- D7 7: F-021
- D8 8: F-021 fixed status text
- D9 5: F-001, F-021
- D11 8: Manual not followed

**J30 Use menus, right-click and About in any app**
- D1 8: Right-click and About work; Shift+F10 not tried
- D2 7: F-019 four chat items
- D3 8: Not timed
- D4 9: Estimate, see notes
- D5 7: F-028 menu bar 22 px
- D6 7: F-013 About close button
- D7 8: Not walked
- D8 6: F-014 wrong version, F-019, F-024
- D9 8: Not walked
- D11 8: Manual not followed

**J31 Get help from inside an app (Help menu and F1)**
- D1 8: F1 and Help > View Help work; Back and Forward not run
- D2 8: Not walked without hints
- D3 9: Estimate, see notes
- D5 8: Help window clean in axe; keyboard not run fully
- D6 9: Not compared
- D8 5: F-009 test ids in text, F-040
- D9 8: Search no-result not walked
- D11 6: F-009, no procedure run word for word

## Calibration

Not yet done. See "Reviewer calibration" in `rubric.md`. J06 is the proposed calibration journey: the expert scores above are the first of the two blind scores.

## Sprint status

| Item | State |
|---|---|
| Discovery documents | Written. Journeys J25 to J31 and tasks T25.1 to T31.2 added for Code Review, the chat pane, the Browser with web apps, menus and About, and in-app Help. |
| Findings log (`findings.md`) | Created: 48 findings (5 major, 26 minor, 17 cosmetic, none catastrophic). |
| Journey specs (`e2e/journeys/`) | Not yet written |
| Evidence (`docs/ux/evidence/expert/`) | Screenshots of severity 2 and 3 findings and `axe.json` |
| Panel start states for J25 to J31 | `scripts/ux-panel/presets/features.mjs`, all 11 start states come up |
| Journeys at 10/10 | 0 of 31 |
