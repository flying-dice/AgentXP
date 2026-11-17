# Window resize audit

Every app window was opened in the built app (Electron, 1440 x 900) and set to five sizes: below its minimum (420 x 360,
as an agent or a squeezed placement could set it), its minimum (dragged by the corner grip), 640 x 480, 900 x 620 and
maximized. Each size was checked with the chat pane hidden and shown. A script measured, inside each window, what ran
past the app's client area or under the chat pane, and which panels clipped their content. Then every screenshot was
looked at by eye. `e2e/window-resize.e2e.ts` keeps these checks.

## Findings

| # | Where | What was wrong | Root cause | Fix |
|---|---|---|---|---|
| 1 | Every app with the chat pane, in a window under about 800 px | The pane took 260 to 420 px and left the app 140 to 200 px. App content (task panes, toolbars, lists) bled under the pane: "Task Scheduler Tasks" and "Selected Task (none)" cut off, "Open as a chat window" clipped to "hat window" (the bug report). | The pane always docked. Its width rule fell back to 260 px even when the app was left with almost nothing, and the app's client area did not clip. | Kit: opening the pane in a narrow window widens the window so the app keeps 380 px (and hiding the pane gives the width back). When the window cannot widen, the pane floats over the app with a shadow. The client area clips, so nothing paints under the pane. |
| 2 | Task Scheduler (and any tiled app) | Opened beside a chat, Task Scheduler was squeezed to about 400 px, well below its 760 x 520 minimum. | Tiling beside a chat squeezed windows to 360 px whatever their minimum. Requested sizes and `setBounds` (agent and renderer) were not clamped either. | Tiling never goes below the app's minimum; `atLeastMinSize` clamps requested sizes and `DesktopService.setBounds`; the frame also has a CSS minimum, so a stale stored size renders at the minimum. |
| 3 | Task Scheduler (any kit TaskPane) | The task pane sections were squashed to fit the height: "Refresh", "Properties..." and "Task Manager" cut in half. | Sections were flex items that could shrink, with `overflow: hidden`. | Kit: sections keep their height and the task pane scrolls. |
| 4 | Task Scheduler at narrow widths | The task pane took 200 px of a 380 px app and the list header wrapped ("Scheduled / tasks", "0 / tasks"). | No narrow layout. | Below 560 px the task pane hides, as in a narrow XP Explorer window (its commands stay in the Action and context menus). The header does not wrap. |
| 5 | WordPad, Snipping Tool, Diagrams, Explorer | Toolbar buttons ran past the window edge ("Code", "Link", "Send to chat", "Copy", "Eject (remove from this desktop)"). | ToolStrip had a fixed height and no wrapping; Diagrams hid its overflow. | Kit: ToolStrip wraps onto more rows, like a rebar band. Explorer's command bar does the same. |
| 6 | Menu bars in narrow windows | The last menus (Help, Shape) were cut off. | Fixed-height menu bar with no wrapping. | Kit: MenuStrip wraps onto a second row, as a Win32 menu bar does. |
| 7 | Status bars | "Ready" was cut to "Re..." while the fixed panels kept their width. | The spring panel had `min-width: 0`; fixed panels did not shrink. | Kit: the spring keeps up to 72 px; fixed panels give way first. |
| 8 | Help | The search box ran past the window edge under 500 px; the Contents button was cut off beside the pane. | Fixed 220 px search box in a toolbar that did not wrap. | The search box shrinks to 110 px and the toolbar wraps. |
| 9 | Event Viewer | The log heading ("AgentXP Logs, Number of events, Show all, Autoscroll") was squeezed into itself. | Fixed-height heading row. | The heading wraps onto a second line. |
| 10 | Paint | At 480 x 320 the colour box and the status bar were below the window. | The minimum was too small for its tool box and colour bar. | Minimum 520 x 440. |
| 11 | Chat | At 480 x 320 the Send button was cut off. | Minimum too small for the composer. | Minimum height 420 (it still tiles down to 360 px wide beside another window). |

Code at its minimum still crowds its Management and Changes panels; they scroll inside themselves, so they are left
as they are (a larger minimum would stop Code tiling beside a chat).
