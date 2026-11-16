<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    name: string
    /** Plain value text, shown when no `children` editor is given. */
    value?: string
    /** Name column width in px. */
    nameWidth?: number
    selected?: boolean
    /** Left padding of the name in px (room for the category expander column). */
    indent?: number
    /** Greyed value (read-only property). */
    readOnly?: boolean
    id?: string
    title?: string
    onclick?: (event: MouseEvent) => void
    /** Show `children` (the value editor) instead of the plain value text. */
    editing?: boolean
    /** Value editor, shown while `editing`. */
    children?: Snippet
  }

  let { name, value = '', nameWidth = 130, selected = false, indent = 18, readOnly = false, editing = false, id, title, onclick, children }: Props = $props()
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div {id} class="pgr" class:selected role="row" tabindex="-1" aria-selected={selected} {onclick}>
  <div class="name" role="rowheader" style:width="{nameWidth}px" style:padding-left="{indent}px" title={title ?? name}>{name}</div>
  <div class="value" class:readonly={readOnly} role="gridcell">
    {#if editing && children}{@render children()}{:else}<span class="vt">{value}</span>{/if}
  </div>
</div>

<style>
  .pgr {
    display: flex;
    align-items: stretch;
    height: 21px;
    border-bottom: 1px solid #ededed;
    background: var(--w7-window);
    cursor: default;
    outline: none;
  }
  .name {
    flex: none;
    display: flex;
    align-items: center;
    padding: 0 3px 0 18px; /* overridden by `indent` */
    border-right: 1px solid #ededed;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .selected .name {
    background: var(--w7-list-select-face);
    color: var(--w7-list-select-text);
  }
  .value {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
  }
  .vt {
    padding: 0 3px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .readonly {
    color: var(--w7-text-disabled);
  }
</style>
