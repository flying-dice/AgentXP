<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import type { ComponentProps } from 'svelte'
  import DialogButtons from './DialogButtons.svelte'
  import type { DialogResult } from './DialogButtons'

  const { Story } = defineMeta({
    title: 'Molecules/DialogButtons',
    component: DialogButtons,
    args: { buttons: ['ok', 'cancel'] },
    argTypes: {
      buttons: { control: 'object' },
      acceptButton: { control: 'select', options: [undefined, 'ok', 'cancel', 'yes', 'no', 'retry', 'abort', 'ignore'] },
      cancelButton: { control: 'select', options: [undefined, 'none', 'ok', 'cancel', 'yes', 'no', 'retry', 'abort', 'ignore'] },
      onresult: { action: 'result' }
    }
  })

  let last = $state<DialogResult | ''>('')
</script>

{#snippet demo(args: ComponentProps<typeof DialogButtons>)}
  <div class="form" tabindex="-1" data-xp-form>
    <p>Focus anywhere in this box and press Enter (AcceptButton) or Esc (CancelButton).</p>
    <input class="field" value="a text box" aria-label="Sample field" />
    <DialogButtons {...args} onresult={(r) => (last = r)} />
    <p class="result">Result: <b>{last || 'none yet'}</b></p>
  </div>
{/snippet}

<Story name="OKCancel">
  {#snippet template(args)}{@render demo(args)}{/snippet}
</Story>

<Story name="YesNoCancel" args={{ buttons: ['yes', 'no', 'cancel'] }}>
  {#snippet template(args)}{@render demo(args)}{/snippet}
</Story>

<Story name="AbortRetryIgnore" args={{ buttons: ['abort', 'retry', 'ignore'], acceptButton: 'retry' }}>
  {#snippet template(args)}{@render demo(args)}{/snippet}
</Story>

<Story name="CustomLabels" args={{ buttons: [{ result: 'ok', label: 'Allow' }, { result: 'cancel', label: 'Deny' }, { result: 'retry', label: 'Always', disabled: true }] }}>
  {#snippet template(args)}{@render demo(args)}{/snippet}
</Story>

<style>
  .form {
    width: 360px;
    padding: 12px;
    background: var(--xp-face);
    border: 1px solid var(--xp-panel-border);
    outline: none;
  }
  p {
    margin: 0 0 8px;
  }
  .field {
    width: 100%;
    margin-bottom: 12px;
    font: inherit;
    border: 1px solid var(--xp-input-border);
    padding: 2px 3px;
  }
  .result {
    margin: 10px 0 0;
  }
</style>
