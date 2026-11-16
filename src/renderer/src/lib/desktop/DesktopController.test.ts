import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeApi } from '../app/fakeApi'
import { DesktopController, VIEW_DEBOUNCE_MS } from './DesktopController.svelte'

async function started(): Promise<{ api: ReturnType<typeof createFakeApi>; controller: DesktopController }> {
  const api = createFakeApi()
  const controller = new DesktopController(api)
  await controller.start()
  return { api, controller }
}

describe('DesktopController', () => {
  afterEach(() => vi.useRealTimers())

  it('loads the current desktop and follows pushes', async () => {
    const { controller } = await started()
    expect(controller.loaded).toBe(true)
    expect(controller.needsDesktop).toBe(false)
    const opened = await controller.openApp({ app: 'terminal' })
    expect(controller.state.windows.map((w) => w.id)).toContain(opened.id)
    expect(controller.state.focusedWindowId).toBe(opened.id)
    expect(controller.state.tools).toContain('terminal')
    controller.dispose()
  })

  it('needs a desktop when current() is null', async () => {
    const api = createFakeApi()
    api.desktop.current = async () => null
    const controller = new DesktopController(api)
    await controller.start()
    expect(controller.needsDesktop).toBe(true)
  })

  it('moves locally while dragging and sends bounds once on commit', async () => {
    const { api, controller } = await started()
    const w = await controller.openApp({ app: 'notepad' })
    const spy = vi.spyOn(api.desktop, 'setBounds')
    controller.moveLocal(w.id, { x: 5, y: 6, width: 300, height: 200 })
    controller.moveLocal(w.id, { x: 10, y: 12, width: 300, height: 200 })
    expect(controller.boundsOf(controller.windowById(w.id)!).x).toBe(10)
    expect(spy).not.toHaveBeenCalled()
    await controller.commitBounds(w.id)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(w.id, { x: 10, y: 12, width: 300, height: 200 })
    expect(controller.windowById(w.id)?.bounds.x).toBe(10)
  })

  it('debounces view updates per window', async () => {
    const { api, controller } = await started()
    const w = await controller.openApp({ app: 'notepad' })
    vi.useFakeTimers()
    const spy = vi.spyOn(api.desktop, 'updateView')
    controller.updateView(w.id, { app: 'notepad', path: 'a.txt', dirty: false, caretLine: 1 })
    controller.updateView(w.id, { app: 'notepad', path: 'a.txt', dirty: true, caretLine: 4 })
    vi.advanceTimersByTime(VIEW_DEBOUNCE_MS - 1)
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][1]).toMatchObject({ dirty: true, caretLine: 4 })
  })

  it('minimise hands focus to the next window; the taskbar restores it', async () => {
    const { controller } = await started()
    const a = await controller.openApp({ app: 'explorer' })
    const b = await controller.openApp({ app: 'terminal' })
    await controller.minimize(b.id)
    expect(controller.windowById(b.id)?.windowState).toBe('minimized')
    expect(controller.state.focusedWindowId).toBe(a.id)
    await controller.toggleFromTaskbar(b.id)
    expect(controller.windowById(b.id)?.windowState).toBe('normal')
    expect(controller.state.focusedWindowId).toBe(b.id)
    await controller.toggleFromTaskbar(b.id)
    expect(controller.windowById(b.id)?.windowState).toBe('minimized')
  })

  it('toggles pause and user control', async () => {
    const { controller } = await started()
    await controller.togglePaused()
    await controller.toggleUserInControl()
    expect(controller.state.paused).toBe(true)
    expect(controller.state.userInControl).toBe(true)
  })

  it('focuses an existing chat window instead of opening a second one', async () => {
    const { controller } = await started()
    const chat = await controller.openApp({ app: 'chat', sessionId: 2 })
    await controller.openApp({ app: 'terminal' })
    const again = await controller.openApp({ app: 'chat', sessionId: 2 })
    expect(again.id).toBe(chat.id)
    expect(controller.state.focusedWindowId).toBe(chat.id)
    expect(controller.state.windows.filter((w) => w.view.app === 'chat' && w.view.sessionId === 2)).toHaveLength(1)
  })
})
