import type { AguiToolCallState, PermissionInterruptMetadata } from '@shared/agui-state'
import type { PermissionOptionDto } from '@shared/models'
import { toolLabel } from './toolTitles'

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

// ---- keys and the announcement of the answer ------------------------------------------------------------------

/** The access keys of the two answers (Alt+A, Alt+D); the dialogs underline them while Alt is held. A alone allows too. */
export const ACCESS_KEYS: Record<PermissionDecision, string> = { allow: 'a', deny: 'd' }

/**
 * How long the permission dialog ignores answers after it appears. It opens by itself over whatever the user is doing, so
 * a key meant for another window (an "a" typed in Notepad, Enter in a chat) or a click aimed at the request it replaced
 * must not answer it.
 */
export const ANSWER_ARM_MS = 700

/** The line under the answers of both permission dialogs. */
export const KEY_HINT = 'Enter denies. Press A to allow.'

/**
 * The answer a key press stands for, or null: A allows; Alt+A and Alt+D answer from anywhere in the box. Enter is not here: it
 * presses the focused button, and the first focus is on Deny.
 */
export function decisionForKey(event: { key: string; altKey: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }): PermissionDecision | null {
  if (event.ctrlKey || event.metaKey) return null
  const key = event.key.toLowerCase()
  if (!event.altKey) return key === ACCESS_KEYS.allow && !event.shiftKey ? 'allow' : null
  return key === ACCESS_KEYS.allow ? 'allow' : key === ACCESS_KEYS.deny ? 'deny' : null
}

/** The index of the access key in a caption ("Allow" 0, "Never allow" 2), or -1 when the caption has no such letter. */
export const accessKeyIndex = (caption: string, decision: PermissionDecision): number => caption.toLowerCase().indexOf(ACCESS_KEYS[decision])

/** True when the option answers Allow (once or always). */
export const isAllow = (kind: Kind): boolean => kind === 'allow_once' || kind === 'allow_always'

/** What a request is about, as the Action Center words it ("Change NOTE.md"), for the line that says what the user answered. */
export function requestLabel(meta: Pick<PermissionInterruptMetadata, 'title' | 'toolKind'>, toolCall?: AguiToolCallState): string {
  const diff = toolCall?.contents.find((c) => c.kind === 'diff')
  return toolLabel({ title: meta.title, toolKind: meta.toolKind, path: (diff?.kind === 'diff' ? diff.path : toolCall?.locations[0]?.path) ?? null })
}

/** What the chat says after the user answers: "You allowed: Change NOTE.md." / "You denied: Run a command." */
export const decisionText = (allowed: boolean, label: string): string => `You ${allowed ? 'allowed' : 'denied'}: ${label}.`
