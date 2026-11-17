import { describe, expect, it } from 'vitest'
import { changeSummary } from './changeSummary'

describe('changeSummary', () => {
  it('counts added and removed lines against the old text', () => {
    const s = changeSummary('a\nb\nc\n', 'a\nB\nc\nd\n')
    expect(s).toMatchObject({ added: 2, removed: 1, kind: 'partial', text: '2 lines added, 1 removed' })
    expect(s.rows).toBeGreaterThan(3)
  })

  it('treats an empty old text as a new file', () => {
    expect(changeSummary('', 'x\n')).toMatchObject({ added: 1, removed: 0, kind: 'new', text: 'The file does not exist yet, so everything below is new (1 line).' })
  })

  it('says it cannot show the change when the old text is unknown, and does not claim a replacement', () => {
    const s = changeSummary(null, 'x\ny\n')
    expect(s).toMatchObject({ unreadable: true, text: 'AgentXP cannot read the file, so it cannot show what changes.' })
    expect(changeSummary(null, 'x\n', { path: 'E:\\a.ts', error: 'in_use' }).text).toBe('AgentXP cannot read E:\\a.ts: it is in use.')
    expect(s.text).not.toMatch(/whole file/)
  })
  it('claims a whole-file replacement only when every line changes', () => {
    expect(changeSummary('a\nb\n', 'x\ny\n').text).toBe('2 lines added, 2 removed. This replaces the whole file.')
  })
})
