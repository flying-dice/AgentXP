<script lang="ts">
  import Icon from '../../kit/atoms/Icon.svelte'
  import type { IconName } from '../../kit/atoms/icons'

  interface Props {
    /** At least one folder is registered (the "new session" command makes sense). */
    hasFolders?: boolean
    onopenfolder?: () => void
    onnewsession?: () => void
    onaddagent?: () => void
  }

  let { hasFolders = false, onopenfolder, onnewsession, onaddagent }: Props = $props()

  interface Command {
    id: string
    icon: IconName
    title: string
    text: string
    run?: () => void
  }

  const commands = $derived<Command[]>([
    { id: 'open', icon: 'open-folder', title: 'Open a folder…', text: 'Pick a project folder to work in. Sessions run inside it.', run: onopenfolder },
    ...(hasFolders
      ? [{ id: 'new', icon: 'new' as const, title: 'Start a new session', text: 'Ask the agent to work on the selected folder.', run: onnewsession }]
      : []),
    { id: 'agent', icon: 'agent', title: 'Add an agent…', text: 'Register another ACP agent command in Options.', run: onaddagent }
  ])
</script>

<div class="welcome">
  <div class="panel" role="region" aria-label="Getting Started">
    <div class="head">
      <Icon name="agent7" size={48} />
      <div>
        <div class="title">Getting Started</div>
        <div class="sub">Agent7 runs coding agents that speak the Agent Client Protocol.</div>
      </div>
    </div>
    <div class="commands">
      {#each commands as command (command.id)}
        <button type="button" class="cmd" onclick={command.run}>
          <Icon name={command.icon} size={20} />
          <span class="body">
            <span class="ct">{command.title}</span>
            <span class="cs">{command.text}</span>
          </span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .welcome {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: var(--w7-window);
    border: 1px solid var(--w7-panel-border);
  }
  .panel {
    width: 460px;
    max-width: 100%;
    background: #fff;
    border: 1px solid #c5d1e1;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    background: linear-gradient(#f9fbfd, #e4ecf6);
    border-bottom: 1px solid #c5d1e1;
  }
  .title {
    font-size: 17px;
    color: #003399;
  }
  .sub {
    margin-top: 2px;
    color: var(--w7-text-muted);
  }
  .commands {
    padding: 10px 14px 12px;
  }
  .cmd {
    width: 100%;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    text-align: left;
    color: var(--w7-text);
    font: inherit;
    cursor: default;
  }
  .cmd:hover {
    border-color: #b6d7ee;
    background: linear-gradient(#fbfdff, #e3f2fc);
  }
  .cmd:active {
    background: linear-gradient(#e0f1fb, #c5e4f6);
  }
  .cmd:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -3px;
  }
  .cmd :global(.xp-icon) {
    margin-top: 1px;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ct {
    font-size: 14px;
    color: #003399;
  }
  .cs {
    color: var(--w7-text);
  }
</style>
