# Using Sticky Notes

This manual describes Sticky Notes. Sticky Notes puts notes on the desktop. You and the agent can read and write them.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Toolbar
  - The Note List
  - The Notes on the Desktop
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

The list shows one row for each note. A row has the color, the first line of the note, and the label **Agent7** if the agent wrote it. Click the **x** at the end of a row to delete the note.

### The Notes on the Desktop

Each note is a small window on the desktop. Drag its title bar to move it. Drag the grip at the lower right corner to change its size. Right-click a note to change its color or to delete it. The title bar has a **+** button for a new note and an **x** button to delete the note.

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

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To add a note, follow the steps below:

1. Click **New note**. A note appears on the desktop.
2. Click in the note and type your text. Agent7 saves it while you type.

To change the color of a note, right-click the note and select a color.

To show the plan of a chat, click **Plan note** and select the chat.

## 6 - Troubleshooting

- **The notes are gone from the desktop.** Open Sticky Notes. The notes show only while the app is open.
- **The agent cannot read my notes.** Open Sticky Notes. Make sure that Notes is **Allow** in **[Control Centre](control-centre.md)**.
- **A plan note has no tasks.** The text **No tasks yet** appears until the agent lists a plan.

## 7 - Need Help?

Read **[Chat](chat.md)** to learn the plan of a chat.
