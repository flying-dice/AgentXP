# Agent7 UX fix backlog (round 1 design response)

Source: `panel/r1/SYNTHESIS.md` (themes TH-01 to TH-17, harness defects H-01 to H-22), `findings.md` F-001 to F-048. Target: 10/10, so severity 1 items ("polish") are included. Severity is Nielsen 1 to 4 (1 = polish). Windows 7 terms and the vocabulary in `docs/DOCUMENTATION_STYLE.md` apply (chat, desktop, drive, pane, dialog box; American spelling in new copy; the global rename to "Control Center" is UX-50). Do not change harness files here: those fixes are listed in SYNTHESIS section 4.

All paths below are under `src/` and the renderer lib root `R = src/renderer/src/lib`.

## Work packages

| WP | Name | Items | Files owned (edit freely) |
|---|---|---|---|
| WP1 | Desktops and projects | UX-01 to UX-12 | `R/launcher/*`, `R/pages/LauncherPage.svelte`, `R/apps/explorer/*`, `R/desktop/{DesktopSurface,WindowLayer,AppWindowFrame,UsbTray,AutoPlayDialog,Balloon,WelcomeDialog,ConnectionBar}.svelte`, `R/kit/organisms/{StartMenu,Taskbar}.svelte`, `shared/desktop-views.ts`, `main/application/launcher/LauncherService.ts`, `main/ipc/{ElectronDialogs,DesktopWindowManager,createDesktopWindow}.ts`, new `R/kit/organisms/FolderBrowserDialog.svelte`, `manuals/{launcher,desktop,explorer}.md` |
| WP2 | Agent control, permissions, approvals | UX-13 to UX-20 | `R/desktop/{TopBar,UacDialog,TrayFlag,PermissionInbox,approval}*`, `R/app/session/PermissionDialog.svelte`, `R/kit/organisms/{ActionCenter,AboutDialog}.svelte`, `R/apps/control-centre/*`, `R/app/options/*`, `main/application/{PermissionBroker.ts,desktop/DesktopService.ts}`, `main/index.ts` (version), new `R/app/session/toolTitles.ts`, `manuals/control-centre.md` |
| WP3 | Chat, errors, browser, agent tools | UX-21 to UX-36 | `R/app/session/*` (except PermissionDialog), `R/apps/chat/*`, `R/apps/shared/{EmbeddedChat.svelte,contextItems.ts}`, `R/desktop/{AppChatPane,NewChatDialog,Gadgets}.svelte`, `R/a2ui/*`, `R/apps/surface/*`, `R/apps/browser/*`, `R/apps/{agent-manager,event-viewer,terminal}/*`, `R/app/sessionStatus.ts`, `R/agui/*`, `main/application/{SessionService,SessionRuntime,AgentConnectionPool}.ts`, `manuals/{chat,embedded-chat,browser,surface,event-viewer,agent-manager,terminal}.md` |
| WP4 | Code, changes, review, Help, accessibility | UX-37 to UX-49 | `R/apps/{code,code-review,recycle-bin,help,notepad,wordpad,paint,snipping-tool,sticky-notes}/*`, `R/app/shell/{ChangesPane,TasksPane,FileTree}.svelte`, `R/app/changes/*`, kit sweep: `R/kit/atoms/*`, `R/kit/organisms/{MenuStrip,TabControl,SplitContainer,ListView,TreeView,DataGridView,Dialog,DiffViewer}.svelte`, `R/kit/tokens.css`, `manuals/{code,code-review,recycle-bin,help,notepad,...}.md` |
| final | Global sweep | UX-50 | everything; one developer, after WP1 to WP4 are merged |

WP1 to WP4 can run in parallel. Their file sets do not overlap except the files below.

**Shared files to watch (small, additive edits only; merge in the order WP1, WP2, WP3, WP4 or rebase often):**
- `R/desktop/DesktopController.svelte.ts`, `R/pages/DesktopPage.svelte`: WP1 owns; WP2 (ask-first, pause) and WP3 (new chat, newChatIn, error handling) add methods in separate blocks.
- `shared/ipc.ts`, `shared/ipc-channels.ts`, `main/ipc/createApi.ts`, `R/app/fakeApi.ts` (and `fakeDesktop.ts`, `fakeLauncher.ts`): each WP adds its own channels in its own block (WP1 `fs.browse`, WP2 `desktop.askFirst`, WP3 `sessions.retry`/`restartAgent`, WP4 `review.start`).
- `R/kit/organisms/MessageBox.svelte` and `messageBox.ts`: owner WP3 (adds an optional action button); WP1 and WP2 only call it.
- `R/kit/tokens.css`: WP4 only (contrast, UX-48). Three one-line colour edits in WP3 and WP2 files (`AgentMessage.svelte` author label, `ActionCenter.svelte`) are done by WP4 with a rebase.
- `R/apps/shared/contextItems.ts`: WP3 owns; `ExplorerApp.svelte` (WP1) and `CodeApp.svelte` (WP4) consume it.
- `R/apps/code/CodeApp.svelte` embeds `EmbeddedChat.svelte`: WP4 changes the layout in CodeApp, WP3 changes EmbeddedChat internals.
- `shared/desktop-views.ts` `DEFAULT_BOUNDS`: only UX-10 (WP1) edits it. UX-14, UX-35, UX-41 state sizes they want; WP1 sets them.
- `R/apps/registry.ts`, `shared/desktop.ts`: touched by nobody unless an app is added.
- `manuals/*.md`: each WP edits only its own apps' manuals; `scripts/check-help-coverage.mjs` must stay green after each merge.

---

## WP1 Desktops and projects

