# Using Terminal

This manual describes Terminal. Terminal shows the commands that the agent runs.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Header
  - The Screen
  - The Status Bar
- 4 - Controls Reference
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

The header shows the name **Agent7 shell - cmd.exe**. If more than one terminal exists, the **Terminal** list appears at the right.

### The Screen

The screen shows the working folder, each command, and its output. It follows the newest terminal unless you select another one.

### The Status Bar

The status bar says that the shell is read-only. It also shows **Running**, **Exit code** with a number, or **No terminals**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Terminal window | The root of the window. | `terminal-app` |
| Terminal | Selects which terminal the screen shows. | `terminal-picker` |
| Screen | Shows the output. The attribute `data-running` tells if a command runs. | `terminal-output` |
| Status | Shows Running, the exit code, or No terminals. | `terminal-status` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To watch a command, open Terminal and ask the agent in **[Chat](chat.md)** to run it. The output appears while the command runs.

To see an older terminal, select it in the **Terminal** list. The list appears when the agents of several chats ran commands.

## 6 - Troubleshooting

- **The screen is empty.** No agent ran a command yet. The status bar says **No terminals**.
- **The agent says that Terminal is closed.** Open this app. The agent can then run commands.
- **The agent asks before it runs a command.** Terminal is set to **Ask** in **[Control Centre](control-centre.md)**. Answer in the **Action Center**.
- **I cannot type.** The window is read-only by design.

## 7 - Need Help?

Read **[Chat](chat.md)** to talk to the agent. Read **[Control Centre](control-centre.md)** to change the permission for commands.
