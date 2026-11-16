# Panel round 1: synthesis

Lead UX researcher. Source: `docs/ux/panel/r1/*.md` (records), `findings.md` (F-001 to F-048), the checkers in `scripts/ux-panel/`. Next step: `docs/ux/FIX-BACKLOG.md`.

## Records missing or pending when read

Read last at the time shown by the newest record. Missing at that time:

- **novice T06.3**: no record (not written; treated as not run).
- **intermediate T17.2 to T24.2** (T17.2, T18.1 x3, T18.2, T19.1, T19.2, T20.1, T20.2, T21.1, T22.1, T22.2, T23.1, T23.2, T24.1, T24.2): pending, the batch is still running as the coordinator said. Four early files (`T17.2-sonnet.md`, `T18.1-*-sonnet.md`) exist under another name and were not used. Cells show "pending" and are left out of every rate.
- expert T01.1 to T09.1 and novice T17.2 to T24.2: complete, all read (the expert T08.2 and T09.1 and novice T23.x and T24.x records arrived during the work and are included).

Rows are tasks of `tasks.md` J01 to J24 (round 1 scope; T25 to T31 were not in the panel batch). T18.1 has three variants.

## 1. Results matrix

Cell = verdict, steps used / budget. `†` = researcher decision overrides the checker verdict (reasons in section 2). `at limit` = zero steps of slack. **OVER** = budget exceeded. INVALID (harness) = the start state or checker made the run meaningless; it is not counted as a pass and is rerun after the harness fix.

| Task | Novice (Haiku) | Intermediate (Sonnet) | Expert (Opus) |
|---|---|---|---|
| T01.1 | PASS 3/3 at limit | PASS 3/3 at limit | PASS 3/3 at limit |
| T02.1 | PASS 6/18 | PASS 7/18 | PASS 11/18 |
| T02.2 | PASS† 8/21 | PASS† 8/21 | PASS† 9/21 |
| T03.1 | FAIL 14/15 | PASS 5/15 | PASS 3/15 |
| T04.1 | FAIL 6/12 | PASS 5/12 | PASS 4/12 |
| T04.2 | PASS 1/9 | PASS 1/9 | PASS 1/9 |
| T05.1 | PASS 4/9 | PASS 4/9 | PASS 4/9 |
| T05.2 | PASS 1/3 | PASS 1/3 | PASS 1/3 |
| T06.1 | PASS 1/6 | PASS 1/6 | PASS 1/6 |
| T06.2 | PASS 1/3 | PASS 1/3 | PASS 2/3 |
| T06.3 | no record | PASS 9/18 | PASS 13/18 |
| T07.1 | PASS 2/15 | PASS 3/15 | PASS 3/15 |
| T08.1 | PASS 4/15 | PASS 4/15 | PASS 4/15 |
| T08.2 | PASS† 2/18 | PASS 6/18 | PASS 16/18 |
| T09.1 | PASS 4/12 | PASS 3/12 | PASS 3/12 |
| T10.1 | FAIL 4/4 at limit | FAIL 4/4 at limit | PASS† 1/4 |
| T10.2 | PASS 0/3 | PASS 0/3 | PASS 0/3 |
| T11.1 | FAIL 1/3 | PASS 1/3 | PASS 1/3 |
| T11.2 | FAIL 9/9 at limit | FAIL 8/9 | FAIL 9/9 at limit |
| T11.3 | PASS 4/9 | PASS 4/9 | PASS 4/9 |
| T12.1 | FAIL 6/6 at limit | FAIL 6/6 at limit | PASS 5/6 |
| T12.2 | INVALID (harness)† 5/18 | INVALID (harness)† 16/18 | INVALID (harness)† 14/18 |
| T13.1 | PASS† 3/9 | PASS† 2/9 | PASS† 2/9 |
| T13.2 | PASS 2/12 | PASS 2/12 | PASS 2/12 |
| T14.1 | PASS† 2/6 | PASS† 1/6 | PASS† 1/6 |
| T14.2 | PASS 4/9 | PASS 4/9 | PASS 3/9 |
| T15.1 | PASS† 3/9 | PASS 3/9 | PASS 2/9 |
| T16.1 | PASS 5/15 | PASS 6/15 | PASS 7/15 |
| T16.2 | PASS 2/12 | PASS 3/12 | PASS 4/12 |
| T17.1 | PASS 10/24 | PASS 10/24 | PASS 10/24 |
| T17.2 | FAIL 10/12 | pending | PASS 8/9 |
| T18.1-inline | PASS 4/12 | pending | PASS 4/9 |
| T18.1-sidebar | PASS† 10/12 | pending | PASS 4/9 |
| T18.1-window | PASS 3/12 | pending | PASS 3/9 |
| T18.2 | PASS 1/8 | pending | PASS 1/6 |
| T19.1 | FAIL 10/16 | pending | PASS† 7/12 |
| T19.2 | PASS 9/12 | pending | PASS 5/9 |
| T20.1 | PASS 5/20 | pending | PASS 5/15 |
| T20.2 | PASS 7/16 | pending | PASS 5/12 |
| T21.1 | FAIL 19/48 | pending | FAIL 33/36 |
| T22.1 | FAIL 9/8 **OVER +1** | pending | PASS 6/6 at limit |
| T22.2 | PASS† 7/16 | pending | PASS† 7/12 |
| T23.1 | PASS 3/16 | pending | PASS 4/12 |
| T23.2 | PASS 7/12 | pending | PASS 8/9 |
| T24.1 | PASS 6/20 | pending | PASS 10/15 |
| T24.2 | PASS 1/16 | pending | PASS 2/12 |

