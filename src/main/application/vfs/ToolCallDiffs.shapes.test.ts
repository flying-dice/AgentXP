// H-76: the two shapes in which an agent sends a change that needs approval.
//  1. inside the request: requestPermission({ toolCall: { toolCallId, title, content: [diff] } })
//  2. split: a tool_call update carries the diff, then requestPermission({ toolCall: { toolCallId, title } }) has no content
//     (the stock scripted agent, scripts/ux-panel/scripts/fix-redirect.json, works like this).
// ToolCallDiffs sees a ToolCallPatch; these tests pin what it does with each patch the broker can hand it.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ToolCallPatch } from '../../domain/agent/AgentSessionEvent'
import { createVfsFixture } from '../test-helpers'
import { changeCounts } from '@shared/lineCounts'
import { ToolCallDiffs } from './ToolCallDiffs'

const OLD = "export function afterLogin(url: string): string {\n  return '/home'\n}\n"
const NEW = "export function afterLogin(url: string): string {\n  const next = new URL(url, 'http://app.local').searchParams.get('next')\n  return next ?? '/home'\n}\n"

let f: Awaited<ReturnType<typeof createVfsFixture>>
let diffs: ToolCallDiffs

beforeEach(async () => {
  f = await createVfsFixture()
  diffs = new ToolCallDiffs(f.vfs, (sessionId) => (sessionId === 1 ? f.desktop.id : null))
  writeFileSync(join(f.projectDir, 'redirect.ts'), OLD)
})

const diffPatch = (): ToolCallPatch => ({ contents: [{ kind: 'diff', path: 'E:\\redirect.ts', oldText: null, newText: NEW }] })
const counts = (patch: ToolCallPatch) => {
  const d = patch.contents?.[0]
  return d && d.kind === 'diff' ? changeCounts(d.oldText, d.newText) : null
}

describe('ToolCallDiffs: both request shapes', () => {
  it('shape 1, the diff inside the request: needsText is true and complete reads the file', async () => {
    const request = { title: 'Change src/auth/redirect.ts', ...diffPatch() }
    expect(diffs.needsText(request)).toBe(true)
    expect(counts(await diffs.complete(1, request))).toMatchObject({ kind: 'partial', additions: 2, deletions: 1 })
  })

  it('shape 2, split: the request alone carries no diff, so needsText is false (the broker must complete the earlier tool_call update)', () => {
    const request: ToolCallPatch = { title: 'Change src/auth/redirect.ts' }
    expect(diffs.needsText(request)).toBe(false)
  })

  it('shape 2, split: the update that carries the diff is completed the same way as the request of shape 1', async () => {
    const update = diffPatch()
    expect(diffs.needsText(update)).toBe(true)
    const full = await diffs.complete(1, update)
    expect(full.contents?.[0]).toMatchObject({ oldText: OLD })
  })

  it('both shapes end with the same old text, so the box and the Changes pane count the same lines', async () => {
    const inRequest = await diffs.complete(1, { title: 'Change', ...diffPatch() })
    const inUpdate = await diffs.complete(1, diffPatch())
    expect(inRequest.contents).toEqual(inUpdate.contents)
  })

  it('a split update for a file that cannot be read keeps null and the error kind, so the box can say why', async () => {
    const full = await diffs.complete(1, { contents: [{ kind: 'diff', path: '/not/a/vpath', oldText: null, newText: NEW }] })
    expect(full.contents?.[0]).toMatchObject({ oldText: null, oldTextError: 'unreadable' })
  })
})
