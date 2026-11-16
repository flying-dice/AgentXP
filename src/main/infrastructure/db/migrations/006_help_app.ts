/**
 * Help and Support: `app_kinds` gets `help`, so an `app_windows` row of the Help app does not break the
 * foreign key. `INSERT OR IGNORE` keeps the migration safe to run on a database that already has the row.
 */
export const sql = /* sql */ `
INSERT OR IGNORE INTO app_kinds (kind) VALUES ('help');
`
