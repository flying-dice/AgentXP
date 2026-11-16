import type { Id } from '@shared/models'
import { AppError } from '../errors'
import type { ToolHandlers } from './catalog'
import { PAUSED_MESSAGE } from '../desktop/AppToolPolicy'
import { paginate } from './paging'
import type { ActionResult, AppRequests, BrowserDriver, BrowserGuard, DesktopOps, PageBox, PageInfo, PageContent } from './ports'
import { attempt, imageResult, textResult, type ToolContext, type ToolResult } from './types'
import { pickWindow } from './windows'
import { clickLabel, findLabel, READ_LABEL, SCREENSHOT_LABEL, selectLabel, tabsLabel, typeLabel, type ElementName } from './browserLabels'

type FindArgs = { text?: string; role?: string; name?: string; limit?: number; window?: number }

const SCHEMES = new Set(['http:', 'https:'])

/** While a tool runs, the Browser app is told again this often, so its bar stays up for the whole job (it goes 20 s after the last word). */
export const HEARTBEAT_MS = 5000

/** An http(s) address; a bare host gets https. Anything else (file:, javascript:...) is refused. */
export function normalizeUrl(input: string): string {
  const text = input.trim()
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/]+:\d+(\/|$)/.test(text) ? text : `https://${text}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new AppError(`Not a valid address: ${input}`)
  }
  if (!SCHEMES.has(url.protocol)) throw new AppError(`Only http and https addresses can be opened (got ${url.protocol}).`)
  return url.href
}

/** One tab of the Browser window as the renderer reports it. */
export interface TabInfo {
  id: number
  title: string
  url: string
  active: boolean
}

export interface TabsResult {
  tabs: TabInfo[]
  note?: string
}

export const formatTabs = ({ tabs, note }: TabsResult): string =>
  [
    ...(note ? [note] : []),
    tabs.length === 0 ? 'No tabs.' : tabs.map((t) => `${t.active ? '*' : ' '} tab ${t.id}: ${t.title || '(untitled)'} - ${t.url}`).join('\n'),
    '(* = active tab; browser tools act on it)'
  ].join('\n')

/** One page of `browser_read`: a header, the lines and how to continue. */
export function formatRead(page: PageContent, mode: 'tree' | 'text', offset: number | undefined, limit: number | undefined): string {
  const slice = paginate(page.lines, offset, limit)
  const last = slice.offset + slice.lines.length
  return [
    `Title: ${page.title}`,
    `URL: ${page.url}`,
    ...(page.viewport ? [page.viewport] : []),
    slice.total === 0
      ? `The page has no ${mode === 'tree' ? 'accessible content' : 'text'} (yet). Try browser_wait, then read again.`
      : `Lines ${slice.offset + 1}-${last} of ${slice.total} (${mode}).${slice.nextOffset === null ? ' End of page.' : ` nextOffset: ${slice.nextOffset} (call browser_read again with offset ${slice.nextOffset}).`}`,
    ...(mode === 'tree' && slice.total > 0 ? ['Interactive nodes have a [ref]; use it with browser_click, browser_type, browser_scroll, browser_wait.'] : []),
    '',
    ...slice.lines
  ].join('\n')
}

export interface BrowserToolsDeps {
  desktops: DesktopOps
  driver: BrowserDriver
  /** Asks the Browser app (tabs, the highlight ring). Without it `browser_tabs` is unavailable and nothing is highlighted. */
  requests?: AppRequests
}

type BrowserToolName =
  | 'browser_navigate'
  | 'browser_read'
  | 'browser_find'
  | 'browser_screenshot'
  | 'browser_click'
  | 'browser_type'
  | 'browser_press'
  | 'browser_scroll'
  | 'browser_wait'
  | 'browser_select'
  | 'browser_tabs'
  | 'browser_back'
  | 'browser_forward'
  | 'browser_reload'

/** browser_*: drives a Browser window's page through the `BrowserDriver`. */
export function createBrowserTools({ desktops, driver, requests }: BrowserToolsDeps): ToolHandlers<BrowserToolName> {
  const windowId = (desktopId: Id, requested?: number): Id => pickWindow(desktops.state(desktopId), 'browser', requested).id

  /** Mirrors what the page is doing into the window's view (the Browser app and the desktop state show it). */
  const showPage = (desktopId: Id, id: Id, page: Partial<PageInfo>, loading: boolean): void => {
    const current = desktops.state(desktopId).windows.find((w) => w.id === id)
    if (current?.view.app !== 'browser') return
    desktops.updateView(id, { ...current.view, url: page.url ?? current.view.url, title: page.title ?? current.view.title, loading })
  }

  /** The user can pause Agent7 or take control while an action runs: the driver checks this between its steps. */
  const guardFor = (desktopId: Id): BrowserGuard => {
    const startedInControl = desktops.state(desktopId).userInControl
    return () => {
      const state = desktops.state(desktopId)
      if (state.paused) throw new AppError(PAUSED_MESSAGE)
      if (state.userInControl && !startedInControl) throw new AppError('The user took control of the desktop, so the action was stopped.')
    }
  }

  /** Tells the Browser app what the agent is doing (the "Agent is using this page" bar and the highlight ring). Never blocks or fails. */
  const announce = (desktopId: Id, id: Id, label: string, box?: PageBox, reading?: boolean): void => {
    void requests?.request(desktopId, id, 'activity', { label, box, reading }, 1500).catch(() => {})
  }

  /** Announces `label` now and every few seconds until `run` ends: a slow action keeps the bar on screen. Reads announce too. */
  const whileAnnounced = async <T>(desktopId: Id, id: Id, label: string, run: () => Promise<T>, reading?: boolean): Promise<T> => {
    announce(desktopId, id, label, undefined, reading)
    const timer = setInterval(() => announce(desktopId, id, label, undefined, reading), HEARTBEAT_MS)
    try {
      return await run()
    } finally {
      clearInterval(timer)
      if (reading) announce(desktopId, id, label, undefined, false) // done reading: the bar stays, "Agent: reading" goes
    }
  }

  /** The accessible name of the element a ref points to, for the words of the bar. Never fails. */
  const elementOf = async (id: Id, ref: number | undefined): Promise<ElementName | undefined> => (ref === undefined ? undefined : driver.elementOf(id, ref).catch(() => undefined))

  /** A tool that acts on the page and reports where it ended up. */
  const act =
    <A extends { window?: number; ref?: number }>(
      label: (args: A, element: ElementName | undefined) => string,
      run: (id: Id, args: A, guard: BrowserGuard) => Promise<ActionResult>,
      done: (result: ActionResult, args: A) => string
    ) =>
    (args: A, { desktopId }: ToolContext) =>
      attempt(async () => {
        const id = windowId(desktopId, args.window)
        const guard = guardFor(desktopId)
        guard()
        const words = label(args, await elementOf(id, args.ref))
        const result = await whileAnnounced(desktopId, id, words, () => run(id, args, guard))
        showPage(desktopId, id, result, false)
        announce(desktopId, id, words, result.box)
        return textResult(done(result, args))
      })

  const where = (r: PageInfo): string => `Now at ${r.url} ("${r.title}").`
  const say = (r: ActionResult, text: string): string => `${text}${r.note ? ` (${r.note})` : ''} ${where(r)}`

  /** A tool that only looks: it announces too ("Reading the page"), so the bar and "Agent: reading" show it. */
  const look =
    <A extends { window?: number }>(label: (args: A) => string, run: (id: Id, args: A) => Promise<ToolResult>) =>
    (args: A, { desktopId }: ToolContext) =>
      attempt(async () => {
        const id = windowId(desktopId, args.window)
        return whileAnnounced(desktopId, id, label(args), () => run(id, args), true)
      })

  const navigation = (label: string, verb: string, run: (id: Id) => Promise<PageInfo>) =>
    act<{ window?: number }>(
      () => label,
      async (id) => run(id),
      (page) => `${verb} ${page.url} ("${page.title}").`
    )

  return {
    browser_navigate: ({ url, window }, { desktopId }) =>
      attempt(async () => {
        const address = normalizeUrl(url)
        const id = windowId(desktopId, window)
        guardFor(desktopId)()
        showPage(desktopId, id, { url: address }, true) // the Browser app shows the address at once
        try {
          const page = await whileAnnounced(desktopId, id, `Opening ${address}`, () => driver.navigate(id, address))
          showPage(desktopId, id, page, false)
          return textResult(`Loaded ${page.url} ("${page.title}").`)
        } catch (error) {
          showPage(desktopId, id, {}, false)
          throw error
        }
      }),

    browser_read: look(() => READ_LABEL, async (id, { mode, offset, limit }: { mode?: 'tree' | 'text'; offset?: number; limit?: number; window?: number }) =>
      textResult(formatRead(await driver.read(id, mode ?? 'tree'), mode ?? 'tree', offset, limit))
    ),

    browser_find: look<FindArgs>(findLabel, async (id, { text, role, name, limit }) => {
      if (!text && !role) throw new AppError('Give `text`, or a `role` (with an optional `name`).')
      const found = await driver.find(id, { text, role, name })
      if (found.length === 0) return textResult('Nothing matched. The element may be off-screen in a list that loads lazily (browser_scroll), inside a closed menu, or not loaded yet (browser_wait).')
      const shown = found.slice(0, limit ?? 20)
      return textResult(
        [`${found.length} match${found.length === 1 ? '' : 'es'}${shown.length < found.length ? `, showing ${shown.length}` : ''}:`, ...shown.map((f) => `[${f.ref}] ${f.description}${f.context ? `  <- ${f.context}` : ''}`)].join('\n')
      )
    }),

    browser_screenshot: look(() => SCREENSHOT_LABEL, async (id) => imageResult(await driver.screenshot(id), 'image/png', 'Screenshot of the page.')),

    browser_click: act(
      ({ double }, element) => clickLabel(element, double),
      (id, { ref, button, double }, guard) => driver.click(id, ref, { button: button ?? 'left', double: double ?? false }, guard),
      (r, { ref, double }) => say(r, `${double ? 'Double-clicked' : 'Clicked'} [${ref}].`)
    ),

    browser_type: act(
      (_args, element) => typeLabel(element),
      (id, { ref, text, submit }, guard) => driver.type(id, ref, text, submit ?? false, guard),
      (r, { ref, submit }) => say(r, `Typed into ${ref === undefined ? 'the focused element' : `[${ref}]`}${submit ? ' and pressed Enter' : ''}.`)
    ),

    browser_press: act(
      ({ keys }) => `Pressing ${keys}`,
      (id, { keys }, guard) => driver.press(id, keys, guard),
      (r, { keys }) => say(r, `Pressed ${keys}.`)
    ),

    browser_scroll: act(
      ({ direction }) => `Scrolling ${direction ?? 'down'}`,
      (id, { direction, amount, ref }, guard) => driver.scroll(id, { ref, direction: direction ?? 'down', amount }, guard),
      (r, { direction }) => say(r, `Scrolled ${direction ?? 'down'}. Read the page again to see what loaded.`)
    ),

    browser_wait: ({ text, ref, timeoutMs, window }, { desktopId }) =>
      attempt(async () => {
        const id = windowId(desktopId, window)
        const guard = guardFor(desktopId)
        guard()
        const what = text !== undefined ? `"${text}"` : ref !== undefined ? `[${ref}]` : 'the page to settle'
        const result = await whileAnnounced(desktopId, id, `Waiting for ${what}`, () => driver.wait(id, { text, ref, timeoutMs: timeoutMs ?? 5000 }, guard))
        return textResult(result.found ? `Done waiting for ${what} after ${result.waitedMs} ms.` : `Timed out after ${result.waitedMs} ms waiting for ${what}. Read the page to see where it stands.`)
      }),

    browser_select: act(
      (_args, element) => selectLabel(element),
      (id, { ref, option }, guard) => driver.select(id, ref, option, guard),
      (r, { ref }) => say(r, `Chose an option in [${ref}].`)
    ),

    browser_tabs: ({ action, url, tab, window }, { desktopId }) =>
      attempt(async () => {
        if (!requests) throw new AppError('Tabs are not available here.')
        const id = windowId(desktopId, window)
        if ((action === 'switch') && tab === undefined) throw new AppError('browser_tabs switch needs `tab` (a tab number from the list).')
        const result = await whileAnnounced(desktopId, id, tabsLabel(action, tab), async () => (await requests.request(desktopId, id, 'tabs', { action, url: url ? normalizeUrl(url) : undefined, tab })) as TabsResult)
        return textResult(formatTabs(result))
      }),

    browser_back: navigation('Going back', 'Went back to', (id) => driver.back(id)),
    browser_forward: navigation('Going forward', 'Went forward to', (id) => driver.forward(id)),
    browser_reload: navigation('Reloading', 'Reloaded', (id) => driver.reload(id))
  }
}
