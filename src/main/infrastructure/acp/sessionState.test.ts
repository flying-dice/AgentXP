import { describe, expect, it } from 'vitest'
import { extractSessionState } from './sessionState'

describe('extractSessionState', () => {
  it('reads modes', () => {
    const state = extractSessionState({
      modes: { currentModeId: 'a', availableModes: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', description: 'bee' }] }
    })
    expect(state.currentModeId).toBe('a')
    expect(state.modes).toEqual([
      { id: 'a', name: 'A', description: null },
      { id: 'b', name: 'B', description: 'bee' }
    ])
    expect(state.models).toEqual([])
  })

  it('reads models from a model config option, including groups', () => {
    const state = extractSessionState({
      configOptions: [
        {
          type: 'select',
          id: 'model',
          name: 'Model',
          category: 'model',
          currentValue: 'm2',
          options: [{ group: 'g', name: 'G', options: [{ value: 'm1', name: 'One' }, { value: 'm2', name: 'Two' }] }]
        }
      ]
    })
    expect(state.currentModelId).toBe('m2')
    expect(state.modelConfigId).toBe('model')
    expect(state.models.map((m) => m.id)).toEqual(['m1', 'm2'])
  })

  it('reads the legacy models shape', () => {
    const state = extractSessionState({
      models: { currentModelId: 'x', availableModels: [{ modelId: 'x', name: 'X' }] }
    } as never)
    expect(state.models).toEqual([{ id: 'x', name: 'X', description: null }])
    expect(state.currentModelId).toBe('x')
    expect(state.modelConfigId).toBeNull()
  })

  it('prefers model config choices when an adapter also includes legacy models', () => {
    const state = extractSessionState({
      models: { currentModelId: 'old', availableModels: [] },
      configOptions: [{ type: 'select', id: 'model', name: 'Model', category: 'model', currentValue: 'new', options: [{ value: 'new', name: 'New model' }] }]
    } as never)
    expect(state.models).toEqual([{ id: 'new', name: 'New model', description: null }])
    expect(state.currentModelId).toBe('new')
  })
})