### Totals after researcher decisions

| Level | Records read | PASS | FAIL | INVALID | Pass rate (INVALID counts as not passed) | Pass rate (INVALID excluded) | Raw checker PASS (before decisions) | Median SEQ |
|---|---|---|---|---|---|---|---|---|
| Novice | 45 | 34 | 10 | 1 | **76%** | 77% | 27 of 45 (60%) | 4 |
| Intermediate (T01.1 to T17.1 only) | 30 | 26 | 3 | 1 | **87%** | 90% | 23 of 30 (77%) | 6 |
| Expert | 46 | 43 | 2 | 1 | **93%** | 96% | 37 of 46 (80%) | 6 |

Release gate (process.md): every task passed by all three levels, median SEQ at least 6 at every level. Round 1 is far from it: the novice median SEQ is 4, and 12 of 46 task rows have at least one FAIL or INVALID. Failing rows: T03.1, T04.1, T10.1, T11.1, T11.2, T12.1, T12.2 (invalid), T17.2, T19.1, T21.1, T22.1. "At limit" cells (T01.1, T10.1, T11.2, T12.1, T22.1) show budgets with no margin; for J10 and J11 the budget is lower than any valid alternative route (see H-03, H-12).

Weak passes to remember: T06.1 (all three: nobody opened details, the diff is inline, so "read it first" rests on the preview text), T08.2 expert (16 of 18 steps), T21.1 and T22.1 (near-misses), T02.1 and T04.1 (pass despite the silent Chats dead end).

## 2. Researcher decisions

### 2.1 Every MANUAL

| Cell | Checker said | Decision | Reason |
|---|---|---|---|
| T02.2 novice, intermediate, expert | MANUAL: state ok | **PASS** x3 | See 2.2 (T02.2). |
| T14.1 intermediate, novice | MANUAL | **PASS** x2 | See 2.2 (T14.1). |
| T15.1 novice | MANUAL | **PASS** | The answer says C: files, chats, notes and logs are lost; login-app is only ejected, not deleted. That matches the delete dialog and the fixture (folder intact, confirmed by the state check). Friction: "ejected" is jargon (UX-05, UX-12). |
| T18.1-sidebar novice | MANUAL | **PASS** | The agent received `name = Nia`; the answer "hello Nia" matches the agent reply. The form was submitted three times because the side panel gives no feedback after Send; that is a product finding (TH-10), not a task failure. It used 10 of 12 steps because of the extra clicks. |

### 2.2 Disputed checker verdicts

