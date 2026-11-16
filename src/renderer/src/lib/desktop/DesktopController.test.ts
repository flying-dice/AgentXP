import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeApi } from '../app/fakeApi'
import { messageBoxes } from '../kit/organisms/messageBox'
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

  describe('drives', () => {
    it('opens AutoPlay for a newly plugged-in drive, not for the first state', async () => {
      const { api, controller } = await started()
      expect(controller.autoPlay).toBeNull()
      await api.drives.plugIn(1, 2)
      expect(controller.state.drives.map((d) => d.letter)).toEqual(['C', 'E', 'F'])
      expect(controller.autoPlay?.label).toBe('dotfiles')
      await controller.autoPlayChoose('open')
      expect(controller.autoPlay).toBeNull()
      const explorer = controller.state.windows.find((w) => w.view.app === 'explorer')
      expect(explorer?.view).toMatchObject({ path: 'F:\\' })
    })

    it('Take no action just closes AutoPlay', async () => {
      const { api, controller } = await started()
      await api.drives.plugIn(1, 2)
      const before = controller.state.windows.length
      await controller.autoPlayChoose('none')
      expect(controller.autoPlay).toBeNull()
      expect(controller.state.windows).toHaveLength(before)
    })

    it('warns before ejecting a drive that chats work on, and keeps it when the answer is No', async () => {
      const { controller } = await started()
      const pending = controller.ejectDrive('E')
      await vi.waitFor(() => expect(controller.chatsOnDrive('E').length).toBeGreaterThan(0))
      let queued: { id: number; options: { caption?: string } }[] = []
      messageBoxes.queue.subscribe((q) => (queued = q))()
      expect(queued[0].options.caption).toBe('Safely Remove Hardware')
      messageBoxes.settle(queued[0].id, 'no')
      await pending
      expect(controller.state.drives.some((d) => d.letter === 'E')).toBe(true)
      expect(controller.balloon).toBeNull()
    })

    it('ejects after Yes and shows the Safe To Remove balloon', async () => {
      const { controller } = await started()
      const pending = controller.ejectDrive('E')
      let queued: { id: number }[] = []
      messageBoxes.queue.subscribe((q) => (queued = q))()
      messageBoxes.settle(queued[0].id, 'yes')
      await pending
      expect(controller.state.drives.map((d) => d.letter)).toEqual(['C'])
      expect(controller.balloon?.title).toBe('Safe To Remove Hardware')
      expect(controller.balloon?.text).toContain("'claude-code-win (E:)'")
      controller.dismissBalloon()
      expect(controller.balloon).toBeNull()
    })

    it('never ejects the system disk', async () => {
      const { api, controller } = await started()
      const spy = vi.spyOn(api.drives, 'eject')
      await controller.ejectDrive('C')
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
