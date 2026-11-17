# Using Chat

This manual describes the Chat window. A chat is one conversation with an agent.

## Table of Contents

- 1 - What It Is For
- Undo a change of the agent (in 5 - Common Tasks)
- 2 - Open It
- 3 - The Window
  - The Menu Bar
  - The Model Bar
  - The Transcript
  - The Composer
  - The Changes Pane
  - The Sidebar
  - The Status Bar
  - Permission Requests
- 4 - Controls Reference
- 5 - Common Tasks
  - Undo a Change of the Agent (Revert)
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Chat to tell the agent what to do and to read what the agent does. The transcript shows each message, each step the agent takes, and each plan. You can stop the agent, undo its file changes, and answer its requests. To undo a change, click **Changes** at the top of the window, select the file, and click **Revert**.

## 2 - Open It

- Click **Start -> New chat**. If you have a project folder (plugged in), a dialog box asks where the agent works.
- Double-click **Chats** on the desktop. The latest chat opens.
- Click a chat under **Recent chats** in the Start menu.
- In a Chat window, click **File -> Open Recent** and click a chat.
- Click **Start a chat on this drive** in the AutoPlay dialog box.

## 3 - The Window

### The Menu Bar

The menu bar is at the top of the window. It has the menus **File**, **Edit**, **Tools**, **View**, and **Help**.

Click **View -> Follow this chat** to watch the agent work. Code comes to the front at the lines that the agent reads or changes, the Terminal shows its commands, and the agent cursor moves with each step. The keyboard focus stays where you are. A check mark shows that you follow the chat. Click the item again, or **Stop following** on the top bar, to stop. The follow also stops at the end of the turn, unless **Keep following** on the top bar is selected. See **[Using the Desktop](desktop.md)**.

### Close a Chat and Open It Again

When you close a Chat window, AgentXP keeps the chat. The transcript, the changes, and the plan stay. If the agent works, it continues.

To open a chat again, use one of these ways:

- Click **Start**, and click the chat under **Recent chats**.
- In a Chat window, click **File -> Open Recent**. The list shows up to nine chats, the latest first. Press the number of a chat to open it. Click **All chats...** to see every chat of the desktop in Task Manager.

The chat opens with all its messages. The note **Reopened** tells you that your earlier messages are kept.

If the agent can load its earlier session, it remembers the chat. If the agent cannot load it, for example after AgentXP restarted, AgentXP starts a new session and sends the conversation so far with your next message. The agent then continues from there.

> **Note:** A conversation in the chat pane of an app window is kept too, after you wrote a message in it. See **[Chat pane](embedded-chat.md)**.

### The Model Bar

The bar below the menu has the **Model** list and the **Changes** button.

### The Transcript

The transcript is the large area in the middle. It shows your messages and the answer of the agent. Everything the agent does on the way, such as its messages between tool calls, its reasoning, and its tool calls, is folded into one **Thinking** line. Click the line to open it, or choose **View -> Show thinking and tool details** to open all of them. A permission request opens its line by itself. Each tool call has a card. A card shows the state of the call: running, waiting, done, failed, or cancelled. If a turn ends in an unusual way, a notice tells why. An error appears as a red row.

If the agent only worked in the Browser, the Thinking line reads **Used 28 steps in the browser (read, clicked, typed)**. Point at the line to see how many steps of each kind there were. A line under it names the first and the last step in plain words, for example **First: Opened localhost:3000/chat. Last: Typed 'hi' in the Message box.** A click or typing names the button, link, or box that the agent used, for example **Clicked the button 'Send'**. Open the line to see every step in plain words. Names of tools and numbers of page elements show only under **Show**.

The agent works out of sight. When it reads, searches, changes a file, or runs a command, no window opens and nothing takes the focus. Each step has a link to the place where you can see it: **Show in Code**, **Show diff**, **Show in Terminal**, or **Show in Browser**. The links show while the step runs and when it is done. You clicked the link, so the window opens in front with the focus.

When the agent shows you something on purpose (the `show` tool), the step says what and why:

- **Showed you auth.ts:40-62: Here the token is checked** – You saw it. The window came to the front at the spot, with the note of the agent.
- **Will show you ...** – Another show was on the screen. This one comes when you close that note.
- **Asked to show you ...** – You worked in another window, so a **Show request** balloon appeared instead. The request stays in the Action Center.
- **Not shown (Never): ...** – **Agent may show you things** is set to **Never** in Control Center. Nothing moved.

Click **Show again** under the step to open the target at the spot again, with the note. See **[Using the Desktop](desktop.md)**.

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

### The Changes Pane

Click **Changes** to open the pane at the right. It has two tabs.