- **T02.2 renamed desktop (all levels): PASS.** The scenario asks for the same name and the product refuses duplicates by design, so the task tests whether the user recovers and understands the refusal. All three created a second valid desktop with docs-site and quoted the message "A desktop named 'Fix login redirect' already exists." The checker is wrong to stay MANUAL: it passes `undefined` to `withAnswer` and never reads `--answer` (H-01). Product finding stays: the message appears only after Create, gives no suggestion, never says why names must differ (TH-07).
- **T08.2 novice: PASS.** The answer "5 files; README changed most (+7 -1)" is correct. "README" was shown truncated ("E:\README....") and the panelist could not know the extension. The checker needs the literal `README.md` (H-02). A user cannot be blamed for a name the product cuts off; the truncation is the finding (TH-05). Caveat: the novice stopped after 2 steps and read the +/- column only, so "look at every line" was not tested.
- **T10.1 expert: PASS.** State met (no Terminal window, no Terminal chip) and the answer named the "Agent can use" line of the Workspace bar. The keyword group `chip|top bar|tools` does not contain the words the screen uses (H-03). **T10.1 novice and intermediate stay FAIL**: state not met. The intermediate found Terminal = Ask but stopped; Ask is not "cannot run commands". Both ran out of the 4-step budget while searching Control Center. Note the budget (4) cannot hold the valid alternative route (Control Center > Permissions > Terminal = Deny > Apply is 6 or more steps), so the budget is part of the problem (H-03).
- **T13.1 (all levels): PASS.** The checker compares `entries.length` with `messagesAtStart`, but the long job updates one progress row in place (the text grew from "Progress 1 of 30" to "7 of 30"). The screenshots of all three show new progress and the launcher/Workspace bar still said Working, so the agent kept running. "Close this window" is ambiguous (chat window or desktop window); both readings keep the job alive and both are valid. The researcher note "reopened from the launcher" is not a requirement of the task text. The ambiguity is a product finding (TH-03, TH-13).
- **T14.1 (all levels): PASS.** The task text asks only to find the waiting workspace and open it. All three connected "Fix login redirect" (the one with "Needs your approval (1)"). The checker also wants the answer to name "Docs site", but the scenario never asks about an error (tasks.md success check has a requirement the scenario does not state). Preset detail: "Docs site" is the broken-agent desktop, and the launcher shows it as Idle, so no user could name it from the screen. That is a real product gap (TH-04, UX-06) and a harness defect (H-05).
- **T15.1 novice: PASS** (see 2.1). Checker only searches for "chat" (H-06).
- **T22.2 expert and novice: PASS.** F1 opens the Help viewer ("Chat Help") with the same topic list and search as Help and Support; the topic "Using Chat" with the Tasks and Changes section was open, and both gave the correct steps (Tasks and changes > Changes > select > Revert). The checker looks for the literal text "help and support" in a window and is not stable (T22.1 expert passed on the same kind of window, T22.2 failed; H-07). The naming of the F1 window ("Chat Help") is a product finding: the novice did not know whether to look for another program (TH-09, UX-45).
- **T19.1 expert: PASS (researcher). Novice: FAIL.** The scenario says example.com; the checker demands `127.0.0.1:4173`; the facilitator note to tell the panelist the address was skipped; the sandbox has no network, so https://example.com stays blank. The expert did everything the scenario asks: opened the Browser, typed the address, saw the Browser chip appear under "Agent can use" and concluded the assistant can see it. The novice opened the Browser, then went to Chats and asked the assistant to read the page, got an unrelated write prompt from the `demo` script (H-08), and ended believing it had not worked ("I cannot tell whether it read anything"). It did not understand the chip, so the intent (know that the assistant can read it) was not met. Port clash: not the cause. `server.mjs` swallows the bind error, so a second session reuses the first session's server; the real hazard is that when the session that owns port 4173 stops, the page disappears for the others (H-08). The blank page itself is F-001/F-021.
- **T23.2 expert: PASS; start state invalid.** The preset (`chat-open` with `flaky`) injects the error on the first send but shows nothing at start, so the expert had to type and send first (3 extra steps) and could then recover by copying the failed bubble. The recovery is valid, but the cost and the experience are not what the scenario says ("you were typing and an error says it could not send"). The novice has the same experience and also passes. Rerun with a start state that already shows the error and the draft (H-09). Product finding: the composer is cleared on failed send, the failed bubble looks sent, Copy message copies the "You" label (TH-06).
- **T18.1 variants (inline, sidebar, window): verdicts valid.** `session.mjs task` and `start` look up `T18.1-inline` in `tasks.md` and print "task not found", so no scenario text was printed. The checker strips the suffix; the printer does not (H-10). Panelists used the text of base T18.1 (printed by a throwaway start), which is the same text, so results stand, but the facilitator did not hand over the scenario as the rules require. Budgets applied correctly.
- **T12.2 (all three): INVALID (harness).** The panelists clicked "Plug in a project..." five times in total over three runs and saw nothing. Cause: `eject-mid-job` never calls `answerFolderPicker`, so the real Electron `dialog.showOpenDialog` opened as an OS window outside the Playwright page and was never in a screenshot (Xvfb without screenshots of OS windows). The "no response" is a harness artefact for this task. Product decision: see UX-01. The in-app finding is still real: while any picker is open the desktop gives no sign of a pending modal dialog, and a real user on a virtual or remote display could lose the native dialog behind the window. The answer part (the assistant said "Drive E: is not plugged in on this desktop") was found by all three.
- **T11.2 (all FAIL): stands.** The expert and the others set some permissions to Ask. That does not meet "approve every single thing, even reading" (13 other rows still Allow), and nobody tried Take control. The checker also demands a prompt that the scenario never asks for (H-12); it does not change the verdict because userInControl was false and no alternative "all Ask" state was reached.
- **T22.1 novice: FAIL stands** (9 of 8 steps), but it is a near miss with a correct answer. The cause is product: no tooltip, Command Bar section does not say what the button does (UX-45).
- **T12.1 intermediate, novice: FAIL stands.** Neither found Eject in time. Expert took 5 of 6 steps. Nobody used the USB tray icon that the task's Min assumes (tray icon, eject item). Validated as a discoverability failure (TH-01).
- **T04.1 novice: FAIL stands.** It opened the Chats icon (starts in `C:\Users\Agent`), then Ask chat... (pane, "Disconnected"), then stopped. The state check is right.
- **T17.2 novice: FAIL stands.** The answer did not name the command or "not found"; the panelist could not find the cause because the app shows no error (TH-04).
- **T21.1 expert, novice: FAIL stands.** The Tab order never enters the chat and focus is not placed in the composer. Reproduced by both. Not a harness effect: keys went to the page, the Start menu worked by keyboard, the composer remained unfocused.

