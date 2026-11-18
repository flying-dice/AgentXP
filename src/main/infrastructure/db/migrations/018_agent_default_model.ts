/**
 * The model a new chat of the agent starts on (an ACP model id such as `sonnet`). NULL keeps the model the agent chooses
 * itself, which for Claude Code is the `model` of the person's own `~/.claude/settings.json` (often Opus). Applied by
 * `SessionRuntime` when a session opens.
 *
 * Also moves Claude Code off `@zed-industries/claude-code-acp`. That package is deprecated (renamed) and frozen at a
 * release that bundles Claude Code 2.1.44, so it only knows the models of that day (Opus 4.6, Sonnet 4.5). The renamed
 * `@agentclientprotocol/claude-agent-acp` keeps up with Claude Code. Agents that ran the old package, whatever program
 * started it (npx, bunx), now run the new one and start on Sonnet.
 */
export const sql = /* sql */ `
ALTER TABLE agents ADD COLUMN default_model_id TEXT;

UPDATE agent_args SET value = '@agentclientprotocol/claude-agent-acp' WHERE value = '@zed-industries/claude-code-acp';

UPDATE agents SET default_model_id = 'sonnet'
  WHERE id IN (SELECT agent_id FROM agent_args WHERE value = '@agentclientprotocol/claude-agent-acp');
`
