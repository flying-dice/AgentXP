<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Form from './Form.svelte'
  import Button from '../atoms/Button.svelte'
  import Label from '../atoms/Label.svelte'
  import TextBox from '../atoms/TextBox.svelte'
  import { iconNames } from '../atoms/icons'

  const { Story } = defineMeta({
    title: 'Organisms/Form',
    component: Form,
    parameters: { layout: 'fullscreen' },
    args: {
      title: 'Fix login redirect bug - Claude Code',
      iconName: 'claude',
      active: true,
      windowState: 'Normal',
      frameless: false,
      dialog: false,
      draggable: false,
      closable: true,
      bodyColor: 'face'
    },
    argTypes: {
      title: { control: 'text' },
      iconName: { control: 'select', options: iconNames },
      active: { control: 'boolean' },
      windowState: { control: 'inline-radio', options: ['Normal', 'Maximized'] },
      frameless: { control: 'boolean' },
      dialog: { control: 'boolean' },
      draggable: { control: 'boolean' },
      sizeGrip: { control: 'boolean' },
      closable: { control: 'boolean' },
      bodyColor: { control: 'inline-radio', options: ['face', 'window'] },
      width: { control: 'text' },
      height: { control: 'text' },
      onminimize: { action: 'minimize' },
      onclose: { action: 'close' }
    }
  })
</script>

{#snippet strip(css: string, text: string)}
  <div class="strip" style={css}>{text}</div>
{/snippet}
{#snippet menu()}{@render strip('height:22px;background:var(--xp-menubar-face);border-bottom:1px solid #b4bfcf', 'File   Edit   View   Session   Tools   Help')}{/snippet}
{#snippet toolbar()}{@render strip('height:30px;background:var(--xp-toolbar-face);border-bottom:1px solid #b4bfcf', 'New session   Open folder   Save')}{/snippet}
{#snippet statusbar()}{@render strip('height:24px;background:var(--xp-statusbar-face);border-top:1px solid #a9b6c9', 'Ready')}{/snippet}

{#snippet content()}
  <div class="pad">
    <Label>Message to Claude</Label>
    <TextBox value="Fix the login redirect so deep links survive sign-in" />
    <div class="right"><Button isDefault>Send</Button><Button>Stop</Button></div>
  </div>
{/snippet}

<Story name="Default">
  {#snippet template(args)}
    <div class="stage">
      <Form {...args} width="640px" height="360px" {menu} {toolbar} {statusbar}>{@render content()}</Form>
    </div>
  {/snippet}
</Story>

<Story name="Inactive" args={{ active: false }}>
  {#snippet template(args)}
    <div class="stage">
      <Form {...args} width="640px" height="360px" {menu} {statusbar}>{@render content()}</Form>
    </div>
  {/snippet}
</Story>

<Story name="Maximized" args={{ windowState: 'Maximized' }}>
  {#snippet template(args)}
    <div class="stage small">
      <Form {...args} {menu} {toolbar} {statusbar}>{@render content()}</Form>
    </div>
  {/snippet}
</Story>

<Story name="Dialog" args={{ dialog: true, title: 'Options', iconName: 'options' }}>
  {#snippet template(args)}
    <div class="stage">
      <Form {...args} width="360px" height="180px" sizeGrip={false}>{@render content()}</Form>
    </div>
  {/snippet}
</Story>

<Story name="Frameless" args={{ frameless: true }}>
  {#snippet template(args)}
    <div class="stage">
      <div class="host">
        <Form {...args} {menu} {toolbar} {statusbar}>{@render content()}</Form>
      </div>
      <p class="hint">Only the client chrome; the surrounding border belongs to the real window.</p>
    </div>
  {/snippet}
</Story>

<Story name="WindowBody" args={{ bodyColor: 'window' }}>
  {#snippet template(args)}
    <div class="stage">
      <Form {...args} width="480px" height="240px">{@render content()}</Form>
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
  }
  .stage.small {
    padding: 0;
  }
  .host {
    width: 640px;
    height: 300px;
    border: 1px solid #000;
  }
  .hint {
    color: #fff;
    font-size: 11px;
  }
  .strip {
    flex: none;
    display: flex;
    align-items: center;
    padding: 0 8px;
    box-sizing: border-box;
    white-space: pre;
  }
  .pad {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .right {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 6px;
  }
</style>