- **Changes** – Lists each file that the agent changed and that is not committed yet. When you commit a file in Git, its row leaves the list. Select a file to see the diff. **Revert** undoes the change. **Open in editor** shows the file in Code.
- **Tasks** – Shows the plan of the agent, with a bar for the finished tasks.

### The Sidebar

A form that the agent draws for the sidebar appears in a pane at the right, with one tab for each form. Drag the edge of the pane to change its width.

### The Status Bar

The status bar shows the working folder, the use of the context window, and the state of the connection.

### Permission Requests

If you set an action to **Ask**, a permission box opens over the desktop and dims it, whichever window or chat the request came from, so you cannot miss it. It has the question, the command or the diff, and the choices. Click the first choice to allow the action. Click the second to refuse it. Click **Not now** or press Esc to close the box without an answer: the request stays in the Action Center, and the link on the top bar brings the box back. When more than one request waits, the box says, for example, **1 of 2 waiting**. See **[Desktop](desktop.md)** for the box.

The focus starts on **Deny**, because Deny is the safe answer. You can answer with the keyboard: Enter denies, and A allows. Alt+A and Alt+D work too. The Left and Right arrow keys move between the choices. After you answer, a line in the chat tells what you chose, for example **You allowed: Change NOTE.md.** or **You denied: Run a command.**

### When the Agent Does Not Start

If the agent cannot start, a red row in the chat says why and names the program. No dialog box covers the chat. The row has these buttons:

- **Try again** – Starts the agent again. If you chose another default agent in Control Center, the button reads **Try again with** and the name of that agent, and the chat uses that agent.
- **Open Agents** – Opens Control Center at **Agents**, where you can correct the command of the agent.
- **Choose another agent** – Opens Control Center at **Agents**. Make another agent the default, come back, and click **Try again**. When the program was not found, and after the agent failed a second time, this is the highlighted button, because trying again cannot help.

The row says what to do next. For a program that is not there: **Check the command in Agents, or choose another agent.** For a program that stops at once: **Check that it is installed, or choose another agent.** When you made another agent the default and it could not start either, the row says **The default agent is now** and the name, and **It could not start either.** - **Details...** – Shows more under the buttons. The first line is the same plain sentence as the row. For a program that did not start, a second line says **What to do: open Agents and choose another agent.** The technical text is below a line, under the words **Technical details**. Click **Hide details** to close it.

