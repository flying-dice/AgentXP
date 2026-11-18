import { beforeEach, describe, expect, it } from 'vitest'
import type { AppView, AppWindowState, DesktopState } from '@shared/desktop'
import type { ReviewCommentDto } from '@shared/review'
import { AppError } from '../errors'
import { ShowTargets } from './ShowTargets'

const ctx = { desktopId: 1, sessionId: 5 }

let windows: AppWindowState[]
let presented: { input: Record<string, unknown>; focus: boolean }[]
let views: { windowId: number; view: AppView }[]
let requests: { method: string; params: unknown }[]
let shapes: Set<string>
let targets: ShowTargets

const win = (id: number, view: AppView): AppWindowState => ({ id, app: view.app, view, windowState: 'normal' }) as AppWindowState

beforeEach(() => {
  windows = [
    win(2, { app: 'code-review', root: 'E:\\', baseRef: 'HEAD', selectedPath: null, sessionId: 9 }),
    win(3, { app: 'diagrams', path: null, title: 'Untitled', dirty: false, page: 0, pages: ['Page 1'], shapeCount: 1 } as AppView)
  ]
  presented = []
  views = []
  requests = []
  shapes = new Set(['s1'])
  const comment = { id: 44, sessionId: 9, path: 'src/auth.ts', lineStart: 12, lineEnd: 12 } as ReviewCommentDto
  targets = new ShowTargets({
    desktops: {
      state: () => ({ desktopId: 1, focusedWindowId: null, windows }) as unknown as DesktopState,
      presentWindow: async (_sessionId, input, focus) => {
        presented.push({ input: { ...input }, focus })
        return windows.find((w) => w.id === input.windowId) ?? win(8, { app: input.app } as AppView)
      },
      updateView: (windowId, view) => void views.push({ windowId, view })
    },
    paths: { resolve: (_c, input) => `E:\\${input}` },
    files: { stat: async () => ({ kind: 'file' }) },
    changes: { list: () => [] },
    comments: { getComment: (id) => (id === 44 ? comment : null) },
    boards: {
      find: () => {
        throw new AppError('no boards')
      }
    },
    requests: {
      request: async (_d, _w, method, params) => {
        requests.push({ method, params })
        const id = (params as { id: string }).id
        if (!shapes.has(id)) throw new AppError(`There is no shape or connector ${id} in the diagram.`)
        return { label: `the shape 'Start' (${id})` }
      }
    },
    browser: { elementOf: async () => undefined, locate: async () => ({ x: 0, y: 0, width: 1, height: 1 }) }
  })
})

describe('ShowTargets', () => {
  it('a review comment: its Code Review window comes forward with the comment selected', async () => {
    const checked = await targets.check(ctx, { kind: 'review-comment', id: 44 })
    expect(checked.label).toBe('the comment on auth.ts:12')
    expect(await targets.land(ctx, checked, false)).toEqual({ kind: 'comment', windowId: 2, commentId: 44 })
    expect(presented).toEqual([{ input: { desktopId: 1, app: 'code-review', sessionId: 9, windowId: 2 }, focus: false }])
    expect(views).toEqual([{ windowId: 2, view: expect.objectContaining({ app: 'code-review', selectedCommentId: 44 }) }])
  })

  it('a comment that is gone, or whose Code Review window was closed, is an error', async () => {
    await expect(targets.check(ctx, { kind: 'review-comment', id: 1 })).rejects.toThrow(/no review comment 1/)
    windows = windows.filter((w) => w.app !== 'code-review')
    await expect(targets.check(ctx, { kind: 'review-comment', id: 44 })).rejects.toThrow(/Code Review window of comment 44 is closed/)
  })

  it('a diagram shape: Agent Diagrams checks it, selects it and comes forward', async () => {
    const checked = await targets.check(ctx, { kind: 'diagram-shape', id: 's1' })
    expect(checked.label).toBe("the shape 'Start' (s1)")
    expect(await targets.land(ctx, checked, true)).toEqual({ kind: 'shape', windowId: 3, shapeId: 's1' })
    expect(requests).toEqual([
      { method: 'show', params: { id: 's1', check: true } },
      { method: 'show', params: { id: 's1' } }
    ])
    expect(presented.at(-1)).toMatchObject({ input: { app: 'diagrams', windowId: 3 }, focus: true })
    await expect(targets.check(ctx, { kind: 'diagram-shape', id: 'nope' })).rejects.toThrow(/no shape or connector nope/)
  })

  it('a window: the open one comes forward, else a new one opens', async () => {
    expect(await targets.land(ctx, await targets.check(ctx, { kind: 'window', app: 'diagrams' }), false)).toEqual({ kind: 'window', windowId: 3 })
    const checked = await targets.check(ctx, { kind: 'window', app: 'terminal' })
    expect(checked.label).toBe('the Terminal window')
    expect(await targets.land(ctx, checked, false)).toEqual({ kind: 'window', windowId: 8 })
    expect(presented.at(-1)?.input).toEqual({ desktopId: 1, app: 'terminal' })
  })

  it('a file: a folder is refused, the line range is put in order', async () => {
    const checked = await targets.check(ctx, { kind: 'file', path: 'a.ts', lines: [9, 3] })
    expect(checked).toEqual({ target: { kind: 'file', path: 'E:\\a.ts', lines: [3, 9] }, label: 'a.ts:3-9' })
  })
})
