import { EventEmitter } from 'node:events'
import type { WebContents } from 'electron'
import { describe, expect, it } from 'vitest'
import { ElectronBrowserDriver } from './ElectronBrowserDriver'

/** Just enough of `WebContents` for the driver. */
class FakeGuest extends EventEmitter {
  url = 'about:blank'
  title = ''
  loading = false
  history = ['about:blank']
  /** Every CDP command sent, in order. */
  cdp: { method: string; params?: Record<string, unknown> }[] = []
  /** Answers per method (a function gets the params; throw to fail). */
  answers: Record<string, unknown> = {}
  attached = false
  attachCount = 0
  debugger = {
    isAttached: () => this.attached,
    attach: () => {
      this.attached = true
      this.attachCount++
    },
    detach: () => {
      this.attached = false
    },
    once: () => {},
    sendCommand: async (method: string, params?: Record<string, unknown>) => {
      this.cdp.push({ method, params })
      const answer = this.answers[method]
      if (typeof answer === 'function') return (answer as (p?: Record<string, unknown>) => unknown)(params)
      return answer ?? {}
    }
  }
  /** What a load does: resolve with did-stop-loading, or fail. */
  onLoad: (url: string) => void = (url) => {
    this.url = url
    this.title = `Title of ${url}`
    queueMicrotask(() => this.emit('did-stop-loading'))
  }
  navigationHistory = {
    canGoBack: () => this.history.length > 1,
    goBack: () => {
      this.history.pop()
      this.url = this.history.at(-1)!
      queueMicrotask(() => this.emit('did-stop-loading'))
    },
    canGoForward: () => false,
    goForward: () => {}
  }
  isDestroyed = () => false
  isLoading = () => this.loading
  getURL = () => this.url
  getTitle = () => this.title
  loadURL = async (url: string) => {
    this.history.push(url)
    this.onLoad(url)
  }
  reload = () => queueMicrotask(() => this.emit('did-stop-loading'))
  capturePage = async () => ({ isEmpty: () => false, toPNG: () => Buffer.from('png-bytes') })
}

const guest = (): FakeGuest => new FakeGuest()
const asContents = (g: FakeGuest): WebContents => g as unknown as WebContents
const driverWith = (g: FakeGuest, options = {}): ElectronBrowserDriver => {
  const driver = new ElectronBrowserDriver({ settleMs: 1, ...options })
  driver.attach(7, asContents(g))
  return driver
}

const ax = (id: string, role: string, name: string, childIds: string[], backend: number | undefined, parentId?: string, frameId?: string) => ({
  nodeId: id,
  role: { value: role },
  name: { value: name },
  childIds,
  parentId,
  backendDOMNodeId: backend,
  frameId
})

/** A page with a heading, a button [backend 11], a textbox [backend 12] and an iframe holding a search box. */
function setUpPage(g: FakeGuest): void {
  g.answers['Page.getFrameTree'] = { frameTree: { frame: { id: 'main' }, childFrames: [{ frame: { id: 'child' } }] } }
  g.answers['Accessibility.getFullAXTree'] = (p?: Record<string, unknown>) =>
    p?.frameId === 'child'
      ? { nodes: [ax('c1', 'RootWebArea', 'Search', ['c2'], undefined), ax('c2', 'searchbox', 'Find', [], 31, 'c1')] }
      : {
          nodes: [
            ax('1', 'RootWebArea', 'T', ['2', '3', '4', '5'], undefined),
            ax('2', 'heading', 'Hi', ['2a'], 10, '1'),
            ax('2a', 'StaticText', 'Hi', [], 10, '2'),
            ax('3', 'button', 'Send', [], 11, '1'),
            ax('4', 'textbox', 'Message', [], 12, '1'),
            ax('5', 'Iframe', 'Search', [], 20, '1')
          ]
        }
  g.answers['DOM.describeNode'] = (p?: Record<string, unknown>) => (p?.backendNodeId === 20 ? { node: { frameId: 'child' } } : { node: { attributes: ['type', 'text'] } })
  g.answers['Page.getLayoutMetrics'] = { cssVisualViewport: { clientWidth: 800, clientHeight: 600, pageX: 0, pageY: 0 }, cssContentSize: { height: 2000 } }
  g.answers['DOM.getBoxModel'] = { model: { content: [10, 100, 110, 100, 110, 140, 10, 140] } }
  g.answers['DOMSnapshot.captureSnapshot'] = { documents: [] }
  g.answers['Runtime.evaluate'] = { result: { value: false } }
}

