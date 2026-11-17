# Using the Chat Pane

This manual describes the chat pane at the right edge of an app window. The pane is a short chat with an agent about the window that holds it.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Pane
  - The Edge Toggle
  - The Title Bar
  - The Suggestions
  - The Transcript and the Composer
  - What the Agent Sees
  - Explain This and Ask the Agent
  - The Other Panels
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use the chat pane to ask a short question about what you look at, for example "Explain this". The pane is in every app window, so you do not leave the app. The agent knows the open file, the selection, or the page. It answers in a few sentences.

The pane has no history. It belongs to its window. When you close the window, AgentXP deletes the pane chat. The pane chat is not in the list of your chats. For a long task, start a chat in the **[Chat](chat.md)** window.

The **[Chat](chat.md)** window and **[Code Review](code-review.md)** have no chat pane. Chat is the chat. Code Review has a reviewer panel of its own. Windows that the agent draws, see **[Agent Window](surface.md)**, have no chat pane.

## 2 - Open It

Each new window starts with the pane closed. Use one of these ways.

- Click the thin strip at the right edge of the window.
- Click **View -> Chat pane**.
- Press Ctrl+Shift+C.
- Right-click selected text and click **Explain this**.

AgentXP remembers if the pane is open, and its width, for each window.

## 3 - The Pane

### The Edge Toggle

When the pane is closed, a strip shows at the right edge of the window. It is 44 pixels wide and has a chat icon. It reads **Chat**, and in the Code window it reads **Ask about this file**. Point to it to read **Open the chat pane: ask about what you are looking at**. Click the strip to open the pane.

### The Title Bar

The title bar shows **Chat about** and the folder where the pane works, for example **Chat about login-app (E:)**, and the state of the agent. Under it, the link **Open as a chat window** starts a chat in its own window on the same folder. The arrow button closes the pane to the thin strip. The **New conversation** button deletes the chat and shows an empty pane. The button shows after the first message.

### The Empty Pane

Before the first message, the pane says: **Ask about what you are looking at. This is a quick pane: it ends when you close the window. For a chat that you can come back to, use Start > New chat.** The chat pane is not a Chat window. To keep a conversation, start a chat from **Start -> New chat**, or click **Open as a chat window**.

### The Suggestions

Above the message box, the pane shows buttons with questions that fit the window, for example **Explain this** or **Summarise this page**. Click a button to send its question.

### The Transcript and the Composer

These work like the ones in **[Chat](chat.md)**. Type a message and press Enter. Before the first message, the pane has no chat. AgentXP starts the chat when you send the first message.

### What the Agent Sees

With each message, the agent gets the state of the desktop and the context of the window. The context depends on the app.

| App | The agent sees |
|---|---|
| Code | The open file, all open tabs, the selected lines, and the Git status of the file. |
| Notepad and WordPad | The file and the selected text. |
| Explorer | The folder and the selected items. |
| Terminal | The last lines of output and the selected text. |
| Browser | The address, the title, and the text that you selected when you right-clicked the page. |
| Event Viewer | The selected event. |
| Task Manager | The tab and the selected row. |
| Recycle Bin | The selected change. |
| Paint | The size of the canvas, the tool, and the color. |
| Sticky Notes | The text of the selected note. |
| Help and Support | The topic on the screen. |

The agent works in the folder of the drive that the window shows. Without a drive, it works in its own home folder. The agent can use the tools of the apps that are open. For example, in the Browser pane the agent can read and click in the page.

### Explain This and Ask the Agent

The context menus of the apps have a group of chat items.

- **Ask the agent about this...** opens the pane and puts a draft in the message box. Type your question below the draft and press Enter.
- **Explain this** opens the pane and sends the selected text with the question. The chat shows, for example, "Explain lines 1 to 2 of index.ts." The button **Explain this** above the message box sends the same message. It is dimmed until you select some text.
- **Send selection to chat** opens the pane and sends the selected text.

### The Other Panels

**[Chat](chat.md)** and **[Code Review](code-review.md)** use the same panel with the role `chat` and `review`. These panels have a header with the arrow button. They have no suggestions and no **New conversation** button.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Panel | The root of the panel. The attributes `data-role` (`aside` for the chat pane), `data-session-id`, and `data-collapsed` describe it. | `embedded-chat` |
| Chat pane | The holder of the pane in an app window. | `chat-pane` |
| Edge toggle | The tab at the right edge, with a chat icon and the word Chat. It pulses when the chat has news. Click it to open the pane. | `chat-pane-toggle` |
| Open as a chat window | The link under the title bar. It starts a chat in its own window on the same folder. | `embedded-chat-open-window` |
| Open or close | Hides the pane. In Code Review it shows or hides the panel. | `embedded-chat-toggle` |
| Title | The name of the chat. | `embedded-chat-title` |
| Status | The state of the agent: Ready, Connecting..., Connected, Working..., Disconnected. | `embedded-chat-status` |
| Reconnect | Starts the agent again after a failure. | `embedded-chat-reconnect` |
| New conversation | Deletes the chat and shows an empty pane. | `embedded-chat-new` |
| Suggestions | The row of suggestion buttons. | `embedded-chat-suggestions` |
| Suggestion | One suggestion button. The attribute `data-suggestion` names it. | `embedded-chat-suggestion` |
| Edge | Drag it to change the width. | `embedded-chat-resizer` |
| Empty pane | Shows before the first message, or while the chat is not ready. | `embedded-chat-blank` |

Each app has the item **View -> Chat pane** with the test id `<app>-menu-chat-pane`, for example `notepad-menu-chat-pane`. The shortcut is Ctrl+Shift+C.

## 5 - Common Tasks

To ask about a file, open the file, press Ctrl+Shift+C, and click **Explain this**.

To ask about some lines, select the lines, press Ctrl+Shift+C, and type your question.

To start again, click **New conversation**.

To make the pane wider, drag its left edge.

To keep the answer, copy the text. AgentXP deletes the pane chat when you close the window.

## 6 - Troubleshooting

- **The pane is empty.** The pane has no chat until you send the first message.
- **The agent does not know my selection.** Select the text again, then open the pane. In the Browser, right-click the selection first.
- **There is no pane in the window.** Chat, Code Review, and agent windows have no chat pane.
- **The pane does not answer.** The agent is busy with the last question. Wait, or click **Stop**.

## 7 - Need Help?

Read **[Chat](chat.md)** for the controls of the transcript and the composer. Read **[Code Review](code-review.md)** for the reviewer panel.
