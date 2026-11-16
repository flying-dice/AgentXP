import { get } from 'svelte/store'
import { describe, expect, it } from 'vitest'
import { FolderBrowserService } from './folderBrowser'

const source = { browse: async () => ({ path: '', entries: [], places: [] }), makeFolder: async () => '' }

describe('FolderBrowserService', () => {
  it('resolves the chosen path and dequeues', async () => {
    const service = new FolderBrowserService()
    const promise = service.show({ purpose: 'plug-in', source })
    const [first] = get(service.queue)
    expect(first.request.purpose).toBe('plug-in')
    service.settle(first.id, 'C:\\p')
    await expect(promise).resolves.toBe('C:\\p')
    expect(get(service.queue)).toHaveLength(0)
  })

  it('resolves null on cancel and ignores a second settle', async () => {
    const service = new FolderBrowserService()
    const promise = service.show({ purpose: 'desktop', source })
    const [first] = get(service.queue)
    service.settle(first.id, null)
    service.settle(first.id, 'later')
    await expect(promise).resolves.toBeNull()
  })
})
