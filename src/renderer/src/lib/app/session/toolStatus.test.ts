import { expect, it } from 'vitest'
import { toolStatusView } from './toolStatus'

it('maps statuses to the design labels', () => {
  expect(toolStatusView('in_progress')).toEqual({ kind: 'running', label: 'Running…' })
  expect(toolStatusView('pending').kind).toBe('running')
  expect(toolStatusView(undefined).kind).toBe('running')
  expect(toolStatusView('completed').label).toBe('Done')
  expect(toolStatusView('failed').label).toBe('Failed')
  expect(toolStatusView('cancelled').label).toBe('Cancelled')
})

it('lets a pending permission request win', () => {
  expect(toolStatusView('in_progress', true)).toEqual({ kind: 'waiting', label: 'Waiting for permission' })
})

it('shows a request the user denied as "Denied by you", not as a failure', () => {
  expect(toolStatusView('failed', false, true)).toEqual({ kind: 'denied', label: 'Denied by you' })
  expect(toolStatusView('completed', false, true).kind).toBe('denied')
  expect(toolStatusView('in_progress', true, true).kind).toBe('waiting')
})
