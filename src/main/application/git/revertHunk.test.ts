import { describe, expect, it } from 'vitest'
import type { GitLineChange } from '@shared/git'
import { revertHunkText } from './revertHunk'

const c = (over: GitLineChange): GitLineChange => over

describe('revertHunkText', () => {
  const text = 'a\nB\nnew1\nnew2\nd\n'
  it('modified: puts the old lines back', () => {
    expect(revertHunkText(text, c({ kind: 'modified', start: 2, end: 2, oldLines: ['b', 'b2'] }))).toBe('a\nb\nb2\nnew1\nnew2\nd\n')
  })
  it('added: removes the lines', () => {
    expect(revertHunkText(text, c({ kind: 'added', start: 3, end: 4, oldLines: [] }))).toBe('a\nB\nd\n')
  })
  it('deleted: re-inserts after the line; start 0 inserts at the top', () => {
    expect(revertHunkText('a\nd\n', c({ kind: 'deleted', start: 1, end: 1, oldLines: ['b', 'c'] }))).toBe('a\nb\nc\nd\n')
    expect(revertHunkText('a\n', c({ kind: 'deleted', start: 0, end: 0, oldLines: ['z'] }))).toBe('z\na\n')
  })
  it('restores a missing final newline of HEAD when the change reaches the end', () => {
    expect(revertHunkText('a\nlast\n', c({ kind: 'modified', start: 2, end: 2, oldLines: ['last'], noEolOld: true }))).toBe('a\nlast')
    expect(revertHunkText('a\nb', c({ kind: 'modified', start: 2, end: 2, oldLines: ['b'] }))).toBe('a\nb\n')
    expect(revertHunkText('a\n', c({ kind: 'deleted', start: 1, end: 1, oldLines: ['b'], noEolOld: true }))).toBe('a\nb')
  })
  it('keeps the newline state when the change is in the middle, and handles CRLF lines', () => {
    expect(revertHunkText('a\nX\nc', c({ kind: 'modified', start: 2, end: 2, oldLines: ['b'] }))).toBe('a\nb\nc')
    expect(revertHunkText('a\r\nX\r\nc\r\n', c({ kind: 'modified', start: 2, end: 2, oldLines: ['b\r'] }))).toBe('a\r\nb\r\nc\r\n')
  })
  it('reverting an added file leaves it empty', () => {
    expect(revertHunkText('x\ny\n', c({ kind: 'added', start: 1, end: 2, oldLines: [] }))).toBe('')
  })
})
