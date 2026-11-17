# Conventions for contributors (human or agent)

Read `docs/ARCHITECTURE.md` first. Reference design: `docs/design/desktop/`
(`desktop.png`, `start.png`, `tray.png` screenshots, `Desktop.dc.html` markup + behaviour of the mockup, its README),
`docs/design/XP_DESIGN_LANGUAGE.md` (the Luna rules). Tokens: `src/renderer/src/lib/kit/tokens.css`.

## Every app has five pillars

UI, backend, agent API (agentxp MCP tools), e2e and docs. `docs/APP_PILLARS.md` explains them and shows the state of
each app; `npm run app:pillars` enforces them in CI. To add an app, follow `.claude/skills/new-agentxp-app/SKILL.md`.

## Look at every change in the real app

Before a pull request merges, launch the built app, use the changed behaviour by hand, eyeball screenshots against
the intended result, and fill the PR's **Manual verification** section. See `AGENTS.md` and
`.claude/skills/verify-change/SKILL.md`. Tests passing is not enough.

## Svelte / kit

- Svelte 5 runes only. Props via `let { ..., class: className = '', ...rest } = $props()`.
  Two-way state with `$bindable()` (`bind:value`, `bind:checked`, `bind:selected`).
  Events are callback props (`onclick`, `onchange`, `onselect`), not `createEventDispatcher`.
  Content via snippets (`children`, named snippets), not slots.
- One component per file, PascalCase, WinForms control names. Layout:
  `src/renderer/src/lib/kit/<level>/<Name>.svelte` + `<Name>.stories.svelte` next to it.
  Pure helpers in `<Name>.ts` next to it when needed.
- Visuals: scoped `<style>` in the component using the `--xp-*` tokens. Add new tokens
  to `tokens.css` (append only, grouped with a comment) rather than hard-coding a colour
  that will be reused. No Tailwind, no CSS frameworks.
- Behaviour/accessibility: pure Svelte 5. No third-party UI libraries (no bits-ui, no
  shadcn). Popups, keyboard handling and ARIA are implemented in the kit; shared
  behaviour lives in `src/renderer/src/lib/kit/actions/` (Svelte actions/attachments).
- Era honesty: Windows XP Luna (Blue) / WinForms. 12px Segoe UI, 23px buttons, gradient
  faces, dotted focus rectangles, no rounded "modern" cards, no transitions beyond
  what WinXP had (hover glow fade is fine), no emoji.
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

## Help and context menus

Every app has in-app Help and a context menu. A new app is not finished without both.

- **Menu bar.** Every app window has a classic menu bar (kit `MenuStrip`): `File`, `Edit`, `View`, app menus, and `Help`, in that order. Include only the menus that have real items. `Help` is always last: `View Help` (F1), a separator, `About <App>`. Build the menus with `menuBar([...])`, `closeItems(app, close)` (File > Close, Alt+F4) and `editItems(prefix, ops, state)` from `kit/molecules/standardMenu.ts`.
- **Help.** `new AppHelp(host, '<appKind>')` (`lib/apps/shared/AppHelp.svelte.ts`) gives `help.menu()` (the Help menu) and the About state; render `<AppAbout {help} />`. View Help opens the one Help window on the topic of the app; the window is titled `AgentXP Help and Support: Using <App>` (`helpWindowTitle` in `@shared/desktop-views`). F1 on the focused window does the same, also inside the app's own inputs.
- **Context menu.** `const ctx = new ContextMenu()` (`lib/apps/shared/ContextMenu.svelte.ts`) with the kit `ContextMenuStrip`: `oncontextmenu={(e) => ctx.show(e, items())}` and `onkeydown={(e) => ctx.key(e, items)}` on the app root (Menu key and Shift+F10 open it; arrows, Enter and Esc work in the strip). Put the handler on the root so the whole window has a menu, and on rows or items that have their own. The browser's own menu never shows on the desktop. Items are built by pure functions (`explorerContext.ts`, `shared/contextItems.ts`) with tests.
- **Ask chat.** Items that hand text or a location to a chat call `host.askChat({ app, windowId, kind, text?, path?, range?, url?, title? })` and nothing else; the prompt format lives in `lib/apps/askChat.ts`.
- **Test ids.** Menu bar items `<app>-menu-<action>`, context items `<app>-ctx-<action>`, About `<app>-about` and `<app>-about-ok`. Document them in `manuals/<app>.md`.

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
`chat-message-agent`, `tool-call-card`, `uac-option-<optionId>`, `explorer-item`,
`explorer-drive-e`, `code-tab`, `code-editor`, `terminal-output`, `paint-canvas`, `notes-sticky`,
`chat-surface-row` (`data-surface-id`, `data-state` open|closed, `data-target` inline|sidebar|window; with `chat-surface-title`, `chat-surface-state`, `chat-surface-open`, `chat-surface-close`, `chat-surface-delete`, `chat-surface-move` and `chat-surface-move-inline|sidebar|window`), `chat-sidebar`, `chat-sidebar-tab` (+ `chat-sidebar-tab-close`, `chat-sidebar-resizer`), `window-surface` with `surface-app`, `event-viewer-row`, `usb-tray`, `usb-eject-e`, `autoplay-open-folder`.

