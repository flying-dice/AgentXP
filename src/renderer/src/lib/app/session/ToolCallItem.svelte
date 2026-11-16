<script lang="ts">
  import type { AguiTerminalState, AguiToolCallState } from '@shared/agui-state'
  import ToolCallBody from './ToolCallBody.svelte'
  import ToolCallCard from './ToolCallCard.svelte'
  import type { TranscriptRow } from './transcriptRows'
  import { expandsByDefault, toolArgument, toolLabel } from './toolSummary'
  import { toolStatusView } from './toolStatus'

  interface Props {
    row: Extract<TranscriptRow, { kind: 'tool' }>
    /** The tool call's entry in the AG-UI shared state (may lag behind the message). */
    toolCall?: AguiToolCallState
    terminals: Record<string, AguiTerminalState>
    /** A permission request for this tool call is open. */
    waiting?: boolean
  }

  let { row, toolCall, terminals, waiting = false }: Props = $props()

  const rawInput = $derived(toolCall?.rawInput ?? row.rawInput)
  const status = $derived(toolStatusView(toolCall?.status, waiting))
  const contents = $derived(toolCall?.contents ?? [])
  // Opened by the user, otherwise the kind's default (the Bash card shows its output).
  let userOpen = $state<boolean | null>(null)
  const open = $derived(userOpen ?? expandsByDefault(toolCall?.kind))
</script>

<ToolCallCard
  name={toolLabel(toolCall?.kind, row.name, rawInput)}
  argument={toolArgument(toolCall?.kind, rawInput, toolCall?.locations ?? [], toolCall?.title ?? row.name)}
  {status}
  expandable={contents.length > 0 || !!row.result}
  {open}
  onopenchange={(value) => (userOpen = value)}
>
  <ToolCallBody {contents} {terminals} result={row.result} running={status.kind === 'running'} />
</ToolCallCard>
