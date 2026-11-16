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
