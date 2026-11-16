# Using Help and Support

This manual describes Help and Support. Help and Support shows the manuals of Agent7.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Toolbar
  - The Topic List
  - The Article
  - The Status Bar
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Help and Support to learn an app. Each app has a manual. A manual lists every button, input, and menu item. Only one Help and Support window exists on a desktop.

## 2 - Open It

- Press F1. Help opens on the topic of the window that has focus. If no window has focus, it opens **[The Desktop](desktop.md)**.
- Click **Start -> Help and Support**.
- Click the **Help** menu of an app that has a menu, for example Notepad, Chat, Code, WordPad, or Agent Paint.

## 3 - The Window

### The Toolbar

The toolbar is at the top. It has **Back**, **Forward**, **Home**, and the **Search Help** box.

### The Topic List

The list is at the left. It shows each topic. When you type in **Search Help**, the title changes to **Search results** and the list keeps only the topics that contain all your words.

### The Article

The article is at the right. A link to another manual opens that manual in the same window. Other links show their address as text.

### The Status Bar

The status bar shows the title of the topic. During a search, it shows how many topics match.

### The Chat Pane

Each Help and Support window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Help and Support window | The root of the window. The attribute `data-topic` holds the topic. | `help-app` |
| Back | Goes to the last topic. | `help-back` |
| Forward | Goes to the next topic. | `help-forward` |
| Home | Opens the home page. | `help-home` |
| Search Help | Filters the topic list while you type. | `help-search` |
| Help topics | The list of topics. | `help-topics` |
| Topic | One topic of the list. | `help-topic` |
| No topics match | Shows when the search finds nothing. | `help-no-results` |
| Article | Shows the manual. | `help-article` |
| Link | A link to another topic. | `help-link` |
| Missing topic | Shows when the topic does not exist. | `help-missing` |
| Status | Shows the title or the number of matches. | `help-status` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `help-menu-help` |
| Menu: about | Opens the About Help and Support box. | `help-menu-about` |
| Dialog: about | The About Help and Support box. | `help-about` |
| Dialog: about ok | Closes the About box. | `help-about-ok` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `help-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: close | Closes the window. Alt+F4. | `help-menu-close` |
| Menu: copy | Edit menu: copies the selected text. | `help-menu-copy` |
| Menu: select all | Edit menu: selects all text. | `help-menu-select-all` |
| Menu: back | View menu: goes back. | `help-menu-back` |
| Menu: forward | View menu: goes forward. | `help-menu-forward` |
| Menu: home | View menu: shows the home topic. | `help-menu-home` |
| Context menu: copy | Copies the selected text. | `help-ctx-copy` |
| Context menu: select all | Selects all text. | `help-ctx-select-all` |
| Context menu: back | Goes back. | `help-ctx-back` |
| Context menu: forward | Goes forward. | `help-ctx-forward` |
| Context menu: home | Shows the home topic. | `help-ctx-home` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens the manual of the focused window. | none |

## 5 - Common Tasks

To find a topic, follow the steps below:

1. Click the **Search Help** box.
2. Type a word, for example `save`. The list keeps the matching topics.
3. Click a topic.

To clear a search, delete the text in **Search Help**.

To go back to a topic that you read, click **Back**.

## 6 - Troubleshooting

- **No topics match your search.** Type fewer words, or a different word.
- **Back is dimmed.** You have not opened another topic yet.
- **A link does not open.** Only links to other manuals open. A web address shows as text.

## 7 - Need Help?

Click **Home** to see all topics.
