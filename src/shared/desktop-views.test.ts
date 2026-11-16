import { describe, expect, it } from 'vitest'
import { supportsAside, type AppView, type Bounds } from './desktop'
import { asideCwd, cascadedBounds, numberDuplicateTitles, DEFAULT_BOUNDS, DESKTOP_AREA, helpWindowTitle, minWindowSize, placeChatBesideBrowser, placeNewWindow, placeWindow, windowMinY, viewPath, windowTitle, WINDOW_MIN_Y } from './desktop-views'

const area = DESKTOP_AREA
const overlap = (a: Bounds, b: Bounds): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
const inside = (b: Bounds): boolean => b.x >= 0 && b.y >= 0 && b.x + b.width <= area.width && b.y + b.height <= area.height
const chat: Bounds = DEFAULT_BOUNDS.chat

describe('cascadedBounds', () => {
  it('offsets by 32px per open window and wraps after six', () => {
    expect(cascadedBounds('notepad', 0)).toEqual(DEFAULT_BOUNDS.notepad)
    expect(cascadedBounds('notepad', 2)).toMatchObject({ x: DEFAULT_BOUNDS.notepad.x + 64, y: DEFAULT_BOUNDS.notepad.y + 64 })
    expect(cascadedBounds('notepad', 6)).toEqual(DEFAULT_BOUNDS.notepad)
  })
})

describe('placeWindow', () => {
  it('cascades when there is nothing to avoid or nothing overlaps', () => {
    expect(placeWindow('notepad', 1, null)).toEqual(cascadedBounds('notepad', 1))
    expect(placeWindow('notepad', 0, { x: 900, y: 500, width: 300, height: 200 })).toEqual(cascadedBounds('notepad', 0))
  })

  it('tiles to the right of the focused chat at full size when there is room', () => {
    const b = placeWindow('notepad', 1, chat)
    expect(b).toEqual({ x: chat.x + chat.width + 8, y: Math.max(chat.y, WINDOW_MIN_Y), width: DEFAULT_BOUNDS.notepad.width, height: DEFAULT_BOUNDS.notepad.height })
    expect(overlap(b, chat)).toBe(false)
  })

  it('squeezes a wide window into the room to the right', () => {
    for (const app of ['terminal', 'explorer', 'code', 'browser', 'paint'] as const) {
      const b = placeWindow(app, 1, chat)
      expect(overlap(b, chat), app).toBe(false)
      expect(inside(b), app).toBe(true)
      expect(b.width).toBeGreaterThanOrEqual(360)
    }
  })

  it('goes below when the chat is at the right edge and the window fits below', () => {
    const right: Bounds = { x: 640, y: 20, width: 620, height: 300 }
    const b = placeWindow('notepad', 0, right)
    expect(overlap(b, right)).toBe(false)
    expect(inside(b)).toBe(true)
    expect(b.y).toBe(right.y + right.height + 8)
  })

  it('goes to the left when only the left has room', () => {
    const right: Bounds = { x: 600, y: 20, width: 660, height: 700 }
    const b = placeWindow('notepad', 0, right)
    expect(overlap(b, right)).toBe(false)
    expect(inside(b)).toBe(true)
    expect(b.x + b.width).toBeLessThanOrEqual(right.x)
  })

  it('falls back to the cascade (inside the desktop) when the chat covers everything', () => {
    const full: Bounds = { x: 0, y: 0, width: area.width, height: area.height }
    const b = placeWindow('notepad', 0, full)
    expect(b).toEqual(cascadedBounds('notepad', 0))
    expect(inside(b)).toBe(true)
  })

  it('keeps windows that are larger than the desktop inside it', () => {
    const b = placeWindow('code', 0, null, { width: 700, height: 400 })
    expect(b).toEqual({ x: 0, y: WINDOW_MIN_Y, width: 700, height: 400 - WINDOW_MIN_Y })
  })
})

describe('numberDuplicateTitles', () => {
  it('numbers the second and later window of a title in opening order, whatever the stacking order', () => {
    const list = [
      { id: 3, title: 'Computer' },
      { id: 1, title: 'Computer' },
      { id: 2, title: 'Notepad' },
      { id: 4, title: 'Computer' }
    ]
    expect(numberDuplicateTitles(list).map((w) => w.title)).toEqual(['Computer (2)', 'Computer', 'Notepad', 'Computer (3)'])
  })

  it('leaves distinct titles alone', () => {
    const list = [{ id: 1, title: 'a' }, { id: 2, title: 'b' }]
    expect(numberDuplicateTitles(list)).toEqual(list)
  })
})

