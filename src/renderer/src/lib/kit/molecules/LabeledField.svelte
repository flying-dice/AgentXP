<script lang="ts">
  import type { Snippet } from 'svelte'
  import Label from '../atoms/Label.svelte'

  interface Props {
    label: string
    /** Id of the control inside, wired to the label's `for`. */
    for?: string
    /** Label column width in px (consistent across a form). */
    labelWidth?: number
    disabled?: boolean
    class?: string
    children: Snippet
  }

  let { label, for: forId, labelWidth = 90, disabled = false, class: className = '', children }: Props = $props()
</script>

<div class="field {className}" style:--label-width="{labelWidth}px">
  <Label text={label} for={forId} {disabled} autoEllipsis class="lbl" />
  <div class="control">{@render children()}</div>
</div>

<style>
  .field {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 23px;
  }
  .field :global(.lbl) {
    flex: none;
    width: var(--label-width);
  }
  .control {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .control > :global(.w7-textbox),
  .control > :global(.w7-combo) {
    flex: 1;
    min-width: 0;
  }
</style>
