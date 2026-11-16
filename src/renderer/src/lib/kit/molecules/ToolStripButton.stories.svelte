<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { iconNames } from '../atoms/icons'
  import ToolStripButton from './ToolStripButton.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/ToolStripButton',
    component: ToolStripButton,
    args: { icon: 'new', text: 'New session', disabled: false },
    argTypes: {
      icon: { control: 'select', options: [undefined, ...iconNames] },
      text: { control: 'text' },
      disabled: { control: 'boolean' },
      checked: { control: 'boolean' },
      checkOnClick: { control: 'boolean' },
      onclick: { action: 'click' }
    }
  })
</script>

<Story name="Default" />

<Story name="IconOnly" args={{ text: undefined, title: 'Save', icon: 'save' }} />

<Story name="Disabled" args={{ disabled: true, icon: 'undo', text: 'Undo edit' }} />

<Story name="Checked" args={{ checked: true, checkOnClick: true, icon: 'tasks', text: 'Tasks' }} />

<Story name="AllStates" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="display:flex;gap:4px;align-items:center">
      <ToolStripButton icon="open-folder" text="Normal" />
      <ToolStripButton icon="open-folder" text="Checked" checked />
      <ToolStripButton icon="open-folder" text="Disabled" disabled />
      <ToolStripButton icon="options" title="Icon only" />
    </div>
    <p style="font-size:11px;color:#555">Hover, press and Tab to see the other states.</p>
  {/snippet}
</Story>
