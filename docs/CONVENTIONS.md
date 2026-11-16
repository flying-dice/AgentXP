# Conventions for contributors (human or agent)

Read `docs/ARCHITECTURE.md` first. Reference design: `docs/design/main-window.png`
(screenshot), `docs/design/main-window.dc.html` (markup + behaviour of the mockup),
`docs/design/win7.css` (the mockup's control CSS). Tokens: `src/renderer/src/lib/kit/tokens.css`.

## Svelte / kit

- Svelte 5 runes only. Props via `let { ..., class: className = '', ...rest } = $props()`.
  Two-way state with `$bindable()` (`bind:value`, `bind:checked`, `bind:selected`).
  Events are callback props (`onclick`, `onchange`, `onselect`), not `createEventDispatcher`.
  Content via snippets (`children`, named snippets), not slots.
- One component per file, PascalCase, WinForms control names. Layout:
  `src/renderer/src/lib/kit/<level>/<Name>.svelte` + `<Name>.stories.svelte` next to it.
  Pure helpers in `<Name>.ts` next to it when needed.
- Visuals: scoped `<style>` in the component using the `--w7-*` tokens. Add new tokens
  to `tokens.css` (append only, grouped with a comment) rather than hard-coding a colour
  that will be reused. No Tailwind, no CSS frameworks.
- Behaviour/accessibility: pure Svelte 5. No third-party UI libraries (no bits-ui, no
  shadcn). Popups, keyboard handling and ARIA are implemented in the kit; shared
  behaviour lives in `src/renderer/src/lib/kit/actions/` (Svelte actions/attachments).
- Era honesty: Windows 7 Aero Basic / WinForms. 12px Segoe UI, 23px buttons, gradient
  faces, dotted focus rectangles, no rounded "modern" cards, no transitions beyond
  what Win7 had (hover glow fade is fine), no emoji.
- Every component: a Storybook story file using `@storybook/addon-svelte-csf` v5
  (`defineMeta` in `<script module>`), title `Atoms/<Name>`, `Molecules/<Name>`, etc.,
  covering default, disabled and each meaningful variant/state, with `argTypes` so
  controls work.
- No barrel `index.ts` files in kit folders unless your task says so.

## TypeScript / main

- Strict TS, no `any` (use `unknown` and narrow). Small classes/functions, SRP.
  Constructor injection; no module-level mutable singletons.
- Domain and application code never import `electron`, `node:sqlite` or the ACP SDK.
- Tests: vitest, `*.test.ts` next to the code (`npm test`).

## Verification

- `npm run typecheck` must pass with 0 errors.
- Kit work: `npx storybook build -o <tmpdir> --quiet` must succeed.
- Do not run git commands and do not install npm packages; if you need a
  package, say so in your final report.

## Test ids

End-to-end specs (`e2e/`, Playwright driving the built app; see "Running e2e" below) find elements
**only** by `data-testid`.

**Locator rule.** Only `getByTestId(...)` locators, optionally chained with `.filter({ hasText })`,
`.filter({ has: getByTestId(...) })`, `.nth()`, `.first()` / `.last()` and scoping through another test-id
locator (`frame.getByTestId('window-close')`). No CSS, XPath, `locator(`, `$(`, `getByRole`, `getByText`,
`getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, no `data-*` attribute selectors, and no
string-selector shortcuts such as `page.click('#x')`. `scripts/check-e2e-selectors.mjs` fails the build when
an e2e file breaks this (it runs first in `npm run test:e2e` and in CI). Assertions may read `data-*`
attributes of a located element (`getAttribute('data-status')`); that is not selecting.

**Naming.** kebab-case, `<area>-<thing>[-<qualifier>]`: the area is the owning app or shell part
(`launcher`, `taskbar`, `start-menu`, `topbar`, `window`, `action-center`, `uac`, `chat`, `explorer`, `code`,
`terminal`, `paint`, `notes`, `event-viewer`, `usb`, `autoplay`, ...). Examples: `launcher-desktop-row`,
`launcher-connect`, `taskbar-start`, `start-menu-item-notepad`, `window-explorer`, `window-close`,
`topbar-pause`, `topbar-tool-chip-terminal` (dots become dashes: `topbar-tool-chip-fs-read`),
`action-center-flag`, `uac-allow`, `chat-composer-input`, `chat-send`, `chat-transcript`,
`chat-message-agent`, `tool-call-card`, `permission-option-<optionId>`, `explorer-item`,
`explorer-drive-e`, `code-tab`, `code-editor`, `terminal-output`, `paint-canvas`, `notes-sticky`,
`event-viewer-row`, `usb-tray`, `usb-eject-e`, `autoplay-open-folder`.

**Repeated items.** A repeated item shares one id (`explorer-item`, `code-tab`, `launcher-desktop-row`,
`window-chat` for two chats) and tests pick one with `.filter({ hasText })`, `.filter({ has })` or `.nth()`.
Where the thing is a small closed set the id is unique instead: drives (`explorer-drive-e`,
`usb-eject-e`), start menu items (`start-menu-item-<appKind>`), window frames (`window-<appKind>`), tool
chips, permission options (`permission-option-<optionId>`). Rows additionally carry `data-*` attributes
for disambiguation by humans and for assertions (`data-window-id`, `data-session-id`, `data-path`,
`data-row-id`, `data-source`, `data-name`, `data-status`); tests never select by them.

**Where ids live.**
- Kit atoms/molecules/organisms take an optional `testid` prop (ComboBox, CheckBox, Form, Dialog, ListView,
  TreeView, DataGridView, TabControl items, StatusStripLabel, MenuItem via `MenuItemDef.testid`,
  Taskbar via `TaskbarItem.testid`, ...) or forward `data-testid` through rest props (Button, TextBox,
  ToolStripButton). Controls with a fixed structure hard-code theirs: `window-title`, `window-minimize`,
  `window-maximize`, `window-close` (every title bar; scope them through the window frame),
  `dialog-button-<result>`, `taskbar-start`, `start-menu-*`, `action-center-*`.
- `ListView` / `DataGridView` rows take `rowTestid` (or a per-row `testid` field) and extra `data-*`
  attributes through a row's `attrs` field.
- App windows: `AppWindowFrame` sets `data-testid="window-<appKind>"` plus `data-window-id`; each app root is
  `<app>-app` (`notepad-app`, `code-app`, ...).
- New UI gets test ids as part of the change, with the same naming; do not rename existing ones lightly (specs
  depend on them).

**Statuses.** `tool-call-card` carries `data-status` = `running` | `waiting` | `done` | `failed` | `cancelled`
(`toolStatus.ts`); `topbar` carries `data-state` = `idle` | `working` | `paused`; window frames carry
`data-window-state` and `data-focused`.

### Running e2e

`npm run test:e2e` runs the selector check, `electron-vite build`, then the specs
(`e2e/**/*.e2e.ts`, `vitest.e2e.config.ts`: one worker, long timeouts) on the built app.
`@playwright/test` is not a dependency; the harness uses the `playwright` library
(`_electron`) with vitest as the runner, resolved through `createRequire` so a global install
(`NODE_PATH`) works. On Linux without a display the script wraps the run in `xvfb-run -a`; on macOS and
Windows (or Linux with `DISPLAY` set) it runs directly and windows appear on screen. Extras:
`npm run test:e2e -- e2e/chat.e2e.ts` runs one spec; `A7_E2E_SKIP_BUILD=1` reuses `out/`.

Layout: `e2e/fixtures/launch.ts` (`launchAgent7({ userData? })`: private user-data dir, built app),
`e2e/fixtures/pages/*` (page objects: `LauncherPage`, `DesktopPage`, `ChatWindow`, `ExplorerWindow`,
`CodeWindow`, `TerminalWindow`; test ids only), `e2e/fixtures/expect.ts` (`see.*` auto-retrying assertions),
`e2e/fixtures/setup.ts` and `session.ts`. **Setup only** may call `window.agent7` through `page.evaluate`
(registering the fake agent, adding a temp workspace, plugging it in as a USB drive, setting the terminal
policy, reading a desktop id); everything a test asserts or clicks goes through the UI. Specs never sleep:
they wait on test ids and states.

### Scripted agent specs

`e2e/scripted-*.e2e.ts` drive the built app with the scripted ACP agent (`agents/scripted-agent/`, README there): a JSON
script decides what the "model" says and does, so a spec can assert the exact ACP and AG-UI traffic and the UI at
each step. Fixtures in `e2e/fixtures/scripted.ts`:

- `startScriptedDesktop({ script, stepMode?, title? })`: app + desktop + the BUILT agent (`out/main/scripted-agent.js`
  on Electron's node mode) as the default agent. `script` is a name from `agents/scripted-agent/scripts/` or a path;
  `stepMode: 'manual'` overrides `defaults.stepMode` in a temp copy, so the first turn already pauses (no race).
  `ctx.scripted.control()` returns a connected `ControlClient` (`next`, `status`, `setMode`, `waitForPause`, `events`).
  `ctx.close()` stops everything. `useScriptedAgent(page, opts)` is the lower-level piece (the `agent` option of
  `startConnectedDesktop`); each registration gets its own control socket in a temp dir.
- `protocolEvents(page, { source: 'acp' | 'ag-ui' | 'mcp', sessionId })` reads the app's event log (the Event Viewer's
  data). It lives in `setup.ts` (`readProtocolEvents`) as read-only test instrumentation, the only way to assert the
  order of protocol messages. Helpers: `aguiRuns` (split at RUN_STARTED; run 0 is the connect/attach run),
  `messageShape` (names without `STATE_*`, repeated streaming events collapsed), `deltaPaths`, `outcomeOf`,
  `containsInOrder`, `collapseRuns`, `payloadOf`. ACP names are the JSON-RPC method, responses `<method> (response)`.
- `ChatWindow`: `sessionId()`, `stop`, `errors`, `surfaces`, `reasoning`, `tasks`, `showTasks()`; A2UI controls are
  `a2ui-surface`, `a2ui-button`, `a2ui-textbox`, `a2ui-checkbox`.

Pattern: start the desktop, open a chat (`desktop.openApp('chat')`, or plug a project in and start from AutoPlay when the
script touches files; open Code for file reads/writes and Terminal for `terminal/*`, tools follow apps), `chat.send(...)`,
wait on test ids (`chat-transcript` has `data-running`), then compare `messageShape(...)` of a run with the expected list.
Do not assert counts of streamed chunks or STATE_DELTA events. A permission request ends the run with an `interrupt`;
answering starts a second run. Every `next()` should be followed by `control.waitForPause()` and a UI assertion.
Run with `npm run test:e2e -- e2e/scripted-demo.e2e.ts` (add `A7_E2E_SKIP_BUILD=1` to reuse `out/`).
