# Agent7 Panel Task Scenarios

Status: discovery. These tasks are given to the user panel (Opus expert, Sonnet intermediate, Haiku novice) as described in `process.md`, section "User panel". Each task comes from a journey in `journeys.md`.

## Rules for writing and running a task

- The **scenario** is what the panelist reads. It states a situation and a goal in the user's own words. It never lists steps, and it uses only words that the screen uses or that a Windows user knows. It must not say "USB drive", "tool group", "Action Center" or "UAC" unless the task is about finding that word on the screen.
- **Start state** is set by the harness before the session (test setup through `window.agent7`, as in `e2e/fixtures/setup.ts`). The panelist does not see it being set up. "Scripted agent" means the built-in Scripted Agent with the named script from `agents/scripted-agent/scripts/` (check that a script exists for each need; add one if not).
- **Success check** is a state that a script can read after the session (database rows, the files on the project folder, the desktop state, `data-*` attributes through test-only reads). It does not depend on what the panelist says.
- **Min** is the minimum number of driver actions (click, type, key press as one action each) for the shortest path. The **budget** is 3 x Min for the intermediate and expert panelists and 4 x Min for the novice. A task also has a time budget of 10 minutes unless stated.
- **Fail** if the success check fails, the budget is passed, the panelist gives up, or the harness had to say anything beyond "Continue when you are ready".
- Panelists can use Help and Support, but F1 and the manuals must work offline (they are part of what we test).
- Tasks marked **[planned]** need a feature that is not built yet. Run them only after it is merged.
- Sample size per round: one fresh panelist per level per task. A failing task gets a fix and a fresh panelist.

Folder fixture "project": a small Git project `login-app` with `src/auth/redirect.ts` (a bug), `src/auth/login.ts`, `tests/redirect.test.ts`, `README.md`, `.gitignore`.

## Task list

### J01 First launch and empty launcher

**T01.1 - Find the start**
- Scenario: "Someone installed this program for you and left it open. You have never used it. Find out what you can do first and start getting set up."
- Start state: fresh user-data folder, launcher just opened.
- Success check: the New desktop dialog is open (or a desktop was created) within budget.
- Min 1 (click **New...**). Budget 3 / 4.
- Notes: observe if the empty text is read, and what the panelist thinks a "desktop" is (post-task question).

### J02 Create a desktop

**T02.1 - A desktop for a project**
- Scenario: "You have a project folder called login-app. You want the assistant to work on it. Set things up so that you could start asking it for help. Call your workspace 'Fix login redirect'."
- Start state: launcher with no desktops; `login-app` exists on disk; the folder picker is pre-answered by the harness with `login-app` (the panelist clicks Browse and the harness selects the folder).
- Success check: one desktop titled "Fix login redirect" exists with `login-app` plugged in, and its window is open.
- Min 6 (New..., type name, Browse..., confirm folder, Create, Connect). Budget 18 / 24.

**T02.2 - Name already used**
- Scenario: "You already have a workspace called 'Fix login redirect'. Make another one for the folder docs-site with the same name."
- Start state: one desktop with that name.
- Success check: the panelist ends with a second desktop with a different, valid name, and states why the first name was refused (post-task question).
- Min 7. Budget 21 / 28.

### J03 Plug in a project

**T03.1 - Add another folder to a running workspace**
- Scenario: "Your workspace is open. You also need the assistant to see the folder docs-site. Make that folder available in this workspace, and open it so that you can see the files."
- Start state: connected desktop with `login-app` plugged in; folder picker answered with `docs-site`.
- Success check: `docs-site` is plugged in on the desktop, and an Explorer window shows its root.
- Min 5. Budget 15 / 20.

### J04 Start a chat

**T04.1 - Talk to the assistant about one folder**
- Scenario: "You want to ask the assistant a question about the login-app folder only. Open a conversation that starts in that folder."
- Start state: connected desktop with `login-app` plugged in; scripted agent (demo).
- Success check: a chat window is open whose working folder is the login-app drive; the agent is connected (status ready).
- Min 3 (Start, New chat on a drive, select, Start chat: 4). Budget 12 / 16.

**T04.2 - Come back to a closed conversation**
- Scenario: "You closed the conversation window by accident. Get it back with all its messages."
- Start state: one chat with 3 messages, its window closed.
- Success check: a chat window for that same chat is open (same session id) and shows the 3 messages.
- Min 3. Budget 9 / 12.

### J05 Send a prompt and follow progress

**T05.1 - Ask and watch**
- Scenario: "Ask the assistant: 'Fix the login redirect bug so that deep links survive sign-in'. Then tell me, in your own words, what it did and whether it is finished."
- Start state: chat open on login-app; scripted agent `demo`, permissions Allow for all (so no dialogs).
- Success check: the prompt appears in the chat, the turn ended (`data-running` false), and the panelist's answer names the file it read and the file it changed (checked by a researcher against the transcript).
- Min 3 (click box, type, Enter). Budget 9 / 12.

