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
- Min 1 (click **New...**). Budget 3 / 4. Steps to pass (H-92): the check holds at the second action (the dialog is open); `check.json.stepsToPass` records it and the budget and the weak rule use it, because the scenario's second clause ("start getting set up") invites more actions after the goal.
- Notes: observe if the empty text is read, and what the panelist thinks a "desktop" is (post-task question).

### J02 Create a desktop

**T02.1 - A desktop for a project**
- Scenario: "You have a project folder called login-app. You want the assistant to work on it. Set things up so that you could start asking it for help. Call your workspace 'Fix login redirect'."
- Start state: launcher with no desktops; `login-app` exists on disk; the folder picker is pre-answered by the harness with `login-app` (the panelist clicks Browse and the harness selects the folder).
- Success check: one desktop titled "Fix login redirect" exists with `login-app` plugged in, and its window is open.
- Min 6 (New..., type name, Browse..., confirm folder, Create, Connect). Budget 18 / 24.

**T02.2 - Name already used**
- Scenario: "You already have a workspace called 'Fix login redirect'. Make another one for the folder docs-site. Try to give it the same name. If the program will not allow that, say why and finish with a name that works."
- Start state: one desktop with that name.
- Success check: the panelist ends with a second desktop with a different, valid name, and states why the same name was refused (the answer needs the reason: already used, same name, own name, exists).
- Answer: why the same name was refused (the name is already used).
- Min 7. Budget 21 / 28.

### J03 Plug in a project

**T03.1 - Add another folder to a running workspace**
- Scenario: "Your workspace is open. You also need the assistant to see the folder docs-site. Make that folder available in this workspace, and open it so that you can see the files."
- Start state: connected desktop with `login-app` plugged in; folder picker answered with `docs-site`.
- Success check: `docs-site` is plugged in on the desktop, and an Explorer window shows its root or a Code window is open (its Projects tree lists the new project, H-106).
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
- Answer: what the assistant did, in the panelist's own words.
- Min 3 (click box, type, Enter). Budget 9 / 12.

**T05.2 - Stop the assistant**
- Scenario: "The assistant started something you do not want. Make it stop right now."
- Start state: scripted agent `stepping` (a long turn, paused mid-way) with the turn running.
- Success check: the turn ended with stop reason cancelled; the running tool card shows Cancelled.
- Min 1. Budget 3 / 4.

### J06 Approve or deny a request

**T06.1 - Allow after reading**
- Scenario: "You asked the assistant to fix the redirect bug. A box appears asking for something. Read it and let the assistant make the change only if it changes the file src/auth/redirect.ts. Tell me which lines it changes."
- Start state: `demo` script; Write files = Ask.
- Success check: the request was answered Allow, the file on disk contains the fix, and the panelist's answer says which lines change (the answer must name lines 1, 3 and 4 as written, or +3 and -3, H-74; a range such as "lines 1 to 5" is not expanded and an answer that says it could not tell fails, H-77; the diff is inline; opening the details is optional; answer check, H-44).
- Answer: which lines of redirect.ts change.
- Min 1 (Allow). Budget 3 / 4.

**T06.2 - Deny**
- Scenario: "The assistant asks to run a command. You do not know it. Say no, and make sure that the assistant does not run it."
- Start state: `demo` script (deny branch), Terminal policy = Ask.
- Success check: request answered Deny; no terminal output; the turn ended normally; no file written.
- Min 1. Budget 3 / 4.

**T06.3 - Make it ask first** (also J16)
- Scenario: "You want the assistant to fix a failing test in your project, but it must never run commands without asking you first. Set things up that way, then ask it to run the tests."
- Start state: Terminal policy = Allow; `demo` script with a terminal step.
- Success check: Terminal policy = Ask (or Deny) in the saved policy, and a request appeared for the command (the permission broker log shows it).
- Min 6 (Start, Control Center, Permissions, change Terminal, Apply, then chat). Budget 18 / 24.

### J07 Approve from the Action Center

