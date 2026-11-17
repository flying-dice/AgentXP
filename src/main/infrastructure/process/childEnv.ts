/**
 * Variables a running Claude Code session puts into the environment of what it starts. When AgentXP itself was started
 * from inside such a session (a developer's terminal running Claude Code, `npm run dev` in it), every Claude agent it
 * starts would inherit them and refuse to run ("Claude Code cannot be launched inside another Claude Code session"),
 * and the session's private messaging token would reach the agents. Configuration (ANTHROPIC_API_KEY,
 * CLAUDE_CODE_USE_BEDROCK, ...) is not on this list and is passed on.
 */
export const PARENT_SESSION_VARIABLES: readonly string[] = [
  'CLAUDECODE',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_SESSION_ATTENDED',
  'CLAUDE_CODE_BRIDGE_SESSION_ID',
  'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_EXECPATH',
  'CLAUDE_PID',
  'CLAUDE_EFFORT',
  'AI_AGENT'
]

/** The environment of a child process: AgentXP's own, without a parent Claude Code session's variables, then `extra`. */
export function childEnv(extra: Record<string, string> = {}, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base }
  for (const name of PARENT_SESSION_VARIABLES) delete env[name]
  return { ...env, ...extra }
}
