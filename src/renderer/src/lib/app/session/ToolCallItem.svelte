<script lang="ts">
  import type { AguiTerminalState, AguiToolCallState } from '@shared/agui-state'
  import ToolCallBody from './ToolCallBody.svelte'
  import ToolCallCard from './ToolCallCard.svelte'
  import type { TranscriptRow } from './transcriptRows'
  import { expandsByDefault, plainToolResult, toolArgument, toolLabel } from './toolSummary'
  import { DENIED_NOTE, FAILED_NOTE, toolStatusView } from './toolStatus'
  import { plainToolTitle } from './toolTitles'
  import { browserNow, browserStep } from './browserSteps'
  import { SHOW_LABELS, showRowOf, toolShowTargets, type ToolShowTarget } from './toolShowTarget'

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
    /** The **Show in...** actions of the row (Code, diff, Terminal, Browser); without it the row has none. */
    onshowtarget?: (target: ToolShowTarget) => void
    /** The chat's working directory: relative paths of the step are relative to it. */
    cwd?: string | null
    /** The card belongs to an earlier step (it gets the caption "Earlier step"). */
    earlier?: boolean
  }

  let { row, toolCall, terminals, waiting = false, denied = false, earlier = false, onshowevent, onshowtarget, cwd = null }: Props = $props()

  const rawInput = $derived(toolCall?.rawInput ?? row.rawInput)
  const status = $derived(toolStatusView(toolCall?.status, waiting, denied))
  // The agent's own name for the tool ("fs.read_text_file") is replaced by what it does ("Read a file").
  const plainTitle = $derived(plainToolTitle(toolCall?.title ?? row.name) ?? plainToolTitle(row.name))
  // A Browser step names its target and the typed text ("Typed 'Standup' in the search messages box"); a running one says what it does now.
  const browserTitle = $derived(
    status.kind === 'running' ? browserNow(row.name, rawInput) : status.kind === 'failed' ? null : browserStep(row.name, rawInput, row.result)
  )
  // A show row says what the operator was shown and why ("Showed you auth.ts:40-62: <note>").
  const showRow = $derived(showRowOf({ title: toolCall?.title ?? row.name, rawInput, result: row.result }))
  const title = $derived(showRow?.title ?? browserTitle ?? plainTitle)
  const argument = $derived(toolArgument(toolCall?.kind, rawInput, toolCall?.locations ?? [], toolCall?.title ?? row.name))
  const result = $derived(row.result ? plainToolResult(row.result) : null)
  const contents = $derived(toolCall?.contents ?? [])
  // Opened by the user, otherwise the kind's default (the Bash card shows its output).
  let userOpen = $state<boolean | null>(null)
  const open = $derived(userOpen ?? expandsByDefault(toolCall?.kind))
  // Work opens nothing by itself: the row says where the step can be seen, and the operator opens it.
  const showActions = $derived(
    onshowtarget
      ? toolShowTargets({ title: toolCall?.title ?? row.name, kind: toolCall?.kind, rawInput, locations: toolCall?.locations ?? [], contents, result: row.result, cwd }).map((target) => ({
          kind: target.kind,
          label: SHOW_LABELS[target.kind],
          run: () => onshowtarget(target)
        })).filter((action) => action.kind !== 'again' || showRow?.again === true)
      : []
  )
</script>

<ToolCallCard
  name={title ?? toolLabel(toolCall?.kind, row.name, rawInput)}
  argument={showRow || (title && plainToolTitle(argument)) ? '' : argument}
  {status}
  note={denied ? DENIED_NOTE : status.kind === 'failed' ? FAILED_NOTE : undefined}
  onshowevent={onshowevent ? () => onshowevent(row.toolCallId) : undefined}
  {showActions}
  {earlier}
  expandable={contents.length > 0 || !!row.result}
  {open}
  onopenchange={(value) => (userOpen = value)}
>
  <ToolCallBody {contents} {terminals} {result} running={status.kind === 'running'} />
</ToolCallCard>
