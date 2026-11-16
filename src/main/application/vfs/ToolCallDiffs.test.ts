import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ToolCallPatch } from '../../domain/agent/AgentSessionEvent'
import { createVfsFixture } from '../test-helpers'
import { changeCounts } from '@shared/lineCounts'
import { ToolCallDiffs } from './ToolCallDiffs'

let f: Awaited<ReturnType<typeof createVfsFixture>>
let diffs: ToolCallDiffs

beforeEach(async () => {
  f = await createVfsFixture()
  diffs = new ToolCallDiffs(f.vfs, (sessionId) => (sessionId === 1 ? f.desktop.id : null))
})

const edit = (path: string, oldText: string | null = null): ToolCallPatch => ({ contents: [{ kind: 'diff', path, oldText, newText: 'new\n' }] })

describe('ToolCallDiffs', () => {
  it('knows when the old text is missing', () => {
    expect(diffs.needsText(edit('E:\\a.ts'))).toBe(true)
    expect(diffs.needsText(edit('E:\\a.ts', 'x'))).toBe(false)
    expect(diffs.needsText({ title: 'Run' })).toBe(false)
  })

  it('reads the current text of an existing file', async () => {
    mkdirSync(join(f.projectDir, 'src'))
    writeFileSync(join(f.projectDir, 'src', 'a.ts'), 'old\n')
    const full = await diffs.complete(1, edit('E:\\src\\a.ts'))
    expect(full.contents).toEqual([{ kind: 'diff', path: 'E:\\src\\a.ts', oldText: 'old\n', newText: 'new\n' }])
  })

  it('uses an empty old text for a file that does not exist yet', async () => {
    const full = await diffs.complete(1, edit('E:\\created.ts'))
    expect(full.contents?.[0]).toMatchObject({ oldText: '' })
  })

  it('keeps null and names the error when the path cannot be read', async () => {
    expect((await diffs.complete(1, edit('/not/a/vpath'))).contents?.[0]).toMatchObject({ oldText: null, oldTextError: 'unreadable' })
  })

  it('keeps null when the chat has no desktop', async () => {
    expect((await diffs.complete(2, edit('E:\\a.ts'))).contents?.[0]).toMatchObject({ oldText: null })
  })

  it('a three-line change keeps the real old text, so the counts equal the Changes pane (3 and 3)', async () => {
    writeFileSync(join(f.projectDir, 'three.ts'), 'a\nb\nc\nd\ne\n')
    const patch: ToolCallPatch = { contents: [{ kind: 'diff', path: 'E:\\three.ts', oldText: null, newText: 'a\nX\nY\nZ\ne\n' }] }
    const full = await diffs.complete(1, patch)
    const diff = full.contents?.[0]
    expect(diff).toMatchObject({ oldText: 'a\nb\nc\nd\ne\n' })
    expect(diff && diff.kind === 'diff' ? changeCounts(diff.oldText, diff.newText) : null).toEqual({ kind: 'partial', additions: 3, deletions: 3 })
  })
})
