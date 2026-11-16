# Using Agent Paint

This manual describes Agent Paint. Agent Paint is a small drawing app. You can draw, and the agent can draw too.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Button
  - The Ribbon
  - The Canvas
  - The Status Bar
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Agent Paint to sketch an idea and to show it to the agent. The agent can draw on the canvas, read it, clear it, and change its size when Agent Paint is open.

## 2 - Open It

Click **Start -> Accessories -> Agent Paint**.

## 3 - The Window

### The Menu Button

The **Paint** button is at the top left. It opens a menu with **New**, **Undo**, **Copy picture**, **Help on Paint**, and **Exit**.

### The Ribbon

The ribbon has four groups.

- **Tools** – Pencil, Brush, Eraser, Fill with color, Text, and Color picker.
- **Shapes** – Line, Rectangle, and Oval.
- **Size** – Four stroke sizes: 1, 2, 4, and 8.
- **Colors** – **Color 1**, **Color 2**, and a palette. The left mouse button paints with Color 1. The right mouse button paints with Color 2.

### The Canvas

The canvas is the white sheet. Drag on it to draw. With the **Text** tool, click on the canvas, type, and press Enter. Drag the small grip at the lower right corner to change the size of the canvas. While the agent draws, a note says **The agent is drawing**.

### The Status Bar

The status bar shows the pointer position, the size of the canvas, and a tip.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Agent Paint window | The root of the window. | `paint-app` |
| Paint | Opens the menu. | `paint-menu` |
| New | Starts a blank picture. Ctrl+N. | none |
| Undo | Undoes the last stroke. Ctrl+Z. | none |
| Copy picture | Copies the picture to the clipboard. | none |
| Help on Paint | Opens this manual. F1. | `paint-menu-help` |
| Exit | Closes the window. | none |
| Tool | Selects Pencil, Brush, Eraser, Fill with color, Text, or Color picker. The name ends with `pencil`, `brush`, `eraser`, `fill`, `text`, or `picker`. | `paint-tool-*` |
| Shape | Selects Line, Rectangle, or Oval. The name ends with `line`, `rect`, or `ellipse`. | `paint-tool-*` |
| Size | Selects a stroke size. The name ends with 1, 2, 4, or 8. | `paint-size-*` |
| Color 1 | Selects the first color slot. | none |
| Color 2 | Selects the second color slot. | none |
| Swatch | Sets the selected color slot to this color. | `paint-swatch` |
| Canvas | The drawing area. | `paint-canvas` |
| Agent is drawing | Shows that the agent draws. | `paint-agent-drawing` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `paint-menu-help` |
| Menu: about | Opens the About Agent Paint box. | `paint-menu-about` |
| Dialog: about | The About Agent Paint box. | `paint-about` |
| Dialog: about ok | Closes the About box. | `paint-about-ok` |
| Menu: new | Starts a new picture. Ctrl+N. | `paint-menu-new` |
| Menu: close | Closes the window. Alt+F4. | `paint-menu-close` |
| Menu: undo | Undoes the last stroke. Ctrl+Z. | `paint-menu-undo` |
| Menu: copy | Copies the picture to the clipboard. | `paint-menu-copy` |
| Context menu: undo | Undoes the last stroke. | `paint-ctx-undo` |
| Context menu: copy | Copies the picture to the clipboard. | `paint-ctx-copy` |
| Context menu: new | Starts a new picture. | `paint-ctx-new` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Ctrl+N | Starts a blank picture. | none |
| Ctrl+Z | Undoes the last stroke. | none |
| Enter | Puts the typed text on the canvas. | none |
| Esc | Drops the typed text. | none |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To draw a line, follow the steps below:

1. Click **Pencil**.
2. Click a color in the palette.
3. Drag on the canvas.

To add text, follow the steps below:

1. Click the **Text** tool.
2. Click the place on the canvas.
3. Type the text and press Enter.

To start again, click **Paint -> New**. A question appears if the picture has changes.

## 6 - Troubleshooting

- **Undo is dimmed.** No stroke can be undone.
- **The picture is not copied.** An error says so. Try again.
- **The Home and View tabs do nothing.** They are for the look only.
- **I cannot save the picture.** Agent Paint has no Save. Use **Copy picture** and paste it in another app.

## 7 - Need Help?

Read **[Snipping Tool](snipping-tool.md)** to capture the screen.
