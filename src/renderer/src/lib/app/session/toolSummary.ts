import type { ToolCallLocationDto, ToolKind } from '@shared/models'

const KIND_LABELS: Record<ToolKind, string> = {
  read: 'Read',
  edit: 'Edit',
  delete: 'Delete',
  move: 'Move',
  search: 'Search',
  execute: 'Bash',
  think: 'Think',
  fetch: 'Fetch',
  switch_mode: 'Mode',
  other: ''
}

const PATH_KEYS = ['file_path', 'filePath', 'path', 'notebook_path', 'abs_path']
const FALLBACK_KEYS = ['command', 'pattern', 'query', 'url', 'description', 'prompt', 'path']

type Input = Record<string, unknown>

function parseInput(rawInput: string | null): Input {
  if (!rawInput) return {}
  try {
    const parsed: unknown = JSON.parse(rawInput)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Input) : {}
  } catch {
    return {}
  }
}

const text = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() === '' ? null : value
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return value.join(' ') || null
  return null
}

const firstText = (input: Input, keys: readonly string[]): string | null => {
  for (const key of keys) {
    const value = text(input[key])
    if (value) return value
  }
  return null
}

const stripTicks = (title: string): string => title.replace(/^`+|`+$/g, '')

function locationText(locations: readonly ToolCallLocationDto[]): string | null {
  const first = locations[0]
  if (!first) return null
  return first.line ? `${first.path}:${first.line}` : first.path
}

/** The tool name shown in bold: Read, Edit, Bash, Grep..., or the agent's own tool name for `other`. */
export function toolLabel(kind: ToolKind | undefined, toolName: string, rawInput: string | null = null): string {
  if (kind === 'search') {
    const input = parseInput(rawInput)
    if ('pattern' in input) return 'Grep'
    if ('glob' in input) return 'Glob'
  }
  const label = kind ? KIND_LABELS[kind] : ''
  return label || toolName || 'Tool'
}

/** The one-line argument next to the tool name: the path, the command, the pattern... */
export function toolArgument(
  kind: ToolKind | undefined,
  rawInput: string | null,
  locations: readonly ToolCallLocationDto[],
  title: string
): string {
  const input = parseInput(rawInput)
  switch (kind) {
    case 'execute':
      return firstText(input, ['command', 'cmd']) ?? stripTicks(title)
    case 'read':
    case 'edit':
    case 'delete':
      return firstText(input, PATH_KEYS) ?? locationText(locations) ?? title
    case 'move': {
      const from = firstText(input, ['from', 'source', 'old_path'])
      const to = firstText(input, ['to', 'destination', 'new_path'])
      return from && to ? `${from} → ${to}` : (locationText(locations) ?? title)
    }
    case 'search': {
      const pattern = firstText(input, ['pattern', 'query', 'glob'])
      const where = firstText(input, ['path', 'directory'])
      if (pattern) return where ? `${pattern} in ${where}` : pattern
      return title
    }
    case 'fetch':
      return firstText(input, ['url', 'query']) ?? title
    default:
      return firstText(input, FALLBACK_KEYS) ?? locationText(locations) ?? title
  }
}

/** Execute-like tools open their output by default (as the design's Bash card does). */
export const expandsByDefault = (kind: ToolKind | undefined): boolean => kind === 'execute'
