# Agent7 UX Sprint Process

Status: discovery complete, process proposed. Agent7 ships on disk. A fix after release is expensive, so the release must be right the first time. This process makes every journey in `journeys.md` reach 10/10 on every dimension in `rubric.md`, with evidence, and to pass the user panel at all three levels.

## Roles

- **UX lead** – owns the documents, runs the calibration, decides acceptance of S4 findings, keeps the scorecard.
- **Reviewer** – walks, audits and scores a journey. Must not be the person who fixed its findings.
- **Fixer** – changes code or text for a finding. Marks it "fixed", never "verified".
- **Docs owner** – writes and maintains `docs/help/<app>.md` and the coverage script. Not the reviewer of the same manual.
- **Moderator** – runs the panel harness. Never helps a panelist.
- **User researcher** – analyses panel sessions. Not a panelist and not a fixer.
- **Test author** – writes the journey spec. May be the fixer.

## Phases

| Phase | Output | Exit |
|---|---|---|
| 0 Discovery | Personas, journeys, rubric, process, scorecard (done) | UX lead signs off the journey list |
| 1 Baseline assessment | Journey specs with screenshots, findings log, first scorecard, manuals, first panel round | Every journey scored once, every finding logged |
| 2 Fix rounds | Fixes with test ids and specs updated | Findings move to "fixed" |
| 3 Independent re-review and panel re-run | Fresh reviewer re-scores; fresh panelists re-run failed tasks | Findings "verified" or reopened; failed tasks pass |
| 4 Release gate | Final regression pass on the packaged build | Exit criteria below met |

Run phases 2 and 3 in rounds until the exit criteria hold. Order work by severity first, then by journey order J01 to J24, because early journeys are the first session of every user.

## Methods per phase 1 pass

Run all methods for every journey. One reviewer can run several in one sitting, but the keyboard-only and performance passes use their own runs.

### 1 Cognitive walkthrough (per journey)

For each step in the journey table, answer the four questions as the hardest persona (P4 for J01 to J06, J22, J23):

1. Will the user try to do the right thing? (The goal is clear at this point.)
2. Will the user see that the right control is there?
3. Will the user connect that control with the goal? (Label, icon, position.)
4. After the action, will the user see that progress was made? (The "must notice" column.)

A "no" is a finding. Record the answers in the evidence folder as `walkthrough.md` with a table per step. Do the failure and edge branches too: each branch is a mini walkthrough.

### 2 Nielsen heuristic evaluation

Two reviewers evaluate each journey alone, then merge. Use the ten heuristics: visibility of system status, match with the real world, user control and freedom, consistency and standards, error prevention, recognition over recall, flexibility and efficiency, aesthetic and minimalist design, help users recover from errors, help and documentation. Map each finding to the rubric dimension that it hurts most (status maps to D9 or D7, consistency to D6, error maps to D4, and so on). Deduplicate against the walkthrough.

### 3 WCAG 2.2 AA audit

**Automated.** `axe-core` is NOT in `node_modules` (checked: no `axe-core` or `@axe-core/*`; `playwright` and `playwright-core` are present). Do not install it as a dependency of the shipped app. Options, in order:

1. Ask the lead to approve `axe-core` as a dev dependency only, then inject `axe.min.js` into each page with `page.addScriptTag` in the journey spec and run `axe.run()` per state (a scan after each step). Assert zero violations.
2. If not approved, run the manual checklist below. The result is weaker, so D5 can reach 10 only with the full checklist and a second reviewer.

Automated checks do not replace the manual ones. Axe finds about a third of WCAG problems.

**Manual checklist (every journey, every state in the state matrix).**

