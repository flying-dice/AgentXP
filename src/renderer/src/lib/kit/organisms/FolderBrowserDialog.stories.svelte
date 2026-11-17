<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { createFakeFs } from '../../app/fakeFs'
  import FolderBrowserDialog from './FolderBrowserDialog.svelte'

  const { Story } = defineMeta({
    title: 'Organisms/FolderBrowserDialog',
    component: FolderBrowserDialog,
    parameters: { layout: 'fullscreen' },
    args: { purpose: 'desktop', title: 'Browse For Folder', contained: true },
    argTypes: {
      purpose: { control: 'inline-radio', options: ['desktop', 'plug-in'] },
      title: { control: 'text' },
      contained: { control: 'boolean' },
      onresult: { action: 'result' }
    }
  })

  const source = createFakeFs()
  const never = { browse: () => new Promise<never>(() => {}), makeFolder: async () => '' }
</script>

<Story name="Default">
  {#snippet template(args)}
    <div class="stage"><FolderBrowserDialog {...args} {source} /></div>
  {/snippet}
</Story>

<Story name="Plug in a project" args={{ purpose: 'plug-in' }}>
  {#snippet template(args)}
    <div class="stage"><FolderBrowserDialog {...args} {source} /></div>
  {/snippet}
</Story>

<Story name="Loading" parameters={{ controls: { disable: true } }}>
  {#snippet template(args)}
    <div class="stage"><FolderBrowserDialog {...args} source={never} /></div>
  {/snippet}
</Story>

<style>
  .stage {
    position: relative;
    height: 100vh;
    background: var(--xp-desktop-bg);
  }
</style>
