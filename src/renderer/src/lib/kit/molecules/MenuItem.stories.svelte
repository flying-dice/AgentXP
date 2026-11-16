<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import MenuItem from './MenuItem.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/MenuItem',
    component: MenuItem,
    args: { hot: false, showMnemonic: false, expanded: false },
    argTypes: {
      hot: { control: 'boolean' },
      showMnemonic: { control: 'boolean' },
      expanded: { control: 'boolean' },
      onclick: { action: 'click' }
    }
  })
</script>

<Story name="Default" args={{ item: { label: '&Open Folder...', icon: 'open-folder', shortcut: 'Ctrl+O' } }} />

<Story name="Hot" args={{ hot: true, item: { label: '&Save', icon: 'save', shortcut: 'Ctrl+S' } }} />

<Story name="Disabled" args={{ item: { label: '&Undo edit', icon: 'undo', shortcut: 'Ctrl+Z', disabled: true } }} />

<Story name="Mnemonic" args={{ showMnemonic: true, item: { label: '&Paste', icon: 'paste' } }} />

<Story name="AllVariants" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div class="menu">
      <MenuItem item={{ label: 'Plain item' }} />
      <MenuItem item={{ label: 'With icon', icon: 'new', shortcut: 'Ctrl+N' }} />
      <MenuItem item={{ label: 'Hot item', icon: 'copy', shortcut: 'Ctrl+C' }} hot />
      <MenuItem item={{ separator: true }} />
      <MenuItem item={{ label: 'Checked', checked: true }} />
      <MenuItem item={{ label: 'Unchecked', checked: false }} />
      <MenuItem item={{ label: 'Radio selected', radio: true, checked: true }} />
      <MenuItem item={{ label: 'Radio other', radio: true, checked: false }} />
      <MenuItem item={{ separator: true }} />
      <MenuItem item={{ label: 'Submenu', items: [{ label: 'x' }] }} />
      <MenuItem item={{ label: 'Disabled', icon: 'delete', disabled: true }} />
      <MenuItem item={{ label: 'Disabled with submenu', items: [{ label: 'x' }], disabled: true }} />
    </div>
  {/snippet}
</Story>

<style>
  .menu {
    width: 260px;
    padding: 2px;
    background: var(--w7-menu-face);
    border: 1px solid var(--w7-menu-border);
    box-shadow: var(--w7-shadow-popup);
  }
</style>
