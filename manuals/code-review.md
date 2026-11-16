# Using Code Review

This manual describes the Code Review window. Code Review shows the changes of a project and lets an agent review them.

## Table of Contents

- 1 - What It Is For
- 2 - Open It
- 3 - The Window
  - The Menu Bar
  - The Toolbar
  - The Verdict Bar
  - The Outline View
  - The Expanded View
  - The Comments Pane
  - The Review Chat
  - The Status Bar
- 4 - Controls Reference
- 5 - Common Tasks
- 6 - Troubleshooting
- 7 - Need Help?

---

## 1 - What It Is For

Use Code Review to check a change before you keep it. The window compares the files of a project with a base, for example the last commit. A reviewer agent reads the changes and leaves comments on the lines, like the reviewer of a merge request. You can answer the comments, resolve them, and send them to a chat that fixes the code.

Each Code Review window has its own review chat with an agent. The chat ends when you close the window. The window is titled **Review - ** and the name of the project, for example **Review - review-notes**.

## 2 - Open It

- Click **Start -> Code Review**.
- In **[Code](code.md)**, click **Review changes** or choose **Tools -> Review changes**.
- In **[Chat](chat.md)**, choose **Tools -> Review changes**.

Each of these first opens the **Code Review** box. It asks what to review:

1. Click the project. The project of the file you have open is already selected. The private system disk (C:) is in the list, but it is not a git repository.
2. In **Compare against**, choose what to compare with: **Uncommitted changes (HEAD)**, the last commit, or type a branch, tag or commit.
3. Click **Review**.

The window opens without starting anything. The reviewer only works when you click **Start a new review**, and it can read your files but never change them.

## 3 - The Window

### The Menu Bar

The menu bar has the menus **Review**, **View**, and **Help**.

### The Toolbar

The toolbar has the view buttons, the change buttons, the base box, and the **Comments** button. The **Base** box names what the files are compared with. The default is `HEAD`, the last commit. Type another name, for example `main`, and press Enter.

### The Verdict Bar

The bar below the toolbar shows the verdict of the reviewer: approved, changes requested, or commented. Before the verdict, the bar tells that the reviewer is working or that you can comment yourself.

### The Outline View

The outline lists each changed file with its status, the number of added and removed lines, and the number of open comments. Double-click a file to open it in the expanded view.

### The Expanded View

The expanded view shows the whole file. A bar at the left edge marks the changes. Red blocks are removed lines. Yellow blocks are added lines. Click a block to jump to it. To write a comment on a line, select the line and click **Add comment** in the toolbar, or click the **+** in a small square at its left (it is always there, and it is clearer when you point to it), or click the line number (this selects the line and opens the box), or double-click the line, or right-click the line and choose **Add comment on this line**. Ctrl+Alt+M does the same for the selected line. Comments of the reviewer and your answers appear under the line. Under each comment, the buttons **Resolve**, **Reply**, **Send to chat**, and **Delete** say what they do in words, also in a narrow window.

Press F7 to go to the next change. Press Shift+F7 to go to the previous change. At the last change of a file, F7 goes on to the next file. The **Side by side** button shows the old and new text in two columns.

### The Comments Pane

The **Comments** button shows or hides a list of all comments on the right. Each row names the file and line. Use **Open only** to hide resolved and sent comments. Click **Send comments to chat** to pass them to a chat. The same button is in the toolbar, next to **Comments**.

### The Review Chat

The right edge of the window holds the chat with the reviewer. You can ask a question or tell the reviewer to look at one file. See **[The embedded chat](embedded-chat.md)**.

### The Status Bar

The status bar shows the folder, how many files changed (for example "2 files changed", or "Showing redirect.ts (1 of 2 changed files)" when you opened one of them). In a narrow window the least important parts are left out, so no part is cut, the number of open comments, and what the reviewer does. Every number in the window is written in digits.

## 4 - Controls Reference

