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
node scripts/ux-panel/session.mjs start --task T05.2 --level haiku --out $S
```

`start` prints on **stdout** the block for the panelist (between `=== FOR THE PANELIST` and `=== END ===`: session folder,
step budget for the level, scenario with any address already filled in, command prefix). Give the panelist exactly that
block. The facilitator notes (task id, Min, preset, notes, test page address) go to **stderr** with the prefix
`[facilitator]`; `--facilitator` prints them on stdout as well. Never forward them. If a start state needs a spoken detail,
it is part of the scenario text (tasks.md), not a separate note: a hint that a panelist has to know belongs in the
scenario they read. `session.mjs task --task T05.2 --level haiku` prints the panelist block again (variant ids such as
`T18.1-window` work); `session.mjs list` lists every task and its preset.

```
# 2. Spawn a fresh panelist agent (no memory of earlier sessions, Bash tool only).
#    Prompt = contents of scripts/ux-panel/PANELIST.md with LEVEL replaced
#             + the panelist block printed by `start` (session folder, step budget, scenario)
#    Nothing else: no task id, no preset, no repository hints.
#    Levels: opus -> expert, sonnet -> intermediate, haiku -> novice.
```

The panelist finishes with its final report (think-aloud, SEQ, frustrations). A panelist that stops before the scenario
is complete (early stop) is a harness defect to note in the record, not a FAIL by itself: re-read the scenario part it
skipped; PANELIST.md has the rule "finish the whole scenario". If it is stuck without progress, the only
allowed sentence is "Continue when you are ready"; a task that needed it is recorded as failed at that moment.

```
# 3. Check: state-based verdict from the app (PASS / FAIL / MANUAL) + step count against the budget.
node scripts/ux-panel/session.mjs check --out $S --answer "<the panelist's answer to the task question, if any>"
```

- `PASS` / `FAIL` is decided from app state (database through the app API, files on disk, desktop state), never from
  what the panelist says. Exceeding the step budget turns the verdict into FAIL (printed). A PASS within +25 percent of
  the budget prints "within +25 percent: review" and sets `nearMiss` in check.json, so the researcher can flag a near miss.
- `MANUAL` means the state part is fine but a researcher must judge the panelist's answer: the line says what the correct
  answer is. Without `--answer`, tasks that ask a question end in MANUAL. With `--answer`, simple keyword checks run.
- Exit code: 0 PASS, 1 FAIL, 2 MANUAL.

```
# 4. Archive and shut down (log.jsonl, shots/, state.json, check.json, summary.json stay in $S).
node scripts/ux-panel/session.mjs stop --out $S
mkdir -p $R && cp -r $S $R/<task>-<level>-session

# 5. Write the record docs/ux/panel/<round>/<task>-<level>.md (template below).
```

Record template:

```
# <task> <title> - <level>
- Result: PASS|FAIL|MANUAL (<reason from check>)   Steps: <n> of <budget>   Time: <min>
- SEQ: <1-7>
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

- Mouse-less task T21.1: the driver refuses `click/move/drag/scroll` for that session.
- Folder pickers: the start states stub the native folder dialog (answers docs-site; login-app in launcher states). The stub
  only answers folder pickers and cancels file pickers (Attach). The in-app Browse For Folder dialog is not stubbed.
- Planned tasks (T08.2, T24.1, T24.2) have start states and checkers; run them only after the feature is merged.
- Prompts of start states are typed in the chat window like a user does; screenshots start from the window that is open
  after setup (launcher or desktop).
- T22.1/T22.2: the Help window is found by its app (`help`) and its topic, under either title ("Help and Support" or "Chat Help").
