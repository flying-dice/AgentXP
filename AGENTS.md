# AgentXP: rules for agents working in this repo

AgentXP is an Electron + Svelte 5 desktop harness for ACP coding agents with a hard Windows XP (Luna) look.
Start with `README.md`, `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md`.

## Mandatory before any pull request merges

1. **Look at the change in the real app.** Build it, launch the Electron app, use the changed behaviour by hand,
   take screenshots, open them, and compare them with what the change is meant to do. Follow
   `.claude/skills/verify-change/SKILL.md`. Unit and e2e tests passing is not enough: a change that nobody has
   looked at in the running app does not merge.
2. **Say what you checked.** The PR description has a filled **Manual verification** section: each state checked
   (normal, maximized, small window, near an edge, keyboard, agent-driven where it applies), how it was checked, and
   the screenshots. Name anything you could not check.
3. **Run the local gates** and fix every failure: `npm run typecheck`, `npm test`, `npm run help:coverage`,
   `npm run app:pillars`, `node scripts/check-e2e-selectors.mjs`, and the e2e specs for the change
   (`npm run test:e2e -- e2e/<spec>.e2e.ts`). GitHub Actions results are not a substitute.
4. **Screenshots in the PR description** for any UI change.

A reviewer merging a PR checks that steps 1 to 4 are done, and sends it back if the Manual verification section is
missing or the screenshots do not show the change working.

## Building things

- New app or bringing an app up to standard: `.claude/skills/new-agentxp-app/SKILL.md` (UI, backend, agent API,
  e2e, docs; every app is chat-native).
- Every interactive element has a stable `data-testid` (`<area>-<thing>`, see `docs/CONVENTIONS.md`), so agents and
  e2e specs can find it; document it in the app's manual (Controls Reference).
- Design language: hard XP Luna. No Vista/Win7 glass, no rounded modern cards, no emoji.