**Repeated items.** A repeated item shares one id (`explorer-item`, `code-tab`, `launcher-desktop-row`,
`window-chat` for two chats) and tests pick one with `.filter({ hasText })`, `.filter({ has })` or `.nth()`.
Where the thing is a small closed set the id is unique instead: drives (`explorer-drive-e`,
`usb-eject-e`), start menu items (`start-menu-item-<appKind>`), window frames (`window-<appKind>`), tool
chips, permission options (`uac-option-<optionId>`). Rows additionally carry `data-*` attributes
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
- **Every interactive element has one** (stable, so agents can validate changes with tools as well as specs):
  native buttons, inputs, links, anything with a click / key handler or an interactive role, every kit control,
  and every menu item (`testid:` or `id:` on the `MenuItemDef`). `npm run testids` (`scripts/check-testids.mjs`)
  fails when one is missing. Popups are findable too: a menu bar menu is `menubar-<menu>-menu` (submenus
  `-sub`), a tool strip drop-down's menu `<button testid>-menu`, a context menu `context-menu`.
- New UI gets test ids as part of the change, with the same naming; do not rename existing ones lightly (specs
  depend on them).
- **Every new `data-testid` must be documented in `manuals`**: add a row to the Controls reference table of the
  manual of its app (`manuals/<appKind>.md`, `desktop.md` or `launcher.md`). `npm run help:coverage`
  (`scripts/check-help-coverage.mjs`) fails when a static id of `src/renderer/src/lib/{apps,desktop,launcher,pages}`
  is in no manual. A template id is written with its static prefix and `*` (`chat-message-*`). Kit internals
  that need no manual go on the ignore list of the script, with a reason.
  It also fails the other way round: when a control is deleted, its row must go too. An id in a Controls reference
  table that no renderer source can produce any more fails the check (ids built in ways it cannot read go on its
  `DYNAMIC_DOC_IDS` list, with a reason).

**Statuses.** `tool-call-card` carries `data-status` = `running` | `waiting` | `done` | `failed` | `cancelled` | `denied`
(`toolStatus.ts`); `topbar` carries `data-state` = `idle` | `working` | `paused`; window frames carry
`data-window-state` and `data-focused`; `chat-stop-notice` carries `data-reason` (the ACP stop reason of a turn that did not end with
`end_turn`/`cancelled`); taskbar buttons carry `data-flashing` (an agent-opened window behind the focused chat).

### Running e2e

`npm run test:e2e` runs the selector check, `electron-vite build`, then the specs
(`e2e/**/*.e2e.ts`, `vitest.e2e.config.ts`: one worker, long timeouts) on the built app.
`@playwright/test` is not a dependency; the harness uses the `playwright` library
(`_electron`) with vitest as the runner, resolved through `createRequire` so a global install
(`NODE_PATH`) works. On Linux without a display the script wraps the run in `xvfb-run -a`; on macOS and
Windows (or Linux with `DISPLAY` set) it runs directly and windows appear on screen. Extras:
`npm run test:e2e -- e2e/chat.e2e.ts` runs one spec; `A7_E2E_SKIP_BUILD=1` reuses `out/`.

Layout: `e2e/fixtures/launch.ts` (`launchAgentXP({ userData? })`: private user-data dir, built app),
`e2e/fixtures/pages/*` (page objects: `LauncherPage`, `DesktopPage`, `ChatWindow`, `ExplorerWindow`,
`CodeWindow`, `TerminalWindow`; test ids only), `e2e/fixtures/expect.ts` (`see.*` auto-retrying assertions),
`e2e/fixtures/setup.ts` and `session.ts`. **Setup only** may call `window.agentxp` through `page.evaluate`
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
- `ChatWindow`: `sessionId()`, `stop`, `errors`, `surfaces`, `surfaceRows`, `surfaceRow(title)`, `sidebar`, `sidebarTabs`, `reasoning`, `tasks`, `showTasks()`; A2UI controls are
  `a2ui-surface`, `a2ui-button`, `a2ui-textbox`, `a2ui-checkbox`.

Pattern: start the desktop, open a chat (`desktop.openApp('chat')`, or plug a project in and start from AutoPlay when the
script touches files; open Code for file reads/writes and Terminal for `terminal/*`, tools follow apps), `chat.send(...)`,
wait on test ids (`chat-transcript` has `data-running`), then compare `messageShape(...)` of a run with the expected list.
Do not assert counts of streamed chunks or STATE_DELTA events. A permission request ends the run with an `interrupt`;
answering starts a second run. Every `next()` should be followed by `control.waitForPause()` and a UI assertion.
Run with `npm run test:e2e -- e2e/scripted-demo.e2e.ts` (add `A7_E2E_SKIP_BUILD=1` to reuse `out/`).
