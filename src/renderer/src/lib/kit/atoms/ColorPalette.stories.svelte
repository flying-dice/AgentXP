<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ColorPalette from './ColorPalette.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/ColorPalette',
    component: ColorPalette,
    args: { value: '#3366ff', allowNone: false, allowCustom: true },
    argTypes: { allowNone: { control: 'boolean' }, allowCustom: { control: 'boolean' }, onpick: { action: 'pick' } }
  })
</script>

<Story name="Default" />

<Story name="WithNoColor" args={{ allowNone: true, noneLabel: 'No Fill', value: 'none' }} />

<Story name="WithRecentColors" args={{ recent: ['#dbe8f8', '#4a78b5', '#f5c36b'], value: '#4a78b5' }} />
