import { parseVPath, type DriveDto, type VPath } from '@shared/vfs'

/**
 * Where a chat works, as a person says it: "login-app (E:)" for the project on drive E:, "Agent (C:)" for the agent's
 * home. A bare path such as `E:\` means nothing to a new user.
 */
export function folderLabel(cwd: VPath, drives: readonly Pick<DriveDto, 'letter' | 'label'>[]): string {
  const parsed = parseVPath(cwd)
  if (!parsed) return cwd
  const drive = drives.find((d) => d.letter === parsed.drive)
  const name = parsed.segments.length > 0 ? parsed.segments[parsed.segments.length - 1]! : (drive?.label ?? '')
  return name ? `${name} (${parsed.drive}:)` : `${parsed.drive}:`
}
