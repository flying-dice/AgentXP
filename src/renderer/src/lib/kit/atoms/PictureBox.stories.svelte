<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import PictureBox from './PictureBox.svelte'

  const sample =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='40'><rect width='64' height='40' fill='#3d82d4'/><circle cx='20' cy='14' r='7' fill='#ffe27a'/><path d='M0 40 24 20 40 32 52 24 64 40z' fill='#2d7a2d'/></svg>"
    )

  const { Story } = defineMeta({
    title: 'Atoms/PictureBox',
    component: PictureBox,
    argTypes: {
      sizeMode: {
        control: 'select',
        options: ['Normal', 'StretchImage', 'Zoom', 'CenterImage', 'AutoSize']
      },
      borderStyle: { control: 'inline-radio', options: ['None', 'FixedSingle', 'Fixed3D'] },
      width: { control: 'number' },
      height: { control: 'number' },
      src: { control: 'text' }
    },
    args: { src: sample, alt: 'sample', sizeMode: 'Normal', borderStyle: 'FixedSingle', width: 100, height: 100 }
  })
</script>

<Story name="Default" />

<Story name="Size modes">
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    {#each ['Normal', 'StretchImage', 'Zoom', 'CenterImage', 'AutoSize'] as const as m}
      <div style="text-align:center">
        <PictureBox src={sample} alt={m} sizeMode={m} borderStyle="FixedSingle" width={100} height={100} />
        <div>{m}</div>
      </div>
    {/each}
  </div>
</Story>

<Story name="Border styles">
  <div style="display:flex;gap:12px">
    {#each ['None', 'FixedSingle', 'Fixed3D'] as const as b}
      <PictureBox src={sample} borderStyle={b} sizeMode="Zoom" width={90} height={60} />
    {/each}
  </div>
</Story>

<Story name="Empty" args={{ src: '' }} />