**T07.1 - Answer what is waiting**
- Scenario: "You were reading something else. Two of your chats say they are waiting for you somewhere. Find out what each one wants and answer both."
- Start state: two chats, each with one pending write request, the dialog dismissed with Not now.
- Success check: both requests answered by the panelist (any answer; either chat may be answered first, H-85), no request pending. `check.json.notes` logs the order of the two answers and the seconds from each request to its answer, so the researcher can tell a read-and-allow from an Allow clicked without reading.
- Min 5. Budget 15 / 20.

### J08 Review and revert changes

**T08.1 - Undo one file**
- Scenario: "The assistant changed two files. You liked the change in login.ts but not the one in redirect.ts. Undo only the change to redirect.ts."
- Start state: chat with two agent file changes (`login.ts`, `redirect.ts`).
- Success check: `redirect.ts` on disk equals the original, `login.ts` keeps the agent's edit, one recycled change for `redirect.ts` exists.
- Min 5 (Tasks and changes, Changes tab, select, Revert, Yes). Budget 15 / 20.

**T08.2 - Review everything [planned]**
- Scenario: "Before you accept the work, look at every line that the assistant changed and tell me how many files changed, which one changed most and which lines of that file changed."
- Start state: chat with five agent changes in a Git project; new Code app.
- Success check: the answer gives the file count (digits or words), the file that changed most and says which lines (the word "line"); the panelist used Code or the Changes pane (session log; researcher check).
- Answer: how many files changed and which lines changed.
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
- Success check: the assistant cannot run commands: either no Terminal window is open and the Workspace bar ("Agent can use") has no Terminal chip, or the Terminal permission is Deny; the panelist names the chip list, the closed Terminal or the Deny policy as the proof (answer check).
- Answer: how the panelist can see that the assistant cannot run commands.
- Min 1 (close Terminal; the Permissions route is longer). Budget 8 / 10.

**T10.2 - What can it touch?**
- Scenario: "Without asking the assistant, tell me which of these it can do now: read files, run commands, browse the web."
- Start state: Explorer and Browser open, Terminal closed.
- Success check: the answer is exactly: read files yes, run commands no, browse yes (researcher check).
- Answer: read files yes, run commands no, browse the web yes.
- Min 0 (look only, the answer takes no action). Budget 3 / 4.

### J11 Pause and take control

**T11.1 - Hold on**
- Scenario: "The assistant is working and you want it to stop everything at once, and not do anything else until you say so."
- Start state: `stepping` script, turn running.
- Success check: desktop `paused` is true; the turn ended cancelled; no new tool call ran after.
- Min 1. Budget 3 / 4.

**T11.2 - Approve every step**
- Scenario: "For the next job you want to approve every single thing the assistant does, even reading."
- Start state: all permissions Allow; chat open.
- Success check: `userInControl` is true, or every permission group is Ask. A prompt and a raised request are an optional extra (the scenario does not ask for them).
- Min 1 (take control or set every group to Ask). Budget 9 / 12.

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
- Answer: what the assistant could not do (the drive was removed).
- Min 6. Budget 18 / 24.

### J13 Disconnect and reconnect

**T13.1 - Leave it running**
- Scenario: "You need to leave your desk for a while, and the assistant should keep working. Close this window without stopping it. Later, come back and see where it is."
- Start state: `stepping` script (auto mode, long), turn running.
- Success check: the chat window was closed or the desktop disconnected and the agent kept running (the run state is recorded at reconnect); then reconnected with the chat showing new progress (a higher "N of 30" than at the start, or more tool calls) **and a window of the original chat (same session id) open after the close** (H-91). Progress without that window is MANUAL (`reopened: false` in the notes): the researcher decides from the log whether the panelist went back to the same chat.
- Min 3. Budget 9 / 12.

**T13.2 - You were called back**
- Scenario: "A message pops up saying the assistant needs you. Go to it and give it the go-ahead."
- Start state: disconnected desktop with a pending request; the harness shows the OS notification state (cannot be clicked by the panelist, so the panelist starts from the launcher where the row says Needs your approval).
- Success check: request answered Allow, desktop connected.
- Min 4. Budget 12 / 16.

