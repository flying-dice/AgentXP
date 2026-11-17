---
name: new-agentxp-app
description: Use when adding a new app (a new AppKind / window) to the AgentXP desktop, or when bringing an existing app up to standard. Walks through all five pillars (XP-kit UI, main-process backend, agentxp MCP agent API, e2e tests, manual) plus the pillar check and PR screenshots, so no app ships half-built.
---

# Adding an AgentXP app (all five pillars, no half-baked apps)

AgentXP is **chat-native**: an agent must be able to do everything a person can do in the app's UI, through tools
on the agentxp MCP server. An app is only finished when it has all five pillars:

| Pillar | Done means |
|---|---|
| **UI** | A window built from the XP kit, registered, with menu bar, Help, context menu and a test id on every control |
| **Backend** | Main-process code owns the app's state / does its work (the renderer is a view, not the source of truth) |
| **Agent API** | `catalog.ts` tools + handlers that cover every UI action, with unit tests, gated by the Control Center policy |
| **E2E** | A Playwright spec that *uses* the app through test ids (not just open/close), incl. an agent-driven path |
| **Docs** | `manuals/<kind>.md` in the house style, listing every control and every agent tool |

`npm run app:pillars` (CI) enforces this from `scripts/app-pillars.json`. Do not "fix" a failure by adding a gap:
a gap is only for work that is genuinely out of scope of your change, with a reason, and someone will ask about it.

Before you start, read: `docs/APP_PILLARS.md`, `docs/CONVENTIONS.md`, `docs/ARCHITECTURE.md`,
`docs/DOCUMENTATION_STYLE.md`, `docs/design/XP_DESIGN_LANGUAGE.md`. The Agent Diagrams commit (`git show d1447c0 --stat`)
and the Kanban app (`src/main/application/kanban`, `tools/boardTools.ts`, `apps/kanban`) are good full examples.

## 0. Plan the app as a list of actions first

Write down every action a person can take in the app (create, rename, move, delete, run, export, read state, ...).
That list drives everything else: each action gets a UI control **and** an agent tool **and** a test **and** a
line in the manual. If an action cannot sensibly be an agent tool (for example, it would let an agent raise its own
permissions), the tool must still exist but always ask the user (`ToolGateway.ask`), or the manifest must record an
`exempt` reason that a reviewer can agree with.

## 1. Register the app kind

- `src/shared/desktop.ts`: add the kind to `APP_KINDS`, `APP_DISPLAY_NAMES`; to `AGENT_OPENABLE_APPS` if the agent
  may open it; to `SINGLETON_APPS` if one window per desktop.
- `src/shared/desktop-views.ts`: default window placement, `MIN_WINDOW_SIZES` if needed, and the app's view state
  (what `desktop_state` shows the agent about an open window).
- DB migration `src/main/infrastructure/db/migrations/0NN_<kind>.ts` (`INSERT OR IGNORE INTO app_kinds ...` plus any
  tables), registered in `migrations/index.ts`.
- `scripts/app-pillars.json`: add the entry now, with every pillar's files, so the check guides you.

## 2. UI (renderer, XP kit)

