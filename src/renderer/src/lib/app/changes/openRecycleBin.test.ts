import { describe, expect, it, vi } from 'vitest'
import { openRecycleBin } from './openRecycleBin'

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
