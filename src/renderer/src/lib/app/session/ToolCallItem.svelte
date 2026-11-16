<script lang="ts">
  import type { AguiTerminalState, AguiToolCallState } from '@shared/agui-state'
  import ToolCallBody from './ToolCallBody.svelte'
  import ToolCallCard from './ToolCallCard.svelte'
  import type { TranscriptRow } from './transcriptRows'
  import { expandsByDefault, plainToolResult, toolArgument, toolLabel } from './toolSummary'
  import { DENIED_NOTE, FAILED_NOTE, toolStatusView } from './toolStatus'
  import { plainToolTitle } from './toolTitles'
  import { browserNow, browserStep } from './browserSteps'

  interface Props {
    row: Extract<TranscriptRow, { kind: 'tool' }>
    /** The tool call's entry in the AG-UI shared state (may lag behind the message). */
    toolCall?: AguiToolCallState
    terminals: Record<string, AguiTerminalState>
    /** A permission request for this tool call is open. */
    waiting?: boolean
    /** The user denied the request for this tool call. */
    denied?: boolean
    /** "Show in Event Viewer" of a failed step; gets the id of the tool call. */
    onshowevent?: (toolCallId: string) => void
    /** The card belongs to an earlier step (it gets the caption "Earlier step"). */
    earlier?: boolean
  }

  let { row, toolCall, terminals, waiting = false, denied = false, earlier = false, onshowevent }: Props = $props()

  const rawInput = $derived(toolCall?.rawInput ?? row.rawInput)
  const status = $derived(toolStatusView(toolCall?.status, waiting, denied))
  // The agent's own name for the tool ("fs.read_text_file") is replaced by what it does ("Read a file").
  const plainTitle = $derived(plainToolTitle(toolCall?.title ?? row.name) ?? plainToolTitle(row.name))
  // A Browser step names its target and the typed text ("Typed 'Standup' in the search messages box"); a running one says what it does now.
  const browserTitle = $derived(
    status.kind === 'running' ? browserNow(row.name, rawInput) : status.kind === 'failed' ? null : browserStep(row.name, rawInput, row.result)
  )
  const title = $derived(browserTitle ?? plainTitle)
  const argument = $derived(toolArgument(toolCall?.kind, rawInput, toolCall?.locations ?? [], toolCall?.title ?? row.name))
  const result = $derived(row.result ? plainToolResult(row.result) : null)
  const contents = $derived(toolCall?.contents ?? [])
  // Opened by the user, otherwise the kind's default (the Bash card shows its output).
  let userOpen = $state<boolean | null>(null)
  const open = $derived(userOpen ?? expandsByDefault(toolCall?.kind))
</script>

<ToolCallCard
  name={title ?? toolLabel(toolCall?.kind, row.name, rawInput)}
  argument={title && plainToolTitle(argument) ? '' : argument}
  {status}
  note={denied ? DENIED_NOTE : status.kind === 'failed' ? FAILED_NOTE : undefined}
  onshowevent={onshowevent ? () => onshowevent(row.toolCallId) : undefined}
  {earlier}
  expandable={contents.length > 0 || !!row.result}
  {open}
  onopenchange={(value) => (userOpen = value)}
>
  <ToolCallBody {contents} {terminals} {result} running={status.kind === 'running'} />
</ToolCallCard>