### UX-01 In-app "Browse For Folder" dialog (replaces the native folder picker)
- **Decision on the native dialog.** Native dialogs are real windows, so on a plain Windows install the user sees the Open Folder dialog and "no response" in T12.2 was a harness artefact (`eject-mid-job` is the only start state that neither stubbed the picker nor could show an OS window in a screenshot). The product still changes, for three reasons. (1) Agent7 is a self-contained Windows 7 desktop. A native dialog is an OS window outside the desktop, unstyled on Linux, can open behind the desktop window on a remote or virtual display, and freezes the desktop with no sign of why. (2) The user and the panel cannot see it in verification (H-11), so "Browse..." and "Plug in a project..." cannot be tested honestly. (3) Keyboard-only use (T21.1) needs a dialog inside the focus model.
- **Design.** A kit dialog `FolderBrowserDialog`, Win7 "Browse For Folder": title "Browse For Folder"; instruction line "Select a folder for the agent to work on." (New desktop) or "Select the project folder to plug in to this desktop." (Plug in); a tree with "Computer" at the root (drives or `/`, Home, Documents, Desktop as shortcuts), folders only, lazy expanding, folder icons; a "Folder:" text box that follows the selection and accepts a typed path; buttons "Make New Folder", "OK" (default), "Cancel"; resizable, min 380 x 420; Esc cancels; Enter on a tree item expands it; the OK button is disabled until a folder is selected. While the list loads: status text "Opening the folder list..." and the wait cursor. Main process: a `FolderBrowser` port listing directories (name, hasChildren) behind a new `fs.browse(path)` IPC; `ElectronFolderPicker` stays only as a fallback behind the setting `AGENT7_NATIVE_PICKER=1`.
- **Acceptance.** T02.1, T03.1, T02.2 and T12.2 can be run without any stub: the panelist sees the dialog in screenshots and selects `login-app` by keyboard and mouse. Dialog operable with keys only. Harness H-11 closed.
- **Severity** 3. **Findings** TH-12, F-045 (context). **Files** new `R/kit/organisms/FolderBrowserDialog.svelte` (+ story), `R/launcher/NewDesktopDialog.svelte`, `R/apps/explorer/{ExplorerApp,ComputerView}.svelte`, `R/desktop/DesktopController.svelte.ts`, `main/ipc/ElectronDialogs.ts`, `main/application/ports.ts`, `main/compose.ts`, `shared/ipc.ts`, `shared/ipc-channels.ts`, `main/ipc/createApi.ts`, `R/app/fakeApi.ts`.

### UX-02 Plug in a project: feedback, duplicates, plug in again
- **Problem.** No visible reaction to Plug in (T12.2 x3, T03.1 intermediate, novice). No hint after Cancel, none when the folder is already plugged in, no easy way back after an eject.
- **Decision.** After OK: the new drive appears selected in Computer, the AutoPlay box opens as today, and a tray balloon says "login-app (E:) is ready to use." (title "Project plugged in"). If the folder is already plugged in: message box "login-app is already plugged in as drive E:." with the drive selected. On error: message box "Could not plug in 'login-app'. {reason}" with OK. Computer shows a group "Recently removed" under Devices with Removable Storage with the last three ejected projects; right-click or the toolbar button "Plug in again" re-plugs without a dialog. A balloon after Eject adds the line "To use it again, open Computer and choose Plug in a project...".
- **Acceptance.** T12.2 (rerun, after H-11): the folder is plugged in again within 18 steps by all three levels. T03.1 novice finds Plug in from the Code window within 15 steps (with UX-38). F-046 metaphor explained in UX-05.
- **Severity** 3. **Files** `R/apps/explorer/{ExplorerApp,ComputerView,explorerModel}.ts/svelte`, `R/desktop/{Balloon,UsbTray,AutoPlayDialog}.svelte`, `R/desktop/DesktopController.svelte.ts`.

### UX-03 Eject (remove a project) where users look
- **Problem.** Eject exists only in Computer (selected drive) and the tray; 2 of 3 failed T12.1; the Code tree offers Cut/Copy/Paste on a drive (see UX-38 for the Code tree).
- **Decision.** (a) In Computer and in Explorer's drive nodes, right-click on a project drive shows: "Open", "Start a chat here", "Eject" (mnemonic E), "Properties". (b) The USB tray icon gets the tooltip "Safely Remove Hardware: 1 project plugged in" and, on click, lists "Eject login-app (E:)" as the first entry; the tray icon is always shown while a project is plugged in. (c) Start menu: under "Computer" add "Eject a project..." that opens the tray list. (d) Drive label in Computer: "Plugged-in project" becomes "Project folder (plugged in)". (e) The Eject confirmation balloon text: "Safe To Remove Hardware. login-app (E:) can now be removed. Its files on disk were not changed."
- **Acceptance.** T12.1 within budget (6 or 8) for novice and intermediate; expert 2 steps. F-045 partly.
- **Severity** 3. **Files** `R/apps/explorer/{ExplorerApp,ComputerView,explorerContext}`, `R/desktop/UsbTray.svelte`, `R/kit/organisms/StartMenu.svelte`.

### UX-04 New and Rename desktop: name check while typing
- **Problem.** Duplicate name error only after Create; no suggestion; no reason (T02.2 x3).
- **Decision.** Check on every key. Under the Name box in red, with an error icon: "A desktop named 'Fix login redirect' already exists. Each desktop needs its own name so that you can tell them apart." and a link-style button "Use 'Fix login redirect (2)'" that fills the name. Create stays disabled while the name is empty or taken. The same in Rename desktop. The Name box keeps its selection when the dialog opens.
- **Acceptance.** T02.2: message shown before Create is pressed and the user finishes in 21 steps or fewer.
- **Severity** 2. **Files** `R/launcher/{NewDesktopDialog,RenameDesktopDialog}.svelte`, `R/launcher/launcherModel.ts`.

### UX-05 Launcher copy: define "desktop", drop USB jargon, one noun
- **Decision.** Empty text: "No desktops yet. A desktop is a workspace where an agent works on your projects. Click New... to create one." (F-011). Intro line: two sentences: "Closing a desktop window only disconnects it. Its agents keep running." (F-032). In New desktop: label "Projects to plug in as USB drives" becomes "Project folders the agent can use (they appear as drives)". Product noun is "desktop" everywhere; the Workspace bar shows the desktop's own name (no word "Workspace" as a title) and manuals add a glossary line "Desktop (also called a workspace)". Delete dialog keeps its text, adding "Plugged-in projects are removed from this desktop; the folders and files stay on your disk." (replaces "ejected"; T15.1 novice).
- **Acceptance.** T01.1 novice answers "what is a desktop" from the screen; T15.1 novice reads "removed from this desktop" and no "ejected".
- **Severity** 2. **Files** `R/pages/LauncherPage.svelte`, `R/launcher/{NewDesktopDialog,DesktopRow}.svelte`, `manuals/{launcher,desktop}.md`.

### UX-06 Launcher rows: waiting stands out, errors show
- **Problem.** "Needs your approval (1)" is small amber text; the desktop whose agent cannot start shows Idle (T14.1 x3).
- **Decision.** Row status uses an icon and weight: waiting = amber shield icon, bold "Needs your approval (1)", row background light amber; error = red error icon, bold "The agent could not start", tooltip "Open the desktop, then Control Center > Agents, to change the command."; working = "Working"; idle = "Idle". The waiting desktop is the preselected row when the launcher opens. LauncherService records the last start failure per desktop.
- **Acceptance.** T14.1 (with H-05 corrected) all levels within 6 or 8 steps and the novice names the error desktop.
- **Severity** 2. **Files** `R/launcher/{DesktopRow.svelte,launcherModel.ts}`, `main/application/launcher/LauncherService.ts`, `shared/desktop.ts` (run state `error`).

