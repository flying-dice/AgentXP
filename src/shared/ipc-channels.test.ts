import { describe, expect, it } from 'vitest'
import { INVOKE_CHANNELS, isRendererEvent } from './ipc-channels'

describe('ipc channels', () => {
  it('pushes only the session list and status events to the renderer; the rest travels over AG-UI', () => {
    for (const name of ['session.changed', 'session.removed', 'folders.changed', 'status.message', 'transcript.cleared']) {
      expect(isRendererEvent(name)).toBe(true)
    }
    for (const name of ['transcript.upserted', 'tasks.changed', 'changes.changed', 'terminal.changed', 'surface.changed', 'surface.removed']) {
      expect(isRendererEvent(name)).toBe(false)
    }
  })

  it('leaves the streaming agui channels out of the generic invoke list', () => {
    expect(INVOKE_CHANNELS.some((c) => c.group === ('agui' as string))).toBe(false)
  })
})
