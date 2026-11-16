import { describe, expect, it } from 'vitest'
import { parseUnifiedDiff } from './unifiedDiff'

const head = 'diff --git a/f.ts b/f.ts\nindex 1..2 100644\n--- a/f.ts\n+++ b/f.ts\n'

describe('parseUnifiedDiff (-U0)', () => {
  it('parses additions, modifications and deletions', () => {
    const diff = head + '@@ -2,0 +3,2 @@ ctx\n+x\n+y\n@@ -5 +7 @@\n-old\n+new\n@@ -9,2 +10,0 @@\n-gone1\n-gone2\n'
    expect(parseUnifiedDiff(diff)).toEqual([
      { kind: 'added', start: 3, end: 4, oldLines: [] },
      { kind: 'modified', start: 7, end: 7, oldLines: ['old'] },
      { kind: 'deleted', start: 10, end: 10, oldLines: ['gone1', 'gone2'] }
    ])
  })

  it('treats a replace of 2 lines by 3 as modified over the new range', () => {
    expect(parseUnifiedDiff(head + '@@ -4,2 +4,3 @@\n-a\n-b\n+A\n+B\n+C\n')).toEqual([{ kind: 'modified', start: 4, end: 6, oldLines: ['a', 'b'] }])
  })

  it('deletion at the top has start 0', () => {
    expect(parseUnifiedDiff(head + '@@ -1 +0,0 @@\n-first\n')).toEqual([{ kind: 'deleted', start: 0, end: 0, oldLines: ['first'] }])
  })

  it('marks lines without a newline at the end of the file', () => {
    const diff = head + '@@ -3 +3 @@\n-last\n\\ No newline at end of file\n+last\n'
    expect(parseUnifiedDiff(diff)).toEqual([{ kind: 'modified', start: 3, end: 3, oldLines: ['last'], noEolOld: true }])
    const diff2 = head + '@@ -3 +3 @@\n-last\n+last\n\\ No newline at end of file\n'
    expect(parseUnifiedDiff(diff2)).toEqual([{ kind: 'modified', start: 3, end: 3, oldLines: ['last'], noEolNew: true }])
  })

  it('skips rename headers and ignores binary or empty diffs', () => {
    const renamed = 'diff --git a/a.ts b/b.ts\nsimilarity index 80%\nrename from a.ts\nrename to b.ts\nindex 1..2 100644\n--- a/a.ts\n+++ b/b.ts\n@@ -1 +1 @@\n-a\n+b\n'
    expect(parseUnifiedDiff(renamed)).toEqual([{ kind: 'modified', start: 1, end: 1, oldLines: ['a'] }])
    expect(parseUnifiedDiff('Binary files a/x and b/x differ\n')).toEqual([])
    expect(parseUnifiedDiff('')).toEqual([])
  })

  it('keeps old lines that look like headers', () => {
    expect(parseUnifiedDiff(head + '@@ -1 +1 @@\n--- not a header\n+++ also\n')).toEqual([{ kind: 'modified', start: 1, end: 1, oldLines: ['-- not a header'] }])
  })
})
