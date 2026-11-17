---
name: agent-presence-ux
description: Use when adding or changing any agent tool, any app's agent API, or anything that reacts to agent activity (windows the agent opens, the agent cursor, balloons, Action Center items, the activity feed, chat tool rows, the top bar, the team room, Follow). Classifies every agent action as Work, Show or Output and applies the UX rules of each, so agents never become noise on the operator's desktop.
---

# Agent presence UX (Work, Show, Output)

The desktop is **the operator's environment**, not the agent's. Agents work out of sight; the desktop shows what
matters, when it matters, and the operator chooses when to look closer. The design and build plan are in
`docs/AGENT_PRESENCE.md`. This skill is the set of rules you apply while building.

Why this exists: AgentXP used to make agents work *through* the desktop. `code_read` opened Code for a read that took
milliseconds, `fs_find` opened Explorer, WordPad and the Browser took focus, and team members raced for one screen.
The `0113b82` audit showed agents bypassed it anyway. Motion that nobody asked for is noise, and noise trains the
operator to stop looking, which is the opposite of trust.

## 1. Classify first

Before you write a tool, a handler or a UI reaction to an agent, decide its style. Write it in the PR.

| Ask | If yes |
|---|---|
| Did the agent mean the operator to look at something, now? | **Show** |
| Does it leave something behind in an app's data (comment, card, shape, change, drawing, surface)? | **Output** |
| Anything else (read, search, list, edit, write, run, browser read) | **Work** |

**One tool, one style.** If a tool seems to need two (for example "edit and show the edit"), split it: the edit is
Work, and the agent calls `show` if it wants the operator to look. Never add a side effect "so the user can see".

## 2. Work: quiet, never hidden

- **Nothing moves.** A Work tool never opens, focuses, raises, scrolls or selects anything in a window. No
  `openWindow`, no `focusWindow`, no view update that changes what the operator is looking at.
- **Update only what is already showing it.** If a window is open and already shows that file, folder or terminal,
  it may update live (reload the file, mirror the run, briefly highlight changed lines). It must not switch tabs,
  change the active file or scroll away from where the operator is.
- **Observable on demand, in two clicks.** Every Work action must be reachable from: its chat tool row (with the
  matching **Show in...** action), the InfoPanels activity feed, the top-bar working link, and the Event Viewer.
  If you add a new kind of Work, give its tool row a title (`plainToolTitle`) and the right **Show in...** action.
