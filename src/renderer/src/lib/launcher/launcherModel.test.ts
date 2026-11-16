import { describe, expect, it } from 'vitest'
import type { DriveDto } from '@shared/vfs'
import { drivesLine, lastUsedText, sortDesktops, stateLabel, stateTone, validateDesktopName } from './launcherModel'

const usb = (letter: string, label: string): DriveDto => ({ letter, label, kind: 'removable', folderId: 1, pluggedAt: null })
const system: DriveDto = { letter: 'C', label: 'Local Disk', kind: 'system', folderId: null, pluggedAt: null }

describe('launcherModel', () => {
  it('labels run states', () => {
    expect(stateLabel({ runState: 'working', pendingApprovals: 0 })).toBe('Running')
    expect(stateLabel({ runState: 'awaiting_approval', pendingApprovals: 2 })).toBe('Needs your approval (2)')
    expect(stateLabel({ runState: 'awaiting_approval', pendingApprovals: 0 })).toBe('Needs your approval')
    expect(stateLabel({ runState: 'idle', pendingApprovals: 0 })).toBe('Idle')
    expect(stateLabel({ runState: 'error', pendingApprovals: 0 })).toBe('Error')
  })

  it('maps run states to tones', () => {
    expect(stateTone({ runState: 'working' })).toBe('running')
    expect(stateTone({ runState: 'awaiting_approval' })).toBe('approval')
    expect(stateTone({ runState: 'error' })).toBe('error')
    expect(stateTone({ runState: 'idle' })).toBe('idle')
  })

  it('sorts the most recently used first', () => {
    const list = [
      { title: 'b', lastUsedAt: '2026-11-10T00:00:00Z' },
      { title: 'a', lastUsedAt: '2026-11-12T00:00:00Z' },
      { title: 'c', lastUsedAt: '2026-11-12T00:00:00Z' }
    ]
    expect(sortDesktops(list).map((d) => d.title)).toEqual(['a', 'c', 'b'])
  })

  it('lists the plugged-in projects', () => {
    expect(drivesLine([system])).toBe('No projects plugged in')
    expect(drivesLine([system, usb('F', 'dotfiles'), usb('E', 'claude-code-win')])).toBe('E: claude-code-win, F: dotfiles')
  })

  it('says when a desktop was last used', () => {
    const now = new Date('2026-11-16T10:00:00Z')
    expect(lastUsedText('2026-11-16T09:59:40Z', now)).toBe('Just now')
    expect(lastUsedText('2026-11-16T09:59:00Z', now)).toBe('1 minute ago')
    expect(lastUsedText('2026-11-16T09:15:00Z', now)).toBe('45 minutes ago')
    expect(lastUsedText('2026-11-16T07:00:00Z', now)).toBe('3 hours ago')
    expect(lastUsedText('2026-11-14T10:00:00Z', now)).toBe('2 days ago')
    expect(lastUsedText('nonsense', now)).toBe('')
  })

  it('validates names', () => {
    expect(validateDesktopName('  ', [])).toMatch(/Type a name/)
    expect(validateDesktopName('x'.repeat(61), [])).toMatch(/60/)
    expect(validateDesktopName('Work', ['work'])).toMatch(/already exists/)
    expect(validateDesktopName('Work', ['Play'])).toBeNull()
  })
})
