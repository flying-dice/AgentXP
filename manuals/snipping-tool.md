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
  - The Chat Pane
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

The toolbar has **New**, the arrow next to it, **Cancel**, **Options**, **Send to chat**, and **Copy**.

- **New** – Takes a rectangular snip.
- **Arrow** – Opens the snip types: **Rectangular Snip**, **Window Snip**, and **Full-screen Snip**.
- **Cancel** – Stops a snip that waits for your selection.
- **Options** – Opens the options dialog box with the delay before the capture: No delay, 1, 3, or 5 seconds.
- **Send to chat** – Saves the last snip as a picture in **C:\Users\Agent\Pictures\Snips** and attaches it to the chat pane of this window. The status bar tells where the picture is saved.
- **Copy** – Copies the last snip to the clipboard.

### The Snip Area

The area shows the last snip. Before the first snip, it tells you how to start.

### The Selection Overlay

For a rectangular snip, the desktop dims. Drag to select the area. For a window snip, click the window. Press Esc to cancel.

### The Status Bar

The status bar tells what to do and what happened, for example **Captured** with the size.

### The Chat Pane

Each Snipping Tool window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Snipping Tool window | The root of the window. | `snipping-tool-app` |
| New | Takes a rectangular snip. | `snipping-tool-new` |
| Snip type arrow | Opens the list of snip types. | none |
| Cancel | Stops the snip. | none |
| Options | Opens the options dialog box. | none |
| Send to chat | Saves the snip as a picture on drive C: and sends it to the chat pane. | `snipping-tool-send-chat` |
| Copy | Copies the snip. | none |
| Delay | Selects the delay before the capture. | none |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: send to chat | Edit menu. Same as the Send to chat button. | `snipping-tool-menu-send-chat` |
| Context menu: send to chat | Same as the Send to chat button. | `snipping-tool-ctx-send-chat` |
| Menu: help | Opens the Help window for this app. F1. | `snipping-tool-menu-help` |
| Menu: about | Opens the About Snipping Tool box. | `snipping-tool-menu-about` |
| Dialog: about | The About Snipping Tool box. | `snipping-tool-about` |
| Dialog: about ok | Closes the About box. | `snipping-tool-about-ok` |
| Menu: view | Opens the View menu. It has one item, Chat pane. | `menubar-view` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `snipping-tool-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: new | File menu: takes a rectangular snip. Ctrl+N. | `snipping-tool-menu-new` |
| Menu: window | File menu: takes a window snip. | `snipping-tool-menu-window` |
| Menu: full | File menu: takes a full-screen snip. | `snipping-tool-menu-full` |
| Menu: close | Closes the window. Alt+F4. | `snipping-tool-menu-close` |
| Menu: copy | Edit menu: copies the snip. | `snipping-tool-menu-copy` |
| Menu: cancel | Tools menu: cancels the snip. | `snipping-tool-menu-cancel` |
| Menu: options | Tools menu: opens the options. | `snipping-tool-menu-options` |
| Context menu: copy | Copies the snip. | `snipping-tool-ctx-copy` |
| Context menu: new | Takes a new snip. | `snipping-tool-ctx-new` |
| Context menu: options | Opens the options. | `snipping-tool-ctx-options` |

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
