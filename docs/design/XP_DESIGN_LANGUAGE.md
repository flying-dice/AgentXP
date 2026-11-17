# AgentXP design language: Windows XP (Luna Blue)

AgentXP is hard Windows XP. Nothing in the UI may borrow from Vista or Windows 7: no glass, blur, translucency, orbs, ribbons, Actions panes, gadgets or sidebars, and no icon-only taskbar. When a new app needs a control, build it the way Windows XP would have, from the tokens in `src/renderer/src/lib/kit/tokens.css`. All colours come from that file (`--xp-*`), so changing the theme means changing one place.

## Chrome

| Part | Rule |
| --- | --- |
| Window | Blue Luna title bar (30 px, bold Tahoma 13, white text with a dark shadow), 4 px blue frame, rounded top corners (8 px), cream client area (`--xp-face`). Inactive windows use the pale blue frame. |
| Caption buttons | 21 px rounded squares with a white border: blue for minimize and maximize, red for close. White glyphs. |
| Taskbar | 30 px Luna blue bar. Green **start** button on the left (italic bold label), task buttons that show icon and title (160 px wide, shrinking), the running app pressed in, a blue tray with the clock on the right. |
| Start menu | Blue frame with a header (user tile and name), white programs column with bold names, pale blue places column, footer with the power buttons. Hover is the selection blue with white text. |
| Task pane | The side panels of the desktop are Explorer task panes: a blue gradient header with a bold white title over a pale blue body. They replace Windows 7 gadgets. |
| Desktop | A blue sky and green hill; icons with white labels. |

## Controls

- **Push button**: 75 x 23 px, 3 px radius, dark blue border (`#003c74`), cream gradient. Hover shows the orange ring, the default button the blue ring, pressed is inset.
- **Tabs**: white pages with a 1 px grey border; the selected tab has the orange top bar.
- **Group box**: 4 px radius, tan border, blue title.
- **Menus**: white face, selection blue (`#316ac5`) with white text. Menu bar items highlight the same way.
- **Lists and trees**: white, selection blue, header cream with a grey rule.
- **Scroll bars**: 17 px, blue thumb and arrow buttons with a white border, tan track.
- **Progress bar**: green blocks (7 px with a 2 px gap) in a white sunken track. The busy indicator is the same marquee, or the hourglass.
- **Tool strips and status bars**: cream faces; items get a thin blue border on hover.
- **Fonts**: Tahoma 11 px (12 px in the UI, 13 px bold for captions), Lucida Console for code.

## Apps follow the XP originals

- Paint has a toolbox on the left and a colour box at the bottom (no ribbon).
- Event Viewer is a tree and a list with a toolbar above it (no Actions pane).
- Explorer, Notepad, WordPad, Control Panel style pages and dialogs follow their XP layout: menu bar, toolbar, address bar, status bar.

## Icons and logo

The icons are our own 16 px art drawn in `kit/atoms/icons.ts`, in the XP style (bright, outlined, soft gradients). Do not copy Microsoft bitmaps. The logo (`resources/logo.svg`) is a waving four-colour flag with a prompt chevron.

## Checklist for a new app or atom

1. Use only `--xp-*` tokens; add a token before hard-coding a colour.
2. No `backdrop-filter`, no `rgba` backgrounds on chrome, no gradients with transparency.
3. Provide a Storybook story under `Atoms/`, `Molecules/` or `Organisms/`.
4. Check it next to the Luna reference screens in `docs/images/desktop.png` and `docs/images/start-menu.png`.
