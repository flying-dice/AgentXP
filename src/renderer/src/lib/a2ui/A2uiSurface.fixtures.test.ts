import { describe, expect, it } from 'vitest'
import { A2uiMessageValidator } from '@shared/a2ui/validation'
import { codeReview, controls, projectOverview, settingsForm, streamingBatches, testResults } from './A2uiSurface.fixtures'

const validator = new A2uiMessageValidator()

describe('story fixtures', () => {
  it.each([
    ['settingsForm', settingsForm],
    ['testResults', testResults],
    ['codeReview', codeReview],
    ['projectOverview', projectOverview],
    ['controls', controls],
    ['streaming', streamingBatches.flat()]
  ])('%s is a valid A2UI v0.9 message sequence', (_name, messages) => {
    const result = validator.validate(messages)
    expect(result.ok ? [] : result.errors).toEqual([])
  })
})
