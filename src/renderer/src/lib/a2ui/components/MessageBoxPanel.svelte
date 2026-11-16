<script lang="ts">
  import Button from '$lib/kit/atoms/Button.svelte'
  import MessageIcon from '$lib/kit/molecules/MessageIcon.svelte'
  import type { MessageIconKind } from '$lib/kit/molecules/MessageIcon'
  import { asArray, asAction, asEnum, asRecord, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()

  const KINDS: Record<string, MessageIconKind> = { info: 'information', warning: 'warning', error: 'error', question: 'question' }
  const kind = $derived(KINDS[asEnum(view.icon, ['info', 'warning', 'error', 'question'], 'info')]!)
  const buttons = $derived(asArray(view.buttons).map((b) => ({ text: asString(asRecord(b).text), action: asAction(asRecord(b).action) })))
  const role = $derived(kind === 'error' || kind === 'warning' ? 'alertdialog' : 'dialog')
</script>

<div class="box" {role} aria-label={asString(view.text)}>
  <div class="body">
    <MessageIcon {kind} />
    <p class="text">{asString(view.text)}</p>
  </div>
  <div class="buttons">
    {#each buttons as b, i (i)}
      <Button isDefault={i === 0} onclick={() => b.action?.()}>{b.text}</Button>
    {/each}
  </div>
</div>

<style>
  .box {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--w7-panel-border);
    background: var(--w7-window);
    font: var(--w7-font);
  }
  .body {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 16px 16px 14px;
  }
  .text {
    flex: 1;
    min-width: 0;
    padding-top: 2px;
    white-space: pre-wrap;
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 10px 12px;
    border-top: 1px solid var(--w7-border-light);
    background: var(--w7-face);
  }
</style>
