<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { createAppMenus } from '../organisms/MenuStrip.fixtures'
  import ToolStripDropDownButton from './ToolStripDropDownButton.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/ToolStripDropDownButton',
    component: ToolStripDropDownButton,
    args: { text: 'Open', icon: 'open-folder', disabled: false },
    argTypes: { disabled: { control: 'boolean' }, onselect: { action: 'select' } }
  })
</script>

<Story name="Default" args={{ items: createAppMenus()[0].items }} />

<Story name="Disabled" args={{ disabled: true, items: createAppMenus()[0].items }} />

<Story name="IconOnly" args={{ text: undefined, title: 'Edit', icon: 'edit', items: createAppMenus()[1].items }} />
