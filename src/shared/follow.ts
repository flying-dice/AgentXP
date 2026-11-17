/**
 * Follow (`docs/AGENT_PRESENCE.md`, section 7): the operator opts in to watch one agent live. While the operator follows
 * a chat, its Work (reads, searches, edits, runs) is projected as quiet shows: Code goes to the file and lines, the
 * agent cursor travels there, the Terminal shows the run. There is no note callout. One followed chat per desktop.
 *
 * Pure types and functions only.
 */
import type { AgentIdentity } from './identity'
import type { Id, ToolCallContentDto, ToolCallLocationDto, ToolKind } from './models'
import { toolShowTargets } from './toolShowTarget'
import type { VPath } from './vfs'

/** The chat a desktop follows (`DesktopState.following`), so the agent and the top bar both see it. */
export interface FollowStateDto {
  sessionId: Id
  /** **Keep following**: the follow stays after the chat's turn ends. */
  keep: boolean
  identity: AgentIdentity
}

/** Why a follow ended. `stopped`: the operator clicked **Stop following**; `replaced`: the operator followed another chat. */
export type FollowEndReason = 'stopped' | 'replaced' | 'paused' | 'turn-ended' | 'closed'

export interface FollowEndedDto {
  desktopId: Id
  sessionId: Id
  identity: AgentIdentity
  reason: FollowEndReason
}

export interface FollowEvents {
  /** A follow ended. The top bar says so in one short line when the operator did not end it (`followEndedText`). */
  'desktop.followEnded': FollowEndedDto
}

/** The short line of the top bar after a follow ended on its own; null when the operator ended it (they know). */
export function followEndedText(name: string, reason: FollowEndReason): string | null {
  switch (reason) {
    case 'paused':
      return `Stopped following ${name}: agents are paused.`
    case 'turn-ended':
      return `Stopped following ${name}: the turn ended.`
    case 'closed':
      return `Stopped following ${name}: the chat closed.`
    default:
      return null
  }
}

/** Where a projected step goes: Code at the file and lines, or the Terminal on the run. Browser steps point on their own. */
export type FollowTarget =
  | { kind: 'code'; path: VPath; lines: [number, number] | null }
  | { kind: 'terminal'; terminalId: string | null; command: string | null }

/** The part of a transcript tool call that Follow reads. */
export interface FollowCallInput {
  title: string
  toolKind?: ToolKind | null
  rawInput: string | null
  rawOutput?: string | null
  locations?: readonly ToolCallLocationDto[]
  contents?: readonly ToolCallContentDto[]
}

/** The text result of a call: its text content blocks, else the `text` of a JSON raw output. */
export function callResultText(call: Pick<FollowCallInput, 'rawOutput' | 'contents'>): string | null {
  const texts = (call.contents ?? []).flatMap((c) => (c.kind === 'content' && c.block.kind === 'text' ? [c.block.text] : []))
  if (texts.length > 0) return texts.join('\n')
  if (!call.rawOutput) return null
  try {
    const value: unknown = JSON.parse(call.rawOutput)
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value !== null && typeof (value as { text?: unknown }).text === 'string') return (value as { text: string }).text
  } catch {
    return call.rawOutput
  }
  return null
}

/** The lines a `code_edit` result names: "Edited E:\a.ts (lines 3-5)." gives [3, 5], "(line 7)" gives [7, 7]. */
export function editedLines(result: string | null): [number, number] | null {
  const range = /\(lines? (\d+)(?:-(\d+))?\)\.?\s*$/m.exec(result ?? '')
  if (!range) return null
  const first = Number(range[1])
  return [first, Math.max(first, Number(range[2] ?? range[1]))]
}

/**
 * Where a step of a followed chat is projected, or null when it has no place (a list, a think step, a search with no
 * match yet). The **Show in...** place of the step (`toolShowTargets`); an edit goes to the lines its result names.
 */
export function followTarget(call: FollowCallInput, cwd?: VPath | null): FollowTarget | null {
  const result = callResultText(call)
  const targets = toolShowTargets({ title: call.title, kind: call.toolKind ?? null, rawInput: call.rawInput, locations: call.locations ?? [], contents: call.contents ?? [], result, cwd: cwd ?? null })
  const first = targets[0]
  if (!first) return null
  if (first.kind === 'code') {
    const edited = first.lines === null && targets.some((t) => t.kind === 'diff') ? editedLines(result) : null
    return { kind: 'code', path: first.path, lines: first.lines ?? edited }
  }
  if (first.kind === 'terminal') return { kind: 'terminal', terminalId: first.terminalId, command: first.command }
  return null
}
