# Agent7 UX fix backlog, round 2 design response

Source: `panel/r2/SYNTHESIS.md` (themes TH-18 to TH-31, harness defects H-23 to H-46), `scorecard.md` (round 2), the round 2 records and the checks of `scripts/ux-panel/checks`. Round 1 items UX-01 to UX-50 are implemented and are not repeated here; this file starts at UX-51. Target: 10/10 at novice (Haiku) and intermediate (Sonnet); the expert tier is dropped. Severity is Nielsen 1 to 4 (1 = polish), same as round 1. Windows 7 terms and `docs/DOCUMENTATION_STYLE.md` apply (chat, desktop, drive, pane, dialog box; American spelling in new copy; no contractions in manuals; "Control Center" is the product spelling since UX-50).

Do not change harness files here: those fixes are SYNTHESIS section 4 (H-23 to H-46). Three items depend on them and say so (UX-51 on H-32, UX-59 on H-35, UX-60 on H-33).

All paths below are under `src/` and the renderer lib root `R = src/renderer/src/lib`. Main root `M = src/main`.

## Work packages

| WP | Name | Items | Files owned (edit freely) |
|---|---|---|---|
| WP-A | Shell, projects, windows, launcher | UX-51 to UX-58 | `R/launcher/*`, `R/pages/{LauncherPage,DesktopPage}.svelte`, `R/apps/explorer/*`, `R/desktop/{DesktopSurface,WindowLayer,AppWindowFrame,UsbTray,AutoPlayDialog,Balloon,WelcomeDialog,ConnectionBar,shellRegions.ts,windowOrder.ts}`, `R/kit/organisms/{StartMenu,Taskbar,FolderBrowserDialog,FolderBrowserHost}*`, `R/kit/organisms/folderBrowser.ts`, `shared/desktop-views.ts`, `M/application/launcher/LauncherService.ts`, `M/application/vfs/DriveService.ts`, `M/application/FolderService.ts`, `M/infrastructure/fs/NodeDirectoryBrowser.ts`, `M/infrastructure/db/sqlite-drive-repository.ts`, migration `010_removed_projects.ts`, `M/ipc/{createDesktopWindow,DesktopWindowManager,ElectronDialogs}.ts`, `manuals/{launcher,desktop,explorer,projects,keyboard}.md` |
| WP-B | Agent control, permissions, chat, failures | UX-59 to UX-67 | `R/desktop/{TopBar,UacDialog,TrayFlag,PermissionInbox,approval,activity}*`, `R/app/session/*` except `SurfaceRow*`, `R/apps/chat/*`, `R/apps/shared/{EmbeddedChat.svelte,contextItems.ts}`, `R/desktop/{AppChatPane,NewChatDialog,Gadgets}.svelte`, `R/apps/control-centre/*`, `R/apps/agent-manager/*`, `R/app/sessionStatus.ts`, `M/application/{SessionService,SessionRuntime,PermissionBroker,AgentConnectionPool,SessionProblems,agentProblems}.ts`, migration `011_stopped_by_pause.ts`, `manuals/{chat,embedded-chat,approvals,pause-stop-resume,agent-does-not-start,control-centre,agent-manager}.md` |
| WP-C | Browser, web tasks, agent surfaces | UX-68 to UX-74 | `R/apps/browser/*`, `R/apps/surface/*`, `R/a2ui/*`, `R/app/session/SurfaceRow.svelte` and `surfaceRow.ts`, `R/apps/terminal/*`, `M/application/tools/browserTools.ts`, `M/infrastructure/browser/*`, `M/infrastructure/a2ui/*`, `M/application/{A2uiService,CompositeA2uiSink}.ts`, `manuals/{browser,surface,terminal}.md` |
| WP-D | Code, review, Help, accessibility | UX-75 to UX-83 | `R/apps/{code,code-review,help,notepad,wordpad,paint,sticky-notes,recycle-bin}/*`, `R/app/shell/{ChangesPane,TasksPane,FileTree}.svelte`, `R/app/changes/*`, `R/kit/molecules/CaptionButtons.svelte`, `R/kit/atoms/*`, `R/kit/organisms/{MenuStrip,TabControl,ListView,DataGridView,Dialog,DiffViewer}.svelte`, `R/kit/tokens.css`, `manuals/{code,code-review,help,notepad,wordpad,recycle-bin,index}.md` |
| final | Measurement and sweep | UX-84, UX-85 | UX-84 new `scripts/ux-panel/perf.mjs` (harness owner); UX-85 everything, one developer, after WP-A to WP-D are merged |

WP-A to WP-D can run in parallel. Their file sets do not overlap except the files below.

**Shared files to watch (small, additive edits in a separate block; merge in the order WP-A, WP-B, WP-C, WP-D or rebase often):**
- `R/desktop/DesktopController.svelte.ts` and `R/pages/DesktopPage.svelte`: WP-A owns. WP-B adds `resumeAgents`, `controlState` (UX-59, UX-60) and the error actions (UX-63). WP-C adds only a call to `raiseWindow` (UX-55 creates it). WP-D adds nothing.
- `shared/desktop.ts` (the desktop state DTO): WP-A adds `removedProjects` (UX-52); WP-B adds `stoppedByPause` (UX-59). Each in its own field block.
- `shared/ipc.ts`, `shared/ipc-channels.ts`, `M/ipc/createApi.ts`, `R/app/fakeApi.ts`, `R/app/fakeDesktop.ts`, `R/app/fakeLauncher.ts`: each WP adds its own channels in its own block (WP-A `drives.removed`, `fs.browse` recent places; WP-B `desktop.resumeAgents`; WP-C `browser.takeOver`; WP-D none).
- `M/application/desktop/DesktopService.ts`: WP-A (removed projects, z-order on open, UX-52 and UX-55) and WP-B (pause persistence, take over, UX-59 and UX-60) edit different methods: `ejectDrive`/`openWindow` (WP-A) and `setPaused`/`setUserInControl` (WP-B).
- `M/infrastructure/db/migrations/index.ts`: one added line per migration (010 WP-A, 011 WP-B).
- `R/apps/code/CodeApp.svelte` embeds `R/apps/shared/EmbeddedChat.svelte`: WP-D changes the layout in CodeApp (UX-75); WP-B changes EmbeddedChat internals (UX-66: pane header). The chat collapse control is in EmbeddedChat and is specified in UX-75; WP-D edits only its props.
- `R/app/session/SurfaceRow.svelte`: WP-C only (UX-72); WP-B treats `R/app/session/*` as owned except this file.
- `R/kit/organisms/StartMenu.svelte`: WP-A only (UX-57, includes its axe role fix). `R/apps/browser/BrowserApp.svelte` tab strip roles: WP-C only (UX-74). `CaptionButtons.svelte`: WP-D only (UX-83), consumed by WP-A files without edits.
- `manuals/*.md`: each WP edits only its own apps' manuals; `scripts/check-help-coverage.mjs` must stay green after each merge.

