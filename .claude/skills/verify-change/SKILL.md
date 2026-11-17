---
name: verify-change
description: Use before opening or merging ANY AgentXP pull request that changes what a person sees or does (UI, kit components, menus, dialogs, layout, app behaviour, agent tools that move the UI). Launch the real Electron app, exercise the change by hand, eyeball screenshots against the intended result, and write down in the PR what was checked and how. Passing unit and e2e tests is not enough.
---

# Verify a change in the real app before it merges

Tests check what someone thought to assert. They do not see that a menu covers its own label, that a dialog is cut
off in a small window, or that a popup lands in the top-left corner. PR #31 passed every test and still shipped a
File menu that opened upward off the window. So **before any PR merges, the agent that made it launches the real
app, uses the changed behaviour, looks at screenshots of it, and says in the PR what it checked.** No exceptions for
"small" kit changes: a kit change touches every app.

This is mandatory (see `AGENTS.md`). A PR without a filled **Manual verification** section is not ready to merge,
whatever CI or the local test run says.

## 1. Write down the intended result first

Before you look, write 3 to 8 lines of what correct looks like, in the terms a person would use. For example:

- "File menu opens directly below the File label, its top edge touching the menu bar, nothing cut off."
- "Near the taskbar the Mode list opens above the button instead, fully inside the window."

Also list **every place the change shows up**. For a kit component, grep its users
(`grep -rn "<ComponentName" src/renderer/src`) and pick at least one real app per variant. A change to a shared
helper (for example `kit/actions/popup.ts`) reaches menu bars, tool strip drop-downs, combo boxes, context menus,
submenus, the Start menu and the chat Mode drop-down: check each kind.

## 2. Build and drive the real app

```sh
npx electron-vite build          # the specs drive the built app in out/
mkdir -p /tmp/shots
A7_SHOTS=/tmp/shots A7_E2E_SKIP_BUILD=1 npm run test:e2e -- e2e/<your-spec>.e2e.ts
```

On Linux without a display, `npm run test:e2e` wraps itself in `xvfb-run`; calling vitest directly needs
`xvfb-run -a --server-args="-screen 0 1600x1000x24" npx vitest run -c vitest.e2e.config.ts e2e/<spec>.e2e.ts`.

Drive the app the way a person would, through `e2e/fixtures` (`startConnectedDesktop`, `ctx.desktop.openApp(...)`,
clicks on test ids), and save a screenshot at each state worth looking at:

```ts
import { setWindowSize, shot, startConnectedDesktop } from './fixtures'

await win.getByTestId('window-maximize').click()
await win.getByTestId('menubar-file').click()
await shot(ctx.desktopPage, 'file-menu-maximized')     // written only when A7_SHOTS is set
await setWindowSize(ctx.app, ctx.desktopPage, 900, 600) // the smallest window the app allows
```

Prefer turning this walk-through into a real spec with assertions (it keeps the check alive), as
`e2e/popup-placement.e2e.ts` does. A throwaway spec is fine for a one-off look; delete it before committing.
Locators are `getByTestId` only. Every interactive element and every open menu has a stable `data-testid`
(`npm run testids` enforces it), so you can find and measure anything you changed (`boundingBox()`, `getAttribute`).
If one is missing, that is a bug: add the id in the component (and the manual's Controls Reference) instead of
reaching for CSS selectors.

## 3. Cover the matrix

Check each changed behaviour in every state that applies:

| State | How |
|---|---|
| Normal window | open the app from the Start menu |
| Maximized window | `window-maximize` |
| Small app window | `setWindowSize(ctx.app, ctx.desktopPage, 900, 600)` |
| Near an edge | a control by the taskbar (chat Mode), at the right edge, at the top under the top bar |
| Keyboard | Alt / F10 / arrow keys / Esc where the control supports them |
| Agent-driven | for app behaviour: a scripted agent (`e2e/fixtures/scripted.ts`) makes the change and the window follows |
| Before vs after | for a fix: the same screenshot on `origin/main` (stash or a worktree) and on your branch |

## 4. Eyeball every screenshot

Open each PNG with the Read tool and compare it with the intended result from step 1. Look for:

- placement: popups below / beside their anchor, nothing covering the control that opened it, nothing off screen
  or under the taskbar, nothing stuck at the top-left corner (a lost `left`/`top`);
- clipping and overlap: cut-off text, scrollbars that should not be there, windows or bars covering content;
- the XP Luna look: no Vista/Win7 glass, no rounded modern cards, no emoji (see `docs/design/XP_DESIGN_LANGUAGE.md`);
- the rest of the window: a fix in one place has not broken the layout around it.

If anything is off, fix it, rebuild, and look again. Do not explain a wrong screenshot away.

## 5. Record it in the PR

Fill the **Manual verification** section of the PR template:

```md
## Manual verification

Launched the built app (Electron, xvfb 1600x1000) and checked by hand:

- [x] Kanban maximized: File menu opens below the File label, fully visible (screenshot 1)
- [x] Chat maximized in a 900x600 window: Mode list flips above the button, inside the window (screenshot 4)
- [x] Before/after on origin/main: menu flipped up and was cut off; fixed on this branch

How: `A7_SHOTS=/tmp/shots npm run test:e2e -- e2e/popup-placement.e2e.ts`, every screenshot opened and compared
with the intended result above.
```

Embed the screenshots that show the checked states (commit them under `docs/images/` or `docs/screenshots/` and
link them by raw URL, at deviceScaleFactor 2 when a person will look at them). Say plainly what you could not check
and why.

## 6. Then the usual gates

Run the local checks (do not rely on GitHub Actions): `npm run typecheck`, `npm test`, `npm run help:coverage`,
`npm run app:pillars`, `npm run testids`, `node scripts/check-e2e-selectors.mjs`, and the e2e specs that cover the change. Only merge
when these pass **and** the Manual verification section is filled.
