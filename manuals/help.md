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

- Press F1. Help opens on the manual of the window that has focus. If a button, box, or other control has the focus and the manual lists it, Help opens at the row of that control in the **Controls Reference** table, so you read its description at once. Otherwise Help opens at the top of the manual, so the title is the first line. The Help window always opens whole on the desktop, also on a small screen. Opening Help closes the welcome balloon. If no window has focus, it opens **[Using the Desktop](desktop.md)**. The window opens 760 by 520 pixels in the middle of the desktop. On a small desktop it is 40 pixels smaller than the desktop, but never narrower than 640 pixels. The window takes the keyboard focus and opens in front of any dialog box. Press Esc to close it.
- Click **Start -> Help and Support**.
- Click the **Help** menu of an app that has a menu, for example Notepad, Chat, Code, WordPad, or Agent Paint.

## 3 - The Window

### The Toolbar

The toolbar is at the top. It has **Back**, **Forward**, **Home**, and the **Search Help** box.

### The Topic List

The list is at the left. It shows each topic. When you type in **Search Help**, the title changes to **Search results** and the list shows the sections that contain all your words. Each result shows the title of the section, the manual it belongs to, and a line of text. A section that has your words in its title comes before a section that has them only in its text. Among the others, the manual of the window you came from is first. Click a result, or select it and press Enter, to scroll to that section. The matched line is highlighted for 2 seconds.

### The Article

The article is at the right. A link to another manual opens that manual in the same window. A link to a section opens the manual at that section. Page Down and Page Up scroll the article, also while the search box has the focus. Esc clears the search; when the search is empty, Esc closes the window. Other links show their address as text.

### The Status Bar

The status bar shows the title of the topic. During a search, it shows how many sections match.

### The Chat Pane

Each Help and Support window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Help and Support window | The root of the window. The attribute `data-topic` holds the topic. | `help-app` |
| Back | Goes to the last topic. | `help-back` |
| Forward | Goes to the next topic. | `help-forward` |
| Home | Opens the home page. | `help-home` |
| Search Help | Lists the matching sections while you type. | `help-search` |
| Help topics | The list of topics. | `help-topics` |
| Topic | One topic of the list. It shows while the search box is empty. | `help-topic` |
| Search result | One section that matches the search: its title, its manual and a line of text. Click it to open that section. | `help-result` |
| Search result manual | The manual that the result belongs to. | `help-result-topic` |
| No sections match | Shows when the search finds nothing. | `help-no-results` |
| Article | Shows the manual. | `help-article` |
| Link | A link to another topic. | `help-link` |
| Contents link | A line of the Table of Contents. Click it to go to that section. | `help-contents-link` |
| Section heading | The heading Help scrolled to, or the table row of the control that you pressed F1 on. It has 24 pixels of space above it, so no text above it is cut. | `help-target` |
| Contents chapter (open) | A chapter of the Table of Contents that lists its sections. Only the current chapter does. | `help-toc-open` |
| Contents chapter (closed) | A chapter of the Table of Contents shown as one line. | `help-toc-collapsed` |
| Missing topic | Shows when the topic does not exist. | `help-missing` |
| Status | Shows the title of the open topic, or the number of matching sections. | `help-status` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help (F1)** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

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
| Contents | Shows the list of topics. | `help-contents` |
| Search result text | A short piece of text around the match. | `help-snippet` |
| Status: section | The section that Help scrolled to. It is empty until you jump to a section. | `help-status-topic` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens the manual of the focused window, at the row of the focused control when the manual lists it, else at the top. With no window focused, it opens **Using the Desktop**. | none |

## 5 - Common Tasks

To find a topic, follow the steps below:

1. Click the **Search Help** box.
2. Type a word, for example `undo`. The list shows the matching sections, the best match first.
3. Click a section. The manual opens at that section.

To clear a search, delete the text in **Search Help**.

To go back to a topic that you read, click **Back**.

## 6 - Troubleshooting

- **No sections match your search.** Type fewer words, or a different word.
- **Back is dimmed.** You have not opened another topic yet.
- **A link does not open.** Only links to other manuals open. A web address shows as text.

## 7 - Need Help?

Click **Home** to see all topics.
