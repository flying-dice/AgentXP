# Using Event Viewer

This manual describes Event Viewer. Event Viewer lists the messages between Agent7 and the agents, as they happen.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Log Tree
  - The Event List
  - The Event Details
  - The Actions Pane
  - The Filter and Find Dialog Boxes
  - The Status Bar
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Event Viewer to see what an agent sent and received. Read it to find out why a chat does not work. The messages use three protocols: ACP, AG-UI, and MCP. Only one window exists on a desktop.

## 2 - Open It

Click **Start -> System Tools -> Event Viewer**.

## 3 - The Window

### The Log Tree

The tree is at the left. **Agent7 Logs** has the logs **ACP**, **AG-UI**, and **MCP**. **Chats** has one entry for each chat. Select an entry to show only its events. Point at **ACP**, **AG-UI**, or **MCP** to read what the log is. ACP is how Agent7 talks to the agent.

### The Event List

The list has the columns **Level**, **Date and Time**, **Source**, **Name**, and **Chat**. The heading shows the number of events. **Autoscroll** keeps the newest event in view.

### The Event Details

Select an event to see its details. The **General** tab has a short text and the lines **Log Name**, **Event**, **Direction**, **Level**, and **Logged**. The **Details** tab shows the message as JSON.

### The Actions Pane

The pane is at the right. It has **Filter Current Log...**, **Clear Log**, **Refresh**, and **Find...**. While a filter is on, **Clear Filter** appears.

### The Filter and Find Dialog Boxes

- **Filter Current Log** – Has the list **Event level** and the box **Text**. Click **OK** to apply them.
- **Find** – Has one box. Click **OK** to select the next event that contains the text.

### The Status Bar

The status bar shows the total number of events.

### The Chat Pane

Each Event Viewer window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Event Viewer window | The root of the window. | `event-viewer-app` |
| Logs | The tree of logs and chats. | `event-viewer-logs` |
| Number of events | Shows the count, with the word filtered while a filter is on. | `event-viewer-count` |
| Autoscroll | Keeps the newest event in view. | `event-viewer-autoscroll` |
| Events | The list of events. | `event-viewer-list` |
| Event | One row of the list. | `event-viewer-row` |
| Details | The pane of the selected event. | `event-viewer-detail` |
| Action | One action of the pane. The name ends with the action. | `event-viewer-action-*` |
| Filter Current Log... | Opens the filter dialog box. | `event-viewer-action-filter-current-log` |
| Clear Log | Deletes all events after a question. | `event-viewer-action-clear-log` |
| Refresh | Reads the events again. | `event-viewer-action-refresh` |
| Find... | Opens the find dialog box. | `event-viewer-action-find` |
| Clear Filter | Removes the filter. | `event-viewer-action-clear-filter` |
| Filter dialog box | Sets level and text. | `event-viewer-filter-dialog` |
| Event level | Selects All levels, Information, Warning, or Error. | `event-viewer-level` |
| Text | Keeps events that contain this text. | `event-viewer-filter-text` |
| Find dialog box | Searches the list. | `event-viewer-find-dialog` |
| Find text | The text to find. Press Enter to search. | `event-viewer-find-text` |
| Total | Shows the number of all events. | `event-viewer-total` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `event-viewer-menu-help` |
| Menu: about | Opens the About Event Viewer box. | `event-viewer-menu-about` |
| Dialog: about | The About Event Viewer box. | `event-viewer-about` |
| Dialog: about ok | Closes the About box. | `event-viewer-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `event-viewer-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: clear | File menu: clears the log. | `event-viewer-menu-clear` |
| Menu: close | Closes the window. Alt+F4. | `event-viewer-menu-close` |
| Menu: copy | Edit menu: copies the selected event. | `event-viewer-menu-copy` |
| Menu: find | Edit menu: finds text in the events. | `event-viewer-menu-find` |
| Menu: refresh | View menu: reads the events again. F5. | `event-viewer-menu-refresh` |
| Menu: filter | View menu: opens the filter box. | `event-viewer-menu-filter` |
| Menu: clear filter | View menu: removes the filter. | `event-viewer-menu-clear-filter` |
| Menu: autoscroll | View menu: follows the newest event. | `event-viewer-menu-autoscroll` |
| Context menu: copy | Copies the selected event. | `event-viewer-ctx-copy` |
| Context menu: find | Finds text in the events. | `event-viewer-ctx-find` |
| Context menu: filter | Opens the filter box. | `event-viewer-ctx-filter` |
| Context menu: refresh | Reads the events again. | `event-viewer-ctx-refresh` |
| Context menu: clear | Clears the log. | `event-viewer-ctx-clear` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Enter (in Find) | Finds the next event. | `event-viewer-find-text` |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To see the events of one chat, select the chat under **Chats** in the tree.

To show only errors, follow the steps below:

1. Click **Filter Current Log...** The filter dialog box appears.
2. Select **Error** in **Event level**.
3. Click **OK**. The heading shows that the list is filtered.

To remove the filter, click **Clear Filter**.

To find a word, click **Find...**, type the word, and click **OK**.

## 6 - Troubleshooting

- **The list is empty.** The window says **No events**. Start a chat.
- **New events do not appear at the bottom.** Select **Autoscroll**.
- **I cleared the log by mistake.** Agent7 cannot restore deleted events.
- **Find says that it cannot find the text.** No event in the current list contains the text.

## 7 - Need Help?

Read **[Chat](chat.md)** and **[Task Manager](agent-manager.md)** to see the state of an agent.
