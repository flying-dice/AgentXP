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
  - Save a file
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

The toolbar has the buttons for files, for changes, for the panes, and for the chat. **Ask about selection** opens the chat pane (420 pixels wide) with a question about the lines that you selected in the file. The lines stay marked in the file while you write in the chat pane. At the right end, **Focus on the file** gives the file the whole window. Some buttons are always dimmed because the agent writes the files.

### The Management Pane

The pane is at the left. It has three tabs.

- **Projects** – Shows the tree of each project folder (plugged in). A colored mark shows the git status of a file. The buttons above the tree work on the row that you select. **New chat here** starts a chat that works in the selected project or folder. **Remove from desktop** takes the selected project off the desktop; its folder stays on your disk. It is dimmed unless you select a project.
- **Files** – Lists the open files, then the files that git or the agent changed.
- **Changes** – Lists each change of the agent. The list is only as high as its rows, so the diff below it has the room. Click a row to see its diff. A row marked "Reverted" shows "This change was undone" and a **Restore...** button that opens the Recycle Bin on that file. The list shows only changes that are not committed yet: when you commit a file in Git, its row leaves the list (in a folder without Git every change stays). When nothing is left, the list says "No uncommitted changes from this chat."; if Git shows changed files from before, the line above the list says how many and links to Git. In a folder without Git it says that the folder is not tracked by Git.

### The Editor

The editor shows one tab for each open file. A dot on a tab means that the file has a change. Each line has a number. Click a number to select that line, or drag over several numbers to select those lines. While nothing is selected, the status bar says "Select some lines first." A mark in the margin shows a changed block. Click the mark to open the peek.

### The Change Peek

The peek shows the old lines and the new lines of a block. **Revert hunk** writes the old lines back. **Close** closes the peek. Press Esc to close it too.

### The Logs and Others Pane

The pane is at the bottom. It has two tabs.

- **Agent changes** – The same list as the chat, with **Revert** and **Open in editor**.
- **Git** – Shows the branch and lists each changed file with its status and its lines (for example "+4 / -1"). Click a file to see its changes in the pane below the list. No window opens. Double-click the file, or select it and press Enter, to open it in Code Review. The status bar then says "Opening Review...". Point to a row to read which lines of the file changed, for example "redirect.ts: lines 1, 3 and 4 changed". If the folder is not tracked with Git, the tab explains Git and offers **Turn on Git here**. A question asks first, and **Cancel** is the default.

### Focus on the File

