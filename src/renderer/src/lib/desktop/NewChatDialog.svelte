<script lang="ts">
  /** "New chat on...": picks the working drive of a new chat (the agent's home on C: or the root of a plugged-in drive). */
  import { AGENT_HOME, type DriveDto, type VPath } from '@shared/vfs'
  import Icon from '../kit/atoms/Icon.svelte'
  import Button from '../kit/atoms/Button.svelte'
  import Dialog from '../kit/organisms/Dialog.svelte'
  import { driveRoot, driveTitle } from '../apps/explorer/explorerModel'

  interface Props {
    drives: DriveDto[]
    onstart?: (cwd: VPath) => void
    oncancel?: () => void
  }

  let { drives, onstart, oncancel }: Props = $props()

  const options = $derived(
    [...drives]
      .sort((a, b) => (a.kind === 'system' ? -1 : b.kind === 'system' ? 1 : a.letter.localeCompare(b.letter)))
      .map((d) => ({
        letter: d.letter,
        cwd: d.kind === 'system' ? AGENT_HOME : driveRoot(d.letter),
        title: driveTitle(d),
        sub: d.kind === 'system' ? 'Private to this desktop. The agent starts in its home folder.' : 'Plugged-in project. The agent starts in the root of the drive.',
        icon: d.kind === 'removable' ? ('usb' as const) : ('drive' as const)
      }))
  )
  let chosen = $state<string | null>(null)
  const current = $derived(options.find((o) => o.letter === chosen) ?? options[0] ?? null)
</script>

<Dialog testid="new-chat-dialog" title="New chat" iconName="session" width="420px" contained bodyColor="window" onclose={() => oncancel?.()}>
  <div class="body">
    <p>Where should the agent work?</p>
    <ul role="radiogroup" aria-label="Working drive">
      {#each options as option (option.letter)}
        <li>
          <button
            type="button"
            class="option"
            role="radio"
            aria-checked={current?.letter === option.letter}
            class:on={current?.letter === option.letter}
            data-testid="new-chat-drive-{option.letter.toLowerCase()}"
            data-autofocus={option === options[0] ? '' : undefined}
            onclick={() => (chosen = option.letter)}
            ondblclick={() => onstart?.(option.cwd)}
          >
            <Icon name={option.icon} size={32} />
            <span class="text"><span class="title">{option.title}</span><span class="sub">{option.sub}</span></span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
  {#snippet buttons()}
    <Button data-testid="new-chat-start" isDefault disabled={!current} onclick={() => current && onstart?.(current.cwd)}>Start chat</Button>
    <Button data-testid="new-chat-cancel" onclick={() => oncancel?.()}>Cancel</Button>
  {/snippet}
</Dialog>

<style>
  .body {
    padding: 12px 16px 8px;
    background: var(--w7-window);
  }
  p {
    margin: 0 0 8px;
    color: #1e3287;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 240px;
    overflow: auto;
  }
  .option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .option:hover,
  .option:focus-visible {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
    outline: 0;
  }
  .option.on {
    border-color: var(--w7-select-border, #7da2ce);
    background: var(--w7-select-face, #dcebfc);
  }
  .text {
    display: flex;
    flex-direction: column;
  }
  .title {
    color: #0b3b9c;
  }
  .sub {
    color: var(--w7-text-muted);
  }
</style>
