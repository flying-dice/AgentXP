<script lang="ts">
  /** The tools of one MCP server, each with its own switch: a tool that is off is hidden from agents. */
  import type { McpServerDto } from '@shared/teams'
  import CheckedListBox from '../../kit/atoms/CheckedListBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'

  interface Props {
    server: McpServerDto
    /** Called for every switch the user flips; the page saves it at once. */
    ontoggle?: (tool: string, enabled: boolean) => void
    onclose?: () => void
    contained?: boolean
  }

  let { server, ontoggle, onclose, contained = false }: Props = $props()

  // svelte-ignore state_referenced_locally
  let checked = $state<string[]>(server.tools.filter((t) => t.enabled).map((t) => t.name))
  const items = $derived(server.tools.map((t) => ({ value: t.name, label: t.description ? `${t.name} - ${t.description}` : t.name, title: t.description })))
</script>

<Dialog testid="mcp-tools-dialog" title="Tools of {server.name}" iconName="options" width="460px" {contained} {onclose}>
  <p class="lead">Tools that are ticked are offered to agents. Untick a tool to hide it.</p>
  <CheckedListBox testid="mcp-tools-list" {items} bind:checked width="100%" height={200} label="Tools of {server.name}" onitemcheck={(tool, on) => ontoggle?.(String(tool), on)} />
  {#snippet buttons()}
    <DialogButtons buttons={['ok']} onresult={() => onclose?.()} />
  {/snippet}
</Dialog>

<style>
  .lead {
    margin: 0 0 8px;
  }
</style>
