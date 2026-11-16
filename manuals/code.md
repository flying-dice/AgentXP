# Using Code

This manual describes Code. Code shows the files of your projects, the changes of the agent, and the git status.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Bar
  - The Toolbar
  - The Management Pane
  - The Editor
  - The Change Peek
  - The Logs and Others Pane
  - The Status Bar
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Code to review what the agent changed. The agent edits the files. You read the files, look at each changed block (a hunk), and revert the blocks that you do not want. You cannot type in the editor.

## 2 - Open It

- Click **Start -> Code**, or double-click **Code** on the desktop.
- Double-click a source file in Explorer.
- Click **Open in editor** in the **Changes** pane of a chat.

Only one Code window exists on a desktop.

## 3 - The Window

### The Menu Bar

The menu bar has the menus **File**, **Edit**, **View**, **Search**, **Tools**, and **Help**.

### The Toolbar

The toolbar has the buttons for files, for changes, and for the panes. Some buttons are always dimmed because the agent writes the files.

### The Management Pane

The pane is at the left. It has three tabs.

- **Projects** – Shows the tree of each plugged-in project. A colored mark shows the git status of a file.
- **Files** – Lists the open files, then the files that git or the agent changed.
- **Changes** – Lists each change of the agent.

### The Editor

The editor shows one tab for each open file. A dot on a tab means that the file has a change. Each line has a number. A mark in the margin shows a changed block. Click the mark to open the peek.

### The Change Peek

The peek shows the old lines and the new lines of a block. **Revert hunk** writes the old lines back. **Close** closes the peek. Press Esc to close it too.

### The Logs and Others Pane

The pane is at the bottom. It has two tabs.

- **Agent changes** – The same list as the chat, with **Revert** and **Open in editor**.
- **Git** – Shows the branch and lists each changed file with its status.

### The Status Bar

The status bar shows the path, **Agent editing** while the agent writes, the visible lines, the selection, the caret position, the line ending, the branch, and the language.

### The Chat Pane