**T05.2 - Stop the assistant**
- Scenario: "The assistant started something you do not want. Make it stop right now."
- Start state: scripted agent `stepping` (a long turn, paused mid-way) with the turn running.
- Success check: the turn ended with stop reason cancelled; the running tool card shows Cancelled.
- Min 1. Budget 3 / 4.

### J06 Approve or deny a request

**T06.1 - Allow after reading**
- Scenario: "You asked the assistant to fix the redirect bug. A box appears asking for something. Read it and let the assistant make the change only if it changes the file src/auth/redirect.ts."
- Start state: `demo` script; Write files = Ask.
- Success check: the request was answered Allow, the file on disk contains the fix, and the panelist opened the details first (the session log shows it) or said what lines changed.
- Min 2 (Show details, Allow). Budget 6 / 8.

**T06.2 - Deny**
- Scenario: "The assistant asks to run a command. You do not know it. Say no, and make sure that the assistant does not run it."
- Start state: `demo` script (deny branch), Terminal policy = Ask.
- Success check: request answered Deny; no terminal output; the turn ended normally; no file written.
- Min 1. Budget 3 / 4.

**T06.3 - Make it ask first** (also J16)
- Scenario: "You want the assistant to fix a failing test in your project, but it must never run commands without asking you first. Set things up that way, then ask it to run the tests."
- Start state: Terminal policy = Allow; `demo` script with a terminal step.
- Success check: Terminal policy = Ask (or Deny) in the saved policy, and a request appeared for the command (the permission broker log shows it).
- Min 6 (Start, Control Centre, Permissions, change Terminal, Apply, then chat). Budget 18 / 24.

### J07 Approve from the Action Center

**T07.1 - Answer what is waiting**
- Scenario: "You were reading something else. The assistant says it is waiting for you somewhere. Find out what it wants and answer it."
- Start state: two chats, each with one pending write request, the dialog dismissed with Not now.
- Success check: both requests answered by the panelist (any answer), no request pending.
- Min 5. Budget 15 / 20.

### J08 Review and revert changes

**T08.1 - Undo one file**
- Scenario: "The assistant changed two files. You liked the change in login.ts but not the one in redirect.ts. Undo only the change to redirect.ts."
- Start state: chat with two agent file changes (`login.ts`, `redirect.ts`).
- Success check: `redirect.ts` on disk equals the original, `login.ts` keeps the agent's edit, one recycled change for `redirect.ts` exists.
- Min 5 (Tasks and changes, Changes tab, select, Revert, Yes). Budget 15 / 20.

**T08.2 - Review everything [planned]**
- Scenario: "Before you accept the work, look at every line that the assistant changed and tell me how many files changed and which one changed most."
- Start state: chat with five agent changes in a Git project; new Code app.
- Success check: the panelist's answer matches the data (researcher check); the panelist used Code or the Changes pane (session log).
- Min 6. Budget 18 / 24.

### J09 Restore from the Recycle Bin

**T09.1 - Get it back**
- Scenario: "You undid a change by mistake and now you want it back."
- Start state: one recycled change for `redirect.ts`.
- Success check: `redirect.ts` on disk equals the agent's version; the Recycle Bin is empty.
- Min 4 (open bin, select, Restore, close). Budget 12 / 16.

### J10 Tools follow apps

**T10.1 - Take away the command line**
- Scenario: "You want to be sure that, right now, the assistant cannot run commands. Make that true, and show me how you can tell."
- Start state: Terminal window open on the desktop.
- Success check: no Terminal window open; the top bar has no Terminal chip; the panelist names the chip list as the proof (answer check).
- Min 1 (close Terminal). Budget 4 / 5.

**T10.2 - What can it touch?**
- Scenario: "Without asking the assistant, tell me which of these it can do now: read files, run commands, browse the web."
- Start state: Explorer and Browser open, Terminal closed.
- Success check: the answer is exactly: read files yes, run commands no, browse yes (researcher check).
- Min 1 (look). Budget 3 / 4.

### J11 Pause and take control

**T11.1 - Hold on**
- Scenario: "The assistant is working and you want it to stop everything at once, and not do anything else until you say so."
- Start state: `stepping` script, turn running.
- Success check: desktop `paused` is true; the turn ended cancelled; no new tool call ran after.
- Min 1. Budget 3 / 4.

**T11.2 - Approve every step**
- Scenario: "For the next job you want to approve every single thing the assistant does, even reading."
- Start state: all permissions Allow; chat open.
- Success check: `userInControl` is true and the next read call raised a request.
- Min 1 + prompt (3). Budget 9 / 12.

