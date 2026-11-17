# Facilitator guide: running one panel round

The facilitator (the orchestrator) runs sessions and checks. The facilitator never helps a panelist. The panelist sees
only `ux` screenshots (see `PANELIST.md`). Everything below uses plain shell commands from the repository root.

## Prerequisites

```
npx electron-vite build          # the driver launches the BUILT app (out/main/index.js)
```

On a headless machine the scripts use `xvfb-run` themselves (needs the `xvfb-run` binary). The facilitator tools use the
repo's Playwright (`_electron`) and the built-in Scripted Agent; nothing else to install.

## One fresh panelist per task (H-80)

Every task is run by its own new panelist agent. A panelist that has seen the Start menu, Help or an approval box knows things
that the next task is meant to test (R4: both T21.1 panelists pressed Ctrl+N because they had seen it in T20.1; R5 had batches of
10 tasks in one context, so 104 records may carry knowledge silently). Spawn one agent per task and level, and never reuse it.

The easy way: `session.mjs brief` prints the complete, self-contained prompt for ONE such agent, to paste as it is:

```
node scripts/ux-panel/session.mjs brief --task T06.1 --level novice --round r6      # --out <dir> overrides /tmp/ux-sessions/<round>/<task>-<level>
```

The prompt tells the agent to (1) `start` the task (facilitator notes hidden), (2) act as the panelist (the whole PANELIST.md is in
the prompt, LEVEL filled in), (3) only after its final report is written run `check` (with `--answer` for an answer task), (4) write
the record `docs/ux/panel/<round>/<task>-<level>.md` from the template, (5) `stop` with `--record` and copy the folder. Its last
message is the record path and the Result line. The orchestrator runs `brief` once per task and level, and starts the agents in
parallel if it likes (each session is isolated, see below). The agent must not change what it reported because of the verdict;
if you need a stricter separation (the final gate), use the manual flow below with a panelist that never sees `check`.

`start` and `brief` take `--previous T20.1,T22.1`: the tasks that the context of the panelist already ran. They refuse T21.1 after
T05.x, T06.x, T07.1, T13.1, T20.x, T22.x, T30.2 or T31.x (they show the Start menu, Help or the approval hints), and T22.x and T31.x
after T13.1, T20.x, T22.x, T30.2 or T31.x. The list is written to `session.json` and `check.json` as `context.previousTasks`
(`[]` for a fresh panelist, the normal case); the record template has a `Context:` line for it. A refused task needs a new agent.

## One task, one level (manual flow)

```
R=docs/ux/panel/<round>                       # e.g. docs/ux/panel/r1
S=/tmp/ux-sessions/<round>/<task>-<level>     # session folder (log, shots, state)

# 1. Start: a fresh user-data folder, the start state of the task, the app is up.
node scripts/ux-panel/session.mjs start --task T05.2 --level novice --out $S
```

`start` prints on **stdout** the block for the panelist (between `=== FOR THE PANELIST` and `=== END ===`: session folder,
step budget for the level, scenario with any address already filled in, command prefix). Give the panelist exactly that
block. The facilitator notes (task id, Min, preset, notes, test page address) go to **stderr** with the prefix
`[facilitator]`; `--facilitator` prints them on stdout as well. Never forward them. If a start state needs a spoken detail,
it is part of the scenario text (tasks.md), not a separate note: a hint that a panelist has to know belongs in the
scenario they read. `session.mjs task --task T05.2 --level novice` prints the panelist block again (variant ids such as
`T18.1-window` work); `session.mjs list` lists every task and its preset.

```
# 2. Spawn a fresh panelist agent (no memory of earlier sessions, Bash tool only). H-69: ONE FRESH PANELIST PER TASK. Never
#    reuse an agent or a context for a second task, not even a task of the same journey: knowledge carries over (R4: both T21.1
#    panelists pressed Ctrl+N because they had seen it in the Start menu in T20.1). If a journey is run by one panelist (only
#    for a journey test, not for a task result), order the tasks so that no task teaches the next one; T21.1 must never follow
#    T20.1 or T22.x in the same context. `start` reminds you on stderr.
#    Prompt = contents of scripts/ux-panel/PANELIST.md with LEVEL replaced
#             + the panelist block printed by `start` (session folder, step budget, scenario)
#    Nothing else: no task id, no preset, no repository hints.
#    Levels (H-48): novice (Haiku, budget 4 x Min), intermediate (Sonnet, 3 x Min), expert (Opus, 3 x Min). `--level` takes these
#    names (haiku, sonnet and opus are accepted as aliases); any other name is refused.
```

