/**
 * The plain words the "Agent is using this page" bar and the Activity list show for what the agent does in the page:
 * "Clicking the button 'Send'", "Typing into the message box", "Reading the page". They name the element by its accessible
 * name; the element number (`[6]`) is only in the details of the tool call. Pure, so the words are tested.
 */

/** What the driver knows about the element a ref points to. */
export interface ElementName {
  role: string
  name: string
}

const MAX_NAME = 40

/** The name as one short line, without quotes that would break the sentence. */
const tidy = (name: string): string => {
  const one = name.replace(/\s+/g, ' ').replace(/['"]/g, '').trim()
  return one.length > MAX_NAME ? `${one.slice(0, MAX_NAME - 1).trimEnd()}...` : one
}

const TEXT_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'textarea', 'spinbutton'])
const NAMED_ROLES: Record<string, string> = { button: 'button', link: 'link', checkbox: 'check box', radio: 'option', tab: 'tab', menuitem: 'menu item', switch: 'switch' }

/** What a click lands on, in words: "the button 'Send'", "the link 'More'", "'Send'" for an unknown kind, "an item on the page" without a name. */
export function clickTarget(element: ElementName | undefined): string {
  const name = element ? tidy(element.name) : ''
  const kind = element ? NAMED_ROLES[element.role] : undefined
  if (name && kind) return `the ${kind} '${name}'`
  if (name) return `'${name}'`
  return kind ? `a ${kind}` : 'an item on the page'
}

/** "Clicking the button 'Send'", "Clicking the link 'More'", "Clicking an item on the page" when it has no name. */
export const clickLabel = (element: ElementName | undefined, double = false): string => `${double ? 'Double-clicking' : 'Clicking'} ${clickTarget(element)}`

/** The box a person typed into: "'Message #general'", or "a text box" when it has no name; null when the element is not known. */
export function typeTarget(element: ElementName | undefined): string | null {
  if (!element) return null
  const name = tidy(element.name)
  return name ? `'${name}'` : 'a text box'
}

/** "Typing into the message box" for a box named Message; "Typing into a text box" when it has no name. */
export function typeLabel(element: ElementName | undefined): string {
  if (!element) return 'Typing'
  const name = tidy(element.name)
  if (!name) return 'Typing into a text box'
  if (!TEXT_ROLES.has(element.role)) return `Typing into '${name}'`
  const lower = name.toLowerCase()
  return /\b(box|field)$/.test(lower) ? `Typing into the ${lower}` : `Typing into the ${lower} box`
}

/** "Choosing an option in the Country list". */
export function selectLabel(element: ElementName | undefined): string {
  const name = element ? tidy(element.name) : ''
  return name ? `Choosing an option in the ${name} list` : 'Choosing an option in a list'
}

export const READ_LABEL = 'Reading the page'

/** "Looking for 'Send' on the page" (by text or name), or by role. */
export function findLabel(query: { text?: string; role?: string; name?: string }): string {
  const what = tidy(query.text ?? query.name ?? '')
  if (what) return `Looking for '${what}' on the page`
  return query.role ? `Looking for a ${query.role} on the page` : 'Looking at the page'
}

export const SCREENSHOT_LABEL = 'Looking at the page'

/** What a tabs action says: "Opening a new tab", "Switching to tab 2", "Closing a tab", "Looking at the tabs". */
export function tabsLabel(action: string, tab?: number): string {
  if (action === 'new') return 'Opening a new tab'
  if (action === 'switch') return tab === undefined ? 'Switching tabs' : `Switching to tab ${tab}`
  if (action === 'close') return 'Closing a tab'
  return 'Looking at the tabs'
}

/** The bar while the agent waits: what it waits for is page text, so the words stay general (the wanted text is `waitDetail`). */
export const WAIT_LABEL = 'Waiting for the page to change'

/** The tooltip and the details of a wait: what it waits for, or nothing when it only waits for the page to settle. */
export function waitDetail(text: string | undefined, ref: number | undefined): string | undefined {
  if (text !== undefined) return `Waiting for the text "${tidy(text)}" to show on the page.`
  if (ref !== undefined) return 'Waiting for an item on the page to show.'
  return undefined
}
