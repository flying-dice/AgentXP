# Using Notepad

This manual describes Notepad. Notepad reads and edits plain text files.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Bar
  - The Text Area
  - The Status Bar
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Notepad to read and change a text file. The agent can open the same window and read it. Explorer opens text, markdown, and log files in Notepad.

## 2 - Open It

- Click **Start -> Accessories -> Notepad**.
- Double-click a `.txt`, `.md`, or `.log` file in Explorer.

## 3 - The Window

### The Menu Bar

The menu bar has the menus **File**, **Edit**, **Format**, and **Help**.

### The Text Area

The text area fills the window. Type here. The caret position follows your typing.

### The Status Bar

The status bar shows **Modified** when you changed the text. After you save, it shows the message **Saved** and the file name. If a file cannot open, it shows the error.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Notepad window | The root of the window. | `notepad-app` |
| Text editor | The text area. | `notepad-text` |
| Status | Shows Modified, a save message, or an error. | `notepad-status` |
| File menu | Opens the File menu. | `menubar-file` |
| New | Starts an empty file. Ctrl+N. | `menu-item-new` |
| Open... | Opens a file. Ctrl+O. | `menu-item-open` |
| Save | Writes the file. Ctrl+S. | `menu-item-save` |
| Exit | Closes the window. | `menu-item-exit` |
| Edit menu | Opens the Edit menu. | `menubar-edit` |
| Select All | Selects all text. Ctrl+A. | `menu-item-all` |
| Time/Date | Types the time and date at the caret. F5. | `menu-item-time` |
| Format menu | Opens the Format menu. | `menubar-format` |
| Word Wrap | Wraps long lines. | `menu-item-wrap` |
| Help menu | Opens the Help menu. | `menubar-help` |
| View Help | Opens this manual. F1. | `notepad-menu-help` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Ctrl+N | Starts an empty file. | none |
| Ctrl+O | Opens a file. | none |
| Ctrl+S | Saves the file. | none |
| F5 | Types the time and date. | none |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To open a file, follow the steps below:

1. Click **File -> Open...** The **Open file** dialog box appears.
2. Select the file.
3. Click **OK**.

To save a change, press Ctrl+S. Save works only for a file that has a name and a change.

To wrap long lines, click **Format -> Word Wrap**.

## 6 - Troubleshooting

- **Save is dimmed.** The file has no change, or the file has no name. Notepad cannot save a new file under a name.
- **A question asks about discarding changes.** You changed the text. Click **No** to keep working. Click **Yes** to lose the change.
- **The status bar shows an error.** Notepad could not read the file. Make sure that the drive is plugged in.

## 7 - Need Help?

Read **[WordPad](wordpad.md)** for markdown documents. Read **[Explorer](explorer.md)** to find files.
