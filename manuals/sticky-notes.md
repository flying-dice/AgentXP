# Using Sticky Notes

This manual describes Sticky Notes. Sticky Notes puts notes on the desktop. You and the agent can read and write them.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Toolbar
  - The Note List
  - The Notes on the Desktop
  - The Chat Pane
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Sticky Notes to keep short notes next to your work and to pass facts to the agent. A plan note shows the task list of a chat.

The notes show on the desktop, and the agent can use them, only while the Sticky Notes app is open.

## 2 - Open It

Click **Start -> Accessories -> Sticky Notes**. Only one window exists on a desktop.

## 3 - The Window

### The Toolbar

The toolbar has **New note**, **Color**, and **Plan note**.

- **New note** – Adds an empty note in the selected color.
- **Color** – Selects the color of the next note: Yellow, Blue, Green, Pink, Purple, or White.
- **Plan note** – Lists your chats. Select one to add a blue note that shows the plan of that chat.

### The Note List

The list shows one row for each note. A row has the color, the first line of the note, and the label **AgentXP** if the agent wrote it. Click the **x** at the end of a row to delete the note.

### The Notes on the Desktop

Each note is a small window on the desktop. Drag its title bar to move it. Drag the grip at the lower right corner to change its size. Right-click a note to change its color or to delete it. The title bar has a **+** button for a new note and an **x** button to delete the note.

### The Chat Pane

Each Sticky Notes window has a chat pane at its right edge. The pane starts closed, as a thin strip. Click the strip, click **View -> Chat pane**, or press Ctrl+Shift+C to open it. The agent sees what the window shows. See **[The Chat Pane](embedded-chat.md)**.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Sticky Notes window | The root of the window. | `sticky-notes-app` |
| New note | Adds a note. | `sticky-notes-new` |
| Color | Selects the color of new notes. | none |
| Plan note | Adds a note for the plan of a chat. | none |
| Delete note | Deletes the note of that row. | none |
| Notes layer | Holds the notes on the desktop. | `sticky-notes-layer` |
| Note | One note on the desktop. | `notes-sticky` |
| Plan note on the desktop | One plan note. | `notes-plan` |
| New note (note) | Adds a note. | `notes-sticky-add` |
| Delete note (note) | Deletes the note. | `notes-sticky-delete` |
| Note text | The text of the note. | `notes-sticky-text` |

### Menu Bar and Context Menu

Every window has a menu bar with **Help** as the last menu. **Help -> View Help** opens the Help window for this app, titled with the name of the app. Press F1 to do the same. **Help -> About** opens a small box about the app. Right-click in the window, press the Menu key, or press Shift+F10 to open the context menu. Use the arrow keys to move, Enter to pick, and Esc to close.

| Name | What it does | data-testid |
|---|---|---|
| Menu: help | Opens the Help window for this app. F1. | `sticky-notes-menu-help` |
| Menu: about | Opens the About Sticky Notes box. | `sticky-notes-menu-about` |
| Dialog: about | The About Sticky Notes box. | `sticky-notes-about` |
| Dialog: about ok | Closes the About box. | `sticky-notes-about-ok` |
| Menu: view | Opens the View menu. It has one item, Chat pane. | `menubar-view` |
| Menu: chat pane | Shows or hides the chat pane. Ctrl+Shift+C. | `sticky-notes-menu-chat-pane` |
| Chat pane edge | Opens the chat pane. | `chat-pane-toggle` |
| Menu: new | File menu: adds a note. Ctrl+N. | `sticky-notes-menu-new` |
| Menu: close | Closes the window. Alt+F4. | `sticky-notes-menu-close` |
| Menu: delete | Edit menu: deletes the selected note. | `sticky-notes-menu-delete` |
| Toolbar: color | Opens the colour list for new notes. | `sticky-color` |
| Toolbar: color * | One entry per colour in the Color list. | `sticky-color-*` |
| Toolbar: plan note | Opens the list of chats to make a plan note from. | `sticky-plan` |
| Context menu: color * | Sets the colour of the selected note. | `sticky-notes-ctx-color-*` |
| Context menu: delete | Deletes the selected note. | `sticky-notes-ctx-delete` |
| Context menu: new | Adds a note. | `sticky-notes-ctx-new` |
| Context menu: notes color * | Sticky note on the desktop: sets its colour. | `notes-ctx-color-*` |
| Context menu: notes new | Sticky note on the desktop: adds a note. | `notes-ctx-new` |
| Context menu: notes delete | Sticky note on the desktop: deletes the note. | `notes-ctx-delete` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To add a note, follow the steps below:

1. Click **New note**. A note appears on the desktop.
2. Click in the note and type your text. AgentXP saves it while you type.

To change the color of a note, right-click the note and select a color.

To show the plan of a chat, click **Plan note** and select the chat.

## 6 - Troubleshooting

- **The notes are gone from the desktop.** Open Sticky Notes. The notes show only while the app is open.
- **The agent cannot read my notes.** Open Sticky Notes. Make sure that Notes is **Allow** in **[Control Center](control-centre.md)**.
- **A plan note has no tasks.** The text **No tasks yet** appears until the agent lists a plan.

## 7 - Need Help?

Read **[Chat](chat.md)** to learn the plan of a chat.
