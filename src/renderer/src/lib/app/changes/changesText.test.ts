import { describe, expect, it } from 'vitest'
import { CHANGES_EMPTY, NOT_TRACKED_TEXT, UNDONE_TEXT, gitNote, restoreFailedText, restoredText, revertReasonText } from './changesText'

describe('the words of the Changes pane (UX-185, UX-187)', () => {
  it('never says the chat changed nothing beside a Git list', () => {
    expect(CHANGES_EMPTY).toBe('No uncommitted changes from this chat.')
    expect(gitNote(3, true)).toEqual({ kind: 'files', text: 'Git shows 3 changed files from before:' })
    expect(gitNote(1, true)?.text).toBe('Git shows 1 changed file from before:')
  })

  it('says why there is no Git list for a folder without Git, and nothing when that is not known', () => {
    expect(gitNote(0, false)).toEqual({ kind: 'untracked', text: 'This folder is not tracked by Git, so there are no change marks.' })
    expect(NOT_TRACKED_TEXT).toBe('This folder is not tracked by Git, so there are no change marks.')
    expect(gitNote(0, true)).toBeNull()
    expect(gitNote(0, undefined)).toBeNull()
  })

  it('says why Revert is grey', () => {
    expect(revertReasonText(false, false)).toBe('Nothing to revert yet.')
    expect(revertReasonText(true, false)).toBe('Select a changed file first.')
    expect(revertReasonText(true, true)).toBeNull()
  })

  it('tells where an undone change is', () => {
    expect(UNDONE_TEXT).toBe('This change was undone. Restore it to put the file back.')
  })

  it('says what was restored, by the name of the file', () => {
    expect(restoredText('E:\\src\\auth\\redirect.ts')).toBe('Restored redirect.ts.')
    expect(restoredText('notes.txt')).toBe('Restored notes.txt.')
  })

  it('says why a restore did not happen here, and what to do', () => {
    expect(restoreFailedText('ENOENT: no such file or directory')).toMatch(/folder of this file is not available/)
    expect(restoreFailedText('Drive 3 is not plugged in')).toMatch(/Open the Recycle Bin/)
    expect(restoreFailedText('disk is full')).toBe('The file could not be restored here. Open the Recycle Bin to try from there.')
  })
})
