# Agent7 UX Scoring Rubric

Status: discovery. Used by `process.md` to score every journey in `journeys.md` on eleven dimensions. Results go in `scorecard.md`. Problems go in `findings.md`.

## Rules for scoring

1. Score each journey on each dimension, from 1 to 10, as whole numbers. Score the hardest persona for that journey (see `personas.md`).
2. Score what the built app does, not what the design says. Evidence is a Playwright run, a screenshot, a measured value or a quoted line of text. A score without evidence is invalid.
3. **10/10 is strict.** A cell scores 10 only if there are zero known issues on that dimension for that journey, and the evidence is linked. If you find one issue, the score is at most 9. Do not round up.
4. Use the anchors below. A score between two anchors is allowed (5, 6, 8, 9). Pick the lower anchor if you are unsure.
5. The cap rule overrides the anchors. The highest score a cell can have follows the worst open finding on that dimension and journey:

| Worst open finding | Maximum score |
|---|---|
| S1 | 3 |
| S2 | 6 |
| S3 | 8 |
| S4 (accepted) | 10 |
| S4 (not yet accepted) | 9 |

6. A journey is **10/10 overall** only when all eleven dimension cells are 10. That requires zero open S1, S2 and S3 findings, and every S4 finding consciously accepted with a written reason in `findings.md`.
7. The reviewer who scores a cell is not the person who fixed the findings in it (see `process.md`).

## Severity scale

| Level | Name | Definition | Examples | Release rule |
|---|---|---|---|---|
| S1 | Blocker | The user cannot finish the journey, loses data, or the agent does something the user did not allow. | Revert deletes the wrong file. Deny does not deny. The chat cannot start and shows no message. Keyboard users cannot answer a permission request. | Must fix before release. |
| S2 | Major | The user finishes only with help or after a long detour, or a wrong choice is likely and costly. | Allow is the default button on a destructive request. A failed agent start shows no cause. The Action Center and the UAC dialog name the same action differently. | Must fix before release. |
| S3 | Minor | The user finishes, with friction, doubt or a repeated mistake. | Missing focus ring on one control. Contrast 3.8:1 on a label. Vague empty-state text. A tooltip missing on a chip. | Must fix before release (the bar is 10/10). |
| S4 | Cosmetic | No effect on task success. Polish only. | A 1 px misalignment. A gradient that differs slightly from Windows 7. | Fix, or accept with a reason. |

An S4 can be accepted only if the reason says why it does not matter to any persona, for example "Matches Windows 7 behavior exactly". "No time" is not a reason. A finding that blocks accessibility conformance (WCAG A or AA failure) is at least S3.

## Dimensions

Each dimension has anchors at 4, 7 and 10. Use the evidence column to know what to bring.

### D1 - Usability (task success without help)

Question: can the persona finish the journey on the first try with no help?

| Score | Anchor |
|---|---|
| 4 | Fewer than half of the test runs succeed without help. The user must guess a hidden control, or an error blocks a main step. |
| 7 | Most runs succeed. One step needs a retry or a wrong turn, and the user recovers alone. No data loss. |
| 10 | Every cognitive-walkthrough step passes: the user sees the control, knows it is the right one, and sees the result. The Playwright journey spec passes without a shortcut and without setup calls for the steps that the user does. |

Evidence: walkthrough table (4 questions per step), journey spec, screenshots per step.

### D2 - Learnability (first-time discoverability)

Question: does a first-time user find and understand each step without reading documentation?

| Score | Anchor |
|---|---|
| 4 | The user must read the README to find a required control or word. Jargon (ACP, MCP, A2UI, tool group, turn) blocks understanding. |
| 7 | Controls are found by looking. Some words need a tooltip or a second look. Help exists (F1 or Start) but is not tied to the screen. |
| 10 | A Windows-literate newcomer (P4) completes the journey in the first session with no help. Every term is a Windows 7 term or is explained at first use in under ten words. F1 or the Help entry opens the right topic offline. |

Evidence: a P4 walkthrough, the list of terms on the screens, the help check.

### D3 - Efficiency (steps and keystrokes against the minimum)

Question: how many actions does the journey take, compared with the minimum possible?

| Score | Anchor |
|---|---|
| 4 | More than twice the minimum number of actions. No shortcut, no default, and repeated typing of known values. |
| 7 | Up to 1.5 times the minimum. Good defaults. Shortcuts exist for the main actions but not all. |
| 10 | The minimum number of actions, or one more with a stated reason. Defaults match the common choice. A shortcut exists for every frequent action and appears in the UI (menu text or tooltip). Time on task is within 10% of the reference run. |

Evidence: count of clicks and keys in the journey spec against a written minimum, and the shortcuts list.

