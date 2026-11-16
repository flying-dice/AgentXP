<script lang="ts">
  import { tick } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import Splitter from '../atoms/Splitter.svelte'
  import PropertyRow from '../molecules/PropertyRow.svelte'
  import ToolStripButton from '../molecules/ToolStripButton.svelte'
  import PropertyEditor from './PropertyEditor.svelte'
  import ToolStrip from './ToolStrip.svelte'
  import { buildEntries, formatValue, propertyName, type PropertyDef } from './PropertyGrid'

  interface Props {
    properties: PropertyDef[]
    values: Record<string, unknown>
    sort?: 'categorized' | 'alphabetical'
    /** Name column width in px. */
    nameWidth?: number
    /** Key of the selected property. */
    selectedKey?: string | null
    showDescription?: boolean
    onchange?: (key: string, value: unknown) => void
    class?: string
    'aria-label'?: string
  }

  let {
    properties,
    values = $bindable(),
    sort = $bindable('categorized'),
    nameWidth = $bindable(130),
    selectedKey = $bindable(null),
    showDescription = true,
    onchange,
    class: className = '',
    'aria-label': ariaLabel = 'Properties'
  }: Props = $props()

  const uid = $props.id()
  const collapsed = new SvelteSet<string>()
  let body = $state<HTMLElement | null>(null)
  let activeId = $state<string | null>(null)

  const categorized = $derived(sort === 'categorized')
  const entries = $derived(buildEntries(properties, sort, collapsed))
  const activeIndex = $derived(Math.max(0, entries.findIndex((e) => e.id === activeId)))
  const active = $derived(entries[activeIndex])
  const selectedDef = $derived(properties.find((p) => p.key === selectedKey))
  const domId = (id: string): string => `${uid}-${id}`

  function activate(id: string): void {
    activeId = id
    selectedKey = properties.some((p) => p.key === id) ? id : null
    tick().then(() => body?.querySelector(`#${CSS.escape(domId(id))}`)?.scrollIntoView({ block: 'nearest' }))
  }

  function toggleCategory(name: string, open?: boolean): void {
    const isOpen = !collapsed.has(name)
    if (open === isOpen) return
    if (isOpen) collapsed.add(name)
    else collapsed.delete(name)
  }

  function focusEditor(): void {
    tick().then(() => body?.querySelector<HTMLElement>('.pgr.selected input, .pgr.selected [role="combobox"]')?.focus())
  }

  function commit(key: string, value: unknown): void {
    values = { ...values, [key]: value }
    onchange?.(key, value)
  }

  function onkeydown(event: KeyboardEvent): void {
    if (!active || event.ctrlKey || event.altKey || event.defaultPrevented) return
    const go = (i: number): void => activate(entries[Math.max(0, Math.min(entries.length - 1, i))].id)
    switch (event.key) {
      case 'ArrowDown':
        go(activeIndex + 1)
        break
      case 'ArrowUp':
        go(activeIndex - 1)
        break
      case 'Home':
        go(0)
        break
      case 'End':
        go(entries.length - 1)
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        if (active.kind !== 'category') return
        toggleCategory(active.name, event.key === 'ArrowRight')
        break
      case 'Enter':
      case 'F2':
        if (active.kind === 'category') toggleCategory(active.name)
        else if (!active.def.readOnly) focusEditor()
        break
      default:
        return
    }
    event.preventDefault()
  }

  function resizeName(delta: number): void {
    const max = (body?.clientWidth ?? 400) - 50
    nameWidth = Math.max(50, Math.min(max, nameWidth + delta))
  }
</script>

