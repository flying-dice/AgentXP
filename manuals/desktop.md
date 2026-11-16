# Using the Desktop

This manual describes the parts of the desktop that do not belong to one app: the icons, the taskbar, the Start menu, the notification area, the windows, the permission prompts, and the connection bar.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Connection Bar
  - The Top Bar
  - The Desktop Icons
  - The Windows
  - The Taskbar
  - The Start Menu
  - The Notification Area
  - The Action Center
  - Permission Prompts
  - Other Dialog Boxes
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

The desktop is the shell of Agent7. It looks like Windows 7. It holds the apps of one desktop, shows what the agent can use, and asks you before the agent does a risky action.

Use the desktop to open apps, to switch between windows, to pause the agent, and to answer permission requests.

## 2 - Open It

You open a desktop from the **[Desktop Connection](launcher.md)** window. Select a desktop and click **Connect**. A new window opens and shows the desktop.

If you have no desktop yet, the **Welcome to Agent7** dialog box appears. Click **Agent7 Desktops...** to open the **Desktop Connection** window.

## 3 - The Window

The desktop window has the connection bar at the top, the desktop area in the middle, and the taskbar at the bottom.

### The Connection Bar

The connection bar is at the top edge of the window. It looks like the bar of a Remote Desktop connection.

- **Pin** – Keeps the bar open. If you unpin it, the bar folds away until the pointer is over it.
- **Desktop name** – Shows the name of the desktop and the state of the agent.
- **Minimize, Maximize** – Change the size of the Agent7 window on your computer.
- **Disconnect** – Closes the Agent7 window. The agents keep running.

### The Top Bar

The top bar is below the connection bar. It shows what the agent does now and what the agent can use.

- **Status** – Shows Idle, Working, or Paused. A colored dot shows the same state.
- **Agent can use** – Lists a chip for each tool group that the open apps give to the agent. If no app is open, the list says nothing yet.
- **Pause or Resume** – Stops the agent or lets it work again.
- **Take control or Release** – Tells the agent that you work on the desktop yourself.

### The Desktop Icons

The icons are at the left side of the desktop area: Computer, Chats, Code, Terminal, Browser, Control Centre, and Recycle Bin. Double-click an icon to open its app. Use the arrow keys to move between icons.

Right-click the bare desktop to see the menu of the desktop. The menu has **New chat**, **Open Computer**, **Gadgets**, and **Control Centre**.

### The Windows

Each app opens in a window with a title bar. The title bar has the name of the window and three buttons: **Minimize**, **Maximize**, and **Close**. Drag the title bar to move the window. Drag an edge to change the size. Drag a window to the top edge to maximize it.

If the agent opened a window, the label **opened by agent** appears at its edge. The taskbar button of a window that the agent opened behind your chat flashes until you select it.

### The Taskbar

The taskbar is at the bottom of the screen. It has the Start button, one button for each open window, and the notification area. Click a button to show the window. Click the button of the window that has focus to minimize it. Press the Left or Right arrow to move between the buttons.

### The Start Menu

Click the Start button, or press Ctrl+Esc. The Start menu has these parts:

- **Programs** – Lists New chat, Explorer, Code, Terminal, and Browser.
- **Accessories** – A folder with Notepad, WordPad, Agent Paint, Snipping Tool, and Sticky Notes.
- **System Tools** – A folder with Event Viewer, Task Manager, and Control Centre.
- **Recent chats** – Lists your latest chats.
- **Search apps and chats** – Filters the lists while you type.
- **Places** – Lists Computer, Documents, Control Centre, Task Manager, Recycle Bin, Help and Support, New chat on a drive, and Agent7 Desktops.
- **Pause agent or Resume agent** – Stops the agent or lets it work again.
- **Disconnect** – Closes the window. Its arrow opens **Disconnect**, **Switch desktop...**, and **Delete desktop...**.

### The Notification Area

The notification area is at the right end of the taskbar. It has these parts:

- **Safely Remove Hardware and Eject Media** – A USB icon. It appears only while a project is plugged in. Click it to eject a USB drive.
- **Action Center** – A flag. A number on the flag tells how many requests wait for your answer.
- **Clock** – Shows the time and the date.
- **Balloon** – A message above the tray, for example **Safe To Remove Hardware**. It closes by itself after nine seconds.

### The Action Center

Click the flag to open the Action Center. It lists each request that waits for your approval and each message. Click **Review** to answer a request. Click **Open Control Centre** to change what the agent can do.

### Permission Prompts

Agent7 asks before the agent does an action that you set to **Ask** in **[Control Centre](control-centre.md)**. A request appears in the Action Center. When you click **Review**, the permission dialog box dims the desktop.

