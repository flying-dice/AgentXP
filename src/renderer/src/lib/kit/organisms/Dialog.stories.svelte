<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Dialog from './Dialog.svelte'
  import DialogButtons from '../molecules/DialogButtons.svelte'
  import Button from '../atoms/Button.svelte'
  import CheckBox from '../atoms/CheckBox.svelte'
  import Label from '../atoms/Label.svelte'
  import TextBox from '../atoms/TextBox.svelte'
  import type { DialogResult } from '../molecules/DialogButtons'

  const { Story } = defineMeta({
    title: 'Organisms/Dialog',
    component: Dialog,
    parameters: { layout: 'fullscreen' },
    args: { open: true, title: 'Rename session', iconName: 'session', width: '380px', closable: true, contained: true, bodyColor: 'face' },
    argTypes: {
      open: { control: 'boolean' },
      title: { control: 'text' },
      width: { control: 'text' },
      closable: { control: 'boolean' },
      contained: { control: 'boolean' },
      bodyColor: { control: 'inline-radio', options: ['face', 'window'] },
      onclose: { action: 'close' }
    }
  })

  let result = $state<DialogResult | ''>('')
  let opened = $state(false)
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="stage">
      <Button onclick={() => (opened = true)}>Show dialog...</Button>
      <p class="hint">Last result: {result || 'none'}. The page behind is inert while the dialog is open.</p>
      <Dialog {...args} open={args.open && opened} onclose={() => ((result = 'cancel'), (opened = false))}>
        <div class="body">
          <Label>Session name:</Label>
          <TextBox value="Fix login redirect bug" />
          <CheckBox label="Keep the transcript" checked />
        </div>
        {#snippet buttons()}
          <DialogButtons onresult={(r) => ((result = r), (opened = false))} />
        {/snippet}
      </Dialog>
    </div>
  {/snippet}
</Story>

<Story name="OpenOnLoad">
  {#snippet template(args)}
    <div class="stage">
      <Button>Behind the dialog</Button>
      <Dialog {...args}>
        <div class="body">
          <Label>Session name:</Label>
          <TextBox value="Fix login redirect bug" />
        </div>
        {#snippet buttons()}<DialogButtons />{/snippet}
      </Dialog>
    </div>
  {/snippet}
</Story>

<Story name="NotClosable" args={{ closable: false, title: 'Working' }}>
  {#snippet template(args)}
    <div class="stage">
      <Dialog {...args}>
        <div class="body">Esc and the close box are disabled.</div>
        {#snippet buttons()}<DialogButtons buttons={['ok']} cancelButton="none" />{/snippet}
      </Dialog>
    </div>
  {/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    padding: 24px;
    box-sizing: border-box;
    background: var(--w7-desktop-bg);
    color: #fff;
  }
  .hint {
    font-size: 11px;
  }
  .body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #000;
  }
</style>
