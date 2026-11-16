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

Use Chat to tell the agent what to do and to read what the agent does. The transcript shows each message, each step the agent takes, and each plan. You can stop the agent, undo its file changes, and answer its requests.

## 2 - Open It

- Click **Start -> New chat**. If you have a project folder (plugged in), a dialog box asks where the agent works.
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

If the agent only worked in the Browser, the Thinking line reads **Used 28 steps in the browser (read, clicked, typed)**. Point at the line to see how many steps of each kind there were. A line under it names the first and the last step in plain words, for example **First: Opened localhost:3000/chat. Last: Typed in 'Message #general'.** A click or typing names the button, link, or box that the agent used, for example **Clicked the button 'Send'**. Open the line to see every step in plain words. Names of tools and numbers of page elements show only under **Show**.

If the agent stops while you read older messages, the button **Newer messages below. Click to see them.** shows above the message box. It never covers a message. After you send a message, after an answer ends, and after a restart, the transcript scrolls to the end by itself, unless you scrolled up.

When Resume agents continues a step that **Pause all agents** stopped, your message **Please continue where you stopped.** shows with the note **Resumed. Continuing where you stopped.** above it.

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

The focus starts on **Deny**, because Deny is the safe answer. You can answer with the keyboard: press Alt+A to allow or Alt+D to deny. Hold Alt to see the letters underlined. The Left and Right arrow keys move between the two choices. The line under the choices says the same. After you answer, a line in the chat tells what you chose, for example **You allowed: Change NOTE.md.** or **You denied: Run a command.**

### When the Agent Does Not Start

If the agent cannot start, a red row in the chat says why and names the program. No dialog box covers the chat. The row has these buttons:

- **Try again** – Starts the agent again. If you chose another default agent in Control Center, the button reads **Try again with** and the name of that agent, and the chat uses that agent.
- **Open Agents** – Opens Control Center at **Agents**, where you can correct the command of the agent.
- **Choose another agent** – Opens Control Center at **Agents**. Make another agent the default, come back, and click **Try again**.
- **Details...** – Shows the technical text under the buttons. Click **Hide details** to close it.