### D4 - Error prevention and recovery

Question: does the design stop mistakes before they happen, and recover from those that do?

| Score | Anchor |
|---|---|
| 4 | A destructive action runs with no confirmation, or an error leaves the app in an unknown state. Errors say "failed" with no cause. |
| 7 | Destructive actions ask first. Errors name the cause. Recovery needs a manual step the error does not name. |
| 10 | Every destructive action is confirmed or undoable, with the safe choice as default. Every error injected by the test (see journey failure branches) names the cause and the next step in one click, with no data loss and no stuck state. Inputs are validated at the field, with the rule visible. |

Evidence: each failure branch of the journey, run and screenshotted.

### D5 - Accessibility (WCAG 2.2 AA)

Question: does the journey meet WCAG 2.2 level AA, with Windows 7 era conventions where they agree?

| Score | Anchor |
|---|---|
| 4 | Some controls cannot be reached or operated by keyboard. Focus is often invisible. Several controls lack names. Contrast fails often. |
| 7 | All controls work by keyboard. Focus is visible almost everywhere. Names and roles are right except in a few places. Contrast fails in at most a few places (3:1 or better). |
| 10 | All of: (a) every function works by keyboard in a logical order, with no trap (2.1.1, 2.1.2, 2.4.3); (b) focus is always visible, 3:1 against its surroundings (2.4.7, 2.4.11); (c) every control has a name, role and state, and dynamic changes are announced (4.1.2, 4.1.3); (d) text contrast at least 4.5:1, UI parts and graphics at least 3:1 (1.4.3, 1.4.11); (e) targets at least 24x24 CSS px or spaced (2.5.8); (f) no information by color alone (1.4.1); (g) animation stops with `prefers-reduced-motion` (2.3.3 and good practice); (h) text resizes to 200% without loss (1.4.4); (i) no drag-only action without an alternative (2.5.7); (j) the axe-core run has zero violations (or the manual checklist is clean, see `process.md`). |

Evidence: automated scan output, the manual checklist, a keyboard video or step list, measured contrast values.

Note on Windows 7 fidelity: where an authentic Windows 7 look fails WCAG (for example 12px gray text, 23px buttons that are smaller than 24px), accessibility wins. Record the conflict in `findings.md` and fix it in a way that still looks like Windows 7 (for example a darker gray, or spacing around the button).

### D6 - Visual consistency (Windows 7 Aero Basic fidelity)

Question: does the journey look like one Windows 7 program family, built from the kit?

| Score | Anchor |
|---|---|
| 4 | Mixed styles. Modern rounded cards, emoji or custom colors appear. Fonts and sizes vary. Controls are hand-made instead of kit parts. |
| 7 | Kit controls everywhere. Small spacing and alignment differences. A few colors that are not tokens. |
| 10 | Only kit components and `--w7-*` tokens (no new hard-coded reused colors). 12px Segoe UI (or the bundled fallback), 23px buttons, gradient faces, dotted focus rectangles. Spacing on one grid. Titles, icons and button order follow Windows 7 (Windows 7 dialog order: default action first). No emoji, no modern cards. Matches the reference screenshots in `docs/images/` and `docs/design/`. Dark and light OS settings do not change the Windows 7 look unexpectedly. |

Evidence: screenshots next to the reference, a token check, a Storybook story for each new control.

### D7 - Trust and transparency

Question: does the user always know what the agent is doing and what it can do? Are safe defaults in place?

| Score | Anchor |
|---|---|
| 4 | The agent can act without any visible sign. The user cannot tell which actions need permission. Defaults allow risky actions. |
| 7 | Visible agent actions and tools (top bar, chips, activity). Risky actions ask by default. Some actions (for example agent-opened windows, internal tools) show no sign. |
| 10 | Every agent action is observable on screen, in the Event Viewer, or both, and the screens agree with each other. The user can always see: what the agent can use now, what it is doing now, what it did, what it is waiting for, and how to stop it. Internal actions that the user cannot observe are listed in About, in plain words, with the limit that Agent7 cannot control the agent's own built-in tools. Defaults are safe: writes, commands and restores ask; destructive default buttons are the safe ones. The agent cannot mimic system UI (UAC, Action Center) in A2UI surfaces. |

Evidence: a traced "what did the agent do" walk for the journey, the wording of limits, an A2UI spoofing test.

### D8 - Content and copy

Question: is every word right, plain and consistent?