---

## WP-A Shell, projects, windows, launcher

### UX-51 Browse For Folder finds the user's projects
- **Problem.** T02.1 novice failed (19 of 18 steps), T02.2 novice gave up (10 of 21), T12.2 failed at both levels, T03.1 and T02.1 intermediate needed the tree. The dialog opens at "Computer" with Home, Documents and Desktop. Home looked empty ("Home looked empty", T02.1, T02.2, T12.2). The Folder box refused `login-app` with "'login-app' is not a full folder path." and a full path of a missing folder with "The folder '/home/user/login-app' cannot be opened. It may not exist, or you may not have permission." Nothing offers the folders that Agent7 already knows.
- **Decision.**
  - New top group in the tree: "Projects you used before" (up to 8 folders from `FolderService.list()`, newest `lastOpenedAt` first; a folder that no longer exists is left out). Each node shows the folder name; the tooltip and the Folder box show the full path. Two folders with the same name show the parent in grey: "login-app (Documents)". The group is open when the dialog opens and the newest folder is not selected (selection must be a choice). With no recent folders the group is hidden and "Documents" (or Home when Documents does not exist) is open.
  - The Folder box accepts a bare name. On OK or Enter, and after 400 ms without typing, `browse` resolves a name with no separator in this order: an exact (case-insensitive) match in "Projects you used before", then a folder of that name up to 3 levels deep under Documents, Desktop and Home (dot-folders, `node_modules` and a 2 second limit excepted). One match: the Folder box shows the full path and the node is selected. More than one: status line "More than one folder is called 'login-app'. Select one in the list." and a group "Matches" appears with each path. None: "No folder called 'login-app' was found in your recent folders, Documents, Desktop or Home. Type the full path, for example C:\Users\you\login-app, or choose a folder in the list."
  - A typed full path that does not exist: "The folder 'C:\x\login-app' does not exist. Check the spelling, or select the parent folder and click Make New Folder." An empty folder in the tree shows a grey row "This folder has no subfolders."
  - `FolderService.add` keeps calling `touch`; Plug in and New desktop both use the dialog, so both feed the recent list.
  - Instruction lines stay as in UX-01.
- **Acceptance.** T02.1 novice and intermediate finish in 18 steps or fewer with the folder found by name or in "Projects you used before" or Documents (needs H-32: fixtures under the sandbox Documents folder). T02.2 novice reaches the second desktop with docs-site. T12.2 uses it as a fallback (UX-52 is the main route). No panelist reports "Home looked empty" or a refused typed name.
- **Severity** 3. **Findings** TH-18. **Files** `R/kit/organisms/{FolderBrowserDialog.svelte,FolderBrowserDialog.ts,folderBrowser.ts}`, `shared/models.ts` (`BrowseListingDto.recent`), `M/infrastructure/fs/NodeDirectoryBrowser.ts`, `M/application/FolderService.ts`, `M/compose.ts`, `M/application/ports.ts`.

### UX-52 Recently removed is saved and filled by every way a project leaves
- **Problem.** `recentlyRemoved` lives in the renderer (`DesktopController`) and is filled only by the Eject command in that window. T12.2 (both levels, 7 and 14 steps): the project was ejected while the agent worked, so "Plug in again" stayed greyed with no reason, the list said "No projects plugged in", and the Help text about "Recently removed" contradicted the screen. The list is lost when the desktop reconnects.
- **Decision.** `DriveService.eject` writes a row `desktop_removed_projects(desktop_id, folder_id, label, removed_at)` (migration 010, newest five per desktop kept, the panel shows three) and the desktop state carries `removedProjects`. Any route (Computer, Code tree, tray, API, another window, a closed window) fills it. Plugging the folder in again or deleting the desktop removes the row. Computer shows the group "Recently removed" under "Devices with Removable Storage" whenever a row exists; the toolbar button "Plug in again" is enabled when a removed project is selected. If nothing was removed, the button stays disabled with the tooltip "Nothing was removed from this desktop yet. Use Plug in a project... to add a folder." The USB tray menu lists "Plug in login-app (E:) again" first, under the eject entries. The refusal that the agent receives and shows in the chat reads: "Drive E: is not plugged in on this desktop. login-app was removed. Ask the user to open Computer and choose Plug in again." (`M/application/desktop/ToolGateway.ts`, `M/application/vfs/*` message).
- **Acceptance.** T12.2 (rerun with the API eject of `eject-mid-job`): both levels plug the folder in again within 18 steps and 5 actions after the answer; "Plug in again" is enabled; the list survives a disconnect. No Help text contradicts the screen.
- **Severity** 3. **Findings** TH-19. **Files** `M/application/vfs/DriveService.ts`, `M/application/desktop/DesktopService.ts` (eject block), `M/infrastructure/db/sqlite-drive-repository.ts`, migration `010_removed_projects.ts`, `shared/desktop.ts`, `R/desktop/{DesktopController.svelte.ts,UsbTray.svelte}`, `R/apps/explorer/{ExplorerApp,ComputerView}.svelte`, `M/application/desktop/ToolGateway.ts`, `manuals/{explorer,projects}.md`.

### UX-53 Plug in opens the project; AutoPlay only when the user did not just choose it
- **Problem.** T03.1 novice failed: "Plug in a project..." added docs-site (the tree already showed its files), then AutoPlay opened and the novice chose "Take no action" because the files were visible. The intermediate: "AutoPlay appearing after the folder was already added is slightly confusing". AutoPlay says "Explorer" and "Agent7" and does not say what each choice shows.
- **Decision.** "Plug in a project..." (File menu in Code, Explorer and Computer toolbar) no longer opens AutoPlay. After the plug-in the drive is selected in Computer, an Explorer window opens on the drive root (raised and focused, UX-55), and the balloon "Project plugged in: docs-site (F:) is ready to use." shows. AutoPlay stays for drives that appear by another route (New desktop, an agent, Plug in again from the tray). Its text: title "AutoPlay"; line 1 "docs-site (F:)"; line 2 "This project is now a drive on this desktop. What do you want to do?"; choices "Open folder to view files" (default, first), "Start a chat on this drive", "Take no action". No "Explorer" and no "Agent7" in the text.
- **Acceptance.** T03.1 novice in 15 steps or fewer with an Explorer window on the root of docs-site; intermediate unchanged (3 actions). No panelist reports "AutoPlay after the folder was added".
- **Severity** 2. **Findings** TH-18. **Files** `R/desktop/{AutoPlayDialog.svelte,DesktopController.svelte.ts}`, `R/apps/explorer/ExplorerApp.svelte`, `manuals/{explorer,projects}.md`.

