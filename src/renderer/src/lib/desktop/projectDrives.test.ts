import { describe, expect, it } from 'vitest'
import { addRemoved, EJECT_BALLOON_TITLE, ejectBalloonText, plugAgainLabel, pluggedBalloonText, projectQuoted, removeProjectText } from './projectDrives'

describe('projectDrives', () => {
  it('remembers the last three removed projects, newest first, each once', () => {
    let list = addRemoved([], { folderId: 1, label: 'a' })
    list = addRemoved(list, { folderId: 2, label: 'b' })
    list = addRemoved(list, { folderId: 1, label: 'a' })
    list = addRemoved(list, { folderId: 3, label: 'c' })
    list = addRemoved(list, { folderId: 4, label: 'd' })
    expect(list.map((p) => p.folderId)).toEqual([4, 3, 1])
  })

  it('words the tray entry that plugs a removed project in again', () => {
    expect(plugAgainLabel({ folderId: 1, label: 'login-app', letter: 'E' })).toBe('Plug in login-app (E:) again')
    expect(plugAgainLabel({ folderId: 1, label: 'login-app' })).toBe('Plug in login-app again')
  })

  it('words the balloons', () => {
    expect(pluggedBalloonText('login-app (E:)')).toBe('Project plugged in: login-app (E:) is ready to use.')
    expect(EJECT_BALLOON_TITLE).toBe('Project removed')
    expect(ejectBalloonText('login-app', 'E')).toBe("'login-app' (E:) was removed from this desktop. Your files are still in the folder. Use Plug in again to add it back.")
    expect(ejectBalloonText('x')).toContain("'x' was removed")
    expect(projectQuoted('login-app', 'E')).toBe("'login-app' (E:)")
    expect(removeProjectText('login-app')).toBe("Remove 'login-app' from this desktop? The agent can no longer use it. The folder and its files stay where they are.")
  })
})