- **Summarise, do not stream.** Merge repeats (the feed already counts them). Say the step in plain words ("reading
  auth.ts"), not the tool name.
- **State over motion.** Prefer a label, a count or a status (`data-status`, `data-activity`) to anything animated.

## 3. Show: the colleague turning their screen

- **Only on purpose.** Show happens because the agent called `show` (or the operator clicked a **Show in...**
  action). Never as a side effect of Work.
- **The foreground rule.** Only the foreground chat (the one the operator last focused or typed in) may move the
  operator's view. Any other chat, team member or scheduled run gets a request: a balloon "<Name> wants to show you
  <target>" with **Show** and **Not now**, kept in the Action Center.
- **Always a reason.** The note is required. "Here is where the token is checked", not "see this".
- **Land on the exact spot.** Open or raise the target window and go to the lines, the comment, the card, the shape
  or the element. A show that lands on "the file somewhere" is a bug.
- **One at a time, always interruptible.** Queue further shows. Esc, any operator click or key press, and Pause
  dismiss a show and stop the cursor.
- **The cursor means "for you to watch".** The agent cursor appears for Show, Browser actions and Follow only. If
  the operator sees it, an agent is doing something for them to see.
- **Ask covers Show.** With **Ask before every action** on, or **Agent may show you things** set to Ask, the show asks
  first. Never: transcript row only.

## 4. Output: it lands in the app, and you hear about it once

- **Into the app's data, not into the operator's face.** Output is stored by the app's main-process service and
  appears because the window follows its push events.
- **Open window: live, with a short change cue.** Flash the new comment marker, the moved card, the changed shape.
  The push event must carry the changed ids so the window can do this. Do not focus the window.
- **Closed window: one balloon per turn per kind,** in outcome words, with exactly one action: "Reviewer left 4
  comments on auth.ts" **Open review**. Never one balloon per tool call. Every balloon also goes to the Action Center
  history.
- **No balloon for the foreground chat.** The operator is watching it.
- **Output windows open behind.** Apps whose window owns the state (Paint, Agent Diagrams, WordPad, Browser, Code
  Review, agent-drawn surfaces) may be opened by the agent: behind the focused window, unfocused, with the taskbar
  flash and glow, through `DesktopService.openOutputWindow`, and only if **Agent may open apps** allows it.

## 5. Everywhere

- **The operator always wins.** Operator input cancels agent motion. Nothing takes focus during `TYPING_GRACE_MS`.
- **Pause stops all motion:** cursors hide, shows drop, Follow stops.
- **One identity.** Use `AgentIdentity { name, color }` (team member: profile; plain chat: agent name and
  `colorOfName(sessionId)`) in every surface: cursor, callout, balloon, feed row, tool row, team room, top bar. Never
  colour alone: the name is always shown too.
- **XP era.** Luna look, `--xp-*` tokens, no emoji, no glass. The cursor glide (about 300 ms) is the one documented
  motion exception (`docs/design/XP_DESIGN_LANGUAGE.md`, "Motion"); do not add others without updating that section.
  With `prefers-reduced-motion`, jump instead of glide.
- **Accessible.** Announce shows and notices in an `aria-live="polite"` region. Every control has a `data-testid`
  and a row in its manual's Controls Reference.

## 6. Anti-patterns (all of these shipped once)

| Do not | Instead |
|---|---|
| A read or search tool that opens Code or Explorer to show its results | Return the results. The tool row has **Show in Code**. |
| An edit tool that switches the Code window to the edited file | Reload only if that file is already showing. The agent calls `show` if it wants the operator to look. |
| A window that calls `focusWindow` when the agent starts using it (Browser, WordPad) | Leave focus alone. Flash the taskbar button if the window is behind. |
| A background team member scrolling the operator's editor | The foreground rule: a request balloon. |
| A balloon per tool call, or per comment | One balloon per turn per kind, in outcome words. |
| An agent open that skips **Agent may open apps** | `openOutputWindow`, which checks the policy. |
| A tool description that promises a window ("Code opens the file") | Describe what the tool returns. |
| Telling the agent to use a tool "so the user can watch" | Agents work quietly; `show` is for when they mean it. |

## 7. Checklist per style

For every agent tool you add or change:

- [ ] Style named in the PR (Work, Show or Output) and the handler matches it (no side effects for Work).
- [ ] `catalog.ts` description says what the tool returns and never promises a window. Show tools say "use only when
      you want the operator to look, with a reason".
- [ ] Policy row: the tool's group in `DEFAULT_TOOL_POLICY`, `permissionNames.ts` and the Control Center table.
- [ ] Unit test that names the tool, and for Work asserts **no** window opened or focused
      (`desktop.windows` unchanged, `focusedWindowId` unchanged).
- [ ] Show: test the foreground chat (window goes to the spot) and a background chat (request notice, view unchanged).
- [ ] Output: test window open (live update, change ids in the event) and window closed (one notice per turn).
- [ ] Chat tool row has a plain title and the right **Show in...** action (Work), or a transcript row with
      **Show again** (Show).
- [ ] E2E with the scripted agent (`agents/scripted-agent/scripts/`), asserting through test ids and `data-*` state.
- [ ] Manual: the tool in "What the Agent Can Do" with its style, and every new control in Controls Reference.
- [ ] Journey: the relevant journey in `docs/ux/journeys.md` (J10 Work, J32 Show, J33 Output, J34 Follow).

## 8. How to review and verify it

Use `.claude/skills/verify-change/SKILL.md` and add these states to its matrix:

| State | What to check |
|---|---|
| Work, nothing open | An agent reads, searches, edits and runs. No window opens, nothing takes focus. The tool rows and feed say what happened. |
| Work, target already open | The file open in Code reloads in place; the operator's tab, scroll and caret stay. |
| Foreground show | Window goes to the exact spot, cursor glides there, the note says why, Esc dismisses. |
| Background show | Only a request balloon; the operator's view is unchanged until **Show**. |
| Operator typing during a show | The glide stops, focus stays in the operator's text box. |
| Output, window open | Live change with a short cue, no balloon, no focus change. |
| Output, window closed | One balloon in outcome words, one action that lands on the result; the Action Center keeps it. |
| Follow on | The followed agent's cursor travels with its reads and edits; projection pauses while typing; **Stop following** works. |
| Paused | No cursors, no shows, no Follow projection. |
| Reduced motion | The cursor jumps and pulses; nothing glides. |

Review against rubric `docs/ux/rubric.md` D7 (the operator can always see what the agent can use, is doing, did,
and is waiting for, without being interrupted) and D9 (every state above has a visible, distinct signal).
