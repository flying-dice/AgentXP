# Using the Embedded Chat

This manual describes the chat panel at the right edge of some windows. The panel is a short chat with an agent about the window that holds it.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Panel
  - The Title Bar
  - The Transcript and the Composer
  - The Edge
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use the panel to talk to an agent without leaving the window that you work in. The agent sees what the window shows, for example the file that you review. The panel looks the same in each app. The **[Chat](chat.md)** window and **[Code Review](code-review.md)** use it.

## 2 - Open It

The panel is part of its window. It opens with the window. If the panel is closed, click the arrow at its edge.

## 3 - The Panel

### The Title Bar

The title bar shows the name of the chat and the state of the agent. The arrow button closes the panel to a thin strip.

### The Transcript and the Composer

These work like the ones in **[Chat](chat.md)**. Press Enter to send a message.

### The Edge

Drag the left edge of the panel to change its width. If the session is not ready, the panel shows a short text instead of the chat.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Panel | The root of the panel. The attributes `data-role`, `data-session-id`, and `data-collapsed` describe it. | `embedded-chat` |
| Open or close | Shows or hides the panel. | `embedded-chat-toggle` |
| Title | The name of the chat. | `embedded-chat-title` |
| Status | The state of the agent. | `embedded-chat-status` |
| Edge | Drag it to change the width. | `embedded-chat-resizer` |
| Not ready | Shows while the session is not ready. | `embedded-chat-blank` |

## 5 - Common Tasks

To close the panel, click the arrow in the title bar. To open it, click the arrow again.

To make the panel wider, drag its left edge.

## 6 - Troubleshooting

- **The panel is empty.** The session is not ready. Wait for a moment.
- **The agent does not know my file.** Tell the agent the file name in your message.

## 7 - Need Help?

Read **[Chat](chat.md)** for the controls of the transcript and the composer.
