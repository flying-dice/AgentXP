<script lang="ts">
  import { untrack } from 'svelte'
  import type { AppProps } from '../types'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ConsoleView from '../../kit/organisms/ConsoleView.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { useDesktopStores } from '../sessionStores.svelte'
  import { ViewSync } from '../viewSync'
  import { collectTerminals, lastLines, renderTerminal, terminalLabel } from './terminalModel'

  let { window: win, host }: AppProps<'terminal'> = $props()

  // svelte-ignore state_referenced_locally
  const desktop = useDesktopStores(host)
  const stores = $derived(desktop.list)
  const entries = $derived(
    collectTerminals(stores.map((s) => ({ sessionId: s.sessionId, sessionTitle: s.state.session.title || `Chat ${s.sessionId}`, terminals: s.state.terminals })))
  )
  const several = $derived(entries.length > 1)

  /** Key of the shown terminal; null follows the newest one. */
  let chosen = $state<string | null>(null)
  const current = $derived(entries.find((e) => e.key === chosen) ?? entries.at(-1) ?? null)
  const text = $derived(renderTerminal(current))
  const cwd = 'W:\\'

  const sync = new ViewSync<{ terminalId: string | null }>((v) => String(v.terminalId))

  // The agent picks a terminal by its id.
  $effect(() => {
    const id = win.view.terminalId
    if (!sync.isExternal({ terminalId: id })) return
    untrack(() => {
      const found = id === null ? undefined : entries.find((e) => e.terminalId === id)
      if (found) chosen = found.key
    })
  })

  // Report what is on screen (the shell debounces).
  $effect(() => {
    const view = {
      terminalId: current?.terminalId ?? null,
      cwd,
      runningCommand: current?.running ? current.command : null,
      lastLines: current ? lastLines(current.output, 20) : []
    }
    const known = untrack(() => win.view)
    if (
      known.terminalId === view.terminalId &&
      known.cwd === view.cwd &&
      known.runningCommand === view.runningCommand &&
      JSON.stringify(known.lastLines) === JSON.stringify(view.lastLines)
    )
      return
    sync.mark({ terminalId: view.terminalId })
    host.updateView(win.id, { app: 'terminal', ...view })
  })
</script>

<div class="terminal">
  <div class="head">
    <span class="title">Agent7 shell - cmd.exe</span>
    <span class="spring"></span>
    {#if several}
      <span>Terminal:</span>
      <ComboBox
        aria-label="Terminal"
        items={entries.map((e) => ({ value: e.key, label: terminalLabel(e, true) }))}
        value={current?.key ?? ''}
        onchange={(key) => (chosen = key)}
        style="width:260px"
      />
    {/if}
  </div>
  <div class="screen">
    <ConsoleView {text} running={current?.running ?? false} label="Agent7 shell" />
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text="Read-only: the agent is the only user of this shell. You can watch, not type." spring />
    <StatusStripLabel text={current ? (current.running ? 'Running' : `Exit code ${current.exitCode}`) : 'No terminals'} borders={['left']} width={110} />
  </StatusStrip>
</div>

<style>
  .terminal {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 6px;
    background: linear-gradient(#fafcfe, #dce6f4);
    border-bottom: 1px solid #aab7cb;
  }
  .title {
    font-weight: 700;
  }
  .spring {
    flex: 1;
  }
  .screen {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-console-bg);
  }
  .screen :global(.w7-console) {
    flex: 1;
    border: 0;
  }
  .screen :global(.out) {
    font-family: 'Lucida Console', Consolas, 'DejaVu Sans Mono', monospace;
  }
</style>
