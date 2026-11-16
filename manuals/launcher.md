# Using Desktop Connection

This manual describes the Agent7 Desktop Connection window. The window lists your desktops and lets you create, connect, rename, and delete them.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Desktop List
  - The Details Pane
  - The Buttons
  - The New Desktop Dialog Box
  - The Rename Desktop Dialog Box
  - The Browse For Folder Dialog Box
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

A desktop is a long-lived virtual computer for one or more projects. Desktop Connection is the first window that you see when you start Agent7. Use it to pick the desktop that you work on.

Closing a desktop window only disconnects it. Its agents keep running.

**Desktop (also called a workspace)** – A workspace where an agent works on your projects. Each desktop has its own private C: drive (files made on this desktop), its own chats, and the project folders that you plug in as drives.

## 2 - Open It

The window opens when you start Agent7. To open it again from a desktop, click **Start -> Agent7 Desktops...** or click **Start -> Disconnect options -> Switch desktop...**.

## 3 - The Window

### The Desktop List

The list is in the middle of the window. Each row shows a picture of the desktop, its name, its state, its drives, and when you used it last.

- **Name** – The name of the desktop. The word **Connected** appears next to the name while a window shows the desktop.
- **State** – Working, Needs your approval, Idle, **Ready. Click Connect to open it.**, or **Agent problem:** followed by the cause. A desktop that needs your approval has a shield, bold text, and a light amber row. A desktop with an agent problem has an amber error icon and bold text, for example **Agent problem: The program 'x' was not found.** Point to the text to read where you change the agent: open the desktop, then **Control Center -> Agents**. Agent7 looks for the problem when the window opens, when you create, rename, or delete a desktop, when the window gets the focus, and every 30 seconds. **Ready. Click Connect to open it.** shows on a new desktop whose window did not open.

When the window opens, the desktop that needs your approval is already selected. If you have no desktop, the list explains what a desktop is and tells you to click **New...**.

### The Details Pane

Click **Show Options** to see the details of the selected desktop. The pane lists the name, the status, the number of chats, the drives, the projects, the creation date, and the last use. The **Disconnect** button closes the window of a connected desktop.

### The Buttons

The buttons are at the bottom of the window. **Show Options** is at the left. **New...**, **Rename...**, **Delete...**, and **Connect** are at the right. Press Alt and the underlined letter to use a button: Alt+N, Alt+R, Alt+D, and Alt+C.

When you click **Create** in the New desktop dialog box, the new desktop opens at once and stays selected in the list. If it does not open, the row says **Ready. Click Connect to open it.** and **Connect** is the default button.

When you click **Connect**, the row shows **Opening...** and then **Connected**, and the desktop window comes to the front. While the selected desktop is connected, the button reads **Show desktop** and brings its window to the front.

Press F1 to read this manual.

### The New Desktop Dialog Box

The dialog box has a name box, a list of projects, and an agent list.

- **Desktop name** – The name of the new desktop. The line under the box says: Agent7 opens the new desktop when you click Create. The name must have 1 to 60 characters and must be new. Agent7 checks the name while you type. If another desktop has the name, a red message says so, and a link such as **Use 'Fix login redirect (2)'** fills in a free name. The place for the message and the links is always reserved, so the buttons do not move when the message appears. **Create** stays dimmed until the name is good.
- **Project folders the agent can use (they appear as drives)** – A list of folders. Select the projects that the desktop gets.
- **Browse...** – Opens the **Browse For Folder** dialog box and adds the folder that you select to the list.
- **Agent** – The agent that the chats of the desktop start. The default agent is selected first.

### The Rename Desktop Dialog Box

The dialog box has one box for the new name. The same name rules apply, and the same check and link appear while you type. **OK** stays dimmed until the name is good.

### The Browse For Folder Dialog Box

The dialog box is part of Agent7. It is not a window of your computer. It says **Select a folder for the agent to work on.** (New desktop) or **Select the project folder to plug in to this desktop.** (Plug in a project).

