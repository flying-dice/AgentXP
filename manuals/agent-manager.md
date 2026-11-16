# Using Task Manager

This manual describes Task Manager. Task Manager shows the chats, the agent processes, the terminals, and the context use of a desktop.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Chats Tab
  - The Processes Tab
  - The Terminals Tab
  - The Performance Tab
  - The Status Bar
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Task Manager to see what the agents do and to end a task or a process that does not respond.

## 2 - Open It

Click **Start -> System Tools -> Task Manager**, or click **Start -> Task Manager**. Only one window exists on a desktop.

## 3 - The Window

### The Chats Tab

The **Chats** icon on the desktop opens Task Manager on the **Chats** tab. When you open Task Manager from the Start menu, it opens on the **Processes** tab if a chat has a problem or a chat is still working, because that is where you stop the agent program. Otherwise it opens on the **Chats** tab.

A line above the list says **Closed chats stay here. Double-click a chat to open it again.** The tab lists the chats with the columns **Chat**, **Agent**, **Window**, **Status**, and **Context**. **Window** says **Open** when the chat has a window on the desktop and **Closed** when you closed it. A closed chat is not ended: if it works, its status still reads **Working**. A chat that waits for your next message reads **Idle (the agent program is still running)**. A chat that works shows what it does now after the status, for example **Working: Step 12 of 30**. The tokens of each chat are on the **Performance** tab.

To open a chat, double-click its row, or select it and press Enter or click **Open chat**. The window of that chat opens with its messages and comes to the front, also when you closed the window before. **End Task** stops the turn of the selected chat. The button works only while the chat is busy. To end the agent program itself, use the **Processes** tab.

The **Chats** tab has no chat pane: the list is where you open a chat. The other tabs have the chat pane.

### The Processes Tab

The tab lists the agent programs with the columns **Agent**, **PID**, **Desktop**, **Chats**, **Memory**, and **CPU**. **Memory** and **CPU** show what the program uses now. A dash means that Agent7 cannot read it. **End process** stops the selected program. Its chats close, and work in progress is lost.

### The Terminals Tab

The tab lists the terminals of the chats with the columns **Chat**, **Command**, **Status**, and **Working folder**.

### The Performance Tab

The tab shows a bar for each chat. The bar shows how much of the context window the chat used.

### The Status Bar

The window refreshes the lists every two seconds. The status bar shows the number of processes, chats, and terminals, and the average use of the context.

### The Chat Pane

Each Task Manager window has a chat pane at its right edge, except on the **Chats** tab. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Task Manager window | The root of the window. | `agent-manager-app` |
| Tabs | Chats, Processes, Terminals, Performance. | none |
| Chats | The list of chats. | `agent-manager-chats` |
| Chat | One chat. The first chat is selected when the window opens, so **Open chat** is ready. | `agent-manager-chat` |
| Hint | The line above the chats: closed chats stay in the list, and a double-click opens one again. | `agent-manager-hint` |
| Open chat | Opens the window of the selected chat and brings it to the front. Double-click a row or press Enter to do the same. | `agent-manager-open-chat` |
| End Task | Stops the turn of the selected chat. | `agent-manager-end-task` |
| Reason note | Says why End process or End Task is off, for example **Select a chat first**. | `agent-manager-reason` |
| End process | Stops the selected agent program after a question. | `agent-manager-end-process` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `agent-manager-menu-help` |
| Menu: about | Opens the About Task Manager box. | `agent-manager-menu-about` |
| Dialog: about | The About Task Manager box. | `agent-manager-about` |
| Dialog: about ok | Closes the About box. | `agent-manager-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `agent-manager-menu-chat-pane` |
| Chat pane edge | The tab at the right edge with a chat icon and the word Chat. Click it to open the chat pane. | `chat-pane-toggle` |
| Menu: switch | File menu: opens the selected chat. | `agent-manager-menu-switch` |
| Menu: close | Closes the window. Alt+F4. | `agent-manager-menu-close` |
| Menu: refresh | View menu: refreshes the lists. F5. | `agent-manager-menu-refresh` |
| Menu: tab * | View menu: shows a tab (Chats, Processes, Terminals, Performance). | `agent-manager-menu-tab-*` |
| Menu: end task | Options menu: ends the task of the selected chat. | `agent-manager-menu-end-task` |
| Menu: end process | Options menu: ends the selected agent process. | `agent-manager-menu-end-process` |
| Context menu: switch | Opens the chat. | `agent-manager-ctx-switch` |
| Context menu: end task | Ends the task of the chat. | `agent-manager-ctx-end-task` |
| Context menu: end process | Ends the agent process. | `agent-manager-ctx-end-process` |
| Context menu: refresh | Refreshes the lists. | `agent-manager-ctx-refresh` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To open a chat that you closed, follow the steps below:

1. Click **Chats** on the desktop. Task Manager opens on the **Chats** tab.
2. Double-click the chat.

To stop a chat that does not respond, follow the steps below:

1. Open the **Chats** tab.
2. Select the chat. Its status is busy.
3. Click **End Task**.

To end an agent program, follow the steps below:

1. Open the **Processes** tab and select the agent.
2. Click **End process**. A question appears, for example: End 'Claude Code'? Its 1 chat will stop and work in progress is lost. The chats and their messages stay.
3. Click **Yes**.

## 6 - Troubleshooting

- **Open chat is dimmed.** No chat is selected. Select a chat first.
- **End Task is dimmed.** The selected chat does not work now.
- **The Processes tab is empty.** No agent runs. Start a chat.
- **The status bar shows an error.** Task Manager could not read the lists. Wait for the next refresh.

## 7 - Need Help?

Read **[Chat](chat.md)** to start a new chat. Read **[Event Viewer](event-viewer.md)** for the messages of the agent.
