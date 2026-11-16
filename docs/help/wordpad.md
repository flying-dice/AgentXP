# Using WordPad

This manual describes WordPad. WordPad reads and writes markdown documents.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Button
  - The Toolbar
  - The Page
  - The Status Bar
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use WordPad to read a markdown document with its formatting and to write one. The agent can open, read, and write documents in WordPad.

## 2 - Open It

Click **Start -> Accessories -> WordPad**.

## 3 - The Window

### The Menu Button

The **WordPad** button is at the top left. It opens a menu with **New**, **Open...**, **Save**, **Help on WordPad**, and **Exit**.

### The Toolbar

The toolbar has **Read** and **Edit** to switch the mode. In edit mode, these buttons add markdown marks: **B** (bold), **I** (italic), **H1**, **H2**, **List** (bulleted), **1. List** (numbered), **Code**, and **Link**. The buttons are dimmed in read mode.

### The Page

In read mode, the page shows the formatted document. A click on a link to another `.md` file opens that file. In edit mode, the page is a text box with the markdown source.

### The Status Bar

The status bar shows the file path, a message, **Modified**, the number of words, and the heading that you read now.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| WordPad window | The root of the window. | `wordpad-app` |
| WordPad | Opens the menu. | none |
| New | Starts an empty document. Ctrl+N. | none |
| Open... | Opens a document. Ctrl+O. | none |
| Save | Saves the document. Ctrl+S. | none |
| Help on WordPad | Opens this manual. F1. | `wordpad-menu-help` |
| Exit | Closes the window. | none |
| Read | Shows the formatted document. | `wordpad-mode-read` |
| Edit | Shows the markdown source. | `wordpad-mode-edit` |
| B, I, H1, H2, List, 1. List, Code, Link | Add markdown marks in edit mode. | none |
| Document | The formatted page. | `wordpad-reader` |
| Document source | The text box of the source. | `wordpad-source` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| Ctrl+N | Starts an empty document. | none |
| Ctrl+O | Opens a document. | none |
| Ctrl+S | Saves the document. | none |
| Ctrl+B | Makes the selection bold in edit mode. | none |
| Ctrl+I | Makes the selection italic in edit mode. | none |
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To write a document, follow the steps below:

1. Click **Edit**.
2. Type your text. Use **H1** for a title and **List** for a list.
3. Press Ctrl+S. If the document is new, the **Save as** dialog box appears.
4. Type a file name, for example `Plan.md`, and click **OK**. WordPad saves the file in the Documents folder.

To read the result, click **Read**.

## 6 - Troubleshooting

- **The formatting buttons are dimmed.** Click **Edit** first.
- **The file name is not valid.** Do not use these marks in the name: `\ / : * ? " < > |`.
- **Save is dimmed.** The document has no change.

## 7 - Need Help?

Read **[Notepad](notepad.md)** for plain text files.
