<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Spinner from './Spinner.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/Spinner',
    component: Spinner,
    argTypes: {
      variant: { control: 'inline-radio', options: ['ring', 'aero'] },
      size: { control: { type: 'range', min: 12, max: 96, step: 2 } }
    },
    args: { variant: 'ring', size: 14 }
  })
</script>

<Story name="Default" />
<Story name="Aero" args={{ variant: 'aero', size: 32 }} />

<Story name="Sizes">
  <div style="display:flex;gap:16px;align-items:center">
    {#each [14, 24, 32, 48] as s}
      <Spinner size={s} />
      <Spinner variant="aero" size={s} />
    {/each}
  </div>
</Story>

<Story name="In status line">
  <div style="display:flex;gap:6px;align-items:center"><Spinner /> Connecting to agent...</div>
</Story>
