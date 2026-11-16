# Using Chat

This manual describes the Chat window. A chat is one conversation with an agent.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Bar
  - The Model Bar
  - The Transcript
  - The Composer
  - The Tasks and Changes Pane
  - The Sidebar
  - The Status Bar
  - Permission Requests
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Chat to tell the agent what to do and to read what the agent does. The transcript shows each message, each tool call, and each plan. You can stop the agent, undo its file changes, and answer its requests.

## 2 - Open It

- Click **Start -> New chat**. If you have a plugged-in project, a dialog box asks where the agent works.
- Double-click **Chats** on the desktop. The latest chat opens.
- Click a chat under **Recent chats** in the Start menu.
- Click **Start a chat on this drive** in the AutoPlay dialog box.

## 3 - The Window

### The Menu Bar

The menu bar is at the top of the window. It has the menus **Chat** and **Help**.

### The Model Bar

The bar below the menu has the **Model** list and the **Tasks and changes** button.

### The Transcript

The transcript is the large area in the middle. It shows your messages and the answer of the agent. Everything the agent does on the way, such as its messages between tool calls, its reasoning, and its tool calls, is folded into one **Thinking** line. Click the line to open it, or choose **View -> Show thinking and tool details** to open all of them. A permission request opens its line by itself. Each tool call has a card. A card shows the state of the call: running, waiting, done, failed, or cancelled. If a turn ends in an unusual way, a notice tells why. An error appears as a red row.

A drawn form from the agent (an A2UI surface) appears as a row with **Open**, **Close**, **Delete**, and **Move to**. See **[Agent window](surface.md)**.

### The Composer

The composer is below the transcript.

- **Message box** – Type your message here. Press Enter to send. Press Shift+Enter for a new line.
- **Mode** – Selects a mode of the agent. The list appears when the agent offers modes.
- **Include open file** – Adds the file that is open in Code to your message.
- **Attach...** – Adds files to your message.
- **Stop** – Stops the agent.
- **Send** – Sends the message.

### The Tasks and Changes Pane

Click **Tasks and changes** to open the pane at the right. It has two tabs.

- **Changes** – Lists each file that the agent changed. Select a file to see the diff. **Revert** undoes the change. **Open in editor** shows the file in Code.
- **Tasks** – Shows the plan of the agent, with a bar for the finished tasks.

### The Sidebar

A form that the agent draws for the sidebar appears in a pane at the right, with one tab for each form. Drag the edge of the pane to change its width.

### The Status Bar

The status bar shows the working folder, the use of the context window, and the state of the connection.

### Permission Requests

