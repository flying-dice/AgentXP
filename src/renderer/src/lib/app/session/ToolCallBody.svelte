<script lang="ts">
  import type { AguiTerminalState } from '@shared/agui-state'
  import type { ToolCallContentDto } from '@shared/models'
  import ConsoleView from '../../kit/organisms/ConsoleView.svelte'
  import DiffViewer from '../../kit/organisms/DiffViewer.svelte'

  interface Props {
    contents: readonly ToolCallContentDto[]
    terminals: Record<string, AguiTerminalState>
    /** The tool result text (AG-UI tool message) shown when there is no richer content. */
    result?: string | null
    running?: boolean
  }

  let { contents, terminals, result = null, running = false }: Props = $props()

  const textBlocks = $derived(
    contents.flatMap((c) => (c.kind === 'content' && c.block.kind === 'text' ? [c.block.text] : []))
  )
  const rich = $derived(contents.some((c) => c.kind === 'diff' || c.kind === 'terminal'))
  const plain = $derived(rich ? textBlocks : textBlocks.length > 0 ? textBlocks : result ? [result] : [])
</script>

<div class="parts">
{#each contents as part, i (i)}
  {#if part.kind === 'terminal'}
    {@const terminal = terminals[part.terminalId]}
    {#if terminal}
      <ConsoleView
        class="piece"
        text={terminal.output || (running ? '' : '(no output)')}
        {running}
        maxHeight="260px"
        label="Output of {terminal.command}"
      />
      {#if terminal.exitCode !== null && terminal.exitCode !== 0}
        <div class="exit">Process exited with code {terminal.exitCode}</div>
      {/if}
    {/if}
  {:else if part.kind === 'diff'}
    <DiffViewer class="piece" oldText={part.oldText ?? ''} newText={part.newText} fileName={part.path} toolbar={false} maxHeight="260px" />
  {/if}
{/each}
{#each plain as block, i (i)}
  <pre class="text">{block}</pre>
{/each}
</div>

<style>
  .text {
    margin: 0;
    padding: 6px 8px;
    max-height: 260px;
    overflow: auto;
    background: var(--w7-window);
    color: #222;
    font: var(--w7-font-mono);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }
  .exit {
    padding: 2px 8px;
    background: var(--w7-console-bg);
    color: #f0605a;
    font: var(--w7-font-mono);
  }
  .parts :global(.piece) {
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
  }
</style>
