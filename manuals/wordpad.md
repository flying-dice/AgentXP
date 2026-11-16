# Using WordPad

This manual describes WordPad. WordPad reads and writes markdown documents.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Bar
  - The Toolbar
  - The Page
  - The Status Bar
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use WordPad to read a markdown document with its formatting and to write one. The agent can open, read, and write documents in WordPad.

## 2 - Open It

Click **Start -> Accessories -> WordPad**.

## 3 - The Window

### The Menu Bar

The menu bar has the menus **File**, **Edit**, **View**, and **Help**.

### The Toolbar

The toolbar has **Read** and **Edit** to switch the mode. In edit mode, these buttons add markdown marks: **B** (bold), **I** (italic), **H1**, **H2**, **List** (bulleted), **1. List** (numbered), **Code**, and **Link**. The buttons are dimmed in read mode.

### The Page

In read mode, the page shows the formatted document. A click on a link to another `.md` file opens that file. In edit mode, the page is a text box with the markdown source.

### The Status Bar

The status bar shows the file path, a message, **Modified**, the number of words, and the heading that you read now.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| WordPad window | The root of the window. | `wordpad-app` |
| Read | Shows the formatted document. | `wordpad-mode-read` |
| Edit | Shows the markdown source. | `wordpad-mode-edit` |
| B, I, H1, H2, List, 1. List, Code, Link | Add markdown marks in edit mode. | none |
| Document | The formatted page. | `wordpad-reader` |
| Document source | The text box of the source. | `wordpad-source` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `wordpad-menu-help` |
| Menu: about | Opens the About WordPad box. | `wordpad-menu-about` |
| Dialog: about | The About WordPad box. | `wordpad-about` |
| Dialog: about ok | Closes the About box. | `wordpad-about-ok` |
| Menu: new | Starts an empty document. Ctrl+N. | `wordpad-menu-new` |
| Menu: open | Opens a document. Ctrl+O. | `wordpad-menu-open` |
| Menu: save | Saves the document. Ctrl+S. | `wordpad-menu-save` |
| Menu: close | Closes the window. Alt+F4. | `wordpad-menu-close` |
| Menu: read | View menu: shows the formatted document. | `wordpad-menu-read` |
| Menu: edit | View menu: edits the markdown source. | `wordpad-menu-edit` |
| Menu: undo | Undoes the last edit. Ctrl+Z. | `wordpad-menu-undo` |
| Menu: cut | Cuts the selected text. Ctrl+X. | `wordpad-menu-cut` |
| Menu: copy | Copies the selected text. Ctrl+C. | `wordpad-menu-copy` |
| Menu: paste | Pastes the clipboard text. Ctrl+V. | `wordpad-menu-paste` |
| Menu: delete | Deletes the selected text. Del. | `wordpad-menu-delete` |
| Menu: select all | Selects all text. Ctrl+A. | `wordpad-menu-select-all` |
| Context menu: undo | Undoes the last edit. Ctrl+Z. | `wordpad-ctx-undo` |
| Context menu: cut | Cuts the selected text. Ctrl+X. | `wordpad-ctx-cut` |
| Context menu: copy | Copies the selected text. Ctrl+C. | `wordpad-ctx-copy` |
| Context menu: paste | Pastes the clipboard text. Ctrl+V. | `wordpad-ctx-paste` |
| Context menu: delete | Deletes the selected text. Del. | `wordpad-ctx-delete` |
| Context menu: select all | Selects all text. Ctrl+A. | `wordpad-ctx-select-all` |
| Context menu: explain | Asks the chat to explain the selected text. Dimmed when nothing is selected. | `wordpad-ctx-explain` |
| Context menu: ask | Starts a chat about the text or the file. You type the question in the chat. | `wordpad-ctx-ask` |
| Context menu: send | Sends the selected text to a chat. Dimmed when nothing is selected. | `wordpad-ctx-send` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Ctrl+N | Starts an empty document. | none |
| Ctrl+O | Opens a document. | none |
| Ctrl+S | Saves the document. | none |
| Ctrl+B | Makes the selection bold in edit mode. | none |
| Ctrl+I | Makes the selection italic in edit mode. | none |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To write a document, follow the steps below:

1. Click **Edit**.
2. Type your text. Use **H1** for a title and **List** for a list.
3. Press Ctrl+S. If the document is new, the **Save as** dialog box appears.
4. Type a file name, for example `Plan.md`, and click **OK**. WordPad saves the file in the Documents folder.

To read the result, click **Read**.

## 6 - Troubleshooting

- **The formatting buttons are dimmed.** Click **Edit** first.
- **The file name is not valid.** Do not use these marks in the name: `\ / : * ? " < > |`.
- **Save is dimmed.** The document has no change.

## 7 - Need Help?

Read **[Notepad](notepad.md)** for plain text files.
