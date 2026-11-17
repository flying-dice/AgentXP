# Using Control Center

This manual describes Control Center. Control Center sets the agents, the permissions, the skills and MCP servers, and the look of the desktop.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Task List
  - The Agents Page
  - The Permissions Page
  - The Skills and MCP Page
  - The Appearance Page
  - The About Page
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Control Center to add an agent, to choose when AgentXP asks you before the agent acts, and to hide the taskpanes.

## 2 - Open It

- Click **Start -> Control Center**, or double-click **Control Center** on the desktop.
- Click **Open Control Center** in the Action Center.
- Right-click the desktop and click **Control Center**.

Only one Control Center window exists on a desktop.

## 3 - The Window

### The Task List

The list is at the left under the title **Control Center Home**. It has **Agents**, **Permissions**, **Skills and MCP**, **Appearance**, and **About AgentXP**. A heading at the top of the right side names the page.

### The Agents Page

The page lists the agents. The columns are **Name**, **About** (one plain sentence, for example that the Scripted Agent is a practice agent that gives fixed sample answers and does not use an AI model), **Command**, and **Default**. For an agent that you added, **About** shows the command. When the page opens, it looks for the program of each agent. For an agent whose program is missing, **About** says **Not installed** (an agent that AgentXP knows) or **Not found** (an agent that you added). The default agent shows the same words. **Set as Default** on such a row asks **This program was not found. Make it the default anyway?** The answer **No** is the default. The name comes first and a long command is cut short; point at a row to see its full command. When you open the page with **Open Agents** from a chat whose agent did not start, that agent is already selected and in view. New desktops use the default agent. A chat uses the agent of the desktop it is on. The buttons are at the right of the list:

- **Add...** – Opens the **Add Agent** dialog box.
- **Edit...** – Opens the **Edit Agent** dialog box for the selected agent.
- **Remove** – Removes the selected agent after a question.
- **Set as Default** – Makes the selected agent the default.

The agent dialog box has these parts:

- **Name** – Optional. Without a name, the agent is listed by its command, for example `node my-agent.js`.
- **Command** – The program to run, for example `node`. Click **Test** to see if AgentXP finds the program. The line under the box says **Found 'node'.** or **Could not find 'node'.**
- **Arguments** – One per line, for example `my-agent.js`.
- **Environment** – KEY=VALUE, one per line.
- **Start mode** – The mode that every new chat of the agent starts in. See below.
- **Make this the default agent for new desktops and chats** – A check box. It is on when you add an agent.

**Start mode** is the mode that every new chat of the agent starts in. This is how you reduce the permission prompts. Choose **Agent default** to keep the mode that the agent chooses itself. For Claude Code the modes are:

- **Default** – Asks before risky actions.
- **Accept Edits** – Does not ask before file edits.
- **Plan** – Plans only and runs no tools.
- **Don't Ask** – Does not ask. It refuses what is not pre-approved.
- **Bypass Permissions** – Does not ask at all.

Other agents can have other modes. You can type the id of a mode in the box. If the agent does not offer the mode, the chat starts in the mode of the agent. The setting does not change chats that already exist. In a chat you can still change the mode at any time.

### The Permissions Page

The page has two blocks. Each row has a list with the choices **Allow**, **Ask**, and **Deny**.

- **What the agent may do** – Read files, Write files, and Run commands. Point at **Run commands** to see "Run commands (Terminal)".
- **Apps the agent may use** – Code, Notepad, Browser, Agent Paint, WordPad, Notes, Kanban boards, Events, Screen capture, Recycle Bin, Code review, and Agent may open apps.

Each row has two lines. The first line shows the name and the setting. The second line tells what the row covers. The table has no sideways scroll, so you can read every line at the default size of the window.

Each row is separate. **Write files** covers changing files in any app. **Code** and **Notepad** cover only what their rows list. The **Notepad** row reads: open and read documents. Saving a file uses **Write files**.

The top bar shows chips with the same names, for example **Run commands: Ask first**. Each chip reads *Name*: *Allow*, *Ask first*, or *Deny*, the same setting as the row. When no app that gives the agent this tool is open, the chip has a dashed border. The agent cannot use the tool until you open the app. Point to a chip to read the setting and the reason, for example **The agent cannot use it yet because no Terminal is open.** Click a chip to open this page.

- **Allow** – The agent acts without a question.
- **Ask** – A request appears in the Action Center.
- **Deny** – The agent cannot act.

To set all rows at once, choose a setting in **Set every permission to** and click **Set all**. The note **Not applied yet** shows until you save. Click **OK** or **Apply** to save. The line **Saved. New requests use these settings.** shows for four seconds. Click **Cancel** to drop your changes.