- Keyboard: every function reachable; order matches the reading order; no trap; Esc closes popups and returns focus; shortcuts do not clash. (2.1.1, 2.1.2, 2.4.3, 3.2.1)
- Focus: visible on every stop, 3:1, not hidden behind the taskbar or a window (2.4.7, 2.4.11, 2.4.12).
- Names, roles, states: inspect the accessibility tree with Playwright `page.accessibility.snapshot()` (or `ariaSnapshot`). Dialogs have `role="dialog"` or `alertdialog`, a label and modal behavior; lists and trees have the right roles; toggles show state (4.1.2).
- Live regions: permission requests, errors, status changes and chat progress are announced politely or assertively as fitting (4.1.3). Streaming text must not announce every chunk.
- Contrast: measure text (4.5:1, large text 3:1), icons, borders, focus rings (3:1) on the real rendered pixels, including gadgets on the blue background, the disabled state, tool chips, and the flag count. Record the ratios.
- Target size: at least 24x24 CSS px or spacing (2.5.8), for the tray icons, window buttons, chips, and checkboxes.
- Color only: states (running, done, failed, git status marks, chip states) also have text or shape (1.4.1).
- Motion: with `prefers-reduced-motion: reduce`, spinners, progress marquees, hover fades and flashes stop or reduce (2.3.3 as practice; flashing under 3 per second, 2.3.1).
- Zoom and text size: 200% zoom and 125% and 150% display scaling keep the launcher (fixed 520x600) and dialogs usable (1.4.4, 1.4.10).
- Pointer: no drag-only action (2.5.7); drag, snap and sticky note move have keyboard equivalents or are accepted with a reason.
- Dragging, canvases, the webview: list as accepted exceptions with a reason, or fix.
- Forced colors: a quick look in forced-colors mode for the shell and dialogs (not required by AA, record as S4).
- Screen reader smoke test (NVDA on Windows, VoiceOver on macOS) for J01, J02, J05, J06, J07.

### 4 Windows UX Interaction Guidelines compliance (Win7 era)

Check each dialog, menu and window against the Windows 7 guidelines. The list to use:

- Command buttons: verb labels; default button is the safest likely action; Esc equals Cancel; button order OK/Cancel (Yes/No); an ellipsis only if more input is needed.
- Dialogs: title bar names the task or the app; main instruction in a clear sentence; no "Are you sure?"; command links or buttons name the result; modal behavior blocks only its owner; focus returns to the opener.
- Windows: title, system menu (Alt+Space), minimize, maximize, close; resize grips; a minimum size; Alt+F4 closes; taskbar button states (flashing, active).
- Menus: access keys (underlines on Alt), accelerators shown, disabled items stay visible, separators group.
- Notifications: balloons for non-critical information, auto-hide, a click does something; the Action Center for items that need action; no modal interruptions for information.
- Selection and lists: arrow keys, Home, End, type-ahead, Space and Ctrl for multi-select, F2 rename, Delete delete, Enter default action, context menu (Shift+F10, Menu key).
- Progress: determinate when the size is known; a marquee otherwise; text says what is done.
- Errors and warnings: the guideline order "what happened, why, what to do"; no blame; no codes without text.
- Safe-by-default and undo: confirmation for deletion, a Recycle Bin for files.
- Help: F1; tooltips on hover and on focus.
- Wizard-like flows (New desktop): the order of fields, the default focus, and the OK enable rule.

Findings use dimension D6 for look, D1 or D3 for behavior, D8 for text.

### 5 Copy audit

Export every user-visible string of the journey (labels, tooltips, dialog text, empty states, errors, status text, taskbar titles, notification text, Storybook fixtures that show in the app) into `docs/ux/evidence/<journey>/copy.md` as a table: location, string, rule broken, proposed text. Check each string against `docs/DOCUMENTATION_STYLE.md` and the Windows 7 text rules (see D8). Search the source for strings that bypass the audit: `grep` for `aria-label`, `title=`, `placeholder=` and error constructors. Check the terms table (chat, desktop, drive, USB drive, app, tool, project, agent, window, pane, dialog box) across UI, README and tests. Check that agent-supplied text (option names like "Allow", stop reasons) is shown unchanged but surrounded by Agent7 text that is correct.

### 6 State audit

