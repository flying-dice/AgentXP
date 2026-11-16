<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { iconNames } from '../atoms/icons'
  import TreeNodeRow from './TreeNodeRow.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/TreeNodeRow',
    component: TreeNodeRow,
    args: { text: 'claude-code-win', icon: 'folder', level: 0, hasChildren: true, expanded: false, selected: false, focused: false, disabled: false },
    argTypes: {
      icon: { control: 'select', options: [undefined, ...iconNames] },
      level: { control: { type: 'number', min: 0, max: 6 } },
      hasChildren: { control: 'boolean' },
      expanded: { control: 'boolean' },
      selected: { control: 'boolean' },
      focused: { control: 'boolean' },
      disabled: { control: 'boolean' },
      ontoggle: { action: 'toggle' },
      onclick: { action: 'click' }
    }
  })
</script>

<Story name="Default" />

<Story name="Expanded" args={{ expanded: true }} />

<Story name="Selected" args={{ selected: true, icon: 'session', text: 'Fix login redirect bug', hasChildren: false, level: 2 }} />

<Story name="Focused" args={{ selected: true, focused: true, icon: 'session', text: 'Fix login redirect bug', hasChildren: false, level: 2 }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="States" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div style="width:260px;background:#fff;border:1px solid #898c95;padding:3px 2px">
      <TreeNodeRow text="Workspaces" icon="folder" hasChildren expanded />
      <TreeNodeRow text="claude-code-win" icon="folder" level={1} hasChildren expanded />
      <TreeNodeRow text="Fix login redirect bug" icon="session" level={2} selected focused />
      <TreeNodeRow text="Add parser unit tests" icon="session" level={2} />
      <TreeNodeRow text="dotfiles" icon="folder" level={1} hasChildren />
      <TreeNodeRow text="Locked" icon="lock" level={1} disabled />
      <TreeNodeRow text="Loading..." level={1} loading disabled />
    </div>
    <p style="font-size:11px;color:#555">Hover a label for the hot look; hover a collapsed triangle to see it highlight.</p>
  {/snippet}
</Story>
