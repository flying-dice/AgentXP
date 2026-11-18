# Using Teams

Teams and Team Chat are experimental and disabled by default. They are unavailable in Start and saved windows stay closed. To opt in, launch AgentXP with `AGENTXP_ENABLE_TEAMS=1` and restart it. Disabling the feature keeps your data.

This manual describes Teams. Teams holds the profiles and the teams of agents, and the chat rooms where a team works with you.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Teams Tab
  - The Profiles Tab
  - The Chat Rooms Tab
  - The Profile Dialog Box
  - The Team Dialog Box
- 4 - Controls Reference
  - What the Agent Can Do
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Teams to make a group of agents that work together in one chat room. A **profile** is one member of a group, for example a coder or a reviewer. A **team** is a group of profiles. A **chat room** is a chat where every member of a team answers under its own name.

A plain chat does not use Teams. A plain chat gets every skill and every MCP server that is turned on in **[Control Center](control-centre.md)**. A profile gets only the skills and servers that you give to it.

## 2 - Open It

Click **Start -> Teams**. Only one Teams window exists on a desktop.

## 3 - The Window

The window has a menu bar and three tabs: **Teams**, **Profiles**, and **Chat rooms**. A line above the tabs says what the tab is for. The buttons are at the right of each list.

### The Teams Tab

The tab lists the teams with the columns **Team**, **Members**, and **Skills**. **Members** lists the profiles of the team in order. The first member answers a message that has no @mention.

- **New...** – Opens the **New Team** dialog box.
- **Edit...** – Opens the **Edit Team** dialog box for the selected team.
- **Delete** – Deletes the selected team after a question. Its chat rooms go with it.
- **Start chat room...** – Asks for the folder that the members work in. Then AgentXP makes a chat room for the selected team and opens it in a **Team Chat** window.

### The Profiles Tab

The tab lists the profiles with the columns **Profile**, **Instructions** (the first line), and **Teams**. A profile can be a member of more than one team. The name of a profile must be one word when you remove the spaces, the dashes, and the case. Teammates call a member with this word, for example **@CodeReviewer**.

### The Chat Rooms Tab

The tab lists the chat rooms of this desktop. A chat room stays here when you close its window.

- **Open** – Opens the window of the selected chat room.
- **Delete** – Deletes the chat room and the sessions of its members.

### The Profile Dialog Box

The dialog box has these parts:

- **Name** – What teammates call this member.
- **Instructions** – The role of the member and how it works. The role is whatever you write here. Tell the member who to call with an @mention.
- **Agent** – The agent program that runs the member. **Default agent** uses the default agent of Control Center.
- **Model** – Optional. A model that the agent offers, by name or id. If the agent does not offer it, the member keeps the model of the agent.
- **Skills** – The skills that only this member gets.
- **MCP servers** – The MCP servers that only this member gets.

### The Team Dialog Box

The dialog box has these parts:

- **Name** – The name of the team. It is also the first name of its chat rooms.
- **Instructions** – Every member gets these instructions before its own.
- **Members** – The profiles of the team. The member that you tick first answers a message without an @mention.
- **Skills** – Skills that every member gets, in addition to its own.
- **Board** – Optional. A Kanban board of this desktop. AgentXP tells the members the board and its id, so they can use the board tools on it.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Teams window | The root of the window. | `teams-app` |
| Teams tab | Shows the teams. | `teams-tab-teams` |
| Profiles tab | Shows the profiles. | `teams-tab-profiles` |
| Chat rooms tab | Shows the chat rooms. | `teams-tab-rooms` |
| List | The list of the tab. | `teams-list` |
| Row | One team, profile, or chat room. | `teams-row` |
| New... | Makes a team or a profile. | `teams-new` |
| Edit... | Changes the selected team or profile. | `teams-edit` |
| Open | Opens the selected chat room. | `teams-open-room` |
| Delete | Deletes the selected item after a question. | `teams-delete` |
| Start chat room... | Makes a chat room for the selected team. | `teams-start-room` |
| Reason note | Says why a button is off, for example **Select a team first**. | `teams-reason` |
| File -> New team... | Makes a team. | `teams-menu-new-team` |
| File -> New profile... | Makes a profile. | `teams-menu-new-profile` |
| View -> tab | Shows a tab. The name ends with `teams`, `profiles`, or `rooms`. | `teams-menu-view-*` |
| Context menu New | Makes a team or a profile. | `teams-ctx-new` |
| Context menu Edit or Open | Changes the selected item or opens the chat room. | `teams-ctx-edit` |
| Context menu Delete | Deletes the selected item. | `teams-ctx-delete` |
| Profile dialog box | Makes or changes a profile. | `profile-dialog` |
| Profile name | The name of the profile. | `profile-dialog-name` |
| Profile instructions | The role and the way of working. | `profile-dialog-instructions` |
| Profile agent | The agent program of the member. | `profile-dialog-agent` |
| Profile model | The model that the member asks for. | `profile-dialog-model` |
| Profile skills | The skills of the member. | `profile-dialog-skills` |
| Profile MCP servers | The MCP servers of the member. | `profile-dialog-servers` |
| Profile problem | Says what is missing. | `profile-dialog-problem` |
| Team dialog box | Makes or changes a team. | `team-dialog` |
| Team name | The name of the team. | `team-dialog-name` |
| Team instructions | The instructions of every member. | `team-dialog-instructions` |
| Team members | The profiles of the team. | `team-dialog-members` |
| Team member | One profile in the list; its box adds it to the team (`team-dialog-member-check`). | `team-dialog-member` |
| Team skills | The skills of every member. | `team-dialog-skills` |
| Team board | The Kanban board of the team. | `team-dialog-board` |
| Team problem | Says what is missing. | `team-dialog-problem` |

### What the Agent Can Do

The agent can use the tools below at any time. The Teams window does not need to be open. The permission **Teams** in **Control Center** controls them. It is set to **Ask** at first. Reads run without a question. An open Teams window shows the changes at once.

| Tool | What it does |
|---|---|
| `profile_list` | Lists the profiles, with their agent, model, skills, and MCP servers. |
| `profile_create` | Creates a profile. |
| `profile_update` | Changes a profile. |
| `profile_delete` | Deletes a profile. |
| `team_list` | Lists the teams, with their members and their Kanban board. |
| `team_create` | Creates a team from profiles. |
| `team_update` | Changes a team. A new member list replaces the old one. |
| `team_delete` | Deletes a team. |

## 5 - Common Tasks

To make a team and talk to it, follow the steps below:

1. Click **Start -> Teams**. Click the **Profiles** tab.
2. Click **New...**. The **New Profile** dialog box appears.
3. Type a name, for example **Coder**. Type the role in **Instructions**. Click **OK**.
4. Make a second profile, for example **Reviewer**.
5. Click the **Teams** tab, and then click **New...**.
6. Type a name and tick the two profiles in **Members**. Click **OK**.
7. Select the team and click **Start chat room...**. The **Browse For Folder** dialog box appears.
8. Select the folder that the members work in, and click **OK**. The **Team Chat** window opens.

To give a skill to one member only, tick the skill in **Skills** of its profile. To give a skill to the whole team, tick it in **Skills** of the team.

## 6 - Troubleshooting

- **Start chat room... is off.** Select a team that has at least one member.
- **The profile name exists already.** Two profiles cannot have the same name when you remove spaces, dashes, and case. Choose another name.
- **A member does not have a skill.** Make sure that the skill is installed in **Control Center -> Skills and MCP** and that its state is **On**.

## 7 - Need Help?

Read **[Team Chat](team-chat.md)** to work in a chat room. Read **[Control Center](control-centre.md)** to install skills and MCP servers.
