/** Pure A2UI surface state: reducer, JSON-pointer helpers, dynamic value resolution, fence parsing. */
import type { A2uiComponent, A2uiDynamic, A2uiServerMessage } from './a2ui'
import { A2UI_CATALOG_ID } from './a2ui'

export interface A2uiSurfaceState {
  surfaceId: string
  title: string | null
  catalogId: string
  components: A2uiComponent[]
  dataModel: unknown
}

export type A2uiSurfaces = Record<string, A2uiSurfaceState>

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function parsePointer(pointer: string): string[] {
  if (pointer === '' || pointer === '/') return []
  return pointer
    .replace(/^\//, '')
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
}

export function getByPointer(data: unknown, pointer: string): unknown {
  let cur: unknown = data
  for (const key of parsePointer(pointer)) {
    if (Array.isArray(cur)) cur = cur[Number(key)]
    else if (isObject(cur)) cur = cur[key]
    else return undefined
  }
  return cur
}

/** Immutable set; creates intermediate objects (or arrays for numeric keys). Empty pointer replaces the root. */
export function setByPointer(data: unknown, pointer: string, value: unknown): unknown {
  const keys = parsePointer(pointer)
  const go = (cur: unknown, i: number): unknown => {
    if (i === keys.length) return value
    const key = keys[i]
    if (Array.isArray(cur) && /^\d+$/.test(key)) {
      const copy = [...cur]
      copy[Number(key)] = go(copy[Number(key)], i + 1)
      return copy
    }
    const base = isObject(cur) ? cur : {}
    return { ...base, [key]: go(base[key], i + 1) }
  }
  return go(data, 0)
}

const isBinding = (v: unknown): v is { path: string } =>
  isObject(v) && typeof v.path === 'string' && Object.keys(v).length === 1

/** Resolve a literal-or-binding against the data model. */
export function resolveDynamic<T>(value: A2uiDynamic<T>, dataModel: unknown): T | undefined {
  return isBinding(value) ? (getByPointer(dataModel, value.path) as T | undefined) : (value as T)
}

/** Deep-resolve bindings inside an arbitrary structure (e.g. an action context). */
export function resolveDeep(value: unknown, dataModel: unknown): unknown {
  if (isBinding(value)) return getByPointer(dataModel, value.path)
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, dataModel))
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDeep(v, dataModel)]))
  return value
}

export function applyA2uiMessage(state: A2uiSurfaces, message: A2uiServerMessage): A2uiSurfaces {
  if ('createSurface' in message) {
    const { surfaceId, catalogId, title } = message.createSurface
    return { ...state, [surfaceId]: { surfaceId, title: title ?? null, catalogId: catalogId ?? A2UI_CATALOG_ID, components: [], dataModel: {} } }
  }
  if ('deleteSurface' in message) {
    const { [message.deleteSurface.surfaceId]: _removed, ...rest } = state
    return rest
  }
  if ('updateComponents' in message) {
    const { surfaceId, components } = message.updateComponents
    const surface = state[surfaceId]
    if (!surface) return state
    const next = [...surface.components]
    for (const c of components) {
      const idx = next.findIndex((e) => e.id === c.id)
      if (idx >= 0) next[idx] = c
      else next.push(c)
    }
    return { ...state, [surfaceId]: { ...surface, components: next } }
  }
  const { surfaceId, path, value } = message.updateDataModel
  const surface = state[surfaceId]
  if (!surface) return state
  const dataModel = path === undefined || path === '' ? value : setByPointer(surface.dataModel, path, value)
  return { ...state, [surfaceId]: { ...surface, dataModel } }
}

export interface A2uiFenceResult {
  messages: A2uiServerMessage[]
  text: string
}

const FENCE = /```a2ui[ \t]*\r?\n([\s\S]*?)```[ \t]*\r?\n?/g

/** Extract ```a2ui fenced JSON blocks (one message or an array). Invalid blocks are left in the text. */
export function parseA2uiFences(text: string): A2uiFenceResult {
  const messages: A2uiServerMessage[] = []
  const remaining = text.replace(FENCE, (whole, body: string) => {
    try {
      const parsed: unknown = JSON.parse(body)
      const list = Array.isArray(parsed) ? parsed : [parsed]
      if (!list.every(isObject)) return whole
      messages.push(...(list as unknown as A2uiServerMessage[]))
      return ''
    } catch {
      return whole
    }
  })
  return { messages, text: remaining }
}
