<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteMap, SvelteSet } from 'svelte/reactivity'
  import TreeNodeRow from '../molecules/TreeNodeRow.svelte'
  import { flatten, initiallyExpanded, type FlatNode, type TreeNodeData } from './TreeView'

  interface Props {
    nodes: TreeNodeData[]
    /** Id of the selected node. */
    selected?: string | null
    /** Ids of the expanded nodes. */
    expanded?: Set<string>
    /** Draw dotted connector lines instead of relying on the triangles alone. */
    showLines?: boolean
    /** Called when a node whose children are not loaded is expanded; resolves with its children. */
    onexpand?: (node: TreeNodeData) => Promise<TreeNodeData[] | void>
    onselect?: (node: TreeNodeData) => void
    /** Enter or double click. */
    onactivate?: (node: TreeNodeData) => void
    oncontextmenu?: (node: TreeNodeData, event: MouseEvent) => void
    class?: string
    'aria-label'?: string
    /** `data-testid` of the tree. */
    testid?: string
  }

  let {
    nodes,
    selected = $bindable(null),
    expanded = $bindable(new Set<string>()),
    showLines = false,
    onexpand,
    onselect,
    onactivate,
    oncontextmenu,
    class: className = '',
    'aria-label': ariaLabel = 'Tree',
    testid
  }: Props = $props()

  const uid = $props.id()
  const loaded = new SvelteMap<string, TreeNodeData[]>()
  const loading = new SvelteSet<string>()

  let root = $state<HTMLElement | null>(null)
  let focused = $state(false)
  let seeded = false

  const childrenOf = (node: TreeNodeData): TreeNodeData[] | undefined => node.children ?? loaded.get(node.id)
  const rows = $derived(flatten(nodes, { expanded, childrenOf, isLoading: (n) => loading.has(n.id) }))
  const navRows = $derived(rows.filter((r) => !r.placeholder))
  const activeIndex = $derived(Math.max(0, navRows.findIndex((r) => r.node.id === selected)))
  const active = $derived(navRows[activeIndex])
  const domId = (id: string): string => `${uid}-${id}`

  $effect.pre(() => {
    if (seeded) return
    seeded = true
    const seeds = initiallyExpanded(untrack(() => nodes)).filter((id) => !expanded.has(id))
    if (seeds.length) expanded = new Set([...expanded, ...seeds])
  })

  async function load(node: TreeNodeData): Promise<void> {
    loading.add(node.id)
    try {
      loaded.set(node.id, (await onexpand?.(node)) ?? [])
    } catch {
      loaded.set(node.id, [])
    } finally {
      loading.delete(node.id)
    }
  }

  // Fetch children of expanded lazy nodes (also those expanded through `bind:expanded`).
  $effect(() => {
    if (!onexpand) return
    for (const row of rows) {
      const n = row.node
      if (row.expanded && !n.children && !loaded.has(n.id) && !loading.has(n.id)) untrack(() => void load(n))
    }
  })

  function setExpanded(id: string, open: boolean): void {
    if (expanded.has(id) === open) return
    const next = new Set(expanded)
    if (open) next.add(id)
    else next.delete(id)
    expanded = next
  }

  function select(row: FlatNode): void {
    if (row.node.disabled) return
    if (selected !== row.node.id) {
      selected = row.node.id
      onselect?.(row.node)
    }
  }

  function selectIndex(i: number): void {
    const row = navRows[Math.max(0, Math.min(navRows.length - 1, i))]
    if (row) select(row)
  }

  let buffer = ''
  let bufferTimer: ReturnType<typeof setTimeout> | undefined

  function typeAhead(key: string): void {
    clearTimeout(bufferTimer)
    buffer += key.toLowerCase()
    bufferTimer = setTimeout(() => (buffer = ''), 800)
    const start = activeIndex + (buffer.length > 1 ? 0 : 1)
    for (let k = 0; k < navRows.length; k++) {
      const i = (start + k) % navRows.length
      if (navRows[i].node.text.toLowerCase().startsWith(buffer)) return selectIndex(i)
    }
  }

  function onkeydown(event: KeyboardEvent): void {
    if (!active || event.ctrlKey || event.altKey || event.metaKey) return
    // Any key but a letter ends the word typed so far (type-ahead starts anew after Right, Down, ...).
    if (event.key.length !== 1) buffer = ''
    switch (event.key) {
      case 'ArrowDown':
        selectIndex(activeIndex + 1)
        break
      case 'ArrowUp':
        selectIndex(activeIndex - 1)
        break
      case 'PageDown':
        selectIndex(activeIndex + 10)
        break
      case 'PageUp':
        selectIndex(activeIndex - 10)
        break
      case 'Home':
        selectIndex(0)
        break
      case 'End':
        selectIndex(navRows.length - 1)
        break
      case 'ArrowRight':
        if (!active.hasChildren) break
        if (!active.expanded) setExpanded(active.node.id, true)
        else selectIndex(activeIndex + 1)
        break
      case 'ArrowLeft':
        if (active.expanded) setExpanded(active.node.id, false)
        else if (active.parentId !== null) selectIndex(navRows.findIndex((r) => r.node.id === active.parentId))
        break
      case 'Enter':
        if (active.hasChildren) setExpanded(active.node.id, !active.expanded)
        onactivate?.(active.node)
        break
      default:
        if (event.key.length !== 1 || event.key === ' ') return
        typeAhead(event.key)
    }
    event.preventDefault()
  }

  $effect(() => {
    if (!selected) return
    root?.querySelector(`#${CSS.escape(domId(selected))}`)?.scrollIntoView({ block: 'nearest' })
  })

  $effect(() => () => clearTimeout(bufferTimer))
</script>

<div
  bind:this={root}
  class="w7-tree w7-scroll {className}"
  data-testid={testid}
  role="tree"
  tabindex="0"
  aria-label={ariaLabel}
  aria-activedescendant={active ? domId(active.node.id) : undefined}
  onfocus={() => (focused = true)}
  onblur={() => (focused = false)}
  {onkeydown}
>
  {#each rows as row (row.node.id)}
    <TreeNodeRow
      id={domId(row.node.id)}
      testid={row.node.testid}
      text={row.node.text}
      icon={row.node.icon}
      level={row.level}
      hasChildren={row.hasChildren}
      expanded={row.expanded}
      selected={row.node.id === selected}
      focused={focused && row.node.id === active?.node.id}
      disabled={row.node.disabled}
      bold={row.node.bold}
      badge={row.node.badge}
      title={row.node.title}
      attrs={row.node.attrs}
      tone={row.node.tone}
      strike={row.node.strike}
      dot={row.node.dot}
      marker={row.node.marker}
      loading={loading.has(row.node.id)}
      lines={showLines ? { ancestors: row.ancestors, last: row.last } : undefined}
      ariaSetSize={row.setSize}
      ariaPosInSet={row.posInSet}
      ontoggle={() => setExpanded(row.node.id, !row.expanded)}
      onclick={() => select(row)}
      ondblclick={() => {
        if (row.placeholder) return
        if (row.hasChildren) setExpanded(row.node.id, !row.expanded)
        onactivate?.(row.node)
      }}
      oncontextmenu={(e) => {
        select(row)
        oncontextmenu?.(row.node, e)
      }}
    />
  {/each}
</div>

<style>
  .w7-tree {
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 3px 2px;
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
    outline: none;
  }
</style>