- The title asks if the agent can do the action.
- The reason line tells why Agent7 asks.
- **Show details** shows the command or the diff of the file.
- The buttons answer the request. The first button allows the action.

Press Esc or click **Not now** to close the dialog box without an answer. The request stays in the Action Center.

A Chat window shows a second kind of permission dialog box, with the same choices. See **[Chat](chat.md)**.

### Other Dialog Boxes

- **AutoPlay** – Appears when you plug in a project. It offers to open the folder, to start a chat, or to do nothing.
- **New chat** – Asks on which drive the agent works.
- **Open file** – Lets you select a file in Notepad, Code, and WordPad.
- **Message box** – Asks a question or reports an error. Its buttons are named **OK**, **Yes**, **No**, and **Cancel**.

## 4 - Controls Reference

### Connection bar and top bar

| Name | What it does | data-testid |
|---|---|---|
| Connection bar | Holds the title and the buttons of the connection. | `connbar` |
| Pin | Keeps the bar open or lets it fold away. | `connbar-pin` |
| Desktop name | Shows the name of the desktop. | `connbar-title` |
| Minimize | Minimizes the Agent7 window. | `connbar-minimize` |
| Maximize, Restore Down | Changes the size of the Agent7 window. | `connbar-maximize` |
| Disconnect | Closes the Agent7 window. The agents keep running. | `connbar-close` |
| Top bar | Holds the state and the tools of the agent. | `topbar` |
| State dot | Shows Idle, Working, or Paused. | `topbar-dot` |
| Status | Shows the text of the state. | `topbar-status` |
| Agent can use | Holds the chips of the tool groups. | `topbar-tool-chips` |
| Tool chip | Names one tool group, for example Notepad. | `topbar-tool-chip-*` |
| Nothing yet | Shows that no tool group is on. | `topbar-tool-chips-none` |
| Pause, Resume | Pauses the agent or lets it work. | `topbar-pause` |
| Take control, Release | Tells the agent that you are in control. | `topbar-take-control` |

### Icons, windows, and desktop menu

| Name | What it does | data-testid |
|---|---|---|
| Desktop icon | Opens an app when you double-click it. | `desktop-icon-*` |
| Window frame | Holds one app window. The name ends with the app, for example `window-notepad`. | `window-*` |
| Title | Shows the name of the window. | `window-title` |
| Minimize | Hides the window on the taskbar. | `window-minimize` |
| Maximize | Makes the window fill the desktop. | `window-maximize` |
| Close | Closes the window. | `window-close` |
| Sticky notes layer | Holds the notes on the desktop. | `sticky-notes-layer` |
| Desktop menu items | Open from the right-click menu. | `menu-item-desktop-new-chat`, `menu-item-desktop-open-computer`, `menu-item-desktop-gadgets`, `menu-item-desktop-control-centre` |

### Taskbar

| Name | What it does | data-testid |
|---|---|---|
| Taskbar | Holds the buttons and the tray. | `taskbar` |
| Start | Opens or closes the Start menu. | `taskbar-start` |
| Window button | Shows, hides, or focuses one window. | `taskbar-item-*` |
| Notification area | Holds the tray icons and the clock. | `taskbar-tray` |
| Clock | Shows time and date. | `taskbar-clock` |
| Safely Remove Hardware | Opens the list of USB drives. | `usb-tray` |
| Eject drive | Ejects the USB drive of that letter. | `usb-eject-*` |
| Action Center flag | Opens the Action Center. | `action-center-flag` |
| Balloon | Shows a tray message. | `balloon` |
| Balloon title | Shows the title of the message. | `balloon-title` |
| Balloon text | Shows the text of the message. | `balloon-text` |
| Balloon close | Closes the balloon. | `balloon-close` |

### Start menu

| Name | What it does | data-testid |
|---|---|---|
| Start menu | Holds all Start menu items. | `start-menu` |
| App item | Opens an app. | `start-menu-item-*` |
| Folder | Opens or closes a folder of apps. | `start-menu-group-*` |
| Recent chat | Opens a chat. | `start-menu-recent` |
| Search apps and chats | Filters the items. | `start-menu-search` |
| Place | Opens a place, for example Documents or Help and Support. | `start-menu-place-*` |
| Pause agent, Resume agent | Pauses the agent or lets it work. | `start-menu-power` |
| Disconnect | Closes the window. | `start-menu-disconnect` |
| Disconnect options | Opens the shutdown menu. | `start-menu-disconnect-arrow` |
| Shutdown menu | Holds the next three items. | `start-menu-disconnect-menu` |
| Disconnect (menu) | Closes the window. | `start-menu-shutdown-disconnect` |
| Switch desktop... | Opens the Desktop Connection window. | `start-menu-shutdown-switch` |
| Delete desktop... | Deletes the desktop after you answer a question. | `start-menu-shutdown-delete` |

