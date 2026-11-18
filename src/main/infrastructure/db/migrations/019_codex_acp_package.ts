/** Move existing Codex adapters to the maintained ACP package, keeping other arguments and settings. */
export const sql = /* sql */ `
UPDATE agent_args SET value = '@agentclientprotocol/codex-acp' WHERE value = '@zed-industries/codex-acp';
`
