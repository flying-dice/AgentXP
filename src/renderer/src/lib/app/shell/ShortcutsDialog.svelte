<script lang="ts">
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '../../kit/organisms/ListView'
  import { SHORTCUTS } from '../shortcuts'

  interface Props {
    onclose?: () => void
  }

  let { onclose }: Props = $props()

  const columns: ListColumn[] = [
    { key: 'description', header: 'Command' },
    { key: 'label', header: 'Shortcut', width: 120 }
  ]
  const rows: ListRow[] = SHORTCUTS.map((s) => ({ id: `${s.command}:${s.label}`, description: s.description, label: s.label }))
</script>

<Dialog title="Keyboard Shortcuts" iconName="help" width="440px" {onclose}>
  <div class="list"><ListView {columns} {rows} aria-label="Keyboard shortcuts" /></div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok']} onresult={() => onclose?.()} />
  {/snippet}
</Dialog>

<style>
  .list {
    height: 320px;
  }
</style>
