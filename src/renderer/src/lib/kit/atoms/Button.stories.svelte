<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Button from './Button.svelte'
  import { iconNames } from './icons'

  const { Story } = defineMeta({
    title: 'Atoms/Button',
    component: Button,
    args: { variant: 'default', isDefault: false, disabled: false, type: 'button' },
    argTypes: {
      variant: { control: 'inline-radio', options: ['default', 'flat'] },
      isDefault: { control: 'boolean' },
      disabled: { control: 'boolean' },
      icon: { control: 'select', options: [undefined, ...iconNames] },
      type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
      onclick: { action: 'click' }
    }
  })
</script>

<Story name="Default">
  {#snippet template(args)}
    <Button {...args}>OK</Button>
  {/snippet}
</Story>

<Story name="AcceptButton" args={{ isDefault: true }}>
  {#snippet template(args)}
    <div class="row">
      <Button {...args}>OK</Button>
      <Button>Cancel</Button>
    </div>
  {/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
  {#snippet template(args)}
    <Button {...args}>Disabled</Button>
  {/snippet}
</Story>

<Story name="WithIcon" args={{ icon: 'folder' }}>
  {#snippet template(args)}
    <div class="row">
      <Button {...args}>Browse...</Button>
      <Button icon="attach">Attach...</Button>
      <Button icon="stop" disabled>Stop</Button>
    </div>
  {/snippet}
</Story>

<Story name="Flat" args={{ variant: 'flat' }}>
  {#snippet template(args)}
    <div class="row">
      <Button {...args}>Flat</Button>
      <Button {...args} isDefault>Default</Button>
      <Button {...args} disabled>Disabled</Button>
    </div>
  {/snippet}
</Story>

<Story name="AllStates" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div class="row">
      <Button>Normal</Button>
      <Button isDefault>Default</Button>
      <Button disabled>Disabled</Button>
      <Button variant="flat">Flat</Button>
    </div>
    <p class="hint">Hover, press and Tab to see the other states (hot, pushed, dotted focus).</p>
  {/snippet}
</Story>

<style>
  .row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .hint {
    font-size: 11px;
    color: #555;
  }
</style>