Per screen of the journey, fill a state matrix and screenshot each state: empty, loading, partial, success, error, disabled, disconnected, paused, waiting for approval, ejected, agent crashed, no network. Use the scripted agent (`agents/scripted-agent`, stepping and `errors.json` scripts) to reach states deterministically and slowly. Write a new script into `agents/scripted-agent/scripts/` if a state cannot be reached (tell the owner of that folder). Each missing or unclear state is a finding for D9.

### 7 Keyboard-only pass

For each journey, run the happy path and the main failure branch with the mouse unplugged (in Playwright, `page.keyboard` only; the journey spec has a second test named `<journey> (keyboard)`). Count keystrokes against the minimum for D3. Record focus order and any loss of focus. Test ids still locate elements, but interaction is by keys.

### 8 Performance pass with measured timings

Measure on a reference machine (write down the CPU, RAM, OS, display scale) with the packaged build and a warm and a cold start:

| Measure | Target |
|---|---|
| App start to launcher interactive (warm, cold) | under 1.5 s, under 3 s |
| Connect to desktop interactive | under 2 s |
| Start menu open, window open | under 100 ms, 200 ms |
| Key press to character in the chat box | under 50 ms |
| Send to first streamed text (scripted agent) | under 300 ms of Agent7 time |
| Streaming with 2,000 transcript rows | no task over 50 ms |
| Drag a window with 6 windows open | 60 fps |
| Memory after 30 minutes with the scripted agent in a loop | stable, no growth over 20% |
| Disconnect and reconnect mid-turn | state restored under 2 s |

Capture with `performance.mark` in the page through `page.evaluate`, Playwright traces, or `electron` `process.getProcessMemoryInfo()`. Store numbers in `docs/ux/evidence/<journey>/perf.json`. Targets for both measures are guesses until the first run. Adjust them with a reason, never silently.


### 9 Documentation pass (manuals and Help and Support)

Every app gets its own manual, like a Windows Help and Support topic or an Office app guide. Every button, menu item, input and pane has its place in it.

- **Files.** `docs/help/<app>.md`, one per app kind in `src/renderer/src/lib/apps/` (chat, explorer, notepad, wordpad, code, terminal, browser, paint, sticky-notes, event-viewer, snipping-tool, recycle-bin, agent-manager, control-centre) and one per shell part (launcher, desktop, top bar, taskbar and Start menu, Action Center, UAC dialog, AutoPlay, tray). Add `docs/help/index.md` as the contents page.
- **Shape.** Follow `docs/DOCUMENTATION_STYLE.md`: title, Table of Contents, numbered chapters, a first paragraph that says where the window is, a screenshot, a definition list of the parts (every control by its visible name, in bold, with its place), one procedure per task, tips, notes and cautions, and a last chapter "Need Help?". Describe each menu item, each toolbar button, each input, each pane, each status bar field, each context menu item, and each keyboard shortcut.
- **Test ids in the manual.** Each control entry carries its test id in a trailing HTML comment, for example `- **Revert** – Writes the original file back. <!-- testid: code-revert -->`. The comment is invisible when rendered and is the key for the coverage script. Repeated items (`explorer-item`) are documented once.
- **Coverage gate.** A script (to be written by the docs owner, for example `scripts/check-help-coverage.mjs`) runs in CI and in `npm run test:e2e`. It collects every `data-testid` from each app's source (static strings and `testid` props) and from the app's runtime DOM in a fixture run (so ids from kit components appear), and fails when an id inside an app root is not in that app's manual (missing) or when the manual names an id that no longer exists (stale). Ids owned by the kit that only wrap content (for example `window-title`) are documented once in the shell manual. An id can be waived only in a `help-coverage-waivers.json` file, with a reason, and each waiver is a finding.
- **Help and Support app [planned].** An app in the desktop that renders `docs/help/*.md` offline (bundled), with a contents tree, search, Back and Forward, Print. F1 is context-sensitive: it opens the topic for the focused app, dialog or tray popup, scrolled to the part list. Start has **Help and Support**. In the manual, each "Need Help?" chapter links to the index.
- **Accuracy test.** A reviewer follows each procedure word for word in the built app. Any step that does not work, or any control that is named wrongly, is a D11 finding. Screenshots are regenerated by the journey spec and compared.
- **Evidence.** `docs/ux/evidence/<journey>/docs.md`: the manual topics used, the coverage script output, the F1 check, the procedure run log.
- **Docs in each journey.** A journey is not done until its manual topics exist, are accurate and are found by F1.

