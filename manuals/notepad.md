# Using Notepad

This manual describes Notepad. Notepad reads and edits plain text files.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Bar
  - The Text Area
  - The Status Bar
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
  - Save a file
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

The menu bar has the menus **File**, **Edit**, **Format**, **View**, and **Help**.

### The Text Area

The text area fills the window. Type here. The caret position follows your typing.

### The Status Bar

The status bar shows **Modified** when you changed the text. After you save, it shows the message **Saved** and the file name. If a file cannot open, it shows the error.

### The Chat Pane

Each Notepad window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

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
| Edit menu | Opens the Edit menu. | `menubar-edit` |
| Time/Date | Types the time and date at the caret. F5. | `menu-item-time` |
| Format menu | Opens the Format menu. | `menubar-format` |
| Word Wrap | Wraps long lines. | `menu-item-wrap` |
| Help menu | Opens the Help menu. | `menubar-help` |
| View Help | Opens this manual. F1. | `notepad-menu-help` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `notepad-menu-help` |
| Menu: about | Opens the About Notepad box. | `notepad-menu-about` |
| Dialog: about | The About Notepad box. | `notepad-about` |
| Dialog: about ok | Closes the About box. | `notepad-about-ok` |
| Menu: view | Opens the View menu. It has one item, Chat pane. | `menubar-view` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `notepad-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: exit | Closes the window. Alt+F4. | `notepad-menu-close` |
| Menu: save as | Saves the text under a new name. Ctrl+Shift+S. | `notepad-menu-save-as` |
| Menu: find | Opens the Find box. Ctrl+F. | `notepad-menu-find` |
| Find: box | The Find box. | `notepad-find-dialog` |
| Find: text | The words to look for. | `notepad-find-text` |
| Find: match case | Looks only for the same capital letters. | `notepad-find-case` |
| Find: find next | Selects the next match. | `notepad-find-next` |
| Find: not found | Says when the words are not in the text. | `notepad-find-missing` |
| Find: cancel | Closes the Find box. | `notepad-find-cancel` |
| Menu: undo | Undoes the last edit. Ctrl+Z. | `notepad-menu-undo` |
| Menu: cut | Cuts the selected text. Ctrl+X. | `notepad-menu-cut` |
| Menu: copy | Copies the selected text. Ctrl+C. | `notepad-menu-copy` |
| Menu: paste | Pastes the clipboard text. Ctrl+V. | `notepad-menu-paste` |
| Menu: delete | Deletes the selected text. Del. | `notepad-menu-delete` |
| Menu: select all | Selects all text. Ctrl+A. | `notepad-menu-select-all` |
| Context menu: undo | Undoes the last edit. Ctrl+Z. | `notepad-ctx-undo` |
| Context menu: cut | Cuts the selected text. Ctrl+X. | `notepad-ctx-cut` |
| Context menu: copy | Copies the selected text. Ctrl+C. | `notepad-ctx-copy` |
| Context menu: paste | Pastes the clipboard text. Ctrl+V. | `notepad-ctx-paste` |
| Context menu: delete | Deletes the selected text. Del. | `notepad-ctx-delete` |
| Context menu: select all | Selects all text. Ctrl+A. | `notepad-ctx-select-all` |
| Context menu: explain | Asks the chat pane to explain the selected text. Dimmed when nothing is selected. | `notepad-ctx-explain` |
| Context menu: ask | Opens the chat pane with a draft about the text or the file. You type the question. | `notepad-ctx-ask` |

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

To wrap long lines, click **Format -> Word Wrap**.

### Save a file

To save a change, press Ctrl+S. Save works for a file that has a name and a change. To save a new file, press Ctrl+S too: a box asks for the name. To keep the text under another name, choose **File -> Save As...** (Ctrl+Shift+S).

## 6 - Troubleshooting

- **Save is dimmed.** The file has no change. Use **Save As...** to keep the text under another name.
- **A question asks about discarding changes.** You changed the text. Click **No** to keep working. Click **Yes** to lose the change.
- **The status bar shows an error.** Notepad could not read the file. Make sure that the drive is plugged in.

## 7 - Need Help?

Read **[WordPad](wordpad.md)** for markdown documents. Read **[Explorer](explorer.md)** to find files.
