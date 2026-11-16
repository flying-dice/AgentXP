# Using Explorer

This manual describes Explorer. Explorer shows the drives and the folders of a desktop.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Navigation Buttons and the Address Bar
  - The Command Bar
  - The Navigation Pane
  - The File List
  - The Computer Window
  - The Status Bar
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Explorer to see the files that the agent can reach, to open a file, to plug in a project as a drive, and to eject it. The **Agent status** column shows which files the agent changed.

Explorer only shows files. It has no commands to copy, move, rename, or delete them. To change a file, open it with Notepad or Code, or ask the agent.

## 2 - Open It

- Double-click **Computer** on the desktop.
- Click **Start -> Computer**, or **Start -> Documents**.
- Click **Open folder to view files** in the AutoPlay dialog box.

## 3 - The Window

### The Navigation Buttons and the Address Bar

The row at the top has **Back**, **Up**, the address bar, and **Refresh**. The address bar shows the path as a trail of folders. Click a folder in the trail to go there. Click the empty part of the bar, or press F4, to type a path.

### The Command Bar

The command bar appears only in the **Computer** window. It has **Plug in a project...**, **Plug in again**, **Open**, and **Eject (remove from this desktop)**. Point to a button to read what it does. For example, **Plug in a project...** says: Plug in a project folder as a drive so that the agent can see its files. Press F1 for more. The **Eject (remove from this desktop)** button says: Remove the selected project from this desktop. The folder stays on your disk.

### The Navigation Pane

The pane is at the left. It has **Favorites**, **Libraries**, and **Computer** with its drives. Click an entry to go there.

### The File List

The list shows the files of the folder. It has the columns **Name**, **Type**, and **Agent status**. Double-click a folder to open it. Double-click a file to open it in Notepad (text, markdown, and log files) or in Code (all other files). Right-click an item to see **Open**, **Open with Notepad** and **Open with Code** (files only), **Copy as path**, **Start a chat here**, **Ask the agent about this...**, and **Properties**.

### The Computer Window

The **Computer** window shows a tile for each drive. The group **Hard Disk Drives** has the private C: drive (files made on this desktop). The group **Devices with Removable Storage** has the projects that you plugged in. Each one says **Project folder (plugged in)**. Right-click a drive, here or in the navigation pane, to see **Open**, **Start a chat here**, **Eject (remove from this desktop)**, and **Properties**.

The group **Recently removed** shows the last five projects that you ejected from this desktop. The newest one is selected when you open the group. If nothing was removed yet, the dimmed button says so in its tooltip. Select one and click **Plug in again**, double-click it, or right-click it and click **Plug in again**. No dialog box appears.

After you plug in a project, its drive is selected here. If the project is plugged in already, a message names its drive and the drive is selected.

### The Status Bar

The status bar shows the number of items and the selection. In **Computer** it shows how many projects are plugged in, for example **1 project plugged in**.

### The Chat Pane