### 10 User panel (model users at three levels)

Real users are the best test. We cannot recruit them for this release, so we use a panel of model users who behave as users and see only what a user sees.

**Panel.**

| Level | Model | Role |
|---|---|---|
| Expert | Opus | Experienced developer who knows agents and Windows 7. Looks for speed, shortcuts and hidden problems. |
| Intermediate | Sonnet | Developer or analyst who used Claude Code or Copilot a little. Knows Windows. |
| Novice | Haiku | Knows Windows, has not used agents. Reads and clicks like P4. |

**Rules for panelists.**

- Each panelist gets one task scenario at a time, written as a realistic situation and a goal (see `tasks.md`), never as a list of steps and never with Agent7 words that the screen does not use.
- A panelist can use only the running app through a **driver** that returns a screenshot after each action and accepts: click at a position or on a visible label, double-click, right-click, type text, press keys (with modifiers), scroll, and drag. The driver gives no DOM, no test ids and no accessibility tree to the panelist. (The researcher can read them afterwards.) Build the driver on Playwright `_electron`, reusing `e2e/fixtures/launch.ts`; it is test tooling, not product code.
- A panelist can use the in-app Help and Support app and the manuals through the same screen. They must not read source code, the e2e specs, `docs/` files outside the app, the README on disk, or this folder. They must not call `window.agent7`. The driver sandbox enforces this: the panelist agent has no file tools and no shell, only the driver tool.
- Each panelist starts with a fresh user-data folder, set to the starting state that the task names (for example "one desktop exists, the scripted agent is the default"), and an agent that behaves in a scripted way so the task is repeatable. The scripted agent acts as the "agent" in all tasks. For a few tasks (marked in `tasks.md`), Claude Code is used as a live smoke test, once per release.
- The panelist thinks aloud: before each action, one sentence on what they see, what they expect and what they will do. The driver logs this verbatim with the screenshot.
- Each task has a **step budget** (the number of driver actions) and a **time budget**. The budget is 3 times the minimum number of actions for the intermediate level and 4 times for the novice, and is written in the task.
- A panelist who gives up, who is told how by the moderator, who exceeds the budget, or who ends with a wrong state, **fails** the task. Success is checked from the app state by an independent checker (a script that reads the state through test-only means after the session, as in `e2e/fixtures/setup.ts`), not from what the panelist says.
- The moderator (the harness or the UX lead) never helps. If a panelist is stuck, the harness only says "Continue when you are ready" after a no-progress limit, and the task is recorded as failed at that moment.

**Record per task** (one JSON and one markdown file under `docs/ux/evidence/<journey>/panel/<task>-<level>.*`): success (pass or fail with the checker output), number of steps, time, errors (wrong clicks, undo, dead ends, error messages seen), help used (F1, Help topics opened), Single Ease Question (SEQ, 1 to 7: "Overall, how easy or difficult was this task?", asked after the task), the verbatim think-aloud notes, and the screenshots. Add a short post-task interview: "What did you expect? What was confusing? What would you change?"

**User researchers.** Separate reviewer agents (not panelists, not fixers) analyse the sessions in the style of moderated testing:

1. Watch each session from the screenshots and think-aloud log, and tag each hesitation, wrong turn, quote and error.
2. Synthesize per journey: success rate by level, median steps against the minimum, median SEQ (the target is 6 or more at every level, and no task below 5), and the main reasons for failure.
3. Build an **affinity map**: group the tagged issues across journeys into themes (for example "permission wording", "where is the help", "what the chips mean"). Write it to `docs/ux/research/affinity.md` as a table: theme, issues, tasks affected, levels affected, severity.
4. Rate the severity of each issue by the rubric scale, using frequency (how many panelists), impact (failed or delayed) and persistence (found again by a recovering user). A failure by the novice or the intermediate panelist is at least S2. An issue found by all three levels is one severity higher.
5. Log findings in `findings.md` with the evidence path to the session and the quote.
6. Write `docs/ux/research/synthesis.md` after each round: results table by task and level, top themes, what changed since the last round, and which tasks are left.

