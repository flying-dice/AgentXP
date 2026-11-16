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

There are two ways to make the agent ask. They differ in how long they last:

- **For this desktop only.** Select the check box **Ask before every action (until I untick it)** in the top bar. Every tool asks first. This is not saved. When you clear the box, or restart Agent7, the agent goes back to the settings of Control Center. The bar says so: **This is not saved. To keep a tool on Ask, change it in Control Center.**
- **Always.** Set the tool to **Ask** or **Deny** in Control Center, on the **Permissions** page. Agent7 keeps this setting.

## 2 - Make the Agent Ask

To keep the agent asking, also after you restart Agent7, follow the steps below. To ask only for a while, select **Ask before every action (until I untick it)** in the top bar instead.

While the box is selected, a chip that is not on **Ask** in Control Center reads **Ask (now)**, for example **Run commands: Ask (now)**. Point to the chip to read the saved setting, for example **Saved setting: Allow.** The link **Control Center** in the line **This is not saved...** opens the Permissions page.

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
| Change preview | The lines that change in the permission box of a chat. It shows at least 9 rows and up to 14, then it scrolls. When more rows follow, the last row is cut in half, so you see that there is more. It is the only part of the box that scrolls. The chat above the box keeps one row at least. | `permission-detail-view` |
| Show all lines | Shows every line of a long change. When the chat window is too small for 9 rows it reads **Show the whole change**. | `permission-detail-more` |
| Check box label | The label of the check box in the top bar: **Ask before every action (until I untick it)**. | `topbar-ask-slot` |
| Not saved line | The line in the top bar while you are in control: **This is not saved. To keep a tool on Ask, change it in Control Center.** | `topbar-control-note` |
| Not saved link (top bar) | The words **Control Center** in that line. It opens the Permissions page. | `topbar-control-note-link` |
| Not saved line (Activity) | The same sentence in the Activity list. | `gadget-activity-not-saved` |
| Not saved link (Activity) | The words **Control Center** in that sentence. It opens the Permissions page. | `gadget-activity-open-permissions` |
| Chip help line | Shows the help text of a tool chip while the chip has the keyboard focus. | `topbar-chip-tip` |
| Change preview (Action Center) | The same preview in the permission dialog box of the Action Center. | `uac-detail-view` |
| Answer note | The line in the chat that tells what you answered. | `chat-permission-result` |

## 5 - Troubleshooting

- **The agent waits and nothing appears.** Click the flag in the notification area. The request waits there.
- **Too many requests.** Set the actions that you trust to **Allow** in the Control Center.
- **A review never asks.** A reviewer only reads. It cannot change files.

## 6 - Need Help?

Read **[Using Control Center](control-centre.md)** to learn all permission settings.
