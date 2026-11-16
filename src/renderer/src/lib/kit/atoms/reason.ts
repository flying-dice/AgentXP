/**
 * The reason a button is off (UX-127). A disabled button says why in its tooltip and in `aria-description` (read with the
 * button), and `ReasonNote` shows the same words in one line next to it. `reasonFor` builds the attributes, so every button
 * words its reason the same way:
 *
 *   <Button {...reasonFor(selected ? null : 'Select a chat first')}>End Task</Button>
 */
export interface ReasonAttrs {
  disabled: boolean
  title: string | undefined
  'aria-description': string | undefined
}

/** `reason` is why the button is off (plain words), or null/empty when it is on; `title` is the tooltip of a button that is on. */
export function reasonFor(reason: string | null | undefined, title?: string): ReasonAttrs {
  const off = !!reason
  return { disabled: off, title: off ? reason : title, 'aria-description': off ? reason : undefined }
}

/** The first reason that applies, in order: `firstReason([!agent && 'Select an agent first', agent.isDefault && 'This is already the default'])`. */
export function firstReason(candidates: readonly (string | false | null | undefined)[]): string | null {
  return candidates.find((c): c is string => typeof c === 'string' && c !== '') ?? null
}
