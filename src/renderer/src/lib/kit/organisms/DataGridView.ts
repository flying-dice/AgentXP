import type { ComboItem } from '../atoms/ComboBox'

export type GridColumnType = 'text' | 'number' | 'checkbox' | 'combo'

export interface GridColumn {
  key: string
  header: string
  /** px, default 100. */
  width?: number
  type?: GridColumnType
  /** Choices for `combo` columns. */
  options?: (string | ComboItem)[]
  readOnly?: boolean
}

export type GridRow = Record<string, unknown>

export interface CellRef {
  row: number
  col: number
}

export const DEFAULT_COLUMN_WIDTH = 100

export function comboItems(options: GridColumn['options'] = []): ComboItem[] {
  return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
}

export function displayValue(column: GridColumn, value: unknown): string {
  if (value === null || value === undefined) return ''
  if (column.type === 'combo') return comboItems(column.options).find((o) => o.value === value)?.label ?? String(value)
  return String(value)
}

/** Parses editor text for a column; `undefined` means invalid input. */
export function parseCellInput(column: GridColumn, text: string): unknown {
  if (column.type !== 'number') return text
  if (text.trim() === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : undefined
}

export function clampCell(cell: CellRef, rows: number, cols: number): CellRef {
  return { row: Math.max(0, Math.min(rows - 1, cell.row)), col: Math.max(0, Math.min(cols - 1, cell.col)) }
}
