# Scripted ACP agent

A fake ACP agent for end-to-end tests of Agent7. A JSON script says which prompt produces which
output (messages, plans, tool calls, permission requests, file and terminal requests, calls to the
`agent7` MCP server, errors) and whether each step runs by itself or waits for `next`. Use it to test
the sequence and timing of the ACP to AG-UI event flow without a real model.

## Run it

```
node --experimental-strip-types --no-warnings agents/scripted-agent/index.ts --script demo
npm run agent:scripted -- --script stepping
ELECTRON_RUN_AS_NODE=1 electron out/main/scripted-agent.js --script <file>   # after `npm run build`
```

`--script` takes a path, or the name of a script in `scripts/` (with or without `.json`). Without it the
agent reads env `AGENT7_SCRIPT`, then falls back to `demo`. An invalid script exits with code 1 and
`scripted-agent: Invalid script <file>: <json path>: <reason>` on stderr.

Add it in Agent7: Control Centre, Agents, Add:

| Field   | Value |
|---------|-------|
| Command | `node` |
| Args    | `--experimental-strip-types --no-warnings <repo>/agents/scripted-agent/index.ts --script <file>` |
| Env     | optional `AGENT7_SCRIPT_CONTROL=<socket path>` to step from a test |

(Or command `electron` with env `ELECTRON_RUN_AS_NODE=1` and arg `<repo>/out/main/scripted-agent.js`.)
The `--experimental-strip-types` flag needs Node 22.6 or newer. The source uses plain TypeScript only
(type-only imports, no enums, no parameter properties) so that it runs unbundled.

## Built into Agent7

Agent7 seeds an agent named **Scripted Agent** at every start (idempotent, `ensureBuiltinAgents` in
`src/main/application/BuiltinAgents.ts`): command = the app's own Electron binary, env `ELECTRON_RUN_AS_NODE=1`,
args `<out/main>/scripted-agent.js --script demo`. An existing row keeps your edits (other args and env, default flag);
only the command, the entry-file path (it moves with the install) and the env defaults are refreshed. The build copies
`scripts/` to `out/main/scripts/`, so `--script <name>` works in dev (`electron-vite dev`), built and packaged runs.
Edit the agent in the Control Centre to pick another script (`--script stepping`) or add `AGENT7_SCRIPT_CONTROL`.
The agent7 MCP child (`mcpCall`) gets `ELECTRON_RUN_AS_NODE` from the harness's `session/new` config.

## Script reference

Add `"$schema": "./script.schema.json"` (or `../script.schema.json` inside `scripts/`) for editor
completion. The validator rejects unknown fields (typos) and names the JSON path of every problem.

Top level: `name`, `description?`, `agent`, `defaults?`, `rules`, `fallback?`.

| Field | Meaning |
|-------|---------|
| `agent` | `{ name, version, modes?, models?, commands? }`. `modes`/`models` (`{id, name, description?}`) are returned by `session/new` (first one is current). `commands` are advertised as ACP slash commands next to the control commands. |
| `defaults.stepMode` | `auto` (default) or `manual`; per-step `step` overrides it. |
| `defaults.delayMs` | Sleep before every step (per-step `delayMs` overrides). |
| `defaults.chunkSize` | Split `message`/`thought` text into chunks of this many characters. |
| `defaults.chunkDelayMs` | Sleep between chunks. |
| `defaults.announcePause` | Send a thought chunk `[paused before step ...]` when a turn waits for `next`. |
| `rules[]` | `{ id, match, once?, steps }`. First matching rule wins; a `once` rule is skipped after it fired. |
| `fallback` | Steps when no rule matches (default: one message saying so). |

`match` is exactly one of `{ equals }` (trimmed), `{ contains }`, `{ regex }` (each with optional
`ignoreCase`) or `{ any: true }`. The prompt text is the text blocks of the ACP prompt joined with
newlines; resource blocks do not take part, but `agent7://desktop/state` is exposed as `{{desktop}}`.

### Steps

Every step is `{ "type": ..., ...fields }` plus optional `step` (`auto`|`manual`), `delayMs` and `label`.