**T11.3 - Carry on after a pause**
- Scenario: "You paused the assistant a minute ago. Now let it finish the job."
- Start state: paused desktop, cancelled turn.
- Success check: `paused` false and a new turn finished (the panelist had to send a new message; the checker does not require it to resume the old turn).
- Min 3. Budget 9 / 12.

### J12 Eject a drive

**T12.1 - Take the project away**
- Scenario: "You are done with the folder login-app and you do not want the assistant to reach it any more. Remove it from this workspace in a safe way."
- Start state: two drives plugged in (login-app, docs-site).
- Success check: only `docs-site` remains; the `login-app` folder on disk is untouched.
- Min 2 (tray icon, eject item). Budget 6 / 8.

**T12.2 - It went away mid-job**
- Scenario: "The assistant was working on login-app, and you removed the folder while it worked. Tell me what the assistant says happened, and bring the folder back."
- Start state: `demo` script; eject while the turn runs (harness does the eject).
- Success check: the folder is plugged in again; the panelist's answer names the missing drive as the cause.
- Min 6. Budget 18 / 24.

### J13 Disconnect and reconnect

**T13.1 - Leave it running**
- Scenario: "You need to leave your desk for a while, and the assistant should keep working. Close this window without stopping it. Later, come back and see where it is."
- Start state: `stepping` script (auto mode, long), turn running.
- Success check: window closed and the agent kept running (the run state is working in the launcher); then reconnected with the chat showing new progress.
- Min 3. Budget 9 / 12.

**T13.2 - You were called back**
- Scenario: "A message pops up saying the assistant needs you. Go to it and give it the go-ahead."
- Start state: disconnected desktop with a pending request; the harness shows the OS notification state (cannot be clicked by the panelist, so the panelist starts from the launcher where the row says Needs your approval).
- Success check: request answered Allow, desktop connected.
- Min 4. Budget 12 / 16.

### J14 Manage several desktops

**T14.1 - Which one needs me?**
- Scenario: "You have four workspaces running. Find the one that is waiting for you and open it."
- Start state: four desktops, one with a pending request, one with an error, two idle.
- Success check: the desktop with the pending request is connected; the panelist names the error desktop (answer check).
- Min 2. Budget 6 / 8.

**T14.2 - Rename**
- Scenario: "Change the name of the workspace 'Try new ideas' to 'Experiments'."
- Start state: three desktops.
- Success check: the title is changed in the list and in the database.
- Min 3. Budget 9 / 12.

### J15 Delete a desktop

**T15.1 - Throw one away safely**
- Scenario: "You do not need the workspace 'Try new ideas' any more. Remove it. Tell me what is lost and what stays."
- Start state: three desktops; 'Try new ideas' has a project plugged in and one chat.
- Success check: that desktop is deleted; the project folder remains; the answer says chats and C: files are lost and the project folder stays.
- Min 3. Budget 9 / 12.

### J16 Choose permissions

**T16.1 - Stop it from editing files by itself**
- Scenario: "You want to be asked every time the assistant wants to change a file, but it may read files freely."
- Start state: defaults changed by the harness (Write files = Allow).
- Success check: Write files = Ask, Read files = Allow, saved.
- Min 5. Budget 15 / 20.

**T16.2 - Know what a setting covers**
- Scenario: "Find out whether turning off 'Code' would also stop the assistant from writing files with Notepad."
- Start state: Control Centre closed.
- Success check: the answer matches the documented behavior (researcher check; the answer must come from the screen or the manual).
- Min 4. Budget 12 / 16.

### J17 Add and choose agents

**T17.1 - Use a different assistant**
- Scenario: "A colleague gave you an assistant program. Its start command is `node` with the argument `my-agent.js`. Add it, and use it for new workspaces from now on."
- Start state: Control Centre closed; the file exists.
- Success check: a new agent row with that command and args exists and is the default.
- Min 8. Budget 24 / 32.

**T17.2 - It does not start**
- Scenario: "You started a chat and the assistant does not answer. Find out why and tell me what to do."
- Start state: the default agent has a bad command (`not-a-real-command`).
- Success check: the answer names the wrong command or "not found" and points to the Agents page; the panelist did not restart the app.
- Min 3. Budget 9 / 12.

### J18 A2UI surfaces

**T18.1 - Fill in the assistant's form**
- Scenario: "The assistant shows you a form. Fill it in with the name 'Nia' and press the main button, then tell me what the assistant answered."
- Start state: scripted agent `a2ui` inline, sidebar and window variants (one task per variant).
- Success check: the agent received an action with the data `name = Nia`; the answer matches the agent's reply.
- Min 3. Budget 9 / 12.

**T18.2 - A window you closed**
- Scenario: "The assistant showed a window and you closed it. Bring it back."
- Start state: window surface closed.
- Success check: exactly one surface window is open.
- Min 2. Budget 6 / 8.

