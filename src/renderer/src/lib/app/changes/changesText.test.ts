import { describe, expect, it } from 'vitest'
import { CHANGES_EMPTY, UNDONE_TEXT, gitNote, revertReasonText } from './changesText'

describe('the words of the Changes pane (UX-185, UX-187)', () => {
  it('never says the chat changed nothing beside a Git list', () => {
    expect(CHANGES_EMPTY).toBe('This chat did not change any file.')
    expect(gitNote(3, true)).toEqual({ kind: 'files', text: 'Git shows 3 changed files from before.' })
    expect(gitNote(1, true)?.text).toBe('Git shows 1 changed file from before.')
  })

  it('says why there is no Git list for a folder without Git, and nothing when that is not known', () => {
    expect(gitNote(0, false)).toEqual({ kind: 'untracked', text: 'This folder is not tracked by Git, so there is nothing else to show.' })
    expect(gitNote(0, true)).toBeNull()
    expect(gitNote(0, undefined)).toBeNull()
  })

  it('says why Revert is grey', () => {
    expect(revertReasonText(false, false)).toBe('Nothing to revert yet.')
    expect(revertReasonText(true, false)).toBe('Select a changed file first.')
    expect(revertReasonText(true, true)).toBeNull()
  })

  it('tells where an undone change is', () => {
    expect(UNDONE_TEXT).toBe('This change was undone. Restore it from the Recycle Bin.')
  })
})
