import { describe, expect, it, vi } from 'vitest'
import { openRecycleBin, restoreReverted } from './openRecycleBin'

describe('openRecycleBin', () => {
  const make = () => {
    const updateView = vi.fn().mockResolvedValue(undefined)
    const openApp = vi.fn().mockResolvedValue({ id: 7 })
    return { host: { openApp, api: { desktop: { updateView } } } as never, openApp, updateView }
  }

  it('selects the entry of the reverted row', async () => {
    const { host, openApp, updateView } = make()
    await openRecycleBin(host, 12)
    expect(openApp).toHaveBeenCalledWith({ app: 'recycle-bin' })
    expect(updateView).toHaveBeenCalledWith(7, { app: 'recycle-bin', selectedId: 12 })
  })

  it('only opens it without an entry', async () => {
    const { host, updateView } = make()
    await openRecycleBin(host)
    expect(updateView).not.toHaveBeenCalled()
  })
})

describe('restoreReverted (UX-209)', () => {
  const make = (restore: () => Promise<void>) => {
    const updateView = vi.fn().mockResolvedValue(undefined)
    const openApp = vi.fn().mockResolvedValue({ id: 7 })
    return { host: { openApp, api: { desktop: { updateView }, recycle: { restore: vi.fn(restore) } } } as never, openApp, updateView }
  }

  it('restores the file in one click without opening the Recycle Bin', async () => {
    const { host, openApp } = make(() => Promise.resolve())
    expect(await restoreReverted(host, 12)).toEqual({ restored: true })
    expect(openApp).not.toHaveBeenCalled()
  })

  it('opens the Recycle Bin on the item and gives the reason when the file cannot be put back', async () => {
    const { host, openApp, updateView } = make(() => Promise.reject(new Error('Drive is not plugged in')))
    expect(await restoreReverted(host, 12)).toEqual({ restored: false, message: 'Drive is not plugged in' })
    expect(openApp).toHaveBeenCalledWith({ app: 'recycle-bin' })
    expect(updateView).toHaveBeenCalledWith(7, { app: 'recycle-bin', selectedId: 12 })
  })
})
