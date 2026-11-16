# Agent7

A Windows 7 era desktop harness for coding agents speaking the
[Agent Client Protocol](https://agentclientprotocol.com).

Electron + electron-vite + Svelte 5, SQLite (built-in `node:sqlite`), our own
complete atomic-design WinForms UI kit (pure Svelte, no UI libraries) in Storybook, and A2UI so agents can
draw with that kit.

## Getting started

```bash
npm install          # no native modules to rebuild
npm run dev          # launch the app
npm run storybook    # browse the WinForms UI kit
npm run typecheck
npm test
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and
[docs/design](docs/design) for the reference mockup.
