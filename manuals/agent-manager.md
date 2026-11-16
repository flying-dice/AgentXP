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

The tab lists the chats with the columns **Chat**, **Agent**, **Status**, **Tokens**, and **Context**. **End Task** stops the turn of the selected chat. The button works only while the chat is busy.

### The Processes Tab

The tab lists the agent programs with the columns **Agent**, **PID**, **Desktop**, and **Chats**. **End process** stops the selected program. Its chats close, and work in progress is lost.

### The Terminals Tab

The tab lists the terminals of the chats with the columns **Chat**, **Command**, **Status**, and **Working folder**.

### The Performance Tab

The tab shows a bar for each chat. The bar shows how much of the context window the chat used.

### The Status Bar

The window refreshes the lists every two seconds. The status bar shows the number of processes, chats, and terminals, and the average use of the context.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Task Manager window | The root of the window. | `agent-manager-app` |
| Tabs | Chats, Processes, Terminals, Performance. | none |
| Chats | The list of chats. | `agent-manager-chats` |
| Chat | One chat. | `agent-manager-chat` |
| End Task | Stops the turn of the selected chat. | `agent-manager-end-task` |
| End process | Stops the selected agent program after a question. | `agent-manager-end-process` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To stop a chat that does not respond, follow the steps below:

1. Open the **Chats** tab.
2. Select the chat. Its status is busy.
3. Click **End Task**.

To end an agent program, follow the steps below:

1. Open the **Processes** tab and select the agent.
2. Click **End process**. A question appears.
3. Click **Yes**.

## 6 - Troubleshooting

- **End Task is dimmed.** The selected chat does not work now.
- **The Processes tab is empty.** No agent runs. Start a chat.
- **The status bar shows an error.** Task Manager could not read the lists. Wait for the next refresh.

## 7 - Need Help?

Read **[Chat](chat.md)** to start a new chat. Read **[Event Viewer](event-viewer.md)** for the messages of the agent.