### UX-07 Launcher: F1, access keys, Connect brings the desktop forward
- **Decision.** F1 opens Help and Support on the launcher topic; buttons "&New...", "&Connect", "&Rename...", "&Delete...", Alt+N etc. (F-010). After Connect the row shows "Opening..." then "Connected", the desktop window is raised and focused, and the launcher's button changes to "Show desktop".
- **Acceptance.** T01.1 expert/intermediate no longer say the launcher "stayed in front"; T13.2 novice finds the window with the dialog.
- **Severity** 2. **Files** `R/pages/LauncherPage.svelte`, `main/ipc/{DesktopWindowManager,createDesktopWindow}.ts`.

### UX-08 Keyboard reach of the shell
- **Problem.** T21.1: Tab never enters the active window; Alt+Tab, F6 do nothing; Enter on the active window's taskbar button minimizes it; Start search keeps the old query; the focus ring vanishes on desktop icons.
- **Decision.** F6 and Shift+F6 cycle regions: desktop icons, active window, Workspace bar, taskbar, tray. Tab inside a region moves normally; Tab after the last control of a window goes to the next region. Alt+Tab and Alt+Shift+Tab cycle desktop windows where the OS delivers them, and Ctrl+Alt+Tab is the guaranteed alternative (shown in Help). Enter or Space on a taskbar button activates the window and moves focus into it (to the composer for a chat); it never minimizes (the mouse click still toggles; the window menu key offers Minimize). Start menu search is cleared every time it opens (Ctrl+Esc). A visible dotted focus ring (3:1) on icons and taskbar buttons.
- **Acceptance.** T21.1 expert and novice complete in 36 or 48 steps (with UX-24).
- **Severity** 3. **Files** `R/desktop/{DesktopSurface,WindowLayer,AppWindowFrame}.svelte`, `R/kit/organisms/{Taskbar,StartMenu}.svelte`, `R/pages/DesktopPage.svelte`.

### UX-09 Desktop icons: single click selects, Enter opens, always a response
- **Decision.** Enter opens the selected icon; double-click opens. Opening shows the busy cursor and a taskbar button immediately. If an app cannot open (for example Chats with a broken agent), the user sees the error (UX-27), never nothing. The first desktop of a new user shows a balloon "Double-click an icon to open it." once. Icon tooltips: "Chats: talk to the agent".
- **Acceptance.** T02.1, T10.1, T17.2 panelists do not report a silent double-click.
- **Severity** 2. **Files** `R/desktop/DesktopSurface.svelte`, `R/desktop/Balloon.svelte`.

### UX-10 Window placement and default sizes
- **Problem.** Control Center 640x460 needs maximizing (T06.3, T11.2, T16.1); Event Viewer cut columns (T20.1); Recycle Bin and Task Manager cut; the Workspace bar covers the chat title buttons (T13.1, T05.2); windows overlap gadgets.
- **Decision.** In `DEFAULT_BOUNDS`: control-centre 760x540, event-viewer 980x560, agent-manager 640x440, recycle-bin 680x420, help 800x560, chat 680x560. The cascade keeps every window below the top bar (y at least bar height + 4) and inside `DESKTOP_AREA`. Minimum sizes: 480 x 320 (control-centre 640 x 420). New windows opened by the agent do not cover the front chat.
- **Acceptance.** T06.3 intermediate/expert under 9 steps without maximizing; T20.1 reads all columns without maximizing; F-038 scroll bar gone.
- **Severity** 2. **Files** `shared/desktop-views.ts`, `main/application/desktop/DesktopService.ts` (placement only), `R/desktop/WindowLayer.svelte`.

### UX-11 Computer and Explorer: menus, labels and tooltips
- **Decision.** Explorer file list context menu: "Open", "Open with Notepad", "Open with Code", "Copy as path", "Start a chat here"; no editing verbs. Document that Explorer is a viewer (F-045). Every toolbar button has a tooltip within 0.5 s: "Plug in a project...": "Plug in a project folder as a drive so that the agent can see its files." "Eject": "Safely remove the selected project from this desktop. The folder stays on your disk." Status bar of Computer: "1 project plugged in".
- **Acceptance.** T22.1 novice finds the button's purpose by hover within 2 steps.
- **Severity** 2. **Files** `R/apps/explorer/{ExplorerApp.svelte,explorerContext.ts}`, `manuals/explorer.md`.

### UX-12 Shell accessibility: roles and target sizes (WP1 part)
- **Decision.** Start menu list gets `role="menu"` and children `menuitem` (F-025); the empty launcher list is a plain list when empty, `listbox` with `option` children otherwise (F-026); Start menu arrow button 24 x 24 (F-028).
- **Acceptance.** axe scan: no `aria-required-parent` or `aria-required-children` in Launcher or Start menu.
- **Severity** 2. **Files** `R/kit/organisms/StartMenu.svelte`, `R/pages/LauncherPage.svelte`, `R/launcher/DesktopRow.svelte`.

---

## WP2 Agent control, permissions and approvals

### UX-13 "Ask before every action" (was Take control) and the chat Mode list
- **Problem.** "Take control" reads as taking over the mouse; all three levels failed T11.2 and none tried it; the chat Mode dropdown (Default, Plan) is where they looked first.
- **Decision.** The bar button is renamed "Ask before every action" and becomes a check-style toggle. Pressed = the agent must ask before it reads, writes, runs a command or uses the browser; the bar then shows an amber chip "Asking before every action". Tooltip: "The agent must ask you before every action, even reading. Click again to go back to the settings in Control Center." The mode entry in the chat (UX-29) toggles the same state. The state still is `userInControl`. The Browser bar button has its own copy in UX-34.
- **Acceptance.** T11.2 novice, intermediate, expert pass within 9 or 12 steps (rerun with H-12); `userInControl` true and the next call raises a request.
- **Severity** 3. **Findings** F-005. **Files** `R/desktop/TopBar.svelte`, `R/desktop/DesktopController.svelte.ts` (label only), `manuals/desktop.md`.

### UX-14 Permissions page (Control Center)
- **Problem.** Small, tall rows, "What it covers" cut, two rows visible, no set-all, no confirmation, overlap of capability and app rows unclear (TH-02).
- **Decision.** Window opens at 760x540 (UX-10). Rows 28 px high, columns Permission (150), Setting (96), What it covers (flexible, one line with ellipsis and tooltip). Two groups with header rows: "What the agent may do" (Read files, Write files, Run commands) and "Apps the agent may use" (Code, Notepad, Browser, Terminal, Agent Paint, WordPad, ...). The Terminal row is named "Terminal (run commands)" and the prompt text in UX-17 says "Running commands" the same way ("Run commands"). Toolbar above the table: "Set every permission to:" a combo (Allow, Ask, Deny) and a button "Set all". Intro sentence: "Each row is separate. 'Write files' covers changing files in any app. 'Code' and 'Notepad' cover only what their rows list." Bottom: "OK", "Cancel", "Apply" (default OK); after Apply or OK a status line "Saved. New requests use these settings." for 4 seconds. After Set all, "Apply" lights up and a note says "Not applied yet".
- **Acceptance.** T06.3 intermediate and expert 6 steps without scrolling or maximizing; T11.2 by this route possible in 8 steps; T16.1 5 steps; T16.2 answer read from one screen; T10.1 route via Deny possible.
- **Severity** 3. **Files** `R/apps/control-centre/{PermissionsPage.svelte,permissionsTable.ts,ControlCentreApp.svelte}`, `manuals/control-centre.md`.

