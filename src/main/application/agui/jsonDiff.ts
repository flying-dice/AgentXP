import type { JsonPatchOperation } from '@ag-ui/core'

const escapeKey = (key: string): string => key.replace(/~/g, '~0').replace(/\//g, '~1')

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const definedKeys = (value: Record<string, unknown>): string[] =>
  Object.keys(value).filter((key) => value[key] !== undefined)

/**
 * RFC 6902 patch that turns `prev` into `next` (both JSON values). Identical references are skipped,
 * so immutable updates that share unchanged sub-trees diff in time proportional to what changed.
 * Arrays diff element-wise: changed elements are replaced (recursively), a longer tail is added,
 * a shorter one removed from the end. `undefined` object values count as absent.
 */
export function diffJson(prev: unknown, next: unknown, path = ''): JsonPatchOperation[] {
  if (prev === next) return []
  if (Array.isArray(prev) && Array.isArray(next)) return diffArrays(prev, next, path)
  if (isObject(prev) && isObject(next)) return diffObjects(prev, next, path)
  if (Object.is(prev, next)) return []
  return [{ op: 'replace', path, value: next }]
}

function diffObjects(prev: Record<string, unknown>, next: Record<string, unknown>, path: string): JsonPatchOperation[] {
  const ops: JsonPatchOperation[] = []
  const prevKeys = definedKeys(prev)
  const nextKeys = definedKeys(next)
  for (const key of prevKeys) {
    if (next[key] === undefined) ops.push({ op: 'remove', path: `${path}/${escapeKey(key)}` })
  }
  for (const key of nextKeys) {
    const childPath = `${path}/${escapeKey(key)}`
    if (prev[key] === undefined) ops.push({ op: 'add', path: childPath, value: next[key] })
    else ops.push(...diffJson(prev[key], next[key], childPath))
  }
  return ops
}

function diffArrays(prev: unknown[], next: unknown[], path: string): JsonPatchOperation[] {
  const ops: JsonPatchOperation[] = []
  const shared = Math.min(prev.length, next.length)
  for (let i = 0; i < shared; i++) ops.push(...diffJson(prev[i], next[i], `${path}/${i}`))
  for (let i = shared; i < next.length; i++) ops.push({ op: 'add', path: `${path}/${i}`, value: next[i] })
  for (let i = prev.length - 1; i >= next.length; i--) ops.push({ op: 'remove', path: `${path}/${i}` })
  return ops
}
