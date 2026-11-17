# The Five Pillars of an App

This page lists the five parts that every AgentXP app must have, and the state of each app today. It is for contributors, human or agent.

## Table of Contents

- 1 - The Rule
- 2 - The Pillars
- 3 - How the Check Works
- 4 - The Apps Today
- 5 - Need Help?

---

## 1 - The Rule

AgentXP is chat-native. An agent can do everything in an app that you can do with the mouse. An app is not finished until it has all five pillars. A pull request that adds or changes an app also shows screenshots of the app.

To build a new app, follow the skill in `.claude/skills/new-agentxp-app/SKILL.md`. Claude Code loads the skill when you ask it to add an app.

## 2 - The Pillars

| Pillar | What it means | Where it lives |
|---|---|---|
| UI | A window in the XP kit, with a menu bar, Help, a context menu, and test ids on every control. | `src/renderer/src/lib/apps/<kind>/`, `registry.ts` |
| Backend | Main-process code that owns the state of the app or does its work. The renderer is not the source of truth. | `src/main/application/<area>/`, wired in `src/main/compose.ts` |
| Agent API | Tools on the agentxp MCP server that let an agent do what the UI does, with unit tests. | `src/main/application/tools/catalog.ts` and `<group>Tools.ts`, `tools.test.ts` |
| E2E | A Playwright spec that uses the app through its test ids, beyond opening and closing it. | `e2e/<kind>.e2e.ts`, page object in `e2e/fixtures/pages/` |
| Docs | A manual in the house style that lists every control and every agent tool. | `manuals/<kind>.md`, `docs/DOCUMENTATION_STYLE.md` |

## 3 - How the Check Works

`npm run app:pillars` (`scripts/check-app-pillars.mjs`) runs in CI. It reads `scripts/app-pillars.json`, which has one entry for each app kind in `APP_KINDS`. The check fails in these cases:

- An app kind has no entry.
- A pillar is not met and the entry does not list it under `gaps` or `exempt` with a reason.
- A pillar is met but is still listed under `gaps`. Delete the gap when you close it.
- The table below is out of date. Run `node scripts/check-app-pillars.mjs --write` to update it.

What the check looks at, for each pillar:

- **UI** – The component exists, the registry has the kind, and the app has the root test id `<kind>-app`.
- **Backend** – Each listed main-process file exists.
- **Agent API** – At least one tool matches the listed names or `prefix_*` patterns, and a unit test under `src/main` names each tool.
- **E2E** – At least one listed `*.e2e.ts` spec exists, and the listed files find a control of the app (`getByTestId('<area>-...')`).
- **Docs** – The manual exists and names every agent tool of the app. `npm run help:coverage` checks that it names every control.

Use `exempt` only when a pillar can never apply. For example, the Chat app has no Agent API because the chat is the agent's own conversation. A gap is work still to do. An exemption is a design decision.

## 4 - The Apps Today

<!-- app-pillars:start -->
| App | UI | Backend | Agent API | E2E | Docs |
|---|---|---|---|---|---|
| chat | Yes | Yes | n/a | Yes | Yes |
| explorer | Yes | Yes | Yes | Yes | Yes |
| notepad | Yes | Yes | Yes | Yes | Yes |
| code | Yes | Yes | Yes | Yes | Yes |
| terminal | Yes | Yes | Yes | Yes | Yes |
| browser | Yes | Yes | Yes | Yes | Yes |
| control-centre | Yes | Yes | Yes | Yes | Yes |
| agent-manager | Yes | Yes | Yes | Yes | Yes |
| paint | Yes | Yes | Yes | Yes | Yes |
| wordpad | Yes | Yes | Yes | Yes | Yes |
| sticky-notes | Yes | Yes | Yes | Yes | Yes |
| kanban | Yes | Yes | Yes | Yes | Yes |
| diagrams | Yes | Yes | Yes | Yes | Yes |
| event-viewer | Yes | Yes | Yes | Yes | Yes |
| snipping-tool | Yes | Yes | Yes | Yes | Yes |
| recycle-bin | Yes | Yes | Yes | Yes | Yes |
| surface | Yes | Yes | Yes | Yes | Yes |
| help | Yes | Yes | Yes | Yes | Yes |
| code-review | Yes | Yes | Yes | Yes | Yes |
| teams | Yes | Yes | Yes | Yes | Yes |
| team-chat | Yes | Yes | Yes | Yes | Yes |
| task-scheduler | Yes | Yes | Yes | Yes | Yes |

0 open gap(s).

- **chat, Agent API** (not needed): The chat is the agent's own conversation. The agent acts through it, not on it.
<!-- app-pillars:end -->

## 5 - Need Help?

- Read `docs/CONVENTIONS.md` for the kit, test ids, and e2e rules.
- Read `docs/ARCHITECTURE.md` for the layers of the main process.
- Read `docs/DOCUMENTATION_STYLE.md` before you write a manual.
