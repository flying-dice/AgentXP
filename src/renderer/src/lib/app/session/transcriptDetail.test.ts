import { describe, expect, it } from 'vitest'
import { TRANSCRIPT_DETAIL_KEY, TranscriptDetail } from './transcriptDetail.svelte'

const memory = (initial: Record<string, string> = {}): Storage => {
  const data = new Map(Object.entries(initial))
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) } as Storage
}

describe('TranscriptDetail', () => {
  it('folds by default and remembers the choice', () => {
    const storage = memory()
    const detail = new TranscriptDetail(storage)
    expect(detail.showAll).toBe(false)
    detail.toggle()
    expect(detail.showAll).toBe(true)
    expect(storage.getItem(TRANSCRIPT_DETAIL_KEY)).toBe('all')
    expect(new TranscriptDetail(storage).showAll).toBe(true)
  })

  it('works without storage or with storage that throws', () => {
    expect(new TranscriptDetail(null).showAll).toBe(false)
    const broken = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } } as unknown as Storage
    const detail = new TranscriptDetail(broken)
    detail.set(true)
    expect(detail.showAll).toBe(true)
  })
})