While the agent restarts, the chat says **Restarting the agent...** with a progress bar, and then **The agent is running again.** If the agent fails a second time, the row adds the cause, for example **It stopped again: the program 'x' was not found. Show in Event Viewer shows the details.** The button **Start a new chat** replaces **Restart and send again**, so that you do not send your message into the same failure again. Press Ctrl+N or choose **File -> New chat** to start a new chat on the same folder at any time.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Chat window | The root of the window. | `chat-app` |
| File menu | Opens the File menu. | `menubar-file` |
| New chat (menu) | Starts a new chat on the folder of this chat. Ctrl+N. | `chat-menu-new` |
| Clear transcript... | Removes the messages from the window after a question. | `chat-menu-clear` |
| Review changes (menu) | Opens the Code Review box for the project of the chat. | `chat-menu-review` |
| Open in Code (menu) | Opens the Code app on the project of the chat. | `chat-menu-code` |
| Event Viewer (menu) | Opens Event Viewer on the events of this chat. | `chat-menu-event-viewer` |
| Show thinking and tool details (menu) | Opens every Thinking line at once, in all chats and Code Review windows. Off by default. | `chat-menu-details` |
| Tasks and changes (menu) | Shows or hides the pane. | `chat-menu-panel` |
| Close | Closes the window. The agent keeps working. (Tooltip: "Close this window. The agent keeps working.") | `chat-menu-close` |
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
| Browser steps | A line under a Thinking line that only used the Browser. It names the first and the last step. | `chat-activity-detail` |
| Tool call card | One tool call. The attribute `data-status` gives the state. | `tool-call-card` |
| Show, Hide | Opens or closes the details of a card. | `tool-call-toggle` |
| Stop notice | Tells why a turn ended. | `chat-stop-notice` |
| Error | Shows an error in plain words. Buttons under it fix the problem. | `chat-error` |
| Error text | The words of the error. | `chat-error-text` |
| Error buttons | **Send again**, **Restart**, **Restart and send again**, **Try again**, **Open Agents**, **Choose another agent**, **Start a new chat**, **Details...**, **Show in Event Viewer**. The name ends with the id of the button. | `chat-error-*` |
| Error details | The technical text, under the buttons, after you click **Details...**. | `chat-error-details-text` |
| Restart | Says **Restarting the agent...** with a bar, and then **The agent is running again.** The attribute `data-state` is `working` or `done`. | `chat-restart-status` |
| Not sent | Marks your message that did not reach the agent. | `chat-message-not-sent` |
| Send again | Sends the message that was not sent. | `chat-message-send-again` |
| Edit | Takes the message back into the box so that you can change it. | `chat-message-edit` |
| Stopped | Marks your message that the agent started on and then stopped. | `chat-message-stopped` |
| Newer messages | Shows above the message box when new text arrives while you read older text. Click it to go to the end. | `chat-new-messages` |
| Card note | A line under a tool card, for example "Denied by you" or "The agent could not finish this step." | `tool-call-note` |
| Show in Event Viewer (step) | A link under a failed step. It opens Event Viewer on the event of that step. | `tool-call-show-event` |
| Restarted note | The line "Restarted. Press Send to try again." It shows after **Restart** put your last message back in the message box. | `chat-restarted-note` |
| Earlier step | A divider above steps of an earlier request. | `tool-call-earlier` |
| Paused banner | Shows when the desktop is paused. It says if Pause stopped a step of this chat. | `chat-paused-banner` |
| Resumed note | Shows above the message that Resume sent: Resumed. Continuing where you stopped. | `chat-resume-note` |
| Answer note | Tells what you answered to the last permission request, for example You allowed: Change NOTE.md. | `chat-permission-result` |
| Starting note | Shows while the agent starts. You can type meanwhile. | `chat-starting` |
| Reopened note | Tells once that the chat was opened again after the program restarted. | `chat-reopened-note` |
| Dismiss note | Hides the reopened note. | `chat-reopened-dismiss` |
| Reconnect | Starts the agent again when it is disconnected. | `chat-reconnect` |
| Sent | A drawn form says "Sent. The agent answered: ..." (the start of the next reply) for 3 seconds after you use a button on it. | `a2ui-sent` |
| Composer | Holds the controls to write. | `chat-composer` |
| Message box | The input for your message. | `chat-composer-input` |
| Mode | Opens the list of modes. Each entry has a short description. | `chat-mode` |
| Mode entry | One mode of the agent. The name ends with the id of the mode. | `chat-mode-*` |
| Ask before every action | Last entry of the mode list. The agent must ask before it reads, writes, or runs anything. | `chat-mode-ask-first` |
| Include open file | Adds the file open in Code to your message. | `chat-include-file` |
| Message box dialog | A question box. Its extra buttons end with the id of the button. | `message-box-action-*` |
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
| Reverted row | A change that was reverted stays in the list, in grey, with the words "Reverted. Restore from the Recycle Bin". | `changes-reverted` |
| Reverted text | The words on a reverted row. | `changes-reverted-text` |
| Open Recycle Bin | The link under the list. It opens the Recycle Bin, where you restore the file. | `changes-open-recycle-bin` |
| Changes pane | The whole pane: the list, the diff and the buttons. | `changes-pane` |
| File name end | The last letters of a file name and its type. A long name is cut in the middle, never at the end. | `changes-name-tail` |
| Lines | The lines added and removed in a file, for example +16 / -0. | `changes-lines` |
| Why a button is dimmed | The line above the buttons that says what to do first. | `changes-reason` |
| Task | One task of the plan. | `tasks-item` |
| Sidebar | The pane for drawn forms. | `chat-sidebar` |
| Sidebar tab | One drawn form. | `chat-sidebar-tab` |
| Close tab | Closes the tab. | `chat-sidebar-tab-close` |
| Resize bar | Changes the width of the sidebar. | `chat-sidebar-resizer` |
| Form row | One drawn form in the transcript. | `chat-surface-row` |
| Form title | Shows the title. | `chat-surface-title` |
| Form state | Shows the title and the place, for example **Board: Open** or **Board: Closed**. | `chat-surface-state` |
| Open, Show | **Open** opens a closed form. **Show** brings an open form to the front. | `chat-surface-open` |
| Close | Hides the form. | `chat-surface-close` |
| Delete | Deletes the form after a question. | `chat-surface-delete` |
| Move to | Opens the list of places. | `chat-surface-move` |
| Move to Inline, Sidebar, Window | Moves the form. | `chat-surface-move-*` |
| Working folder | Shows the folder of the chat. | `chat-cwd` |
| Problem line | Replaces the folder in the status bar while something is wrong. It says what happened and what to click, for example "The agent stopped. Click Restart, then send your message again." | `chat-problem-line` |
| Connection state | Shows the state of the connection. | `chat-status` |
| Permission dialog box | Asks if the agent can act. | `permission-dialog` |
| Allow or refuse | The two choices. The name ends with the id of the choice. Alt+A allows and Alt+D denies. | `permission-option-*` |
| Keys line | Tells which keys answer: Alt+A and Alt+D. | `permission-hint` |
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

### Start a New Chat

To start a new chat, follow the steps below:

1. Click **Start -> New chat**. The **New chat** dialog box appears if a project is plugged in.
2. Select the drive where the agent works.
3. Click **Start chat**. The Chat window opens.

### Send a Message and Stop the Agent

To send a message, type it in the message box and click **Send**.

To stop the agent, click **Stop**.

### Undo a Change of the Agent (Revert)

To undo a change of the agent, follow the steps below:

1. Click **Changes**. In a chat window, click **Tasks and changes** first. The pane opens on the **Changes** tab.
2. Select the file.
3. Click **Revert**. A question appears.
4. Click **Yes**. The file goes back to its old text. The row says "Reverted. Restore from the Recycle Bin".

To get a reverted change back, click **Open Recycle Bin** under the list, or open the **[Recycle Bin](recycle-bin.md)**, select the item, and click **Restore this item**.

The list of changes updates at once when a change is reverted, also when it is reverted somewhere else. Each row shows the full file name, with the lines added and removed (for example "+4 / -1") at the right.

### Change the Model

To change the model, select another entry in **Model**.

## 6 - Troubleshooting

- **Send is dimmed.** Type a message first. Send is also off while the agent works. Click **Stop** to end the turn.
- **Model is dimmed.** The agent offers no models.
- **The window says Opening the chat.** Wait. If the text stays, open **[Event Viewer](event-viewer.md)** to see the messages.
- **The agent waits.** The agent can wait for your answer. Click the flag in the notification area.
- **The status bar shows an error.** The agent program stopped. Open **[Task Manager](agent-manager.md)**.

## 7 - Need Help?

Read **[Event Viewer](event-viewer.md)** for the messages of the agent. Read **[Control Center](control-centre.md)** to add an agent or to change permissions.
