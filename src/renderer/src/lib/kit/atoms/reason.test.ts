import { describe, expect, it } from 'vitest'
import { firstReason, reasonFor } from './reason'

describe('reasonFor', () => {
  it('turns a reason into a disabled button with the same text as tooltip and description', () => {
    expect(reasonFor('Select a chat first')).toEqual({ disabled: true, title: 'Select a chat first', 'aria-description': 'Select a chat first' })
  })
  it('leaves a button with no reason on, with its own tooltip', () => {
    expect(reasonFor(null, 'Stop the step')).toEqual({ disabled: false, title: 'Stop the step', 'aria-description': undefined })
    expect(reasonFor('')).toMatchObject({ disabled: false })
  })
  it('picks the first reason that applies', () => {
    expect(firstReason([false, 'Select an agent first', 'This is already the default'])).toBe('Select an agent first')
    expect(firstReason([false, null, undefined])).toBeNull()
  })
})
