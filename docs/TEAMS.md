# Skills, MCP servers, teams and team chat

How agents get capabilities and how a team works in a chat room. Types live in `src/shared/teams.ts`.

## Skills and MCP servers

- A **skill** is a folder with a `SKILL.md` (front matter `name` and `description`). Install copies it into `userData/skills`.
- An **MCP server** is a stdio command or an HTTP URL, with env vars or headers (a var can be secret) and a switch per tool.
  `test` connects with the MCP SDK client, lists the tools and stores them.
- A plain chat gets every enabled skill and server. `AgentCapabilities` builds the `mcpServers` list of `session/new` and `session/load`.
- Skills reach the agent as a hidden resource block (`agent7://briefing`) on the first prompt of a session. The transcript hides it.
- When tools of a server are switched off, the server is launched behind a stdio filtering proxy
  (`infrastructure/mcp/proxy-entry.ts`, Electron in node mode, env `AGENT7_MCP_TARGET` and `AGENT7_MCP_HIDE`).

## Profiles and teams

A profile is a name, instructions (the role lives there), an optional agent and model, and its own skills and servers.
A team is an ordered list of profiles, team instructions, team skills and a `boardRef` hook for a work board.
Profile names must be unique by mention handle (`mentionHandle`). Profiles are per chat, not global roles.

## Team chat

A room is a chat room, not a pipeline.

- Each member is its own ACP session (role `aside`) that starts on its first call.
- `@name` calls a member; `@all` calls everyone. With no mention the last speaker answers, else the first member.
- A called member runs at once, so members run in parallel. A message to a busy member queues behind its current turn.
- The room keeps only final messages. Members see what happened since they last looked, as a short transcript.
- The room shows `thinking…`, `starting…`, `waiting for approval` and error states from the ACP session.
  A member's full session opens in a side panel.
- There are no loop caps or guardrails. Behaviour is set by the instructions.
- Worktrees and isolation are left to instructions and basic tools.

Code: `application/teams/TeamRoomService.ts`, window in `lib/apps/team-chat`, manuals `manuals/teams.md` and `manuals/team-chat.md`.
