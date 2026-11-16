/**
 * Turns the resolved props of a web_core `ComponentNode` into plain view props: bindings are
 * unwrapped to their value (and get a `set<Name>` writer), child references stay `ComponentNode`s
 * and actions stay callable closures. The same pattern @a2ui/react uses.
 */
import { ResolvedBinding, isComponentNode, isWritable, type ComponentNode, type NodeProps } from '@a2ui/web_core/v0_9'

export type ViewProps = Record<string, unknown>

const noop = (): void => {}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const setterName = (key: string): string => `set${key.charAt(0).toUpperCase()}${key.slice(1)}`

function toViewValue(value: unknown): unknown {
  if (isComponentNode(value)) return value
  if (value instanceof ResolvedBinding) return toViewValue(value.value)
  if (Array.isArray(value)) return value.map(toViewValue)
  if (isPlainObject(value)) return toViewProps(value)
  return value
}

export function toViewProps(props: NodeProps): ViewProps {
  const view: ViewProps = {}
  for (const [key, inner] of Object.entries(props)) {
    if (inner instanceof ResolvedBinding) {
      view[key] = toViewValue(inner.value)
      view[setterName(key)] = isWritable(inner) ? inner.set : noop
    } else view[key] = toViewValue(inner)
  }
  return view
}

/** The writer of a bound prop (`value` -> `setValue`); a no-op when the prop is a literal. */
export function setterOf(view: ViewProps, key: string): (value: unknown) => void {
  const setter = view[setterName(key)]
  return typeof setter === 'function' ? (setter as (value: unknown) => void) : noop
}

// Narrowing helpers: the catalog already validated the shapes, these only turn `unknown` into types.

export const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : value === undefined || value === null ? fallback : String(value))
export const asNumber = (value: unknown, fallback?: number): number | undefined => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  return Number.isFinite(n) ? n : fallback
}
export const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback)
export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
export const asStringList = (value: unknown): string[] => asArray(value).map((v) => asString(v))
export const asRecord = (value: unknown): Record<string, unknown> => (isPlainObject(value) ? value : {})
export const asNode = (value: unknown): ComponentNode | undefined => (isComponentNode(value) ? value : undefined)
export const asNodes = (value: unknown): ComponentNode[] => asArray(value).filter(isComponentNode)
export const asAction = (value: unknown): (() => void) | undefined => (typeof value === 'function' ? () => void (value as () => unknown)() : undefined)
export function asEnum<const T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}
