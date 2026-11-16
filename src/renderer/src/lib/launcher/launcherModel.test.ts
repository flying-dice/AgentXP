import { describe, expect, it } from 'vitest'
import type { DriveDto } from '@shared/vfs'
import { accessKeyCommand, connectLabel, DELETE_WARNING, drivesLine, initialSelection, lastUsedText, nameSuggestion, rowStatus, sortDesktops, stateLabel, stateTone, suggestDesktopName, validateDesktopName } from './launcherModel'

const usb = (letter: string, label: string): DriveDto => ({ letter, label, kind: 'removable', folderId: 1, pluggedAt: null })
const system: DriveDto = { letter: 'C', label: 'Local Disk', kind: 'system', folderId: null, pluggedAt: null }

describe('launcherModel', () => {
  it('labels run states', () => {
    expect(stateLabel({ runState: 'working', pendingApprovals: 0 })).toBe('Working')
    expect(stateLabel({ runState: 'awaiting_approval', pendingApprovals: 2 })).toBe('Needs your approval (2)')
    expect(stateLabel({ runState: 'awaiting_approval', pendingApprovals: 0 })).toBe('Needs your approval')
    expect(stateLabel({ runState: 'idle', pendingApprovals: 0 })).toBe('Idle')
    expect(stateLabel({ runState: 'error', pendingApprovals: 0 })).toBe('The agent could not start')
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
    expect(validateDesktopName('Work', ['work'])).toMatch(/already exists. Each desktop needs its own name/)
    expect(validateDesktopName('Work', ['Play'])).toBeNull()
  })

  it('suggests the next free numbered name', () => {
    expect(suggestDesktopName('Fix login redirect', ['Fix login redirect'])).toBe('Fix login redirect (2)')
    expect(suggestDesktopName('Fix login redirect', ['Fix login redirect', 'fix login redirect (2)'])).toBe('Fix login redirect (3)')
    expect(suggestDesktopName('Work (2)', ['Work (2)'])).toBe('Work (3)')
    expect(nameSuggestion('Work', ['work'])).toBe('Work (2)')
    expect(nameSuggestion('Work', ['Play'])).toBeNull()
    expect(nameSuggestion('', [''])).toBeNull()
  })

  it('gives waiting and failed rows an icon, weight and the failed one a hint', () => {
    expect(rowStatus({ runState: 'awaiting_approval', pendingApprovals: 1 })).toMatchObject({ icon: 'shield', strong: true, label: 'Needs your approval (1)' })
    expect(rowStatus({ runState: 'error', pendingApprovals: 0 })).toMatchObject({ icon: 'error', strong: true, hint: expect.stringContaining('Agents') })
    expect(rowStatus({ runState: 'idle', pendingApprovals: 0 })).toMatchObject({ icon: null, strong: false, hint: '' })
  })

  it('preselects a desktop that waits for approval, else the most recent', () => {
    const d = (id: number, runState: 'idle' | 'awaiting_approval', lastUsedAt: string) => ({ id, title: String(id), runState, lastUsedAt })
    expect(initialSelection([d(1, 'idle', '2026-11-12T00:00:00Z'), d(2, 'awaiting_approval', '2026-11-01T00:00:00Z')])).toBe(2)
    expect(initialSelection([d(1, 'idle', '2026-11-01T00:00:00Z'), d(2, 'idle', '2026-11-12T00:00:00Z')])).toBe(2)
    expect(initialSelection([])).toBeNull()
  })

  it('tells deleted desktops keep the projects on disk', () => {
    expect(DELETE_WARNING).toContain('removed from this desktop; the folders and files stay on your disk')
    expect(DELETE_WARNING).not.toContain('ejected')
  })

  it('maps the access keys to the buttons', () => {
    expect(['n', 'C', 'r', 'D', 'x'].map(accessKeyCommand)).toEqual(['new', 'connect', 'rename', 'delete', null])
    expect(connectLabel(false)).toBe('&Connect')
    expect(connectLabel(true)).toBe('Show desktop')
  })
})
