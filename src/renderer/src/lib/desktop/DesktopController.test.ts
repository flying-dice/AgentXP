import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeApi } from '../app/fakeApi'
import { folderBrowsers } from '../kit/organisms/folderBrowser'
import { messageBoxes } from '../kit/organisms/messageBox'
import { emptyAguiState } from '@shared/agui-state'
import { CONTINUE_TEXT, NOTHING_STOPPED_NOTICE } from '../app/session/resumeNote'
import { DesktopController, NOTICE_MS, VIEW_DEBOUNCE_MS } from './DesktopController.svelte'

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

  it('Disconnect closes the OS window; Delete asks first and removes the desktop only on yes', async () => {
    const { api, controller } = await started()
    const close = vi.spyOn(api.window, 'close')
    await controller.disconnect()
    expect(close).toHaveBeenCalledTimes(1)

    const remove = vi.spyOn(api.launcher, 'remove')
    const ask = async (result: 'yes' | 'no'): Promise<boolean> => {
      const pending = controller.deleteDesktop()
      let queued: { id: number; options: { caption?: string } }[] = []
      await vi.waitFor(() => {
        messageBoxes.queue.subscribe((q) => (queued = q))()
        expect(queued.length).toBeGreaterThan(0)
      })
      messageBoxes.settle(queued[0].id, result)
      return pending
    }
    expect(await ask('no')).toBe(false)
    expect(remove).not.toHaveBeenCalled()
    expect(await ask('yes')).toBe(true)
    expect(remove).toHaveBeenCalledWith(controller.state.desktopId)
  })

  it('toggles pause and user control', async () => {
    const { controller } = await started()
    await controller.togglePaused()
    await controller.toggleUserInControl()
    expect(controller.state.paused).toBe(true)
    expect(controller.state.userInControl).toBe(true)
  })

  it('Resume sends each chat Pause stopped the continue message, and the Action Center says so', async () => {
    const { api, controller } = await started()
    const send = vi.fn(async () => true)
    controller.inbox.register(1, { state: emptyAguiState(), pendingInterrupt: null, running: false, resolveInterrupt: async () => {}, send })
    await controller.togglePaused()
    expect(controller.state.paused).toBe(true)
    vi.spyOn(api.desktop, 'resumeAgents').mockResolvedValue([1])
    await controller.togglePaused()
    expect(controller.state.paused).toBe(false)
    expect(send).toHaveBeenCalledWith(CONTINUE_TEXT)
    expect(controller.messages).toHaveLength(1)
    expect(controller.messages[0].text).toContain('Resumed. Continuing where you stopped.')
    expect(controller.notice).toBeNull()
  })

  it('the paused note and the Action Center line come from the saved list in the desktop state', async () => {
    const { controller } = await started()
    controller.current = { ...controller.state, paused: true, stoppedByPause: [1] }
    expect(controller.stoppedByPause(1)).toBe(true)
    expect(controller.stoppedByPause(2)).toBe(false)
    expect(controller.centreMessages.map((m) => m.id)).toEqual([-1])
    expect(controller.centreMessages[0].text).toContain('Paused. The step that was running was stopped')
    controller.current = { ...controller.state, paused: false, stoppedByPause: [1] }
    expect(controller.stoppedByPause(1)).toBe(false)
    expect(controller.centreMessages).toEqual([])
  })

  it('Resume with nothing stopped says so on the bar for a moment, adds no message and no balloon', async () => {
    vi.useFakeTimers()
    const { controller } = await started()
    await controller.togglePaused()
    await controller.togglePaused()
    expect(controller.notice).toBe(NOTHING_STOPPED_NOTICE)
    expect(controller.messages).toHaveLength(0)
    expect(controller.balloon).toBeNull()
    vi.advanceTimersByTime(NOTICE_MS)
    expect(controller.notice).toBeNull()
  })

  it('opens Control Center at a page', async () => {
    const { api, controller } = await started()
    const spy = vi.spyOn(api.desktop, 'updateView')
    await controller.openControlCentre('permissions')
    expect(spy).toHaveBeenCalledWith(expect.any(Number), { app: 'control-centre', page: 'permissions' })
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
      expect(controller.balloon?.text).toContain('claude-code-win (E:) can now be removed. Its files on disk were not changed.')
      expect(controller.balloon?.text).toContain('Plug in a project...')
      expect(controller.recentlyRemoved.map((r) => r.label)).toEqual(['claude-code-win'])
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

describe('DesktopController projects and shell feedback', () => {
  const answerBrowser = async (path: string | null): Promise<void> => {
    await vi.waitFor(() => expect(get(folderBrowsers.queue)).toHaveLength(1))
    folderBrowsers.settle(get(folderBrowsers.queue)[0].id, path)
  }
  const answerBox = async (result: 'ok' | 'yes' | 'no'): Promise<string> => {
    await vi.waitFor(() => expect(get(messageBoxes.queue)).toHaveLength(1))
    const [box] = get(messageBoxes.queue)
    messageBoxes.settle(box.id, result)
    return box.options.text
  }

  it('Plug in a project: the Browse For Folder dialog, then the drive and a balloon', async () => {
    const { controller } = await started()
    const pending = controller.plugInProject()
    await answerBrowser('C:\\Users\\jonathan\\source\\login-app')
    const drive = await pending
    expect(drive?.label).toBe('login-app')
    expect(controller.state.drives.some((d) => d.label === 'login-app')).toBe(true)
    expect(controller.balloon?.title).toBe('Project plugged in')
    expect(controller.balloon?.text).toBe(`login-app (${drive?.letter}:) is ready to use.`)
  })

  it('Cancel plugs nothing in', async () => {
    const { controller } = await started()
    const before = controller.state.drives.length
    const pending = controller.plugInProject()
    await answerBrowser(null)
    expect(await pending).toBeNull()
    expect(controller.state.drives).toHaveLength(before)
    expect(controller.balloon).toBeNull()
  })

  it('says so when the project is plugged in already, and shows its drive', async () => {
    const { controller } = await started()
    const plugged = controller.state.drives.find((d) => d.kind === 'removable')!
    const pending = controller.plugInAgain(plugged.folderId!)
    const text = await answerBox('ok')
    expect(text).toBe(`${plugged.label} is already plugged in as drive ${plugged.letter}:.`)
    expect((await pending)?.letter).toBe(plugged.letter)
  })

  it('names the project and the reason when plugging in fails', async () => {
    const { api, controller } = await started()
    vi.spyOn(api.drives, 'plugIn').mockRejectedValue(new Error('All drive letters are in use.'))
    const pending = controller.plugInProject()
    await answerBrowser('C:\\Users\\jonathan\\source\\login-app')
    const text = await answerBox('ok')
    expect(text).toBe("Could not plug in 'login-app'. All drive letters are in use.")
    expect(await pending).toBeNull()
  })

  it('plugs a recently removed project in again without a dialog', async () => {
    const { controller } = await started()
    const letter = controller.state.drives.find((d) => d.kind === 'removable')!.letter
    const ejecting = controller.ejectDrive(letter)
    await answerBox('yes')
    await ejecting
    expect(controller.recentlyRemoved).toHaveLength(1)
    const drive = await controller.plugInAgain(controller.recentlyRemoved[0].folderId)
    expect(drive?.kind).toBe('removable')
    expect(controller.recentlyRemoved).toHaveLength(0)
    expect(get(folderBrowsers.queue)).toHaveLength(0)
  })

  it('Eject a project... opens the tray list, or says that nothing is plugged in', async () => {
    const { controller } = await started()
    controller.openEjectList()
    expect(controller.usbMenuOpen).toBe(true)
    const letter = controller.state.drives.find((d) => d.kind === 'removable')!.letter
    controller.usbMenuOpen = false
    const ejecting = controller.ejectDrive(letter)
    await answerBox('yes')
    await ejecting
    controller.dismissBalloon()
    controller.openEjectList()
    expect(controller.usbMenuOpen).toBe(false)
    expect(controller.balloon?.text).toBe('No project is plugged in.')
  })

  it('shows the busy state while an app opens and a message when it cannot', async () => {
    const { controller } = await started()
    let release: () => void = () => {}
    const slow = controller.openWithFeedback('Chats', 'session', () => new Promise<void>((resolve) => (release = resolve)))
    expect(controller.opening.map((o) => o.title)).toEqual(['Chats'])
    release()
    expect(await slow).toBe(true)
    expect(controller.opening).toEqual([])

    const failed = controller.openWithFeedback('Chats', 'session', () => Promise.reject(new Error('The agent could not be started.')))
    const text = await answerBox('ok')
    expect(text).toBe('Could not open Chats. The agent could not be started.')
    expect(await failed).toBe(false)
    expect(controller.opening).toEqual([])
  })

  it('shows the icon hint once', async () => {
    const { controller } = await started()
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    controller.showIconHint(storage)
    expect(controller.balloon?.text).toBe('Double-click an icon to open it.')
    controller.dismissBalloon()
    controller.showIconHint(storage)
    expect(controller.balloon).toBeNull()
  })

  it('Alt+Tab cycles through the windows', async () => {
    const { controller } = await started()
    const a = await controller.openApp({ app: 'notepad' })
    const b = await controller.openApp({ app: 'terminal' })
    expect(controller.state.focusedWindowId).toBe(b.id)
    await controller.cycleWindows(1)
    expect(controller.state.focusedWindowId).toBe(a.id)
    // Alt+Shift+Tab: the window that was used longest ago (the chat the desktop started with).
    await controller.cycleWindows(-1)
    expect(controller.state.focusedWindowId).not.toBe(a.id)
    expect(controller.state.focusedWindowId).not.toBe(b.id)
  })
})