| Score | Anchor |
|---|---|
| 4 | Jargon, long sentences, error codes, mixed terms for one thing (chat, session, conversation). Typos. |
| 7 | Plain English. One term per thing in most places. Some dialog text is long or passive. |
| 10 | All text follows `docs/DOCUMENTATION_STYLE.md` (SimpleEnglish: imperative steps of 20 words or fewer, active voice, modals can/will/must only, no contractions, no semicolons or em dashes, the vocabulary table, American spelling) and the Windows 7 UX text guidelines (verb on the button, title bar names the window, error says what happened, why and what to do, no blame, no "please", no exclamation marks, sentence case for messages, title case for commands and window titles). Terms identical in UI, README, tooltips and tests. No lorem, no debug text. |

Known conflicts to check first: "Control Centre" and "Action Center" (spelling), "may" in the Permissions text, "Task Manager" versus the `agent-manager` kind, "Workspace" versus "project", "session" versus "chat".

Evidence: copy audit table (string, location, rule, fix).

### D9 - Feedback and state

Question: does each action get a response, and does every screen have all its states?

| Score | Anchor |
|---|---|
| 4 | Actions with no visible response. Blank panes when empty. No loading sign. Errors only in the console. |
| 7 | Loading, success and error exist for the main steps. Some empty states are blank or vague. |
| 10 | For each screen of the journey, all states are designed and screenshotted: empty, loading (with the reason and the time that is typical), partial, success, error, disabled (with the reason), disconnected, paused. Every action has feedback within 100 ms (pressed look) and completion feedback. Status text matches the data (`data-status`, `data-state` agree with the words). Live changes are announced to assistive technology. |

Evidence: a state matrix per journey (screen x state) with a screenshot per cell, or "not applicable" with a reason.

### D10 - Performance perception

Question: does it feel immediate and smooth?

| Score | Anchor |
|---|---|
| 4 | Visible freezes (over 1 s) on common actions. Typing lags. Windows jank when dragged. |
| 7 | Common actions respond within 300 ms. Rare jank (one dropped frame burst) on large transcripts or many windows. |
| 10 | Measured, on the reference machine, with the numbers recorded in the evidence: input response under 100 ms; window open under 200 ms; launcher to interactive under 1.5 s warm; desktop connect under 2 s; scrolling and dragging at 60 fps with a 2,000-row transcript and 6 windows; no main-thread task over 50 ms during streaming; agent start shows progress at once; memory stable over a 30-minute run. Long work always shows progress. |

Evidence: `performance.now()` marks or Playwright traces with the measured values, the machine description.

### D11 - Documentation (manual completeness, accuracy, findability)

Question: does every app have a Microsoft-style manual in `docs/help/<app>.md`, and can the user find the right topic from the app, offline?

| Score | Anchor |
|---|---|
| 4 | The app has no manual, or a stub. Many controls are undocumented, or the text describes a different UI. F1 does nothing. |
| 7 | A manual exists and covers the main tasks and most controls. A few controls are missing or out of date. F1 opens help, but not always the topic of the focused app. |
| 10 | All of: (a) `docs/help/<app>.md` exists for every app on the journey and follows `docs/DOCUMENTATION_STYLE.md` (shape, SimpleEnglish, procedures, definition lists, screenshots); (b) every interactive control of the app, meaning every `data-testid` inside the app root, appears in the manual with its place and its purpose (the coverage script reports zero missing and zero stale ids); (c) each button, menu item, input and pane is described where the user would look for it (a parts list per window, one procedure per task); (d) screenshots match the built app; (e) the in-app Help and Support app renders the manual offline, F1 opens the topic for the focused app (and for the focused dialog if it has one), and Start has a Help and Support entry; (f) the manual's procedures were followed word for word by a fresh reviewer and worked; (g) a user panelist who used only the manual completed the task (see `process.md`). |

Evidence: the coverage script output, the procedure run log, the F1 check for each app, the screenshots diff, the panel session where help was used.

## Reviewer calibration

Before the first scoring round, two reviewers score the same journey (J06) alone and compare. Cells that differ by more than 1 point are discussed, the anchor text is fixed if it was unclear, and the pair re-scores. Repeat each sprint with one journey chosen at random. Record the calibration result in `scorecard.md` under "Calibration".

## How scores are written

In `scorecard.md`, each cell has the form `score (S-open) link`, for example `8 (S3:2) findings#F-014,F-021`. The word "n/a" needs a reason in the note under the table. A cell that is not yet reviewed reads "not yet assessed".

## User panel result as a gate

The user panel (see `process.md`) is evidence for D1, D2, D4 and D11. A journey cannot score 10 on D1 or D2 if any panel task for it failed at any level (expert, intermediate, novice), or if any panelist needed to be told how. A task failure is logged as a finding: at least S2 when the novice (Haiku) or the intermediate (Sonnet) panelist failed, at least S3 when only the expert failed or needed more than twice the step budget. Take the higher severity if the cause is a data-loss or safety error.
