<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import DiffViewer from './DiffViewer.svelte'
  import { sampleNew, sampleOld, sampleUnified } from './stories.samples'

  const { Story } = defineMeta({
    title: 'Organisms/DiffViewer',
    component: DiffViewer,
    args: { oldText: sampleOld, newText: sampleNew, fileName: 'src/auth/redirect.ts', mode: 'unified', context: 3, toolbar: true },
    argTypes: {
      oldText: { control: 'text' },
      newText: { control: 'text' },
      unified: { control: 'text' },
      fileName: { control: 'text' },
      mode: { control: 'inline-radio', options: ['unified', 'split'] },
      context: { control: { type: 'number', min: 0, max: 10 } },
      toolbar: { control: 'boolean' },
      maxHeight: { control: 'text' }
    }
  })
</script>

<Story name="Unified">
  {#snippet template(args)}
    <div style="width:640px;height:340px"><DiffViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="SideBySide" args={{ mode: 'split' }}>
  {#snippet template(args)}
    <div style="width:860px;height:340px"><DiffViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="UnifiedDiffString" args={{ unified: sampleUnified }}>
  {#snippet template(args)}
    <div style="width:700px;height:360px"><DiffViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="NoDifferences" args={{ newText: sampleOld }}>
  {#snippet template(args)}
    <div style="width:520px;height:100px"><DiffViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="NoToolbar" args={{ toolbar: false, context: 1 }}>
  {#snippet template(args)}
    <div style="width:560px;height:240px"><DiffViewer {...args} /></div>
  {/snippet}
</Story>