Each Explorer window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Explorer window | The root of the window. The attribute `data-path` holds the path. | `explorer-app` |
| Back | Goes to the last place. | `explorer-back` |
| Up | Goes to the parent folder. | `explorer-up` |
| Address bar | Shows the path as a trail. | `explorer-address` |
| Folder in the trail | Goes to that folder. | `explorer-crumb` |
| Address box | Lets you type a path. Press Enter to go. | `explorer-address-field` |
| Refresh | Reads the folders again. | `explorer-refresh` |
| Plug in a project... | Opens the **Browse For Folder** dialog box and plugs the folder in as a drive. | `explorer-plug-in` |
| Plug in again | Plugs the selected recently removed project in again. | `explorer-plug-in-again` |
| Open | Opens the selected drive. | `explorer-open` |
| Eject (remove from this desktop) | Removes the selected project from this desktop. The folder and its files stay where they are. | `explorer-eject` |
| Navigation pane | The tree at the left. | `explorer-nav` |
| Favorites | The group of favorite folders. | `explorer-tree-favorites` |
| Favorite | One favorite folder. | `explorer-tree-favorite` |
| Library | One library folder. | `explorer-tree-library` |
| Computer (tree) | Shows the Computer window. | `explorer-tree-computer` |
| Drive (tree) | One drive in the tree. | `explorer-tree-drive-*` |
| Folder (tree) | One folder in the tree. | `explorer-tree-folder` |
| Files | The file list. | `explorer-list` |
| File or folder | One row of the list. | `explorer-item` |
| Computer window | Holds the drive tiles. | `explorer-computer` |
| Drive tile | One drive. | `explorer-drive-*` |
| Recently removed | The group of the last five ejected projects. | `explorer-removed-group` |
| Removed project | One ejected project. Double-click it to plug it in again. | `explorer-removed-item` |
| Item count | Shows how many items the folder has. | `explorer-item-count` |
| Selection | Describes the selected items. | `explorer-selection` |
| Open (menu) | Opens a folder or a drive. | `menu-item-explorer-folder-open`, `menu-item-explorer-drive-open` |
| Start a chat here | Starts a chat in that folder or drive. | `menu-item-explorer-folder-chat`, `menu-item-explorer-drive-chat` |
| Eject (menu) | Ejects the drive. The menu entry reads "Eject (remove from this desktop)". | `menu-item-explorer-drive-eject` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `explorer-menu-help` |
| Menu: about | Opens the About Explorer box. | `explorer-menu-about` |
| Dialog: about | The About Explorer box. | `explorer-about` |
| Dialog: about ok | Closes the About box. | `explorer-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `explorer-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: open | File menu: opens the selected file, folder or drive. | `explorer-menu-open` |
| Menu: new chat | File menu: starts a chat on the default drive. Ctrl+N. | `explorer-menu-new-chat` |
| Menu: plug in | File menu: plugs in a project as a USB drive. | `explorer-menu-plug-in` |
| Menu: plug in again | File menu: plugs the selected recently removed project in again. | `explorer-menu-plug-in-again` |
| Menu: eject | File menu: ejects the selected USB drive. | `explorer-menu-eject` |
| Menu: properties | File menu: shows the properties of the selected file or folder. | `explorer-menu-properties` |
| Menu: close | Closes the window. Alt+F4. | `explorer-menu-close` |
| Menu: copy path | Edit menu: copies the path of the selected item. | `explorer-menu-copy-path` |
| Menu: select all | Edit menu: selects all items in the folder. Ctrl+A. | `explorer-menu-select-all` |
| Menu: up | View menu: goes up one level. Alt+Up. | `explorer-menu-up` |
| Menu: refresh | View menu: reads the folder again. F5. | `explorer-menu-refresh` |
| Context menu: open | Opens the file or folder. | `explorer-ctx-open` |
| Context menu: open code | Opens the file in Code. | `explorer-ctx-open-code` |
| Context menu: open notepad | Opens the file in Notepad. | `explorer-ctx-open-notepad` |
| Context menu: copy path | Copies the path of the item. | `explorer-ctx-copy-path` |
| Context menu: start chat | Starts a chat in the folder. | `explorer-ctx-start-chat` |
| Context menu: ask the agent about this | Opens the chat pane with a draft about the item or the folder. | `explorer-ctx-ask` |
| Context menu: properties | Shows the type, location, size and date. | `explorer-ctx-properties` |
| Context menu: refresh | Background menu: reads the folder again. F5. | `explorer-ctx-refresh` |
| Context menu: up | Background menu: goes up one level. | `explorer-ctx-up` |
| Context menu: drive ask | Drive menu: starts a chat about the drive. | `explorer-ctx-drive-ask` |
| Context menu: drive copy path | Drive menu: copies the drive path. | `explorer-ctx-drive-copy-path` |
| Context menu: drive properties | Drive menu: shows the type, letter and date of the drive. | `explorer-ctx-drive-properties` |
| Context menu: plug in again | Removed project menu: plugs the project in again. | `explorer-ctx-plug-in-again` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F4 | Lets you type a path in the address bar. | `explorer-address` |
| Enter | Opens the selected file or drive. | none |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To plug in a project, follow the steps below:

1. Open **Computer**. The command bar appears.
2. Click **Plug in a project...** The **Browse For Folder** dialog box appears.
3. Select the folder of your project and click **OK**. The project appears as a drive and is selected. A balloon says that it is ready to use, and the window shows the files of the new drive. AutoPlay does not appear, because you chose the folder yourself.

To plug in a project that you ejected, select it under **Recently removed** and click **Plug in again**.

To go to a path, follow the steps below:

1. Press F4. The address box opens.
2. Type the path, for example `E:\src`.
3. Press Enter.

To start a chat in a folder, right-click the folder and click **Start a chat here**.

To remove a project from the desktop, select it in **Computer** and click **Eject (remove from this desktop)**, or right-click it and click the same entry. A balloon with the title **Project removed** says: 'login-app' (E:) was removed from this desktop. Your files are still in the folder. Use Plug in again to add it back. The folder is not deleted.

## 6 - Troubleshooting

- **A message says that Windows cannot find the path.** Fix the spelling of the path. Make sure that the drive is plugged in.
- **The window went back to Computer.** Someone ejected the drive that you looked at.
- **Eject (remove from this desktop) is dimmed.** Select a project. The private C: drive cannot be ejected.
- **A folder looks empty.** The window shows **This folder is empty**. Click **Refresh** to read it again.

## 7 - Need Help?

Read **[Code](code.md)** to review the changes of the agent. Read **[The Desktop](desktop.md)** for the Safely Remove icon.
