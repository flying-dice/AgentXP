# Agent7 UX Personas

Status: discovery. These personas drive the journeys in `journeys.md` and the scoring in `rubric.md`. Each persona is a composite built from the README, `docs/DESKTOP_DESIGN.md` and the product goals. They are not interview data. Validate them with real users after release candidate 1 if possible.

Agent7 ships "on disk" like boxed software. A persona who fails on the first run does not get a second update soon. Success criteria are therefore written for the first session.

## P1 - Sam, the solo developer who wants to try an agent safely

- **Role and context.** Freelance full-stack developer. Works alone on a laptop, on one or two client projects in Git. Has used Claude Code in a terminal and trusts it a little. Does not want it to touch the rest of the computer.
- **Goal.** Point an agent at one project, give it a task, and keep the right to undo anything.
- **Why Agent7.** The desktop metaphor tells Sam what the agent can touch. The Recycle Bin makes undo feel safe.
- **Skills.** Strong with code and Git. Knows Windows 7 well enough to find Start, Explorer and the Recycle Bin.
- **Frustrations.**
  - Agents that edit files before Sam has seen the plan.
  - Not knowing whether a command ran on the host or in a sandbox.
  - Tools that need a long setup before the first useful result.
  - Having to read docs to learn what a button does.
- **Behaviors.** Skims. Clicks before reading. Leaves the agent working and returns to other windows. Uses the mouse most of the time and the keyboard in the chat box.
- **Success criteria.**
  1. From first launch to the first agent reply in under 3 minutes, without reading the README.
  2. Can say, at any moment, which files and tools the agent has access to.
  3. Reverts one agent edit and finds it again in the Recycle Bin on the first try.
  4. Never loses work to a misclick (every destructive action asks or can be undone).
- **Primary journeys.** J01 to J05, J08, J09, J12, J18, J19, J24.

## P2 - Dana, the cautious team lead who reviews every change

- **Role and context.** Engineering lead at a company with a code review policy. Lets her team try agents only if every change is reviewable. Works on a shared monorepo. Uses a managed laptop, often with limited network access.
- **Goal.** Run the agent in "ask first" mode, read each diff, approve or deny, and keep a record of what happened.
- **Why Agent7.** Permission requests show the diff. The Event Viewer shows the protocol traffic. The Recycle Bin keeps reverted work.
- **Skills.** Expert reviewer. Moderate with new UIs. Reads dialog text carefully because she is accountable for the result.
- **Frustrations.**
  - A dialog that says "Allow?" without saying what and why.
  - Two places that show the same request with different words.
  - Defaults that allow more than she expects.
  - No evidence of what the agent did after the fact.
  - Agents that bypass the client (the README states this limit honestly).
- **Behaviors.** Reads every word. Opens Show details every time. Changes Control Center permissions before the first chat. Checks the Event Viewer when something looks wrong.
- **Success criteria.**
  1. Sets Write files and Terminal to Ask (or Deny) in under 1 minute and sees the setting take effect.
  2. Every permission dialog names the actor, the action, the target path and the reason.
  3. Can find what the agent did in a chat, in order, after the fact (Changes, Activity, Event Viewer).
  4. Can tell which actions Agent7 can and cannot control (the honest limit).
  5. Gets a notification when an approval waits on a disconnected desktop, and lands on the right request.
- **Primary journeys.** J06 to J11, J16, J19, J20, J23, J24.

## P3 - Ravi, the power user with several desktops and agents

- **Role and context.** Staff engineer. Runs three or four desktops at once: a bug fix, a refactor, a docs task, an experiment with a second agent (for example Gemini CLI). Switches between them all day, with an external monitor.
- **Goal.** Run agents in parallel, leave them working, and come back only when one needs him.
- **Why Agent7.** Desktops are long-lived and keep running when disconnected. The launcher shows state per desktop.
- **Skills.** Expert. Wants shortcuts, predictable focus, and fast startup.
- **Frustrations.**
  - Not knowing which desktop needs him.
  - Windows that steal focus while he types.
  - Settings that apply to the wrong desktop.
  - Slow reconnect, stale thumbnails, lost window layout.
  - Mouse-only flows.
- **Behaviors.** Uses Ctrl+Esc, Alt+F4, arrow keys. Adds agents with custom commands and environment variables. Reads Task Manager for context use and kills runaway processes.
- **Success criteria.**
  1. Sees the state of every desktop (Idle, Running, Needs your approval, Error) in one glance.
  2. Reconnects to a running desktop in under 2 seconds and finds it exactly as left.
  3. Adds a custom ACP agent and starts a chat with it in under 2 minutes.
  4. Does the whole approve/deny loop from the keyboard.
  5. Ends a stuck agent process from Task Manager and the desktop recovers.
- **Primary journeys.** J07, J12 to J15, J17, J20, J21, J24.

## P4 - Nia, the newcomer who knows Windows but not agents

- **Role and context.** Analyst or designer who writes small scripts. Heard about "AI agents". Knows Windows 7 or later very well. Does not know ACP, tools, permissions or context windows. A colleague installed Agent7 for her.
- **Goal.** Ask the agent to do a small job on a folder (for example rename files, write a summary) and understand what it did.
- **Why Agent7.** The Windows 7 look is familiar. Apps, windows, the Recycle Bin and Start are known concepts.
- **Skills.** Windows power user. No terminal habit.
- **Frustrations.**
  - Words she does not know (ACP, MCP, A2UI, tool, context, turn).
  - Not knowing what to do on an empty screen.
  - Fear of breaking something.
  - Error text that blames her or shows a stack trace.
- **Behaviors.** Right-clicks. Presses F1. Hovers for tooltips. Reads the first paragraph of a dialog and then clicks the default button.
- **Success criteria.**
  1. From the empty launcher, finds New... and creates a desktop without help.
  2. Plugs in a folder and starts a chat on it without learning the word "USB drive" first (the AutoPlay dialog teaches it).
  3. Understands every dialog without a glossary. Default buttons are the safe choice.
  4. Finds help in under 10 seconds (F1 or Start).
  5. Recovers from a mistake (wrong folder, denied a request she meant to allow) without help.
- **Primary journeys.** J01 to J06, J15, J18, J22, J23.

## Persona coverage rules

- Every journey names at least one primary persona.
- A journey passes review only if it passes for its hardest persona. For approvals that is P2 (precision) and P4 (clarity). For multi-desktop work it is P3 (speed).
- Reviewers must run the cognitive walkthrough as P4 for every journey that a first-time user reaches in the first session (J01 to J06, J22, J23).