### J14 Manage several desktops

**T14.1 - Which one needs me?**
- Scenario: "You have four workspaces running. Find the one that is waiting for you and open it, and tell me which workspace has a problem."
- Start state: four desktops, one with a pending request, one with an error, two idle.
- Success check: the desktop with the pending request is connected (H-73: the preset selects the "Scratch pad" row, so the waiting row is not preselected; the panelist has to find it by reading the rows). The answer names the error desktop (H-39; the launcher row shows the amber text "Agent problem: ..." with data-state error since UX-87); the researcher records whether the waiting row was preselected.
- Answer: the workspace that has a problem ("Docs site").
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
- Answer: what is lost and what stays.
- Min 3. Budget 9 / 12.

### J16 Choose permissions

**T16.1 - Stop it from editing files by itself**
- Scenario: "You want to be asked every time the assistant wants to change a file, but it may read files freely."
- Start state: defaults changed by the harness (Write files = Allow).
- Success check: Write files = Ask, Read files = Allow, saved.
- Min 5. Budget 15 / 20.

**T16.2 - Know what a setting covers**
- Scenario: "Find out whether turning off 'Code' would also stop the assistant from writing files with Notepad."
- Start state: Control Center closed.
- Success check: the answer says no and gives the reason (keyword check, H-68: no / not / does not stop, and Write files, separate, both or Notepad); the answer must come from the screen or the manual (researcher: Control Center or Help opened in the log).
- Answer: whether turning off Code also stops Notepad from writing files.
- Min 4. Budget 12 / 16.

### J17 Add and choose agents

**T17.1 - Use a different assistant**
- Scenario: "A colleague gave you an assistant program. Its start command is `node` with the argument `my-agent.js`. Add it, and use it for new workspaces from now on."
- Start state: Control Center closed; the file exists.
- Success check: a new agent row with that command and args exists and is the default.
- Min 8. Budget 24 / 32.

**T17.2 - It does not start**
- Scenario: "You started a chat and the assistant does not answer. Find out why and tell me what to do. You may change the assistant setting of the program if that helps."
- Start state: the default agent has a bad command (`not-a-real-command`). The Agents list also has a working scripted agent, "Helper assistant" (not the default). The built-in Claude Code row is removed from this fixture, because it cannot start without `npx` and looked usable (H-97, H-107): every row that is left either fails for the stated reason or answers.
- Success check: the answer names the wrong command or "not found", points to the Agents page and says what to do (edit or change it, choose another agent, set a default, new chat; H-42); the panelist did not restart the app.
- Answer: why the assistant does not answer and what to do.
- Min 3. Budget 9 / 12.

### J18 A2UI surfaces

**T18.1 - Fill in the assistant's form**
- Scenario: "The assistant shows you a form. Fill it in with the name 'Nia' and press the main button, then tell me what the assistant answered."
- Start state: scripted agent `a2ui` inline, sidebar and window variants (one task per variant).
- Success check: the agent received an action with the data `name = Nia`; the answer matches the agent's reply.
- Answer: what the assistant replied to the form.
- Min 3. Budget 9 / 12.

**T18.2 - A window you closed**
- Scenario: "The assistant showed a window and you closed it. Bring it back."
- Start state: window surface closed.
- Success check: exactly one surface window is open.
- Min 2. Budget 6 / 8.

### J19 Browse