While the agent restarts, the chat says **Restarting the agent...** with a progress bar, and then **The agent is running again.** If the agent fails a second time, the row adds the cause, for example **It stopped again: the program 'x' was not found.** The row then says **The details are in Event Viewer.**, with a link. The button **Start a new chat with your text** replaces **Restart and send again**, so that you do not send your message into the same failure again. The new chat opens with your text in its message box. Press Enter to send it. The old chat shows **Continued in a new chat.** in grey, with no red box, and its status bar says the same. After **Restart** or **Reconnect**, when your last request did not go through, the chat says **AgentXP restarted. Your last request was not sent again:** and shows your text. Click **Send it again** to send it. **Restart and send again** sends the request for you, and the chat says **Your request was sent again.** Your first message then says **Stopped** and the repeat says **Sent again**, so you see each try once. Press Ctrl+N or choose **File -> New chat** to start a new chat on the same folder at any time.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Chat window | The root of the window. | `chat-app` |
| File menu | Opens the File menu. | `menubar-file` |
| New chat (menu) | Starts a new chat on the folder of this chat. Ctrl+N. | `chat-menu-new` |
| Open Recent (menu) | File menu: lists up to nine other chats of the desktop, the latest first. Click a chat to open it again with its history. | `chat-menu-recent` |
| Recent chat | One chat in **Open Recent**. Its number is the access key. | `chat-menu-recent-item` |
| No other chats | Shows in **Open Recent** when the desktop has no other chat. | `chat-menu-recent-none` |
| All chats... | Last item of **Open Recent**: opens Task Manager on the Chats tab. | `chat-menu-recent-all` |
| Clear transcript... | Removes the messages from the window after a question. | `chat-menu-clear` |
| Review changes (menu) | Opens the Code Review box for the project of the chat. | `chat-menu-review` |
| Open in Code (menu) | Opens the Code app on the project of the chat. | `chat-menu-code` |
| Task Manager (menu) | Opens Task Manager, where you can see and end the agent programs. | `chat-menu-task-manager` |
| End the agent program (menu) | File menu: opens Task Manager on the Processes tab, where **End process** ends the agent program. | `chat-menu-end-agent` |
| Event Viewer (menu) | Opens Event Viewer on the events of this chat. | `chat-menu-event-viewer` |
| Show thinking and tool details (menu) | Opens every Thinking line at once, in all chats and Code Review windows. Off by default. | `chat-menu-details` |
| Changes (menu) | View menu: shows or hides the Changes pane. | `chat-menu-panel` |
| Follow this chat | View menu: follows this chat (Code, the Terminal and the agent cursor go with its steps) or stops the follow. It has a check mark while you follow the chat. | `chat-menu-follow` |
| Close | Closes the window. The agent keeps working. (Tooltip: "Close this window. The agent keeps working.") | `chat-menu-close` |
| Help menu | Opens the Help menu. | `menubar-help` |
| View Help | Opens the Chat Help window. F1. | `chat-menu-help` |
| Model | Selects the model of the agent. | `chat-model` |
| Changes | Shows or hides the right pane. Its tooltip is **Changes the agent made: review, revert**. | `chat-panel-toggle` |
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
| Stop notice | Tells why a turn ended. After your own Stop it says **You stopped this reply. The agent waits for your next message.** | `chat-stop-notice` |
| Stop notice text | The first sentence of the notice. | `chat-stop-notice-text` |
| Stop notice: agent program | The second line, shown while the agent program still runs: **To end the agent program, use File > End the agent program.** | `chat-stop-notice-program` |
| Error | Shows an error in plain words. Buttons under it fix the problem. When you ended the agent program yourself, it is a grey notice with an information icon, and the attribute `data-notice` is true. | `chat-error` |
| Error text | The words of the error. | `chat-error-text` |
| Error buttons | **Send again**, **Restart**, **Restart and send again**, **Try again**, **Open Agents**, **Choose another agent**, **Start a new chat**, **Details...**. The name ends with the id of the button. The button that fixes the problem, for example **Restart**, is highlighted. | `chat-error-*` |
| Event Viewer (error link) | The link in the sentence **The details are in Event Viewer.** under the buttons of a crash. | `chat-error-event-viewer` |
| Error details | The plain sentence first, then what to do, then the technical text under **Technical details**, under the buttons, after you click **Details...**. | `chat-error-details-text` |
| Restart | Says **Restarting the agent...** with a bar, and then **The agent is running again.** The attribute `data-state` is `working` or `done`. | `chat-restart-status` |
| Not sent | Marks your message that did not reach the agent. | `chat-message-not-sent` |
| Send again | Sends the message that was not sent. | `chat-message-send-again` |
| Edit | Takes the message back into the box so that you can change it. | `chat-message-edit` |
| Stopped | Marks your message that the agent started on and then stopped. | `chat-message-stopped` |
| Sent again | Marks the repeat of a message that was stopped. | `chat-message-sent-again` |
| Request sent again | The line **Your request was sent again.** after **Restart and send again**. | `chat-resent-note` |
| Newer messages | Shows above the message box when new text arrives while you read older text. Click it to go to the end. | `chat-new-messages` |
| Card note | A line under a tool card, for example "Denied by you" or "The agent could not finish this step." | `tool-call-note` |
| Show in Event Viewer (step) | A link under a failed step. It opens Event Viewer on the event of that step. | `tool-call-show-event` |
| Show in Code (step) | A link under a step that read, searched, or changed a file. It opens Code at the file and marks the lines that the agent read, or the first match of a search. | `tool-call-show-code` |
| Show diff (step) | A link under a step that changed or wrote a file. It opens Code on the change of that file. | `tool-call-show-diff` |
| Show in Terminal (step) | A link under a step that ran a command. It opens Terminal on that command. | `tool-call-show-terminal` |
| Show in Browser (step) | A link under a Browser step. It brings that Browser window to the front. | `tool-call-show-browser` |
| Show again (step) | A link under a step that showed you something. It opens the target at the spot again, with the note. | `tool-call-show-again` |
| Restarted note | The line "AgentXP restarted. Your last request was not sent again:" with your text. It shows after **Restart** when your last request did not go through. | `chat-restarted-note` |
| Restarted text | Your last request, on one line, in the restarted note. | `chat-restarted-text` |
| Send it again | Sends your last request again, in one click. | `chat-restarted-resend` |
| Sender | The name above a message: **You**, or **AgentXP (automatic)** for the message that Resume sends. | `chat-message-sender` |
| Earlier step | A divider above steps of an earlier request. | `tool-call-earlier` |
| Paused banner | Shows when the desktop is paused. It says if Pause stopped a step of this chat. | `chat-paused-banner` |
| Resumed note | Shows above the message that Resume sent: Resumed. Continuing where you stopped. | `chat-resume-note` |
| Answer note | Tells what you answered to the last permission request, for example You allowed: Change NOTE.md. | `chat-permission-result` |
| Starting note | Shows while the agent starts. You can type meanwhile. | `chat-starting` |
| Reopened note | Tells once that the chat was opened again after the program restarted. | `chat-reopened-note` |
| Dismiss note | Hides the reopened note. | `chat-reopened-dismiss` |
| Reconnect | Starts the agent again when it is disconnected. | `chat-reconnect` |
| Sent | A drawn form says "Sent. The agent answered: ..." (the start of the next reply) until you change a field of the form again. | `a2ui-sent` |
| Composer | Holds the controls to write. | `chat-composer` |
| Message box | The input for your message. | `chat-composer-input` |
| Mode | Opens the list of modes. Each entry has a short description. | `chat-mode` |
| Mode entry | One mode of the agent. The name ends with the id of the mode. | `chat-mode-*` |
| Ask before every action | Last entry of the mode list. The agent must ask before it reads, writes, or runs anything. | `chat-mode-ask-first` |
| Include open file | Adds the file open in Code to your message. | `chat-include-file` |
| Message box dialog | A question box. Its extra buttons end with the id of the button. | `message-box-action-*` |
| Attach... | Adds files. | `chat-attach` |
| Stop | Stops the answer of this chat now. The chat stays. (Tooltip: "Stop this chat's answer now.") | `chat-stop` |
| Send | Sends the message. | `chat-send` |
| Changes pane | The right pane. | `chat-side-panel` |
| Changes tab | Shows the changed files. | `chat-tab-changes` |
| Tasks tab | Shows the plan. | `chat-tab-tasks` |
| Changed files | The list of changes. | `changes-list` |
| Diff | Shows the diff of the selected file. | `changes-diff` |
| Revert | Undoes the selected change. | `changes-revert` |
| Open in editor | Shows the selected file in Code. | `changes-open-editor` |
| Reverted row | A change that was reverted stays in the list, in grey, with the word "Reverted". Point to it to read "Reverted. Select it and click Restore to put the file back." | `changes-reverted` |
| Reverted text | The word "Reverted" on a reverted row. Its tooltip has the full words. | `changes-reverted-text` |
| Row menu: Revert | Right-click a changed file: undoes the change, after a question. | `changes-ctx-revert` |
| Row menu: Open in editor | Right-click a changed file: shows the file in Code. Dimmed for a deleted file. | `changes-ctx-open-editor` |
| Row menu: Show in the Recycle Bin | Right-click a reverted file: opens the Recycle Bin on it. To put it back in one click, select the row and click **Restore**. | `changes-ctx-restore` |
| Menu: undo revert | Edit menu: takes the file that you reverted last out of the Recycle Bin. It shows only right after a revert. | `chat-menu-undo-revert` |
| Open Recycle Bin | The link in the one line above the list. It opens the Recycle Bin, where you restore the file. | `changes-open-recycle-bin` |
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
| Problem line | Replaces the folder in the status bar while something is wrong. It says what happened and what to click, in a short line that fits, for example "The agent stopped. Click Send again." | `chat-problem-line` |
| Connection state | Shows the state of the connection. While a permission request waits it reads **Waiting for your answer**. | `chat-status` |
| Not responding link | Shows in the status bar when the chat has worked for more than 20 seconds. It opens Task Manager on the Processes tab. | `chat-end-agent-link` |
| Continued note | Says **Continued in a new chat.** in grey in the old chat after **Start a new chat**. The old chat shows no red box. | `chat-continued-note` |
| Retry line | Says **Press Send to try again.** above the message box while the text of a message that did not go through is in the box. It goes away when a send works. When you send the same text again, the first copy is replaced, so the chat shows the message once. | `chat-retry-hint` |
| Project tree | The tree of files, shown in Code. | `file-tree` |
| Sidebar tab label | Shows the surface of the tab in the sidebar. | `chat-sidebar-tab-label` |

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

To stop the answer of the chat, click **Stop**. The chat says **You stopped this reply. The agent waits for your next message.** To end the agent program itself, choose **File -> End the agent program...** or **Tools -> Task Manager...**. Task Manager opens on the **Processes** tab. When the chat has worked for more than 20 seconds, the status bar adds the link **Not responding? End the agent program**.

When you end the agent program yourself, the chat shows a grey notice, not a red box: **You ended the agent program. Click Restart to use the chat again.** The message box stays empty and **Send** is off until the agent runs again. **Restart** only starts the agent. It does not send anything.

### Undo a Change of the Agent (Revert)

To undo a change of the agent, follow the steps below:

1. Click **Changes** at the top of the chat window. The pane opens on the **Changes** tab.
2. Select the file.
3. Click **Revert**. A question appears.
4. Click **Yes**. The file goes back to its old text. The row says "Reverted". To put it back, select the row and click **Restore**. You can also right-click the row and click **Show in the Recycle Bin**, or click **Edit**, **Undo revert** right after the revert.

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