### UX-15 "Agent can use" chips show state and explain themselves
- **Problem.** Chips look like buttons but are labels (T10.1 x2 clicked); Ask vs Allow not shown (T06.3, T11.2, T16.1); absence of Terminal must be inferred (T10.2); "Workspace" and "Idle" unclear.
- **Decision.** The bar always shows three headline chips, flat (not raised): "Read files", "Run commands", "Browser", each with a suffix when not plain on: " (asks)" or " (off)". Other app chips appear when the app is open. Tooltip on the group: "The agent can use only what is open here. Closing an app takes its tool away." Clicking a chip opens Control Center > Permissions. When nothing is available: "Agent can use nothing yet. Open an app to give it a tool."
- **Acceptance.** T10.2: all three levels read "run commands: off" without inference; T10.1: the Terminal chip disappears or reads "Run commands (off)" after closing Terminal.
- **Severity** 2. **Files** `R/desktop/TopBar.svelte`, `R/pages/DesktopPage.svelte` (props only).

### UX-16 Pause, Stop and Resume say what they do
- **Decision.** Bar button "Pause" becomes "Pause all agents" with tooltip "Stops every agent on this desktop now and keeps them from doing anything until you click Resume." While paused the bar shows "Paused: no agent will act until you resume." in amber, the button reads "Resume agents", and every chat window shows the banner "This desktop is paused. Click Resume agents on the bar." (Banner in `SessionView` is UX-28.) Resume clears the pause and does not restart a stopped step: a note row is added to each affected chat, "Resumed. The step that was stopped stays stopped. Send a message to continue." with a button "Continue" that sends "Please continue where you stopped." The bar's close button gets the tooltip "Disconnect. Agents keep running." and its minimize and maximize tooltips ("Minimize the desktop", "Maximize the desktop"). Bar buttons keep their positions when the text changes (fixed widths).
- **Acceptance.** T11.1 novice presses Pause (not only Stop); T11.3 all levels press Continue or type, each within 4 steps; T05.2 novice finds Stop in the chat; T13.1 expert reads "Disconnect" without knowing the launcher text.
- **Severity** 3. **Files** `R/desktop/TopBar.svelte`, `main/application/desktop/DesktopService.ts`, `R/desktop/DesktopController.svelte.ts`.

### UX-17 Approval dialog in plain words with the real change
- **Problem.** `@@ -0,0 +1,5 @@` on an existing file (F-023); the diff is cut off to the right (T05.1, T06.1 x3); the policy note glued to the command (T06.2 x3); raw tool call in the title (F-005); Allow/Deny look like links; no focus (F-041).
- **Decision.** Title: "Allow the agent to change src/auth/redirect.ts?" / "Allow the agent to run a command?" / "Allow the agent to read the page?" (mapping in new `toolTitles.ts`, no tool names or JSON). Under it, on its own line: "Reason: Running commands is set to Ask in Control Center." (not in parentheses, not inside the command). For a change to an existing file the main process reads the file and builds the diff from the current text; if it cannot: "This replaces the whole file." The diff panel wraps long lines (no horizontal scroll), shows the full path on the first line and "Show all N lines" when it is clipped, and "N lines added, N removed". Choices stay two-line command links with a raised border on hover and a dotted focus rectangle; the initial focus is on "Deny" (F-041). "Not now" closes the dialog and keeps the request in the Action Center (existing).
- **Acceptance.** T05.1, T06.1 and T06.2: no horizontal scroll; the preview shows removed lines for redirect.ts; no panelist remarks that the note looks like part of the command. F-005, F-023, F-041.
- **Severity** 3. **Files** `R/desktop/{UacDialog.svelte,approval.ts}`, `R/app/session/PermissionDialog.svelte`, `main/application/PermissionBroker.ts`, `main/application/tools/*` (old text), new `R/app/session/toolTitles.ts`.

### UX-18 Action Center: requests are distinguishable
- **Decision.** Each row has two lines: "Change src/auth/redirect.ts" and "In chat 'Fix the login redirect bug...' (started 10:42)". Rows get "Review..." (as now) and the section header "Waiting for your approval (2)". The tray flag tooltip: "2 requests are waiting for you." The title of the taskbar button of a chat that waits gets a prefix "Waiting: ". (Chat title numbering is UX-32.)
- **Acceptance.** T07.1 all levels name which chat each request belongs to; the novice finds the Action Center without the on-screen boxes.
- **Severity** 2. **Files** `R/kit/organisms/ActionCenter.svelte`, `R/desktop/{TrayFlag.svelte,PermissionInbox.svelte.ts}`.

### UX-19 Agents page: add, check, default
- **Decision.** Add Agent dialog: Name optional (defaults to the command, "node my-agent.js"); Command placeholder "Program to run, for example: node" (not "npx" in grey); Arguments hint "One per line, for example: my-agent.js"; check box "Make this the default agent for new desktops and chats" (checked by default in Add); button "Test" that runs the command with `--version` or spawns and reports "Found 'node'." or "Could not find 'node'." The list shows the full command in a tooltip and the Command column is wider (F-039). Page text: "New desktops and new chats use the default agent." (replaces "New chats start the default agent"; verify the behaviour first).
- **Acceptance.** T17.1 in 8 steps by the shortest path and no remark about the placeholder, name or truncated command.
- **Severity** 2. **Files** `R/apps/control-centre/AgentsPage.svelte`, `R/app/options/agentForm.ts`, `main/application/AgentService.ts`.

### UX-20 About dialog and version
- **Decision.** The version comes from `package.json` at build time (F-014). The About dialog uses the same title bar height as other dialogs so the close button is whole (F-013).
- **Acceptance.** T30.2 returns 0.1.0 from an unpackaged build. About dialog close button fully visible.
- **Severity** 2. **Files** `main/index.ts` (line about `app.getVersion()`), `R/kit/organisms/AboutDialog.svelte`, `R/apps/control-centre/AboutPage.svelte`.

---

## WP3 Chat, errors, browser, agent tools

