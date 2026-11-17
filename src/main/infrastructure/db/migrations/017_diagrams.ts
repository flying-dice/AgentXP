/**
 * Version 15: the Agent Diagrams app. Its drawings are .xpdiagram files on the virtual drives, so the only change is
 * the new app kind for its windows.
 */
export const sql = `
INSERT OR IGNORE INTO app_kinds (kind) VALUES ('diagrams');
`
