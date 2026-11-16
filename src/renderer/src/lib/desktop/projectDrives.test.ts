import { describe, expect, it } from 'vitest'
import { addRemoved, ejectBalloonText, pluggedBalloonText } from './projectDrives'

describe('projectDrives', () => {
  it('remembers the last three removed projects, newest first, each once', () => {
    let list = addRemoved([], { folderId: 1, label: 'a' })
    list = addRemoved(list, { folderId: 2, label: 'b' })
    list = addRemoved(list, { folderId: 1, label: 'a' })
    list = addRemoved(list, { folderId: 3, label: 'c' })
    list = addRemoved(list, { folderId: 4, label: 'd' })
    expect(list.map((p) => p.folderId)).toEqual([4, 3, 1])
  })

  it('words the balloons', () => {
    expect(pluggedBalloonText('login-app (E:)')).toBe('login-app (E:) is ready to use.')
    expect(ejectBalloonText('login-app (E:)')).toContain('login-app (E:) can now be removed. Its files on disk were not changed.')
    expect(ejectBalloonText('x')).toContain('Plug in a project...')
  })
})
