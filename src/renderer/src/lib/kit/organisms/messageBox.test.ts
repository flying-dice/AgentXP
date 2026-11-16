import { get } from 'svelte/store'
import { describe, expect, it } from 'vitest'
import { cancelResultFor, MESSAGE_BOX_BUTTONS } from '../molecules/DialogButtons'
import { MessageBoxService } from './messageBox'

describe('MessageBoxService', () => {
  it('resolves the promise with the settled result and dequeues', async () => {
    const service = new MessageBoxService()
    const promise = service.show({ text: 'Save changes?', buttons: 'YesNoCancel' })
    const [first] = get(service.queue)
    expect(first.options.text).toBe('Save changes?')
    service.settle(first.id, 'yes')
    await expect(promise).resolves.toBe('yes')
    expect(get(service.queue)).toHaveLength(0)
  })

  it('queues boxes in order', async () => {
    const service = new MessageBoxService()
    const a = service.show({ text: 'a' })
    const b = service.show({ text: 'b' })
    expect(get(service.queue).map((i) => i.options.text)).toEqual(['a', 'b'])
    service.settle(get(service.queue)[0].id, 'ok')
    await a
    expect(get(service.queue)[0].options.text).toBe('b')
    service.settle(get(service.queue)[0].id, 'ok')
    await expect(b).resolves.toBe('ok')
  })

  it('ignores a second settle for the same box', async () => {
    const service = new MessageBoxService()
    const p = service.show({ text: 'x' })
    const id = get(service.queue)[0].id
    service.settle(id, 'ok')
    service.settle(id, 'cancel')
    await expect(p).resolves.toBe('ok')
  })
})

describe('MessageBoxService with actions', () => {
  it('resolves with the id of the picked action', async () => {
    const service = new MessageBoxService()
    const promise = service.show({ text: 'The agent could not start.', actions: [{ id: 'agents', label: 'Open Agents' }, { id: 'close', label: 'Close' }] })
    const [box] = get(service.queue)
    expect(box.options.actions?.map((a) => a.id)).toEqual(['agents', 'close'])
    service.settle(box.id, 'agents')
    await expect(promise).resolves.toBe('agents')
  })
})

describe('cancelResultFor', () => {
  it('follows the Windows Esc rules', () => {
    expect(cancelResultFor(MESSAGE_BOX_BUTTONS.OK)).toBe('ok')
    expect(cancelResultFor(MESSAGE_BOX_BUTTONS.OKCancel)).toBe('cancel')
    expect(cancelResultFor(MESSAGE_BOX_BUTTONS.YesNoCancel)).toBe('cancel')
    expect(cancelResultFor(MESSAGE_BOX_BUTTONS.YesNo)).toBeUndefined()
    expect(cancelResultFor(MESSAGE_BOX_BUTTONS.AbortRetryIgnore)).toBeUndefined()
  })
})
