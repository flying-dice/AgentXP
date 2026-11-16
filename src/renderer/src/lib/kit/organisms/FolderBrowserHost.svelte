<script lang="ts">
  import FolderBrowserDialog from './FolderBrowserDialog.svelte'
  import { folderBrowsers as defaultService, type FolderBrowserService, type PendingFolderBrowser } from './folderBrowser'

  interface Props {
    /** Service to display; defaults to the app-wide one used by `showFolderBrowser`. */
    service?: FolderBrowserService
    contained?: boolean
  }

  let { service = defaultService, contained = false }: Props = $props()

  let current = $state<PendingFolderBrowser | undefined>()
  $effect(() => service.queue.subscribe((items) => (current = items[0])))
</script>

{#if current}
  {@const pending = current}
  {#key pending.id}
    <FolderBrowserDialog {contained} purpose={pending.request.purpose} source={pending.request.source} onresult={(path) => service.settle(pending.id, path)} />
  {/key}
{/if}