- The tree starts with **Projects you used before** (point at it to read "Folders that Agent7 opened before"), the projects of your desktops. It shows **Computer** (your drives, or `/`) and the shortcuts **Home**, **Documents**, and **Desktop**. The box opens on **Documents**, or on **Home** if there is no Documents folder. Folders only. Click the arrow, or press Enter or the Right arrow, to open a folder.
- **Folder** shows the path of the selected folder. You can type or paste a path instead. You can also type only a name, for example `login-app`. Agent7 looks for it in your recent folders and near Documents and Home. A folder that has no subfolders shows **This folder has no subfolders.**
- **Make New Folder** creates a folder named **New Folder** inside the selected folder and selects it.
- **OK** is dimmed until a folder is selected. **Cancel**, or Esc, closes the box. You can change the size of the box.
- While the list loads, the box says **Opening the folder list...** and the pointer shows that Agent7 is busy.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Agent7 Desktop Connection | The window frame. | `launcher-window` |
| Desktops | The list of desktops. | `launcher-list` |
| Desktop row | One desktop. Double-click it to connect. | `launcher-desktop-row` |
| Desktop name | Shows the name. | `launcher-desktop-name` |
| Connected | Shows that a window shows the desktop. | `launcher-desktop-connected` |
| State | Shows the state of the agent. | `launcher-desktop-state` |
| No desktops message | Shows when the list is empty. | `launcher-empty` |
| What you can do | Says what to do first. Shows below the empty message. | `launcher-empty-help` |
| Show Options, Hide Options | Shows or hides the details pane. | `launcher-options` |
| Disconnect | Closes the window of the selected desktop. | `launcher-disconnect` |
| New... | Opens the New desktop dialog box. | `launcher-new` |
| Rename... | Opens the Rename desktop dialog box. | `launcher-rename` |
| Delete... | Deletes the selected desktop after you answer a question. | `launcher-delete` |
| Connect | Opens the selected desktop. | `launcher-connect` |
| New desktop | The New desktop dialog box. | `new-desktop-dialog` |
| Desktop name (new) | Names the new desktop. | `new-desktop-name` |
| Opens note | Says that Agent7 opens the new desktop when you click Create. | `new-desktop-opens-note` |
| Name error | Shows why the name is not valid, with an error icon. | `new-desktop-error` |
| Use a free name | Fills in the suggested name (New desktop dialog box). | `new-desktop-use-suggestion` |
| Use name with project | Fills in the name followed by the first chosen project folder. Appears when the name is taken. | `new-desktop-use-project-suggestion` |
| Projects | The list of projects. | `new-desktop-projects` |
| Project | One project in the list. | `new-desktop-project` |
| Project option | The box of one project. | `new-desktop-project-check` |
| Browse... | Adds a folder to the list. | `new-desktop-browse` |
| Agent | Selects the agent. | `new-desktop-agent` |
| Create | Creates the desktop. | `dialog-button-ok` |
| Cancel | Closes the dialog box. | `dialog-button-cancel` |
| Rename desktop | The Rename desktop dialog box. | `rename-desktop-dialog` |
| New name | The new name. | `rename-desktop-name` |
| Name error (rename) | Shows why the name is not valid. | `rename-desktop-error` |
| Use a free name (rename) | Fills in the suggested name (Rename desktop dialog box). | `rename-desktop-use-suggestion` |
| Opening | Shows on the row of a desktop that is opening. | `launcher-desktop-opening` |
| Help and Support (launcher) | The box that F1 opens. | `launcher-help` |
| Help text | The manual in that box. | `launcher-help-article` |
| Browse For Folder | The dialog box that chooses a folder. | `folder-browser-dialog` |
| Instruction | Says what the folder is for. | `folder-browser-instruction` |
| Folder tree | The tree of folders. | `folder-browser-tree` |
| Group (tree) | The group Projects you used before, or Matches while you look for a name. | `folder-browser-group` |
| Empty folder | Says that the folder has no subfolders. | `folder-browser-empty` |
| Folder (tree) | One folder or shortcut of the tree. | `folder-browser-node` |
| Status | Shows **Opening the folder list...** or a problem. | `folder-browser-status` |
| Folder (path) | The path of the selected folder. You can type a path. | `folder-browser-path` |
| Make New Folder | Creates a folder in the selected folder. | `folder-browser-new-folder` |
| OK (folder) | Chooses the folder. | `dialog-button-ok` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Up and Down arrows | Select the previous or next desktop. | none |
| Enter | Connects the selected desktop. | none |
| F1 | Opens this manual in a Help and Support box. | none |
| Alt+N, Alt+C, Alt+R, Alt+D | Press **New...**, **Connect**, **Rename...**, or **Delete...**. | none |
| F2 | Opens the Rename desktop dialog box. | none |
| Delete | Starts the deletion of the selected desktop. | none |

## 5 - Common Tasks

To create a desktop for a project, follow the steps below:

1. Click **New...**. The **New desktop** dialog box appears.
2. Type a name in **Desktop name**.
3. Click **Browse...**. The **Browse For Folder** dialog box appears. Select the folder of your project and click **OK**. The project appears in the list with its option selected.
4. Click **Create**. The desktop appears in the list, and its window opens at once. You do not need to click **Connect**.

To connect to a desktop, select it and click **Connect**.

To rename a desktop, follow the steps below:

1. Select the desktop.
2. Click **Rename...**, or press F2.
3. Type the new name and click **OK**.

To delete a desktop, follow the steps below:

1. Select the desktop and click **Delete...**. A question appears.
2. Read the warning. Agent7 removes the private C: drive (files made on this desktop), the chats, the notes, and the logs of the desktop. Project folders (plugged in) are removed from this desktop. The folders and files stay on your disk.
3. Click **Yes**.

## 6 - Troubleshooting

- **The name is not accepted.** Type a name of 1 to 60 characters. Use a name that no other desktop has, or click the link under the name box.
- **Connect is dimmed.** Select a desktop in the list first.
- **The desktop shows Needs your approval.** Connect and answer the request in the **Action Center**.
- **The desktop shows Agent problem.** Connect, open **Control Center**, and click **Agents** to change the command. Open **Event Viewer** to read the messages.

## 7 - Need Help?

Read **[The Desktop](desktop.md)** to learn the desktop after you connect.