describe('helpWindowTitle', () => {
  it('titles a help window after the app of its topic', () => {
    expect(helpWindowTitle('notepad')).toBe('Agent7 Help and Support: Using Notepad')
    expect(helpWindowTitle('agent-manager')).toBe('Agent7 Help and Support: Using Task Manager')
    expect(helpWindowTitle('explorer')).toBe('Agent7 Help and Support: Using Explorer')
    expect(helpWindowTitle('browser#troubleshooting')).toBe('Agent7 Help and Support: Using Browser')
    expect(helpWindowTitle('nonsense#top')).toBe('Agent7 Help and Support')
  })

  it('keeps Help and Support for the home, desktop, launcher and Help topics', () => {
    for (const topic of ['index', 'desktop', 'launcher', 'help', 'nonsense']) expect(helpWindowTitle(topic)).toBe('Agent7 Help and Support')
  })

  it('is what windowTitle gives a help view', () => {
    expect(windowTitle({ app: 'event-viewer', sessionId: null, level: 'all', selectedEventId: null })).toBe('Event Viewer') // the same words as the root of its tree
    expect(windowTitle({ app: 'help', topic: 'terminal' })).toBe('Agent7 Help and Support: Using Terminal')
  })
})

describe('the chat pane of a window', () => {
  const code = (activePath: string | null): AppView => ({ app: 'code', tabs: [], activePath, visibleLines: null, selection: null, selectedChangeId: null })

  it('has none in Chat, Code Review or a surface', () => {
    expect(['chat', 'code-review', 'surface'].map((a) => supportsAside(a as never))).toEqual([false, false, false])
    expect(['code', 'notepad', 'browser', 'explorer', 'terminal', 'paint', 'help'].every((a) => supportsAside(a as never))).toBe(true)
  })

  it('finds the path a view shows', () => {
    expect(viewPath(code('E:\\a.ts'))).toBe('E:\\a.ts')
    expect(viewPath({ app: 'terminal', terminalId: null, cwd: 'F:\\x', runningCommand: null, lastLines: [] })).toBe('F:\\x')
    expect(viewPath({ app: 'explorer', path: '', selected: [] })).toBeNull()
    expect(viewPath({ app: 'browser', url: 'about:blank', title: '', loading: false })).toBeNull()
  })

  it('works on the drive root of a plugged-in drive, else at home', () => {
    expect(asideCwd(code('E:\\src\\a.ts'))).toBe('E:\\')
    expect(asideCwd(code('C:\\Users\\Agent\\a.ts'))).toBe('C:\\Users\\Agent')
    expect(asideCwd(code(null))).toBe('C:\\Users\\Agent')
    expect(asideCwd({ app: 'browser', url: 'about:blank', title: '', loading: false }, 'C:\\Home')).toBe('C:\\Home')
  })
})

describe('window sizes and placement below the top bar', () => {
  it('opens the wide apps big enough for their content', () => {
    const size = (app: keyof typeof DEFAULT_BOUNDS): [number, number] => [DEFAULT_BOUNDS[app].width, DEFAULT_BOUNDS[app].height]
    expect(size('control-centre')).toEqual([760, 540])
    expect(size('event-viewer')).toEqual([980, 560])
    expect(size('agent-manager')).toEqual([640, 440])
    expect(size('recycle-bin')).toEqual([680, 420])
    expect(size('help')).toEqual([800, 560])
    expect(size('chat')).toEqual([680, 560])
  })

  it('keeps every default window inside the desktop and below the bar, whatever the cascade step', () => {
    for (const app of Object.keys(DEFAULT_BOUNDS) as (keyof typeof DEFAULT_BOUNDS)[]) {
      for (let open = 0; open < 8; open++) {
        const b = placeWindow(app, open, null)
        expect(b.y).toBeGreaterThanOrEqual(WINDOW_MIN_Y)
        expect(b.x + b.width).toBeLessThanOrEqual(DESKTOP_AREA.width)
        expect(b.y + b.height).toBeLessThanOrEqual(DESKTOP_AREA.height)
      }
    }
  })

  it('has minimum sizes: 480 x 320, Control Center 640 x 420', () => {
    expect(minWindowSize('notepad')).toEqual({ width: 480, height: 320 })
    expect(minWindowSize('control-centre')).toEqual({ width: 640, height: 420 })
  })
})

