import { describe, expect, it } from 'vitest'
import { changeSummary } from './changeSummary'

describe('changeSummary', () => {
  it('counts added and removed lines against the old text', () => {
    const s = changeSummary('a\nb\nc\n', 'a\nB\nc\nd\n')
    expect(s).toMatchObject({ added: 2, removed: 1, replacesWholeFile: false, text: '2 lines added, 1 removed' })
    expect(s.rows).toBeGreaterThan(3)
  })

  it('treats an empty old text as a new file', () => {
    expect(changeSummary('', 'x\n')).toMatchObject({ added: 1, removed: 0, replacesWholeFile: false, text: '1 line added, 0 removed' })
  })

  it('says so when the old text is unknown', () => {
    expect(changeSummary(null, 'x\ny\n')).toMatchObject({ added: 2, replacesWholeFile: true })
  })
})
