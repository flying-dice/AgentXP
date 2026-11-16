import type { WebContents } from 'electron'
import { describe, expect, it } from 'vitest'
import type { SessionDto } from '@shared/models'
import { ElectronEventPublisher } from './ElectronEventPublisher'

const contents = (name: string, sent: string[]): WebContents =>
  ({ isDestroyed: () => false, send: (event: string) => void sent.push(`${name}:${event}`) }) as unknown as WebContents

describe('ElectronEventPublisher', () => {
  const sent: string[] = []
  const windows = { 1: contents('w1', sent), 2: contents('w2', sent) } as Record<number, WebContents>
  const publisher = new ElectronEventPublisher({ webContentsOf: (id) => windows[id] ?? null, all: () => Object.values(windows) })

  it('sends desktop events only to the window of the owning desktop', () => {
    sent.length = 0
    publisher.publish('desktop.changed', { desktopId: 2 } as never)
    publisher.publish('desktop.changed', { desktopId: 9 } as never) // closed desktop: nobody
    expect(sent).toEqual(['w2:desktop.changed'])
  })

  it('routes chat changes by the desktop of the chat, and broadcasts those without one', () => {
    sent.length = 0
    publisher.publish('session.changed', { id: 1, desktopId: 1 } as SessionDto)
    publisher.publish('session.changed', { id: 2, desktopId: null } as SessionDto)
    expect(sent).toEqual(['w1:session.changed', 'w1:session.changed', 'w2:session.changed'])
  })

  it('broadcasts folders and status, and keeps internal events in main', () => {
    sent.length = 0
    publisher.publish('status.message', { text: 'hi' })
    publisher.publish('tasks.changed', { sessionId: 1, tasks: [] })
    expect(sent).toEqual(['w1:status.message', 'w2:status.message'])
  })
})
