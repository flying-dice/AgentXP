/** Undo and redo: whole-document snapshots (documents are small and immutable between edits). */
import type { DiagramDoc } from './types'

export interface HistoryEntry {
  doc: DiagramDoc
  /** What the step did ("Move", "Add shapes"), for the Undo menu item. */
  label: string
}

export class History {
  private past: HistoryEntry[] = []
  private future: HistoryEntry[] = []

  constructor(private readonly limit = 100) {}

  /** Records the document as it was before a change. */
  push(before: DiagramDoc, label: string): void {
    this.past.push({ doc: before, label })
    if (this.past.length > this.limit) this.past.shift()
    this.future = []
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }
  get canRedo(): boolean {
    return this.future.length > 0
  }
  get undoLabel(): string | null {
    return this.past[this.past.length - 1]?.label ?? null
  }
  get redoLabel(): string | null {
    return this.future[this.future.length - 1]?.label ?? null
  }

  undo(current: DiagramDoc): DiagramDoc | null {
    const entry = this.past.pop()
    if (!entry) return null
    this.future.push({ doc: current, label: entry.label })
    return entry.doc
  }

  redo(current: DiagramDoc): DiagramDoc | null {
    const entry = this.future.pop()
    if (!entry) return null
    this.past.push({ doc: current, label: entry.label })
    return entry.doc
  }

  clear(): void {
    this.past = []
    this.future = []
  }
}