### UX-21 Chat entry points start in the right folder and say where
- **Problem.** The Chats icon starts "New session" in `C:\Users\Agent`; "Ask chat..." opens a pane; New chat on a drive preselects C: (T04.1 novice FAIL, intermediate detour, expert).
- **Decision.** Double-click on Chats: if the desktop has one project, open a chat in it; if it has several, show the New chat dialog "Where should the agent work?" with the last used project preselected; if there is none, work on C: and say so. Every chat title bar and header show the folder as "login-app (E:)" not `E:\`. Context items are named by what they do: "Ask chat about this file..." (pane), "Start a chat here" (window; on folders and drives). Reopening a chat via the icon shows a one-time line at the top: "Reopened 'hello'. Your earlier messages are kept."
- **Acceptance.** T04.1 novice passes within 12 steps; T04.2 novice knows it is the old chat; T02.1 panelists get a chat (with UX-27).
- **Severity** 3. **Findings** F-016. **Files** `R/desktop/{NewChatDialog.svelte,DesktopController.svelte.ts}` (newChat only), `R/apps/chat/ChatApp.svelte`, `R/apps/shared/contextItems.ts`.

### UX-22 Chat pane: status, handle, labels
- **Decision.** The pane header says "Ready" before the first message, "Connecting..." while it starts and "Disconnected" only after a failure, with a "Reconnect" button (F-018). The edge strip becomes at least 24 px wide with the tooltip "Show chat pane" / "Hide chat pane" and a labeled toolbar button "Chat" (F-020). "Chat pane" everywhere, no "panel" (F-033). "Include open file" explains itself: tooltip "No file is open" when disabled, label on one line (F-043). Status text: `connectionLabel(null)` returns "Ready".
- **Acceptance.** T04.1 novice reads "Ready"; T27.2 finds the way back; F-018, F-020, F-033, F-043.
- **Severity** 2. **Files** `R/apps/shared/EmbeddedChat.svelte`, `R/app/sessionStatus.ts`, `R/desktop/AppChatPane.svelte`.

### UX-23 One set of chat items in context menus
- **Decision.** Selection menu: "Explain this" and "Ask chat about this..." (pane) and one "Open in Chat window" (F-019), same words in every app. Right-click on a Code tree row or Explorer file: no Cut or Paste.
- **Acceptance.** T27.1 unchanged; F-019.
- **Severity** 2. **Files** `R/apps/shared/contextItems.ts`.

### UX-24 Composer: focus and typing while connecting
- **Problem.** T21.1 both: the composer never has focus; a new chat says "Working..." with Send disabled.
- **Decision.** Opening or activating a chat window puts the caret in the message box. A new chat accepts typing at once; when the agent is still starting, the status says "Starting the agent..." and Send queues the message with the note "Your message will be sent when the agent is ready." Alt+M focuses the message box (label "&Message:" shown). A disabled Send shows the reason as tooltip.
- **Acceptance.** T21.1 (with UX-08): typing "hello" after Start > New chat reaches the box; F-042 ("Working..." for an idle chat) is gone.
- **Severity** 3. **Files** `R/app/session/{Composer,SessionView}.svelte`, `R/apps/chat/ChatApp.svelte`, `R/agui/SessionAgentStore.svelte.ts`.

### UX-25 A failed send keeps the message and offers Send again
- **Problem.** The composer is cleared; the failed bubble looks sent and appears twice after resend; Copy message copies "You" (T23.2 expert and novice).
- **Decision.** The bubble shows "Not sent" in red with the buttons "Send again" and "Edit"; the composer keeps the draft until the agent confirms. Error bar: "Your message could not be sent because the connection to the agent dropped." with "Send again". Resend replaces the failed bubble (no duplicate). "Copy message" copies only the message text. Clicking "Disconnected" in the status offers "Reconnect".
- **Acceptance.** T23.2 (rerun with H-09): the message is sent in 3 steps with no retyping; no duplicates; novice and expert.
- **Severity** 3. **Files** `R/app/session/{UserMessage,ErrorRow,Composer,SessionView}.svelte`, `R/agui/SessionAgentStore.svelte.ts`, `main/application/SessionService.ts` (retry), `shared/ipc.ts`.

### UX-26 The agent stopped: plain error with Restart
- **Problem.** "ACP connection closed" with no action (T23.1 expert and novice, T20.2); the original request shows twice.
- **Decision.** Error row: "The agent stopped unexpectedly. Your request was not finished." with buttons "Restart and send again" and "Details...". Details shows "ACP connection closed" and the last log lines (the technical text only here). After Restart the failed turn is marked "Stopped" and not duplicated. After Task Manager ends the process: "The agent program was stopped." with "Restart". Event Viewer link "Show in Event Viewer".
- **Acceptance.** T23.1 novice within 12 steps without typing again; T20.2 chat reads "The agent program was stopped."
- **Severity** 3. **Files** `R/app/session/ErrorRow.svelte`, `main/application/{SessionRuntime,AgentConnectionPool}.ts`, `R/apps/chat/ChatApp.svelte`.

### UX-27 The agent cannot start: say so (default Claude Code agent included)
- **Problem.** T17.2 x3: New chat gives no sign (expert 8 steps; novice FAIL). T02.1 expert/intermediate/novice: with the default Claude Code agent the title bar flashes "Working: New session" then Idle and no chat window opens.
- **Decision.** Always open the chat window; if the agent fails to start show a message box over it: "The agent could not start. The program 'not-a-real-command' was not found." with buttons "Open Agents" (opens Control Center > Agents), "Choose another agent...", "Close". The same error row stays in the transcript. The Workspace bar shows the red chip "Agent: not started". Never show "Working: New session" for a start that fails; the status goes Connecting... then "Could not start". The launcher row shows the same state (UX-06). Help topic "The agent does not start" is added (UX-45).
- **Acceptance.** T17.2 novice and intermediate name the command and the Agents page; T02.1 no dead end; no flash of "Working" before a failure.
- **Severity** 3. **Files** `R/desktop/DesktopController.svelte.ts` (newChat error path), `main/application/AgentConnectionPool.ts`, `main/application/desktop/DesktopService.ts` (error mapping), `R/apps/chat/ChatApp.svelte`, `R/kit/organisms/MessageBox.svelte`.

### UX-28 Stop notice, paused banner, running status, closing a running chat
- **Decision.** After Stop: "You stopped this reply. The agent is waiting for your next message. To stop all agents until you say so, click Pause all agents in the bar." (`StopNotice`). Paused banner above the composer (text in UX-16). The chat Stop button label "Stop" gets the tooltip "Stops this reply. You can send another message." Closing a chat that is running: balloon "'Fix the login...' is still running in the background. Open Chats to see it." File menu order: "Clear transcript..." then separator then "Close" (T13.1 novice).
- **Acceptance.** T11.1 novice presses Pause after reading the note; T13.1 novice reads that the job keeps running.
- **Severity** 2. **Files** `R/app/session/{StopNotice,SessionView}.svelte`, `R/apps/chat/ChatApp.svelte`.

### UX-29 Mode list: what each mode means and an ask-first entry
- **Decision.** Each mode shows its description (Default: "The agent works as usual."; Plan: "The agent plans and changes nothing."). A last entry, after a separator, "Ask before every action" (check mark when on) toggles the desktop state (UX-13).
- **Acceptance.** T11.2: a panelist who opens Mode finds "Ask before every action" there.
- **Severity** 3. **Files** `R/app/session/Composer.svelte`.

### UX-30 The end of the answer is visible
- **Decision.** When a turn ends the transcript scrolls to the end unless the user scrolled up; if so a bar "New messages. Click to go to the end." (F-004). The inline A2UI form is scrolled fully into view when it appears (T18.1 inline).
- **Acceptance.** F-004; T18.1 inline needs no scroll step.
- **Severity** 3. **Files** `R/app/session/Transcript.svelte`.

### UX-31 Plain titles for tools; "Denied", not "Failed"
- **Decision.** Tool cards, the Activity gadget and the Reviewer panel use plain titles from `toolTitles.ts`: `fs.read_text_file` "Read a file", `fs.write_text_file` "Change a file", `terminal` "Run a command", `agent7.browser_read` "Read the page", `agent7.review_add_comment` "Add a review comment" (F-007); the kickoff text is behind "Show". A request the user denied shows the grey "Denied by you" with the explanation under it, not red "Failed". A card from an earlier plan step is never green "Done" beside it without its own caption (a separator line "Earlier step"). Tool result text "Error: true. Result: ..." becomes "The tool reported an error: ...".
- **Acceptance.** T06.2: no panelist reads "Failed" as an error or "Done" as the denied command; F-007.
- **Severity** 3. **Files** `R/app/session/{toolSummary.ts,toolStatus.ts,ToolCallCard.svelte,ToolStatusIcon.svelte}`, `R/desktop/Gadgets.svelte`.

### UX-32 Chat names
- **Decision.** A chat with no message is "New chat" (F-016, `DEFAULT_SESSION_TITLE` in `SessionService.ts` line 19). Chats with the same title get " (2)", " (3)" in the title bar and taskbar. The Context meter shows "No chat yet" only when no chat exists (T04.2 expert); otherwise the chat name.
- **Acceptance.** T07.1: the two chats are distinguishable by title.
- **Severity** 2. **Files** `main/application/SessionService.ts`, `R/desktop/Gadgets.svelte`, `R/apps/chat/ChatApp.svelte`.

### UX-33 Forms from the agent give feedback
- **Decision.** The form button shows "Sending..." and is disabled until the answer arrives, then the form shows "Sent." under the button; no second submission (T18.1 sidebar novice sent three times). Closed surface card: "Board: Closed" with "Open"; when open: "Board: Open" with "Show" (not "Open Open", T18.2), buttons not squashed. The transcript scrolls to the reply.
- **Acceptance.** T18.1 all variants: one action prompt only; no second click needed.
- **Severity** 2. **Files** `R/a2ui/{A2uiSurface.svelte,NodeView.svelte}`, `R/apps/chat/SurfaceSidebar.svelte`, `R/app/session/SurfaceRow.svelte`.

### UX-34 Browser: errors, start page, honest status, Take over
- **Decision.** A failed load draws a Win7-style page: title "This page can't be displayed" (heading), "The address '127.0.0.1:9' could not be reached.", bullet list "Make sure the address is right.", "Check that your computer is online.", button "Refresh", link "Help" (F-001). The status bar shows real states ("Connecting...", "Done", "Could not load the page"), real zoom, and no "Protected Mode" (F-021). A new tab shows a start page "Type an address above to open a page." The activity bar stays while a turn uses the page, raises the Browser window on the first action and keeps its button fixed (F-006). Its button is "Take over" with tooltip "Pause the agent on this page so that you can use it. The agent must ask before it uses the page again." (same state as UX-13). Help text names the chip "Browser" as proof that the agent can see the page.
- **Acceptance.** T19.1 and T19.2 (rerun with H-08): the panelist reads the error and the cause without reading the address; T28.2 unchanged.
- **Severity** 3. **Findings** F-001, F-005, F-006, F-021. **Files** `R/apps/browser/{BrowserApp,BrowserTab,PlaceholderPage}.svelte`, `R/apps/browser/webview.ts`, `manuals/browser.md`.

### UX-35 Event Viewer and Task Manager
- **Decision.** Event Viewer size comes from UX-10; the ACP and AG-UI names get tooltips "ACP: how Agent7 talks to the agent" (F-034). Warning events from a refused call link from the chat error: the chat's error row has "Show in Event Viewer". Task Manager: Processes tab gets Memory and CPU columns (T20.2 expert), the Chats table no longer shows a scroll bar (F-038), Chat tab's idle text becomes "Idle (the agent program is still running)". End process text: "End 'Scripted long-turn'? Its 1 chat will stop and work in progress is lost." (then UX-26).
- **Acceptance.** T20.1 and T20.2 unchanged pass; F-034, F-038.
- **Severity** 2. **Files** `R/apps/event-viewer/*`, `R/apps/agent-manager/*`.

### UX-36 Terminal copy and Review kickoff status (polish)
- **Decision.** Terminal Edit menu gets Copy; Help text explains "projects are USB drives" as "projects appear as drives" (F-046). The "Working..." label shows the chat's own status only (F-042).
- **Severity** 1 (polish). **Files** `R/apps/terminal/*`, `R/app/sessionStatus.ts`.

---

## WP4 Code, changes, review, Help, accessibility

### UX-37 Review changes never starts an agent or a write prompt
- **Problem.** "Review changes" opens Code Review and a reviewer agent immediately asks "Allow Scripted demo to write SCRIPTED.md?" or "write login.ts" (T24.1 both, T08.2 expert, T19.1 novice for the chat); after Deny the box stays, status "Disconnected", tray badge 1.
- **Decision.** Opening Code Review is read-only: it shows the diff and the comments and starts no agent. The button "Ask the agent to review..." (separate, in the toolbar) starts a reviewer and says "The agent will read the changes and add comments. It cannot change files." The reviewer's permission is read-only; write requests during a review are refused with "Not allowed during a review." If a request is denied, the box and the Action Center entry close. Scripted agents: the default script for the harness does not write (H-20).
- **Acceptance.** T24.1 and T08.2: no write prompt appears when opening the review; T24.1 and T08.2 steps drop by 2 or more.
- **Severity** 3. **Files** `R/apps/code/CodeApp.svelte` (Review changes entry), `R/apps/code-review/CodeReviewApp.svelte`, `main/application/review/*`.

### UX-38 Code project tree: Eject, Plug in, no editor verbs
- **Problem.** Right-click on a drive shows Cut/Copy/Paste (T12.1 expert, intermediate, novice, T03.1); File and Tools menus have no project items (T03.1 x2).
- **Decision.** Project root row context menu: "Open", "Start a chat here", "Open in Explorer", separator, "Eject" ("Remove this project from the desktop. Its folder stays on your disk."). File row: "Open", "Open with Notepad", "Copy as path", "Ask chat about this file...". File menu adds "Plug in a project..." and "Eject project...". Empty area of the tree: "Plug in a project...". Tools menu is removed if empty or lists "Refresh Git status" and "Review changes".
- **Acceptance.** T12.1 intermediate and novice within 6 or 8 steps; T03.1 novice within 15; F-045.
- **Severity** 3. **Files** `R/apps/code/CodeApp.svelte`, `R/app/shell/FileTree.svelte`.

### UX-39 Git panel: the diff is one double-click away
- **Decision.** Double-click on a Git row opens its diff (Code Review diff against HEAD, read only); the context menu offers "Show changes", "Open file". The gutter bars have a tooltip "Line 3: changed. Click to show the old text." and a click peeks the old lines. Status words: "Modified", "New file" instead of M and U (F-037). The tab is "Git (3)" with a tooltip "3 files changed since the last commit". Not a repository: "Not a Git repository. This folder is not tracked, so there are no change marks. Run 'git init' to start tracking." with a button "Initialize Git here" (T24.2 novice and expert).
- **Acceptance.** T24.1 novice and expert in 6 steps; both name lines 3 and 4 of redirect.ts; T24.2 unchanged.
- **Severity** 2. **Files** `R/apps/code/{CodeApp.svelte,DockPane.svelte,gitModel.ts}`.

### UX-40 One place to review changes; names and Recycle Bin hints
- **Problem.** Three places: chat "Tasks and changes", Code "Agent changes", Code Management > Changes (T08.1 expert, T08.2); truncated names (T08.1 x3, T08.2); preview one line tall; the Recycle Bin is not mentioned after Revert (T09.1 x3); the list still shows the reverted change.
- **Decision.** The chat button and the Code list open the same pane (`ChangesPane`), called "Changes" in both. Name column shows `redirect.ts` bold with `src\auth` grey beside it, full path in a tooltip, columns resizable and wide at default. Diff preview at least 8 lines tall with wrapped lines. Revert is disabled with the tooltip "Select a change to revert." Revert dialog text adds "You can get it back from the Recycle Bin." After Revert the list shows the row grey "Reverted (in the Recycle Bin)" with a link "Open the Recycle Bin". Column "Lines" becomes "+ added / - removed" with a header total "5 files, +12 -3" and sortable columns (T08.2).
- **Acceptance.** T08.1 and T08.2 novice read full file names (README.md); T09.1 all levels do not need to guess where the file went (2 or fewer exploratory steps).
- **Severity** 3. **Files** `R/app/shell/{ChangesPane,TasksPane}.svelte`, `R/app/changes/changeFormat.ts`, `R/apps/chat/ChatApp.svelte` (button label only).

### UX-41 Code Review layout at default size
- **Decision.** Default 1120x650 stays but minimum 900 x 520; toolbar wraps (F-002) and "Against" never clips; comment buttons become icon buttons with tooltips below 420 px; **View > Comments list** keeps the diff and the list side by side with a splitter and clips the reviewer panel inside the client area (F-003); the window opens on the first file that has a comment with the reviewer panel open, and the banner count links to the comments (F-012). A one-page mode "All changes" lists every file's diff in one scroll with "Next file" (T08.2 expert); "Next" says "Change 3 of 7".
- **Acceptance.** T25.x and T26.x unchanged; no overlap or clipping in the F-002 and F-003 screens; T08.2 expert in 10 steps.
- **Severity** 3. **Files** `R/apps/code-review/{CodeReviewApp,ReviewComments,ReviewComposer,ReviewDiff,ReviewOutline}.svelte`.

### UX-42 Code Review wording (polish)
- **Decision.** Send dialog: existing chats named by their first words, second choice "Start a new chat", "message" not "prompt" (F-015); sent comments show a "Sent" column with a check, normal weight, no strike-through (F-017); first menu is "File" with Refresh, Send all, Close (F-036); "Against: HEAD (the last saved version)", status words, "Old" and "New" column headers (F-037).
- **Severity** 2 (F-015, F-017), 1 (F-036, F-037). **Files** `R/apps/code-review/{SendToChatDialog,ReviewThread,ReviewComments,ReviewOutline,ReviewDiff,CodeReviewApp}.svelte`.

### UX-43 Code window: no dead buttons, room for the pane
- **Decision.** Remove New, Save, Save all, Undo, Redo or enable them with a reason in the tooltip; "Logs & others" panel is "Changes and Git" (F-022). Opening the chat pane grows the window to fit, or caps the pane at 35 percent; the toolbar wraps and does not hide the pane header; the status bar keeps "Line 1 of 6" (F-008).
- **Acceptance.** F-008, F-022; T27.1, T27.2 unchanged.
- **Severity** 2. **Files** `R/apps/code/{CodeApp.svelte,DockPane.svelte}`.

### UX-44 Help navigation works
- **Problem.** Table of contents links do not jump (T22.1 x2, T22.2 x2, T03.1, T17.2); search results show titles only; F1 window called "Chat Help"; no hit highlight.
- **Decision.** TOC entries are anchors that scroll to the section and highlight it. Search lists each hit with a snippet and opens the topic at the match with the words marked. The F1 window title is "Agent7 Help and Support: Using Chat"; every Help window has the same program name and a "Home" and "Contents" button; the status bar shows the topic title ("Using Notepad", F-040). Searching "no answer" or "page stays blank" finds the topics with Troubleshooting.
- **Acceptance.** T22.2 passes with the stable checker (H-07); T22.1 novice within 8 steps.
- **Severity** 3. **Files** `R/apps/help/{HelpApp.svelte,helpModel.ts,helpMarkdown.ts,helpTopics.ts}`.

### UX-45 Help content: no developer text, answers where the user looks
- **Decision.** Test ids and internal names (`explorer-plug-in`, `data-testid`, `browser_click`) move into HTML comments and out of rendered tables (F-009); the Help home intro in `manuals/index.md` is rewritten for users. Each Command Bar and menu section says what each button does in one sentence ("Plug in a project...: adds a project folder to this desktop as a drive."). New topics: "Keyboard: use Agent7 without a mouse" (F6, Ctrl+Esc, Ctrl+Alt+Tab, Alt+M), "The agent does not start", "Add or remove a project", "Approve every action", "Pause, Stop and Resume". Tooltips for toolbar buttons appear within 0.5 s (T22.1 novice, expert).
- **Acceptance.** T22.1 novice answers from the Command Bar section; T19.2 novice finds Troubleshooting by search; `check-help-coverage.mjs` green.
- **Severity** 2 (F-009), 3 for the missing "agent does not start" topic. **Files** `manuals/*.md`, `R/apps/help/*`, `R/apps/shared/AppHelp.svelte.ts`.

### UX-46 Notepad, WordPad, Paint, Snipping Tool gaps
- **Decision.** Notepad File menu adds "Save As..." (Ctrl+Shift+S), "Exit" replaces "Close" with Alt+F4, Find (Ctrl+F) (F-024); WordPad "H1" and "H2" buttons carry the accessible names "H1 Heading 1" (F-030); Snipping Tool removes Free-form Snip until it works and adds "Send to chat" (F-047); Agent Paint File > "Save as PNG..." and "Open..." (F-048).
- **Severity** 2 (F-024, F-030), 1 (F-047, F-048). **Files** `R/apps/{notepad,wordpad,snipping-tool,paint}/*`.

### UX-47 Accessibility sweep: roles, splitters, scroll regions, target sizes
- **Decision.** `aria-required-children` fixed for the Browser tab strip, Sticky Notes, Code panes and Code Review (F-026); splitters get `aria-valuenow/min/max` and arrow-key resizing (F-027); scrollable panes get `tabindex="0"` and a label (F-031); sticky notes layer gets `role="region"` (F-044); menu bar items 24 px high, tab close buttons 24 x 24 hit area, panel close 24 px, Paint line sizes 24 px, splitters keep 5 px visible with a 24 px hit area (F-028).
- **Acceptance.** axe scan `evidence/expert/axe.json` shows no critical issue and no `target-size` issue.
- **Severity** 2. **Files** `R/kit/organisms/{MenuStrip,TabControl,SplitContainer,ListView,TreeView,DataGridView}.svelte`, `R/apps/{code,code-review,sticky-notes,paint,browser/BrowserTab}*`.

### UX-48 Contrast
- **Decision.** Git status text `#2c8a2c` to `#237a23`, chat author label `#c15f3c` to `#b0502f`, and the Action Center and Code Review values that scored below 4.5:1 (F-029); the focus ring and disabled text keep 3:1. Change the tokens, not the call sites.
- **Acceptance.** axe `color-contrast` empty.
- **Severity** 2. **Files** `R/kit/tokens.css`, one-line edits in `R/app/session/AgentMessage.svelte` and `R/kit/organisms/ActionCenter.svelte` (coordinate with WP2 and WP3).

### UX-49 Recycle Bin: columns and preview
- **Decision.** The Chat column is not cut; preview pane at least 8 lines; after Restore a status line "Restored 'redirect.ts' to E:\src\auth." and the item list shows "The Recycle Bin is empty."
- **Acceptance.** T09.1 all levels read the full row; no remark about the short preview.
- **Severity** 2. **Files** `R/apps/recycle-bin/*`.

---

## Final sweep

### UX-50 Global wording sweep (after WP1 to WP4)
- **Decision.** "Control Center" becomes "Control Center" in UI, manuals, tests and fixtures (F-035); "Chat panel" becomes "chat pane" everywhere (F-033, remaining strings); remaining "session" in user-facing text becomes "chat" (F-016); the semicolon in the Launcher text is gone (F-032); any remaining raw tool name or ACP/AG-UI/MCP outside Details is removed (F-007, F-034).
- **Acceptance.** `grep -rniE "control center|chat panel|new session" src manuals e2e` returns nothing user visible.
- **Severity** 1 (polish). **Files** all; single developer.

---

## Coverage: findings.md severity 2 and above

F-001 UX-34. F-002 UX-41. F-003 UX-41. F-004 UX-30. F-005 UX-13, UX-17, UX-34. F-006 UX-34. F-007 UX-31, UX-50. F-008 UX-43. F-009 UX-45. F-010 UX-07. F-011 UX-05. F-012 UX-41. F-013 UX-20. F-014 UX-20. F-015 UX-42. F-016 UX-32, UX-50. F-017 UX-42. F-018 UX-22. F-019 UX-23. F-020 UX-22. F-021 UX-34. F-022 UX-43. F-023 UX-17. F-024 UX-46. F-025 UX-12. F-026 UX-12, UX-47. F-027 UX-47. F-028 UX-12, UX-47. F-029 UX-48. F-030 UX-46. F-031 UX-47.
Severity 1 (polish): F-032 UX-05, UX-50. F-033 UX-22, UX-50. F-034 UX-35, UX-50. F-035 UX-50. F-036 UX-42. F-037 UX-39, UX-42. F-038 UX-35. F-039 UX-19. F-040 UX-44. F-041 UX-17. F-042 UX-24, UX-36. F-043 UX-22. F-044 UX-47. F-045 UX-11, UX-38. F-046 UX-36, UX-05. F-047 UX-46. F-048 UX-46.

## Panel requests from the coordinator

- The Claude Code default agent's New chat flashes "Working: New session" and then no window opens (T02.1 expert): UX-27.
- The reviewer and agent go off task with write prompts on open (T19.1, T24.1, T08.2): UX-37 (product) and H-20 (harness script).
- Denied commands show "Failed" next to a green "Done" card (T06.2): UX-31.

## Panel themes to items

TH-01 UX-02, UX-03, UX-38, UX-05. TH-02 UX-14, UX-19, UX-10. TH-03 UX-13, UX-16, UX-28, UX-29. TH-04 UX-27, UX-26, UX-25, UX-34, UX-06, UX-37. TH-05 UX-10, UX-17, UX-40, UX-49. TH-06 UX-17, UX-18, UX-31. TH-07 UX-04, UX-05, UX-06, UX-07. TH-08 UX-21, UX-22, UX-23. TH-09 UX-44, UX-45. TH-10 UX-14, UX-16, UX-33, UX-40, UX-49. TH-11 UX-08, UX-24. TH-12 UX-01. TH-13 UX-10, UX-18, UX-32. TH-14 UX-37, UX-39, UX-40, UX-41, UX-43. TH-15 UX-05, UX-14, UX-50. TH-16 UX-12, UX-47, UX-48. TH-17 UX-37.

## Rerun plan

After the harness fixes (H-01 to H-22) and the packages above: rerun all FAIL and INVALID rows (T03.1, T04.1, T10.1, T11.1, T11.2, T12.1, T12.2, T17.2, T19.1, T21.1, T22.1), the changed journeys (J02, J06 to J09, J23), and the pending intermediate T17.2 to T24.2 batch, with fresh panelists.
