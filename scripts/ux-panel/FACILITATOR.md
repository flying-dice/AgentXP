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

`start` prints the **scenario** (give the panelist only that text), the step budget for the level (3 x Min for opus and
sonnet, 4 x Min for haiku), the preset used and facilitator notes (for example the address of the test page in T19.1).
`session.mjs task --task T05.2 --level haiku` prints it again; `session.mjs list` lists every task and its preset.

```
# 2. Spawn a fresh panelist agent (no memory of earlier sessions, Bash tool only).
#    Prompt = contents of scripts/ux-panel/PANELIST.md with LEVEL replaced
#             + "Session folder: $S" + "Step budget: <n> actions" + the scenario text
#    Nothing else: no task id, no preset, no repository hints.
#    Levels: opus -> expert, sonnet -> intermediate, haiku -> novice.
```

The panelist finishes with its final report (think-aloud, SEQ, frustrations). If it is stuck without progress, the only
allowed sentence is "Continue when you are ready"; a task that needed it is recorded as failed at that moment.

```
# 3. Check: state-based verdict from the app (PASS / FAIL / MANUAL) + step count against the budget.
node scripts/ux-panel/session.mjs check --out $S --answer "<the panelist's answer to the task question, if any>"
```

- `PASS` / `FAIL` is decided from app state (database through the app API, files on disk, desktop state), never from
  what the panelist says. Exceeding the step budget turns the verdict into FAIL (printed).
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
at the same time. The Browser test page of T19.x uses fixed port 4173; run at most one session at a time that needs it.

## Where things are

`scripts/ux-panel/tasks.mjs` maps every task to a preset. Presets: `scripts/ux-panel/presets/*.mjs` (setup only, through
`window.agent7`). Checkers: `scripts/ux-panel/checks/*.mjs`. Scripted-agent scripts for the tasks:
`scripts/ux-panel/scripts/*.json` (plus `agents/scripted-agent/scripts`).
`node scripts/ux-panel/presets-smoke.mjs [task...]` starts every start state and runs its checker once (a regression test
of the harness itself; most untouched start states must say FAIL, that is expected).

Debugging a start state: `UX_KEEP=1 node scripts/ux-panel/session.mjs start ...` keeps the app alive when a preset fails.

## Notes

- Mouse-less task T21.1: the driver refuses `click/move/drag/scroll` for that session.
- Planned tasks (T08.2, T24.1, T24.2) have start states and checkers; run them only after the feature is merged.
- Prompts of start states are typed in the chat window like a user does; screenshots start from the window that is open
  after setup (launcher or desktop).
- T22.1/T22.2 need the Help and Support app (not in the build at the time of writing); their checkers read the screen text.
