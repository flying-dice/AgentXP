# Using an Agent Window

This manual describes an agent window. An agent window shows a form that the agent drew with A2UI.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

An agent can draw a form, a table, or a set of buttons instead of plain text. A2UI is the name of this feature. You can read the form and click its buttons. Your clicks go back to the agent.

## 2 - Open It

A form has three places: in the transcript of the chat, in the sidebar of the chat, or in its own window. To open a form in its own window, follow the steps below:

1. Find the form row in the **[Chat](chat.md)** window.
2. Click **Move to**, then click **Window**. If the form is closed, click **Open**.

## 3 - The Window

The window has a title bar with the title of the form. The client area shows the form. The form has no controls of its own. The agent decides what it shows, for example buttons, text boxes, and check boxes.

If you delete the form, the window says that the surface was deleted.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Agent window | The root of the window. The attribute `data-surface-id` holds the id of the form. | `surface-app` |
| Form | The drawn form. | `a2ui-surface` |
| Button | A button that the agent drew. | `a2ui-button` |
| Text box | A text box that the agent drew. | `a2ui-textbox` |
| Option | An option that the agent drew. | `a2ui-checkbox` |

### Keys

| Name | What it does | data-testid |
|---|---|---|
| F1 | Opens this manual. | none |

## 5 - Common Tasks

To move a form, click **Move to** in the form row of the chat. Select **Inline**, **Sidebar**, or **Window**.

To close a form window, click **Close** in the title bar, or click **Close** in the form row of the chat.

To delete a form, click **Delete** in the form row of the chat and click **Yes**.

## 6 - Troubleshooting

- **The window says Opening the surface.** Wait for the chat to load.
- **The window says that the surface was deleted.** The form is gone. Ask the agent to draw it again.
- **My click has no effect.** The agent must be connected. Open **[Chat](chat.md)** and make sure that it works.

## 7 - Need Help?

Read **[Chat](chat.md)** for the form rows.
