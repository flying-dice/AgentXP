# Using Control Centre

This manual describes Control Centre. Control Centre sets the agents, the permissions, and the look of the desktop.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Task List
  - The Agents Page
  - The Permissions Page
  - The Appearance Page
  - The About Page
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Control Centre to add an agent, to choose when Agent7 asks you before the agent acts, and to hide the gadgets.

## 2 - Open It

- Click **Start -> Control Centre**, or double-click **Control Centre** on the desktop.
- Click **Open Control Centre** in the Action Center.
- Right-click the desktop and click **Control Centre**.

Only one Control Centre window exists on a desktop.

## 3 - The Window

### The Task List

The list is at the left under the title **Control Centre Home**. It has **Agents**, **Permissions**, **Appearance**, and **About Agent7**. A heading at the top of the right side names the page.

### The Agents Page

The page lists the agents. The columns are **Name**, **Command**, and **Default**. New chats start the default agent. The buttons are at the right of the list:

- **Add...** – Opens the **Add Agent** dialog box.
- **Edit...** – Opens the **Edit Agent** dialog box for the selected agent.
- **Remove** – Removes the selected agent after a question.
- **Set as Default** – Makes the selected agent the default.

The agent dialog box has the boxes **Name**, **Command**, **Arguments** (one per line), and **Environment** (KEY=VALUE, one per line).

### The Permissions Page

The page lists one row for each kind of action: Read files, Write files, Notepad, Code, Terminal, Browser, Paint, WordPad, Notes, Events, Screen capture, Recycle Bin, and Agent may open apps. Each row has a list with the choices **Allow**, **Ask**, and **Deny**.

- **Allow** – The agent acts without a question.
- **Ask** – A request appears in the Action Center.
- **Deny** – The agent cannot act.

Click **Apply** to save. Click **Cancel** to drop your changes.

### The Appearance Page

The page has the option **Show gadgets on the desktop**. The gadgets are the context meter, the session clock, and the activity list. The theme is Windows 7 Aero Basic. You cannot change it.

### The About Page

The page shows the version of Agent7.

### The Chat Pane

Each Control Centre window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Control Centre window | The root of the window. | `control-centre-app` |
| Page button | Opens a page. The name ends with `agents`, `permissions`, `appearance`, or `about`. | `control-centre-page-*` |
| Heading | Names the page. | `control-centre-heading` |
| Agents | The list of agents. | none |
| Add... | Adds an agent. | none |
| Edit... | Changes the selected agent. | none |
| Remove | Removes the selected agent. | none |
| Set as Default | Makes the agent the default. | none |
| Permission list | Sets Allow, Ask, or Deny for one row. | none |
| Apply | Saves the permissions. | none |
| Cancel | Drops the changes. | none |
| Show gadgets on the desktop | Shows or hides the gadgets. | none |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `control-centre-menu-help` |
| Menu: about | Opens the About Control Centre box. | `control-centre-menu-about` |
| Dialog: about | The About Control Centre box. | `control-centre-about` |
| Dialog: about ok | Closes the About box. | `control-centre-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `control-centre-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: close | Closes the window. Alt+F4. | `control-centre-menu-close` |
| Menu: page * | View menu: shows a page. | `control-centre-menu-page-*` |
| Context menu: page * | Shows a page. | `control-centre-ctx-page-*` |

## 5 - Common Tasks

To add an agent, follow the steps below:

1. Click **Agents**, then **Add...** The **Add Agent** dialog box appears.
2. Type the name in **Name**.
3. Type the program in **Command**, for example `npx`.
4. Type each argument on its own line in **Arguments**.
5. Click **OK**. The agent appears in the list.

To make Agent7 ask before the agent writes files, follow the steps below:

1. Click **Permissions**.
2. Select **Ask** in the list of the row **Write files**.
3. Click **Apply**.

To stop the agent from opening apps, select **Deny** in the row **Agent may open apps** and click **Apply**.

## 6 - Troubleshooting

- **Apply is dimmed.** You made no change.
- **Set as Default is dimmed.** The selected agent is the default already, or no agent is selected.
- **The agent dialog box does not close.** Type a name and a command. The box under the fields tells what is missing.
- **A permission change has no effect.** Click **Apply**.

## 7 - Need Help?

Read **[The Desktop](desktop.md)** to learn the permission prompts.