The panelist finishes with its final report (outcome, numbered steps, stuck points, SEQ, frustrations). A panelist that stops before the scenario
is complete (early stop) is a harness defect to note in the record, not a FAIL by itself: re-read the scenario part it
skipped; PANELIST.md has the rule "finish the whole scenario". If it is stuck without progress, the only
allowed sentence is "Continue when you are ready"; a task that needed it is recorded as failed at that moment.

```
# 3. Check: state-based verdict from the app (PASS / FAIL / MANUAL) + step count against the budget.
node scripts/ux-panel/session.mjs check --out $S --answer "<the text after 'Answer:' in the panelist's final report>"
node scripts/ux-panel/session.mjs check --out $S --no-answer      # a task with an Answer: line, and the panelist gave none
```

- A task asks a question when its entry in `docs/ux/tasks.md` has an `Answer:` line (H-54; the scenario wording is not guessed).
  For such a task `check` refuses to write a verdict unless you pass `--answer "<text>"` or `--no-answer` (H-59, H-29). Other tasks need neither.
- There is no `--seq` option (H-53). The rating is read from the record: write the record (step 4) with its `- SEQ: <1-7>` line
  first, then `stop --record <file>` copies the rating into check.json and recomputes the weak flag. A PASS at the budget limit, or
  with SEQ below 5, is a weak pass (`weak: true`, H-46).
- SEQ scale guard (H-72): the scale is 1 = very difficult ... 7 = very easy (the panelist template says so beside the field, and the
  record template below repeats it). `stop --record` (and `seq`) refuses a SEQ of 1 to 3 when the record calls the task easy or lists
  no stuck points or errors, a SEQ of 5 to 7 when it says "very difficult" or "gave up", a SEQ outside 1 to 7 and a record without a
  `- SEQ:` line. Ask the panelist (or re-read the record); if the number is right, pass `--seq-confirmed`.
- `session.mjs seq --out $S --record <file>` does the same for a session that is already stopped; `session.mjs seq --records $R
  --sessions /tmp/ux-sessions/<round>` regenerates the SEQ and the weak flag of every check.json from its record.
- `check` may be run again (H-67): every run is appended to `check.json.runs` (the top level is the last run). The record must
  list all runs and say why the earlier ones differ. An answer of fewer than 5 words is refused (a placeholder such as "x"); pass
  the whole text after "Answer:" or `--no-answer`.
- Compare the SEQ with the frustrations list: a SEQ that differs by 3 or more from what the report says (for example SEQ 2 after a
  two-step pass) is rating noise; flag it in the record and report the measured values (H-36).

- H-90: for an answer task `check --no-answer` alone is refused; pass `--no-answer --accept-no-answer` only when the panelist really gave
  none. `stop` also refuses a record without an `- Answer:` line for such a task (unless `--accept-no-answer`).
- H-92: `check.json.stepsToPass` is the number of steps when the check first held (the first run with a PASS from the checker, or
  `--steps-to-pass <n>` read from the log). The budget and the weak rule use it, so steps spent after the goal (a scenario with a
  second clause, T01.1) do not turn a pass into a weak pass.
- H-93: `stop --rerun "<reason>"` writes `check.json.rerun` (a session repeated after a harness defect or a stopped panelist), and
  `stop --finished-by-facilitator` writes `finishedByFacilitator: true` (the facilitator wrote or completed the record), so the
  synthesis can count them.
- H-94: `session.json.build` is `{packaged, version, commit}` and `stop` adds a `- Build:` line under the record title and into
  `check.json.build`. `packaged` is true only when the app was started from the packaged executable (`UX_PACKAGED_EXE=<path>`); a round
  counts for the release gate only when `packaged` is true in every session (`lib/build.mjs` `gateProblem`).