| `type` | Fields | Effect |
|--------|--------|--------|
| `message` | `text`, `chunked?` | `agent_message_chunk` (`chunked`: `true`, a size, or `false` to opt out of `defaults.chunkSize`) |
| `thought` | `text`, `chunked?` | `agent_thought_chunk` |
| `plan` | `entries[{content,status,priority}]` | `plan` |
| `toolCall` | `id`, `title`, `kind?`, `status?`, `rawInput?`, `locations?`, `content?` | `tool_call`. `content` items are `{text}` or `{diff:{path,oldText?,newText}}` |
| `toolCallUpdate` | `id`, `status?`, `title?`, `content?`, `rawOutput?` | `tool_call_update` |
| `requestPermission` | `toolCallId`, `title?`, `options[{optionId,name,kind}]`, `branches?` | `session/request_permission`; the answer selects `branches[optionId]` (or `branches.cancelled`) and runs those steps (nest freely). Sets `{{permission}}`. |
| `readFile` | `path`, `line?`, `limit?`, `saveAs?` | `fs/read_text_file`; text goes to variable `saveAs` |
| `writeFile` | `path`, `content` | `fs/write_text_file` |
| `terminal` | `command`, `args?`, `cwd?`, `waitForExit?` (default true), `saveAs?` | terminal create, wait, output, release; output in `saveAs`, exit code in `<saveAs>.exitCode` |
| `mcpCall` | `server`, `tool`, `arguments?`, `saveAs?`, `report?`, `id?` | calls a tool of an MCP server from `session/new` (stdio, http or sse; connected on first use). Emits `tool_call` (in_progress) and `tool_call_update` (completed/failed) unless `report: false`. Text result in `saveAs`, `<saveAs>.isError` is `true`/`false`. A refused call is a result, not a failure. |
| `modeChange` | `modeId` | `current_mode_update` |
| `usage` | `used`, `size` | `usage_update` |
| `availableCommands` | `commands[{name,description,hint?}]` | `available_commands_update` |
| `sessionInfo` | `title` | `session_info_update` |
| `wait` | `ms` | sleep (cancellable) |
| `expect` | `from`, one of `contains`/`equals`/`regex`, `message?` | fails the turn with a JSON-RPC error when the variable does not satisfy it |
| `error` | `message`, `code?` | rejects the prompt with a JSON-RPC error (default -32603) |
| `end` | `stopReason` | ends the turn now (`end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, `cancelled`); a turn that runs out of steps ends with `end_turn` |

### Templates and variables

`{{name}}` in any string of a step (including nested `arguments`/`rawInput`) is replaced just before the
step runs; an unknown name fails the turn (so typos are loud). Variables: `prompt`, `cwd`, `desktop`,
`sessionId`, regex captures `match.0`, `match.1`, `match.<groupName>`, `permission`, and everything stored
with `saveAs`. Only `branches` is rendered later, when a branch actually runs.

For `readFile` and `terminal`, a failing client request is captured when `saveAs` is set (text becomes the
error message, `<saveAs>.isError` is `true`) and fails the turn otherwise. That lets a script assert on
refusals such as an ejected drive.

### Samples (`scripts/`)

| Script | Shows |
|--------|-------|
| `demo.json` | greeting rule; plan, read README, edit proposal with allow/deny/cancelled branches, `npm test` in a terminal, usage, done |
| `a2ui.json` | `agent7.a2ui_render` with a small WinForms form; the prompt picks the `target`: "window" (own desktop window), "sidebar" (beside the chat), "update" (changes the window surface, reports the tool's note about a closed window), anything else inline. `expect` on the `ok` answer |
| `desktop.json` | `desktop_open_app` then `terminal_run`; a prompt containing "closed" calls `terminal_run` with the Terminal closed and expects `is closed` |
| `stepping.json` | every step manual and labelled |
| `errors.json` | prompts containing `error`, `refuse`, `long`, `cancelled`, `expect`, `template`, `slow` take the failure paths |

## Stepping

A step is *manual* when `step: "manual"` (or `defaults.stepMode: "manual"`). Before it, the turn pauses
(nothing is sent) until it gets `next`. Pauses inside permission branches count too; the status `path`
looks like `3/allow/0`. A forced mode overrides the per-step setting: `auto` runs everything (and
releases a pause), `manual` pauses before every step, `script` gives control back to the script.

There are two ways to control it:

1. **Control socket** (reliable). Set env `AGENT7_SCRIPT_CONTROL` to a Unix socket path or a Windows named
   pipe (`\\.\pipe\name`) and the agent listens there.
2. **Chat commands** `/next`, `/auto`, `/manual`, `/script`, `/status`, advertised as ACP available
   commands. Honest limit: ACP allows one prompt per turn and Agent7 does not send a second prompt while a
   turn runs, so while a turn is paused you cannot type `/next` in that chat. The commands work when the
   agent is idle (`/manual` or `/auto` set the mode for future turns, `/status` prints the state) and from a
   *different* chat on the same agent process (`/next` there releases the pause of the first). The control
   socket is the way to release a pause in the same chat.

`next` keeps no credit: with nothing paused it does nothing (`released: false`), so wait for the pause first.

### Control socket protocol

Newline-delimited JSON, one command per line.

| Command | Effect |
|---------|--------|
| `{"cmd":"next"}` | release the oldest paused turn; reply has `released: true/false` |
| `{"cmd":"auto"}` / `{"cmd":"manual"}` / `{"cmd":"script"}` | force a stepping mode / give control back to the script |
| `{"cmd":"status"}` | status only |
| `{"cmd":"load","path":"<file or name>"}` | replace the script for future turns (resets `once` rules) |

Every command may carry an `id`, echoed in the reply. Replies:
`{"ok":true,"cmd":"next","released":true,"state":"paused","mode":"script","rule":"work","stepIndex":2,"path":"2","stepType":"plan","label":"plan","script":"demo"}`
(`state` is `idle`, `running` or `paused`) or `{"ok":false,"cmd":...,"error":"..."}`.

Pushed to every connected client: `{"event":"paused", ...status}`, `resumed`, `turn_started`, `mode`, and
`{"event":"turn_ended","stopReason":"end_turn"|...|"error", ...status}`.

### Cancellation

`session/cancel` aborts the running turn (sleeping, paused, waiting on a terminal or MCP call) and the
prompt answers `stopReason: "cancelled"`. A pending permission request is answered by the client.

## Writing a scripted e2e test

The e2e suite has fixtures for this (`e2e/fixtures/scripted.ts`; conventions in `docs/CONVENTIONS.md`, "Scripted agent specs"):

```ts
const ctx = await startScriptedDesktop({ script: 'stepping', stepMode: 'manual' })   // built agent + control socket
await ctx.desktop.openApp('chat')
const chat = ctx.desktop.chat()
await chat.send('go')
const control = await ctx.scripted.control()
expect((await control.waitForPause()).label).toBe('first message')   // nothing visible yet
await control.next()                                                // exactly one UI change per next()
await control.waitForPause()
await see.count(chat.agentMessages, 1)
const sessionId = await chat.sessionId()
const agui = aguiRuns(await protocolEvents(ctx.desktopPage, { source: 'ag-ui', sessionId }))
expect(messageShape(agui[1])).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_START', /* ... */ 'RUN_FINISHED'])
await ctx.close()
```

Write a new script in `scripts/` (or pass a path) for a new scenario; give steps a `label` so `status()` names them.
Scripts call the real agent7 MCP tools (`desktop_open_app`, `terminal_run`, `a2ui_render`, ... see
`src/main/application/tools/catalog.ts`); a `contains`/`regex` rule on the prompt picks the scenario. A2UI actions come
back as a hidden prompt ("The user triggered the action ...") that a rule can match.

## E2E example

```ts
import { connect } from '../../agents/scripted-agent/controlClient'

const socket = '/tmp/agent7-script.sock' // same value as AGENT7_SCRIPT_CONTROL in the agent's env
const control = await connect(socket)
await control.setMode('manual')           // every step waits (script: demo)

// ...type a prompt in the Agent7 UI...
const paused = await control.waitForPause()   // { state: 'paused', rule: 'work', stepIndex: 0, label: 'acknowledge', ... }
// assert the UI shows nothing yet, then
await control.next()
await control.waitForPause()                  // before the next step; assert the first event arrived

await control.setMode('auto')                 // run the rest
control.close()
```

`ControlClient`: `status()`, `next()`, `setMode('auto'|'manual'|'script')`, `load(path)`,
`waitForPause(timeoutMs?)`, `waitForEvent(kind, timeoutMs?)`, `send(raw)`, `events` (every pushed event),
`close()`.

## Files

`index.ts` entry and argument handling, `script.ts` types and validator, `script.schema.json` editor
schema, `matcher.ts` rule selection, `template.ts` `{{var}}`, `runner.ts` turn flow, `actions.ts` what each
step does, `control.ts` stepping state and socket server, `controlClient.ts` test helper, `mcp.ts` MCP
client for `mcpCall`, `agent.ts` ACP handlers, `testkit.ts` in-memory ACP client used by the tests.

Tests: `npx vitest run agents/scripted-agent` (also part of `npm test`).

## Limits

Prompts are matched on text only. One script per process (`load` swaps it). `loadSession` is accepted
but replays no history. Permission `branches` cannot be reached for options that the client does not
offer. Authentication, `session/list` and config options are not implemented.
