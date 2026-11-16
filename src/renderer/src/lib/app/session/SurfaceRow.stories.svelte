<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { fn } from 'storybook/test'
  import { surfaceRowModel } from './surfaceRow'
  import SurfaceRow from './SurfaceRow.svelte'
  import { testResults } from '../../a2ui/A2uiSurface.fixtures'

  const surface = (target: 'inline' | 'sidebar' | 'window', hidden = false) => ({ surfaceId: 'tests', target, hidden, messages: testResults })

  const { Story } = defineMeta({
    title: 'App/Session/SurfaceRow',
    component: SurfaceRow,
    args: { model: surfaceRowModel(surface('window'), true), onopen: fn(), onclose: fn(), ondelete: fn(), onmove: fn() }
  })
</script>

<Story name="WindowOpen">
  {#snippet template(args)}<div style="width:520px;padding:8px;background:#fff"><SurfaceRow {...args} /></div>{/snippet}
</Story>

<Story name="WindowClosed" args={{ model: surfaceRowModel(surface('window'), false) }}>
  {#snippet template(args)}<div style="width:520px;padding:8px;background:#fff"><SurfaceRow {...args} /></div>{/snippet}
</Story>

<Story name="SidebarOpen" args={{ model: surfaceRowModel(surface('sidebar'), false) }}>
  {#snippet template(args)}<div style="width:520px;padding:8px;background:#fff"><SurfaceRow {...args} /></div>{/snippet}
</Story>

<Story name="SidebarClosed" args={{ model: surfaceRowModel(surface('sidebar', true), false) }}>
  {#snippet template(args)}<div style="width:520px;padding:8px;background:#fff"><SurfaceRow {...args} /></div>{/snippet}
</Story>

<Story name="InlineToolbar" args={{ model: surfaceRowModel(surface('inline'), false) }}>
  {#snippet template(args)}<div style="width:520px;padding:8px;background:#fff"><SurfaceRow {...args} /></div>{/snippet}
</Story>
