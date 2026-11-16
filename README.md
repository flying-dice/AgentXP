# AgentXP

A Windows 7 era desktop harness for coding agents speaking the
[Agent Client Protocol](https://agentclientprotocol.com).

Electron + electron-vite + Svelte 5 + shadcn-svelte, SQLite (better-sqlite3),
a complete atomic-design WinForms UI kit in Storybook, and A2UI so agents can
draw with that kit.

## Getting started

```bash
npm install          # also rebuilds better-sqlite3 for Electron
npm run dev          # launch the app
npm run storybook    # browse the WinForms UI kit
npm run typecheck
npm test
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and
[docs/design](docs/design) for the reference mockup.
