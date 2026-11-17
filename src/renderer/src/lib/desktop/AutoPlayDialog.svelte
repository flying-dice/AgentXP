<script lang="ts">
  /** The WinXP AutoPlay dialog for a USB drive that was just plugged in. */
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

  const options: { id: AutoPlayChoice; icon: IconName; title: string }[] = [
    { id: 'open', icon: 'folder-open', title: 'Open folder to view files' },
    { id: 'chat', icon: 'agentxp', title: 'Start a chat on this drive' },
    { id: 'none', icon: 'close', title: 'Take no action' }
  ]
</script>

<Dialog testid="autoplay-dialog" title="AutoPlay" iconName="usb" width="400px" contained bodyColor="window" onclose={() => onchoose?.('none')}>
  <div class="autoplay">
    <div class="drive">
      <Icon name="usb" size={32} />
      <span>{driveTitle(drive)}</span>
    </div>
    <p class="line" data-testid="autoplay-text">This project is now a drive on this desktop. What do you want to do?</p>
    <ul>
      {#each options as option (option.id)}
        <li>
          <button type="button" class="option" data-testid={option.id === 'open' ? 'autoplay-open-folder' : option.id === 'chat' ? 'autoplay-start-chat' : 'autoplay-no-action'} data-autofocus={option.id === 'open' ? '' : undefined} onclick={() => onchoose?.(option.id)}>
            <Icon name={option.icon} size={option.id === 'none' ? 16 : 32} />
            <span class="text"><span class="title">{option.title}</span></span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</Dialog>

<style>
  .autoplay {
    padding: 14px 16px 16px;
    background: var(--xp-window);
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
  .line {
    margin: 12px 0 6px;
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
    border-color: var(--xp-hot-border);
    background: var(--xp-hot-face);
    outline: 0;
  }
  .text {
    display: flex;
    flex-direction: column;
  }
  .title {
    color: #0b3b9c;
  }
</style>
