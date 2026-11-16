<script lang="ts">
  /** The Win7 "Computer" folder: Hard Disk Drives and Devices with Removable Storage as tiles. */
  import type { DriveDto, VPath } from '@shared/vfs'
  import Icon from '../../kit/atoms/Icon.svelte'
  import { driveGroups, driveRoot, driveTitle } from './explorerModel'

  interface Props {
    drives: DriveDto[]
    /** Selected drive root, e.g. `E:\`. */
    selected?: VPath | null
    onselect?: (path: VPath) => void
    onactivate?: (drive: DriveDto) => void
    oncontextmenu?: (drive: DriveDto, event: MouseEvent) => void
    /** Folders to sit empty when no drive is plugged in. */
    class?: string
  }

  let { drives, selected = null, onselect, onactivate, oncontextmenu, class: className = '' }: Props = $props()

  const groups = $derived(driveGroups(drives))
  const sections = $derived([
    { id: 'hard', title: 'Hard Disk Drives', items: groups.hardDisks },
    { id: 'removable', title: 'Devices with Removable Storage', items: groups.removable }
  ].filter((s) => s.items.length > 0))

  const caption = (d: DriveDto): string => (d.kind === 'system' ? 'Private to this desktop' : 'Plugged-in project')
</script>

<div class="computer {className}" role="listbox" aria-label="Computer" tabindex="-1">
  {#each sections as section (section.id)}
    <div class="group">
      <div class="head"><span>{section.title} ({section.items.length})</span><i></i></div>
      <div class="tiles">
        {#each section.items as drive (drive.letter)}
          {@const root = driveRoot(drive.letter)}
          <button
            type="button"
            role="option"
            aria-selected={selected === root}
            class="tile"
            class:selected={selected === root}
            onclick={() => onselect?.(root)}
            ondblclick={() => onactivate?.(drive)}
            onkeydown={(event) => event.key === 'Enter' && onactivate?.(drive)}
            oncontextmenu={(event) => {
              event.preventDefault()
              onselect?.(root)
              oncontextmenu?.(drive, event)
            }}
          >
            <Icon name={drive.kind === 'removable' ? 'usb' : 'drive'} size={32} />
            <span class="info">
              <span class="name">{driveTitle(drive)}</span>
              {#if drive.kind === 'system'}
                <span class="bar" aria-hidden="true"><span class="fill"></span></span>
              {/if}
              <span class="sub">{caption(drive)}</span>
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/each}
  {#if drives.length === 0}
    <p class="none">This computer has no drives.</p>
  {/if}
</div>

<style>
  .computer {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px 8px;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
    outline: 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0 6px;
    color: #1e3287;
    font-size: 13px;
  }
  .head i {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, #c5d3e8, transparent);
  }
  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
    margin-bottom: 10px;
  }
  .tile {
    width: 240px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 6px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .tile:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .tile.selected {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
  }
  .tile:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -2px;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    color: var(--w7-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bar {
    display: block;
    height: 13px;
    border: 1px solid #acacac;
    background: linear-gradient(#f2f2f2, #e0e0e0);
    padding: 1px;
    box-sizing: border-box;
  }
  .fill {
    display: block;
    width: 38%;
    height: 100%;
    background: linear-gradient(#85d2fb 0, #35b1f4 45%, #1798ea 50%, #5fc3fa 100%);
  }
  .none {
    margin: 12px 4px;
    color: var(--w7-text-muted);
  }
</style>
