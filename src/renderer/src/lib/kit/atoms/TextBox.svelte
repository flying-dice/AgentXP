<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  interface Props extends Omit<HTMLInputAttributes, 'value' | 'type' | 'readonly'> {
    value?: string
    /** Textarea with Enter-for-newline; never resizable. */
    multiline?: boolean
    /** Mask characters (UseSystemPasswordChar). */
    password?: boolean
    readonly?: boolean
    rows?: number
    ref?: HTMLInputElement | HTMLTextAreaElement | null
  }

  let {
    value = $bindable(''),
    multiline = false,
    password = false,
    readonly = false,
    rows = 3,
    ref = $bindable(null),
    class: className = '',
    ...rest
  }: Props = $props()
</script>

{#if multiline}
  <textarea
    class="xp-textbox multiline {className}"
    bind:this={ref}
    bind:value
    {readonly}
    {rows}
    {...rest as object}
  ></textarea>
{:else}
  <input
    class="xp-textbox {className}"
    bind:this={ref}
    bind:value
    type={password ? 'password' : 'text'}
    {readonly}
    {...rest}
  />
{/if}

<style>
  .xp-textbox {
    height: 21px;
    padding: 2px 3px;
    border: 1px solid var(--w7-input-border);
    border-top-color: var(--w7-input-border-top);
    border-radius: 0;
    background: var(--w7-window);
    color: var(--w7-text);
    font: inherit;
    outline: none;
    user-select: text;
    cursor: text;
  }
  .xp-textbox:hover:not(:disabled) {
    border-color: #3d7bad;
    border-top-color: #3d7bad;
  }
  .xp-textbox:focus {
    border-color: #569de5;
    border-top-color: #569de5;
  }
  .xp-textbox:disabled {
    border-color: var(--w7-border-disabled);
    background: #f4f4f4;
    color: var(--w7-text-disabled);
  }
  .xp-textbox:read-only:not(:disabled) {
    background: var(--w7-face);
  }
  .xp-textbox::placeholder {
    color: #8a8a8a;
  }
  .multiline {
    height: auto;
    resize: none;
    overflow: auto;
    line-height: 17px;
  }
  .multiline::-webkit-scrollbar {
    width: 17px;
    height: 17px;
  }
  .multiline::-webkit-scrollbar-track {
    background: #f0f0f0;
    border-left: 1px solid #e2e2e2;
  }
  .multiline::-webkit-scrollbar-thumb {
    background: linear-gradient(90deg, #f4f4f4, #dcdcdc 50%, #cfcfcf);
    border: 1px solid #979797;
    border-radius: 2px;
  }
  .multiline::-webkit-scrollbar-corner {
    background: #f0f0f0;
  }
</style>