### J19 Browse

**T19.1 - Look at a web page**
- Scenario: "Open a web page at example.com on this desktop, and let the assistant read it too."
- Start state: no Browser window; a local test page served by the harness at a fixed address (use that address; no real network).
- Success check: Browser window open at the page; the Browser chip shown; the panelist said the assistant can now see it (answer check).
- Min 4. Budget 12 / 16.

**T19.2 - No network**
- Scenario: "The page does not load. Tell me why and what you would do."
- Start state: an unreachable address.
- Success check: the panelist names the connection problem and retries via Refresh or a new address.
- Min 3. Budget 9 / 12.

### J20 Investigate

**T20.1 - Why was it refused?**
- Scenario: "The assistant said it could not use a folder. Find out the reason in the program's own records."
- Start state: a refused call after an eject (warning event).
- Success check: the answer names the removed drive; the panelist opened the Event Viewer (log).
- Min 5. Budget 15 / 20.

**T20.2 - Stuck assistant**
- Scenario: "The assistant program seems stuck and uses a lot of memory. Stop that program, not just the conversation."
- Start state: running agent process; Task Manager closed.
- Success check: the agent process ended; the app still runs.
- Min 4. Budget 12 / 16.

### J21 Keyboard-only

**T21.1 - No mouse**
- Scenario: "Your mouse is broken. Open a new conversation, send 'hello', and answer a request from the assistant with Allow."
- Start state: desktop open; `demo`; Write files = Ask. Driver mouse actions are disabled.
- Success check: message sent, request answered Allow, using keys only.
- Min 12. Budget 36 / 48.

### J22 Help and discoverability

**T22.1 - Ask for help**
- Scenario: "You are in the Explorer window and do not know what the button called 'Plug in a project' does. Find out without leaving the program."
- Start state: Explorer open.
- Success check: a help topic for Explorer is open, and the panelist's answer states what the button does (answer check).
- Min 1 (F1) + read. Budget 6 / 8.

**T22.2 - Find a topic by search**
- Scenario: "Find out how to undo a change that the assistant made."
- Start state: Help and Support closed, a chat open.
- Success check: the topic about the Changes pane or Recycle Bin is open; the answer lists the steps correctly.
- Min 4. Budget 12 / 16.

### J23 Recover from errors

**T23.1 - It crashed**
- Scenario: "The assistant stopped halfway and shows an error. Get it working again and make it finish your request."
- Start state: `errors` script with a crash; the process exits mid-turn.
- Success check: a new turn finished after the crash; no message was lost.
- Min 4. Budget 12 / 16.

**T23.2 - The connection dropped**
- Scenario: "You were typing a long message to the assistant and an error says it could not send. Get your message to the assistant."
- Start state: error injected on the first send.
- Success check: the message arrives and the agent replies.
- Min 3. Budget 9 / 12.

### J24 Code, git status and the gutter [planned]

**T24.1 - What changed in git**
- Scenario: "Open the project's code. Tell me which files have changes that are not saved in version control yet, and which line of redirect.ts is new."
- Start state: the Git project with two modified files and one new file; new Code app.
- Success check: the answer names the three files and the correct line (researcher check).
- Min 5. Budget 15 / 20.

**T24.2 - Not a Git project**
- Scenario: "Open the code for a folder that is not under version control. Tell me why there are no change marks."
- Start state: plain folder plugged in.
- Success check: answer names the missing Git repository (from the screen text).
- Min 4. Budget 12 / 16.

## Coverage table

| Journey | Tasks |
|---|---|
| J01 | T01.1 |
| J02 | T02.1, T02.2 |
| J03 | T03.1 |
| J04 | T04.1, T04.2 |
| J05 | T05.1, T05.2 |
| J06 | T06.1, T06.2, T06.3 |
| J07 | T07.1 |
| J08 | T08.1, T08.2 |
| J09 | T09.1 |
| J10 | T10.1, T10.2 |
| J11 | T11.1, T11.2, T11.3 |
| J12 | T12.1, T12.2 |
| J13 | T13.1, T13.2 |
| J14 | T14.1, T14.2 |
| J15 | T15.1 |
| J16 | T16.1, T16.2 (and T06.3) |
| J17 | T17.1, T17.2 |
| J18 | T18.1 (three variants), T18.2 |
| J19 | T19.1, T19.2 |
| J20 | T20.1, T20.2 |
| J21 | T21.1 |
| J22 | T22.1, T22.2 |
| J23 | T23.1, T23.2 |
| J24 | T24.1, T24.2 |

## Result table (filled during the sprint)

| Task | Opus | Sonnet | Haiku | Median SEQ | Notes |
|---|---|---|---|---|---|
| all | not yet run | not yet run | not yet run | n/a | |

A task passes only when all three cells say pass in the final round.
