/**
 * The mode a new session of the agent starts in (an ACP session mode id such as `acceptEdits`). NULL keeps the mode the
 * agent chooses itself. Applied by `SessionRuntime` when a fresh ACP session opens; resumed sessions keep their mode.
 */
export const sql = /* sql */ `
ALTER TABLE agents ADD COLUMN default_mode_id TEXT;
`
