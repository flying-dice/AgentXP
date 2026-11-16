import type { Snippet } from 'svelte'
import type { IconName } from '../atoms/icons'

export interface TabDef {
  id: string
  title: string
  icon?: IconName
  disabled?: boolean
  /** Tooltip of the tab header. */
  tooltip?: string
  /** `data-testid` of the tab header. */
  testid?: string
}

export interface TabControlProps<T extends TabDef> {
  tabs: T[]
  /** Id of the selected tab. */
  selected?: string
  /** Content of the selected tab. */
  panel: Snippet<[T]>
  class?: string
  'aria-label'?: string
  onchange?: (id: string) => void
}
