<script lang="ts">
  import { onMount, type Snippet } from 'svelte'
  import { useRadioGroup } from './radioContext'

  interface Props {
    value: string
    label?: string
    disabled?: boolean
    class?: string
    children?: Snippet
  }

  let { value, label, disabled: ownDisabled = false, class: className = '', children }: Props = $props()

  const group = useRadioGroup()
  const disabled = $derived(ownDisabled || group.disabled)
  const checked = $derived(group.value === value)
  const tabbable = $derived(checked || (!group.hasSelection && !disabled))

  onMount(() => group.register(value))
</script>

<!-- Must be rendered inside a RadioButtonGroup. -->
<label class="xp-radio {className}" class:disabled>
  <button
    type="button"
    class="dot"
    role="radio"
    aria-checked={checked}
    tabindex={tabbable ? 0 : -1}
    {disabled}
    onclick={() => group.select(value)}
  >
    {#if checked}<span class="center"></span>{/if}
  </button>
  {#if children || label}
    <span class="text">{#if children}{@render children()}{:else}{label}{/if}</span>
  {/if}
</label>

<style>
  .xp-radio {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 17px;
    color: var(--xp-text);
    cursor: default;
  }
  .xp-radio.disabled {
    color: var(--xp-text-disabled);
  }
  .text {
    padding: 0 1px;
    line-height: 15px;
  }
  .xp-radio .dot {
    flex: none;
    width: 13px;
    height: 13px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #8e8f8f;
    border-radius: 50%;
    background: radial-gradient(circle at 70% 70%, #fff 30%, #e4e4e4 75%, #d2d2d2 100%);
    outline: none;
  }
  .xp-radio:hover:not(.disabled) .dot {
    border-color: var(--xp-btn-hover-border);
    background: radial-gradient(circle at 70% 70%, #fff 20%, #cfeafa 70%, #aedbf3 100%);
  }
  .xp-radio:active:not(.disabled) .dot {
    border-color: var(--xp-btn-active-border);
    background: radial-gradient(circle at 60% 60%, #d6eefb 10%, #8cc8e8 100%);
  }
  .xp-radio.disabled .dot {
    border-color: #bcbcbc;
    background: #f4f4f4;
  }
  .xp-radio:has(.dot:focus-visible) .text {
    outline: var(--xp-focus-outline);
  }
  .center {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #6d8ab3, #1d3a66);
  }
  .disabled .center {
    opacity: 0.4;
  }
</style>
