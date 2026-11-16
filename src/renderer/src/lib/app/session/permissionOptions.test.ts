import { describe, expect, it } from 'vitest'
import type { PermissionOptionDto } from '@shared/models'
import { accessKeyIndex, asPredicate, canRemember, captionFor, decisionForKey, decisionText, isAllow, optionFor, permissionMetadata } from './permissionOptions'

const all: PermissionOptionDto[] = [
  { optionId: 'r', name: 'Reject', kind: 'reject_once' },
  { optionId: 'a', name: 'Allow', kind: 'allow_once' },
  { optionId: 'aa', name: 'Always', kind: 'allow_always' },
  { optionId: 'rr', name: 'Never', kind: 'reject_always' }
]

it('picks the plain option, or the always variant when remembered', () => {
  expect(optionFor(all, 'allow', false)?.optionId).toBe('a')
  expect(optionFor(all, 'allow', true)?.optionId).toBe('aa')
  expect(optionFor(all, 'deny', false)?.optionId).toBe('r')
  expect(optionFor(all, 'deny', true)?.optionId).toBe('rr')
})

it('falls back to the other variant and to null', () => {
  const onlyAlways = all.filter((o) => o.kind === 'allow_always')
  expect(optionFor(onlyAlways, 'allow', false)?.optionId).toBe('aa')
  expect(optionFor(onlyAlways, 'deny', false)).toBeNull()
})

it('captions buttons like the Win7 dialog', () => {
  expect(captionFor(all, 'allow', false)).toBe('Allow')
  expect(captionFor(all, 'allow', true)).toBe('Always allow')
  expect(captionFor(all, 'deny', false)).toBe('Deny')
  expect(captionFor(all, 'deny', true)).toBe('Never allow')
  expect(captionFor([], 'deny', false)).toBe('Deny')
})

it('offers remembering only with always options', () => {
  expect(canRemember(all)).toBe(true)
  expect(canRemember(all.slice(0, 2).filter((o) => o.kind !== 'allow_always'))).toBe(false)
})

it('reads permission metadata defensively', () => {
  expect(permissionMetadata(undefined)).toBeNull()
  expect(permissionMetadata({ title: 1 })).toBeNull()
  expect(permissionMetadata({ title: 'Edit', options: [], requestId: 1, toolKind: 'edit' })?.title).toBe('Edit')
})

it('lowercases a verb title for the sentence', () => {
  expect(asPredicate('Edit src/a.ts')).toBe('edit src/a.ts')
  expect(asPredicate('npm test')).toBe('npm test')
  expect(asPredicate('`ls`')).toBe('`ls`')
})

describe('keys and announcement', () => {
  it('maps A, Alt+A and Alt+D to the answers and ignores everything else (Enter belongs to the focused Deny)', () => {
    expect(decisionForKey({ key: 'a', altKey: true })).toBe('allow')
    expect(decisionForKey({ key: 'D', altKey: true })).toBe('deny')
    expect(decisionForKey({ key: 'a', altKey: false })).toBe('allow')
    expect(decisionForKey({ key: 'd', altKey: false })).toBeNull()
    expect(decisionForKey({ key: 'Enter', altKey: false })).toBeNull()
    expect(decisionForKey({ key: 'A', altKey: false, shiftKey: true })).toBeNull()
    expect(decisionForKey({ key: 'a', altKey: true, ctrlKey: true })).toBeNull()
    expect(decisionForKey({ key: 'x', altKey: true })).toBeNull()
  })
  it('finds the letter to underline in a caption', () => {
    expect(accessKeyIndex('Allow', 'allow')).toBe(0)
    expect(accessKeyIndex('Always allow', 'allow')).toBe(0)
    expect(accessKeyIndex('Never allow', 'deny')).toBe(-1)
    expect(accessKeyIndex('Deny', 'deny')).toBe(0)
  })
  it('says what the user answered', () => {
    expect(decisionText(true, 'Change NOTE.md')).toBe('You allowed: Change NOTE.md.')
    expect(decisionText(false, 'Run a command')).toBe('You denied: Run a command.')
    expect(isAllow('allow_always')).toBe(true)
    expect(isAllow('reject_once')).toBe(false)
  })
})