## 3. Affinity map

Each theme: what happened, tasks and levels, finding ids, root cause. TH ids are used by the backlog.

### TH-01 Projects: adding and removing is invisible
- Plug in a project gave no response in three runs (harness, but see TH-12); "Browse..." picks a folder without a visible picker (stubbed); no way to add a folder from Code (File menu, Tools are dead ends); the project tree right-click on a drive shows Cut/Copy/Paste, not Eject; Eject only in Computer; the USB tray route unused; "Plugged-in project", "USB drives", "ejected" are jargon.
- Tasks: T03.1 (novice FAIL, intermediate 2 dead ends), T12.1 (intermediate, novice FAIL, expert dead end), T12.2 (all, invalid), T02.1 (all), T15.1 novice, T02.2.
- Findings: F-045, F-046 (USB metaphor), new.
- Root cause: project lifecycle lives only in Computer/Explorer and the tray; the Code window shows the project but offers editor menus; the picker is native.

### TH-02 Permissions page is unusable at default size
- Window 640x460, rows tall, "What it covers" wrapped or off screen, two rows visible, no "set all", Terminal vs "Running commands", no Apply confirmation, chips do not show Ask.
- Tasks: T06.3 (intermediate, expert 9 and 13 steps), T10.1 (novice, intermediate), T11.2 (all), T16.1 (all, 5-7 steps), T16.2 (all, answer needed reading three rows), T17.1 (agents page: command truncated, no hint, name required).
- Findings: F-039, new.
- Root cause: table of 14 rows built for a larger window; no grouping of "what the agent may do" and "apps"; no state feedback.

### TH-03 Stop, Pause, Resume and Take control are not understood
- Stop vs Pause not explained (T11.1 novice FAIL); Resume does not resume (T11.3 all typed a follow-up); Take control reads as "take over the mouse" (T11.2 all skipped it); Mode dropdown (Default/Plan) was the first place all three looked; chat Stop looks like it stops the program (T20.2); "close this window" ambiguity and the chat X hidden behind the Workspace bar (T13.1).
- Tasks: T05.2, T10.1, T11.1, T11.2, T11.3, T13.1, T20.2.
- Findings: F-005, F-006.
- Root cause: four controls (chat Stop, bar Pause, bar Take control, Task Manager End process) with overlapping meaning and no state text.

