<script lang="ts">
  /** The Win7 "Computer" folder: Hard Disk Drives and Devices with Removable Storage as tiles. */
  import type { Id } from '@shared/models'
  import type { DriveDto, VPath } from '@shared/vfs'
  import Icon from '../../kit/atoms/Icon.svelte'
  import type { RemovedProject } from '../../desktop/projectDrives'
  import { driveGroups, driveRoot, driveTitle } from './explorerModel'

  interface Props {
    drives: DriveDto[]
    /** Selected drive root, e.g. `E:\`. */
    selected?: VPath | null
    onselect?: (path: VPath) => void
    onactivate?: (drive: DriveDto) => void
    oncontextmenu?: (drive: DriveDto, event: MouseEvent) => void
    /** The last ejected projects (the "Recently removed" group). */
    removed?: readonly RemovedProject[]
    /** Selected removed project. */
    removedSelected?: Id | null
    onselectremoved?: (folderId: Id) => void
    /** Double click or Enter on a removed project: plug it in again. */
    onplugagain?: (folderId: Id) => void
    onremovedcontextmenu?: (project: RemovedProject, event: MouseEvent) => void
    /** Folders to sit empty when no drive is plugged in. */
    class?: string
  }

  let { drives, selected = null, onselect, onactivate, oncontextmenu, removed = [], removedSelected = null, onselectremoved, onplugagain, onremovedcontextmenu, class: className = '' }: Props = $props()

  const groups = $derived(driveGroups(drives))
  const sections = $derived([
    { id: 'hard', title: 'Hard Disk Drives', items: groups.hardDisks },
    { id: 'removable', title: 'Devices with Removable Storage', items: groups.removable }
  ].filter((s) => s.items.length > 0))

  const caption = (d: DriveDto): string => (d.kind === 'system' ? 'Your files (C:)' : 'Project')
</script>

<div class="computer {className}" data-testid="explorer-computer" role="listbox" aria-label="Computer" tabindex="-1">
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
            data-testid="explorer-drive-{drive.letter.toLowerCase()}"
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
  {#if removed.length > 0}
    <div class="group" data-testid="explorer-removed-group">
      <div class="head"><span>Recently removed ({removed.length})</span><i></i></div>
      <div class="tiles">
        {#each removed as project (project.folderId)}
          <button
            type="button"
            role="option"
            aria-selected={removedSelected === project.folderId}
            class="tile gone"
            data-testid="explorer-removed-item"
            data-folder-id={project.folderId}
            class:selected={removedSelected === project.folderId}
            onclick={() => onselectremoved?.(project.folderId)}
            ondblclick={() => onplugagain?.(project.folderId)}
            onkeydown={(event) => event.key === 'Enter' && onplugagain?.(project.folderId)}
            oncontextmenu={(event) => {
              event.preventDefault()
              onselectremoved?.(project.folderId)
              onremovedcontextmenu?.(project, event)
            }}
          >
            <Icon name="usb" size={32} />
            <span class="info">
              <span class="name">{project.label}</span>
              <span class="sub">Removed. Double-click to plug in again.</span>
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
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
  .tile.gone .info {
    opacity: 0.7;
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
