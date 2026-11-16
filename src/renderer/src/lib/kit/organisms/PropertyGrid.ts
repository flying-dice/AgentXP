export type PropertyType = 'string' | 'number' | 'boolean' | 'enum'

export interface PropertyDef {
  key: string
  /** Display name; defaults to `key`. */
  name?: string
  category?: string
  type?: PropertyType
  /** Choices for `enum` properties. */
  options?: string[]
  description?: string
  readOnly?: boolean
}

export type PropertyEntry =
  | { kind: 'category'; id: string; name: string; collapsed: boolean }
  | { kind: 'property'; id: string; def: PropertyDef }

export const DEFAULT_CATEGORY = 'Misc'

export const propertyName = (def: PropertyDef): string => def.name ?? def.key

export function formatValue(def: PropertyDef, value: unknown): string {
  if (value === null || value === undefined) return ''
  if (def.type === 'boolean') return value ? 'True' : 'False'
  return String(value)
}

/** Parses editor text; `undefined` means invalid. */
export function parseValue(def: PropertyDef, text: string): unknown {
  switch (def.type) {
    case 'number': {
      const n = Number(text)
      return text.trim() !== '' && Number.isFinite(n) ? n : undefined
    }
    case 'boolean':
      return text === 'True'
    default:
      return text
  }
}

const byName = (a: PropertyDef, b: PropertyDef): number => propertyName(a).localeCompare(propertyName(b))

/** Rows in display order for the categorized or alphabetical view. */
export function buildEntries(defs: PropertyDef[], sort: 'categorized' | 'alphabetical', collapsed: ReadonlySet<string>): PropertyEntry[] {
  if (sort === 'alphabetical') return [...defs].sort(byName).map((def) => ({ kind: 'property', id: def.key, def }))
  const groups = new Map<string, PropertyDef[]>()
  for (const def of defs) groups.set(def.category ?? DEFAULT_CATEGORY, [...(groups.get(def.category ?? DEFAULT_CATEGORY) ?? []), def])
  return [...groups.keys()]
    .sort((a, b) => a.localeCompare(b))
    .flatMap((name) => {
      const isCollapsed = collapsed.has(name)
      const head: PropertyEntry = { kind: 'category', id: `cat:${name}`, name, collapsed: isCollapsed }
      const rows: PropertyEntry[] = isCollapsed ? [] : [...(groups.get(name) ?? [])].sort(byName).map((def) => ({ kind: 'property', id: def.key, def }))
      return [head, ...rows]
    })
}
