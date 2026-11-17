/** The Code app's Search tab (find in files): pure helpers. The search itself runs in main (`vfs.searchText`). */
import type { CodeSearchView } from '@shared/desktop'
import type { TextMatchDto } from '@shared/search'
import { vpathName, vpathParent, type VPath } from '@shared/vfs'
import type { ComboItem } from '../../kit/atoms/ComboBox'

/** The matches of one file, in the order they were found. */
export interface MatchGroup {
  path: VPath
  name: string
  folder: string
  matches: TextMatchDto[]
}

export function groupMatches(matches: readonly TextMatchDto[]): MatchGroup[] {
  const groups = new Map<VPath, MatchGroup>()
  for (const m of matches) {
    const group = groups.get(m.path) ?? { path: m.path, name: vpathName(m.path), folder: vpathParent(m.path) ?? '', matches: [] }
    group.matches.push(m)
    groups.set(m.path, group)
  }
  return [...groups.values()]
}

/** Characters kept before the match, so the match stays in view in the narrow Search tab. */
export const MATCH_LEAD = 6

/** A match line split around the match, for the bold highlight. A long start is cut to "..." and the last MATCH_LEAD characters. */
export function matchParts(m: Pick<TextMatchDto, 'text' | 'textStart' | 'length'>): { before: string; hit: string; after: string } {
  const start = Math.max(0, Math.min(m.textStart, m.text.length))
  const end = Math.min(m.text.length, start + m.length)
  const lead = m.text.slice(0, start).trimStart()
  return { before: lead.length > MATCH_LEAD ? `...${lead.slice(-MATCH_LEAD)}` : lead, hit: m.text.slice(start, end), after: m.text.slice(end) }
}

/** A new search below `root` with the default options. */
export const emptySearch = (root: VPath): CodeSearchView => ({ query: '', root, regex: false, matchCase: false, include: '' })

/** The Look in list: the project roots, plus the folder the search uses when it is not one of them (an agent's E:\src). */
export function lookInItems(roots: readonly { path: VPath; name: string }[], current: VPath): ComboItem[] {
  const items = roots.map((r) => ({ value: r.path, label: `${r.name} (${r.path})` }))
  return current !== '' && !items.some((i) => i.value.toLowerCase() === current.toLowerCase()) ? [...items, { value: current, label: current }] : items
}

/** Equal searches have equal keys (the view sync and "is this the search on screen"). */
export const searchKey = (search: CodeSearchView | null | undefined): string => JSON.stringify(search ?? null)