### Action Center and permission prompts

| Name | What it does | data-testid |
|---|---|---|
| Action Center | Holds the requests and the messages. | `action-center` |
| Request | Shows one request that waits. | `action-center-approval` |
| Review | Opens the permission dialog box. | `action-center-review` |
| Message | Shows one message. | `action-center-message` |
| Open Control Centre | Opens Control Centre. | `action-center-open-control-centre` |
| Dim layer | Dims the desktop behind the permission dialog box. | `uac-dim` |
| Permission dialog box | Asks if the agent can do the action. | `uac-dialog` |
| Action name | Names the action. | `uac-tool` |
| Show details, Hide details | Shows or hides the command or the diff. | `uac-details` |
| Allow button | Allows the action. | `uac-allow` |
| Other answer button | Gives another answer that the agent offers. | `uac-option-*` |
| Cancel the action | Ends the turn of the agent. Appears if the agent offers no answer. | `uac-cancel-action` |
| Not now | Closes the dialog box. The request stays. | `uac-not-now` |

### Other dialog boxes

| Name | What it does | data-testid |
|---|---|---|
| Welcome to Agent7 | Appears when you have no desktop. | `welcome-dialog` |
| Agent7 Desktops... | Opens the Desktop Connection window. | `welcome-open-launcher` |
| AutoPlay | Appears when you plug in a project. | `autoplay-dialog` |
| Open folder to view files | Opens the drive in Explorer. | `autoplay-open-folder` |
| Start a chat on this drive | Starts a chat on the drive. | `autoplay-start-chat` |
| Take no action | Closes the dialog box. | `autoplay-no-action` |
| New chat | Asks where the agent works. | `new-chat-dialog` |
| Drive option | Selects the drive for the chat. | `new-chat-drive-*` |
| Start chat | Starts the chat. | `new-chat-start` |
| Cancel | Closes the dialog box. | `new-chat-cancel` |
| Open file | Lets you select a file. | `open-file-dialog` |
| Save as | Asks for the name of the file to save. | `save-as-dialog` |
| Save as: file name | The name of the file. | `save-as-name` |
| Message box | Asks a question. | `message-box` |
| Dialog button | One button of a dialog box, for example `dialog-button-ok`. | `dialog-button-*` |
| Menu bar button | One menu of an app, for example `menubar-file`. | `menubar-*` |
| Menu item | One menu item. The name follows the item, for example `menu-item-save`. | `menu-item-*` |

### Taskbar Button Menu

Right-click a taskbar button to open its menu.

| Name | What it does | data-testid |
|---|---|---|
| Restore | Restores a minimized or maximized window. | `taskbar-ctx-restore` |
| Minimize | Minimizes the window. | `taskbar-ctx-minimize` |
| Close window | Closes the window. Alt+F4. | `taskbar-ctx-close` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens Help and Support on the topic of the focused window. | none |
| Ctrl+Esc | Opens or closes the Start menu. | none |
| Alt+F4 | Closes the focused window. | none |
| Arrow keys | Move between desktop icons or taskbar buttons. | none |
| Esc | Closes the Action Center or the permission dialog box. | none |

## 5 - Common Tasks

To open an app, follow the steps below:

1. Click **Start**. The Start menu opens.
2. Click the app, or type its name in **Search apps and chats**.

To pause the agent, click **Pause** in the top bar. Click **Resume** to let the agent work again.

To answer a permission request, follow the steps below:

1. Click the flag in the notification area. The Action Center opens.
2. Click **Review** next to the request. The permission dialog box appears.
3. Click **Show details** to see the command or the change.
4. Click **Allow**, or click the button that refuses the action.

To work without the agent, click **Take control** in the top bar. Click **Release** to give control back.

To eject a USB drive, follow the steps below:

1. Click the **Safely Remove Hardware and Eject Media** icon in the notification area.
2. Click **Eject** and the name of the drive. A balloon tells you that the drive is safe to remove.

To open the manual of a window, select the window and press F1.

## 6 - Troubleshooting

- **The agent cannot use a tool.** Open the app that gives the tool. The top bar lists the tools that are on.
- **The agent asks for permission each time.** Open **[Control Centre](control-centre.md)**. Change the setting of the action from **Ask** to **Allow**.
- **The permission dialog box closed and the agent waits.** Click the flag in the notification area, then click **Review**.
- **The USB icon is gone.** The icon appears only while a project is plugged in.
- **A window is outside the screen.** Click its taskbar button, then drag the title bar.

## 7 - Need Help?

Read **[Desktop Connection](launcher.md)** to manage your desktops. Read **[Control Centre](control-centre.md)** to change permissions. Click **Home** to see all topics.