describe('placeNewWindow (UX-88)', () => {
  const titleStrip = (b: Bounds): Bounds => ({ x: b.x, y: b.y, width: b.width, height: 28 })
  const notepadParent = { app: 'notepad' as const, bounds: { x: 300, y: 200, width: 520, height: 380 } }

  for (const bar of [52, 68]) {
    it(`starts below a top bar of ${bar} px`, () => {
      const minY = windowMinY(bar)
      for (const app of Object.keys(DEFAULT_BOUNDS) as (keyof typeof DEFAULT_BOUNDS)[]) {
        for (let open = 0; open < 8; open++) {
          expect(placeNewWindow(app, open, null, area, undefined, minY).y, `${app} ${open}`).toBeGreaterThanOrEqual(minY)
          expect(placeNewWindow(app, open, notepadParent, area, undefined, minY).y, `${app} ${open} with parent`).toBeGreaterThanOrEqual(minY)
        }
      }
    })
  }

  it('the default bar height is the larger one, so a first paint is safe', () => {
    expect(WINDOW_MIN_Y).toBe(windowMinY(68))
    expect(windowMinY(52)).toBe(56)
  })

  it('cascades from the focused window, 28 px right and down, and leaves its title bar visible', () => {
    const b = placeNewWindow('terminal', 1, notepadParent)
    expect(b.x).toBe(notepadParent.bounds.x + 28)
    expect(b.y).toBe(notepadParent.bounds.y + 28)
    expect(overlap(b, titleStrip(notepadParent.bounds))).toBe(false)
  })

  it('tiles beside a focused chat as before', () => {
    const b = placeNewWindow('notepad', 1, { app: 'chat', bounds: chat })
    expect(overlap(b, chat)).toBe(false)
  })

  it('Help opens on the side with more free width and does not cover the window that asked for it', () => {
    const left = { app: 'notepad' as const, bounds: { x: 20, y: 100, width: 420, height: 380 } }
    const right = { app: 'notepad' as const, bounds: { x: 700, y: 100, width: 420, height: 380 } }
    const a = placeNewWindow('help', 1, left)
    expect(overlap(a, left.bounds)).toBe(false)
    expect(a.x).toBeGreaterThanOrEqual(left.bounds.x + left.bounds.width)
    const c = placeNewWindow('event-viewer', 1, right)
    expect(overlap(c, right.bounds)).toBe(false)
    expect(c.x + c.width).toBeLessThanOrEqual(right.bounds.x)
    expect(inside(a) && inside(c)).toBe(true)
  })

  it('Help falls back to the cascade when neither side has room, still below the parent title bar', () => {
    const wide = { app: 'notepad' as const, bounds: { x: 100, y: 100, width: 1000, height: 500 } }
    const b = placeNewWindow('help', 1, wide)
    expect(overlap(b, titleStrip(wide.bounds))).toBe(false)
  })
})

describe('Code Review window title (UX-109)', () => {
  const view = { app: 'code-review', root: 'E:\\', baseRef: 'HEAD', selectedPath: null, sessionId: 1 } as const
  it('is Review - and the project name', () => {
    expect(windowTitle(view, 'review-notes')).toBe('Review - review-notes')
  })
  it('names the drive or the folder without a project name', () => {
    expect(windowTitle(view)).toBe('Review - E:\\')
    expect(windowTitle({ ...view, root: 'E:\\src\\app' })).toBe('Review - app')
  })
})

describe('placeChatBesideBrowser (UX-120)', () => {
  it('puts the chat in the free half and narrows a wide Browser to its own half', () => {
    const { chat: c, browser } = placeChatBesideBrowser(DEFAULT_BOUNDS.browser)
    expect(browser).not.toBeNull()
    expect(overlap(c, browser!)).toBe(false)
    expect(inside(c) && inside(browser!)).toBe(true)
    expect(c.y).toBeGreaterThanOrEqual(WINDOW_MIN_Y)
  })

  it('leaves a Browser that already leaves room as it is, and mirrors for a Browser on the right', () => {
    const small = { x: 20, y: 80, width: 500, height: 400 }
    const left = placeChatBesideBrowser(small)
    expect(left.browser).toBeNull()
    expect(overlap(left.chat, small)).toBe(false)
    const right = placeChatBesideBrowser({ x: 700, y: 80, width: 560, height: 400 })
    expect(right.chat.x).toBe(0)
    expect(overlap(right.chat, { x: 700, y: 80, width: 560, height: 400 })).toBe(false)
  })
})
