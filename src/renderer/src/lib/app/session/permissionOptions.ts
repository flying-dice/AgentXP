import type { PermissionInterruptMetadata } from '@shared/agui-state'
import type { PermissionOptionDto } from '@shared/models'

type Kind = PermissionOptionDto['kind']
export type PermissionDecision = 'allow' | 'deny'

const CAPTIONS: Record<Kind, string> = {
  allow_once: 'Allow',
  allow_always: 'Always allow',
  reject_once: 'Deny',
  reject_always: 'Never allow'
}

const KINDS: Record<PermissionDecision, { once: Kind; always: Kind }> = {
  allow: { once: 'allow_once', always: 'allow_always' },
  deny: { once: 'reject_once', always: 'reject_always' }
}

const byKind = (options: readonly PermissionOptionDto[], kind: Kind): PermissionOptionDto | undefined =>
  options.find((o) => o.kind === kind)

/** True when the agent offers an "always" variant, so the dialog shows its "Don't ask again" checkbox. */
export const canRemember = (options: readonly PermissionOptionDto[]): boolean =>
  options.some((o) => o.kind === 'allow_always' || o.kind === 'reject_always')

/**
 * The option behind the Allow / Deny button. With "Don't ask again" ticked it is the "always"
 * variant when the agent offers one; otherwise the plain one, or the other variant as fallback.
 * Null when the agent offers nothing for that decision.
 */
export function optionFor(
  options: readonly PermissionOptionDto[],
  decision: PermissionDecision,
  remember: boolean
): PermissionOptionDto | null {
  const { once, always } = KINDS[decision]
  const order = remember ? [always, once] : [once, always]
  return byKind(options, order[0]) ?? byKind(options, order[1]) ?? null
}

/** Button caption for a decision: the caption of the option it would pick. */
export const captionFor = (options: readonly PermissionOptionDto[], decision: PermissionDecision, remember: boolean): string => {
  const option = optionFor(options, decision, remember)
  return option ? CAPTIONS[option.kind] : decision === 'allow' ? 'Allow' : 'Deny'
}

/** The metadata of a permission interrupt (`Interrupt.metadata` is untyped JSON), or null when it is not one. */
export function permissionMetadata(metadata: unknown): PermissionInterruptMetadata | null {
  if (typeof metadata !== 'object' || metadata === null) return null
  const m = metadata as Partial<PermissionInterruptMetadata>
  return typeof m.title === 'string' && Array.isArray(m.options) ? (m as PermissionInterruptMetadata) : null
}

/** "Edit src/a.ts" -> "edit src/a.ts" for the sentence "Allow Claude to edit src/a.ts?". */
export const asPredicate = (title: string): string => {
  const t = title.trim()
  return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t
}
