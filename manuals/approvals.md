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

1. Click the status in the top bar, for example **Fix login redirect is waiting: run a command**. The chat that waits comes to the front. With more than one request, the link opens the oldest first, and the box says **1 of 2 waiting**. You can also click the flag in the notification area, and then **Review** next to the request.
2. Read the box above the message box. It shows the file or the command. If the text is long, scroll inside the box. **Allow** and **Deny** always stay in the window.
3. Click **Allow** to let the agent go on, or click **Deny** to stop the action. You can also press A to allow. The Left and Right arrow keys move between the two choices.

The focus starts on **Deny**, because Deny is the safe answer. Enter denies. The line **Enter denies. Press A to allow.** shows beside the two choices. When Agent7 asks because of a setting, for example **Run commands is set to Ask in Control Center.**, the box shows this on its own line under the command. After you answer, the chat shows a line, for example **You allowed: Change NOTE.md.**

If you click **Deny**, the agent tells you that it could not do the action. The request leaves the Action Center.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Keys line | Tells which keys answer the request in the permission dialog box of the Action Center: Enter denies, A allows. | `uac-hint` |
| Keys line (chat) | The same line in the permission box of a chat. | `permission-hint` |
| Waiting count | The line **1 of 2 waiting** in the box, when more than one request waits. | `permission-queue` |
| Waiting count (Action Center) | The same line in the permission dialog box of the Action Center. | `uac-queue` |
| Setting line | The setting that made Agent7 ask, for example **Run commands is set to Ask in Control Center.** It shows under the command, never inside it. | `permission-detail-setting` |
| Answer note | The line in the chat that tells what you answered. | `chat-permission-result` |

## 5 - Troubleshooting

- **The agent waits and nothing appears.** Click the flag in the notification area. The request waits there.
- **Too many requests.** Set the actions that you trust to **Allow** in the Control Center.
- **A review never asks.** A reviewer only reads. It cannot change files.

## 6 - Need Help?

Read **[Using Control Center](control-centre.md)** to learn all permission settings.
