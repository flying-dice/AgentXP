# Approve Every Action

This topic tells you how to make the agent ask before it does anything, and how to answer its requests.

## Table of Contents

- [1 - Why Ask First](#1-why-ask-first)
- [2 - Make the Agent Ask](#2-make-the-agent-ask)
- [3 - Answer a Request](#3-answer-a-request)
- [4 - Controls Reference](#4-controls-reference)
- [5 - Troubleshooting](#5-troubleshooting)
- [6 - Need Help?](#6-need-help)

---

## 1 - Why Ask First

By default, the agent can read files without asking. It asks before it writes a file or runs a command. If you want to see each step, set more actions to **Ask**.

## 2 - Make the Agent Ask

To approve every action, follow the steps below:

1. Click **Start -> Control Center**. The Control Center window opens.
2. Click **Permissions**.
3. Set each row to **Ask**.
4. Close the window. The new settings apply at once.

## 3 - Answer a Request

To answer a request, follow the steps below:

1. Click the flag in the notification area. The Action Center opens.
2. Click **Review** next to the request. The permission dialog box appears.
3. Click **Show details** to see the file or the command.
4. Click **Allow** to let the agent go on, or click **Deny** to stop the action. You can also press Alt+A to allow or Alt+D to deny. The Left and Right arrow keys move between the two choices.

The focus starts on **Deny**, because Deny is the safe answer. The line **Press Alt+A to allow or Alt+D to deny.** shows under the choices. After you answer, the chat shows a line, for example **You allowed: Change NOTE.md.**

If you click **Deny**, the agent tells you that it could not do the action. The request leaves the Action Center.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Keys line | Tells which keys answer the request in the permission dialog box of the Action Center: Alt+A and Alt+D. | `uac-hint` |
| Keys line (chat) | The same line in the permission dialog box of a chat. | `permission-hint` |
| Answer note | The line in the chat that tells what you answered. | `chat-permission-result` |

## 5 - Troubleshooting

- **The agent waits and nothing appears.** Click the flag in the notification area. The request waits there.
- **Too many requests.** Set the actions that you trust to **Allow** in the Control Center.
- **A review never asks.** A reviewer only reads. It cannot change files.

## 6 - Need Help?

Read **[Using Control Center](control-centre.md)** to learn all permission settings.
