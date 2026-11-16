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
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Explorer to see the files that the agent can reach, to open a file, to plug in a project as a USB drive, and to eject it. The **Agent status** column shows which files the agent changed.

## 2 - Open It

- Double-click **Computer** on the desktop.
- Click **Start -> Computer**, or **Start -> Documents**.
- Click **Open folder to view files** in the AutoPlay dialog box.

## 3 - The Window

### The Navigation Buttons and the Address Bar

The row at the top has **Back**, **Up**, the address bar, and **Refresh**. The address bar shows the path as a trail of folders. Click a folder in the trail to go there. Click the empty part of the bar, or press F4, to type a path.

### The Command Bar

The command bar appears only in the **Computer** window. It has **Plug in a project...**, **Open**, and **Eject**.

### The Navigation Pane

The pane is at the left. It has **Favorites**, **Libraries**, and **Computer** with its drives. Click an entry to go there.

### The File List

The list shows the files of the folder. It has the columns **Name**, **Type**, and **Agent status**. Double-click a folder to open it. Double-click a file to open it in Notepad (text, markdown, and log files) or in Code (all other files). Right-click a folder to see **Open** and **Start a chat here**.

### The Computer Window

The **Computer** window shows a tile for each drive. The group **Hard Disk Drives** has the C: drive. The group **Devices with Removable Storage** has the USB drives. Right-click a drive to see **Open**, **Start a chat here**, and **Eject**.

### The Status Bar

The status bar shows the number of items and the selection.

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
| Plug in a project... | Lets you select a folder and plugs it in as a USB drive. | `explorer-plug-in` |
| Open | Opens the selected drive. | `explorer-open` |
| Eject | Safely removes the selected USB drive. | `explorer-eject` |
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
| Item count | Shows how many items the folder has. | `explorer-item-count` |
| Selection | Describes the selected items. | `explorer-selection` |
| Open (menu) | Opens a folder or a drive. | `menu-item-explorer-folder-open`, `menu-item-explorer-drive-open` |
| Start a chat here | Starts a chat in that folder or drive. | `menu-item-explorer-folder-chat`, `menu-item-explorer-drive-chat` |
| Eject (menu) | Ejects the drive. | `menu-item-explorer-drive-eject` |

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
3. Select the folder of your project and click **OK**. The project appears as a USB drive, and AutoPlay asks what to do.

To go to a path, follow the steps below:

1. Press F4. The address box opens.
2. Type the path, for example `E:\src`.
3. Press Enter.

To start a chat in a folder, right-click the folder and click **Start a chat here**.

To eject a drive, select the USB drive in **Computer** and click **Eject**. A balloon tells you that the drive is safe to remove.

## 6 - Troubleshooting

- **A message says that Windows cannot find the path.** Fix the spelling of the path. Make sure that the drive is plugged in.
- **The window went back to Computer.** Someone ejected the drive that you looked at.
- **Eject is dimmed.** Select a USB drive. The C: drive cannot be ejected.
- **A folder looks empty.** The window shows **This folder is empty**. Click **Refresh** to read it again.

## 7 - Need Help?

Read **[Code](code.md)** to review the changes of the agent. Read **[The Desktop](desktop.md)** for the Safely Remove icon.