Each Code window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Code window | The root of the window. | `code-app` |
| File menu | Opens the File menu. | `menubar-file` |
| Open... | Opens a file. Ctrl+O. | `menu-item-code-open` |
| Close file | Closes the active tab. | `menu-item-code-close-file` |
| Close all files | Closes all tabs. | `menu-item-code-close-all` |
| Edit menu | Opens the Edit menu. | `menubar-edit` |
| Copy | Copies the selected text. Ctrl+C. | `menu-item-code-copy` |
| Select All | Selects all code in the file. Ctrl+A. | `menu-item-code-select-all` |
| Revert hunk... | Reverts the block under the caret. | `menu-item-code-revert-hunk` |
| View menu | Opens the View menu. | `menubar-view` |
| Management | Shows or hides the left pane. | `menu-item-code-view-management` |
| Logs and others | Shows or hides the bottom pane. | `menu-item-code-view-logs` |
| Overview ruler | Shows or hides the ruler at the right. | `menu-item-code-view-ruler` |
| Search menu | Opens the Search menu. | `menubar-search` |
| Next change | Goes to the next block. Alt+F5. | `menu-item-code-next-change` |
| Previous change | Goes to the last block. Shift+Alt+F5. | `menu-item-code-prev-change` |
| Tools menu | Opens the Tools menu. | `menubar-tools` |
| Refresh git status | Reads the git status again. | `menu-item-code-refresh` |
| Help menu | Opens the Help menu. | `menubar-help` |
| View Help | Opens the Code Help window. F1. | `code-menu-help` |
| About Code | Shows the About box. | `code-menu-about` |
| New | Always dimmed. The agent creates files. | `code-new` |
| Open file | Opens a file. | `code-open` |
| Save | Always dimmed. The agent edits files. | `code-save` |
| Save all | Always dimmed. | `code-save-all` |
| Undo | Always dimmed. | `code-undo` |
| Redo | Always dimmed. | `code-redo` |
| Previous change | Goes to the last block. | `code-prev-change` |
| Next change | Goes to the next block. | `code-next-change` |
| Revert hunk (toolbar) | Reverts the open block or the block under the caret. | `code-toolbar-revert-hunk` |
| Refresh git status | Reads the git status again. | `code-refresh` |
| Management (button) | Shows or hides the left pane. | `code-management-toggle` |
| Review changes (menu) | Opens the Code Review box, where you choose what to review. | `code-menu-review` |
| Review changes (button) | Opens the Code Review box, where you choose what to review. | `code-review-changes` |
| Logs (button) | Shows or hides the bottom pane. | `code-changes-toggle` |
| Agent is editing | Shows that the agent writes the open file. | `code-editing` |
| Management pane | The left pane. | `code-management` |
| Projects tab | Shows the project trees. | `code-mgmt-tab-projects` |
| Files tab | Shows the open and changed files. | `code-mgmt-tab-files` |
| Changes tab | Shows the changes of the agent. | `code-mgmt-tab-changes` |
| Project tree | The tree of project files. | `file-tree` |
| Files list | The list of open and changed files. | `code-files` |
| File row | One file in the list. | `code-files-item` |
| Changes list | The list of changes. | `code-mgmt-changes` |
| Change row | One change of the agent. | `code-mgmt-change` |
| File tab | One open file. | `code-tab` |
| Tab name | Shows the file. | `code-tab-name` |
| Close tab | Closes the file. | `code-tab-close` |
| Editor | Shows the text of the active file. | `code-editor` |
| Hint | Tells you to open a file. | `code-hint` |
| Peek | The block that you opened. | `code-hunk-peek` |
| Peek lines | Holds the old and new lines. | `code-hunk-lines` |
| Old line | A line that the agent removed. | `code-hunk-old` |
| New line | A line that the agent added. | `code-hunk-new` |
| Revert hunk | Writes the old lines back. | `code-hunk-revert` |
| Close | Closes the peek. | `code-hunk-close` |
| Logs and others pane | The bottom pane. | `code-logs` |
| Agent changes tab | Shows the changes. | `code-logs-tab-changes` |
| Git tab | Shows the git status. | `code-logs-tab-git` |
| Agent changes | Holds the list of changes. | `code-changes` |
| Git pane | Holds the git summary and list. | `code-git-pane` |
| Git summary | Shows the branch and the number of changed files. | `code-git-summary` |
| Git list | Lists the changed files. | `code-git-list` |
| Git entry | One changed file. | `code-git-entry` |
| Changed files | The list in the Agent changes tab. | `changes-list` |
| Diff | The diff of the selected change. | `changes-diff` |
| Revert | Undoes the selected change. | `changes-revert` |
| Open in editor | Shows the file in the editor. | `changes-open-editor` |
| Path | Shows the active file. | `code-status-path` |
| Agent editing | Shows that the agent writes. | `code-status-editing` |
| Caret | Shows the line and the column. | `code-status-caret` |
| Branch | Shows the git branch. | `code-git-branch` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: new chat | File menu: starts a chat on the default drive. Ctrl+N. | `code-menu-new-chat` |
| Menu: help | Opens the Help window for this app. F1. | `code-menu-help` |
| Menu: about | Opens the About Code box. | `code-menu-about` |
| Dialog: about | The About Code box. | `code-about` |
| Dialog: about ok | Closes the About box. | `code-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `code-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: close | Closes the window. Alt+F4. | `code-menu-close` |
| Context menu: cut | Cut. Dimmed: the editor is read only. | `code-ctx-cut` |
| Context menu: copy | Copies the selected code. | `code-ctx-copy` |
| Context menu: paste | Paste. Dimmed: the editor is read only. | `code-ctx-paste` |
| Context menu: select all | Selects all code in the file. | `code-ctx-select-all` |
| Context menu: revert hunk | Reverts the change under the caret. Shown only on a change. | `code-ctx-revert-hunk` |
| Context menu: goto file | Opens the Open dialog box to go to another file. Ctrl+O. | `code-ctx-goto-file` |
| Context menu: explain | Asks the chat pane to explain the selected text. Dimmed when nothing is selected. | `code-ctx-explain` |
| Context menu: ask | Opens the chat pane with a draft about the text or the file. You type the question. | `code-ctx-ask` |
| Context menu: open in Chat window | Starts a full chat with the selected text in a Chat window. Dimmed when nothing is selected. | `code-ctx-open-chat` |
| Tree menu: open | Opens the file, or opens the folder. | `code-ctx-open` |
| Tree menu: start a chat | Starts a chat on this project or folder. | `code-ctx-start-chat` |
| Tree menu: open in Explorer | Shows the folder in Explorer. | `code-ctx-open-explorer` |
| Tree menu: open with Notepad | Opens the file in Notepad. | `code-ctx-open-notepad` |
| Tree menu: copy as path | Copies the path of the file or folder. | `code-ctx-copy-path` |
| Tree menu: ask chat | Asks the chat about this file. | `code-ctx-ask-file` |
| Tree menu: eject | Takes the project off the desktop. Its folder stays on your disk. | `code-ctx-eject` |
| Tree menu: plug in | Plugs in a project. | `code-ctx-plug-in` |
| Project tree | The folders and files of the project. | `code-tree` |
| Menu: eject | Takes the open project off the desktop. | `code-menu-eject` |
| Menu: plug in | Plugs in a project. | `code-menu-plug-in` |
| Git: start | Starts Git in this folder, so changes can be tracked. | `code-git-init` |
| Git: not a repository | Says this folder does not use Git yet. | `code-git-not-repo` |
| Git menu: open | Opens the file of the row. | `code-git-ctx-open` |
| Git menu: show changes | Shows what changed in the file. | `code-git-ctx-show` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Ctrl+O | Opens a file. | none |
| Alt+F5 | Goes to the next change. | none |
| Shift+Alt+F5 | Goes to the last change. | none |
| Esc | Closes the peek. | none |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To review the changes of the agent, follow the steps below:

1. Open the **Changes** tab of the left pane. Each change of the agent has a row.
2. Double-click a row. The file opens.
3. Click the mark in the margin. The peek shows the old and the new lines.

To revert one block, follow the steps below:

1. Click the mark of the block. The peek opens.
2. Click **Revert hunk**. A question appears.
3. Click **Yes**. The lines go back to the last commit.

To revert a whole file, select the change in the **Agent changes** tab and click **Revert**.

To go from block to block, press Alt+F5.

## 6 - Troubleshooting

- **The editor is empty.** The window says to open a file from the tree. Click **Open file**.
- **The tree is empty.** Plug in a project in **[Explorer](explorer.md)**. Without a project, the tree shows the home folder of the agent.
- **The Git tab says Not a git repository.** The project has no git folder.
- **Revert hunk is dimmed.** Move the caret to a changed block, or open its peek.
- **I cannot type.** Code is read-only. Ask the agent to edit the file.

## 7 - Need Help?

Read **[Chat](chat.md)** to talk to the agent. Read **[Recycle Bin](recycle-bin.md)** to restore a reverted change.