### UX-54 A taken desktop name gets a suggestion that fits
- **Problem.** T02.2 novice: the only offer was "Use 'Fix login redirect (2)'", which the novice read as breaking the task; the novice gave up. The rule is right (R1 UX-04), the suggestion is poor.
- **Decision.** The message stays: "A desktop named 'Fix login redirect' already exists. Each desktop needs its own name so that you can tell them apart." Under it up to two link-style buttons: "Use 'Fix login redirect - docs-site'" (the name plus the first chosen project folder, shown only after a folder is chosen; it updates when the folder changes) and "Use 'Fix login redirect (2)'". Clicking one fills the name box and keeps the focus there. The Rename dialog gets the same message and the "(2)" button only.
- **Acceptance.** T02.2 novice and intermediate finish with two desktops, the second with docs-site and a valid name, in 21 steps or fewer, and quote the reason. The scenario text stays as it is (the refusal is part of the test; SYNTHESIS 2.2).
- **Severity** 2. **Findings** TH-31. **Files** `R/launcher/{NewDesktopDialog,RenameDesktopDialog}.svelte`, `R/launcher/launcherModel.ts`.

### UX-55 New and reopened windows come to the front; one window per chat
- **Problem.** T18.1-window novice 7 of 9 steps, SEQ 4: the "Board" window opened behind the chat, the card's "Show" did not raise it, the taskbar button hid it instead of showing it. T18.2: "Open" brought the window back behind the chat. T28.1 novice: the chat was hidden behind the Browser. T19.2 novice: the Browser icon opened a second, empty Browser window while the failing one sat behind it. T07.1 novice: the same chat appeared in two windows.
- **Decision.**
  - Every window the agent opens, and every window reopened by "Show" or "Open", is created on top and focused. If the user typed in another window in the last 2 seconds, the window comes to the front without taking the focus and its taskbar button flashes once. The cascade offsets a new window by 32 x 32 px from the front window.
  - A new API `desktop.raiseWindow(windowId)` (restore if minimized, raise, focus). The chat card button label is "Show" while the window is open and "Open" while it is closed (WP-C wires the card to the API).
  - Taskbar: a click on a window that is not on top raises it; a click on the top window minimizes it; Enter and Space on a taskbar button raise and focus, never minimize.
  - A desktop icon whose single-instance app has a window raises that window instead of opening another: Control Center, Event Viewer, Task Manager, Recycle Bin, Help, Browser (use File > New window for a second one), Snipping Tool.
  - A chat that already has a window is raised; it is never opened twice.
- **Acceptance.** T18.1-window novice 9 steps or fewer, no "Show does nothing"; T18.2 the surface window is in front after Open; T28.1 novice reaches the chat in one step; T19.2 novice's Browser icon raises the window with the failing page; T07.1 shows each chat once.
- **Severity** 3. **Findings** TH-30. **Files** `R/desktop/{WindowLayer,AppWindowFrame,DesktopSurface}.svelte`, `R/desktop/windowOrder.ts`, `R/desktop/DesktopController.svelte.ts`, `R/kit/organisms/Taskbar.svelte`, `M/application/desktop/DesktopService.ts` (openWindow block), `shared/desktop.ts`, `shared/ipc.ts`, `M/ipc/createApi.ts`.

