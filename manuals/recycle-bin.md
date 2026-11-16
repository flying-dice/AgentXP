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
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

When you revert a change of the agent, Agent7 does not lose the text. It puts the change in the Recycle Bin. Use the Recycle Bin to bring the change back or to delete it for good. Only one window exists on a desktop.

## 2 - Open It

- Double-click **Recycle Bin** on the desktop. The icon looks full when it holds items.
- Click **Start -> Recycle Bin**.

## 3 - The Window

### The Toolbar

The toolbar has **Restore this item**, **Restore all items**, and **Empty the Recycle Bin**.

### The List

The list has the columns **Name**, **Original location**, **Date deleted**, and **Chat**. Each row is one reverted change.

### The Preview

Select a row to see a note and a diff. The diff shows what **Restore this item** brings back.

### The Status Bar

The status bar shows the number of items.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Recycle Bin window | The root of the window. | `recycle-bin-app` |
| Restore this item | Brings the selected change back. | `recycle-bin-restore` |
| Restore all items | Brings all changes back. | `recycle-bin-restore-all` |
| Empty the Recycle Bin | Deletes all items for good after a question. | `recycle-bin-empty` |
| Reverted changes | The list of items. | `recycle-bin-list` |
| Item | One reverted change. | `recycle-bin-item` |

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

**Caution:** Do not click **Yes** if you want to keep the items. Agent7 cannot restore them after that.

## 6 - Troubleshooting

- **The Recycle Bin is empty.** You have not reverted a change yet. Use **Revert** in **[Chat](chat.md)** or **[Code](code.md)**.
- **Restore this item is dimmed.** Select an item first.
- **The agent cannot list the items.** Open this app and make sure that Recycle Bin is **Allow** or **Ask** in **[Control Centre](control-centre.md)**.

## 7 - Need Help?

Read **[Code](code.md)** to review changes before you revert them.