describe('ElectronBrowserDriver', () => {
  it('navigates and waits for did-stop-loading', async () => {
    const g = guest()
    expect(await driverWith(g).navigate(7, 'https://example.com/')).toEqual({ title: 'Title of https://example.com/', url: 'https://example.com/' })
  })

  it('fails when the main frame fails to load, ignores aborted loads and sub-frames', async () => {
    const g = guest()
    g.onLoad = () => {
      g.url = 'https://a.example/'
      queueMicrotask(() => {
        g.emit('did-fail-load', {}, -3, 'ERR_ABORTED', 'x', true)
        g.emit('did-fail-load', {}, -105, 'ERR_NAME_NOT_RESOLVED', 'x', false)
        g.emit('did-stop-loading')
      })
    }
    await expect(driverWith(g).navigate(7, 'https://a.example/')).resolves.toBeDefined()
    g.onLoad = () => queueMicrotask(() => g.emit('did-fail-load', {}, -105, 'ERR_NAME_NOT_RESOLVED', 'x', true))
    await expect(driverWith(g).navigate(7, 'https://nope.example/')).rejects.toThrow(/ERR_NAME_NOT_RESOLVED/)
  })

  it('times out a page that never finishes', async () => {
    const g = guest()
    g.onLoad = () => {}
    await expect(driverWith(g, { loadTimeoutMs: 20 }).navigate(7, 'https://slow.example/')).rejects.toThrow(/did not finish loading/)
  })

  it('reads the accessibility tree of every frame and hands out refs', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g)
    const page = await driver.read(7, 'tree')
    expect(page.lines).toEqual(['heading "Hi"', '[1] button "Send"', '[2] textbox "Message"', 'iframe "Search"', '  [3] searchbox "Find"'])
    expect(page.viewport).toContain('viewport 800x600')
    expect(g.attachCount).toBe(1)
    await driver.read(7, 'text')
    expect(g.attachCount).toBe(1) // attached once
    expect((await driver.find(7, { text: 'send' }))[0]).toMatchObject({ ref: 1, description: 'button "Send"' })
    expect((await driver.read(7, 'text')).lines).toEqual(['## Hi', 'Send'])
  })

  it('never returns the value of a password field', async () => {
    const g = guest()
    setUpPage(g)
    g.answers['Accessibility.getFullAXTree'] = (p?: Record<string, unknown>) =>
      p?.frameId === 'main'
        ? { nodes: [ax('1', 'RootWebArea', 'T', ['2'], undefined), { ...ax('2', 'textbox', 'Password', [], 21, '1'), value: { value: 'hunter2' } }] }
        : { nodes: [] }
    g.answers['DOM.describeNode'] = () => ({ node: { attributes: ['type', 'password'] } })
    const page = await driverWith(g).read(7, 'tree')
    expect(page.lines.join('')).not.toContain('hunter2')
    expect(page.lines[0]).toContain('(password)')
  })

  it('clicks at the centre of the box with real mouse events, after scrolling into view', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g)
    await driver.read(7, 'tree')
    g.cdp.length = 0
    const result = await driver.click(7, 1, { button: 'left', double: false }, () => {})
    expect(g.cdp.map((c) => c.method)).toEqual(['DOM.scrollIntoViewIfNeeded', 'DOM.getBoxModel', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent'])
    expect(g.cdp[2].params).toMatchObject({ type: 'mouseMoved', x: 60, y: 120 })
    expect(g.cdp[3].params).toMatchObject({ type: 'mousePressed', x: 60, y: 120, clickCount: 1 })
    expect(result.box).toEqual({ x: 10, y: 100, width: 100, height: 40 })
    await driver.click(7, 1, { button: 'right', double: true }, () => {})
    expect(g.cdp.filter((c) => c.params?.type === 'mousePressed').map((c) => c.params?.clickCount)).toEqual([1, 1, 2])
  })

  it('types with insertText into the focused ref after selecting all, and presses Enter on submit', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g)
    await driver.read(7, 'tree')
    g.cdp.length = 0
    await driver.type(7, 2, 'héllo', true, () => {})
    const methods = g.cdp.map((c) => `${c.method}${c.params?.type ? ':' + c.params.type : ''}`)
    expect(methods).toEqual([
      'DOM.scrollIntoViewIfNeeded',
      'DOM.getBoxModel',
      'DOM.focus',
      'Runtime.evaluate',
      'Input.dispatchKeyEvent:rawKeyDown',
      'Input.dispatchKeyEvent:keyUp',
      'Input.insertText',
      'Input.dispatchKeyEvent:keyDown',
      'Input.dispatchKeyEvent:keyUp'
    ])
    expect(g.cdp[4].params).toMatchObject({ commands: ['selectAll'], modifiers: 2 })
    expect(g.cdp[6].params).toEqual({ text: 'héllo' })
    expect(g.cdp[7].params).toMatchObject({ key: 'Enter', text: '\r' })
  })

  it('refuses to type into a password field and into a button', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g)
    await driver.read(7, 'tree')
    await expect(driver.type(7, 1, 'x', false, () => {})).rejects.toThrow(/is a button/)
    g.answers['Runtime.evaluate'] = { result: { value: true } }
    await expect(driver.type(7, 2, 'secret', false, () => {})).rejects.toThrow(/password field/)
    expect(g.cdp.some((c) => c.method === 'Input.insertText')).toBe(false)
  })

  it('presses key chords and rejects bad ones', async () => {
    const g = guest()
    const driver = driverWith(g)
    await driver.press(7, 'Control+K ArrowDown', () => {})
    expect(g.cdp.filter((c) => c.method === 'Input.dispatchKeyEvent').map((c) => `${c.params?.type}:${c.params?.key}`)).toEqual(['rawKeyDown:k', 'keyUp:k', 'rawKeyDown:ArrowDown', 'keyUp:ArrowDown'])
    await expect(driver.press(7, 'Nope', () => {})).rejects.toThrow(/Unknown key/)
  })

  it('scrolls with the mouse wheel at the viewport centre or over a ref', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g)
    await driver.read(7, 'tree')
    g.cdp.length = 0
    const result = await driver.scroll(7, { direction: 'up' }, () => {})
    const wheel = g.cdp.find((c) => c.params?.type === 'mouseWheel')!
    expect(wheel.params).toMatchObject({ x: 400, y: 300, deltaY: -480, deltaX: 0 })
    expect(result.note).toContain('page scrolled')
    await driver.scroll(7, { direction: 'right', amount: 50, ref: 1 }, () => {})
    expect(g.cdp.filter((c) => c.params?.type === 'mouseWheel').at(-1)!.params).toMatchObject({ x: 60, y: 120, deltaX: 50, deltaY: 0 })
  })

  it('waits for text, times out, and honours the guard', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g, { pollMs: 5 })
    expect(await driver.wait(7, { text: 'send', timeoutMs: 200 }, () => {})).toMatchObject({ found: true })
    expect(await driver.wait(7, { text: 'never there', timeoutMs: 30 }, () => {})).toMatchObject({ found: false })
    await driver.read(7, 'tree')
    expect(await driver.wait(7, { ref: 1, timeoutMs: 50 }, () => {})).toMatchObject({ found: true })
    let calls = 0
    await expect(
      driver.wait(7, { text: 'never there', timeoutMs: 5000 }, () => {
        if (++calls > 2) throw new Error('AgentXP is paused by the user.')
      })
    ).rejects.toThrow(/paused/)
  })

  it('selects an option of a native select and reports the choices when none matches', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g)
    await driver.read(7, 'tree')
    g.answers['DOM.resolveNode'] = { object: { objectId: 'obj-1' } }
    g.answers['Runtime.callFunctionOn'] = { result: { value: { ok: true, label: 'Two' } } }
    expect((await driver.select(7, 1, 'two', () => {})).note).toBe('selected "Two"')
    g.answers['Runtime.callFunctionOn'] = { result: { value: { ok: false, error: 'no-option', options: ['One', 'Two'] } } }
    await expect(driver.select(7, 1, 'three', () => {})).rejects.toThrow(/Options: One \| Two/)
    g.answers['Runtime.callFunctionOn'] = { result: { value: { ok: false, error: 'not-select' } } }
    await expect(driver.select(7, 1, 'x', () => {})).rejects.toThrow(/not a native drop-down/)
  })

  it('refs are unknown after a navigation and a stale node is reported', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g)
    await driver.read(7, 'tree')
    g.emit('did-navigate')
    await expect(driver.click(7, 1, { button: 'left', double: false }, () => {})).rejects.toThrow(/not known on this page/)
    await driver.read(7, 'tree') // refs 4-6 now
    g.answers['DOM.getBoxModel'] = () => {
      throw new Error('Could not find node with given id')
    }
    g.answers['DOM.getContentQuads'] = () => {
      throw new Error('Could not find node with given id')
    }
    await expect(driver.click(7, 4, { button: 'left', double: false }, () => {})).rejects.toThrow(/is gone/)
  })

  it('detaches the debugger when the page is destroyed', async () => {
    const g = guest()
    const driver = driverWith(g)
    await driver.press(7, 'Enter', () => {})
    expect(g.attached).toBe(true)
    g.emit('destroyed')
    expect(g.attached).toBe(false)
  })

  it('goes forward and reloads', async () => {
    const g = guest()
    const driver = driverWith(g)
    await expect(driver.forward(7)).rejects.toThrow(/no later page/)
    expect((await driver.reload(7)).url).toBe('about:blank')
  })

  it('waits for the navigation a click starts', async () => {
    const g = guest()
    setUpPage(g)
    const driver = driverWith(g)
    await driver.read(7, 'tree')
    g.loading = true
    setTimeout(() => {
      g.url = 'https://next.example/'
      g.loading = false
      g.emit('did-stop-loading')
    }, 15)
    expect((await driver.click(7, 1, { button: 'left', double: false }, () => {})).url).toBe('https://next.example/')
  })

  it('goes back, or says there is nothing to go back to', async () => {
    const g = guest()
    const driver = driverWith(g)
    await expect(driver.back(7)).rejects.toThrow(/no earlier page/)
    await driver.navigate(7, 'https://one.example/')
    expect((await driver.back(7)).url).toBe('about:blank')
  })

  it('waits for a late attach, and gives a clear error when no page is attached', async () => {
    const driver = new ElectronBrowserDriver({ attachTimeoutMs: 30 })
    await expect(driver.read(1, 'tree')).rejects.toThrow(/no page yet/)
    const late = driver.screenshot(2)
    driver.attach(2, asContents(guest()))
    await expect(late).resolves.toBeTruthy()
  })

  it('forgets a page that was destroyed', async () => {
    const g = guest()
    const driver = driverWith(g, { attachTimeoutMs: 10 })
    g.emit('destroyed')
    await expect(driver.read(7, 'tree')).rejects.toThrow(/no page yet/)
  })
})
