/**
 * The reason Agent7 itself asks before a tool runs ("Run commands is set to Ask in Control Center") travels beside the
 * request as its own field, never inside the command text. The request's raw input carries it; the approval box shows it
 * on its own line under the command.
 */
export const gateRawInput = (reason: string): string => JSON.stringify({ reason })

/** The reason of a request that Agent7 asked for, as a sentence ("... in Control Center."), or null for any other request. */
export function gateReasonOf(rawInput: string | null | undefined): string | null {
  if (!rawInput) return null
  try {
    const parsed: unknown = JSON.parse(rawInput)
    const reason = typeof parsed === 'object' && parsed !== null ? (parsed as { reason?: unknown }).reason : undefined
    if (typeof reason !== 'string' || reason.trim() === '') return null
    const text = reason.trim()
    return /[.!?]$/.test(text) ? text : `${text}.`
  } catch {
    return null
  }
}
