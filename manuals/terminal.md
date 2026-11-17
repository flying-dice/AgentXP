# Using Terminal

This manual describes Terminal. Terminal shows the commands that the agent runs.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Header
  - The Screen
  - The Status Bar
  - The Chat Pane
- 4 - Controls Reference
  - What the Agent Can Do
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Terminal to watch the shell of the agent. The window is read-only. The agent is the only user of the shell, so you can watch but you cannot type.

If you close Terminal, the agent cannot run commands.

## 2 - Open It

Click **Start -> Terminal**, or double-click **Terminal** on the desktop.

## 3 - The Window

### The Header

The header shows the name **AgentXP shell - cmd.exe**. If more than one terminal exists, the **Terminal** list appears at the right.

### The Screen

The screen shows the working folder, each command, and its output. It follows the newest terminal unless you select another one.

### The Status Bar

The status bar says that the shell is read-only. The cursor on the screen is a hollow block that does not blink, a sign that you cannot type. When the window opens, a note shows at the top of the window and stays until you first click on the screen. After that, a click or a key press shows the note for 4 seconds. A key press also lights the note up for 1 second, and the status bar says **Read-only: nothing was typed**. It says that the agent runs the commands here, that you can watch but not type, and that you can ask the agent in Chat to run a command. The status bar also shows **Running**, **Exit code** with a number, or **No terminals**.

### The Chat Pane

Each Terminal window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Terminal window | The root of the window. | `terminal-app` |
| Terminal | Selects which terminal the screen shows. | `terminal-picker` |
| Screen | Shows the output. The attribute `data-running` tells if a command runs. | `terminal-output` |
| Status | Shows Running, the exit code, or No terminals. | `terminal-status` |
| Read-only note | Shows at the top of the window when the window opens and stays until your first click on the screen. After that it shows for 4 seconds when you click or press a key. A key press also lights it up for 1 second. | `terminal-readonly-notice` |
| Read-only status | The left part of the status bar. It says **Read-only: nothing was typed** for 1 second after a key press, and says that you can watch but not type the rest of the time. | `terminal-readonly-status` |
| Locked cursor | The hollow block cursor of the screen. | `console-cursor-locked` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `terminal-menu-help` |
| Menu: about | Opens the About Terminal box. | `terminal-menu-about` |
| Dialog: about | The About Terminal box. | `terminal-about` |
| Dialog: about ok | Closes the About box. | `terminal-about-ok` |
| Menu: view | Opens the View menu. It has one item, Chat pane. | `menubar-view` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `terminal-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: close | Closes the window. Alt+F4. | `terminal-menu-close` |
| Menu: copy | Edit menu: copies the selected output. | `terminal-menu-copy` |
| Menu: select all | Edit menu: selects all output. | `terminal-menu-select-all` |
| Menu: clear | Edit menu: hides the output shown so far. | `terminal-menu-clear` |
| Context menu: copy | Copies the selected output. | `terminal-ctx-copy` |
| Context menu: select all | Selects all output. | `terminal-ctx-select-all` |
| Context menu: clear | Hides the output shown so far. The agent keeps the output. | `terminal-ctx-clear` |
| Context menu: ask the agent about this | Opens the chat pane with a draft about the selected output, or the last lines. | `terminal-ctx-ask` |
| Context menu: explain this | Opens the chat pane and asks the agent to explain the selected output. Needs a selection. | `terminal-ctx-explain` |
| Context menu: start a chat here | Starts a full chat with the selected output, or the last lines, in a Chat window. | `terminal-ctx-open-chat` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens this manual. | none |

### What the Agent Can Do

The agent uses the tools below when Terminal is open. The permission **Run commands** in **Control Center** controls them.

| Tool | What it does |
|---|---|
| `terminal_run` | Runs a command and waits for it. The output appears in Terminal. |
| `terminal_read` | Reads the last lines that `terminal_run` printed. |

## 5 - Common Tasks

To watch a command, open Terminal and ask the agent in **[Chat](chat.md)** to run it. The output appears while the command runs.

To see an older terminal, select it in the **Terminal** list. The list appears when the agents of several chats ran commands.

## 6 - Troubleshooting

- **The screen is empty.** No agent ran a command yet. The status bar says **No terminals**.
- **The agent says that Terminal is closed.** Open this app. The agent can then run commands.
- **The agent asks before it runs a command.** Terminal is set to **Ask** in **[Control Center](control-centre.md)**. Answer in the **Action Center**.
- **I cannot type.** The window is read-only by design. The agent runs the commands. Ask the agent in **[Chat](chat.md)** to run the command for you, and watch the output here.

## 7 - Need Help?

Read **[Chat](chat.md)** to talk to the agent. Read **[Control Center](control-centre.md)** to change the permission for commands.