### TH-04 Silent failures
- Blank Browser page with "Done" (T19.1, T19.2); a broken agent's New chat does nothing (T02.1 default Claude Code agent offline, T17.2 all); the launcher shows Idle for an agent that cannot start (T14.1); "ACP connection closed" without Retry (T23.1, T20.2); failed send clears the composer (T23.2); "Review changes" silently starts an agent (T24.1, T08.2); Plug in gives no feedback (T12.2).
- Tasks: T02.1, T14.1, T17.2, T19.1, T19.2, T20.2, T23.1, T23.2, T24.1, T08.2.
- Findings: F-001, F-021, new.
- Root cause: errors are swallowed at the IPC boundary or shown as raw protocol text; no shared error pattern (what happened, why, what to do).

### TH-05 Truncated names and cramped panes
- Changes list names cut ("E:\src\auth\lo..."), permission diff clipped on the right, Event Viewer opens small, Recycle Bin Chat column cut, diff preview one line tall, Control Center needs maximizing, Add Agent dialog tight.
- Tasks: T05.1, T06.1, T08.1, T08.2 (novice answer), T09.1, T10.1, T20.1, T17.1, T06.3.
- Findings: F-002, F-003, F-008, F-038, F-039.
- Root cause: fixed column widths, no tooltips, default window sizes too small, no wrap.

### TH-06 Approval and error dialogs speak jargon and hide facts
- Diff shows `@@ -0,0 +1,5 @@` for a file that exists; the policy note is glued to the command; a denied command shows red "Failed" beside a green "Done" card; two identical Action Center rows; raw tool names and JSON in titles; Allow/Deny look like links; "Got action send from send on notes".
- Tasks: T05.1, T06.1, T06.2, T07.1, T13.2, T18.1, T23.1.
- Findings: F-005, F-007, F-023, F-041.
- Root cause: UI strings built from tool calls, no plain-language mapping, no true before/after.

### TH-07 Launcher: what is a desktop, duplicate names, status
- Empty text does not say what a desktop is; duplicate name error only after Create; amber "Needs your approval" easy to miss; error desktop shows Idle; Connect leaves the launcher in front; list order changed after rename; F1 does nothing.
- Tasks: T01.1 (all), T02.2 (all), T14.1 (all), T14.2 novice, T13.2 novice.
- Findings: F-010, F-011, F-032.
- Root cause: launcher lags the desktop in polish and has no error state.

### TH-08 Chat entry points and folder scope
- Chats icon opens "New session" in `C:\Users\Agent`; Code tree "Ask chat..." opens a pane that says "Disconnected"; Start > New chat on a drive preselects C:; Chats icon needs a double-click and does nothing visible when the agent cannot start; "Ask chat...", "Ask chat about this...", "Start a chat here" all exist; reopened chat gives no hint.
- Tasks: T02.1, T04.1 (novice FAIL, intermediate detour), T04.2, T17.2, T21.1.
- Findings: F-016, F-018, F-019, F-020, F-033.
- Root cause: two creation paths with different default folders and unscoped names.

### TH-09 Help does not help
- Table of contents links dead; search results no highlight; "Troubleshooting" unreachable; test ids and internal names in tables; F1 window called "Chat Help"; no tooltip for toolbar buttons; no keyboard topic; Help search finds nothing for "page stays blank" or "no answer".
- Tasks: T03.1 novice, T12.2, T17.2 novice, T19.2 novice, T21.1, T22.1, T22.2.
- Findings: F-009, F-040.
- Root cause: Help app renders manuals as raw markdown tables; no anchors; per-app titles.

### TH-10 No feedback after an action
- Apply, Restore, Resume, Connect, rename, reopened chat, A2UI Send (triple submit), recycled change not reflected in the changes list, tray badge not understood.
- Tasks: T01.1, T04.2, T06.3, T09.1 (all), T11.3, T14.2, T18.1 sidebar and inline, T13.2.
- Findings: F-004, F-006.
- Root cause: state changes are real but not echoed where the user is looking.

### TH-11 Keyboard-only is blocked
- Composer not focused on open, composer disabled while connecting ("Working", Send greyed), Tab never enters the active window, Alt+Tab does nothing, Start search keeps old text, Enter on the active window's taskbar button minimizes, invisible focus ring, form below fold.
- Tasks: T21.1 (both FAIL), T18.1 inline (scroll).
- Findings: F-010, F-025 to F-028, F-041.
- Root cause: focus management for new windows and for the shell is missing; no region cycling.

