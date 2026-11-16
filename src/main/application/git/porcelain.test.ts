import { describe, expect, it } from 'vitest'
import { parsePorcelainV2 } from './porcelain'

const z = (...records: string[]): string => records.join('\0') + '\0'
const H = '1234567890123456789012345678901234567890'

describe('parsePorcelainV2', () => {
  it('reads branch, ahead/behind, changes, untracked and spaces in names', () => {
    const out = z(
      `# branch.oid ${H}`,
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +1 -2',
      `1 .M N... 100644 100644 100644 ${H} ${H} src/a b.ts`,
      `1 A. N... 000000 100644 100644 ${H} ${H} new.ts`,
      `1 MD N... 100644 100644 000000 ${H} ${H} gone.ts`,
      '? notes/todo.txt'
    )
    const s = parsePorcelainV2(out)
    expect(s).toMatchObject({ branch: 'main', ahead: 1, behind: 2 })
    expect(s.entries).toEqual([
      { path: 'src/a b.ts', index: ' ', worktree: 'M' },
      { path: 'new.ts', index: 'A', worktree: ' ' },
      { path: 'gone.ts', index: 'M', worktree: 'D' },
      { path: 'notes/todo.txt', index: '?', worktree: '?' }
    ])
  })

  it('reads a rename with its original path (the next NUL record)', () => {
    const s = parsePorcelainV2(z('# branch.head main', `2 R. N... 100644 100644 100644 ${H} ${H} R100 new name.ts`, 'old name.ts', '? x'))
    expect(s.entries).toEqual([
      { path: 'new name.ts', index: 'R', worktree: ' ', origPath: 'old name.ts' },
      { path: 'x', index: '?', worktree: '?' }
    ])
  })

  it('reads conflicts as unmerged', () => {
    const s = parsePorcelainV2(z('# branch.head main', `u UU N... 100644 100644 100644 100644 ${H} ${H} ${H} c.ts`, `u AA N... 000000 100644 100644 100644 ${H} ${H} ${H} d.ts`))
    expect(s.entries.map((e) => e.index + e.worktree)).toEqual(['UU', 'AA'])
  })

  it('names a detached HEAD by its short id and a fresh repository', () => {
    expect(parsePorcelainV2(z(`# branch.oid ${H}`, '# branch.head (detached)')).branch).toBe('1234567')
    expect(parsePorcelainV2(z('# branch.oid (initial)', '# branch.head master')).branch).toBe('master (no commits yet)')
  })

  it('handles empty output', () => {
    expect(parsePorcelainV2('')).toEqual({ branch: '', ahead: 0, behind: 0, entries: [] })
  })
})