### The Skills and MCP Page

The page has two lists. A **skill** is a folder with a SKILL.md file that tells an agent how to do a kind of work. An **MCP server** is a program or a web address that gives an agent more tools. A plain chat gets every skill and every server that is **On**. A profile in **[Teams](teams.md)** gets only the ones that you give to it.

The **Skills** list has the columns **Name**, **Description**, and **State**. The buttons are at the right of the list:

- **Install...** – Asks for a skill folder. The folder must have a SKILL.md file that starts with a **name** and a **description**. AgentXP keeps a copy.
- **Remove** – Removes the selected skill after a question. Profiles and teams lose it.
- **Turn Off** or **Turn On** – Switches the selected skill.

The **MCP servers** list has the columns **Name**, **Type**, **Command or address**, **Tools**, and **State**. The buttons are at the right of the list:

- **Add...** – Opens the **Add MCP Server** dialog box.
- **Edit...** – Opens the dialog box for the selected server.
- **Remove** – Removes the selected server after a question.
- **Turn Off** or **Turn On** – Switches the selected server.
- **Test connection** – Connects to the server and lists its tools. The line under the list says if it worked.
- **Tools...** – Shows the tools of the server. Untick a tool to hide it from agents. This button works after a test.

The server dialog box has these parts:

- **Name** – Letters, digits, - and _.
- **Type** – **Program** starts a program. **Web address** calls an address.
- **Command** and **Arguments** – The program and one argument per line.
- **Address** – The address of the server, for example `https://example.com/mcp`.
- **Environment** or **Headers** – Variables for the program, or headers for the address. Tick **Secret** to hide the value of a variable.
- **Test connection** – Tries the server with what the dialog box holds.

### The Appearance Page

The page has the option **Show taskpanes on the desktop**. The taskpanes are the context meter, the desktop clock, and the activity list. The theme is Windows XP Luna (Blue). You cannot change it.

### The About Page

The page shows the version of AgentXP. The version is the one in the package, also when AgentXP runs from a build folder.

### The Chat Pane