| Name | What it does | data-testid |
|---|---|---|
| Code Review box | The box that asks what to review before the window opens. | `new-review-dialog` |
| Project | One row for each drive. Double-click a row to start the review. | `new-review-drive-*` |
| Compare against | The branch, tag or commit to compare with. You can type in it. | `new-review-ref` |
| Review | Opens the Code Review window for the chosen project and ref. | `new-review-start` |
| Cancel | Closes the box without a review. | `new-review-cancel` |
| Show thinking and tool details (menu) | Opens every Thinking line of the Reviewer pane. The same setting as in Chat. | `review-menu-details` |
| Code Review window | The root of the window. The attribute `data-session-id` is the review session. | `code-review-app` |
| Send comments to chat... (menu) | Sends the open comments to a chat. | `review-menu-send-all` |
| Refresh (menu) | Reads the changes again. | `review-menu-refresh` |
| Close (menu) | Closes the window and ends the review. Alt+F4. | `code-review-menu-close` |
| Outline (menu) | Shows the list of files. | `review-menu-outline` |
| Expanded (menu) | Shows the whole file. | `review-menu-expanded` |
| Side by side (menu) | Switches between one column and two columns. | `review-menu-split` |
| Comments (menu) | Shows or hides the comments pane. | `review-menu-comments` |
| Next change (menu) | Goes to the next change. | `review-menu-next` |
| Previous change (menu) | Goes to the previous change. | `review-menu-prev` |
| View Help (menu) | Opens this manual. F1. | `code-review-menu-help` |
| About Code Review (menu) | Opens the About box. | `code-review-menu-about` |
| About box | The About Code Review box. | `code-review-about` |
| About box OK | Closes the About box. | `code-review-about-ok` |
| Outline | Shows the list of files. | `review-view-outline` |
| Expanded | Shows the whole file. | `review-view-expanded` |
| Side by side | Shows the old and new text in two columns. | `review-split-toggle` |
| Previous change | Goes to the previous change (Shift+F7). | `review-prev-change` |
| Next change | Goes to the next change (F7). | `review-next-change` |
| Base | The name that the files are compared with. | `review-base-ref` |
| Refresh | Reads the changes again. | `review-refresh` |
| File | Selects the file to show in the expanded view. | `review-file-select` |
| Comments | Shows or hides the comments pane. The number is the number of all comments, the same as in the banner. | `review-comments-toggle` |
| Verdict | The verdict of the reviewer. The attribute `data-verdict` gives it. | `review-verdict` |
| No verdict yet | Shows until the reviewer gives a verdict. | `review-banner` |
| Error | Shows a problem, for example that git is missing. | `review-error` |
| Outline list | Lists the changed files. | `review-outline` |
| Changed file | One file. The attributes `data-path` and `data-status` give the name and status. | `review-file` |
| Added | The number of added lines of a file. | `review-file-added` |
| Removed | The number of removed lines of a file. | `review-file-removed` |
| Open comments | The number of open comments of a file. | `review-file-comments` |
| No changes | Shows when nothing changed. | `review-outline-empty` |
| File name | The name of the file in the expanded view. | `review-file-head` |
| Diff | The text of the file. | `review-diff` |
| Margin bar | The bar at the left edge. Click it to jump to a place. | `review-margin` |
| Margin block | One red or yellow block. The attribute `data-kind` tells which. | `review-margin-block` |
| Line | One line of the file. | `review-row` |
| Add comment (+) | The blue **+** at the left of a line. It is clearer when you point to it or move the focus to it. It starts a comment on that line. The tooltip says: Add a comment on this line. | `review-gutter-plus` |
| Add comment (+) sign | The small square with the **+** in it, 16 pixels wide. | `review-gutter-plus-glyph` |
| Add comment (toolbar) | Starts a comment on the selected line. It is dimmed until you select a line in the expanded view, and the tooltip says why. | `review-add-comment` |
| Add comment on this line (right-click) | Starts a comment on the line you right-clicked. Ctrl+Alt+M does the same for the selected line. | `review-ctx-add-comment` |
| Line number | Starts a comment on the line. The unified view has one column: the new line number, or the old one on a removed line. | `review-gutter-add` |
| Lost comments | Lists comments whose line is not in the file any more. | `review-orphans` |
| New comment | The form to write a comment. | `review-compose` |
| Comment text | The input for the comment. | `review-compose-input` |
| Severity (new) | Selects Blocker, Major, Minor, or Nit. Minor is selected at first. | `review-compose-severity` |
| Severity help | Says what the selected severity is for: Minor is the usual choice for a suggestion. | `review-compose-severity-help` |
| Comment (button) | Saves the comment. | `review-compose-submit` |
| Cancel (comment) | Closes the form. | `review-compose-cancel` |
| Thread | One comment with its answers. The attributes `data-state` and `data-severity` give its state. | `review-thread` |
| Comment entry | One message of a thread. | `review-comment` |
| Author | Tells if the reviewer or you wrote it. | `review-comment-author` |
| Severity | The severity of the comment. | `review-comment-severity` |
| Text | The text of the comment. | `review-comment-body` |
| State | Open, resolved, or sent. | `review-comment-state` |
| Resolve | Marks the comment as resolved. | `review-comment-resolve` |
| Reply | Opens a form to answer. | `review-comment-reply` |
| Send to chat | Sends this comment to a chat. | `review-comment-send` |
| Delete | Deletes the comment. | `review-comment-delete` |
| Comments pane | Lists all comments. | `review-comments` |
| Count | The number of comments. | `review-comment-count` |
| Open only | Hides resolved and sent comments. | `review-filter-open` |
| Comment row | One comment of the list. Click it to go to its line. | `review-comment-row` |
| No comments | Shows when the list is empty. | `review-comments-empty` |
| Send comments to chat | Opens the **Send to chat** dialog box. | `review-send-all` |
| Send comments to chat (toolbar) | Opens the **Send to chat** dialog box. It is next to **Comments**. Disabled when no comment is open. | `review-send-comments` |
| Verdict text | The verdict in one sentence, and how many comments are blockers, for example "Changes requested. 1 comment is a blocker." The link at the end of the sentence says how many comments there are. | `review-verdict-line` |
| Send to chat dialog | Asks which chat gets the comments. The chat that is open reads "Chat: name (in folder)". The other choice reads "Start a new chat for these comments". | `review-send-dialog` |
| Open chat | The line of an open chat in the dialog box: its name and the folder it works in. | `review-send-chat-name` |
| Chat (option) | An existing chat, named as its window is: by its title, or New chat (project name) while it has no title. The attribute `data-session-id` gives it. | `review-send-chat` |
| New chat (option) | Starts a new chat. | `review-send-new-chat` |
| Send | Sends the comments. | `review-send-confirm` |
| Cancel (send) | Closes the dialog box. | `review-send-cancel` |
| Status: folder | The folder of the review. | `review-status-root` |
| Status: files | How many files changed, and which one is shown. | `review-status-files` |
| Status: comments | The number of open comments. | `review-status-comments` |
| Status: reviewer | What the reviewer does. | `review-status-agent` |
| All changes | Shows every changed file on one page. | `review-all` |
| All changes: file | A file in the one-page view. | `review-all-file` |
| All changes: file heading | The name of a file in the one-page view. | `review-all-head` |
| Start a new review | Asks the reviewer for a review of the changes. Nothing starts until you click it. | `review-ask-agent` |
| Comments banner | The link at the end of the verdict sentence. It says how many comments there are and shows the list. | `review-banner-comments` |
| Compared with | Says what the changes are compared with. | `review-base-hint` |
| Diff columns | The old and new text side by side. | `review-columns` |
| Comment sent | Marks a comment that was sent. | `review-comment-sent` |
| Comments list | The comments of the review. | `review-comments-wrap` |
| View: all changes | Shows every changed file on one page. | `review-menu-all` |
| Review: start a new review (menu) | Asks the reviewer for a review. | `review-menu-ask-agent` |
| Next file | Goes to the next changed file. | `review-next-file` |
| Reviewer | The area of the reviewer. | `review-reviewer-wrap` |
| Status: change | Which change you are on, such as Change 3 of 7. | `review-status-change` |
| Totals | The number of added and removed lines. | `review-totals` |
| View: all changes (button) | Switches to the one-page view. | `review-view-all` |

