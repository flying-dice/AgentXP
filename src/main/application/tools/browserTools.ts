import type { Id } from '@shared/models'
import { AppError } from '../errors'
import type { ToolHandlers } from './catalog'
import type { BrowserDriver, DesktopOps, PageInfo, PageSnapshot } from './ports'
import { attempt, imageResult, textResult, type ToolContext } from './types'
import { pickWindow } from './windows'

const SCHEMES = new Set(['http:', 'https:'])

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

export const formatSnapshot = (page: PageSnapshot): string =>
  [
    `Title: ${page.title}`,
    `URL: ${page.url}`,
    '',
    page.text,
    '',
    page.elements.length === 0
      ? 'No interactive elements.'
      : 'Elements (use the number as ref):\n' +
        page.elements.map((e) => `[${e.ref}] ${e.kind}: ${e.label}${e.detail ? ` -> ${e.detail}` : ''}`).join('\n')
  ].join('\n')

export interface BrowserToolsDeps {
  desktops: DesktopOps
  driver: BrowserDriver
}

/** browser_*: drives a Browser window's page through the `BrowserDriver`. */
export function createBrowserTools({ desktops, driver }: BrowserToolsDeps): ToolHandlers<
  'browser_navigate' | 'browser_read' | 'browser_screenshot' | 'browser_click' | 'browser_type' | 'browser_back'
> {
  const windowId = (desktopId: Id, requested?: number): Id => pickWindow(desktops.state(desktopId), 'browser', requested).id

  /** Mirrors what the page is doing into the window's view (the Browser app and the desktop state show it). */
  const showPage = (desktopId: Id, id: Id, page: Partial<PageInfo>, loading: boolean): void => {
    const current = desktops.state(desktopId).windows.find((w) => w.id === id)
    if (current?.view.app !== 'browser') return
    desktops.updateView(id, { ...current.view, url: page.url ?? current.view.url, title: page.title ?? current.view.title, loading })
  }

  /** A tool that acts on the page and reports where it ended up. */
  const act =
    <A extends { window?: number }>(run: (id: Id, args: A) => Promise<PageInfo>, label: (page: PageInfo, args: A) => string) =>
    (args: A, { desktopId }: ToolContext) =>
      attempt(async () => {
        const id = windowId(desktopId, args.window)
        const page = await run(id, args)
        showPage(desktopId, id, page, false)
        return textResult(label(page, args))
      })

  return {
    browser_navigate: ({ url, window }, { desktopId }) =>
      attempt(async () => {
        const address = normalizeUrl(url)
        const id = windowId(desktopId, window)
        showPage(desktopId, id, { url: address }, true) // the Browser app shows the address at once
        try {
          const page = await driver.navigate(id, address)
          showPage(desktopId, id, page, false)
          return textResult(`Loaded ${page.url} ("${page.title}").`)
        } catch (error) {
          showPage(desktopId, id, {}, false)
          throw error
        }
      }),

    browser_read: ({ window }, { desktopId }) => attempt(async () => textResult(formatSnapshot(await driver.read(windowId(desktopId, window))))),

    browser_screenshot: ({ window }, { desktopId }) =>
      attempt(async () => imageResult(await driver.screenshot(windowId(desktopId, window)), 'image/png', 'Screenshot of the page.')),

    browser_click: act(
      (id, { ref }) => driver.click(id, ref),
      (page, { ref }) => `Clicked [${ref}]. Now at ${page.url} ("${page.title}").`
    ),

    browser_type: act(
      (id, { ref, text, submit }) => driver.type(id, ref, text, submit ?? false),
      (page, { ref }) => `Typed into [${ref}]. Now at ${page.url} ("${page.title}").`
    ),

    browser_back: act(
      (id) => driver.back(id),
      (page) => `Went back to ${page.url} ("${page.title}").`
    )
  }
}
