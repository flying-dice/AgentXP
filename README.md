<p align="center">
  <img src="resources/icon-256.png" alt="The Agent7 logo" width="96" height="96">
</p>

# Introduction to Agent7

Agent7 is a program that gives coding agents a virtual Windows 7 desktop to work on. You watch the agent open apps, read files, run commands, and change code. You decide what the agent can use.

## Table of Contents

- 1 - About Agent7
  - What Agent7 Does
  - Words Used in This Guide
- 2 - Installing Agent7
- 3 - The Desktop Connection Window
  - Creating a Desktop
  - Connecting and Disconnecting
  - Renaming and Deleting a Desktop
  - Notifications
- 4 - The Desktop
  - The Top Bar
  - The Taskbar
  - The Start Menu
  - The Action Center
  - The Gadgets
- 5 - Getting Started
  - Creating a Desktop for a Project
  - Plugging In a Project
  - Starting a Chat
  - Sending a Message
  - Undoing a Change
- 6 - What the Agent Can Use
  - Tools Follow Apps
  - Pause and Take Control
- 7 - Allowing or Denying an Action
  - Answering a Request
  - Choosing When Agent7 Asks
- 8 - Drives and Files
  - The C: Drive
  - USB Drives
  - Safely Remove
- 9 - The Apps
  - The Event Viewer
  - Adding an Agent
- 10 - Windows That the Agent Draws
- 11 - Who Needs a Mouse?
- 12 - For Developers
  - Commands
  - How Agent7 Is Built
  - The Scripted Agent
  - Test Ids
  - Screenshots for This Guide
  - More to Read
- 13 - Need Help?

---

## 1 - About Agent7

This chapter tells you what Agent7 does and explains the words that this guide uses.

### What Agent7 Does

Agent7 starts a coding agent as a separate program on your computer. The agent does not work in one window. It lives on a desktop, a small virtual Windows 7 computer, and works through apps that open as windows on that desktop.

You see exactly what the agent can use, because the tools of the agent follow the apps that are open. If you close the Terminal app, the agent cannot run commands. If you open the Browser app, the agent can browse the web.

Agent7 stores your desktops, chats, and changes on your computer. Nothing leaves your computer except the requests that the agent itself sends to its own service.

### Words Used in This Guide

- **Agent** – A program that writes and changes code for you, for example Claude Code.
- **Desktop** – A long-lived virtual computer for one or more projects. It keeps its apps, chats, and files when you close its window.
- **Chat** – One conversation with an agent. A Chat window shows it.
- **App** – A program that opens as a window on a desktop, for example Explorer or Terminal.
- **Drive** – A place for files on a desktop. Each desktop has a C: drive and can have USB drives.
- **USB drive** – A project folder that you plug in to a desktop. It gets the letter E: or a later letter.
- **Tool** – An action that an agent can do, for example "run a command". An open app gives the agent its tools.
- **ACP** – The Agent Client Protocol. Agent7 uses it to talk to agents.

## 2 - Installing Agent7

Agent7 runs on Windows, macOS, and Linux. Before you install it, make sure that your computer has these programs:

- **[Node.js](https://nodejs.org)** version 22 or later
- **[Git](https://git-scm.com)**
- An ACP agent. Agent7 adds Claude Code for you. Claude Code uses your Claude Code sign-in or the `ANTHROPIC_API_KEY` environment variable.

To install and start Agent7, follow the steps below:

1. Open a command prompt.
2. Type the commands below to download Agent7 and install its parts:

   ```bash
   git clone https://github.com/flying-dice/AgentXP.git agent7
   cd agent7
   npm install
   ```

3. Type `npm run dev` and press Enter. The **Agent7 Desktop Connection** window appears.

**Tip:** To make an installer for your computer, type `npm run dist`. The installer appears in the `dist` folder.

## 3 - The Desktop Connection Window

The **Agent7 Desktop Connection** window opens when Agent7 starts. It lists your desktops and lets you create, connect, rename, and delete them.

![The Agent7 Desktop Connection window with three desktops and the desktop details open](docs/images/launcher.png)

The window has these parts:

- **Desktop list** – Shows one row for each desktop, with a picture, its name, its state, its projects, and its last use. A **Connected** label marks a desktop that has a window.
- **Desktop details** – Shows the name, state, number of chats, drives, and dates of the selected desktop. Click **Show Options** to see it.
- **Disconnect** – Closes the window of the selected desktop. It is in the details.
- **New...** – Opens the **New desktop** dialog box.
- **Rename...** – Changes the name of the selected desktop.
- **Delete...** – Removes the selected desktop.
- **Connect** – Opens the window of the selected desktop.

The state of a desktop is **Idle**, **Running**, **Needs your approval**, or **Error**. The state **Needs your approval** shows the number of requests that wait for you.

### Creating a Desktop

To create a desktop, follow the steps below:

1. Click **New...**. The **New desktop** dialog box appears.
2. Type a name in **Desktop name**.
3. Select each project that you want to plug in as a USB drive. To add a project that the list does not show, click **Browse...**.
4. In **Agent**, select the agent that the desktop uses.
5. Click **Create**. The desktop appears in the list.

### Connecting and Disconnecting

To open a desktop, select it in the list and click **Connect**. You can also double-click the desktop or press Enter. The desktop window appears next to this window.

To disconnect a desktop, follow the steps below:

1. Select the desktop in the list.
2. Click **Show Options**. The desktop details appear.
3. Click **Disconnect**. The desktop window closes.

If you close a desktop window with the close command of your own computer, the result is the same. Closing a desktop window only disconnects the desktop. The agents, the chats, and the requests for permission keep running in Agent7.

To come back, click **Connect** again. The apps, chats, and files are as you left them. To show this window again from a desktop, click **Start -> Agent7 Desktops...**.

### Renaming and Deleting a Desktop

To rename a desktop, select it and click **Rename...**. Type the new name and click **OK**. Each desktop needs its own name.

To delete a desktop, follow the steps below:

1. Select the desktop in the list.
2. Click **Delete...**. A message box asks if you want to delete the desktop.
3. Click **Yes**. The desktop leaves the list.

**Caution:** Do not delete a desktop if you want to keep its chats. Agent7 removes the C: drive, the chats, the notes, and the logs of the desktop. Your project folders stay on your computer.

### Notifications

If an agent asks for permission on a desktop that has no window, Agent7 shows a notification. The text is "Agent7: Fix login redirect needs your approval", where the name is the name of the desktop. Click the notification to connect the desktop. The row of the desktop in the list shows the state **Needs your approval**.

## 4 - The Desktop

The desktop window looks like Windows 7. It has a top bar for the agent, windows for the apps, a taskbar at the bottom, and gadgets on the right side.

![The Agent7 desktop with a chat, Explorer, Code, and Terminal open while the agent works](docs/images/desktop.png)

The desktop has these parts:

- **Top bar** – Shows what the agent does now and the tools that it can use.
- **Desktop icons** – Open **Computer**, **Chats**, **Code**, **Terminal**, **Browser**, **Control Centre**, and **Recycle Bin**. Double-click an icon.
- **Windows** – Show the apps. You can move, resize, minimize, maximize, and close them. To maximize a window, drag its title bar to the top of the desktop.
- **Sticky notes** – Stay on the desktop. The agent can read and write them while Sticky Notes is open.
- **Gadgets** – Show the context meter, the clock, and the activity of the agent on the right side.
- **Taskbar** – Shows the **Start** button, one button for each window, and the notification area.

### The Top Bar

The top bar is at the top of the desktop. It shows the name of the desktop, the state of the agent, and two buttons.

- **Status** – Shows **Idle**, **Paused**, or **Working** with the name of the action that runs now.
- **Pause** – Stops the running turns of the agent and blocks new tool calls. The button changes to **Resume**.
- **Take control** – Makes every tool call of the agent wait for your approval. The button changes to **Release**.
- **Agent can use** – Shows one chip for each group of tools that the agent can use now, for example **Read files**, **Terminal**, or **Notes**.

### The Taskbar

The taskbar is at the bottom of the desktop. Click a window button to show, hide, or bring forward that window.

The notification area is at the right end of the taskbar. It has these parts:

- **Safely Remove Hardware** – Shows a USB stick with a green mark. It appears while a USB drive is plugged in. Click it to remove a drive.
- **Action Center** – Shows a flag. A red number on the flag counts the requests that wait for you.
- **Clock** – Shows the time and the date.

### The Start Menu

Click the **Start** button, or press Ctrl+Esc, to open the Start menu.

![The Start menu with the programs, the groups, and two recent chats](docs/images/start-menu.png)

The Start menu has these parts:

- **Programs** – Opens **New chat**, **Explorer**, **Code**, **Terminal**, and **Browser**.
- **Accessories** – Opens **Notepad**, **WordPad**, **Agent Paint**, **Snipping Tool**, and **Sticky Notes**.
- **System Tools** – Opens **Event Viewer**, **Task Manager**, and **Control Centre**.
- **Recent chats** – Opens a chat that you closed.
- **Search apps and chats** – Finds an app or a chat by its name.
- **Places** – Opens **Computer**, **Documents**, **Control Centre**, **Task Manager**, **Recycle Bin**, and **Agent7 Desktops...**.
- **Pause agent** – Pauses the agent. The button changes to **Resume agent**.

### The Action Center

Click the flag in the notification area to open the Action Center. It lists each request for permission from every chat of the desktop, newest first.

![The Action Center with one request to edit src/auth/redirect.ts](docs/images/action-center.png)

Click **Review** next to a request to answer it. Chapter 7 explains how. The **Messages** list shows notes from Agent7, for example that a USB drive is safe to remove. Click **Open Control Centre** to change the permissions.

### The Gadgets

The gadgets are on the right side of the desktop. They have these parts:

- **Context meter** – Shows how much of its context the agent uses in the chat.
- **Session clock** – Shows the time and how long the agent runs.
- **Activity** – Lists the last actions of the agent and their state.

To hide the gadgets, open **Control Centre**, click **Appearance**, and clear **Show gadgets on the desktop**.

## 5 - Getting Started

This chapter takes you from a new installation to your first chat. You create a desktop, plug in a project, and send a message to the agent.

![The New desktop dialog box with the project claude-code-win selected](docs/images/new-desktop.png)

**Note:** The screenshots in this guide show the Scripted Agent. This is a test agent that Agent7 contains. It gives the same answer each time. Your own agent gives other answers.

### Creating a Desktop for a Project

To create a desktop, follow the steps below:

1. In the **Agent7 Desktop Connection** window, click **New...**. The **New desktop** dialog box appears.
2. Type a name, for example `Fix login redirect`.
3. Click **Browse...**, select the folder of your project, and click **Select Folder**. The project appears in the list and is selected.
4. Click **Create**. The desktop appears in the list.
5. Click **Connect**. The desktop window appears.

**Note:** On macOS and Linux, the button in step 3 has the name **Open**.

### Plugging In a Project

If you did not select a project in the **New desktop** dialog box, you can plug it in later. If you did, the project is already a USB drive. Go to the next section.

To plug in a project, follow the steps below:

1. Click **Start -> Computer**. The **Computer** window appears.
2. Click **Plug in a project...** in the toolbar. The folder browser of your computer appears.
3. Select the folder of your project and click **Select Folder**. The **AutoPlay** dialog box appears.
4. Click **Start a chat on this drive**. A Chat window appears.

![The AutoPlay dialog box for the USB drive claude-code-win (E:)](docs/images/usb-autoplay.png)

The **AutoPlay** dialog box has three choices. **Open folder to view files** opens Explorer on the drive. **Start a chat on this drive** opens a Chat window that works on the drive. **Take no action** closes the dialog box.

### Starting a Chat

To start a chat, click **Start -> New chat**. A Chat window appears. The chat works in the home folder `C:\Users\Agent` of the desktop. The agent can still use the files on each USB drive.

To start a chat on a USB drive, use the **AutoPlay** dialog box. The status bar of the Chat window shows the folder of the chat, for example `E:\`.

**Tip:** The first start of Claude Code can take a minute. Agent7 downloads the agent with `npx` the first time.

### Sending a Message

To send a message to the agent, follow the steps below:

1. Click in the box under **Message to**.
2. Type your task, for example "Fix the login redirect bug so that deep links survive sign-in".
3. Press Enter. To start a new line without sending, press Shift+Enter.

The agent replies in the chat. Each action of the agent appears as a row with its state. To see the output of an action, click **Show** on its row. To stop the agent, click **Stop**.

The Chat window has these parts:

- **Model** – Lets you select the model of the agent. The agent supplies the list.
- **Tasks and changes** – Opens a pane with the **Changes** tab and the **Tasks** tab.
- **Message to** – The box where you type your next message.
- **Mode** – Sets how the agent works. The agent supplies the modes.
- **Include open file** – Sends the file that is open in the Code app with your message.
- **Attach...** – Sends a file from your computer with your message.
- **Status bar** – Shows the folder of the chat, how much context the chat uses, and the connection state.

### Undoing a Change

The **Changes** tab lists each file that the agent created, changed, or deleted in the chat. To undo the change to one file, follow the steps below:

1. In the Chat window, click **Tasks and changes**, and then click the **Changes** tab.
2. Select the file.
3. Click **Revert**. A message box appears.
4. Click **Yes**. Agent7 writes the original file back to the drive.

The reverted change goes to the Recycle Bin. To get it back, open **Recycle Bin**, select the item, and click **Restore this item**.

**Caution:** Do not click **Revert** if you want to keep the change. The file goes back to how it was before the agent edited it.

## 6 - What the Agent Can Use

The agent can use only the tools of the apps that are open on the desktop. You find the tools that the agent has now in the **Agent can use** list of the top bar.

### Tools Follow Apps

Each app gives the agent a group of tools. When you close the last window of an app, the agent loses its tools. When you open the app, the agent gets them back. The table below shows the apps and their tools.

| App | The agent can | Tool names |
|---|---|---|
| Explorer | Read and list files, and find files by name | `fs_list`, `fs_find`, `fs/read_text_file` |
| Code | Read and write files, open a file, show a line, and show a change | `code_open`, `code_reveal`, `code_show_diff` |
| Notepad | Open and read text files, and write files | `notepad_open`, `notepad_read`, `fs/write_text_file` |
| Terminal | Run commands and read their output | `terminal_run`, `terminal_read`, `terminal/*` |
| Browser | Open web pages, read them, click, type, go back, and take a picture | `browser_navigate`, `browser_read`, `browser_click`, `browser_type`, `browser_back`, `browser_screenshot` |
| Agent Paint | Draw, read the picture, clear it, and resize it | `paint_draw`, `paint_read`, `paint_clear`, `paint_resize` |
| WordPad | Open, read, and write documents | `wordpad_open`, `wordpad_read`, `wordpad_write` |
| Sticky Notes | List, add, change, and remove notes, and keep a plan note | `notes_list`, `notes_add`, `notes_update`, `notes_remove` |
| Event Viewer | Search the messages of the desktop | `events_query` |
| Snipping Tool | Take a picture of the desktop or of one window | `screen_capture` |
| Recycle Bin | List and restore reverted changes | `recycle_list`, `recycle_restore` |

The Chat, Control Centre, and Task Manager apps give the agent no tools. The agent always can see the desktop, list the drives, open, close, and focus apps, and draw windows in the chat. Chapter 10 explains these windows.

To take a tool away from the agent, close its app. To give it a tool, open its app. If the agent calls a tool of a closed app, Agent7 refuses the call and tells the agent which app to open.

The control **Agent may open apps** in the Control Centre decides if the agent can open apps itself. Chapter 7 explains how to set it.

**Note:** Agent7 controls the tools that the agent asks Agent7 to run. An agent can have its own built-in tools, and Agent7 cannot stop those. Claude Code uses Agent7 for files and commands when Agent7 offers them.

### Pause and Take Control

To stop the agent at once, click **Pause** in the top bar. The agent stops its turn, and Agent7 refuses new tool calls. To let the agent continue, click **Resume**.

To approve each action yourself, click **Take control** in the top bar. Each tool call then waits for your approval in the Action Center. To go back, click **Release**.

## 7 - Allowing or Denying an Action

Some actions need your permission, for example a file edit or a command. When the agent asks, Agent7 dims the desktop and shows the **User Account Control** style dialog box.

![The permission dialog box for the edit of src/auth/redirect.ts with the difference open](docs/images/uac-dialog.png)

The dialog box has these parts:

- **Question** – Tells you what the agent wants to do, for example "Do you want to allow the agent to edit src/auth/redirect.ts?"
- **Reason** – Tells you why Agent7 asks, for example "Writing files is set to Ask in Control Centre."
- **Show details** – Shows the change or the command. Click **Hide details** to close it.
- **Allow** and **Deny** – Answer the request. The agent supplies the names of these buttons.
- **Not now** – Closes the dialog box. The request stays in the Action Center.

### Answering a Request

To answer a request for permission, follow the steps below:

1. Click the flag in the notification area. The Action Center appears.
2. Click **Review** next to the request. The dialog box appears.
3. Click **Show details** and read the change or the command.
4. If you agree, click **Allow**. The agent continues.
5. If you do not agree, click **Deny**. The agent does not do the action.

The Chat window also shows the request. You can answer in the Chat window instead.

**Tip:** Press Esc in the dialog box to close it without an answer.

### Choosing When Agent7 Asks

The Control Centre sets what the agent can do without asking. To change it, follow the steps below:

1. Click **Start -> Control Centre**. The **Control Centre** window appears.
2. Click **Permissions**.
3. In the **Setting** column, select **Allow**, **Ask**, or **Deny** for a permission.
4. Click **Apply**.

![The Permissions page of the Control Centre with the choice for each permission](docs/images/control-centre-permissions.png)

The **Setting** column has three choices:

- **Allow** – The agent does the action at once.
- **Ask** – The agent waits until you answer a request in the Action Center.
- **Deny** – Agent7 refuses the action.

The page lists **Read files**, **Write files**, **Notepad**, **Code**, **Terminal**, **Browser**, and **Agent may open apps**. A new desktop asks before the agent writes files or runs commands. It allows the rest.

**Note:** Agent7 also asks before the agent writes in WordPad or restores an item from the Recycle Bin. You cannot change these two rules on this page.

## 8 - Drives and Files

Each desktop has a C: drive of its own. It can also have USB drives, which are your projects. The agent works only on these drives.

![The Computer window with the drives Local Disk (C:) and claude-code-win (E:)](docs/images/computer.png)

The **Computer** window is the Explorer app. To open it, click **Start -> Computer** or double-click **Computer** on the desktop. It has these parts:

- **Navigation pane** – Shows your favorite folders, the libraries, and the drives.
- **Toolbar** – Has **Plug in a project...**, **Open**, and **Eject**.
- **Hard Disk Drives** – Shows the C: drive and how full it is.
- **Devices with Removable Storage** – Shows each USB drive.
- **Agent status** – Shows, in the file list of a folder, what the agent did to each file, for example that it read or changed it.

### The C: Drive

The C: drive is the own disk of the desktop. It is private to the desktop. The home folder of the agent is `C:\Users\Agent`. It has the folders `Desktop`, `Documents`, and `Downloads`. The `Temp` folder is next to it.

Agent7 stores the C: drive in its own data folder. It deletes the C: drive when you delete the desktop. You cannot remove the C: drive from the desktop.

### USB Drives

A USB drive is a project folder that you plug in. It gets the first free letter from E: to Z:. If you plug in the same project again, it gets its letter again. Agent7 shows the drive with the name of the folder, for example `claude-code-win (E:)`.

A path on a USB drive looks like `E:\src\auth\redirect.ts`. The agent and the apps use these paths. The agent can read and change the real files in the folder.

The **AutoPlay** dialog box appears when you plug in a project on a connected desktop. Chapter 5 describes its choices.

### Safely Remove

To remove a USB drive, follow the steps below:

1. Click the **Safely Remove Hardware** icon in the notification area. A menu appears.
2. Click **Eject** and the name of the drive, for example **Eject claude-code-win (E:)**.
3. If a chat works on the drive, a message box asks if you want to remove it anyway. Click **Yes**. A balloon tells you that the drive is safe to remove.

You can also select the drive in the **Computer** window and click **Eject**. The agent loses the drive at once. Each request for a file or a command on the drive fails, and the Event Viewer shows a warning. The files in your project folder stay as they are.

To get the drive back, plug in the project again. The changes of the agent to its files are still in the **Changes** tab.

## 9 - The Apps

An app is a program that opens as a window on the desktop. Click **Start** to open an app. Some apps give tools to the agent. Chapter 6 lists them.

![Agent Paint with a picture of a house that the agent drew](docs/images/agent-paint.png)

The desktop has these apps:

- **Chat** – Shows one chat with an agent. You write your messages here and follow the work of the agent.
- **Explorer** – Shows the files on the drives. It shows what the agent did to each file.
- **Code** – Shows code with colors, lists the changes of the agent, and lets you revert them.
- **Terminal** – Shows the commands that the agent runs. You can watch it, and you cannot type in it.
- **Notepad** – Lets you read and edit plain text files.
- **WordPad** – Lets you read and write documents in Markdown.
- **Browser** – Shows web pages. You and the agent can use it.
- **Agent Paint** – Lets you draw. The agent can draw in it too.
- **Sticky Notes** – Puts notes on the desktop. You and the agent can read them. A plan note shows the tasks of a chat.
- **Snipping Tool** – Takes a picture of an area of the desktop or of one window.
- **Event Viewer** – Lists the ACP, AG-UI, and MCP messages of the desktop as they happen.
- **Recycle Bin** – Keeps the changes that you reverted, so that you can restore them.
- **Task Manager** – Lists the chats, the agent processes, the terminals, and the context use. **End process** stops an agent process.
- **Control Centre** – Sets the agents, the permissions, and the appearance of the desktop.

### The Event Viewer

The Event Viewer shows each message between Agent7 and the agent. Select a message to read its details. Use it to find out why the agent did something, or why Agent7 refused it.

![The Event Viewer with the ACP, AG-UI, and MCP messages of a chat](docs/images/event-viewer.png)

### Adding an Agent

Agent7 adds Claude Code and the Scripted Agent for you. You can add other agents that speak ACP. To add an agent, follow the steps below:

1. Click **Start -> Control Centre**. The **Control Centre** window appears.
2. Click **Agents**, and then click **Add...**. The **Add Agent** dialog box appears.
3. Type the name of the agent in **Name** and the command that starts it in **Command**.
4. Type each argument on its own line in **Arguments**.
5. If the agent needs environment variables, type each one as `KEY=VALUE` on its own line in **Environment**.
6. Click **OK**.

To use an agent for new desktops, select it and click **Set as Default**.

**Note:** The command must start the agent in ACP mode. For example, the Gemini CLI uses the `--experimental-acp` argument.

## 10 - Windows That the Agent Draws

The agent can draw its own windows in a chat, for example a form, a table of test results, or a code review. Agent7 gives the agent Windows 7 controls for this. The agent uses A2UI, a format for user interfaces that agents send.

![A Chat window with a Deployment form that the agent drew](docs/images/a2ui-form.png)

You use these windows like any other form. Select an item, type text, or click a button. When you click a button, Agent7 sends your answer to the agent. The agent then continues its turn.

The agent can draw these windows at any time. It does not need an open app for this.

## 11 - Who Needs a Mouse?

You can do many tasks in Agent7 with the keyboard. The table below lists the shortcut keys that Agent7 has.

| Press | To |
|---|---|
| Ctrl+Esc | Open or close the Start menu |
| Alt+F4 | Close the window that has the focus |
| Arrow keys | Move between the icons on the desktop |
| Enter | Send the message in a Chat window |
| Shift+Enter | Start a new line in a message |
| Esc | Close a dialog box or a menu, or the review of a request |
| Alt | Show the access keys of the menus |
| Ctrl+S | Save the file in Notepad and in WordPad |
| F5 | Insert the time and the date in Notepad |
| Ctrl+B | Make the selected text bold in WordPad |
| Ctrl+I | Make the selected text italic in WordPad |
| Ctrl+Z | Undo the last stroke in Agent Paint |

In the **Agent7 Desktop Connection** window, press the Up or Down arrow to select a desktop. Press Enter to connect it. Press F2 to rename it. Press Delete to delete it.

**Tip:** Press Alt and then the underlined letter of a menu to open that menu.

## 12 - For Developers

This chapter is for people who change Agent7 itself. Agent7 uses Electron, Svelte 5, and SQLite. The user interface is a set of Windows 7 controls that Agent7 makes itself. Agent7 uses no other user interface library.

### Commands

The commands below run from the Agent7 folder:

| Command | Result |
|---|---|
| `npm run dev` | Starts Agent7 with live reload |
| `npm run build` | Builds the program into the `out` folder |
| `npm start` | Starts the built program |
| `npm test` | Runs the unit tests |
| `npm run test:e2e` | Builds Agent7 and runs the end-to-end tests with Playwright |
| `npm run typecheck` | Finds type errors |
| `npm run storybook` | Opens the control kit in Storybook at port 6006 |
| `npm run agent:scripted` | Runs the Scripted Agent from the terminal |
| `npm run docs:screenshots` | Takes the screenshots of this guide from the built program |
| `npm run dist` | Makes an installer in the `dist` folder |

To run one end-to-end test, type `npm run test:e2e -- e2e/chat.e2e.ts`. To skip the build, set `A7_E2E_SKIP_BUILD=1`.

### How Agent7 Is Built

Agent7 has three parts that talk to each other:

- **Main process** – Starts agents with ACP, stores data in SQLite, and serves the files and terminals of each agent. It owns the desktops, the drives, and the permissions.
- **AG-UI stream** – Sends each turn to the window as AG-UI events over Electron IPC. AG-UI is a protocol for agent user interfaces.
- **Window** – Shows the desktop with the Windows 7 controls, and draws A2UI windows with the official A2UI engine.

The main process gives the agent an MCP server named `agent7`. The server lists only the tools of the open apps and tells the agent when the list changes. Agent7 serves the file and terminal requests of ACP in the same way. It allows only the paths on `C:` and on the USB drives.

### The Scripted Agent

The Scripted Agent is a fake ACP agent for end-to-end tests. A JSON script says which prompt gives which messages, tool calls, and permission requests. Agent7 adds it to the list of agents at each start. You can step through a script with a control socket.

This script answers a prompt that contains "fix". It asks for permission and then writes a file:

```json
{
  "name": "example",
  "agent": { "name": "scripted-agent", "version": "1.0.0" },
  "rules": [
    {
      "id": "fix",
      "match": { "contains": "fix", "ignoreCase": true },
      "steps": [
        { "type": "message", "text": "I will change one file.\n" },
        { "type": "toolCall", "id": "edit-1", "title": "Write NOTES.md", "kind": "edit", "status": "pending" },
        {
          "type": "requestPermission",
          "toolCallId": "edit-1",
          "options": [
            { "optionId": "allow", "name": "Allow", "kind": "allow_once" },
            { "optionId": "deny", "name": "Deny", "kind": "reject_once" }
          ],
          "branches": {
            "allow": [
              { "type": "writeFile", "path": "{{cwd}}/NOTES.md", "content": "Done.\n" },
              { "type": "toolCallUpdate", "id": "edit-1", "status": "completed" }
            ],
            "deny": [{ "type": "toolCallUpdate", "id": "edit-1", "status": "failed" }]
          }
        },
        { "type": "message", "text": "Finished." }
      ]
    }
  ]
}
```

To use a script, edit the **Scripted Agent** in the Control Centre and change its argument to `--script <name or path>`. The folder `agents/scripted-agent/scripts` has samples. The file `agents/scripted-agent/README.md` describes all step types.

### Test Ids

The end-to-end tests find each element only by its `data-testid` attribute. They never use CSS selectors, XPath, or text. The script `scripts/check-e2e-selectors.mjs` fails the build when a test breaks this rule.

Write a test id in lowercase with hyphens, as `<area>-<thing>[-<qualifier>]`. The area is the app or the part of the desktop, for example `taskbar-start`, `uac-allow`, `explorer-drive-e`, or `chat-send`. Give each new control a test id in the same change. Do not rename an existing test id without a reason, because tests depend on it.

### Screenshots for This Guide

The screenshots in `docs/images` come from the real, built program. To take them again, type `npx electron-vite build` and then `npm run docs:screenshots`. The script `scripts/docs-screenshots.mjs` starts Agent7 with a private data folder. It runs the Scripted Agent with the script `scripts/docs-screenshots/chat.json` on a sample project named `claude-code-win`. On Linux without a display, it starts `xvfb-run` for you.

### More to Read

Read these documents before you change Agent7:

- **[Architecture](docs/ARCHITECTURE.md)** – The layers and how a turn flows through them.
- **[Desktop Design](docs/DESKTOP_DESIGN.md)** – The desktop, the apps, the tools, the drives, and the launcher.
- **[Conventions](docs/CONVENTIONS.md)** – The rules for code, for the control kit, and for tests.
- **[Scripted Agent](agents/scripted-agent/README.md)** – The test agent and its script format.
- **[Documentation Style Guide](docs/DOCUMENTATION_STYLE.md)** – The rules for this guide and for all other user documentation.

## 13 - Need Help?

To open the Start menu and find an app, press Ctrl+Esc. To learn what the agent did, open the Event Viewer from **Start -> System Tools**.

If Agent7 does not work as this guide says, open an issue at **[github.com/flying-dice/AgentXP/issues](https://github.com/flying-dice/AgentXP/issues)**. Tell us what you did, what you expected, and what happened.

To learn more about the protocols that Agent7 uses, go to these sites:

- **[agentclientprotocol.com](https://agentclientprotocol.com)** – The Agent Client Protocol.
- **[docs.ag-ui.com](https://docs.ag-ui.com)** – The AG-UI protocol.
- **[a2ui.org](https://a2ui.org)** – The A2UI format.
