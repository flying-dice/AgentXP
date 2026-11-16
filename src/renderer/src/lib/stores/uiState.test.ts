import { describe, expect, it } from 'vitest'
import { defaultUiState, parseUiState } from './uiState'

describe('parseUiState', () => {
  it('falls back to the defaults for missing or broken input', () => {
    expect(parseUiState(null)).toEqual(defaultUiState())
    expect(parseUiState('{nope')).toEqual(defaultUiState())
    expect(parseUiState('42')).toEqual(defaultUiState())
  })

  it('restores valid values and clamps widths', () => {
    const state = parseUiState(
      JSON.stringify({ leftTab: 'files', rightTab: 'tasks', leftWidth: 5000, rightWidth: 300, activeSessionId: 7, collapsed: ['a', 3] })
    )
    expect(state).toEqual({ leftTab: 'files', rightTab: 'tasks', leftWidth: 900, rightWidth: 300, activeSessionId: 7, collapsed: ['a'] })
  })

  it('ignores unknown tab names', () => {
    expect(parseUiState(JSON.stringify({ leftTab: 'x', rightTab: 'y' })).rightTab).toBe('changes')
  })
})