- H-100: the commit comes from `build-info.json` beside the packaged executable (`resources/build-info.json`, written by `node scripts/write-build-info.mjs`, which `npm run dist` runs first), else `UX_BUILD_COMMIT`, else the repository head. `start` refuses a session whose commit differs from a session already in the round's folder (the sibling folders of `--out`); pass `--confirm-build-change` only when you state that the app code is identical.
- An answer task ends in MANUAL when `check` is run with `--no-answer` (H-82). `stop` then refuses (`the last check of this answer task had no answer`)
  until you run `check --answer "<text>"` with the panelist's answer; pass `--accept-no-answer` only when the panelist really gave none
  (the record says so). Keyword checks (case-insensitive substrings): T02.2 (already, exists, same name, own name, unique, in use, taken),
  T10.1 (chip, top bar, workspace bar, agent can use, closed, deny, never), T16.2 (no and Write files), T31.1 (Ctrl+S, H-84).
- Line numbers (H-77, T06.1, T24.1): the answer must name 1, 3 and 4 as written (or +3 and -3 for T06.1). A range such as "lines 1 to 5" is
  not expanded; an answer that says it could not tell (could not say, cannot tell, no idea, unclear) fails with that reason.
- `stop --record <file>` adds "Steps: N of M" to the record's Result line when the panelist left it out (H-83).
- T07.1 (H-85): either chat may be answered first. `check.json.notes` gets the answer order and the seconds from each request to its
  answer; a very short time next to "the record says it did not read it" is an Allow without reading.
- `PASS` / `FAIL` is decided from app state (database through the app API, files on disk, desktop state), never from
  what the panelist says. Exceeding the step budget turns the verdict into FAIL (printed). A PASS within +25 percent of
  the budget prints "within +25 percent: review" and sets `nearMiss` in check.json, so the researcher can flag a near miss.
- `MANUAL` means the state part is fine but a researcher must judge the panelist's answer: the line says what the correct
  answer is. `--no-answer` ends an answer task in MANUAL. With `--answer`, keyword checks run.
- Exit code: 0 PASS, 1 FAIL, 2 MANUAL.

```
# 4. Write the record docs/ux/panel/<round>/<task>-<level>.md (template below). Before writing MANUAL or a content verdict,
#    open the LAST shot of the session and compare it with what the panelist says it saw (H-61).

# 5. Archive and shut down (log.jsonl, shots/, state.json, check.json, summary.json stay in $S).
#    `stop` refuses without a check.json (a session lost to an outage must not look finished); `--no-check` archives anyway.
#    `--record <file>` reads the `- SEQ:` line of the record into check.json (H-53).
#    When the session is already gone it prints "no running session" with a restart hint and keeps the folder (H-30).
node scripts/ux-panel/session.mjs stop --out $S --record $R/<task>-<level>.md
mkdir -p $R && cp -r $S $R/<task>-<level>-session
```

Record template:

```
# <task> <title> - <level>
- Build: <packaged|unpackaged build, version, commit; `stop` adds it>
- Result: PASS|FAIL|MANUAL (<reason from check>)   Steps: <n> of <budget>   Time: <stop fills it in>
- Context: fresh panelist, previous tasks: none
- Answer: <the text after 'Answer:' in the final report; tasks without a question: not asked>
- SEQ: <1-7> - <one sentence>   (1 = very difficult, 7 = very easy; a high number means EASY)
- Check runs (all runs of check.json.runs and why they differ; "one run" if only one): ...
- Errors (wrong clicks, undo, dead ends, error messages seen): ...
- Help used (F1, Help topics): ...
- Steps (the numbered step list of the final report): ...
- Frustrations / what they would change: ...
- Evidence: docs/ux/panel/<round>/<task>-<level>-session/shots/NNN.png, log.jsonl
```

`log.jsonl` has one line per command (`ts`, `cmd`, `args`, `screenshot`, `window`, `ok`, `ms`). Step counting = lines whose
`cmd` is click, move, drag, scroll, type or key. `summary.json` has the totals.

