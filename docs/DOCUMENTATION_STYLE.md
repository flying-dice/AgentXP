# Agent7 Documentation Style Guide

This guide tells you how to write user documentation for Agent7. It covers the README, the guides in `docs/`, and the text in Help dialogs.

Agent7 documentation looks and reads like the printed "Introduction to Windows 7" guides and the Microsoft Office "Getting Started" booklets from the same period. The sentences follow the plain English rules of [SimpleEnglish](https://github.com/AminBlg/SimpleEnglish), which come from ASD-STE100 Simplified Technical English.

## Table of Contents

1 - About This Guide
2 - The Shape of a Document
3 - Sentences and Words
4 - Procedures
5 - Describing the Screen
6 - Tips, Notes, and Cautions
7 - Screenshots
8 - Formatting Reference
9 - Checklist Before You Publish

---

## 1 - About This Guide

The reader of Agent7 documentation is a new user. This reader knows how to use a computer. This reader does not know ACP, A2UI, or how Agent7 works inside.

Write each page so that this reader can do the task on the first read. Write to "you". Write about the product as "Agent7".

The tone is that of a friendly help desk in 2009. The help desk is patient and exact, and it does not joke. It does not sell the product. It tells you where to click.

## 2 - The Shape of a Document

Every document has the same parts, in this order:

1. A title in the form "Introduction to Agent7" or "Using the Changes Pane".
2. A Table of Contents. List each numbered chapter. Indent the sections under each chapter.
3. Numbered chapters. Write the number, a space, a hyphen, a space, and the name: `## 3 - The Desktop`.
4. Sections inside a chapter, as `###` headings with no number: `### The Taskbar`.
5. A last chapter named "Need Help?". It tells the reader where to go next.

Use a horizontal rule (`---`) between the Table of Contents and the first chapter.

Each chapter starts with one short paragraph. The paragraph says what the chapter is about and where the reader finds it on the screen. Give the screenshot next, then the details.

Give a chapter name a friendly, plain title. A light touch is part of the brand, for example "Who Needs a Mouse?" for keyboard shortcuts. Use this only in chapter names, never in steps.

## 3 - Sentences and Words

These rules come from SimpleEnglish. They apply to all prose in the documentation.

1. Classify each passage. A procedure tells the reader what to do. A description explains.
2. In a procedure, use the imperative mood. Write one instruction per sentence and 20 words at most.
3. In a description, use simple tenses. Write 25 words at most per sentence. Write one topic per paragraph and six sentences per paragraph at most.
4. Write the condition before the command, with a comma: "If the agent asks for permission, click **Allow**."
5. Use active voice and name the actor: "Agent7 saves the chat." Do not write "The chat is saved."
6. Do not use the present perfect. Write "Agent7 created the file", not "has created".
7. Use only these modal verbs: can, will, must. Do not use should, would, may, might, or could.
8. Do not use contractions. Keep the articles ("the", "a") and keep "that".
9. Do not use semicolons or em-dashes. Write two sentences.
10. Use one word for one meaning in the whole document. Use the table below.
11. Define a term at its first use, in fewer than ten words. Do not define product names such as Electron or SQLite.
12. State the fact, not its importance. Do not write simply, easily, seamlessly, robust, powerful, crucial, or "in order to".
13. Use American spelling: "color", "customize", "dialog box".

### Words to use

| Use | Do not use |
|---|---|
| click | press, hit, tap (for the mouse) |
| press | hit, push (for a key) |
| type | enter, input (for text) |
| select | pick, highlight (for an item in a list) |
| make sure that | check, verify, confirm, validate, ensure |
| configuration | config, settings, options (except as a menu name) |
| folder | directory (in user text) |
| chat | session, conversation, thread (one conversation with an agent in a Chat window) |
| desktop | workspace, virtual machine, VM (a long-lived virtual computer for one or more projects) |
| drive | disk, volume (C: or a plugged-in project on a desktop) |
| USB drive | mounted folder, removable disk (a project that you plug in to a desktop) |
| app | program, application (a program that opens as a window on a desktop) |
| tool | function, capability, skill (what an agent can use on a desktop) |
| project | repository, repo (a folder that you plug in to a desktop) |
| agent | bot, AI, assistant, model |
| window | screen, view (for an Agent7 window) |
| pane | panel, sidebar, section (for a part of a window) |
| dialog box | popup, modal |

## 4 - Procedures

A procedure is a numbered list of steps. Use a procedure for every task that has more than one step.

Put a heading or a lead-in sentence before the list. The lead-in sentence starts with "To" and ends with a colon: "To start a new chat, follow the steps below:"

Follow these rules for each step:

1. Write one action per step.
2. Start with the verb, or with the condition and then the verb.
3. Put the name of each control that the reader clicks in bold, exactly as it appears on the screen.
4. Write a menu path with `->` between the items, all in bold: **Start -> New chat**.
5. If a step has choices, write them as lettered sub-steps (a, b, c).
6. If a step causes something to appear, say what appears in the next sentence of the same step.

Example:

> To plug in a project, follow the steps below:
>
> 1. Click **Plug in a project** in the toolbar of Explorer. The **Browse For Folder** dialog box appears.
> 2. Select the folder that contains your project.
> 3. Click **OK**. The project appears as a USB drive in the **Computer** window.

Write a short task with a single step as one sentence, not a list: "To stop the agent, click **Stop** in the Chat window."

## 5 - Describing the Screen

To describe the parts of a window, use a definition list. Write it as a bulleted list. Each item is the name of the part in bold, a space, an en dash ( – ), a space, and the description.

> - **Chat** – Shows the messages between you and the agent.
> - **Explorer** – Shows the files on each drive of the desktop.
> - **Changes** – Lists each file that the agent changed in this chat.

Follow these rules for a definition list:

1. Use a definition list only for three or more parts.
2. Write the name exactly as it appears on the screen.
3. Start the description with a verb in the present tense: Shows, Lists, Lets you, Stores.
4. Keep each description to one or two sentences.
5. Order the items as they appear on the screen, from left to right and from top to bottom.

Describe a location on the screen in words that the reader can see: "the toolbar at the top of the window", "the status bar at the bottom", "the right side of the window".

## 6 - Tips, Notes, and Cautions

Use a callout for information that is not a step. Start the paragraph with the label in bold and a colon. Use only these three labels:

- **Tip** – A faster way or a useful extra. The reader can skip it.
- **Note** – A fact that the reader must know to understand the next step.
- **Caution** – A risk of data loss or of an action that cannot be undone.

Write a caution with the command or condition first, then the risk:

> **Caution:** Do not click **Revert** if you want to keep the change. Agent7 writes the original file back to the drive.

> **Tip:** Press Ctrl+Esc to open the Start menu.

Use one callout per section at most. Do not put a callout inside a numbered list.

## 7 - Screenshots

Each chapter that describes a window has a screenshot of that window.

1. Take the screenshot of the real application or of the Storybook story. Do not use a mock-up.
2. Show the whole window, including the title bar, on the Windows 7 blue desktop or on a plain background. A dialog box or a menu can have a tight crop.
3. Use sample data that looks real: a project named `claude-code-win`, a chat named "Fix login redirect bug".
4. Save the image as PNG in `docs/images/`. Use a lowercase name with hyphens: `start-menu.png`.
5. Put the image after the first paragraph of the chapter.
6. Write alt text that names the window and its state: "The Agent7 desktop with one chat open".
7. Do not add arrows, circles, or text to an image. Describe the location in the text.

## 8 - Formatting Reference

| Item | How to write it | Example |
|---|---|---|
| Chapter heading | `##`, number, hyphen, name | `## 4 - The Desktop` |
| Section heading | `###`, name, no number | `### The Taskbar` |
| Button, tab, menu, field | Bold, as on screen | **Send** |
| Menu path | Bold, items joined with `->` | **Start -> Control Centre** |
| Key | Plain text, with + between keys | Ctrl+Esc |
| Text that the reader types | Code | `npm install` |
| File, folder, command | Code | `docs/images` |
| Web address | Bold, as a link | **[agentclientprotocol.com](https://agentclientprotocol.com)** |
| Callout | Bold label and colon | **Tip:** |
| Definition | Bold name, en dash, description | **Tasks** – Shows the plan of the agent. |

Use bold only for the items in this table. Do not use bold for emphasis. Do not use emoji or badges.

A code block is correct when the reader must copy the text. Put the language name on the block: `bash`.

## 9 - Checklist Before You Publish

Before you publish a page, do these checks:

1. Make sure that the page has a title, a Table of Contents, numbered chapters, and a "Need Help?" chapter.
2. Count the words in the three longest sentences. If a sentence has more than 20 words in a procedure or 25 in a description, split it.
3. Search for `'`, `has been`, `should`, `may`, `might`, `;`, and `—`. Fix each one.
4. Search for check, verify, confirm, and config. Use the words from the table in chapter 3.
5. Make sure that each bold item is a name on the screen, a menu path, a callout label, or a definition term.
6. Make sure that each screenshot shows the real application and has alt text.
7. Do each procedure on a clean computer. Make sure that each step gives the result that the page says.
