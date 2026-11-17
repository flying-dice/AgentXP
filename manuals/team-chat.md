# Using Team Chat

This manual describes Team Chat. Team Chat is a chat room where the agents of a team answer under their own names.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Members
  - The Messages
  - The Message Box
  - The Member Session
- 4 - Controls Reference
  - What the Agent Can Do
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Team Chat to work with several agents at once. Each member of the team is its own agent with its own chat behind the scenes. The room shows only the final message of each member. It does not show the tool calls.

No member leads the room. Anyone who is called starts to work at once, so several members can work at the same time. AgentXP does not limit how often members call each other. The instructions of the profiles decide how the team behaves.

## 2 - Open It

Select a team in **[Teams](teams.md)** and click **Start chat room...**. To open a room again, click the **Chat rooms** tab of Teams, select the room, and click **Open**.

## 3 - The Window

### The Members

The bar at the top lists the members. Each member shows a colored letter, its name, and what it does now:

- **thinking…** – The member works on a message.
- **starting…** – The agent program of the member starts.
- **waiting for approval** – The member asked for permission. The permission box opens over the desktop, for example **Allow Tester to run a command?** with **Requested by Tester in the room Development Team**. Click **Allow** or **Deny**. If you click **Not now**, the request stays in the Action Center and in the link on the top bar.
- **stopped with an error** – The last message of the member failed.

While the member works, its row also says its step in plain words, for example **reading auth.ts** or **running npm test**. If messages wait behind the one that the member works on, the line also says how many. Click a name to add a mention of that member to your message. Click **Stop** to stop the member and to drop the messages that wait for it. Click **Session** to show the chat of that member in the pane at the right. The pane shows what the member does while it works: its messages and each step, as it happens.

Click **Follow** to watch the member work. Code and the Terminal come to the front at each step of the member, and the agent cursor of the member, in the color of the member, moves there. The button then reads **Following**. Click it again, or click **Stop following** on the top bar, to stop. The follow also stops when the turn of the member ends, unless **Keep following** on the top bar is selected. See **[Using the Desktop](desktop.md)**.

### The Messages

The list shows every message of the room with the name, the time, and the text. Your messages come first in the name **You**. A line at the end says who works now. The list scrolls down by itself, unless you scrolled up to read.

### The Message Box

Type a message and press Enter, or click **Send**. Press Shift+Enter to start a new line.

- Write **@name** to call a member, for example **@Reviewer**. Spaces and capitals do not matter. You can call more than one member in one message.
- Write **@all** to call every member.
- If the message has no mention, the member that spoke last answers. If nobody spoke yet, the first member of the team answers.

A member can call other members in the same way. The status bar shows who your message calls.

### The Member Session

The pane at the right shows the full chat of one member, with its tool calls. You can type in it. A message that you type there goes to that member only and does not appear in the room.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Team Chat window | The root of the window. | `team-chat-app` |
| Members | The bar of members. | `team-chat-members` |
| Member | One member. The attribute `data-activity` says what it does. | `team-chat-member` |
| Member name | Adds a mention of the member to your message. | `team-chat-member-call` |
| Member activity | Says what the member does now. | `team-chat-member-activity` |
| Member step | The step of the member in plain words while it works, for example **reading auth.ts**. | `team-chat-member-step` |
| Follow | Follows the member: its steps appear in Code and the Terminal, with its agent cursor. It reads **Following** while you follow it; click it again to stop. The member row then has `data-following`. | `team-chat-member-follow` |
| Stop | Stops the member and drops the messages that wait. | `team-chat-member-stop` |
| Session | Shows or hides the chat of the member. | `team-chat-member-session` |
| Messages | The list of messages. | `team-chat-messages` |
| Message | One message. The attribute `data-author` is the name. | `team-chat-message` |
| Author | The name of the author of a message. | `team-chat-message-author` |
| Text | The text of a message. | `team-chat-message-text` |
| Empty note | Shows in a room without messages. | `team-chat-empty` |
| Working line | Says who works now. | `team-chat-working` |
| Message box | Where you type. | `team-chat-input` |
| Send | Sends the message. | `team-chat-send` |
| Member session pane | The chat of one member. | `team-chat-session-panel` |
| View -> Hide member session | Closes the pane of the member session. | `team-chat-menu-hide-session` |
| Context menu Call | Adds a mention of a member. | `team-chat-ctx-mention` |

### What the Agent Can Do

The agent of any chat can use the tools below. The permission **Team chat** in **Control Center** controls them. It is set to **Ask** at first. Reads run without a question. A message from an agent shows the title of its chat as the author.

| Tool | What it does |
|---|---|
| `room_list` | Lists the rooms of the desktop. |
| `room_read` | Shows the members of a room, what each one does, and the last messages. |
| `room_create` | Opens a new room for a team. |
| `room_rename` | Renames a room. |
| `room_delete` | Deletes a room. |
| `room_post` | Posts a message. An @mention calls a member. |
| `room_stop` | Stops what a member does now. |

## 5 - Common Tasks

To call one member, follow the steps below:

1. Click the name of the member in the bar. The mention appears in the message box.
2. Type your request after the mention.
3. Press Enter. The member shows **thinking…** until it answers.

To see what a member did, click **Session** next to its name. The pane shows the messages and the tool calls of that member.

## 6 - Troubleshooting

- **A member shows stopped with an error.** Read its last message in the room. Click **Session** to see the problem. Send a new message to try again.
- **A member does not answer.** If the member shows **waiting for approval**, answer the permission box. If you closed it with **Not now**, click the link on the top bar or open the Action Center.
- **Members call each other without end.** Click **Stop** next to each member. Then change the instructions of the profiles to say when a member must not call another one.

## 7 - Need Help?

Read **[Teams](teams.md)** to change the members and their instructions. Read **[Chat](chat.md)** for the full chat of one agent.
