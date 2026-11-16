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
- Visuals: scoped `<style>` in the component using the `--xp-*` tokens. Add new tokens
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
- Domain and application code never import `electron`, `better-sqlite3` or the ACP SDK.
- Tests: vitest, `*.test.ts` next to the code (`npm test`).

## Verification

- `npm run typecheck` must pass with 0 errors.
- Kit work: `npx storybook build -o <tmpdir> --quiet` must succeed.
- Do not run git commands and do not install npm packages; if you need a
  package, say so in your final report.
