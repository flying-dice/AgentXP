# The Agent Does Not Start

This topic helps when you open a chat and the agent gives no answer, the page stays blank, or the status says that the agent is disconnected.

## Table of Contents

- [1 - What You See](#1-what-you-see)
- [2 - Try These Steps](#2-try-these-steps)
- [3 - Troubleshooting](#3-troubleshooting)
- [4 - Need Help?](#4-need-help)

---

## 1 - What You See

When an agent does not start, you see one of these signs:

- The chat gives no answer to your message.
- The status bar says **Disconnected**, **Connecting**, or **Error**.
- The chat window stays blank.
- The chat shows a red row that says that the agent could not start, and names the program.

## 2 - Try These Steps

To start the agent again, follow the steps below:

1. Make sure that the desktop is not paused. If the top bar says **Resume agents and continue**, click it.
2. Look at the red row in the chat. Click **Try again**. If you chose another default agent, the button reads **Try again with** and the name of that agent.
3. Click **Open Agents** in the red row, or click **Start -> Control Center** and then **Agents**. Make sure that the agent is in the list and that its command is right. To use another agent, click **Choose another agent**, make that agent the default, and click **Try again**.
4. Make sure that the project folder is plugged in. An ejected project stops the chats that work on it. See **[Add or Remove a Project](projects.md)**.
5. Start a new chat. Click **Start -> New chat**, or press Ctrl+N in the Chat window.

Click **Details...** in the red row to read the technical text under the buttons. Click **Hide details** to close it.

If the agent fails a second time, the row adds the cause, and the button **Start a new chat** shows. Click **Show in Event Viewer** to see the last rows of the log, or open **Event Viewer** yourself. The last rows tell what the agent said when it stopped.

## 3 - Troubleshooting

- **The page stays blank.** Wait a few seconds. The agent needs time to start. If the page is still blank, start a new chat.
- **The agent gives no answer.** Click **Stop**, and then send the message again.
- **The agent asks for permission and nothing else happens.** Click the flag in the notification area and answer the request. See **[Approve Every Action](approvals.md)**.
- **The chat says that the folder does not exist.** The project was ejected or moved. Plug in the project again.

## 4 - Need Help?

Read **[Using Chat](chat.md)** to learn the parts of a chat window. Read **[Using Control Center](control-centre.md)** to learn how to add an agent.
