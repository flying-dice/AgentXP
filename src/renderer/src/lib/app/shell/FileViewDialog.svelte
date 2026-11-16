<script lang="ts">
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import CodeViewer from '../../kit/organisms/CodeViewer.svelte'
  import { languageFromPath } from '$lib/kit/organisms/highlighter'

  interface Props {
    /** Relative path shown in the title bar. */
    path: string
    /** File text; null while loading. */
    text: string | null
    error?: string | null
    onclose?: () => void
  }

  let { path, text, error = null, onclose }: Props = $props()
</script>

<Dialog title="{path} (read-only)" iconName="file-code" width="min(820px, 92vw)" bodyColor="window" {onclose}>
  {#if error}
    <div class="note">{error}</div>
  {:else if text === null}
    <div class="note">Loading…</div>
  {:else}
    <CodeViewer code={text} language={languageFromPath(path)} toolbar maxHeight="60vh" label={path} />
  {/if}
  {#snippet buttons()}
    <DialogButtons buttons={[{ result: 'ok', label: 'Close' }]} onresult={() => onclose?.()} />
  {/snippet}
</Dialog>

<style>
  .note {
    padding: 12px;
    color: var(--w7-text-muted);
  }
</style>
