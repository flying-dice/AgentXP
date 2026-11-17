# Using Recycle Bin

This manual describes Recycle Bin. Recycle Bin keeps the changes that you reverted, so that you can restore them.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Toolbar
  - The List
  - The Preview
  - The Status Bar
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

When you revert a change of the agent, AgentXP does not lose the text. It puts the change in the Recycle Bin. Use the Recycle Bin to bring the change back or to delete it for good. Only one window exists on a desktop.

## 2 - Open It

- Double-click **Recycle Bin** on the desktop. The icon looks full when it holds items.
- Click **Start -> Recycle Bin**.
- Click **Open Recycle Bin** under the list of changes in **[Chat](chat.md)** or **[Code](code.md)**, after you reverted a change.

## 3 - The Window

### The Toolbar

The toolbar has **Restore this item**, **Restore all items**, and **Empty the Recycle Bin**.

### The List

The list has the columns **Name**, **Original location**, **Date deleted**, and **Chat**. Each row is one reverted change.

### The Preview

Select a row to see a note and a diff. The diff shows what **Restore this item** brings back.

### The Status Bar

The status bar shows the number of items.

### The Chat Pane

Each Recycle Bin window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Recycle Bin window | The root of the window. | `recycle-bin-app` |
| Restore this item | Brings the selected change back. | `recycle-bin-restore` |
| Restore all items | Brings all changes back. | `recycle-bin-restore-all` |
| Empty the Recycle Bin | Deletes all items for good after a question. | `recycle-bin-empty` |
| Reverted changes | The list of items. | `recycle-bin-list` |
| Item | One reverted change. | `recycle-bin-item` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `recycle-bin-menu-help` |
| Menu: about | Opens the About Recycle Bin box. | `recycle-bin-menu-about` |
| Dialog: about | The About Recycle Bin box. | `recycle-bin-about` |
| Dialog: about ok | Closes the About box. | `recycle-bin-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `recycle-bin-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: restore | File menu: restores the selected item. | `recycle-bin-menu-restore` |
| Menu: restore all | File menu: restores all items. | `recycle-bin-menu-restore-all` |
| Menu: empty | File menu: empties the Recycle Bin. | `recycle-bin-menu-empty` |
| Menu: close | Closes the window. Alt+F4. | `recycle-bin-menu-close` |
| Menu: refresh | View menu: reads the list again. F5. | `recycle-bin-menu-refresh` |
| Status: restored | Says what was restored and where it went. | `recycle-bin-status-notice` |
| Context menu: restore | Restores the item. | `recycle-bin-ctx-restore` |
| Context menu: restore all | Restores all items. | `recycle-bin-ctx-restore-all` |
| Context menu: empty | Empties the Recycle Bin. | `recycle-bin-ctx-empty` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To restore a change, follow the steps below:

1. Select the item in the list. The preview shows the change.
2. Click **Restore this item**. The file gets the text of the change again.

To delete all items for good, follow the steps below:

1. Click **Empty the Recycle Bin**. A question appears.
2. Click **Yes**.

**Caution:** Do not click **Yes** if you want to keep the items. AgentXP cannot restore them after that.

## 6 - Troubleshooting

- **The Recycle Bin is empty.** You have not reverted a change yet. Use **Revert** in **[Chat](chat.md)** or **[Code](code.md)**.
- **Restore this item is dimmed.** Select an item first.
- **The agent cannot list the items.** Open this app and make sure that Recycle Bin is **Allow** or **Ask** in **[Control Center](control-centre.md)**.

## 7 - Need Help?

Read **[Code](code.md)** to review changes before you revert them.
