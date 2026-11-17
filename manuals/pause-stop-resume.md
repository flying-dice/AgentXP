# Pause, Stop, and Resume

This topic explains the three ways to halt an agent and how to let it work again.

## Table of Contents

- [1 - Three Ways to Halt the Agent](#1-three-ways-to-halt-the-agent)
- [2 - Pause and Resume](#2-pause-and-resume)
- [3 - Stop](#3-stop)
- [4 - You Are in Control](#4-you-are-in-control)
- [5 - Troubleshooting](#5-troubleshooting)
- [6 - Controls Reference](#6-controls-reference)
- [7 - Need Help?](#7-need-help)

---

## 1 - Three Ways to Halt the Agent

- **Pause** – Holds all agents of the desktop. They keep their place and cannot use the desktop until you resume.
- **Stop** – Ends the current answer of one chat. The agent stays connected and waits for your next message.
- **Take control** – Tells the agent that you work on the desktop yourself. The agent stops and asks before every action until you give control back.

## 2 - Pause and Resume

To pause the agent, click **Pause all agents** in the top bar. The status changes to **Paused: no agent will act until you resume.** AgentXP saves which chats it stopped. The chat says so, and the Action Center has a line for each of them. This is also true if another window paused the desktop, or if you open the window later.

To let the agent work again, click **Resume agents and continue** in the top bar. AgentXP sends each chat that it stopped the message **Please continue where you stopped.** The chat shows **Resumed. Continuing where you stopped.** and the status reads **Working** with the name of the chat. You do not have to type anything.

If no chat had a step to continue, the status reads **Resumed. Nothing was stopped.** for a few seconds, and then **Idle**.

If you do not want a chat to go on, click **Stop** in that chat after you resume.

## 3 - Stop

To stop one chat, click **Stop** in the Chat window. A note in the chat tells that the answer ended early.

You can send a new message after you click **Stop**.

## 4 - You Are in Control

The status area of the top bar always shows one of these:

- **Working** – An agent works. The text names what it does now.
- **Paused: no agent will act until you resume.** – You paused the desktop.
- **You are in control. All tools ask first until you click Resume. This is not saved.** – You selected **Ask before every action**, or you clicked **Take over** in the Browser. If some tools need an app that is not open, the status adds a sentence that names the apps, for example **Terminal and Browser are not open.**
- **Waiting for you: 2 requests to approve** – An agent waits for your answer to a request.
- **Idle** – No agent works.

When you take control, AgentXP stops the step that runs now. The Activity list shows **You are in control. The agent asks first.** when a step was running. If nothing was running, it shows **You are in control. All tools ask first until you click Resume. This is not saved.** Below it, the list says **To keep a tool on Ask, change it in Control Center.** The words **Control Center** are a link to the Permissions page. The check box is for this desktop only. A setting in Control Center stays. The chat status reads **Waiting for you**, not **Working**. The button **Resume** shows next to the status. Click it to return to the settings of Control Center. You can also clear the check box **Ask before every action (this session only)**.

The tool chips show one pattern, for example **Read files: Allow**, **Write files: Ask first**, **Run commands: Ask first**. While **Ask before every action** is on, a chip that is not on Ask in Control Center reads **Ask first (now)**. See **[Using Control Center](control-centre.md)** for what the chips mean. Point to a chip to read its tooltip. Click a chip to change the setting.

## 5 - Troubleshooting

- **Resume does nothing.** Make sure that the desktop is connected. See **[The Agent Does Not Start](agent-does-not-start.md)**.
- **The agent keeps working after Pause.** A command that already runs can finish. AgentXP blocks every new action.
- **Stop is dimmed.** The agent is not working now.

## 6 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Resume | Hands control back to the agent. It shows while you are in control. | `topbar-give-back` |
| You are in control | The first line of the Activity list while you are in control. It says that the agent asks first. | `infopanel-activity-control` |
| Activity list | The list of what the agent did. Double-click it to open Event Viewer. | `infopanel-activity` |
| Event Viewer (link) | Opens Event Viewer. | `infopanel-activity-open-event-viewer` |
| Event Viewer (menu) | Right-click the Activity list, then click Event Viewer. | `infopanel-activity-menu-event-viewer` |
| Resumed note | The note above the message that Resume sent. | `chat-resume-note` |
| Paused banner | Tells in the chat that the desktop is paused, and whether Pause stopped a step of this chat. | `chat-paused-banner` |

## 7 - Need Help?

Read **[The Desktop](desktop.md)** to learn the top bar, and **[Using Chat](chat.md)** to learn the Chat window.