**Failure loop.** Any failed task sends its journey back to design:

1. Log findings, fix the product (UI, copy, defaults) and the manual (re-document the control), update the journey spec.
2. Re-run the task with a **fresh panelist** at the level that failed (a new session with no memory of the earlier one), and again at the other levels if the fix changed their path.
3. Repeat until the task passes. A fix that only helps a panelist who saw the old UI is not a fix.
4. Never change a task scenario to make it pass. Change a scenario only if it was unclear, with the UX lead's note and a re-run at all levels.

**Panel rounds.** Round 1 in phase 1 (baseline: all tasks, all three levels). Fix rounds re-run only failed tasks and tasks of changed journeys. The final round before the release gate runs all tasks at all levels on the packaged build, with fresh panelists. Because model users vary between runs, a task needs a pass in the final round, and a task that passes in one run and fails in another counts as failed.

**Limits.** Model users are not people. They read screens well and sometimes too patiently, and they can miss motion and sound. The panel finds findability, wording and flow problems. It does not replace the accessibility audit, the keyboard pass, or the performance pass. If the budget allows, run the novice tasks with two or three human testers at the end and add the sessions to the evidence.

## Evidence requirements

- **One Playwright journey spec per journey** under `e2e/journeys/`, named `J01-first-launch.e2e.ts`, `J06-approve-deny.e2e.ts`, and so on. Follow `docs/CONVENTIONS.md`:
  - Locators by `data-testid` only; the selector check `scripts/check-e2e-selectors.mjs` must pass.
  - Setup may use `window.agent7` through `page.evaluate`. The steps of the journey (everything the user does) must go through the UI.
  - No sleeps. Wait on test ids and states.
  - Use the scripted agent for any step that needs an agent.
  - One `it` per happy path, one per failure branch, one for the keyboard path.
  - Page objects in `e2e/fixtures/pages/` are reused; add new ones there.
  - `e2e/journeys/` does not exist yet. Check that `vitest.e2e.config.ts` and the selector check include `e2e/**/*.e2e.ts` subfolders (the glob suggests yes). Tell the owner if not.
- **Screenshots** of every step and every state, saved by the spec to `docs/ux/evidence/<journey>/NN-<step-slug>.png` (for example `docs/ux/evidence/J06/03-show-details.png`). Use a fixed window size (1280x800 for desktops, 520x600 for the launcher) and the scripted agent so images are repeatable. A step that has no screenshot has no evidence.
- **Walkthrough, copy, state, docs and panel files** in the same folder: `walkthrough.md`, `copy.md`, `states.md`, `perf.json`, `a11y.md` (or the axe JSON), `docs.md`, and `panel/` (one record per task and level).
- **Scores** in `scorecard.md` with links to the evidence and to findings.
- Evidence is regenerated by the re-reviewer, not copied from the fixer. Old images stay in git history only.

## Findings log

Create `docs/ux/findings.md` in phase 1 with this table. One row per finding. Never delete a row. Change its status.

| id | journey | dimension | severity | description | evidence | fix | status |
|---|---|---|---|---|---|---|---|
| F-001 | J06 | D4 | S2 | Allow is the default button on a destructive request | `evidence/J06/03-show-details.png` | Make Deny the default for write and run requests, or no default | open |

Column rules:

- **id** – `F-` and three digits, in order of discovery.
- **journey** – `J01` to `J24`, or `ALL` for cross-cutting findings (list the journeys that it affects in the description).
- **dimension** – `D1` to `D10`. One dimension per row; split a finding that hurts two.
- **severity** – S1 to S4 per `rubric.md`.
- **description** – one or two sentences: what the user sees, what is wrong, who is affected. No solution here.
- **evidence** – a path under `docs/ux/evidence/`, a spec name and a line, or a measured number.
- **fix** – the change that was made or proposed (file or component, test id, new text). Empty while open.
- **status** – `open`, `fixed` (the fixer says so), `verified` (a fresh reviewer re-ran the evidence), `accepted` (S4 only, with the reason in the fix column), `wontfix` (not allowed for S1 to S3), `reopened`.

Duplicates: link them (`dup of F-0xx`) and keep one open row. Cross-cutting findings (for example a focus ring that is missing in the kit `Button`) are logged once with `ALL`, fixed in the kit, and checked in every journey's re-review.

## Independent re-review rule

- The reviewer who verifies a finding or re-scores a journey must be a fresh reviewer: not the author of the fix, and not the reviewer who raised the finding for the second time. In an agent-run sprint, this means a new agent session that did not do the fix and that gets only the journey, rubric and evidence folder, not the fixer's notes.
- The re-reviewer re-runs the journey spec, regenerates the evidence, repeats the walkthrough, keyboard pass and automated scan for that journey, and scores from scratch without looking at the old score.
- If the new score is lower than the old one, the old score was wrong; log the reason and the missed finding. If two scores differ by more than 1 on any dimension, the UX lead decides after a short discussion.
- A fixer can never set `verified`, `accepted` (S4) or a score.
- A change to shared components (kit, shell, windows, dialogs) puts every journey that uses them back to "needs re-review" for the affected dimensions.

## Exit criteria

The release gate passes only when all of the following hold on the packaged build:

1. All 24 journeys have a spec in `e2e/journeys/` that passes, and all earlier specs in `e2e/` still pass.
2. Every journey scores 10 on all eleven dimensions (D1 to D11), scored by a fresh reviewer, with evidence in `docs/ux/evidence/<journey>/`.
   - **Panel gate.** Every task in `tasks.md` is passed by all three panel levels (Opus, Sonnet and Haiku, the novice included) in the final round, with fresh panelists on the packaged build, and the median SEQ is 6 or more at every level.
   - **Documentation gate.** `docs/help/<app>.md` exists for every app and shell part, the help coverage script reports zero missing and zero stale test ids, F1 opens the right topic for every app, and the Help and Support app is in the build.
3. `docs/ux/findings.md` has zero rows with status `open`, `fixed` or `reopened`. Every S1 to S3 is `verified`. Every S4 is `verified` or `accepted` with a written reason, and the UX lead has read the accepted list.
4. The automated accessibility scan reports zero violations on every state (or the manual checklist is clean and signed by two reviewers), and a screen reader smoke test passed on J01, J02, J05, J06 and J07.
5. The performance table is measured on the packaged build and meets every target, or the target was changed with a written reason that the lead accepted.
6. `README.md` matches the product: every screenshot is current, every step and shortcut in the guide works as written (the keyboard table, the Help entry, F1), and the copy audit is clean. The README, `docs/DESKTOP_DESIGN.md`, in-app help and the shipped files agree.
7. Planned features (A2UI targets, new Code app with git status and gutter) are merged and re-walked. No journey with a **[planned]** step is scored before the feature is in.
8. A clean-machine install test: install from the disk image or installer on a machine with no Node or agent, run J01 to J06 as P4, record what the user sees (agent runtime missing is a likely first-run failure).
9. The scorecard shows "Journeys at 10/10: 24 of 24" and the UX lead and one independent reviewer sign `scorecard.md`.

If a criterion cannot be met, the release does not ship. The lead may move a journey out of scope only by removing the feature from the product, not by lowering the bar.

## Cadence

- Day 1: calibration, journey specs for J01 to J08, first scores.
- Day 2: J09 to J24 specs, cross-cutting audits (keyboard, accessibility, copy, performance), findings triage.
- Day 3 onward: fix rounds of one day each, followed by independent re-review, until the exit criteria hold.