### TH-12 Native dialog outside the virtual desktop
- Folder picker stubbed in some presets only; in others the OS dialog is invisible to the driver; "Browse picks silently" in stubbed runs.
- Tasks: T12.2, T02.1, T02.2, T03.1.
- Root cause: `ElectronFolderPicker` uses `dialog.showOpenDialog` on the focused window; the product has no in-app folder browser.

### TH-13 Window management
- Workspace bar covers chat title buttons; two chat windows overlap and look identical; launcher stays in front after Connect; windows cover gadgets; Control Center and Event Viewer open too small.
- Tasks: T01.1, T05.2, T07.1, T13.1, T13.2, T20.1.
- Root cause: cascade logic ignores the bar; no raise on Connect; same titles.

### TH-14 Git, diff and Code Review are scattered
- Three places for "what changed" (chat Tasks and changes, Code Agent changes, Code Management > Changes) plus Git; Git list double-click opens the file, not the diff; gutter bars with no tooltip; Review changes starts an agent and a write prompt that stays on screen; "Next" steps hunks; no one-page diff; Code Review layout at default size.
- Tasks: T08.1, T08.2, T24.1, T24.2, T09.1.
- Findings: F-002, F-003, F-012, F-015, F-017, F-022, F-036, F-037.
- Root cause: features grown separately.

### TH-15 Terminology
- ACP, session, tool names, "Workspace" bar vs "desktop", Control Center vs Action Center, "Plugged-in project", "USB drives", "Terminal" vs "Running commands", "surface" and "Tool said: ok" (scripted agent text).
- Tasks: T01.1, T02.1, T14.2, T15.1, T17.1, T17.2, T18.1, T20.1, T23.1.
- Findings: F-007, F-016, F-033, F-034, F-035.
- Root cause: no enforced vocabulary table in the UI strings. Note: the bar title "Workspace" in the records is the preset's default title, so part of that naming issue is a harness artefact (H-17).

### TH-16 Accessibility gaps not hit by the panel
- axe issues, target sizes, contrast; confirmed indirectly by T21.1.
- Findings: F-025 to F-031, F-044.

### TH-17 Off-task agent prompts (harness plus product)
- Review changes and a chat about a web page raise a "write SCRIPTED.md" or "write login.ts" request; the box stays after Deny; the status bar showed `{{tests.exitCode}}`.
- Tasks: T19.1 novice, T24.1 (both), T08.2 expert.
- Root cause: the `demo` script is the default reviewer/agent; product still must not start an agent for a read-only "Review changes", and a Deny must close the request.

## 4. Harness and checker defects

Fixes to `scripts/ux-panel`, `docs/ux/tasks.md` and the facilitator process. Not product work.