## Several panelists in parallel

Each session is isolated (own user-data folder, own sockets, own Xvfb), so sessions of different tasks and levels can run
at the same time. Every session serves its own copy of the Browser test page (T19.x) on a free port that `start` picks (override with
`--port <n>`); the address is in the scenario text, so parallel sessions do not clash and the page lives and dies with its
own session.

## Where things are

`scripts/ux-panel/tasks.mjs` maps every task to a preset. Presets: `scripts/ux-panel/presets/*.mjs` (setup only, through
`window.agentxp`). Checkers: `scripts/ux-panel/checks/*.mjs`. Scripted-agent scripts for the tasks:
`scripts/ux-panel/scripts/*.json` (plus `agents/scripted-agent/scripts`).
`node scripts/ux-panel/presets-smoke.mjs [task...]` starts every start state and runs its checker once (a regression test
of the harness itself; most untouched start states must say FAIL, that is expected).

Debugging a start state: `UX_KEEP=1 node scripts/ux-panel/session.mjs start ...` keeps the app alive when a preset fails.

## Notes

- `start` is idempotent (H-66): the same task and level on a folder whose session is ready and alive prints the panelist block again.
  A start state that throws closes the app, frees the folder (`session.json` becomes `session.failed-<time>.json`) and keeps `server.log`;
  start again with the same `--out`.
- T23.1b (the second crash; H-86: one id in the folders, the records and `tasks.mjs`, `T23.1-twice` is accepted only as an alias on the command line) needs product fix UX-123 (the failure count survives a restart until a turn completes). Records of rounds 4 and 5 keep the old file names.
- T14.1 (H-73): the preset selects the idle "Scratch pad" row; the waiting row is not preselected.
- The last reply of the Browser script `browser-agent` is plain: "I sent the message and found it in #general." (H-71); any text that is not the scripted request or a request to read the page gets "Okay." (H-98); its reply to "what does the page say" is "The page is titled Fixture page. It says Example Domain." (H-79).
- Mouse-less task T21.1: the driver refuses `click/move/drag/scroll` for that session.
- Fixtures (H-32): every session starts the app with a sandbox home (`HOME` and `USERPROFILE` = `<tmp>/home`) and creates the
  projects under `<tmp>/home/Documents` (`login-app`, `docs-site`, `notes-folder`, ...), so the in-app Browse For Folder
  dialog lists them under Home and Documents (also with recent folders or typed paths, which only add other routes). `stop` removes the whole
  sandbox. The path is in `session.json` (`home`, `fixtures`); never give it to a panelist.
- Presets that change the desktop act through the UI (H-35): `eject-mid-job` uses the taskbar's Safely Remove Hardware menu and
  answers Yes; `paused-desktop` presses Pause all agents on the top bar. `recycled-change` reloads the desktop window after the revert (H-34).
- `ux scroll <x> <y> <dy>` takes raw pixels (H-78): 100 is one wheel notch, 200 to 300 about a page. The output says how far the content moved and warns under 20. Every action prints "Step N" (H-81), counted like the budget; the budget stays secret.
- `ux move` waits 1.2 s before its screenshot (H-52, H-103), because tooltips appear after 500 ms. After a `click`, the server waits up to 1.5 s for a window that the click opens and prints "Window shown: ..." under every shot (H-102).
- H-101: for T01.1 and T02.1 the server runs the check after every action and marks the log line on which it first held (`checkHeld`); `check` takes `stepsToPass` from it unless `--steps-to-pass` is given.
- H-104: a session's sandbox is `<parent>/a7ux-XXXX/home/Documents`. The parent is `UX_SANDBOX_ROOT`, else `~/.ux-panel`, else the system temp folder, so the folder field no longer shows `/tmp/...` where the home folder is writable. The app shows the host path, so it still reads as a test path (`a7ux-...`); the panelist briefing says that such paths are test paths. A real Windows-style path needs a product change (a virtual home) and is not done here.
- T23.1 starts at the first crash and asserts that the red box offers "Restart and send again" (H-58); `T23.1b` is the second failure ("It stopped again", plain Restart) as its own task.
- `ux windows` lists each window with its kind (`[launcher]` or `[desktop]`), because every title is "AgentXP" (H-43).
- T29.1 opens `{TEST_PAGE_URL}second` (the per-session port); the server answers `/second` with the title "Second page".
- Folder pickers: the start states stub the native folder dialog (answers docs-site; login-app in launcher states). The stub
  only answers folder pickers and cancels file pickers (Attach). The in-app Browse For Folder dialog is not stubbed.
