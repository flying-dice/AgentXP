# Teams feature toggle verification (issue #52)

## Intended result

- Teams and Team Chat are disabled by default.
- Start has no Teams entry; saved Teams windows do not appear.
- Direct window opens and room API actions explain that Teams is disabled.
- Agents are not offered Teams/room tools; calling one by name is refused even with Allow policy.
- `AGENTXP_ENABLE_TEAMS=1` restores the entry and persisted windows after restart without data loss.
- Task Scheduler continues to load the shared profile/team registry.

## Manual verification

Built and launched Electron on Windows with isolated user data. Used the Windows computer-use skill / PC controls to
create "Teams toggle manual", open Start, visually confirm no Teams entry, and dismiss Start with Escape.
The launcher and desktop were inspected through accessibility trees and screenshots.

Also ran `A7_E2E_SKIP_BUILD=1` with `A7_SHOTS=docs/screenshots/teams-toggle`:
`npm run test:e2e -- e2e/teams-toggle.e2e.ts e2e/teams.e2e.ts e2e/team-room-approvals.e2e.ts`.
All 11 tests passed. Every retained PNG was opened and visually compared with the intended result.

- Normal / taskbar edge: Teams absent in Start (`teams-disabled-normal.png`).
- Maximized OS window: menu fully on screen; Teams absent (`teams-disabled-maximized.png`).
- Small 900x600 window: Teams absent, menu stays on screen (`teams-disabled-small.png`).
- Keyboard: Escape dismisses Start (both PC controls and e2e).
- Opt-in: Teams opens from Start and maximizes (`teams-enabled.png`).
- Persistence: off/on/off/on restarts hide, retain and restore the same Teams window.
- API: both window kinds and room creation refuse while disabled; tool groups omit Teams/rooms.
- Agent-related: room approvals spec passes with explicit opt-in. Policy unit tests refuse disabled tool groups even on Allow.
- Not checked: a live external agent guessing a disabled tool name (covered at policy boundary by unit tests).
- Before/after: opt-in retains the prior Teams UI; default-off screenshots show the entry removed.

## Checks

- Build and typecheck pass (0 errors, 8 existing Svelte warnings).
- 71 focused DesktopService / AppToolPolicy / Teams composition tests pass; 2 tool catalog tests pass.
- help:coverage, app:pillars, testids and e2e selector check pass.
- Full unit suite: 136 failed, 2458 passed, 1 skipped; one ACP connection closed unhandled rejection.
  All 136 failing test names also occur in the earlier unchanged Windows baseline (138 failures).
- Broader opt-in Team Chat Messenger spec: 2 failures (member activity becomes error rather than thinking;
  Stop all stays disabled). Feature repair is outside this toggle change; Teams remains disabled by default.

This change is kept in a draft PR because the repository requires every local gate to pass before merge.
