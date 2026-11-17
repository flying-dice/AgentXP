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

- **For this desktop only.** Select the check box **Ask before every action (this session only)** in the top bar. Every tool asks first. This is not saved. When you clear the box, click **Resume**, or restart AgentXP, the agent goes back to the settings of Control Center. The bar says so: **You are in control. All tools ask first until you click Resume. This is not saved.** Under it, **To keep a tool on Ask, change it in Control Center.**
- **Always.** Set the tool to **Ask** or **Deny** in Control Center, on the **Permissions** page. AgentXP keeps this setting.

## 2 - Make the Agent Ask

To keep the agent asking, also after you restart AgentXP, follow the steps below. To ask only for a while, select **Ask before every action (this session only)** in the top bar instead.

A chip that asks reads **Ask first**, for example **Run commands: Ask first**. While the box is selected, a chip that is not on **Ask** in Control Center reads **Ask first (now)**. Point to the chip to read the saved setting, for example **Saved setting: Allow.** The link **Control Center** in the line **To keep a tool on Ask...** opens the Permissions page.

**Pause all agents** holds every agent on the desktop. **Stop** in a chat stops that chat only.

1. Click **Start -> Control Center**. The Control Center window opens.
2. Click **Permissions**.
3. Set each row to **Ask**.
4. Close the window. The new settings apply at once.

## 3 - Answer a Request

To answer a request, follow the steps below:

A request opens the permission dialog box over the whole desktop, whichever window, chat, or team room asked. The desktop behind it is dimmed. See **[Desktop](desktop.md)** for the parts of the box.

1. Read the title, for example **Allow the agent to change src/auth/redirect.ts?** The line under it names the chat that asked, or the member and the room, for example **Requested by Tester in the room Development Team**. The line **Reason:** tells why AgentXP asks, for example **Run commands is set to Ask in Control Center.**
2. Read the command or the change to the file. A long change scrolls inside the box. Click **Show all lines** to see a long change in full.
3. Click **Allow** to let the agent go on, or click **Deny** to stop the action. You can also press A to allow. The Left and Right arrow keys move between the choices. Hold Alt to see the access keys: Alt+A allows, Alt+D denies.

The box opens by itself, also while you type in another window. For a moment after it appears it takes no answer, so a key that you typed for that window does not answer it. The focus starts on **Deny**, because Deny is the safe answer. Enter denies. The line **Enter denies. Press A to allow.** shows under the choices. When more than one request waits, the box says, for example, **1 of 2 waiting**, and the oldest request comes first. After you answer, the chat shows a line, for example **You allowed: Change NOTE.md.**

To answer later, press Esc or click **Not now**. The request stays in the Action Center. To open the box again, click the status in the top bar, for example **Fix login redirect is waiting: run a command**, or click the flag in the notification area and then **Review** next to the request.

If you click **Deny**, the agent tells you that it could not do the action. The request leaves the Action Center.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Keys line | Tells which keys answer the request in the permission dialog box: Enter denies, A allows. | `uac-hint` |
| Waiting count | The line **1 of 2 waiting** in the permission dialog box, when more than one request waits. | `uac-queue` |
| Reason line | The setting that made AgentXP ask, after **Reason:**, for example **Run commands is set to Ask in Control Center.** | `uac-reason` |
| Show all lines | Shows every line of a long change. After the click it reads **Show fewer lines**. | `uac-detail-more` |
| Check box label | The label of the check box in the top bar: **Ask before every action (this session only)**. | `topbar-ask-slot` |
| Not saved line | The line in the top bar while you are in control: **To keep a tool on Ask, change it in Control Center.** The status above it says **This is not saved.** | `topbar-control-note` |
| Not saved link (top bar) | The words **Control Center** in that line. It opens the Permissions page. | `topbar-control-note-link` |
| Not saved line (Activity) | The same sentence in the Activity list, under **You are in control... This is not saved.** | `infopanel-activity-not-saved` |
| Not saved link (Activity) | The words **Control Center** in that sentence. It opens the Permissions page. | `infopanel-activity-open-permissions` |
| Chip help line | Shows the help text of a tool chip while the chip has the keyboard focus. | `topbar-chip-tip` |
| Change preview | The lines that change, in the permission dialog box. It scrolls when the change is long. | `uac-detail-view` |
| Answer note | The line in the chat that tells what you answered. | `chat-permission-result` |

## 5 - Troubleshooting

- **The agent waits and nothing appears.** Click the flag in the notification area. The request waits there.
- **Too many requests.** Set the actions that you trust to **Allow** in the Control Center.
- **A review never asks.** A reviewer only reads. It cannot change files.

## 6 - Need Help?

Read **[Using Control Center](control-centre.md)** to learn all permission settings.
