import { SYSTEM_DRIVE, type VPath } from '@shared/vfs'

/** Drive shown for a file whose project is not plugged in (a VPath that cannot be opened). */
export const UNPLUGGED_DRIVE = '?'

/** `letter:\relative\path` from a stored root-relative path (`/`-separated). */
export const toStoredVPath = (letter: string | null, relativePath: string): VPath =>
  `${letter ?? UNPLUGGED_DRIVE}:\\${relativePath.replaceAll('/', '\\')}`

/**
 * SQL expression for the drive letter of a stored location: C for the system disk, else the letter the
 * desktop has the folder plugged in under (NULL when it is not). `desktopExpr` is the desktop id expression.
 */
export const driveLetterSql = (folderIdExpr: string, desktopExpr: string): string =>
  `CASE WHEN ${folderIdExpr} IS NULL THEN '${SYSTEM_DRIVE}'
        ELSE (SELECT dd.letter FROM desktop_drives dd WHERE dd.desktop_id = ${desktopExpr} AND dd.folder_id = ${folderIdExpr}) END`