{#snippet azGlyph()}
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <text x="0" y="7" font-size="7.5" font-weight="700" fill="#2f6db5" font-family="Segoe UI, sans-serif">A</text>
    <text x="0" y="15" font-size="7.5" font-weight="700" fill="#2f6db5" font-family="Segoe UI, sans-serif">Z</text>
    <path d="M12 2v10M9.5 9.5L12 13l2.5-3.5" fill="none" stroke="#2f6db5" stroke-width="1.4" />
  </svg>
{/snippet}
{#snippet catGlyph()}
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <g fill="none" stroke="#56606d" stroke-width="1.4"><path d="M2 3h4M2 9h4" /><path d="M8 3h6M8 5.5h6M8 9h6M8 11.5h6" stroke="#8a97a8" /></g>
    <path d="M1.5 2.5v1M1.5 8.5v1" stroke="#c15f3c" stroke-width="1.6" />
  </svg>
{/snippet}

<div class="w7-propgrid {className}">
  <ToolStrip class="pgtools" aria-label="Property grid tools">
    <ToolStripButton glyph={catGlyph} title="Categorized" checked={categorized} onclick={() => (sort = 'categorized')} />
    <ToolStripButton glyph={azGlyph} title="Alphabetical" checked={!categorized} onclick={() => (sort = 'alphabetical')} />
  </ToolStrip>
  <div class="grid w7-scroll" role="treegrid" tabindex="0" aria-label={ariaLabel} aria-activedescendant={active ? domId(active.id) : undefined} bind:this={body} {onkeydown}>
    <div class="content">
      {#each entries as entry (entry.id)}
        {#if entry.kind === 'category'}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            id={domId(entry.id)}
            class="cat"
            class:selected={entry.id === activeId}
            role="row"
            tabindex="-1"
            aria-expanded={!entry.collapsed}
            aria-selected={entry.id === activeId}
            onclick={() => activate(entry.id)}
            ondblclick={() => toggleCategory(entry.name)}
          >
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <span class="box" onclick={(e) => { e.stopPropagation(); toggleCategory(entry.name) }}>
              <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><path d={entry.collapsed ? 'M2 4.5h5M4.5 2v5' : 'M2 4.5h5'} stroke="#000" /></svg>
            </span>
            <span class="catname">{entry.name}</span>
          </div>
        {:else}
          {@const def = entry.def}
          <PropertyRow
            id={domId(entry.id)}
            name={propertyName(def)}
            value={formatValue(def, values[def.key])}
            {nameWidth}
            indent={categorized ? 18 : 4}
            selected={entry.id === selectedKey}
            readOnly={def.readOnly}
            editing={entry.id === selectedKey && !def.readOnly}
            title={def.description}
            onclick={() => activate(entry.id)}
          >
            {#if entry.id === selectedKey && !def.readOnly}
              {#key def.key + String(values[def.key])}
                <PropertyEditor {def} value={values[def.key]} oncommit={(v) => commit(def.key, v)} onexit={() => body?.focus()} />
              {/key}
            {/if}
          </PropertyRow>
        {/if}
      {/each}
      <div class="divider" style:left="{nameWidth - 2}px">
        <Splitter orientation="vertical" step={10} value={nameWidth} min={60} max={400} label="Resize the name column" onresize={resizeName} />
      </div>
    </div>
  </div>
  {#if showDescription}
    <div class="desc" role="note">
      {#if selectedDef}
        <div class="dtitle">{propertyName(selectedDef)}</div>
        <div class="dtext">{selectedDef.description ?? ''}</div>
      {:else if active?.kind === 'category'}
        <div class="dtitle">{active.name}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .w7-propgrid {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    background: var(--w7-face);
    border: 1px solid var(--w7-list-border);
  }
  .w7-propgrid :global(.pgtools) {
    height: 30px;
    border-bottom-color: var(--w7-border-light);
  }
  .grid {
    flex: 1;
    min-height: 0;
    background: var(--w7-window);
    border-top: 1px solid var(--w7-border-light);
    outline: none;
  }
  .content {
    position: relative;
    min-height: 100%;
  }
  .cat {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 21px;
    padding-left: 3px;
    background: var(--w7-face);
    border-bottom: 1px solid #ededed;
    font-weight: 700;
    cursor: default;
  }
  .cat.selected {
    outline: var(--w7-focus-outline);
    outline-offset: -2px;
  }
  .box {
    width: 11px;
    height: 11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #919191;
    background: #fff;
  }
  .box svg {
    margin: -1px 0 0 -1px;
  }
  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    display: flex;
  }
  .divider :global(.w7-splitter),
  .divider :global(.w7-splitter:not(:hover)::before) {
    background: transparent !important;
  }
  .desc {
    flex: none;
    height: 54px;
    padding: 4px 6px;
    overflow: hidden;
    background: var(--w7-face);
    border-top: 1px solid var(--w7-border-light);
  }
  .dtitle {
    font-weight: 700;
  }
  .dtext {
    color: var(--w7-text);
  }
  .w7-propgrid :global(.pgr.selected .editor) {
    background: var(--w7-window);
  }
</style>