**T19.1 - Look at a web page**
- Scenario: "Open the web page at {TEST_PAGE_URL} on this desktop, then ask the assistant what it says."
- Start state: no Browser window; `browser-agent` script; a local test page served by the harness at its own port per session (the facilitator substitutes the address for `{TEST_PAGE_URL}`, default http://127.0.0.1:4173/; no real network).
- Success check: Browser window open at the page; the Browser chip shown; the assistant read the page (a `browser_read` call, H-49); the answer contains the page title "Example Domain".
- Answer: what the page says ("Example Domain"), as told by the assistant.
- Min 4. Budget 12 / 16.

**T19.2 - No network**
- Scenario: "The page does not load. Tell me why and what you would do."
- Start state: an unreachable address.
- Success check: the panelist names the connection problem and retries via Refresh or a new address.
- Answer: why the page does not load (the port is blocked or the address is wrong) and what to do.
- Min 3. Budget 9 / 12.

### J20 Investigate

**T20.1 - Why was it refused?**
- Scenario: "The assistant said it could not use a folder. Find out the reason in the program's own records."
- Start state: a refused call after an eject (warning event).
- Success check: the answer names the removed drive; the panelist opened the Event Viewer (log).
- Answer: the reason found in the Event Viewer (the removed drive).
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
- Fresh panelist (H-69): this task tests whether a person finds Ctrl+N and Alt+A. The panelist must not have run T20.1, T22.x or any task that shows the Start menu or the approval hints in the same context.
- Min 4 (Ctrl+N, type "hello", Enter, Alt+A). Budget 12 / 16.

### J22 Help and discoverability

**T22.1 - Ask for help**
- Scenario: "You are in the Explorer window and do not know what the button called 'Plug in a project' does. Find out without leaving the program."
- Start state: Explorer open.
- Success check: the answer states what the button does ("project folder", "drive" or "see its files"). A tooltip answer is enough; a Help topic for Explorer open is the other valid route and is the Min (H-24).
- Answer: what Plug in a project does.
- Min 2 (F1 + read). Budget 6 / 8.

**T22.2 - Find a topic by search**
- Scenario: "Find out how to undo a change that the assistant made."
- Start state: Help and Support closed, a chat open.
- Success check: the answer lists the steps correctly (Changes, select, Revert; Recycle Bin to restore). A Help topic about the Changes pane or Recycle Bin is not required (H-96); if a Help window is open, its topic must be one of those.
- Answer: how to undo a change that the assistant made.
- Min 4. Budget 12 / 16.

### J23 Recover from errors

**T23.1 - It crashed**
- Scenario: "The assistant stopped halfway and shows an error. Get it working again and make it finish your request."
- Start state: `errors` script with a crash; the process exits mid-turn.
- Success check: a new turn finished after the crash; no message was lost.
- Min 4. Budget 12 / 16.

**T23.1b - It crashed again**
- Scenario: "The assistant stopped halfway, you restarted it and sent your request again, and it stopped again. Get it working and make it finish your request."
- Start state: `crashed-agent` with option `twice`: the first crash, "Restart and send again", and a second crash before the turn completes (needs UX-123, so that the failure count survives the restart). The box says "It stopped again" and offers Restart and "Start a new chat".
- Success check: a turn finished after the second crash (in the same chat after Restart, or in a new chat) and the assistant answered; the first message was not sent again into the same failure. The checker notes whether the second failure offered "Start a new chat".
- Min 3. Budget 9 / 12.

**T23.2 - The connection dropped**
- Scenario: "You were typing a long message to the assistant and an error says it could not send. Get your message to the assistant."
- Start state: error injected on the first send. The scripted agent `flaky` (`scripts/ux-panel/scripts/flaky.json`) fails the first prompt of every agent process with "The connection to the assistant dropped. Could not send." and answers all later prompts ("Got your message: ..."). Reconnect starts a new agent process, so **the first send after each Reconnect fails again** (H-95; seen in R6 T23.2 intermediate). The product item is UX-162 (the failed message must show once, with Send again).
- Success check: the message arrives and the agent replies.
- Min 3. Budget 9 / 12.

### J24 Code, git status and the gutter [planned]

**T24.1 - What changed in git**
- Scenario: "Open the project's code. Tell me which files have changes that are not saved in version control yet, and which lines of redirect.ts are new."
- Start state: the Git project with two modified files and one new file; new Code app.
- Success check: the answer names the three files (redirect.ts, login.ts, session.ts) and the new lines of redirect.ts (the diff shows lines 1, 3 and 4; keyword 3 is checked; researcher check).
- Answer: the three files and the new lines of redirect.ts (1, 3 and 4).
- Min 5. Budget 15 / 20.

**T24.2 - Not a Git project**
- Scenario: "Open the code for a folder that is not under version control. Tell me why there are no change marks."
- Start state: plain folder plugged in.
- Success check: answer names the missing Git repository (from the screen text).
- Answer: why there are no change marks (no Git repository).
- Min 4. Budget 12 / 16.

### J25 Review the agent's changes in Code Review

**T25.1 - The blocking comment**
- Scenario: "The assistant checked the changes in the project and left remarks. Tell me which remark is the most serious one, in which file it is and on which line."
- Start state: Code Review open on a Git project (`review-notes`) with two reviewer comments (one Blocker on notes.txt line 4, one Minor on line 1); `review` script; a chat is open behind it.
- Success check: the window is still open and the answer names notes.txt and line 4 (answer check).
- Answer: which remark is the most serious (notes.txt line 4).
- Min 3 (open file, read comment list, read). Budget 9 / 12.

**T25.2 - The verdict**
- Scenario: "Tell me whether the assistant accepted the changes or wants more work, and how many remarks it left."
- Start state: same as T25.1.
- Success check: the answer says that changes are requested (not approved) and that there are 2 remarks.
- Answer: the verdict and the number of remarks (2).
- Min 2. Budget 6 / 8.

**T25.3 - The chat reviews** (H-115, round 9 re-test of UX-193)
- Scenario: "Ask the assistant in the chat to review the changes in this project and leave its remarks in the review window. When it has finished, tell me how many remarks it left and where you were taken afterwards."
- Start state: `review-notes` with a chat open (the IDE chat) and the Code Review window open, with no remarks yet; scripted agent `chat-review` (`scripts/ux-panel/scripts/chat-review.json`), which calls `review_open`, `review_list_changes`, `review_read_diff`, `review_add_comment` twice and `review_submit` through the chat's own session. UX-193: a chat does this through `review_open` from any chat, and the verdict is handed back to it.
- Success check: two remarks exist in the review with the agent (the chat) as author; the verdict is set; no chat message lists the remarks as text in place of the tools; after `review_submit` the IDE chat window is the focused window; the answer says 2 remarks and the chat.
- Answer: how many remarks the chat left (2) and where the panelist was taken afterwards (the chat).
- Min 4 (type the request, Send, read the banner, read the chat). Budget 12 / 16.
- Run at both levels in round 9 with T25.1, T25.2, T26.1 and T26.2.

### J26 Send review comments to a chat, and comment yourself

**T26.1 - Pass the remarks on**
- Scenario: "You agree with all the remarks. Give them to the assistant in the conversation that is already open, so that it fixes them."
- Start state: same as T25.1.
- Success check: the open chat received a message with the remarks (notes.txt:4) and the assistant answered; no remark is still marked open.
- Min 4 (Send all, pick the chat, Send, look). Budget 12 / 16.

**T26.2 - Your own remark**
- Scenario: "Leave a remark 'rename this' on the second line of notes.txt. Do not send it to the assistant yet."
- Start state: same as T25.1.
- Success check: a user comment 'rename this' exists on notes.txt line 2 in the open state; the chat did not get it.
- Min 5 (open file, hover the line, click the plus, type, Submit). Budget 15 / 20.

### J27 Ask the chat pane about what you are looking at

**T27.1 - Explain these lines**
- Scenario: "You are reading the open file and do not understand the first two lines. Ask the assistant to explain them without opening a separate conversation window."
- Start state: Code window with index.ts open, pane collapsed; `aside` script.
- Success check: the Code window's pane has a question and an answer; no Chat window was opened.
- Min 3 (select lines, right-click, Explain this). Budget 9 / 12.

**T27.2 - More room for the file**
- Scenario: "The file has too little room. Make the file use the whole window. Nothing else should share the window with the file."
- Start state: Code window with the chat pane open.
- Success check: the pane is hidden, the window still offers a way to bring it back, and the file area is at least 90 percent as wide as the Code window (H-26).
- Min 1. Budget 3 / 4.

### J28 Let the agent use a web app in the Browser

**T28.1 - The assistant reads a web page**
- Scenario: "Type this request to the assistant, exactly as written:

  Use the chat app at http://127.0.0.1:4174/

While it works, watch the web page. When it has finished, tell the facilitator how you could see that the assistant was using the page, and what it did there. Do not ask the assistant that question."
- Start state: Browser and an idle chat open; `browser-agent` script (the local team chat page, no network).
- Success check: the assistant finished (its last reply: "I sent the message and found it in #general.", H-71), the Browser shows the page, and the answer mentions the assistant and the page or bar (researcher check).
- Answer: what was posted in the chat app.
- Min 3. Budget 9 / 12.

**T28.2 - Take back the page**
- Scenario: "The assistant is busy in the web page and you want to use the page yourself right now. Make the assistant leave it alone."
- Start state: `browser-slow` script running for about a minute; the Browser shows the activity bar.
- Success check: the desktop is in user control (Take over) or paused (Pause all agents), and no tool call starts in the next 3 seconds (H-33). The note records which control was used.
- Min 1. Budget 3 / 4.

### J29 Browse with tabs

**T29.1 - Two pages side by side**
- Scenario: "Keep the page you see now. Open a second page at {TEST_PAGE_URL}second so that both stay open, then go back to the first page."
- Start state: Browser open on the test page (per-session port; the facilitator substitutes `{TEST_PAGE_URL}`, as for T19.1). The server also answers `/second` ("Second page").
- Success check: two tabs exist, the first (test page) is active, the second has the address `{TEST_PAGE_URL}second` and loaded (its title is not an error page).
- Min 5 (new tab, click address, type, Enter, click first tab). Budget 15 / 20.

### J30 Menus, right-click and About

**T30.1 - Open a file from the list**
- Scenario: "You want to read the README of login-app in a plain text editor. Open it from the file list, without using the Start menu."
- Start state: Explorer open; login-app plugged in.
- Success check: a Notepad window shows README.md.
- Min 4 (open the drive, open the folder if needed, right-click README, Open with Notepad). Budget 12 / 16.

**T30.2 - Which version?**
- Scenario: "Find out which version of Notepad you are using."
- Start state: Notepad open.
- Success check: the answer gives the version that the About dialog shows (researcher check).
- Answer: the version of Notepad.
- Min 2 (Help menu, About). Budget 6 / 8.

### J31 Help from inside an app

**T31.1 - How do I save?**
- Scenario: "You do not know how to save a file in Notepad. Use the help of the program to find out, and tell me how to save."
- Start state: Notepad open, nothing else.
- Success check: Help and Support is open on the Notepad topic and the answer names the shortcut Ctrl+S (keyword check, H-84; the panelist quotes only what a shot shows).
- Answer: how to save a file in Notepad (Ctrl+S).
- Min 2. Budget 6 / 8.

**T31.2 - Why can I not type here?**
- Scenario: "You clicked into the Terminal window and typing does nothing. Find out why, using the help of the program."
- Start state: Terminal open.
- Success check: Help and Support is open on the Terminal topic and the answer says that the Terminal only shows what the assistant runs.
- Answer: why typing does nothing in the Terminal (it is read only).
- Min 2. Budget 6 / 8.

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
| J23 | T23.1, T23.1b, T23.2 |
| J24 | T24.1, T24.2 |
| J25 | T25.1, T25.2, T25.3 |
| J26 | T26.1, T26.2 |
| J27 | T27.1, T27.2 |
| J28 | T28.1, T28.2 |
| J29 | T29.1 |
| J30 | T30.1, T30.2 |
| J31 | T31.1, T31.2 |

## Result table (filled during the sprint)

| Task | Opus | Sonnet | Haiku | Median SEQ | Notes |
|---|---|---|---|---|---|
| all | not yet run | not yet run | not yet run | n/a | |

A task passes only when all three cells say pass in the final round.