| id | Where | Defect | Fix |
|---|---|---|---|
| H-01 | `checks/launch.mjs` T02.2 | `withAnswer(..., undefined, ...)` ignores `--answer`; always MANUAL | Pass `answer`; keywords `[['already','exists','used','same','different','unique']]` |
| H-02 | `checks/changes.mjs` T08.2 | Needs literal `README.md`; truncated UI produces "README" | Accept basename with or without extension; also accept "five" |
| H-03 | `checks/desktop.mjs` T10.1; `tasks.md` | Keywords `chip|top bar|tools` miss "Workspace bar", "Agent can use"; only the closing-Terminal route passes; budget 4 | Add `workspace bar`, `agent can use`, `closed`; also pass when policy Terminal = Deny; budget 8 / 10 for the Permissions route (Min 1 for the shortest route stays) |
| H-04 | `checks/desktop.mjs` T13.1 | Counts rows; progress mutates one row; "reopened from launcher" note too strict | Compare the last progress number (`of 30`) or tool_call update count; accept chat-window close or desktop disconnect; record `runState` working at reconnect |
| H-05 | `tasks.md` T14.1, `checks/desktop.mjs`, `presets/desktops.mjs` | Success check needs the error desktop's name; scenario never asks | Drop the answer check, or change the scenario to "...and tell me which workspace has a problem" (only after the launcher can show an error, UX-06). Row preselection: record that the waiting row was preselected |
| H-06 | `checks/desktop.mjs` T15.1 | Keyword group only `chat` | Require `chat` and one of `c:|drive|notes|logs` and one of `stay|kept|remain|ejected|not deleted` |
| H-07 | `checks/settings.mjs` T22.1/T22.2 | `helpText` searches innerText for "help and support"; F1 opens "Chat Help" | Detect a window with app `help` or `[data-testid=help-article]` and its `data-topic` (as T31 does) |
| H-08 | `tasks.mjs`, `checks/desktop.mjs` T19.1, `server.mjs`, `lib/fixtures.mjs` | Scenario says example.com; checker needs 127.0.0.1:4173; the facilitator note is not given to panelists; no network; preset uses `demo`; fixed port 4173 shared, the page vanishes when the owning session stops | Put the address in the scenario ("http://127.0.0.1:4173/"); use the `browser-agent` script; choose a free port per session (`TEST_PAGE_PORT` from session) |
| H-09 | `presets/chat.mjs` T23.2, `checks/features.mjs` | `flaky` injects on the first send; no visible start state; checker accepts text with the "You" prefix | Preset sends one message first so the error is on screen and the draft is in the composer (if the product keeps drafts); checker compares the message text exactly |
| H-10 | `session.mjs` `taskLines` | `tasks[task]` is not stripped of `-inline|-sidebar|-window`; prints "task not found" | Use the base id as `check()` does |
| H-11 | `presets/chat.mjs`, `presets/*`, `lib/context.mjs` | Only 3 presets call `answerFolderPicker`; the stub also replaces the file picker (Attach) with a folder path; stubbed runs hide the picker | After UX-01, drive the in-app Browse For Folder dialog instead of the stub, and keep a stub only for the native fallback; add the stub to `eject-mid-job` until then |
| H-12 | `checks/chat.mjs` T11.2, `tasks.md` | Requires a prompt and a raised request; the scenario asks for neither; alternative (all rows Ask) not accepted | Check `userInControl` or all policy groups = ask; make the prompt a separate optional check |
| H-13 | `tasks.md` T06.1 | Min 2 "Show details, Allow" and "details opened" check: the diff is inline | Min 1; criterion "names the changed lines" |
| H-14 | `checks/features.mjs` T24.1, `tasks.md` | Line not checked; "which line" singular, diff shows lines 1, 3, 4 | Scenario "which lines"; keywords `redirect.ts`, `login.ts`, `session.ts`, and `3` |
| H-15 | `tasks.md` T22.1, T10.2 | Min "1 + read" vs budget 6 / 8; T10.2 Min 1 but the answer takes 0 | Set Min 2 for T22.1; write Min 0 for look-only tasks |
| H-16 | `presets/*` `empty-folder-picker` | No scripted agent as default: the default Claude Code agent cannot start offline, so T02.1 hits a dead end unrelated to the task | Set the Scripted Agent as default in every preset except T17.2 and T02.1-agent variants |
| H-17 | `presets/base.mjs`, `presets/desktops.mjs` | Default desktop title "Workspace" (the bar shows "Workspace"); `three-desktops` gives 'Fix login redirect' the docs-site project | Use realistic names and the matching project |
| H-18 | `checks/advanced.mjs` T17.2 | Always passes state; "did not restart" and "points to Agents page" unchecked; keyword `command` matches anything | Require `not-a-real-command` or `not found`; check app pid unchanged |
| H-19 | `checks/advanced.mjs` T16.2, `checks/chat.mjs` T05.1, T12.2, T19.2 | Weak keywords (`no`, `not`, `drive`, `connect`, `redirect.ts`) match almost any answer | Use phrase patterns from `expect`; keep MANUAL for T16.2 |
| H-20 | scripted agent (`agents/scripted-agent`) | `demo` asks to write SCRIPTED.md for unrelated prompts; status text `{{tests.exitCode}}` leaks; "Got action send from send on notes" is agent text | Per-task scripts (`browser-agent`, `review` reviewer that does not write); fix the template variable; neutral A2UI replies |
| H-21 | `PANELIST.md` / `FACILITATOR.md` | Panelists stop early (T08.2 novice after 2 steps, T11.1 novice left Pause unpressed, T04.1 stopped after one look); scenario not delivered for variants; facilitator notes not forwarded | Add "finish the whole scenario" and a rule that facilitator notes become part of the scenario text |
| H-22 | `session.mjs` check | Budget FAIL overrides a correct answer without a "near miss" note (T22.1 +1) | Print "within +25 percent: review" so the researcher can flag a near miss |
