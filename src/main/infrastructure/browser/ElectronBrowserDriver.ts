import type { WebContents } from 'electron'
import type { Id } from '@shared/models'
import type {
  ActionResult,
  BrowserDriver,
  BrowserGuard,
  FindQuery,
  FoundElement,
  PageBox,
  PageContent,
  PageInfo,
  ReadMode,
  ScrollDirection,
  WaitQuery
} from '../../application/tools/ports'
import { collectItems, containsText, describeItem, findItems, offscreenNodes, outlineLines, refOf, textLines, type AxNode, type OutlineItem, type SnapshotDocument } from './ax'
import { keyEvents, parseKeys } from './keys'
import { ACTIVE_IS_PASSWORD_SCRIPT, SELECT_OPTION_FUNCTION } from './pageScripts'
import { RefTable, type RefTarget } from './refs'

export interface BrowserDriverOptions {
  /** How long a navigation may take before it counts as failed. */
  loadTimeoutMs?: number
  /** How long a call waits for the Browser window's page to be attached. */
  attachTimeoutMs?: number
  /** How long after an action to wait for a navigation to start. */
  settleMs?: number
  /** How often `wait` looks at the page. */
  pollMs?: number
}

const ERR_ABORTED = -3
const CDP_VERSION = '1.3'
const TEXT_ROLES_NOT_TYPABLE = new Set(['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'slider', 'img', 'option', 'treeitem'])
const FIELD_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton', 'TextField', 'SearchBox'])

/** A Chrome DevTools Protocol session on one guest page plus the refs handed out for it. */
interface Session {
  refs: RefTable
  attached: boolean
}

interface Collected {
  items: OutlineItem[]
  viewport: string
}

/**
 * Drives the `<webview>` page of each Browser window through the Chrome DevTools Protocol (`webContents.debugger`):
 * reading is the accessibility tree (every frame; shadow roots are part of it), input is real trusted mouse and
 * key events, so contenteditable composers and React-controlled inputs behave as if a person used them.
 * The renderer reports the guest's `webContents` id (`desktop.attachBrowser`), main calls `attach`; the page
 * attached last is the active tab of that window.
 */
export class ElectronBrowserDriver implements BrowserDriver {
  private readonly guests = new Map<Id, WebContents>()
  private readonly waiting = new Map<Id, ((contents: WebContents) => void)[]>()
  private readonly sessions = new WeakMap<WebContents, Session>()
  private readonly loadTimeoutMs: number
  private readonly attachTimeoutMs: number
  private readonly settleMs: number
  private readonly pollMs: number

  constructor(options: BrowserDriverOptions = {}) {
    this.loadTimeoutMs = options.loadTimeoutMs ?? 20_000
    this.attachTimeoutMs = options.attachTimeoutMs ?? 5_000
    this.settleMs = options.settleMs ?? 400
    this.pollMs = options.pollMs ?? 250
  }

  /** Registers the page of a Browser window as its active page (replacing an earlier one). */
  attach(windowId: Id, contents: WebContents): void {
    this.guests.set(windowId, contents)
    if (!this.sessions.has(contents)) {
      const session: Session = { refs: new RefTable(), attached: false }
      this.sessions.set(contents, session)
      // A new document invalidates every ref. Same-document navigation keeps them.
      contents.on('did-navigate', () => session.refs.reset())
      contents.once('destroyed', () => {
        session.attached = false
        for (const [id, known] of this.guests) if (known === contents) this.guests.delete(id)
        try {
          if (contents.debugger.isAttached()) contents.debugger.detach()
        } catch {
          // The page is gone with its debugger.
        }
      })
    }
    for (const resolve of this.waiting.get(windowId) ?? []) resolve(contents)
    this.waiting.delete(windowId)
  }

  async navigate(windowId: Id, url: string): Promise<PageInfo> {
    const contents = await this.guest(windowId)
    // The Browser app also loads the address (it follows the window view), which aborts the first load: ignore the stop of
    // that aborted load (the page is still about:blank) and wait for the real one.
    await this.untilLoaded(contents, () => void contents.loadURL(url).catch(() => {}), true)
    return info(contents)
  }

  async read(windowId: Id, mode: ReadMode): Promise<PageContent> {
    const contents = await this.guest(windowId)
    const { items, viewport } = await this.collect(contents)
    const refs = this.session(contents).refs
    return { ...info(contents), viewport, lines: mode === 'tree' ? outlineLines(items, refs) : textLines(items) }
  }

  async find(windowId: Id, query: FindQuery): Promise<FoundElement[]> {
    const contents = await this.guest(windowId)
    const { items } = await this.collect(contents)
    const refs = this.session(contents).refs
    const found: FoundElement[] = []
    for (const hit of findItems(items, query)) {
      const ref = refOf(refs, items[hit.index])
      if (ref !== undefined) found.push({ ref, description: describeItem(items[hit.index]), context: hit.context })
    }
    return found
  }

  async screenshot(windowId: Id): Promise<string> {
    const contents = await this.guest(windowId)
    const image = await contents.capturePage()
    if (image.isEmpty()) throw new Error('The page has nothing to capture yet (is the Browser window minimised?).')
    return image.toPNG().toString('base64')
  }

  async click(windowId: Id, ref: number, options: { button: 'left' | 'right' | 'middle'; double: boolean }, guard: BrowserGuard): Promise<ActionResult> {
    const contents = await this.guest(windowId)
    const target = this.target(contents, ref)
    guard()
    const box = await this.boxOf(contents, target, ref)
    guard()
    await this.mouseClick(contents, centre(box), options.button, options.double ? 2 : 1)
    await this.settle(contents)
    return { ...info(contents), box }
  }

  async type(windowId: Id, ref: number | undefined, text: string, submit: boolean, guard: BrowserGuard): Promise<ActionResult> {
    const contents = await this.guest(windowId)
    let box: PageBox | undefined
    if (ref !== undefined) {
      const target = this.target(contents, ref)
      if (TEXT_ROLES_NOT_TYPABLE.has(target.role)) throw new Error(`Element [${ref}] is a ${target.role}, not a text field. Use browser_click for it, or find the text field with browser_find.`)
      guard()
      box = await this.boxOf(contents, target, ref)
      try {
        await this.cdp(contents, 'DOM.focus', { backendNodeId: target.backendNodeId })
      } catch {
        await this.mouseClick(contents, centre(box), 'left', 1) // not focusable by script: click it like a person
      }
    }
    if (await this.focusIsPassword(contents)) throw new Error('Refusing to type into a password field. Ask the user to sign in themselves in the Browser window; the session is kept.')
    guard()
    await this.pressChords(contents, 'Control+A') // replace what is there
    if (text === '') await this.pressChords(contents, 'Delete')
    else await this.cdp(contents, 'Input.insertText', { text })
    if (submit) {
      guard()
      await this.pressChords(contents, 'Enter')
    }
    await this.settle(contents)
    return { ...info(contents), box }
  }

  async press(windowId: Id, keys: string, guard: BrowserGuard): Promise<ActionResult> {
    const contents = await this.guest(windowId)
    let chords
    try {
      chords = parseKeys(keys)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
    for (const chord of chords) {
      guard()
      for (const event of keyEvents(chord)) await this.cdp(contents, 'Input.dispatchKeyEvent', event)
    }
    await this.settle(contents)
    return info(contents)
  }

  async scroll(windowId: Id, target: { ref?: number; direction: ScrollDirection; amount?: number }, guard: BrowserGuard): Promise<ActionResult> {
    const contents = await this.guest(windowId)
    const metrics = await this.layout(contents)
    let box: PageBox | undefined
    let at = { x: metrics.width / 2, y: metrics.height / 2 }
    if (target.ref !== undefined) {
      box = await this.boxOf(contents, this.target(contents, target.ref), target.ref)
      at = centre(box)
    }
    guard()
    const vertical = target.direction === 'up' || target.direction === 'down' || target.direction === 'top' || target.direction === 'bottom'
    const edge = target.direction === 'top' || target.direction === 'bottom'
    const size = target.amount ?? Math.round((vertical ? metrics.height : metrics.width) * 0.8)
    const sign = target.direction === 'up' || target.direction === 'left' || target.direction === 'top' ? -1 : 1
    const delta = (edge ? 1_000_000 : Math.max(1, size)) * sign
    await this.cdp(contents, 'Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX: vertical ? 0 : delta, deltaY: vertical ? delta : 0 })
    await new Promise((resolve) => setTimeout(resolve, Math.min(this.settleMs, 350))) // scroll animation, lazy loading
    const after = await this.layout(contents)
    return { ...info(contents), box, note: `viewport ${after.width}x${after.height}, page scrolled ${Math.round(after.scrollY)} of ${Math.max(0, Math.round(after.contentHeight - after.height))} px down, ${Math.round(after.scrollX)} px across` }
  }

  async wait(windowId: Id, query: WaitQuery, guard: BrowserGuard): Promise<{ found: boolean; waitedMs: number }> {
    const contents = await this.guest(windowId)
    const started = Date.now()
    const done = (found: boolean): { found: boolean; waitedMs: number } => ({ found, waitedMs: Date.now() - started })
    const target = query.ref !== undefined ? this.target(contents, query.ref) : undefined
    for (;;) {
      guard()
      if (query.text !== undefined) {
        if (containsText((await this.collect(contents, false)).items, query.text)) return done(true)
      } else if (target) {
        try {
          await this.cdp(contents, 'DOM.getBoxModel', { backendNodeId: target.backendNodeId })
          return done(true)
        } catch {
          // not there (yet)
        }
      } else {
        if (contents.isLoading()) await this.untilLoaded(contents, () => {}).catch(() => {})
        await new Promise((resolve) => setTimeout(resolve, Math.min(query.timeoutMs, 500)))
        return done(true)
      }
      if (Date.now() - started >= query.timeoutMs) return done(false)
      await new Promise((resolve) => setTimeout(resolve, this.pollMs))
    }
  }

  async select(windowId: Id, ref: number, option: string, guard: BrowserGuard): Promise<ActionResult> {
    const contents = await this.guest(windowId)
    const target = this.target(contents, ref)
    guard()
    const box = await this.boxOf(contents, target, ref)
    const resolved = (await this.cdp(contents, 'DOM.resolveNode', { backendNodeId: target.backendNodeId })) as { object?: { objectId?: string } }
    const objectId = resolved.object?.objectId
    if (!objectId) throw this.stale(ref)
    const outcome = (await this.cdp(contents, 'Runtime.callFunctionOn', {
      objectId,
      functionDeclaration: SELECT_OPTION_FUNCTION,
      arguments: [{ value: option }],
      returnByValue: true
    })) as { result?: { value?: { ok: boolean; error?: string; label?: string; options?: string[] } } }
    const value = outcome.result?.value
    if (!value?.ok) {
      if (value?.error === 'not-select') throw new Error(`Element [${ref}] is not a native drop-down list. Click it with browser_click, then click the option.`)
      if (value?.error === 'disabled') throw new Error(`The option "${option}" is disabled.`)
      throw new Error(`No option "${option}" in [${ref}]. Options: ${(value?.options ?? []).join(' | ') || 'none'}.`)
    }
    return { ...info(contents), box, note: `selected "${value.label}"` }
  }

  async elementOf(windowId: Id, ref: number): Promise<{ role: string; name: string } | undefined> {
    const target = this.session(await this.guest(windowId)).refs.get(ref)
    return target ? { role: target.role, name: target.name } : undefined
  }

  async back(windowId: Id): Promise<PageInfo> {
    const contents = await this.guest(windowId)
    if (!contents.navigationHistory.canGoBack()) throw new Error('There is no earlier page to go back to.')
    await this.untilLoaded(contents, () => contents.navigationHistory.goBack())
    return info(contents)
  }

  async forward(windowId: Id): Promise<PageInfo> {
    const contents = await this.guest(windowId)
    if (!contents.navigationHistory.canGoForward()) throw new Error('There is no later page to go forward to.')
    await this.untilLoaded(contents, () => contents.navigationHistory.goForward())
    return info(contents)
  }

  async reload(windowId: Id): Promise<PageInfo> {
    const contents = await this.guest(windowId)
    await this.untilLoaded(contents, () => contents.reload())
    return info(contents)
  }

  // ---- DevTools protocol -------------------------------------------------------------------------

  private session(contents: WebContents): Session {
    const known = this.sessions.get(contents)
    if (known) return known
    const session: Session = { refs: new RefTable(), attached: false }
    this.sessions.set(contents, session)
    return session
  }

  /** Attaches the debugger once per page; re-attaches after the page lost it (for example DevTools opened and closed). */
  private async ensureAttached(contents: WebContents): Promise<Session> {
    const session = this.session(contents)
    if (session.attached && contents.debugger.isAttached()) return session
    if (!contents.debugger.isAttached()) {
      try {
        contents.debugger.attach(CDP_VERSION)
      } catch (error) {
        if (!contents.debugger.isAttached()) throw new Error(`The page cannot be controlled: ${error instanceof Error ? error.message : String(error)}`)
      }
      contents.debugger.once('detach', () => {
        session.attached = false
      })
    }
    session.attached = true
    await contents.debugger.sendCommand('Page.enable').catch(() => {})
    await contents.debugger.sendCommand('DOM.enable').catch(() => {})
    // The page behaves as focused even when the user works in another window (carets, :focus, blur handlers).
    await contents.debugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {})
    return session
  }

  private async cdp(contents: WebContents, method: string, params?: object): Promise<unknown> {
    await this.ensureAttached(contents)
    try {
      return await contents.debugger.sendCommand(method, params)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/detached|closed|not attached/i.test(message)) this.session(contents).attached = false
      throw new Error(message.replace(/^Protocol error \([^)]*\):\s*/, ''))
    }
  }

  private async layout(contents: WebContents): Promise<{ width: number; height: number; scrollX: number; scrollY: number; contentHeight: number }> {
    const m = (await this.cdp(contents, 'Page.getLayoutMetrics')) as {
      cssVisualViewport?: { clientWidth: number; clientHeight: number; pageX: number; pageY: number }
      cssContentSize?: { height: number }
    }
    const v = m.cssVisualViewport
    return { width: v?.clientWidth ?? 800, height: v?.clientHeight ?? 600, scrollX: v?.pageX ?? 0, scrollY: v?.pageY ?? 0, contentHeight: m.cssContentSize?.height ?? v?.clientHeight ?? 600 }
  }

  /** The accessibility tree of every frame, with the facts the outline needs (off-screen boxes, password fields). */
  private async collect(contents: WebContents, withBoxes = true): Promise<Collected> {
    const tree = (await this.cdp(contents, 'Page.getFrameTree')) as { frameTree: FrameNode }
    const frameIds: string[] = []
    const visit = (f: FrameNode): void => {
      frameIds.push(f.frame.id)
      for (const child of f.childFrames ?? []) visit(child)
    }
    visit(tree.frameTree)
    const rootFrameId = tree.frameTree.frame.id

    const frames = new Map<string, AxNode[]>()
    for (const frameId of frameIds) {
      try {
        const result = (await this.cdp(contents, 'Accessibility.getFullAXTree', { frameId })) as { nodes: AxNode[] }
        frames.set(frameId, result.nodes)
      } catch (error) {
        if (frameId === rootFrameId) throw error // a child frame that cannot be read (other process) is shown as a note
      }
    }

    const iframeChild = new Map<string, string>()
    const passwords = new Set<string>()
    for (const [frameId, nodes] of frames) {
      for (const node of nodes) {
        const backend = node.backendDOMNodeId
        if (backend === undefined || node.ignored) continue
        const role = String(node.role?.value ?? '')
        const owner = node.frameId ?? frameId
        if (role === 'Iframe') {
          const described = await this.describe(contents, backend)
          const child = described?.frameId ?? described?.contentDocument?.frameId
          if (child) iframeChild.set(`${owner}:${backend}`, child)
        } else if (FIELD_ROLES.has(role) || role === 'combobox') {
          const described = await this.describe(contents, backend)
          const attributes = described?.attributes ?? []
          for (let i = 0; i + 1 < attributes.length; i += 2) {
            if (attributes[i] === 'type' && attributes[i + 1].toLowerCase() === 'password') passwords.add(`${owner}:${backend}`)
          }
        }
      }
    }

    const layout = await this.layout(contents)
    let offscreen: Set<number> | undefined
    if (withBoxes) {
      try {
        const snapshot = (await this.cdp(contents, 'DOMSnapshot.captureSnapshot', { computedStyles: [] })) as { documents: SnapshotDocument[] }
        const doc = snapshot.documents.find((d) => d.frameId === rootFrameId) ?? snapshot.documents[0]
        if (doc) offscreen = offscreenNodes(doc, { width: layout.width, height: layout.height })
      } catch {
        // No box information: nothing is marked off-screen.
      }
    }
    const items = collectItems({
      rootFrameId,
      frames,
      iframeChild,
      offscreen: offscreen ? (frameId, backend) => frameId === rootFrameId && offscreen!.has(backend) : undefined,
      redact: (frameId, backend) => passwords.has(`${frameId}:${backend}`)
    })
    return { items, viewport: `viewport ${layout.width}x${layout.height}, page scrolled ${Math.round(layout.scrollY)} of ${Math.max(0, Math.round(layout.contentHeight - layout.height))} px down` }
  }

  private async describe(contents: WebContents, backendNodeId: number): Promise<DescribedNode | undefined> {
    try {
      return ((await this.cdp(contents, 'DOM.describeNode', { backendNodeId })) as { node?: DescribedNode }).node
    } catch {
      return undefined
    }
  }

  private target(contents: WebContents, ref: number): RefTarget {
    const target = this.session(contents).refs.get(ref)
    if (!target) throw new Error(`Element [${ref}] is not known on this page. Call browser_read (or browser_find) again to get current refs; refs reset when the page navigates.`)
    return target
  }

  private stale(ref: number): Error {
    return new Error(`Element [${ref}] is gone or has no box on the page. Call browser_read (or browser_find) again to get current refs.`)
  }

  /** Scrolls the node into view and returns its box in viewport coordinates. */
  private async boxOf(contents: WebContents, target: RefTarget, ref: number): Promise<PageBox> {
    try {
      await this.cdp(contents, 'DOM.scrollIntoViewIfNeeded', { backendNodeId: target.backendNodeId })
    } catch {
      // Some nodes cannot scroll (fixed headers); the box below tells whether they are usable.
    }
    let quad: number[] | undefined
    try {
      const model = (await this.cdp(contents, 'DOM.getBoxModel', { backendNodeId: target.backendNodeId })) as { model?: { content: number[]; border?: number[] } }
      quad = model.model?.content
      if (quad && boxFromQuad(quad).width * boxFromQuad(quad).height === 0) quad = model.model?.border ?? quad
    } catch {
      try {
        const quads = (await this.cdp(contents, 'DOM.getContentQuads', { backendNodeId: target.backendNodeId })) as { quads?: number[][] }
        quad = quads.quads?.[0]
      } catch {
        throw this.stale(ref)
      }
    }
    if (!quad) throw this.stale(ref)
    const box = boxFromQuad(quad)
    if (box.width <= 0 || box.height <= 0) throw new Error(`Element [${ref}] is not visible (it has no size). Open the menu or section that contains it, or scroll, then browser_read again.`)
    return box
  }

  private async mouseClick(contents: WebContents, at: { x: number; y: number }, button: 'left' | 'right' | 'middle', count: number): Promise<void> {
    await this.cdp(contents, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, button: 'none' })
    for (let clickCount = 1; clickCount <= count; clickCount++) {
      await this.cdp(contents, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button, buttons: buttonMask(button), clickCount })
      await this.cdp(contents, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button, buttons: 0, clickCount })
    }
  }

  private async pressChords(contents: WebContents, keys: string): Promise<void> {
    for (const chord of parseKeys(keys)) for (const event of keyEvents(chord)) await this.cdp(contents, 'Input.dispatchKeyEvent', event)
  }

  private async focusIsPassword(contents: WebContents): Promise<boolean> {
    try {
      const result = (await this.cdp(contents, 'Runtime.evaluate', { expression: ACTIVE_IS_PASSWORD_SCRIPT, returnByValue: true })) as { result?: { value?: unknown } }
      return result.result?.value === true
    } catch {
      return false
    }
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

  /** After an action: give a navigation time to start, then wait for it to finish. */
  private async settle(contents: WebContents): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.settleMs))
    if (contents.isLoading()) await this.untilLoaded(contents, () => {})
  }

  /** Starts `trigger` and resolves when the page stops loading (rejects on a failed main-frame load or after the timeout). */
  private untilLoaded(contents: WebContents, trigger: () => void, ignoreBlankStop = false): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error): void => {
        clearTimeout(timer)
        if (poll) clearInterval(poll)
        contents.off('did-stop-loading', onStop)
        contents.off('did-fail-load', onFail)
        if (error) reject(error)
        else resolve()
      }
      const onStop = (): void => {
        if (ignoreBlankStop && (contents.getURL() === 'about:blank' || contents.getURL() === '')) return
        finish()
      }
      const onFail = (_event: unknown, code: number, description: string, _url: string, isMainFrame: boolean): void => {
        if (isMainFrame && code !== ERR_ABORTED) finish(new Error(`The page failed to load: ${description} (${code}).`))
      }
      const timer = setTimeout(() => finish(new Error(`The page did not finish loading within ${Math.round(this.loadTimeoutMs / 1000)} seconds.`)), this.loadTimeoutMs)
      // A stop event can be missed when the load is restarted by another navigation: also look at the page itself.
      const poll = ignoreBlankStop
        ? setInterval(() => {
            const at = contents.getURL()
            if (!contents.isLoading() && at !== 'about:blank' && at !== '') finish()
          }, 100)
        : undefined
      contents.on('did-stop-loading', onStop)
      contents.on('did-fail-load', onFail)
      trigger()
    })
  }
}

interface FrameNode {
  frame: { id: string }
  childFrames?: FrameNode[]
}

interface DescribedNode {
  frameId?: string
  contentDocument?: { frameId?: string }
  attributes?: string[]
}

const info = (contents: WebContents): PageInfo => ({ title: contents.getTitle(), url: contents.getURL() })

/** Bounding box of a CDP quad (x1,y1,...,x4,y4). */
export function boxFromQuad(quad: number[]): PageBox {
  const xs = [quad[0], quad[2], quad[4], quad[6]]
  const ys = [quad[1], quad[3], quad[5], quad[7]]
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

export const centre = (box: PageBox): { x: number; y: number } => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

const buttonMask = (button: 'left' | 'right' | 'middle'): number => (button === 'left' ? 1 : button === 'right' ? 2 : 4)
