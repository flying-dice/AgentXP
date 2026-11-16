import { beforeEach, describe, expect, it } from 'vitest'
import { createVfsFixture, tempDir } from '../test-helpers'

let f: Awaited<ReturnType<typeof createVfsFixture>>
let id: number

beforeEach(async () => {
  f = await createVfsFixture({ plugProject: false })
  id = f.desktop.id
})

describe('DriveService', () => {
  it('always lists C: first', () => {
    expect(f.drives.list(id)).toMatchObject([{ letter: 'C', kind: 'system', folderId: null, label: 'Local Disk' }])
  })

  it('plugs projects in as E:, F:, ... and returns the same drive for the same project', () => {
    const second = f.repos.folders.add(tempDir('agent7-second-'), 'second')
    expect(f.drives.plugInFolder(id, f.folder.id)).toMatchObject({ letter: 'E', label: 'project', folderId: f.folder.id })
    expect(f.drives.plugInFolder(id, second.id)).toMatchObject({ letter: 'F' })
    expect(f.drives.plugInFolder(id, f.folder.id).letter).toBe('E')
    expect(f.drives.list(id).map((d) => d.letter)).toEqual(['C', 'E', 'F'])
  })

  it('reuses a freed letter after eject', () => {
    const second = f.repos.folders.add(tempDir('agent7-second-'), 'second')
    f.drives.plugInFolder(id, f.folder.id)
    f.drives.eject(id, 'E')
    expect(f.drives.plugInFolder(id, second.id).letter).toBe('E')
  })

  it('notifies observers on plug-in and eject, but not on a repeated plug-in', () => {
    const seen: number[] = []
    f.drives.observe((d) => seen.push(d))
    f.drives.plugInFolder(id, f.folder.id)
    f.drives.plugInFolder(id, f.folder.id)
    f.drives.eject(id, 'e')
    expect(seen).toEqual([id, id])
  })

  it('refuses to eject C: or a drive that is not plugged in', () => {
    expect(() => f.drives.eject(id, 'C')).toThrow(/system disk/)
    expect(() => f.drives.eject(id, 'G')).toThrow(/not plugged in/)
  })

  it('plugIn with the picker: null when cancelled, a drive otherwise; unknown ids are errors', async () => {
    expect(await f.drives.plugIn(id)).toBeNull()
    expect(await f.drives.plugIn(id, f.folder.id)).toMatchObject({ letter: 'E' })
    await expect(f.drives.plugIn(9999, f.folder.id)).rejects.toThrow()
    await expect(f.drives.plugIn(id, 9999)).rejects.toThrow()
  })
})
