<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    checked?: boolean
    /** Three-state "mixed" display (CheckState.Indeterminate). */
    indeterminate?: boolean
    label?: string
    disabled?: boolean
    /** Shows the state but cannot be changed (text stays black, unlike `disabled`). */
    readonly?: boolean
    name?: string
    class?: string
    /** `data-testid` of the box button. */
    testid?: string
    onchange?: (checked: boolean) => void
    children?: Snippet
  }

  let {
    checked = $bindable(false),
    indeterminate = $bindable(false),
    label,
    disabled = false,
    readonly = false,
    name,
    testid,
    class: className = '',
    onchange,
    children
  }: Props = $props()

  function toggle(): void {
    if (disabled || readonly) return
    checked = indeterminate ? true : !checked
    indeterminate = false
    onchange?.(checked)
  }
</script>

<label class="xp-check {className}" class:disabled class:readonly>
  <button
    type="button"
    class="box"
    role="checkbox"
    aria-checked={indeterminate ? 'mixed' : checked}
    aria-readonly={readonly || undefined}
    tabindex={readonly ? -1 : undefined}
    {disabled}
    {name}
    data-testid={testid}
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
    color: var(--xp-text);
    cursor: default;
  }
  .xp-check.disabled {
    color: var(--xp-text-disabled);
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
    background: linear-gradient(135deg, #d6d0c5 0%, #f4f2e8 45%, #fff 100%);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    outline: none;
  }
  .xp-check:hover:not(.disabled):not(.readonly) .box {
    border-color: var(--xp-btn-hover-border);
    background: linear-gradient(135deg, #c4e5f6 0%, #e4f4fc 50%, #fff 100%);
  }
  .xp-check:active:not(.disabled):not(.readonly) .box {
    border-color: var(--xp-btn-active-border);
    background: linear-gradient(135deg, #8cc8e8 0%, #c4e5f6 100%);
  }
  .xp-check.disabled .box {
    border-color: #bcbcbc;
    background: #f4f2e8;
    box-shadow: none;
  }
  .xp-check.disabled svg {
    opacity: 0.4;
  }
  .xp-check:has(.box:focus-visible) .text {
    outline: var(--xp-focus-outline);
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