- `src/renderer/src/lib/apps/<kind>/<Name>App.svelte`, registered in `apps/registry.ts`, root `data-testid="<kind>-app"`.
- Only kit components (`lib/kit`), Svelte 5 runes, `--xp-*` tokens, Luna look, no emoji, no third-party UI libs.
- Menu bar (`menuBar`, `closeItems`, `editItems`), `AppHelp` + `<AppAbout>`, `ContextMenu`; F1 opens its manual.
- Start menu entry and desktop icon if it belongs there; `chatPane.ts` if it has a chat pane.
- Every interactive element gets a `data-testid` named `<area>-<thing>` (see CONVENTIONS "Test ids").
- Keep logic in pure `.ts` helpers next to the component, with `*.test.ts`. A Storybook story for new kit parts.
- The window must follow changes made by the agent live (subscribe to the backend's push events), not only its own.

## 3. Backend (main process)

- A service under `src/main/application/<area>/` that owns the state and rules. No `electron`, `node:sqlite` or
  ACP imports there (ports in `ports.ts`, adapters in `infrastructure/`).
- Persistence through a repository in `infrastructure/db/` if the app has data; files go through the VFS.
- IPC: methods on `AgentXPApi` (`src/shared/ipc.ts`), handlers in `src/main/ipc/`, preload, push events so every
  open window updates. Wire it in `src/main/compose.ts`.
- If the app is a pure view of a window (canvas, editor), the agent reaches it through `AppRequestBroker`; the
  backend part is then the broker requests plus whatever file saving the app does.
- Unit tests for the service (`*.test.ts` next to it, `npm test`).

## 4. Agent API (the agentxp MCP server)

- Tool definitions in `src/main/application/tools/catalog.ts` (`TOOL_DEFS`): `<prefix>_<verb>` names, a clear
  description that tells the agent when to use it, a zod input with `.describe()` on every field.
- Handlers in `src/main/application/tools/<group>Tools.ts`, added to the handler map in `compose.ts`.
  Handlers call the same backend service as the UI (one code path), and only touch the caller's desktop.
- A tool group: `TOOL_GROUPS`, `TOOL_GROUP_PROVIDERS` (which app enables it) or `ALWAYS_ON_TOOL_GROUPS`,
  `TOOL_GROUP_APP`, `DEFAULT_TOOL_POLICY`, `PERMISSION_NAMES` (`src/shared/permissionNames.ts`), `AppToolPolicy.ts`
  labels, the Control Center `permissionsTable.ts` row, and `desktop_open_app`'s description.
- Coverage rule: **every UI action from step 0 has a tool**, and every read the UI shows has a read tool.
  Mention the tools in `DESKTOP_INSTRUCTIONS` if agents need to know when to use them.
- Unit tests in `tools.test.ts` (or `<group>Tools.test.ts`) that name every tool: success, bad input, wrong desktop.
- If agents need a worked flow, add a scripted-agent script under `agents/scripted-agent/scripts/`.

## 5. E2E (Playwright on the built app)

- `e2e/<kind>.e2e.ts` and a page object `e2e/fixtures/pages/<Name>Window.ts`. Locators: `getByTestId` only
  (`scripts/check-e2e-selectors.mjs`). No sleeps: wait on test ids and `data-*` states.
- Cover the main user flows through the UI, and at least one agent flow: a scripted agent
  (`e2e/fixtures/scripted.ts`) calls the app's tools and the spec asserts the window updates.
- Add the app to the smoke list in `e2e/apps.e2e.ts`.
- Run: `npm run test:e2e -- e2e/<kind>.e2e.ts` (add `A7_E2E_SKIP_BUILD=1` to reuse `out/`).

## 6. Docs

- `manuals/<kind>.md` following `docs/DOCUMENTATION_STYLE.md` (Simplified Technical English, numbered chapters,
  "Need Help?" last) and the manual chapter shape in `manuals/index.md`.
- **Controls Reference** table: one row per `data-testid` (`npm run help:coverage` fails otherwise).
- **What the Agent Can Do** chapter: one row per agent tool, by its exact name, and the Control Center permission
  that governs it (`npm run app:pillars` fails if a tool is missing).
- Link it from `manuals/index.md` and `manuals/desktop.md`; update `README.md` chapter 9 if it is a headline app.
- Screenshots for the manual go in `docs/images/` (`npm run docs:screenshots` patterns in `scripts/docs-screenshots/`).

## 7. Verify, then open the PR

Run all of these and fix every failure (re-run only what failed while fixing):

```sh
npm run typecheck
npm test
npm run help:coverage
npm run app:pillars          # add --write to refresh the table in docs/APP_PILLARS.md
node scripts/check-e2e-selectors.mjs
npm run test:e2e -- e2e/<kind>.e2e.ts e2e/apps.e2e.ts
```

The pull request description must include:

- **Screenshots** of the app window (main view, a dialog or two) and of the agent using it in a chat.
  Take them with Playwright from the built app (deviceScaleFactor 2), commit them under `docs/images/`, and embed
  them in the description.
- The five-pillar checklist below, every box ticked or explained:

```md
- [ ] UI: XP kit window, menu bar, Help, context menu, test ids
- [ ] Backend: main-process service + persistence + push events, unit tests
- [ ] Agent API: a tool for every UI action, policy group, unit tests naming every tool
- [ ] E2E: user flows + one agent-driven flow
- [ ] Docs: manual with Controls Reference and What the Agent Can Do; help:coverage and app:pillars pass
- [ ] Screenshots in this description
```