### UX-56 Every operating system window and taskbar entry has its own name
- **Problem.** The window list shows every window as "Agent7"; T18.1-window and T28.1 novices switched to the "Desktop Connection" window by mistake.
- **Decision.** Window titles: launcher "Agent7 Desktop Connection"; desktop "Fix login redirect - Agent7" (the desktop's own name); a second window of the same app on one desktop gets " (2)". The connection bar title keeps the desktop name.
- **Acceptance.** `ux.mjs windows` lists distinct names; T28.1 novice never switches to the wrong window.
- **Severity** 2. **Findings** TH-30. **Files** `M/ipc/{createDesktopWindow,DesktopWindowManager}.ts`, `R/desktop/ConnectionBar.svelte`.

### UX-57 Keyboard reach of the shell, round 2
- **Problem.** T21.1 (novice 19 of 36 and intermediate 18 of 36, both finished after trial and error): Ctrl+N does nothing; the File menu has no New chat; Ctrl+Esc was found by trying; Enter in the Start menu did nothing until text was typed in the search box; Tab walks the toolbar slowly; the focus ring is hard to see. axe: the Start menu list lacks a `menu` role.
- **Decision.**
  - Ctrl+N starts a new chat on the default drive of the desktop, with the composer focused, from the desktop and from any Code, Explorer or Chat window. File menus of Code, Explorer and Chat list "New chat  Ctrl+N".
  - Start menu: opens with the first item highlighted and the search box focused; Enter starts the highlighted item; typing filters and highlights the first match; Up and Down move. Footer text (12 px, 4.5:1): "Ctrl+Esc opens this menu. Ctrl+N starts a new chat. F6 moves between the desktop, windows and the taskbar."
  - The Start menu list gets `role="menu"` with `menuitem` children (axe `aria-required-parent` on `.all`).
  - The focus ring on icons, taskbar buttons and the Start menu is a 2 px dotted line at 3:1 (R1 UX-08 stays).
- **Acceptance.** T21.1 novice in 15 steps or fewer and intermediate in 12 or fewer (new Min 6, H-37); both use Ctrl+N or the footer hint, not trial; axe: no `aria-required-parent` in the Start menu.
- **Severity** 3. **Findings** TH-23. **Files** `R/pages/DesktopPage.svelte`, `R/desktop/DesktopController.svelte.ts` (newChat), `R/kit/organisms/{StartMenu.svelte,StartMenu.ts,Taskbar.svelte}`, `R/desktop/shellRegions.ts`, `R/apps/explorer/ExplorerApp.svelte`, `manuals/{keyboard,desktop}.md`.

### UX-58 Launcher rows show a start error; the empty launcher says what you can do
- **Problem.** T14.1 novice: three of four rows read "Idle" and only the waiting row stood out; the broken-agent desktop ("Docs site") never shows an error although UX-06 specified it (the failure is only recorded after a connect). T01.1 novice: "Find out what you can do first" is not answered on the start screen.
- **Decision.** `LauncherService` checks the default agent command of each desktop when the launcher opens and every 30 s while it is open (`which`-style check, no process started) and stores `agentProblem` on the row. A row with a problem shows a red error icon and bold "The agent could not start", tooltip "Open the desktop, then Control Center > Agents, to change the command." The empty launcher text gets a second paragraph: "What you can do: plug in a project folder, ask the agent to read or change it, and approve each change yourself."
- **Acceptance.** T14.1 (scenario in H-39 asks which one has a problem): the novice names the error row; T01.1 novice says what they can do from the screen text.
- **Severity** 2. **Findings** TH-21. **Files** `M/application/launcher/LauncherService.ts`, `R/pages/LauncherPage.svelte`, `R/launcher/DesktopRow.svelte`, `shared/models.ts` (`LauncherDesktopDto.agentProblem`), `manuals/launcher.md`.

---

## WP-B Agent control, permissions, chat, failures

### UX-59 Resume continues the stopped step, and says so
- **Problem.** T11.3 novice failed (1 step, then gave up): "Resume agents" took the bar from Paused to Idle, the chat kept "Thought and used 1 tool" with a red X, and nothing said that the stopped step stays stopped. The R1 note (UX-16) lives in renderer memory (`stoppedByPause`), so it is missing when the desktop was paused by another window, before a reconnect, or by the harness.
- **Decision.** `DesktopService.setPaused(true)` saves the chats it cancels (migration 011, table `desktop_stopped_chats`). `Resume agents` sends each of them the message "Please continue where you stopped." as the user's message, marks it in the chat as "Resumed. Continuing where you stopped." and sets the bar to "Working: <chat title>". A chat the user does not want to continue gets the Stop button as before. The note and the Action Center line are built from the saved list, not from memory. Pause banner text stays "Paused: no agent will act until you resume." The Resume button reads "Resume agents and continue". After Resume with nothing to continue the bar says "Resumed. Nothing was stopped." and the balloon is dropped.
- **Acceptance.** T11.3 novice and intermediate: after one click on Resume the chat shows "Resumed. Continuing where you stopped." and a new turn finishes; the task passes in 3 steps or fewer without typing. The note appears also when the pause was made before the window opened (the `paused-desktop` start state pauses through the API, H-35).
- **Severity** 3. **Findings** TH-20. **Files** `M/application/desktop/DesktopService.ts` (setPaused block), migration `011_stopped_by_pause.ts`, `shared/desktop.ts`, `R/desktop/{TopBar.svelte,DesktopController.svelte.ts}`, `R/app/session/{SessionView.svelte,StopNotice.svelte}`, `manuals/{pause-stop-resume,chat}.md`.

### UX-60 "You are in control" and "Paused" are visible states with a way back
- **Problem.** T28.2 intermediate clicked Take over, the bar vanished, the chat still said Working and the Activity list grew for 8 more seconds; novice found no Take over and used Pause all agents (stops everything). `userInControl` is a hidden flag; the top bar only shows a checkbox "Ask before every action".
- **Decision.** One status area in the top bar, left of the buttons, always one of: "Agents are working", "Paused: no agent will act until you resume", "You are in control: the agent asks before every action", "Waiting for you". When `userInControl` is set (checkbox or the Browser's Take over, UX-68) the running step is cancelled at the next safe point (the agent stops reading; the Activity gadget shows "Stopped: you took control") and the bar button reads "Give control back". The chat status shows "Waiting for you" instead of "Working". The checkbox keeps its label "Ask before every action"; its tooltip reads "You decide on every action. The agent asks first, even for reading."
- **Acceptance.** T28.2 (checker also accepts `paused`, H-33): both levels end with the agent stopped and the chat not showing Working within 8 seconds; the intermediate's click gives visible feedback. T11.2 stays passing.
- **Severity** 3. **Findings** TH-20. **Files** `R/desktop/{TopBar.svelte,DesktopController.svelte.ts,activity.ts}`, `R/app/sessionStatus.ts`, `M/application/desktop/DesktopService.ts` (setUserInControl block), `M/application/SessionService.ts`, `manuals/pause-stop-resume.md`.

### UX-61 "Agent can use" chips say one thing in one format
- **Problem.** T10.1 (both): "Read files (off)" while Permissions says Allow; "Run commands (asks)" vs the row "Terminal (run commands)"; the chip opens Control Center when the user expected a toggle. T10.2 novice: "state by word for two items and by colour for the others". T19.1 intermediate: "Browser" with no suffix, no tooltip. T11.2: "(off)" and "(asks)" mixed. T16.1 novice: "could not tell that the chip is clickable".
- **Decision.** Chips are "Read files: Allow", "Write files: Ask", "Run commands: Off", "Browser: Allow", one pattern `<Name>: <Allow|Ask|Deny|Off>`. "Off" only means "not in use because no app that provides it is open" and the tooltip says so: "Run commands is Off because no Terminal is open. The setting is Allow. Click to change it." A chip with an Allow or Ask policy never reads "(off)" because of the open apps; the tooltip carries that. Every chip has a tooltip within 0.5 s: "<Name>: <state>. Click to change this in Control Center." Chips look like links: underline on hover and a pointer cursor. Names match the Permissions rows: the row "Terminal (run commands)" becomes "Run commands (Terminal)".
- **Acceptance.** T10.1 both levels: the answer names the chip text and it matches the Permissions row; T10.2 novice answers from one format; T19.1 intermediate reads "Browser: Allow".
- **Severity** 3. **Findings** TH-25. **Files** `R/desktop/{TopBar.svelte,activity.ts}`, `R/apps/control-centre/{PermissionsPage.svelte,permissionsTable.ts}`, `manuals/{control-centre,approvals}.md`.

### UX-62 Permission dialog: keyboard
- **Problem.** T21.1: the dialog opens with Deny focused; both panelists found Allow with Shift+Tab. Deny is the safe default (R1 UX-17 stays) but the keys are not shown.
- **Decision.** Deny keeps the initial focus. Buttons carry access keys: "&Allow" (Alt+A) and "&Deny" (Alt+D), underlined when Alt is held, and Left and Right move between the two. A 12 px hint line under the buttons: "Press Alt+A to allow or Alt+D to deny." The result is announced in the chat (role status): "You allowed: Write NOTE.md." or "You denied: Write NOTE.md."
- **Acceptance.** T21.1: both panelists answer Allow by key without searching; the chat shows the "You allowed" line (feedback, D9).
- **Severity** 2. **Findings** TH-23. **Files** `R/app/session/PermissionDialog.svelte`, `R/desktop/UacDialog.svelte`, `R/app/session/permissionOptions.ts`.

### UX-63 Failure recovery: the cause, one action, no loops
- **Problem.** T17.2 novice (9 of 9, SEQ 3): the modal "The agent could not start" covered the chat's "Details..." (click did nothing); "Try again" kept the broken agent after the default changed; Ctrl+N did nothing. T23.1 novice (5 of 12, SEQ 4): "Restart and send again" gave the same buttons each time; the novice sent three times.
- **Decision.**
  - The "agent could not start" dialog never covers the chat's own buttons: it is a non-modal banner in the chat with "Open Agents" and "Choose another agent" ("Details" opens inline).
  - "Try again" restarts with the current default agent of the desktop. If the default changed since the failure, the button reads "Try again with Claude Code" (the new agent's name).
  - After a second failure of the same chat the banner adds the cause line from the last event: "It stopped again: <plain cause>. Show in Event Viewer shows the details." and the button "Restart and send again" is replaced by "Start a new chat" next to it. The restart shows "Restarting the assistant..." with progress, then "The assistant is running again."
  - The resent message is not added to the transcript a second time (one "You" row).
- **Acceptance.** T17.2 novice in 9 steps or fewer without reaching the dead "Details..."; both levels name the command and say what to do (edit the agent or choose another). T23.1 novice finishes after one "Restart and send again" and does not send three times.
- **Severity** 3. **Findings** TH-24. **Files** `R/app/session/{ErrorRow.svelte,SessionView.svelte,chatProblem.ts}`, `R/desktop/DesktopController.svelte.ts`, `R/kit/organisms/MessageBox.svelte` and `messageBox.ts` (owner WP-B), `M/application/{SessionService.ts,SessionProblems.ts,agentProblems.ts}`, `manuals/{agent-does-not-start,chat}.md`.

### UX-64 "Used N tools" and agent replies in plain words
- **Problem.** T28.1 (both): the chat shows "Used 28 tools" collapsed; the reply "DONE 1 match ... [10] listitem" is technical. T27.1 novice: the reply echoes the question (harness script, H-38; the product part is that "Short answer:" appears as an answer to a selection question).
- **Decision.** The collapsed group reads "Worked in the Browser: 28 steps" with the first and last step in plain words ("Opened the chat page", "Read the page 24 times", "Typed in the message box") and expands to the same plain titles (R1 UX-31 mapping extended for `browser_*` tools). The agent's own text is shown as sent; Agent7 adds nothing technical. Tool names and element numbers appear only under "Details".
- **Acceptance.** T28.1 novice and intermediate answer "what it did there" from the chat without opening Details.
- **Severity** 2. **Findings** TH-28. **Files** `R/app/session/{ActivityGroup.svelte,toolTitles.ts,toolSummary.ts,transcriptRows.ts}`, `manuals/chat.md`.

### UX-65 The "New messages" pill never hides the newest message
- **Problem.** T23.1 novice (shot 033): the pill "New messages. Click to go to the end." covered the last message and the panelist did not scroll; the final reply was not confirmed. After a restart the transcript is not scrolled to the end.
- **Decision.** After a restart, a send, or a finished turn the transcript scrolls to the end unless the user scrolled up; if they did, the pill sits above the composer, not over the transcript text, and reads "Newer messages below. Click to see them."
- **Acceptance.** T23.1 novice reads the last message without scrolling; no screenshot shows the pill over text.
- **Severity** 2. **Findings** TH-24. **Files** `R/app/session/Transcript.svelte`.

### UX-66 The chat pane says where it works; a separate chat is one visible step
- **Problem.** T04.1 novice failed: the Chat pane in Code opened with "Chat pane / Ready", no folder, and the novice took it for the conversation. T27.1 novice: the collapsed "Chat" strip "is easy to miss and does not say it opens a panel". T19.1 novice: the Chat tab at the Browser edge "is small and easy to miss".
- **Decision.** The pane header reads "Chat about <folder> (E:)" with the link "Open as a chat window". The collapsed strip reads "Chat" with a chevron and the tooltip "Open the chat pane: ask about what you are looking at". The empty pane text: "Ask about what you are looking at. This is a quick pane: it ends when you close the window. For a chat that you can come back to, use Start > New chat." Code's File menu gets "New chat  Ctrl+N" (UX-57). The strip is 28 px wide (was about 20).
- **Acceptance.** T04.1 novice opens a separate chat window in 12 steps or fewer without taking the pane for it; T27.1 novice finds the strip in one step.
- **Severity** 2. **Findings** TH-21. **Files** `R/apps/shared/EmbeddedChat.svelte`, `R/desktop/AppChatPane.svelte`, `R/app/session/SessionHeader.svelte`, `manuals/embedded-chat.md`.

### UX-67 Permissions page: the "What it covers" column is readable at default size
- **Problem.** T16.2 novice: "The 'What it covers' column is cut off, so I had to rely on the header text"; the Notepad rule was hard to find in one place.
- **Decision.** At the default Control Center size the table has two lines per row (name and state on line 1, "What it covers" wrapped on line 2); no horizontal scroll. The Notepad row reads "Notepad: open and read documents. Saving a file uses Write files." The page header sentence stays.
- **Acceptance.** T16.2 both levels answer from one screen without scrolling; T06.3 and T16.1 stay passing.
- **Severity** 2. **Findings** TH-25. **Files** `R/apps/control-centre/{PermissionsPage.svelte,permissionsTable.ts}`, `manuals/control-centre.md`.

---

## WP-C Browser, web tasks, agent surfaces

### UX-68 The "Agent is using this page" bar stays while the agent works; Take over answers
- **Problem.** T28.2 novice never saw the bar (the web-app-busy preset reads the page; the bar closes 8 s after the last navigate, click or type announce, `ACTIVITY_MS` in `BrowserApp.svelte`, while `browser_read` does not announce). T28.2 intermediate clicked Take over, the bar vanished before or as the click landed, the state stayed false (my rerun: the click missed, the API call works). F-006 predicted it. The preset comment says the bar stays 2.5 s.
- **Decision.** The bar stays for as long as the desktop has a running turn that used the Browser in the last 20 s, and the main process announces every `browser_*` tool, reads included ("Reading the page"). The Take over button is fixed at the right of the bar and never moves. After a click it reads "Taken over" (disabled) and the bar text changes to "You have control of this page. The agent stops and asks before it uses the page again." with the button "Give control back". Top bar state follows (UX-60).
- **Acceptance.** T28.2 both levels: the bar is on screen at every screenshot during the job and one click on Take over ends the agent's actions (state `userInControl` true, bar shows "Taken over"); `browser-slow` keeps it up for its full minute.
- **Severity** 3. **Findings** TH-20, F-006. **Files** `R/apps/browser/BrowserApp.svelte`, `M/application/tools/browserTools.ts`, `manuals/browser.md`.

### UX-69 Error page advice matches the error
- **Problem.** T19.2 both: ERR_UNSAFE_PORT page says "check that your computer is online" and Refresh does nothing; T29.1 both: ERR_CONNECTION_REFUSED with "The website did not answer." and no next step; the Help link opens the top of the manual.
- **Decision.** Hints by error code (`FAILURE_HINTS` in `pageStatus.ts`):
  - `ERR_UNSAFE_PORT`: "This address uses a port that the Browser blocks. Check the number after the colon in the address (here :9), or ask whoever gave you the address for another one." No "check that your computer is online".
  - `ERR_CONNECTION_REFUSED`: "Nothing is listening at this address. Check the address, or start the program that serves it. Refresh will only work after that."
  - `ERR_NAME_NOT_RESOLVED`: "The name of the website was not found. Check the spelling, then check your network."
  - `ERR_INTERNET_DISCONNECTED` / timeout: "Check that your computer is online, then click Refresh."
  The page shows the address in an edit box "Try another address:" with a Go button. The Help link opens Browser Help at the section "6 - Troubleshooting" (anchor, UX-80).
- **Acceptance.** T19.2 both levels state the real cause (blocked port) and what to do; T29.1 (after H-28) novice reads a next step; Help lands on Troubleshooting.
- **Severity** 3. **Findings** TH-26. **Files** `R/apps/browser/{ErrorPage.svelte,pageStatus.ts,BrowserApp.svelte}`, `manuals/browser.md`.

### UX-70 The Browser says whether the assistant can see the page
- **Problem.** T19.1 novice failed and intermediate guessed: no sign that the assistant has the page; chip "Browser" without suffix; the Chat tab replies could not confirm it.
- **Decision.** The Browser status bar gets a segment "Assistant: can see this page" (Allow), "Assistant: asks first" (Ask) or "Assistant: cannot see pages" (Deny); its tooltip: "The assistant can read the page that is open here. Change this in Control Center > Permissions > Browser." While the agent reads, the segment reads "Assistant: reading". The Chat pane header in the Browser says "Chat about this page".
- **Acceptance.** T19.1 novice and intermediate say "the assistant can see this page" from the status bar and pass (needs H-40: the chat replies must not say "No scripted rule matches").
- **Severity** 3. **Findings** TH-21. **Files** `R/apps/browser/BrowserApp.svelte`, `R/apps/shared/EmbeddedChat.svelte` (header prop only), `manuals/browser.md`.

### UX-71 Plain words for what the agent does in the page
- **Problem.** T28.1 intermediate and novice: the bar says "Typing into [6]"; the Activity list "Read the page" 7 times; chat reply with "[10] listitem".
- **Decision.** Activity labels use the element's name: "Typing into the message box", "Clicking the button 'Send'", "Reading the page". The driver returns the accessible name of the target; the element number stays under Details. The Activity gadget collapses repeats: "Read the page (24 times)".
- **Acceptance.** T28.1 both levels describe what the agent did from the bar and gadget; no `[n]` in the bar.
- **Severity** 2. **Findings** TH-28. **Files** `M/application/tools/browserTools.ts`, `M/infrastructure/browser/*`, `R/desktop/{Gadgets.svelte,activity.ts}` (WP-B file `activity.ts` edited by WP-C only for the repeat collapse; rebase), `manuals/browser.md`.

### UX-72 Agent surfaces: open in front, say what they are
- **Problem.** T18.1 novices: the sidebar surface "Notes" was hard to find; the window "Board" behind the chat; the grey "Ann" hint read as typed text; "Show" did nothing (UX-55 fixes the raise).
- **Decision.** The chat card names the surface by purpose and says where it is: "The assistant opened a form: Your name. It is in the window 'Board'. [Show]" / "...in the sidebar 'Notes'. [Show]" / inline needs no line. Surface windows are titled "<purpose> - from the assistant". Placeholder text in form fields is grey italic with the label "Example:" ("Example: Ann"), never the same style as typed text. After Send the form shows "Sent. The assistant answered: ..." for 3 seconds.
- **Acceptance.** T18.1 inline, sidebar and window: novice 9 steps or fewer each, no panelist reports looking for the form or typing over the hint.
- **Severity** 2. **Findings** TH-30. **Files** `R/app/session/{SurfaceRow.svelte,surfaceRow.ts}`, `R/apps/surface/SurfaceApp.svelte`, `R/a2ui/components/*`, `M/application/A2uiService.ts`.

### UX-73 Terminal: typing gives feedback
- **Problem.** T31.2 novice typed "dir" and got no text and no error; the read-only note was only in the status bar.
- **Decision.** A key press in the Terminal shows a one-line notice at the bottom of the black area for 4 seconds: "Read-only: the agent runs the commands here. You can watch but not type. Ask the agent in Chat to run a command." The cursor is a block with a lock-style outline.
- **Acceptance.** T31.2 novice answers without opening Help or in 4 steps or fewer.
- **Severity** 1. **Findings** TH-29. **Files** `R/apps/terminal/*`, `manuals/terminal.md`.

### UX-74 Browser tab strip: roles and target size
- **Problem.** axe: Browser `aria-required-children` (critical, `.tabrow` has a button child), tab close button 16 x 16 px.
- **Decision.** The tab strip is a `tablist` containing only `tab` elements; the + button and the close buttons sit outside the list or as `tab` children with a 24 x 24 px hit area (visual size unchanged).
- **Acceptance.** axe: no violation in the Browser state.
- **Severity** 2. **Findings** TH-31 (accessibility). **Files** `R/apps/browser/{BrowserApp.svelte,BrowserTab.svelte}`.

---

## WP-D Code, review, Help, accessibility

### UX-75 Closing panels gives the file the room; the chat collapse control is clear
- **Problem.** T27.2 failed for both levels (3 of 3 steps): the chat pane collapsed with a small unlabelled ">" (novice and intermediate), then Changes, Git and Management were closed one by one; the file stayed in a column about 320 px wide with an empty grey area beside it. The goal "make the file use the whole window" was not reachable.
- **Decision.** The editor area always fills the width that the open panels leave. When no panel is open, the file uses the whole client area (no fixed width, no grey area). The Code window gets View > "Focus on the file" (Ctrl+Shift+F) that hides every panel in one step and "Show all panels" to restore. The chat collapse control is a 24 x 24 px button with the chevron and the label "Hide chat" (tooltip), and the collapsed strip reads "Chat" (UX-66).
- **Acceptance.** T27.2 both levels in 3 steps or fewer, and the editor width is at least 90 percent of the window client width in the final screenshot (checker, H-26); the window offers the way back.
- **Severity** 3. **Findings** TH-22. **Files** `R/apps/code/{CodeApp.svelte,DockPane.svelte}`, `manuals/code.md`.

### UX-76 Adding a review comment is visible
- **Problem.** T26.2 both: "click the line text, double-click, right-click, hover: nothing"; only the line number works, found by F1 (novice 12 of 15, SEQ 4; intermediate 7 of 15). "Minor" is preselected silently.
- **Decision.** Hovering a line shows a blue "+" in the gutter next to the number (24 x 24 px, tooltip "Add a comment on line 2"); clicking the "+", the number, or choosing "Add comment on this line" from the right-click menu (also Ctrl+Alt+M with a line selected) opens the comment box. The box shows "Severity:" with the list "Blocker, Major, Minor, Nit" and a line under it: "Minor is the usual choice for a suggestion. Use Blocker only when the change must not be accepted as it is." The default stays Minor but is shown selected with this line. Double-click on a line also opens the box.
- **Acceptance.** T26.2 both levels in 8 steps or fewer with no dead-end click; the panelist can say what the severity default means.
- **Severity** 3. **Findings** TH-21. **Files** `R/apps/code-review/{ReviewDiff.svelte,ReviewComposer.svelte,CodeReviewApp.svelte}`, `manuals/code-review.md`.

### UX-77 Review: one number format, send next to the count
- **Problem.** T25.2 novice: "Two comments" in the verdict bar, "Comments (2)" on the button, status bar "2 files" with one file shown. T26.1 novice: the send button is only inside a small panel opened from the count link; "Ask the agent to review..." sounds like the right button.
- **Decision.** Numbers are digits everywhere in the window: "Changes requested. 2 comments, 1 is a blocker." The status bar says "2 files changed, 1 shown" when one file is open. A button "Send comments to chat..." sits next to "Comments (2)" in the toolbar. "Ask the agent to review..." is renamed "Start a new review...".
- **Acceptance.** T25.2 novice answers with "2" without translating; T26.1 novice in 3 steps or fewer; no label with a number in words.
- **Severity** 2. **Findings** TH-31. **Files** `R/apps/code-review/{CodeReviewApp.svelte,ReviewComments.svelte,SendToChatDialog.svelte,reviewModel.ts}`.

### UX-78 Git list: double-click opens the clicked file's diff
- **Problem.** T24.1 novice: double-clicking redirect.ts in the Git list opened login.ts in Code Review (wrong file); "Git (3)" was not explained.
- **Decision.** Double-click or Enter on a row opens Code Review on that file (the selected row's path, not the first row). The tab tooltip reads "Git: 3 files with changes that are not saved in version control". Rows show "+ lines / - lines" counts. The first row is not auto-selected.
- **Acceptance.** T24.1 novice and intermediate open the right file in 5 steps or fewer; unit test for the row to path mapping.
- **Severity** 3. **Findings** TH-27. **Files** `R/apps/code/{CodeApp.svelte,gitModel.ts}`.

### UX-79 The Changes list refreshes when a change is reverted anywhere
- **Problem.** My T09.1 run: after the harness reverted redirect.ts through `sessions.revertChange`, the chat still showed "Changes (2)" and both files Modified; T09.1 novice: "the Changes panel did not show that anything was reverted". T08.2 novice: names cut ("redirect" without `.ts`) and the counts column off screen.
- **Decision.** `SessionService.revertChange` publishes `session.changes` and every open Changes list (chat pane, Code Agent changes, Code Review) refreshes at once; a reverted row shows "Reverted. Restore from the Recycle Bin" with a link "Open Recycle Bin". The list shows the full file name (ellipsis in the middle, tooltip with the path) and the counts column is always visible (the file column shrinks).
- **Acceptance.** T09.1 novice 7 steps or fewer without relying on the earlier box; T08.2 novice reads the count of every file without maximizing.
- **Severity** 2. **Findings** TH-27. **Files** `R/app/shell/ChangesPane.svelte`, `R/app/changes/*`, `M/application/SessionService.ts` (one publish line; WP-B owns the file, additive), `manuals/{chat,recycle-bin}.md`.

### UX-80 Help: results open the section, links land on it, keys work
- **Problem.** T22.2 novice: clicking the search result "Using Chat" did not move the page; scrolling was slow. T19.2 intermediate: the Help link lands at the top of a long manual. T02.2 novice: F1 opened Help behind the New desktop dialog. T21.1: F1 does not move the keyboard focus into Help; Esc does not close it (Alt+F4 did).
- **Decision.** Search results are links to a section; click or Enter scrolls to it and highlights the matched line for 2 seconds. Contents links and in-app Help links (Browser error page, UX-69) use the section anchor. The Help window opens in front of any dialog and takes the keyboard focus (the search box). Esc closes Help when no text is selected; the window returns focus to the window that was active. Page Down scrolls a page.
- **Acceptance.** T22.2 novice in 8 steps or fewer, opening the section by one click on the result; T21.1 shows Help focused after F1 and closed by Esc; T19.2 Help lands on Troubleshooting.
- **Severity** 3. **Findings** TH-29. **Files** `R/apps/help/{HelpApp.svelte,helpModel.ts,helpMarkdown.ts,helpTopics.ts}`, `R/kit/organisms/MarkdownView.svelte`.

### UX-81 Help content: saving, undo and keys
- **Problem.** T31.1 (both): the save answer is one sentence under Common Tasks and does not cover a new file; T22.2 novice: the text says "undo" but not the Revert button; T22.1 novice did not know Help was where to ask; T21.1: the keyboard topic exists (`manuals/keyboard.md`) but F1 on the desktop never reached it.
- **Decision.** `manuals/notepad.md` gets a heading "Saving a file" with: "To save a change, press Ctrl+S. Save works only for a file that has a name. To save a new file, Notepad cannot do it yet: open the file from Explorer first." (matches the product, which has no Save As). `manuals/chat.md` Common Tasks gets "Undo a change of the agent: 1. Click Changes. 2. Select the file. 3. Click Revert. 4. Click Yes. To get it back, open the Recycle Bin and click Restore this item." F1 on the desktop with no app focused opens the "Keyboard" topic. The Explorer toolbar "Plug in a project..." tooltip ends with "Press F1 for more.". The search ranks the topic of the focused app first.
- **Acceptance.** T31.1 novice finds a heading in 1 click; T22.2 novice reads the Revert steps in the topic; `check-help-coverage` green.
- **Severity** 2. **Findings** TH-29. **Files** `manuals/{notepad,chat,keyboard,explorer,help,index}.md`, `R/apps/help/helpTopics.ts`.

### UX-82 "Initialize Git here" asks first
- **Problem.** T24.2 novice: "'Initialize Git here' is a step I would not take without asking, since it changes the folder"; "git init" is jargon.
- **Decision.** The Git tab text: "This folder is not tracked with Git, so there are no change marks. Git is a way to keep the history of a project. You can turn it on here; this adds a hidden folder named .git and does not change your files." Button "Turn on Git here..." opens a confirmation with "Turn on" and "Cancel" (Cancel default).
- **Acceptance.** T24.2 novice states the reason in 2 steps; no panelist presses the button by accident (confirm dialog).
- **Severity** 1. **Findings** TH-31. **Files** `R/apps/code/{CodeApp.svelte,gitModel.ts}`.

### UX-83 Accessibility sweep, round 2
- **Problem.** axe (this round): `target-size` on the inactive caption buttons (29 x 19 px) of every desktop window; WordPad `label-content-name-mismatch` ("Numbered list"); Paint `target-size` (24 nodes, 62 x 17 px) and `scrollable-region-focusable`; Sticky Notes `aria-required-children` (`.list`); Help links 15 px high; Code Review and Code pane `target-size`; Notepad About and context menu `target-size`. The UAC dialog scan failed (H-45).
- **Decision.** `CaptionButtons.svelte`: hit area 29 x 24 px (visual size unchanged, transparent padding). Paint size buttons 24 px high with spacing. WordPad: the visible text is part of the accessible name. Sticky Notes list: `list` with `listitem` children. Help links: padding to 24 px line height. Code Review and the Code pane: 24 px hit areas. Menu items: 24 px minimum height. Re-run `axe-scan.mjs` with the UAC state fixed.
- **Acceptance.** axe scan: zero violations in all 27 states; UAC dialog scanned.
- **Severity** 2. **Findings** TH-31. **Files** `R/kit/molecules/CaptionButtons.svelte`, `R/kit/organisms/{MenuStrip,ListView,TabControl}.svelte`, `R/apps/{wordpad,paint,sticky-notes,help,code-review,notepad}/*`, `R/kit/tokens.css`.

---

## Final

### UX-84 Measure performance (D10)
- **Decision.** A script `scripts/ux-panel/perf.mjs` (harness owner) records on the reference machine: input response, window open, launcher to interactive, desktop connect, scroll at 2,000 rows with 6 windows, longest main-thread task during streaming. Results go into `scorecard.md` with the machine description. Until then D10 stays at 8.
- **Acceptance.** Every target in `rubric.md` D10 met or a written reason accepted by the UX lead.
- **Severity** 1. **Files** `scripts/ux-panel/perf.mjs` (new).

### UX-85 Wording sweep, round 2 (after WP-A to WP-D)
- **Decision.** One vocabulary: "Eject" in menus reads "Eject (remove from this desktop)"; "C: drive" in the delete dialog reads "its private C: drive (files made on this desktop)"; "Plugged-in project" is "Project folder (plugged in)" everywhere; Explorer shows "Text document (Markdown)" for `.md`; the Notepad About line reads "Notepad, part of Agent7 version 0.1.0"; the Event Viewer details lead with the plain sentence, event names (ACP, AG-UI, `fs/read_text_file`) go under "Technical details"; "Scripted long-turn" in the Task Manager reads "Agent program (Scripted long-turn)"; the Chat window File > Close tooltip reads "Close this window. The assistant keeps working."
- **Acceptance.** `grep -rniE "plugged-in project|\\bC: drive\\b|two comments|Markdown document" src manuals e2e` returns nothing user visible; novices do not report these terms.
- **Severity** 1. **Files** all; single developer.

---

## Coverage of the round 2 findings

TH-18 UX-51, UX-53. TH-19 UX-52. TH-20 UX-59, UX-60, UX-68. TH-21 UX-58, UX-66, UX-70, UX-76. TH-22 UX-75. TH-23 UX-57, UX-62, UX-80. TH-24 UX-63, UX-65. TH-25 UX-61, UX-67. TH-26 UX-69. TH-27 UX-78, UX-79. TH-28 UX-64, UX-71. TH-29 UX-73, UX-80, UX-81. TH-30 UX-55, UX-56, UX-72. TH-31 UX-54, UX-74, UX-77, UX-82, UX-83, UX-85.

Task to item map (failed or weak tasks): T02.1 UX-51. T02.2 UX-51, UX-54. T03.1 UX-53. T04.1 UX-66. T09.1 UX-79. T10.1/T10.2 UX-61. T11.3 UX-59. T12.2 UX-52, UX-51. T14.1 UX-58. T17.2 UX-63. T18.1-window/T18.2 UX-55, UX-72. T19.1 UX-70, UX-61. T19.2 UX-69, UX-80. T21.1 UX-57, UX-62, UX-80. T22.1 UX-81. T22.2 UX-80, UX-81. T23.1 UX-63, UX-65. T24.1 UX-78. T24.2 UX-82. T25.2 UX-77. T26.2 UX-76. T27.1 UX-64, UX-66. T27.2 UX-75. T28.1 UX-64, UX-71. T28.2 UX-60, UX-68. T29.1 UX-69. T30.x UX-85. T31.1 UX-81. T31.2 UX-73.

## Rerun plan

After the harness fixes (H-23 to H-46) and the packages above: rerun at novice and intermediate every row that is FAIL, INVALID or weak in `panel/r2/SYNTHESIS.md` (T02.1, T02.2, T03.1, T04.1, T11.3, T12.2, T17.2, T19.1, T19.2, T21.1, T22.1, T23.1, T24.2, T27.2, T28.2, T29.1), the carried intermediate rows whose start state changed (T02.1, T02.2, T12.2: they were run with the native folder stub), and every task of J02, J03, J11, J12, J18, J19 and J26 to J29, with fresh panelists. Then the full pass at both levels on the packaged build for the release gate.
