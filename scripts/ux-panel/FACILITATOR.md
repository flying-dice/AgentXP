# Facilitator guide: running one panel round

The facilitator (the orchestrator) runs sessions and checks. The facilitator never helps a panelist. The panelist sees
only `ux` screenshots (see `PANELIST.md`). Everything below uses plain shell commands from the repository root.

## Prerequisites

```
npx electron-vite build          # the driver launches the BUILT app (out/main/index.js)
```

On a headless machine the scripts use `xvfb-run` themselves (needs the `xvfb-run` binary). The facilitator tools use the
repo's Playwright (`_electron`) and the built-in Scripted Agent; nothing else to install.

## One task, one level

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

The panelist finishes with its final report (think-aloud, SEQ, frustrations). A panelist that stops before the scenario
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
- Result: PASS|FAIL|MANUAL (<reason from check>)   Steps: <n> of <budget>   Time: <min>
- SEQ: <1-7> - <one sentence>   (1 = very difficult, 7 = very easy; a high number means EASY)
- Check runs (all runs of check.json.runs and why they differ; "one run" if only one): ...
- Errors (wrong clicks, undo, dead ends, error messages seen): ...
- Help used (F1, Help topics): ...
- Think-aloud (verbatim, from the panelist's final report): ...
- Frustrations / what they would change: ...
- Evidence: <session folder copy>/shots/NNN.png, log.jsonl
- Researcher notes (answer checks, MANUAL decisions): ...
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
`window.agent7`). Checkers: `scripts/ux-panel/checks/*.mjs`. Scripted-agent scripts for the tasks:
`scripts/ux-panel/scripts/*.json` (plus `agents/scripted-agent/scripts`).
`node scripts/ux-panel/presets-smoke.mjs [task...]` starts every start state and runs its checker once (a regression test
of the harness itself; most untouched start states must say FAIL, that is expected).

Debugging a start state: `UX_KEEP=1 node scripts/ux-panel/session.mjs start ...` keeps the app alive when a preset fails.

## Notes

- `start` is idempotent (H-66): the same task and level on a folder whose session is ready and alive prints the panelist block again.
  A start state that throws closes the app, frees the folder (`session.json` becomes `session.failed-<time>.json`) and keeps `server.log`;
  start again with the same `--out`.
- T23.1-twice is T23.1b in `tasks.md` (H-65) and needs product fix UX-123 (the failure count survives a restart until a turn completes).
- T14.1 (H-73): the preset selects the idle "Scratch pad" row; the waiting row is not preselected.
- The last reply of the Browser script `browser-agent` is plain: "I sent the message and found it in #general." (H-71).
- Mouse-less task T21.1: the driver refuses `click/move/drag/scroll` for that session.
- Fixtures (H-32): every session starts the app with a sandbox home (`HOME` and `USERPROFILE` = `<tmp>/home`) and creates the
  projects under `<tmp>/home/Documents` (`login-app`, `docs-site`, `notes-folder`, ...), so the in-app Browse For Folder
  dialog lists them under Home and Documents (also with recent folders or typed paths, which only add other routes). `stop` removes the whole
  sandbox. The path is in `session.json` (`home`, `fixtures`); never give it to a panelist.
- Presets that change the desktop act through the UI (H-35): `eject-mid-job` uses the taskbar's Safely Remove Hardware menu and
  answers Yes; `paused-desktop` presses Pause all agents on the top bar. `recycled-change` reloads the desktop window after the revert (H-34).
- `ux move` waits 800 ms before its screenshot (H-52), because tooltips appear after 500 ms.
- T23.1 starts at the first crash and asserts that the red box offers "Restart and send again" (H-58); `T23.1-twice` is the second failure ("It stopped again", plain Restart) as its own task.
- `ux windows` lists each window with its kind (`[launcher]` or `[desktop]`), because every title is "Agent7" (H-43).
- T29.1 opens `{TEST_PAGE_URL}second` (the per-session port); the server answers `/second` with the title "Second page".
- Folder pickers: the start states stub the native folder dialog (answers docs-site; login-app in launcher states). The stub
  only answers folder pickers and cancels file pickers (Attach). The in-app Browse For Folder dialog is not stubbed.
- Planned tasks (T08.2, T24.1, T24.2) have start states and checkers; run them only after the feature is merged.
- Prompts of start states are typed in the chat window like a user does; screenshots start from the window that is open
  after setup (launcher or desktop).
- T22.1/T22.2: the Help window is found by its app (`help`) and its topic, under either title ("Help and Support" or "Chat Help").