- Planned tasks (T08.2, T24.1, T24.2) have start states and checkers; run them only after the feature is merged.
- Prompts of start states are typed in the chat window like a user does; screenshots start from the window that is open
  after setup (launcher or desktop).
- T22.1/T22.2: the Help window is found by its app (`help`) and its topic, under either title ("Help and Support" or "Chat Help").

## Records, reruns and the verdict (round 8 process fixes)

- H-109, Time: `stop --record` measures `Time: <n> min` from the log (first to last command) and writes it into the Result line, over whatever
  the panelist wrote. It then refuses a record that still has a template placeholder (`<stop fills it in>`, `<min>`, `<n>`, `<budget>`,
  `<reason from check>`, ...): fill it in and run `stop` again.
- H-111, rating: `stop` refuses without `--record <record.md>` when the session has a `check.json`, because `check.json.seq` is read from the
  record's `- SEQ:` line. Pass `--no-record` only for a session without a record.
- H-110, flags: `stop --rerun "<why the first run was lost>"` and `stop --finished-by-facilitator` set `check.json.rerun` and
  `check.json.finishedByFacilitator` and write the reason into `check.json.notes`. Keep a lost first run as
  `docs/ux/panel/<round>/<task>-<level>-session-lost` (beside the record): when that folder exists, `stop` refuses without `--rerun`.
- H-119, `check` output: a result other than PASS prints no reason and no notes (so a panelist cannot read which words an answer needs). The reason is in
  `check.json`; `check --facilitator` prints it. Run `check` once per panelist, and run it yourself (not the panelist) for the final gate.
- H-113, protocol: the panelist reads nothing of the session folder, before or after the verdict. For the final gate run the panelist in
  a folder that holds only the screenshots it needs, and run `check` and `stop` yourself; the log cannot show file reads, so the rule
  is in the brief (`session.mjs brief` says it) and in the checking of the records (a record that quotes `check.json` is a slip: flag it).
- H-112, H-118: `ux move` prints the browser's own tooltip (`title`) under the pointer as a `Tooltip` line, because browser tooltips are not in
  the shots. `ux type` prints `Enter pressed N times` when the text has line breaks.
- H-107: the `bad-default-agent` start state (T17.2) removes the built-in Claude Code row (it starts with `npx` and cannot run here), so every row that
  is left either fails for the stated reason or answers.
- H-117: the a2ui form button is "Send name" and the speaker is "Helper" (the chat's own button is "Send").
- H-115: T25.3 "The chat reviews" (preset `review-chat`, script `chat-review`) is the round 9 re-test of UX-193: a chat does the review through
  `review_open`, the review tools and `review_submit` from any chat, and the verdict is handed back to it. Run it at both levels with T25.1, T25.2, T26.1, T26.2.

### Rerun after a usage limit (H-114)

When a panelist or a session is lost to a usage limit (or an outage) before `stop`:

1. Keep the lost run: copy its session folder (and its record, if any) to `docs/ux/panel/<round>/<task>-<level>-session-lost` before anything else.
   Never reuse its folder or its panelist.
2. Start the task again in a new `--out` folder with a FRESH panelist (`session.mjs brief`, no `--previous`; one panelist per task, H-69).
3. Run it as usual. At the end run `stop --out <S> --record <record> --rerun "<why: usage limit, panelist stopped at step N>"`. The reason goes into
   `check.json.rerun` and `check.json.notes`. If you wrote or finished the record yourself, add `--finished-by-facilitator`.
4. State the rerun and its reason in the synthesis (a rerun task is counted once, with the new run; the lost run is evidence of the limit, not of the program).