If you set an action to **Ask**, a dialog box asks you. It has the question, the command or the diff, and two choices. Click the first choice to allow the action. Click the second to refuse it. Select **Don't ask again for this kind of action** to save your answer for the next time.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Chat window | The root of the window. | `chat-app` |
| File menu | Opens the File menu. | `menubar-file` |
| Clear transcript... | Removes the messages from the window after a question. | `chat-menu-clear` |
| Review changes (menu) | Opens the Code Review box for the project of the chat. | `chat-menu-review` |
| Open in Code (menu) | Opens the Code app on the project of the chat. | `chat-menu-code` |
| Show thinking and tool details (menu) | Opens every Thinking line at once, in all chats and Code Review windows. Off by default. | `chat-menu-details` |
| Tasks and changes (menu) | Shows or hides the pane. | `chat-menu-panel` |
| Close | Closes the window. | `chat-menu-close` |
| Help menu | Opens the Help menu. | `menubar-help` |
| View Help | Opens the Chat Help window. F1. | `chat-menu-help` |
| Model | Selects the model of the agent. | `chat-model` |
| Tasks and changes | Shows or hides the right pane. | `chat-panel-toggle` |
| Transcript | Lists all entries. The attribute `data-running` tells if the agent works. | `chat-transcript` |
| Welcome message | Shows in an empty chat. | `chat-welcome` |
| Your message | One message from you. | `chat-message-user` |
| Agent message | One message from the agent. | `chat-message-*` |
| Reasoning | The reasoning of the agent. | `chat-reasoning` |
| Thinking line | One folded line for everything the agent did on the way to its answer, for example "Thought and used 4 tools". While the agent works it reads "Working..." and the tool that runs now. | `chat-activity-group` |
| Thinking line (button) | Opens or closes the line. Inside are the messages, reasoning, and tool cards of the turn. | `chat-activity-toggle` |
| Tool call card | One tool call. The attribute `data-status` gives the state. | `tool-call-card` |
| Show, Hide | Opens or closes the details of a card. | `tool-call-toggle` |
| Stop notice | Tells why a turn ended. | `chat-stop-notice` |
| Error | Shows an error. | `chat-error` |
| Composer | Holds the controls to write. | `chat-composer` |
| Message box | The input for your message. | `chat-composer-input` |
| Mode | Selects the mode. | `chat-mode` |
| Attach... | Adds files. | `chat-attach` |
| Stop | Stops the agent. | `chat-stop` |
| Send | Sends the message. | `chat-send` |
| Tasks and changes pane | The right pane. | `chat-side-panel` |
| Changes tab | Shows the changed files. | `chat-tab-changes` |
| Tasks tab | Shows the plan. | `chat-tab-tasks` |
| Changed files | The list of changes. | `changes-list` |
| Diff | Shows the diff of the selected file. | `changes-diff` |
| Revert | Undoes the selected change. | `changes-revert` |
| Open in editor | Shows the selected file in Code. | `changes-open-editor` |
| Task | One task of the plan. | `tasks-item` |
| Sidebar | The pane for drawn forms. | `chat-sidebar` |
| Sidebar tab | One drawn form. | `chat-sidebar-tab` |
| Close tab | Closes the tab. | `chat-sidebar-tab-close` |
| Resize bar | Changes the width of the sidebar. | `chat-sidebar-resizer` |
| Form row | One drawn form in the transcript. | `chat-surface-row` |
| Form title | Shows the title. | `chat-surface-title` |
| Form state | Shows if the form is open or closed. | `chat-surface-state` |
| Open | Shows the form. | `chat-surface-open` |
| Close | Hides the form. | `chat-surface-close` |
| Delete | Deletes the form after a question. | `chat-surface-delete` |
| Move to | Opens the list of places. | `chat-surface-move` |
| Move to Inline, Sidebar, Window | Moves the form. | `chat-surface-move-*` |
| Working folder | Shows the folder of the chat. | `chat-cwd` |
| Connection state | Shows the state of the connection. | `chat-status` |
| Permission dialog box | Asks if the agent can act. | `permission-dialog` |
| Allow or refuse | The two choices. The name ends with the id of the choice. | `permission-option-*` |
| Don't ask again for this kind of action | Saves your answer. | `permission-remember` |
| Project tree | The tree of files, shown in Code. | `file-tree` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `chat-menu-help` |
| Menu: about | Opens the About Chat box. | `chat-menu-about` |
| Dialog: about | The About Chat box. | `chat-about` |
| Dialog: about ok | Closes the About box. | `chat-about-ok` |
| Menu: copy | Edit menu: copies the selected text. | `chat-menu-copy` |
| Menu: select all | Edit menu: selects all text. | `chat-menu-select-all` |
| Context menu: copy message | Copies the text of the message under the pointer. | `chat-ctx-copy-message` |
| Context menu: copy code | Copies the first code block of that message. Dimmed when there is none. | `chat-ctx-copy-code` |
| Context menu: quote | Puts the message in the message box as a quote. | `chat-ctx-quote` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Enter | Sends the message. | `chat-composer-input` |
| Shift+Enter | Starts a new line. | `chat-composer-input` |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To start a new chat, follow the steps below:

1. Click **Start -> New chat**. The **New chat** dialog box appears if a project is plugged in.
2. Select the drive where the agent works.
3. Click **Start chat**. The Chat window opens.

To send a message, type it in the message box and click **Send**.

To stop the agent, click **Stop**.

To undo a change of the agent, follow the steps below:

1. Click **Tasks and changes**. The pane opens on the **Changes** tab.
2. Select the file.
3. Click **Revert**. A question appears.
4. Click **Yes**. The file goes back to its old text. The change goes to the **[Recycle Bin](recycle-bin.md)**.

To change the model, select another entry in **Model**.

## 6 - Troubleshooting

- **Send is dimmed.** Type a message first. Send is also off while the agent works. Click **Stop** to end the turn.
- **Model is dimmed.** The agent offers no models.
- **The window says Opening the chat.** Wait. If the text stays, open **[Event Viewer](event-viewer.md)** to see the messages.
- **The agent waits.** The agent can wait for your answer. Click the flag in the notification area.
- **The status bar shows an error.** The agent program stopped. Open **[Task Manager](agent-manager.md)**.

## 7 - Need Help?

Read **[Event Viewer](event-viewer.md)** for the messages of the agent. Read **[Control Centre](control-centre.md)** to add an agent or to change permissions.
