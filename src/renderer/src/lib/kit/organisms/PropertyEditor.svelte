<script lang="ts">
  import ComboBox from '../atoms/ComboBox.svelte'
  import TextBox from '../atoms/TextBox.svelte'
  import { formatValue, parseValue, type PropertyDef } from './PropertyGrid'

  interface Props {
    def: PropertyDef
    value: unknown
    oncommit: (value: unknown) => void
    /** Editor is done (Enter/Esc); give focus back to the grid. */
    onexit: () => void
  }

  let { def, value, oncommit, onexit }: Props = $props()

  // The parent re-keys this component when the value changes, so the initial value is the right one.
  // svelte-ignore state_referenced_locally
  let draft = $state(formatValue(def, value))
  let invalid = $state(false)

  const items = $derived(
    (def.type === 'boolean' ? ['True', 'False'] : (def.options ?? [])).map((o) => ({ value: o, label: o }))
  )

  function commit(): boolean {
    const parsed = parseValue(def, draft)
    invalid = parsed === undefined
    if (!invalid && parsed !== value) oncommit(parsed)
    return !invalid
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return
    if (event.key === 'Enter') {
      if (commit()) onexit()
    } else if (event.key === 'Escape') {
      draft = formatValue(def, value)
      invalid = false
      onexit()
    } else return
    event.preventDefault()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="editor" class:invalid {onkeydown} onfocusout={() => commit()}>
  {#if def.type === 'boolean' || def.type === 'enum'}
    <ComboBox
      {items}
      value={draft}
      aria-label={def.name ?? def.key}
      onchange={(v) => {
        draft = v
        commit()
      }}
    />
  {:else}
    <TextBox bind:value={draft} aria-label={def.name ?? def.key} aria-invalid={invalid || undefined} />
  {/if}
</div>

<style>
  .editor {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
  }
  .editor :global(.w7-textbox),
  .editor :global(.w7-combo) {
    flex: 1;
    min-width: 0;
    height: 100%;
  }
  .editor :global(.w7-textbox) {
    padding: 0 3px;
    border-color: transparent;
  }
  .editor.invalid :global(.w7-textbox) {
    border-color: #d33;
    background: #fff4f4;
  }
</style>
