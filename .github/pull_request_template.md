## Summary

<!-- What changed and why. -->

## Screenshots

<!-- Required for any UI change: the app window, a dialog, and the agent using it in a chat. -->

## Manual verification

<!-- Required before merge (AGENTS.md, .claude/skills/verify-change). Launch the built app, use the change by hand,
     open the screenshots and compare them with the intended result. List each state checked and how. -->

- [ ] Launched the real app and used the changed behaviour by hand
- [ ] Checked: normal / maximized / small window / near an edge / keyboard / agent-driven (as they apply)
- [ ] Screenshots opened and compared with the intended result (embedded above)
- How:
- Not checked (and why):

## Five pillars (for a new or changed app, see docs/APP_PILLARS.md)

- [ ] UI: XP kit window, menu bar, Help, context menu, test ids
- [ ] Backend: main-process service, persistence, push events, unit tests
- [ ] Agent API: a tool for every UI action, policy group, unit tests naming every tool
- [ ] E2E: user flows and one agent-driven flow
- [ ] Docs: manual with Controls Reference and What the Agent Can Do (`npm run help:coverage`, `npm run app:pillars`)
