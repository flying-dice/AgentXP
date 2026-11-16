import { iconNames, type IconName } from '../../kit/atoms/icons'
import { asArray, asRecord, asString } from '../viewProps'

export interface OptionItem {
  value: string
  label: string
}

/** Catalog `Option`s (a string, or `{ value, label? }`) as kit list items. */
export function toOptions(value: unknown): OptionItem[] {
  return asArray(value).map((o) => {
    if (typeof o === 'object' && o !== null) {
      const r = asRecord(o)
      const v = asString(r.value)
      return { value: v, label: asString(r.label, v) }
    }
    return { value: asString(o), label: asString(o) }
  })
}

/** A kit icon name, or undefined for names the icon set does not know. */
export function toIcon(value: unknown): IconName | undefined {
  return typeof value === 'string' && (iconNames as readonly string[]).includes(value) ? (value as IconName) : undefined
}
