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

**Desktop (also called a workspace)** – A workspace where an agent works on your projects. The bar at the top of the window shows the name of the desktop.

## 2 - Open It

You open a desktop from the **[Desktop Connection](launcher.md)** window. A desktop that you just created opens at once. To open another one, select it and click **Connect**. A new window opens and shows the desktop.

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

- **Status** – Shows Idle, Working, Waiting for you, You are in control, or Paused. A colored dot shows the same state. While the desktop is paused, the status reads **Paused: no agent will act until you resume.** See **[Pause, Stop, and Resume](pause-stop-resume.md)**.
- **Agent can use** – Always has the chips **Read files**, **Run commands**, and **Browser**. Each chip reads *Name*: *Allow*, *Ask*, or *Deny*, for example **Run commands: Ask**. When no app that gives the agent this tool is open, the chip adds it, for example **Run commands: Ask (no Terminal open)**. Point to a chip to read what it means. Chips of other apps appear while the app is open. Click a chip to open the Permissions page of Control Center. If no app is open, the bar adds **Agent can use nothing yet. Open an app to give it a tool.**
- **Pause all agents or Resume agents and continue** – Stops every agent on this desktop now and keeps them from doing anything until you click **Resume agents and continue**. Then each chat that was stopped gets the message **Please continue where you stopped.** and carries on. The Action Center has a line for each chat that was stopped.
- **Ask before every action** – A check box. When it is on, the agent must ask you before it reads, writes, runs a command, or uses the browser. The status then reads, for example, **You are in control. Tools that need an app ask first. Terminal and Browser are not open.** and the button **Give control back** shows. Click the button, or clear the box, to go back to the settings in Control Center.

### The Desktop Icons

The icons are at the left side of the desktop area: Computer, Chats, Code, Terminal, Browser, Control Center, and Recycle Bin. Click an icon to select it. Double-click it, or press Enter, to open its app. Point to an icon to read what it opens, for example **Chats: see your chats and open one**. With no chat yet, Chats starts one; with chats, it opens Task Manager, where **Switch to chat** opens one. The pointer shows that Agent7 is busy and the taskbar shows a button at once while the app opens. If the app cannot open, a message tells you why. The first time that you see a desktop, a balloon says **Double-click an icon to open it.** Use the arrow keys to move between icons. A dotted frame shows the icon that has the keyboard focus.

Right-click the bare desktop to see the menu of the desktop. The menu has **New chat**, **Open Computer**, **Gadgets**, and **Control Center**.

### The Windows

Each app opens in a window with a title bar. The title bar has the name of the window and three buttons: **Minimize**, **Maximize**, and **Close**. Drag the title bar to move the window. Drag an edge to change the size. Drag a window to the top edge to maximize it. When you close a chat window while the agent works, a balloon says **The agent keeps working. Open it again from Chats on the desktop.** The balloon has a button, **Open Task Manager**. A chat that you start from the Browser opens beside the Browser, in the half of the desktop that the Browser does not use.

If the agent opened a window, the label **opened by agent** appears at its edge. The taskbar button of a window that the agent opened behind your chat flashes until you select it.

### The Taskbar

The taskbar is at the bottom of the screen. It has the Start button, one button for each open window, and the notification area. Click a button to show the window. Click the button of the window that has focus to minimize it. Press the Left or Right arrow to move between the buttons. Press Enter or Space on a button to bring the window forward and move the focus into it (to the message box of a chat). The keys never minimize a window; use the window menu key to see **Minimize**. A button **Opening ...** shows while an app opens.

### Moving With the Keyboard

Press F6 to move the focus to the next part of the desktop: the desktop icons, the active window, the bar at the top, the taskbar, and the notification area. Press Shift+F6 to go back. Inside a part, Tab moves as usual. Tab after the last control of a window goes on to the next part. Press Alt+Tab (Alt+Shift+Tab to go back) to switch windows. Your system may keep Alt+Tab for itself; Ctrl+Alt+Tab always works.

### The Start Menu

Click the Start button, or press Ctrl+Esc. The Start menu has these parts:

- **Programs** – Lists New chat, Explorer, Code, Terminal, and Browser. The first item is highlighted when the menu opens. Press the Up and Down arrow keys to move and Enter to start the item. Type to search; Enter starts the first match.
- **All Programs** – Shows or hides the folders. Pause for a search and the matching folders open by themselves.
- **Accessories** – A folder (under All Programs) with Notepad, WordPad, Agent Paint, Snipping Tool, and Sticky Notes.
- **System Tools** – A folder (under All Programs) with Task Manager and Control Center. Event Viewer is in the left column of the Start menu.
- **Recent chats** – Lists your latest chats.
- **Search programs and chats** – Filters the lists while you type. The box is empty every time that you open the menu.
- **Places** – Lists Computer, Eject a project..., Documents, Control Center, Task Manager, Recycle Bin, Help and Support, New chat on a drive, and Agent7 Desktops.
- **Pause all agents or Resume agents** – Stops every agent or lets them work again.
- **Disconnect** – Closes the window. Its arrow opens **Disconnect**, **Switch desktop...**, and **Delete desktop...**.

### The Notification Area

The notification area is at the right end of the taskbar. It has these parts:

- **Safely Remove Hardware** – A USB icon. It appears while a project is plugged in. Point to it to read **Safely Remove Hardware: 1 project plugged in**. Click it to see **Eject** and the name of each project, for example **Eject login-app (E:)**. **Start -> Eject a project...** opens the same list.
- **Action Center** – A flag. A number on the flag tells how many requests wait for your answer.
- **Clock** – Shows the time and the date.
- **Balloon** – A message above the tray, for example **Project plugged in** (**login-app (E:) is ready to use.**) or **Project removed** (**'login-app' (E:) was removed from this desktop. Your files are still in the folder. Use Plug in again to add it back.**). It closes by itself after nine seconds.

### The Action Center

Click the flag to open the Action Center. Point at the flag to see how many requests wait for you. The Action Center lists each request that waits for your approval, in two lines: what the agent wants to do (for example **Change src/auth/redirect.ts**) and which chat asked, with the time the chat started. A chat that waits has the prefix **Waiting:** on its taskbar button. Click **Review** to answer a request. Click **Open Control Center** to change what the agent can do.

### Permission Prompts

Agent7 asks before the agent does an action that you set to **Ask** in **[Control Center](control-centre.md)**. A request appears in the Action Center. When you click **Review**, the permission dialog box dims the desktop.

- The title asks in plain words if the agent can do the action, for example **Allow the agent to change src/auth/redirect.ts?**
- The line **Reason:** tells why Agent7 asks, for example that Running commands is set to Ask.
- The box shows the command, or the change to the file: the full path, how many lines are added and removed, and the lines. Long lines wrap. **Show all lines** shows a long change in full. If Agent7 cannot read the file, the box says that the change replaces the whole file.
- The choices answer the request. Each has a second line that tells what happens. The focus starts on the refusal.

Press Esc or click **Not now** to close the dialog box without an answer. The request stays in the Action Center.

A Chat window shows a second kind of permission dialog box, with the same choices. See **[Chat](chat.md)**.

### Other Dialog Boxes

- **AutoPlay** – Appears when the agent plugs in a project. It offers to open the folder, to start a chat, or to do nothing. It does not appear when you plug in a project yourself.
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
| Tool chip | Names one tool group, for example Read files. Opens Control Center at Permissions. | `topbar-tool-chip-*` |
| Nothing yet | Shows that no app and no chat is open, or that only chats are. | `topbar-tool-chips-none` |
| Waiting for you | The status while requests wait, for example "Waiting for you: 2 requests to approve". Click it to open the next request. | `topbar-waiting-link` |
| Pause all agents, Resume agents | Pauses every agent or lets them work. | `topbar-pause` |
| Ask before every action | A check box. Makes the agent ask before every action. | `topbar-take-control` |
| Give control back | Hands control back to the agent. It shows while you are in control. | `topbar-give-back` |
| Agent: not started | A red chip. It shows when the agent of a chat could not start. Open that chat to see why. | `topbar-agent-problem` |

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
| Opening button | Shows while an app opens. | `taskbar-item-opening` |
| Notification area | Holds the tray icons and the clock. | `taskbar-tray` |
| Clock | Shows time and date. | `taskbar-clock` |
| Safely Remove Hardware | Opens the list of USB drives and recently removed projects. | `usb-tray` |
| Eject drive | Ejects the USB drive of that letter. | `usb-eject-*` |
| Plug in again (tray) | Plugs a recently removed project in again. It is listed below the drives. | `usb-plug-again` |
| Action Center flag | Opens the Action Center. | `action-center-flag` |
| Balloon | Shows a tray message. | `balloon` |
| Balloon title | Shows the title of the message. | `balloon-title` |
| Balloon text | Shows the text of the message. | `balloon-text` |
| Balloon close | Closes the balloon. | `balloon-close` |
| Balloon button | Runs the action that the balloon offers, for example Open Task Manager. | `balloon-action` |

