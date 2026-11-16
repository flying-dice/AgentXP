# Using Snipping Tool

This manual describes Snipping Tool. Snipping Tool captures a part of the screen.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Toolbar
  - The Snip Area
  - The Selection Overlay
  - The Status Bar
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Snipping Tool to take a picture of the desktop. The agent can take a screenshot with this tool while the app is open. Only one window exists on a desktop.

## 2 - Open It

Click **Start -> Accessories -> Snipping Tool**.

## 3 - The Window

### The Toolbar

The toolbar has **New**, the arrow next to it, **Cancel**, **Options**, and **Copy**.

- **New** – Takes a rectangular snip.
- **Arrow** – Opens the snip types: **Free-form Snip** (dimmed), **Rectangular Snip**, **Window Snip**, and **Full-screen Snip**.
- **Cancel** – Stops a snip that waits for your selection.
- **Options** – Opens the options dialog box with the delay before the capture: No delay, 1, 3, or 5 seconds.
- **Copy** – Copies the last snip to the clipboard.

### The Snip Area

The area shows the last snip. Before the first snip, it tells you how to start.

### The Selection Overlay

For a rectangular snip, the desktop dims. Drag to select the area. For a window snip, click the window. Press Esc to cancel.

### The Status Bar

The status bar tells what to do and what happened, for example **Captured** with the size.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Snipping Tool window | The root of the window. | `snipping-tool-app` |
| New | Takes a rectangular snip. | `snipping-tool-new` |
| Snip type arrow | Opens the list of snip types. | none |
| Cancel | Stops the snip. | none |
| Options | Opens the options dialog box. | none |
| Copy | Copies the snip. | none |
| Delay | Selects the delay before the capture. | none |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Esc | Cancels the selection. | none |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To capture an area, follow the steps below:

1. Click **New**. The desktop dims.
2. Drag across the area that you want.
3. Release the mouse button. The snip appears in the window.

To capture a window, click the arrow, click **Window Snip**, and click the window.

To use a snip in a chat, click **Copy** and paste it in the chat. The options dialog box says that Send to chat is not available.

## 6 - Troubleshooting

- **New is dimmed.** A snip is in progress. Click **Cancel**.
- **The status bar says that the snip failed.** An error dialog box tells why. Try again.
- **The snip shows the wrong content.** Set a delay in **Options** so that menus can open first.

## 7 - Need Help?

Read **[Agent Paint](paint.md)** to draw.
