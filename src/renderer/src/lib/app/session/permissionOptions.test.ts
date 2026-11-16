import { expect, it } from 'vitest'
import type { PermissionOptionDto } from '@shared/models'
import { asPredicate, canRemember, captionFor, optionFor, permissionMetadata } from './permissionOptions'

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