The file uses all the room that the open panes leave. Click **Focus on the file** at the right end of the toolbar, or press F11, to close the chat pane, the Management pane, and the Changes and Git pane in one step, so the file fills the whole window. The button then reads **Show panes**. Click it, or press F11 again, to bring back the panes that were open. The same two actions are in the **View** menu as **Focus on the file** and **Show all panels**. Ctrl+Shift+F works like F11. The window remembers its panes.

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
| Focus on the file | Closes every pane, so the file fills the window. F11. | `code-menu-focus` |
| Show all panels | Opens all the panes. | `code-menu-show-all` |
| New chat here (menu) | File menu: starts a chat in the selected project or folder of the tree, or in the project of the open file. | `code-menu-new-chat-here` |
| Search menu | Opens the Search menu. | `menubar-search` |
| Next change | Goes to the next block. Alt+F5. | `menu-item-code-next-change` |
| Previous change | Goes to the last block. Shift+Alt+F5. | `menu-item-code-prev-change` |
| Tools menu | Opens the Tools menu. | `menubar-tools` |
| Refresh git status | Reads the git status again. | `menu-item-code-refresh` |
| Help menu | Opens the Help menu. | `menubar-help` |
| View Help | Opens the Code Help window. F1. | `code-menu-help` |
| About Code | Shows the About box. | `code-menu-about` |
| New | Always dimmed. The agent creates files. | `code-new` |
| Open a file | Opens a file from your disk. The tooltip says "Open a file". Use **Plug in a folder** to add a whole project. | `code-open` |
| Save | Always dimmed. The agent edits files. | `code-save` |
| Save all | Always dimmed. | `code-save-all` |
| Undo | Always dimmed. | `code-undo` |
| Redo | Always dimmed. | `code-redo` |
| Previous change | Goes to the last block. | `code-prev-change` |
| Next change | Goes to the next block. | `code-next-change` |
| Revert hunk (toolbar) | Reverts the open block or the block under the caret. | `code-toolbar-revert-hunk` |
| Ask about selection | Opens the chat pane with a question about the selected lines. It is dimmed until you select lines. | `code-ask-selection` |
| Chat (Focus mode) | In Focus mode, beside **Show panes**: brings back the chat pane. | `code-focus-chat` |
| Focus on the file | At the right end of the toolbar: hides the chat, Management, and Changes and Git panes. Then it reads **Show panes**, and a click brings them back. F11. | `code-focus-toggle` |
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
| Git entry | One changed file. Click it to see its changes below. Double-click it to open Code Review. | `code-git-entry` |
| Git changes | The pane below the list: the changes of the file that you clicked. | `code-git-preview` |
| Git changes hint | The words in that pane before you click a file. | `code-git-preview-hint` |
| Changed files | The list in the Agent changes tab. | `changes-list` |
| Diff | The diff of the selected change. | `changes-diff` |
| Revert | Undoes the selected change. | `changes-revert` |
| Open in editor | Shows the file in the editor. | `changes-open-editor` |
| Open Recycle Bin | The link in the one line above the list after a revert. It opens the Recycle Bin. A reverted file stays in the list, in grey, after you close and open the pane or the window. | `changes-open-recycle-bin` |
| Changes pane | The whole pane: the list, the diff and the buttons. The list is as high as its rows (two rows at least, a third of the pane at most) and the diff gets the rest, about 12 lines. The diff scrolls on its own. In a wide, short pane the diff is beside the list. | `changes-pane` |
| Nothing changed note | The line above an empty list. When Git shows changed files it says how many, from before this chat. In a folder without Git it says that the folder is not tracked by Git. | `changes-git-note` |
| Open Git | The link in that line. It shows the Git tab. | `changes-open-git` |
| Reverted note | One line above the list after a revert, with the link to the Recycle Bin. | `changes-reverted-note` |
| File name end | The last letters of a file name and its type. A long name is cut in the middle, never at the end. | `changes-name-tail` |
| Lines | The lines added and removed in a file, for example +16 / -0. | `changes-lines` |
| Why a button is dimmed | The line above the buttons that says what to do first: "Nothing to revert yet." while the list is empty, "Select a changed file first." when nothing is selected. | `changes-reason` |
| Undone change | The words in place of the diff when you select a reverted row: "This change was undone. Restore it from the Recycle Bin." | `changes-undone` |
| Undone change text | The sentence itself. | `changes-undone-text` |
| Restore | The button below that sentence. It opens the Recycle Bin on that file. | `changes-restore` |
| Path | Shows the active file. | `code-status-path` |
| Agent editing | Shows that the agent writes. | `code-status-editing` |
| Caret | Shows the line and the column. | `code-status-caret` |
| Selected lines | Shows which lines are selected, for example "Selected 1-2". | `code-status-selected` |
| Select lines hint | "Select some lines first." It shows while no line is selected, which is why Ask about selection is dimmed. | `code-status-select-hint` |
| Line number | The number at the start of a line. Click it to select the line, or drag over several numbers to select those lines. | `code-line-number` |
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
| Chat pane edge | The tab at the right edge with a chat icon and the word Chat. It pulses when the chat has news. Click it to open the chat (Ctrl+Shift+C). Focus mode hides it. | `chat-pane-toggle` |
| Menu: close | Closes the window. Alt+F4. | `code-menu-close` |
| Context menu: cut | Cut. Dimmed: the editor is read only. | `code-ctx-cut` |
| Context menu: copy | Copies the selected code. | `code-ctx-copy` |
| Context menu: paste | Paste. Dimmed: the editor is read only. | `code-ctx-paste` |
| Context menu: select all | Selects all code in the file. | `code-ctx-select-all` |
| Context menu: revert hunk | Reverts the change under the caret. Shown only on a change. | `code-ctx-revert-hunk` |
| Context menu: goto file | Opens the Open dialog box to go to another file. Ctrl+O. | `code-ctx-goto-file` |
| Context menu: explain | Asks the chat pane to explain the selected text. Dimmed when nothing is selected. | `code-ctx-explain` |
| Context menu: ask | Opens the chat pane with a draft about the text or the file. You type the question. | `code-ctx-ask` |
| Tree menu: open | Opens the file, or opens the folder. | `code-ctx-open` |
| New chat here | Above the tree: starts a chat in the selected project or folder. | `code-tree-new-chat` |
| Plug in a folder | Above the tree: adds a folder from your computer as a project. The tooltip says "Give the agent a folder of your computer to work on". The tree shows the new project and selects it. | `code-tree-plug-in` |
| Remove from desktop | Above the tree: takes the selected project off the desktop. Its folder stays on your disk. | `code-tree-remove` |
| Tree menu: new chat here | Starts a chat on this project or folder. | `code-ctx-start-chat` |
| Tree menu: open in Explorer | Shows the folder in Explorer. | `code-ctx-open-explorer` |
| Tree menu: open with Notepad | Opens the file in Notepad. | `code-ctx-open-notepad` |
| Tree menu: copy as path | Copies the path of the file or folder. | `code-ctx-copy-path` |
| Tree menu: ask the agent about this | Opens the chat pane with a draft about this file (**Ask the agent about this...**). | `code-ctx-ask-file` |
| Tree menu: remove from desktop | Takes the project off the desktop. Its folder stays on your disk. | `code-ctx-eject` |
| Tree menu: plug in | Plugs in a project. | `code-ctx-plug-in` |
| Project tree | The folders and files of the project. | `code-tree` |
| Menu: remove project | File menu: takes the open project off the desktop. | `code-menu-eject` |
| Menu: plug in | Plugs in a folder as a project. | `code-menu-plug-in` |
| No project note | Under the tree buttons when no project is plugged in. | `code-tree-empty` |
| Plug in a folder (note) | The link in that note. | `code-tree-empty-plug-in` |
| Turn on Git here | Asks first, then turns on Git in this folder, so changes can be tracked. | `code-git-init` |
| Git: not tracked | Explains that this folder is not tracked with Git and what turning it on does. | `code-git-not-repo` |
| Turn on (question) | Turns on Git. | `message-box-action-turn-on` |
| Cancel (question) | Leaves Git off. This is the default button. | `message-box-action-cancel` |
| Git menu: open | Opens the file of the row. | `code-git-ctx-open` |
| Git menu: show changes | Shows what changed in the file. | `code-git-ctx-show` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Ctrl+O | Opens a file. | none |
| Alt+F5 | Goes to the next change. | none |
| Shift+Alt+F5 | Goes to the last change. | none |
| Ctrl+Shift+F | The same as F11. | none |
| Esc | Closes the peek. | none |
| F11 | Focus on the file, or show the panes again. | none |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To review the changes of the agent, follow the steps below:

1. Open the **Changes** tab of the left pane. Each change of the agent has a row.
2. Double-click a row. The file opens.
3. Click the mark in the margin. The peek shows the old and the new lines.

To ask the chat of this window for a review, type "review my changes" in the chat pane. The agent opens Code Review, adds its comments there, and tells you the verdict in the chat. Read **[Code Review](code-review.md)** for the steps.

To revert one block, follow the steps below:

1. Click the mark of the block. The peek opens.
2. Click **Revert hunk**. A question appears.
3. Click **Yes**. The lines go back to the last commit.

To revert a whole file, select the change in the **Agent changes** tab and click **Revert**.

To go from block to block, press Alt+F5.

To make the file use the whole window, click **Focus on the file** at the right end of the toolbar, or press F11. To get the panes back, click **Show panes**, or press F11 again.

To start a chat in a project or folder, select it in the tree and click **New chat here**.

To ask about some lines, select them in the file and click **Ask about selection**.

To see what changed in a file that Git lists, follow the steps below:

1. Click the **Git** tab at the bottom.
2. Click the file. Its changes show in the pane below the list. Point to the row to see which lines changed.
3. To review the file with comments, double-click it, or select it and press Enter. Code Review opens on that file.

### Save a file

Code does not save files. You cannot type in the editor, and the agent writes the files. To change a file yourself, follow the steps below:

1. Right-click the file in the tree and click **Open with Notepad**.
2. Change the text.
3. Press Ctrl+S.

## 6 - Troubleshooting

- **The editor is empty.** The window says to open a file from the tree. Click **Open file**.
- **The tree is empty.** Click **Plug in a folder** above the tree, or in the note under it. Without a project, the tree shows the home folder of the agent.
- **The Git tab says that the folder is not tracked with Git.** The project has no .git folder. Click **Turn on Git here** if you want change marks.
- **The file is in a narrow column.** Click **Focus on the file** in the toolbar, or press F11.
- **Revert hunk is dimmed.** Move the caret to a changed block, or open its peek.
- **I cannot type.** Code is read-only. Ask the agent to edit the file.

## 7 - Need Help?

Read **[Chat](chat.md)** to talk to the agent. Read **[Recycle Bin](recycle-bin.md)** to restore a reverted change.
