<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import LauncherPage from './LauncherPage.svelte'
  import LauncherStory from './LauncherStory.svelte'
  import { sampleDesktops, thumbnail } from '../app/fakeLauncher'
  import { systemDrive, usbDrive } from '../app/fakeVfs'

  const { Story } = defineMeta({
    title: 'Pages/LauncherPage',
    component: LauncherPage,
    parameters: { layout: 'fullscreen', backgrounds: { disable: true } }
  })

  /** All four run states: running (connected), awaiting approval, idle and error. */
  const everyState = () => [
    ...sampleDesktops(),
    {
      id: 4,
      title: 'Release notes',
      connected: false,
      runState: 'error' as const,
      pendingApprovals: 0,
      chatCount: 2,
      drives: [systemDrive(), usbDrive('E', { id: 3, name: 'docs-site' }), usbDrive('F', { id: 4, name: 'changelog' })],
      thumbnailUrl: thumbnail(20, 2),
      lastUsedAt: '2026-11-15T08:00:00Z',
      createdAt: '2026-11-01T10:00:00Z'
    }
  ]
</script>

<Story name="Default" asChild>
  <LauncherStory selectedId={1} />
</Story>

<Story name="AllStates" asChild>
  <LauncherStory desktops={everyState()} selectedId={2} height={640} />
</Story>

<Story name="ShowOptions" asChild>
  <LauncherStory showOptions selectedId={2} height={680} />
</Story>

<Story name="NewDesktopDialog" asChild>
  <LauncherStory dialog="new" selectedId={1} height={600} />
</Story>

<Story name="RenameDialog" asChild>
  <LauncherStory dialog="rename" selectedId={3} />
</Story>

<Story name="DeleteConfirm" asChild>
  <LauncherStory press="Delete..." selectedId={2} />
</Story>

<Story name="NoDesktopsYet" asChild>
  <LauncherStory empty />
</Story>
