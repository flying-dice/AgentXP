<script lang="ts">
  import MessageBoxHost from './lib/kit/organisms/MessageBoxHost.svelte'
  import DesktopPage from './lib/pages/DesktopPage.svelte'
  import LauncherPage from './lib/pages/LauncherPage.svelte'

  /** `?launcher=1` is the launcher window ("Agent7 Desktop Connection"); every other window is a desktop. */
  const launcher = new URLSearchParams(window.location.search).has('launcher')
</script>

{#if launcher}
  <LauncherPage />
{:else}
  <DesktopPage />
{/if}
<MessageBoxHost />
