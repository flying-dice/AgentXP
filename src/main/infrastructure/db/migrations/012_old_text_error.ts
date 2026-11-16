/**
 * Why the current text of a file could not be read when a change was proposed ("in use", "unreadable"). It is saved with
 * the change so the approval box says why after a reload, not only while the request is fresh.
 */
export const sql = /* sql */ `
ALTER TABLE tool_call_contents ADD COLUMN old_text_error TEXT CHECK (old_text_error IN ('unreadable','in_use'));
`