Each Control Center window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Control Center window | The root of the window. | `control-centre-app` |
| Page button | Opens a page. The name ends with `agents`, `permissions`, `skills`, `appearance`, or `about`. | `control-centre-page-*` |
| Heading | Names the page. | `control-centre-heading` |
| Version | Shows the version of AgentXP. | `control-centre-version` |
| Agents | The list of agents. | `agents-list` |
| Agent row | One agent. | `agents-row` |
| Add... | Adds an agent. | `agents-add` |
| Edit... | Changes the selected agent. | `agents-edit` |
| Remove | Removes the selected agent. | `agents-remove` |
| Set as Default | Makes the agent the default. | `agents-set-default` |
| Agents reason note | Says why Edit, Remove, or Set as Default is off, for example **This is already the default**. | `agents-reason` |
| Agent dialog box | Adds or changes an agent. | `agents-dialog` |
| Agent name | The optional name. | `agents-dialog-name` |
| Agent command | The program to run. | `agents-dialog-command` |
| Test | Checks that the program can be found. | `agents-dialog-test` |
| Test result | Says if the program was found. | `agents-dialog-test-result` |
| Agent arguments | One argument per line. | `agents-dialog-args` |
| Agent environment | KEY=VALUE per line. | `agents-dialog-env` |
| Make default | Makes the agent the default for new desktops and chats. | `agents-dialog-default` |
| Skills | The list of skills. | `skills-list` |
| Skill row | One skill. | `skills-row` |
| Install... | Installs a skill from a folder. | `skills-install` |
| Remove skill | Removes the selected skill. | `skills-remove` |
| Turn skill on or off | Switches the selected skill. | `skills-toggle` |
| MCP servers | The list of MCP servers. | `mcp-list` |
| MCP server row | One MCP server. | `mcp-row` |
| Add MCP server | Adds a server. | `mcp-add` |
| Edit MCP server | Changes the selected server. | `mcp-edit` |
| Remove MCP server | Removes the selected server. | `mcp-remove` |
| Turn server on or off | Switches the selected server. | `mcp-toggle` |
| Test connection | Connects to the selected server and lists its tools. | `mcp-test` |
| Tools... | Shows the tools of the selected server. | `mcp-tools` |
| MCP status | Says what the last test found. | `mcp-status` |
| MCP reason note | Says why a button is off. | `mcp-reason` |
| MCP tools dialog box | Switches the tools of a server. | `mcp-tools-dialog` |
| MCP tool list | The tools, each with a check box. | `mcp-tools-list` |
| MCP server dialog box | Adds or changes a server. | `mcp-dialog` |
| MCP server name | The name of the server. | `mcp-dialog-name` |
| MCP server command | The program to run. | `mcp-dialog-command` |
| MCP server arguments | One argument per line. | `mcp-dialog-args` |
| MCP server address | The web address. | `mcp-dialog-url` |
| MCP server variables | The variables or headers. | `mcp-dialog-vars` |
| MCP server variable | One variable. | `mcp-dialog-var` |
| Variable name | The name of a variable. | `mcp-dialog-var-key` |
| Variable value | The value of a variable. | `mcp-dialog-var-value` |
| Variable secret | Hides the value. | `mcp-dialog-var-secret` |
| Remove variable | Removes a variable. | `mcp-dialog-var-remove` |
| Add variable | Adds a variable. | `mcp-dialog-var-add` |
| MCP dialog test | Tries the server. | `mcp-dialog-test` |
| MCP dialog test result | Says if the connection worked. | `mcp-dialog-test-result` |
| MCP dialog problem | Says what is missing. | `mcp-dialog-problem` |
| Permission table | The permissions in two blocks. | `permissions-table` |
| Permissions page | The whole page: help, **Set every permission to**, the list and the buttons. The attribute `data-narrow` is true when the page is narrower than 520 px. The page scrolls when the window is short. | `permissions-page` |
| Permissions note | The box above the list that says what each row covers, including Code and Notepad, and what the top bar box **Ask before every action (this session only)** does. In a page narrower than 520 px it shows two sentences. | `permissions-callout` |
| More | Shows the whole note in a narrow page. | `permissions-help-more` |
| Less | Shortens the note again. | `permissions-help-less` |
| Permission block | The heading of a block. | `permissions-group` |
| Permission row | One permission. The row that a top bar chip asked for is highlighted. | `permissions-row` |
| What it covers | The second line of a row. It tells what the permission covers. | `permissions-covers` |
| What the setting does | The third line of a row. **Allow** runs without asking, **Ask** asks you each time, **Deny** never runs. | `permissions-mode` |
| Permission list | Sets Allow, Ask, or Deny for one row. The name ends with the row, for example `fs-read`. | `permissions-setting-*` |
| Permission list entry | One choice of a list. The name ends with the row and the choice, for example `fs-read-option-deny`. | `permissions-setting-*-option-*` |
| Set every permission to | Chooses a setting for Set all. | `permissions-set-all-value` |
| Set every permission entry | One choice of that list, for example `allow`, `ask` or `deny`. | `permissions-set-all-value-option-*` |
| Set all | Sets every row to that setting. | `permissions-set-all` |
| Permission status | Shows Not applied yet, or Saved. | `permissions-status` |
| OK | Saves the permissions and brings back the window that opened Control Center. | `permissions-ok` |
| Apply | Saves the permissions. | `permissions-apply` |
| Cancel | Drops the changes. | `permissions-cancel` |
| Show taskpanes on the desktop | Shows or hides the taskpanes. | none |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `control-centre-menu-help` |
| Menu: about | Opens the About Control Center box. | `control-centre-menu-about` |
| Dialog: about | The About Control Center box. | `control-centre-about` |
| Dialog: about ok | Closes the About box. | `control-centre-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `control-centre-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: close | Closes the window. Alt+F4. | `control-centre-menu-close` |
| Menu: page * | View menu: shows a page. | `control-centre-menu-page-*` |
| Context menu: page * | Shows a page. | `control-centre-ctx-page-*` |

## 5 - Common Tasks

To add an agent, follow the steps below:

1. Click **Agents**, then **Add...** The **Add Agent** dialog box appears.
2. Type the program in **Command**, for example `node`. Click **Test** to see if AgentXP finds it.
3. Type each argument on its own line in **Arguments**, for example `my-agent.js`.
4. Keep **Make this the default agent for new desktops and chats** on, or clear it.
5. Click **OK**. The agent appears in the list. The name is optional.

To make AgentXP ask before the agent writes files, follow the steps below:

1. Click **Permissions**.
2. Select **Ask** in the list of the row **Write files**.
3. Click **Apply**.

To make AgentXP ask before every action, even reading, tick **Ask before every action** in the top bar. See **[The Desktop](desktop.md)**.

To stop the agent from opening apps, select **Deny** in the row **Agent may open apps** and click **Apply**.

## 6 - Troubleshooting

- **OK and Apply are dimmed.** You made no change.
- **Set as Default is dimmed.** The selected agent is the default already, or no agent is selected.
- **The agent dialog box does not close.** Type a command. The box under the fields tells what is missing.
- **Test says Could not find the program.** Check the spelling, or type the full path of the program.
- **A permission change has no effect.** Click **Apply**.

## 7 - Need Help?

Read **[The Desktop](desktop.md)** to learn the permission prompts.
