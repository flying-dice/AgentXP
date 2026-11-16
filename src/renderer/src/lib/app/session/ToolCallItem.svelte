<script lang="ts">
  import type { AguiTerminalState, AguiToolCallState } from '@shared/agui-state'
  import ToolCallBody from './ToolCallBody.svelte'
  import ToolCallCard from './ToolCallCard.svelte'
  import type { TranscriptRow } from './transcriptRows'
  import { expandsByDefault, plainToolResult, toolArgument, toolLabel } from './toolSummary'
  import { DENIED_NOTE, toolStatusView } from './toolStatus'
  import { plainToolTitle } from './toolTitles'

  interface Props {
    row: Extract<TranscriptRow, { kind: 'tool' }>
    /** The tool call's entry in the AG-UI shared state (may lag behind the message). */
    toolCall?: AguiToolCallState
    terminals: Record<string, AguiTerminalState>
    /** A permission request for this tool call is open. */
    waiting?: boolean
    /** The user denied the request for this tool call. */
    denied?: boolean
    /** The card belongs to an earlier step (it gets the caption "Earlier step"). */
    earlier?: boolean
  }

  let { row, toolCall, terminals, waiting = false, denied = false, earlier = false }: Props = $props()

  const rawInput = $derived(toolCall?.rawInput ?? row.rawInput)
  const status = $derived(toolStatusView(toolCall?.status, waiting, denied))
  // The agent's own name for the tool ("fs.read_text_file") is replaced by what it does ("Read a file").
  const plainTitle = $derived(plainToolTitle(toolCall?.title ?? row.name) ?? plainToolTitle(row.name))
  const argument = $derived(toolArgument(toolCall?.kind, rawInput, toolCall?.locations ?? [], toolCall?.title ?? row.name))
  const result = $derived(row.result ? plainToolResult(row.result) : null)
  const contents = $derived(toolCall?.contents ?? [])
  // Opened by the user, otherwise the kind's default (the Bash card shows its output).
  let userOpen = $state<boolean | null>(null)
  const open = $derived(userOpen ?? expandsByDefault(toolCall?.kind))
</script>

<ToolCallCard
  name={plainTitle ?? toolLabel(toolCall?.kind, row.name, rawInput)}
  argument={plainTitle && plainToolTitle(argument) ? '' : argument}
  {status}
  note={denied ? DENIED_NOTE : undefined}
  {earlier}
  expandable={contents.length > 0 || !!row.result}
  {open}
  onopenchange={(value) => (userOpen = value)}
>
  <ToolCallBody {contents} {terminals} {result} running={status.kind === 'running'} />
</ToolCallCard>
