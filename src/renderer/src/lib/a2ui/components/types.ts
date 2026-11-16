import type { ComponentNode } from '@a2ui/web_core/v0_9'
import type { Snippet } from 'svelte'
import type { ViewProps } from '../viewProps'

/** Props every catalog component wrapper receives from `NodeView`. */
export interface A2uiComponentProps {
  node: ComponentNode
  /** Resolved props: bindings unwrapped (+ `set<Name>` writers), actions callable, children as nodes. */
  view: ViewProps
  /** Renders a child node. */
  child: Snippet<[ComponentNode]>
}
