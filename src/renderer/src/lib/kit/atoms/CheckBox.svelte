<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    checked?: boolean
    /** Three-state "mixed" display (CheckState.Indeterminate). */
    indeterminate?: boolean
    label?: string
    disabled?: boolean
    name?: string
    class?: string
    onchange?: (checked: boolean) => void
    children?: Snippet
  }

  let {
    checked = $bindable(false),
    indeterminate = $bindable(false),
    label,
    disabled = false,
    name,
    class: className = '',
    onchange,
    children
  }: Props = $props()

  function toggle(): void {
    if (disabled) return
    checked = indeterminate ? true : !checked
    indeterminate = false
    onchange?.(checked)
  }
</script>

<label class="xp-check {className}" class:disabled>
  <button
    type="button"
    class="box"
    role="checkbox"
    aria-checked={indeterminate ? 'mixed' : checked}
    {disabled}
    {name}
    onclick={toggle}
  >
    {#if indeterminate}
      <span class="mixed"></span>
    {:else if checked}
      <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
        <path d="M1 4.2l2.4 2.6L8 1.4" fill="none" stroke="#2b4a73" stroke-width="1.8" />
      </svg>
    {/if}
  </button>
  {#if children || label}
    <span class="text">{#if children}{@render children()}{:else}{label}{/if}</span>
  {/if}
</label>

<style>
  .xp-check {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 17px;
    color: var(--w7-text);
    cursor: default;
  }
  .xp-check.disabled {
    color: var(--w7-text-disabled);
  }
  .text {
    padding: 0 1px;
    line-height: 15px;
  }
  .box {
    flex: none;
    width: 13px;
    height: 13px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #8e8f8f;
    border-radius: 2px;
    background: linear-gradient(135deg, #dcdcdc 0%, #f4f4f4 45%, #fff 100%);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    outline: none;
  }
  .xp-check:hover:not(.disabled) .box {
    border-color: var(--w7-btn-hover-border);
    background: linear-gradient(135deg, #c4e5f6 0%, #e4f4fc 50%, #fff 100%);
  }
  .xp-check:active:not(.disabled) .box {
    border-color: var(--w7-btn-active-border);
    background: linear-gradient(135deg, #8cc8e8 0%, #c4e5f6 100%);
  }
  .xp-check.disabled .box {
    border-color: #bcbcbc;
    background: #f4f4f4;
    box-shadow: none;
  }
  .xp-check.disabled svg {
    opacity: 0.4;
  }
  .xp-check:has(.box:focus-visible) .text {
    outline: var(--w7-focus-outline);
  }
  .mixed {
    width: 7px;
    height: 7px;
    background: linear-gradient(135deg, #2b4a73, #5d7ea8);
  }
  .disabled .mixed {
    opacity: 0.4;
  }
</style>
