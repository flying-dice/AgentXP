/** What the Browser says about a page: the load error, the status bar text and the zoom. Pure, so the words are tested. */
import { BLANK } from './address'

/** A page that did not load: the address, the plain cause and the technical text (Chromium's error name). */
export interface LoadFailure {
  url: string
  cause: string
  technical: string
}

/** The address without its scheme, as the error page names it ('127.0.0.1:9'). */
export const shortAddress = (url: string): string => url.replace(/^https?:\/\//i, '').replace(/\/$/, '')

const CAUSES: [RegExp, string][] = [
  [/NAME_NOT_RESOLVED|NAME_RESOLUTION|DNS/i, 'The name of the website was not found.'],
  [/INTERNET_DISCONNECTED|NETWORK_CHANGED|NETWORK_IO|ADDRESS_UNREACHABLE/i, 'The computer is not connected to the internet.'],
  [/TIMED_OUT/i, 'The website took too long to answer.'],
  [/UNSAFE_PORT/i, 'The address uses a port that the Browser blocks (the number after the colon).'],
  [/CONNECTION_REFUSED/i, 'Nothing answered at this address.'],
  [/CERT|SSL|SECURE/i, 'The security certificate of the website is not valid.']
]

/** Turns the failure Chromium reports (`ERR_CONNECTION_REFUSED`...) into a failure for the error page. */
export function describeLoadFailure(url: string, errorDescription: string): LoadFailure {
  const cause = CAUSES.find(([pattern]) => pattern.test(errorDescription))?.[1] ?? 'The website did not answer.'
  return { url, cause, technical: errorDescription }
}

/** Chromium reports `ERR_ABORTED` (-3) when a load is replaced or stopped on purpose: that is not an error to show. */
export const isShownFailure = (errorCode: number, isMainFrame: boolean): boolean => isMainFrame && errorCode !== -3

/** What to try for each error Chromium reports, matched on its name (`ERR_CONNECTION_REFUSED`...). The first match wins. */
const FAILURE_HINTS: [RegExp, string][] = [
  [/UNSAFE_PORT/i, 'Check the port (here :{port}), or ask whoever gave you the address for another one.'],
  [/CONNECTION_REFUSED/i, 'Nothing is listening at this address. Check the address, or start the program that serves it. Refresh will only work after that.'],
  [/NAME_NOT_RESOLVED|NAME_RESOLUTION|DNS/i, 'The name of the website was not found. Check the spelling, then check your network.'],
  [/INTERNET_DISCONNECTED|NETWORK_CHANGED|NETWORK_IO|ADDRESS_UNREACHABLE|TIMED_OUT/i, 'Check that your computer is online, then click Refresh.'],
  [/CERT|SSL|SECURE/i, 'The website cannot prove who it is. Check the address, and do not enter a password on this page.']
]

const FALLBACK_HINT = 'Make sure the address is right, then click Refresh.'

/** The port of an address ('127.0.0.1:9' gives '9'), or '' when it has none. */
const portOf = (url: string): string => /^(?:[a-z]+:\/\/)?[^/:]+:(\d+)/i.exec(url)?.[1] ?? ''

/** The one next step the error page gives for this failure (it names the real cause, not a generic list). */
export function failureHint(failure: LoadFailure): string {
  const hint = FAILURE_HINTS.find(([pattern]) => pattern.test(failure.technical))?.[1] ?? FALLBACK_HINT
  return hint.replace(':{port}', `:${portOf(failure.url) || '?'}`)
}

/** The agent's access to the page, from the Browser permission (Control Center > Permissions). */
export type AssistantAccess = 'allow' | 'ask' | 'deny'

/** The "Agent:" segment of the status bar: whether the agent can read the page that is open, and whether it did. */
export function assistantStatus(access: AssistantAccess, reading: boolean, hasRead = false): string {
  if (access === 'deny') return 'Agent: cannot read pages'
  if (reading) return 'Agent: reading'
  if (hasRead) return 'The agent read this page'
  return access === 'ask' ? 'Agent: asks first' : 'Agent: can read this page'
}

export const ASSISTANT_TOOLTIP = 'The assistant can read this page when you ask it. Change this in Control Center > Permissions > Browser.'

/** The question that "Ask about this page" puts in the chat box. */
export const ASK_ABOUT_PAGE_QUESTION = 'What does this page say?'

export interface PageStatusInput {
  url: string
  loading: boolean
  failed: boolean
}

/** The left cell of the status bar. */
export function pageStatus({ url, loading, failed }: PageStatusInput): string {
  if (failed) return 'Could not load the page'
  if (loading) return 'Connecting...'
  return url === BLANK ? 'Ready' : 'Done'
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 5

/** The next zoom factor: ten points per step, 0 resets to 100 percent. */
export function stepZoom(zoom: number, direction: -1 | 0 | 1): number {
  if (direction === 0) return 1
  const next = Math.round((zoom + direction * 0.1) * 100) / 100
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
}

export const zoomText = (zoom: number): string => `${Math.round(zoom * 100)}%`

/** The tooltip of the Take over button: what one click does, in plain words. */
export const TAKE_OVER_BUTTON_TIP = 'Stop the agent here and use the page yourself.'

/** How long "The agent read this page." stays in the yellow bar after the read is done (UX-128). */
export const READ_DONE_MS = 5000

/** How long the bar stays after the agent's last action, saying that the agent stopped (UX-214). */
export const STOPPED_MS = 5000

/** What the bar says while the user has the page (UX-214): the agent waits, and the way to let it go on. */
export const TAKEN_OVER_TEXT = 'You have the page. The agent waits. Click Give back to let it continue.'
/** The tooltip of the Give back button of the bar. */
export const GIVE_BACK_BUTTON_TIP = 'Let the agent use the page again.'
/** What the bar says for a few seconds after the agent's last action. */
export const STOPPED_TEXT = 'The agent stopped using this page.'

/** What the yellow bar over the page says: that the user has the page, that the agent finished reading or stopped, or what it does now. */
export function agentBarText({ userInControl, readDone, activity, stopped = false }: { userInControl: boolean; readDone: boolean; activity: string | null; stopped?: boolean }): string {
  if (userInControl) return TAKEN_OVER_TEXT
  if (readDone) return 'The agent read this page.'
  if (stopped && activity === null) return STOPPED_TEXT
  return `Agent is using this page: ${activity ?? 'working'}`
}