### Start menu

| Name | What it does | data-testid |
|---|---|---|
| Start menu | Holds all Start menu items. | `start-menu` |
| App item | Opens an app. | `start-menu-item-*` |
| All Programs | Shows or hides the folders of apps, for example Accessories. | `start-menu-all` |
| Folder | Opens or closes a folder of apps. | `start-menu-group-*` |
| Recent chat | Opens a chat. | `start-menu-recent` |
| Key hint | Names the keys: Ctrl+Esc, Ctrl+N, and F6. | `start-menu-hint` |
| Search programs and chats | Filters the items. | `start-menu-search` |
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
| Request action | Names what the agent wants to do, for example Change src/auth/redirect.ts. | `action-center-approval-title` |
| Request chat | Names the chat that asked and when it started. | `action-center-approval-chat` |
| Message | Shows one message. | `action-center-message` |
| Open Control Center | Opens Control Center. | `action-center-open-control-centre` |
| Open Event Viewer | Opens Event Viewer, the list of what happened. | `action-center-open-event-viewer` |
| Dim layer | Dims the desktop behind the permission dialog box. | `uac-dim` |
| Permission dialog box | Asks if the agent can do the action. | `uac-dialog` |
| Question | Asks, in plain words, if the agent can do the action. | `uac-question` |
| Chat | Names the chat that asked. | `uac-from` |
| Reason | Says why you are asked, for example that Running commands is set to Ask. | `uac-reason` |
| Details | Shows the change to the file or the command. | `uac-detail` |
| Details: file | Shows the full path of the file. | `uac-detail-path` |
| Details: size | Tells how many lines are added and removed. | `uac-detail-summary` |
| Show all lines | Shows every line of a long change. | `uac-detail-more` |
| Allow | Allows the action. | `uac-allow` |
| Other answer | Gives another answer that the agent offers, for example Deny. The focus starts on the first refusal. | `uac-option-*` |
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
| Question | Says that the project is now a drive and asks what to do. | `autoplay-text` |
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
| Ctrl+N | Starts a new chat on the default drive, from the desktop, Code, Explorer, and Chat. The box to type in is ready. | none |
| Alt+F4 | Closes the focused window. | none |
| F6, Shift+F6 | Move the focus between the desktop icons, the active window, the bar, the taskbar, and the notification area. | none |
| Alt+Tab, Alt+Shift+Tab, Ctrl+Alt+Tab | Switch to the next or the previous window. | none |
| Enter, Space (taskbar button) | Bring the window forward and move the focus into it. | none |
| Enter (desktop icon) | Opens the app of the selected icon. | none |
| Arrow keys | Move between desktop icons or taskbar buttons. | none |
| Esc | Closes the Action Center or the permission dialog box. | none |

## 5 - Common Tasks

To open an app, follow the steps below:

1. Click **Start**. The Start menu opens.
2. Click the app, or type its name in **Search programs and chats**.

To pause the agent, click **Pause all agents** in the top bar. Click **Resume agents and continue** to let the agents work again. Each chat that was stopped carries on by itself.

To answer a permission request, follow the steps below:

1. Click the flag in the notification area. The Action Center opens.
2. Click **Review** next to the request. The permission dialog box appears.
3. Read the change to the file or the command in the box.
4. Click **Allow**, or click the button that refuses the action. The focus starts on the refusal.

To make the agent ask before every action, even reading, tick **Ask before every action** in the top bar. Clear the box to go back to the settings in Control Center.

To eject a USB drive, follow the steps below:

1. Click the **Safely Remove Hardware** icon in the notification area, or click **Start -> Eject a project...**.
2. Click **Eject** and the name of the project. A balloon tells you that the project was removed from this desktop and that your files are still in the folder.

To open the manual of a window, select the window and press F1.

## 6 - Troubleshooting

- **The agent cannot use a tool.** Open the app that gives the tool. The top bar lists the tools that are on.
- **The agent asks for permission each time.** Open **[Control Center](control-centre.md)**. Change the setting of the action from **Ask** to **Allow**.
- **The permission dialog box closed and the agent waits.** Click the flag in the notification area, then click **Review**.
- **The USB icon is gone.** The icon appears only while a project is plugged in. To plug a project in again, open **Computer** and click **Plug in a project...**.
- **A window is outside the screen.** Click its taskbar button, then drag the title bar.

## 7 - Need Help?

Read **[Desktop Connection](launcher.md)** to manage your desktops. Read **[Control Center](control-centre.md)** to change permissions. Click **Home** to see all topics.
