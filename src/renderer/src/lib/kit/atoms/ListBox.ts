export type SelectionMode = 'One' | 'MultiSimple' | 'MultiExtended'

export interface ListBoxItem<T = string> {
  value: T
  label: string
  disabled?: boolean
}

export interface ClickModifiers {
  ctrl: boolean
  shift: boolean
}

/** Next selected values after the item at `index` is clicked (or reached by keyboard with modifiers). */
export function applySelection<T>(
  mode: SelectionMode,
  items: ListBoxItem<T>[],
  selected: T[],
  anchor: number,
  index: number,
  mods: ClickModifiers
): T[] {
  const item = items[index]
  if (!item || item.disabled) return selected
  if (mode === 'One') return [item.value]
  const has = selected.includes(item.value)
  if (mode === 'MultiSimple') {
    return has ? selected.filter((v) => v !== item.value) : [...selected, item.value]
  }
  if (mods.shift && anchor >= 0) {
    const [from, to] = anchor < index ? [anchor, index] : [index, anchor]
    const range = items.slice(from, to + 1).filter((i) => !i.disabled).map((i) => i.value)
    return mods.ctrl ? [...new Set([...selected, ...range])] : range
  }
  if (mods.ctrl) return has ? selected.filter((v) => v !== item.value) : [...selected, item.value]
  return [item.value]
}

/** Nearest enabled index starting at `from` and moving by `dir`; stays put when none. */
export function nextEnabled<T>(items: ListBoxItem<T>[], from: number, dir: 1 | -1): number {
  for (let i = from + dir; i >= 0 && i < items.length; i += dir) {
    if (!items[i].disabled) return i
  }
  return from
}
