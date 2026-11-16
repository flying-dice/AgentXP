<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import type { ComponentProps } from 'svelte'
  import MessageBox from './MessageBox.svelte'
  import MessageBoxHost from './MessageBoxHost.svelte'
  import Button from '../atoms/Button.svelte'
  import { showMessageBox } from './messageBox'
  import type { DialogResult } from '../molecules/DialogButtons'

  const { Story } = defineMeta({
    title: 'Organisms/MessageBox',
    component: MessageBox,
    parameters: { layout: 'fullscreen' },
    args: {
      open: true,
      text: 'Do you want to save changes to Fix login redirect bug?',
      caption: 'Claude Code',
      buttons: 'YesNoCancel',
      icon: 'warning',
      defaultButton: 0,
      contained: true
    },
    argTypes: {
      text: { control: 'text' },
      caption: { control: 'text' },
      buttons: { control: 'select', options: ['OK', 'OKCancel', 'YesNo', 'YesNoCancel', 'RetryCancel', 'AbortRetryIgnore'] },
      icon: { control: 'select', options: ['none', 'information', 'warning', 'error', 'question', 'shield'] },
      defaultButton: { control: { type: 'number', min: 0, max: 2 } },
      open: { control: 'boolean' },
      onresult: { action: 'result' }
    }
  })

  let answer = $state('')
  const ask = async (): Promise<void> => {
    const first: DialogResult = await showMessageBox({
      text: 'Allow Claude to delete 3 files?',
      caption: 'Permission required',
      buttons: 'YesNo',
      icon: 'shield'
    })
    if (first === 'no') {
      answer = 'no'
      return
    }
    const second = await showMessageBox({ text: 'Delete failed: file is in use.', caption: 'Claude Code', buttons: 'AbortRetryIgnore', icon: 'error' })
    answer = `${first}, then ${second}`
  }
</script>

{#snippet stage(args: ComponentProps<typeof MessageBox>)}
  <div class="stage"><MessageBox {...args} /></div>
{/snippet}

<Story name="Default">
  {#snippet template(args)}{@render stage(args)}{/snippet}
</Story>

<Story name="Information" args={{ icon: 'information', buttons: 'OK', text: 'Session saved to C:\\Users\\jonathan\\transcripts\\login.md.' }}>
  {#snippet template(args)}{@render stage(args)}{/snippet}
</Story>

<Story name="Error" args={{ icon: 'error', buttons: 'RetryCancel', text: 'The agent process exited unexpectedly (code 1).' }}>
  {#snippet template(args)}{@render stage(args)}{/snippet}
</Story>

<Story name="Question" args={{ icon: 'question', buttons: 'YesNo', text: 'Discard the pending changes?' }}>
  {#snippet template(args)}{@render stage(args)}{/snippet}
</Story>

<Story name="Shield" args={{ icon: 'shield', buttons: 'OKCancel', text: 'Claude wants to run: rm -rf node_modules' }}>
  {#snippet template(args)}{@render stage(args)}{/snippet}
</Story>

<Story name="AbortRetryIgnore" args={{ icon: 'error', buttons: 'AbortRetryIgnore', defaultButton: 1, text: 'Could not write src\\auth\\redirect.ts.' }}>
  {#snippet template(args)}{@render stage(args)}{/snippet}
</Story>

<Story name="PromiseHelper" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div class="stage">
      <Button onclick={ask}>await showMessageBox(...)</Button>
      <p class="hint">Result: {answer || 'none yet'}</p>
      <MessageBoxHost contained />
    </div>
  {/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    padding: 24px;
    box-sizing: border-box;
    background: var(--xp-desktop-bg);
    color: #fff;
  }
  .hint {
    font-size: 11px;
  }
</style>
