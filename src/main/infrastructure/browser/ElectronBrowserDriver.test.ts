import { EventEmitter } from 'node:events'
import type { WebContents } from 'electron'
import { describe, expect, it } from 'vitest'
import { ElectronBrowserDriver } from './ElectronBrowserDriver'

/** Just enough of `WebContents` for the driver. */
class FakeGuest extends EventEmitter {
  url = 'about:blank'
  title = ''
  loading = false
  scripts: string[] = []
  history = ['about:blank']
  scriptResult: unknown = { ok: true }
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
    }
  }
  isDestroyed = () => false
  isLoading = () => this.loading
  getURL = () => this.url
  getTitle = () => this.title
  loadURL = async (url: string) => {
    this.history.push(url)
    this.onLoad(url)
  }
  executeJavaScript = async (code: string) => {
    this.scripts.push(code)
    return this.scriptResult
  }
  capturePage = async () => ({ isEmpty: () => false, toPNG: () => Buffer.from('png-bytes') })
}

const guest = (): FakeGuest => new FakeGuest()
const asContents = (g: FakeGuest): WebContents => g as unknown as WebContents
const driverWith = (g: FakeGuest, options = {}): ElectronBrowserDriver => {
  const driver = new ElectronBrowserDriver({ settleMs: 1, ...options })
  driver.attach(7, asContents(g))
  return driver
}

describe('ElectronBrowserDriver', () => {
  it('navigates and waits for did-stop-loading', async () => {
    const g = guest()
    expect(await driverWith(g).navigate(7, 'https://example.com/')).toEqual({ title: 'Title of https://example.com/', url: 'https://example.com/' })
  })

  it('fails when the main frame fails to load, ignores aborted loads and sub-frames', async () => {
    const g = guest()
    g.onLoad = () => {
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

  it('reads the page through the read script', async () => {
    const g = guest()
    g.scriptResult = { title: 'T', url: 'u', text: 'hello', elements: [{ ref: 1, kind: 'button', label: 'Go' }] }
    const page = await driverWith(g).read(7)
    expect(page.elements[0]).toMatchObject({ ref: 1, label: 'Go' })
    expect(g.scripts[0]).toContain('data-agent7-ref')
  })

  it('returns the screenshot as base64 PNG', async () => {
    expect(await driverWith(guest()).screenshot(7)).toBe(Buffer.from('png-bytes').toString('base64'))
  })

  it('clicks and types by ref, and reports a stale ref', async () => {
    const g = guest()
    const driver = driverWith(g)
    await driver.click(7, 4)
    expect(g.scripts[0]).toContain('[data-agent7-ref="4"]')
    await driver.type(7, 2, 'he"llo', true)
    expect(g.scripts[1]).toContain('[data-agent7-ref="2"]')
    expect(g.scripts[1]).toContain(JSON.stringify('he"llo'))
    g.scriptResult = { ok: false }
    await expect(driver.click(7, 9)).rejects.toThrow(/Element \[9\] was not found/)
  })

  it('waits for the navigation a click starts', async () => {
    const g = guest()
    g.loading = true
    setTimeout(() => {
      g.url = 'https://next.example/'
      g.loading = false
      g.emit('did-stop-loading')
    }, 15)
    expect((await driverWith(g).click(7, 1)).url).toBe('https://next.example/')
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
    await expect(driver.read(1)).rejects.toThrow(/no page yet/)
    const late = driver.screenshot(2)
    driver.attach(2, asContents(guest()))
    await expect(late).resolves.toBeTruthy()
  })

  it('forgets a page that was destroyed', async () => {
    const g = guest()
    const driver = driverWith(g, { attachTimeoutMs: 10 })
    g.emit('destroyed')
    await expect(driver.read(7)).rejects.toThrow(/no page yet/)
  })
})