## 5 - Common Tasks

To review the changes of a project, follow the steps below:

1. Click **Start -> Code Review**. The reviewer starts at once.
2. Click **Expanded**. The window shows the whole file.
3. Press F7 to go through the changes.
4. Read the comments of the reviewer under the lines.

To comment on a line yourself, follow the steps below:

1. Point to the line in the expanded view and click the blue **+**. A form appears.
2. Type your comment. Under **Severity**, keep Minor for a suggestion. Choose Blocker only when the change must not be accepted as it is.
3. Click **Comment**.

To send the comments to a chat that fixes the code, follow the steps below:

1. Click **Send comments to chat** in the toolbar. The **Send to chat** dialog box appears.
2. Check the number of comments that the dialog box names.
3. Select a chat, or select **New chat**.
4. Click **Send**. The chat gets the comments. The comments change to **sent**.

To compare with another base, type its name in **Base** and press Enter.

To ask for a review from the chat you are working in, follow the steps below:

1. In the chat of the **Code** window (or in any chat), type a request such as "review my changes".
2. The agent opens a Code Review window for the project, or uses the one that is open. You do not have to open it yourself.
3. Watch the comments appear in the Code Review window, on the lines they are about. The agent does not list them in the chat as plain text.
4. When the review ends, the agent tells you the verdict and a short list of the comments in the same chat. Continue there, for example ask it to fix them.

## 6 - Troubleshooting

- **The outline says No changes.** The files equal the base. Change the base or edit a file.
- **The window shows an error about git.** The folder is not a git project, or git is missing. Open another project.
- **The reviewer gives no comments.** Type a request in the chat on the right.
- **The agent in a chat says it cannot add review comments.** Ask it to open Code Review for the project first. Then ask again.
- **A comment is under Lost comments.** The line of the comment changed after the review. Read the text and delete it.

## 7 - Need Help?

Read **[Chat](chat.md)** to learn how the chat that fixes the code works. Read **[Code](code.md)** to see the changes of an agent while it works.
