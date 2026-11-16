<script lang="ts">
  /** The Win7 AutoPlay dialog for a USB drive that was just plugged in. */
  import type { DriveDto } from '@shared/vfs'
  import Icon from '../kit/atoms/Icon.svelte'
  import type { IconName } from '../kit/atoms/icons'
  import Dialog from '../kit/organisms/Dialog.svelte'
  import { driveTitle } from '../apps/explorer/explorerModel'

  export type AutoPlayChoice = 'open' | 'chat' | 'none'

  interface Props {
    drive: DriveDto
    onchoose?: (choice: AutoPlayChoice) => void
  }

  let { drive, onchoose }: Props = $props()

  const options: { id: AutoPlayChoice; icon: IconName; title: string; sub: string }[] = [
    { id: 'open', icon: 'folder-open', title: 'Open folder to view files', sub: 'using Explorer' },
    { id: 'chat', icon: 'agent7', title: 'Start a chat on this drive', sub: 'using Agent7' },
    { id: 'none', icon: 'close', title: 'Take no action', sub: '' }
  ]
</script>

<Dialog testid="autoplay-dialog" title="AutoPlay" iconName="usb" width="400px" contained bodyColor="window" onclose={() => onchoose?.('none')}>
  <div class="autoplay">
    <div class="drive">
      <Icon name="usb" size={32} />
      <span>{driveTitle(drive)}</span>
    </div>
    <h3>General options</h3>
    <ul>
      {#each options as option (option.id)}
        <li>
          <button type="button" class="option" data-testid={option.id === 'open' ? 'autoplay-open-folder' : option.id === 'chat' ? 'autoplay-start-chat' : 'autoplay-no-action'} data-autofocus={option.id === 'open' ? '' : undefined} onclick={() => onchoose?.(option.id)}>
            <Icon name={option.icon} size={option.id === 'none' ? 16 : 32} />
            <span class="text"><span class="title">{option.title}</span>{#if option.sub}<span class="sub">{option.sub}</span>{/if}</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</Dialog>

<style>
  .autoplay {
    padding: 14px 16px 16px;
    background: var(--w7-window);
  }
  .drive {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #dfdfdf;
    font-size: 15px;
    color: #1e3287;
  }
  h3 {
    margin: 12px 0 6px;
    font-size: 13px;
    font-weight: 400;
    color: #1e3287;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
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
