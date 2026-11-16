import type { WebContents } from 'electron'
import type { Id } from '@shared/models'
import type { BrowserDriver, PageInfo, PageSnapshot } from '../../application/tools/ports'
import { READ_PAGE_SCRIPT, clickScript, typeScript } from './pageScripts'

export interface BrowserDriverOptions {
  /** How long a navigation may take before it counts as failed. */
  loadTimeoutMs?: number
  /** How long a call waits for the Browser window's page to be attached. */
  attachTimeoutMs?: number
  /** How long after a click to wait for a navigation to start. */
  settleMs?: number
}

const ERR_ABORTED = -3

/**
 * Drives the `<webview>` page of each Browser window. The renderer reports the guest's
 * `webContents` id (`desktop.attachBrowser`), main calls `attach`; everything else here is
 * ordinary `webContents` automation, so it works on any `WebContents`.
 */
export class ElectronBrowserDriver implements BrowserDriver {
  private readonly guests = new Map<Id, WebContents>()
  private readonly waiting = new Map<Id, ((contents: WebContents) => void)[]>()
  private readonly loadTimeoutMs: number
  private readonly attachTimeoutMs: number
  private readonly settleMs: number

  constructor(options: BrowserDriverOptions = {}) {
    this.loadTimeoutMs = options.loadTimeoutMs ?? 20_000
    this.attachTimeoutMs = options.attachTimeoutMs ?? 5_000
    this.settleMs = options.settleMs ?? 400
  }

  /** Registers the page of a Browser window (replacing an earlier one). */
  attach(windowId: Id, contents: WebContents): void {
    this.guests.set(windowId, contents)
    contents.once('destroyed', () => {
      if (this.guests.get(windowId) === contents) this.guests.delete(windowId)
    })
    for (const resolve of this.waiting.get(windowId) ?? []) resolve(contents)
    this.waiting.delete(windowId)
  }

  async navigate(windowId: Id, url: string): Promise<PageInfo> {
    const contents = await this.guest(windowId)
    await this.untilLoaded(contents, () => void contents.loadURL(url).catch(() => {}))
    return info(contents)
  }

  async read(windowId: Id): Promise<PageSnapshot> {
    const contents = await this.guest(windowId)
    return (await contents.executeJavaScript(READ_PAGE_SCRIPT)) as PageSnapshot
  }

  async screenshot(windowId: Id): Promise<string> {
    const contents = await this.guest(windowId)
    const image = await contents.capturePage()
    if (image.isEmpty()) throw new Error('The page has nothing to capture yet (is the Browser window minimised?).')
    return image.toPNG().toString('base64')
  }

  async click(windowId: Id, ref: number): Promise<PageInfo> {
    const contents = await this.guest(windowId)
    await this.afterAction(contents, ref, () => contents.executeJavaScript(clickScript(ref)))
    return info(contents)
  }

  async type(windowId: Id, ref: number, text: string, submit: boolean): Promise<PageInfo> {
    const contents = await this.guest(windowId)
    await this.afterAction(contents, ref, () => contents.executeJavaScript(typeScript(ref, text, submit)))
    return info(contents)
  }

  async back(windowId: Id): Promise<PageInfo> {
    const contents = await this.guest(windowId)
    if (!contents.navigationHistory.canGoBack()) throw new Error('There is no earlier page to go back to.')
    await this.untilLoaded(contents, () => contents.navigationHistory.goBack())
    return info(contents)
  }

  // ---- internals ---------------------------------------------------------------------------------

  private async guest(windowId: Id): Promise<WebContents> {
    const known = this.guests.get(windowId)
    if (known && !known.isDestroyed()) return known
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.set(windowId, (this.waiting.get(windowId) ?? []).filter((r) => r !== onAttached))
        reject(new Error('The Browser window has no page yet. Try again in a moment.'))
      }, this.attachTimeoutMs)
      const onAttached = (contents: WebContents): void => {
        clearTimeout(timer)
        resolve(contents)
      }
      this.waiting.set(windowId, [...(this.waiting.get(windowId) ?? []), onAttached])
    })
  }

  /** Runs a page script, then waits for the navigation it may have caused. */
  private async afterAction(contents: WebContents, ref: number, run: () => Promise<unknown>): Promise<void> {
    const result = (await run()) as { ok?: boolean } | undefined
    if (!result?.ok) throw new Error(`Element [${ref}] was not found. Call browser_read again to get fresh numbers.`)
    await new Promise((resolve) => setTimeout(resolve, this.settleMs))
    if (contents.isLoading()) await this.untilLoaded(contents, () => {})
  }

  /** Starts `trigger` and resolves when the page stops loading (rejects on a failed main-frame load or after the timeout). */
  private untilLoaded(contents: WebContents, trigger: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error): void => {
        clearTimeout(timer)
        contents.off('did-stop-loading', onStop)
        contents.off('did-fail-load', onFail)
        if (error) reject(error)
        else resolve()
      }
      const onStop = (): void => finish()
      const onFail = (_event: unknown, code: number, description: string, _url: string, isMainFrame: boolean): void => {
        if (isMainFrame && code !== ERR_ABORTED) finish(new Error(`The page failed to load: ${description} (${code}).`))
      }
      const timer = setTimeout(() => finish(new Error(`The page did not finish loading within ${Math.round(this.loadTimeoutMs / 1000)} seconds.`)), this.loadTimeoutMs)
      contents.on('did-stop-loading', onStop)
      contents.on('did-fail-load', onFail)
      trigger()
    })
  }
}

const info = (contents: WebContents): PageInfo => ({ title: contents.getTitle(), url: contents.getURL() })
