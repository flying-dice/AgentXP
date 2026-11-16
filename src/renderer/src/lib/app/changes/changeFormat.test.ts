import { describe, expect, it } from 'vitest'
import { absolutePath, changeKindLabel, linesLabel } from './changeFormat'

describe('changeFormat', () => {
  it('labels kinds and line counts', () => {
    expect(changeKindLabel('modified')).toBe('Modified')
    expect(linesLabel({ additions: 4, deletions: 1 })).toBe('+4 -1')
  })

  it('joins with the separator of the folder path', () => {
    expect(absolutePath('/home/a/', 'src/x.ts')).toBe('/home/a/src/x.ts')
    expect(absolutePath('C:\\Users\\a', 'src/x.ts')).toBe('C:\\Users\\a\\src\\x.ts')
  })
})
