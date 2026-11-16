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
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

A desktop is a long-lived virtual computer for one or more projects. Desktop Connection is the first window that you see when you start Agent7. Use it to pick the desktop that you work on.

Closing a desktop window only disconnects. The agents keep running.

## 2 - Open It

The window opens when you start Agent7. To open it again from a desktop, click **Start -> Agent7 Desktops...** or click **Start -> Disconnect options -> Switch desktop...**.

## 3 - The Window

### The Desktop List

The list is in the middle of the window. Each row shows a picture of the desktop, its name, its state, its drives, and when you used it last.

- **Name** – The name of the desktop. The word **Connected** appears next to the name while a window shows the desktop.
- **State** – Running, Needs your approval, Idle, or Error.

If you have no desktop, the list says that you have no desktops yet.

### The Details Pane

Click **Show Options** to see the details of the selected desktop. The pane lists the name, the status, the number of chats, the drives, the projects, the creation date, and the last use. The **Disconnect** button closes the window of a connected desktop.

### The Buttons

The buttons are at the bottom of the window. **Show Options** is at the left. **New...**, **Rename...**, **Delete...**, and **Connect** are at the right.

### The New Desktop Dialog Box

The dialog box has a name box, a list of projects, and an agent list.

- **Desktop name** – The name of the new desktop. The name must have 1 to 60 characters and must be new.
- **Projects to plug in as USB drives** – A list of folders. Select the projects that the desktop gets.
- **Browse...** – Adds a folder to the list.
- **Agent** – The agent that the chats of the desktop start. The default agent is selected first.

### The Rename Desktop Dialog Box

The dialog box has one box for the new name. The same name rules apply.

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
| Show Options, Hide Options | Shows or hides the details pane. | `launcher-options` |
| Disconnect | Closes the window of the selected desktop. | `launcher-disconnect` |
| New... | Opens the New desktop dialog box. | `launcher-new` |
| Rename... | Opens the Rename desktop dialog box. | `launcher-rename` |
| Delete... | Deletes the selected desktop after you answer a question. | `launcher-delete` |
| Connect | Opens the selected desktop. | `launcher-connect` |
| New desktop | The New desktop dialog box. | `new-desktop-dialog` |
| Desktop name (new) | Names the new desktop. | `new-desktop-name` |
| Name error | Shows why the name is not valid. | `new-desktop-error` |
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

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Up and Down arrows | Select the previous or next desktop. | none |
| Enter | Connects the selected desktop. | none |
| F2 | Opens the Rename desktop dialog box. | none |
| Delete | Starts the deletion of the selected desktop. | none |

## 5 - Common Tasks

To create a desktop for a project, follow the steps below:

1. Click **New...**. The **New desktop** dialog box appears.
2. Type a name in **Desktop name**.
3. Click **Browse...** and select the folder of your project. The project appears in the list with its option selected.
4. Click **Create**. The desktop appears in the list.

To connect to a desktop, select it and click **Connect**.

To rename a desktop, follow the steps below:

1. Select the desktop.
2. Click **Rename...**, or press F2.
3. Type the new name and click **OK**.

To delete a desktop, follow the steps below:

1. Select the desktop and click **Delete...**. A question appears.
2. Read the warning. Agent7 removes the C: drive, the chats, the notes, and the logs of the desktop. Agent7 only ejects the projects.
3. Click **Yes**.

## 6 - Troubleshooting

- **The name is not accepted.** Type a name of 1 to 60 characters. Use a name that no other desktop has.
- **Connect is dimmed.** Select a desktop in the list first.
- **The desktop shows Needs your approval.** Connect and answer the request in the **Action Center**.
- **The desktop shows Error.** Connect and open **Event Viewer** to read the messages.

## 7 - Need Help?

Read **[The Desktop](desktop.md)** to learn the desktop after you connect.
