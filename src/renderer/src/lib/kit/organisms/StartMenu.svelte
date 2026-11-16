<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import { clickOutside } from '../actions/clickOutside'
  import { filterStartItems, type StartItem } from './StartMenu'

  interface Props {
    /** Left column: apps. */
    programs: StartItem[]
    /** Left column, under the line: recent chats. */
    recent?: StartItem[]
    /** Right column: places and system. */
    places: StartItem[]
    /** Caption of the power button, e.g. "Pause agent" or "Resume agent". */
    powerLabel?: string
    query?: string
    onrun?: (id: string) => void
    onrecent?: (id: string) => void
    onplace?: (id: string) => void
    onpower?: () => void
    onclose?: () => void
    /** Taskbar orb element: presses on it are not "outside". */
    ignore?: HTMLElement | null
  }

  let { programs, recent = [], places, powerLabel = 'Pause agent', query = $bindable(''), onrun, onrecent, onplace, onpower, onclose, ignore = null }: Props = $props()

  const shownPrograms = $derived(filterStartItems(programs, query))
  const shownRecent = $derived(filterStartItems(recent, query))
  const searching = $derived(query.trim().length > 0)
  const empty = $derived(searching && shownPrograms.length + shownRecent.length === 0)

  let search: HTMLInputElement | undefined = $state()
  $effect(() => search?.focus())

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onclose?.()
    } else if (event.key === 'Enter' && searching) {
      const first = shownPrograms[0] ?? shownRecent[0]
      if (!first) return
      if (shownPrograms[0]) onrun?.(first.id)
      else onrecent?.(first.id)
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="w7-start" role="menu" tabindex="-1" aria-label="Start menu" onkeydown={onKeydown} use:clickOutside={{ handler: () => onclose?.(), ignore }}>
  <div class="tile" aria-hidden="true"><Icon name="agent7" size={40} /></div>
  <div class="left">
    <ul class="programs">
      {#each shownPrograms as item (item.id)}
        <li>
          <button type="button" role="menuitem" class="entry" onclick={() => onrun?.(item.id)}>
            {#if item.icon}<Icon name={item.icon} size={28} />{/if}
            <span class="text">
              <span class="title">{item.title}</span>
              {#if item.description}<span class="desc">{item.description}</span>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
    {#if shownRecent.length > 0}
      <div class="heading">Recent chats</div>
      <ul class="recent">
        {#each shownRecent as item (item.id)}
          <li>
            <button type="button" role="menuitem" class="entry small" onclick={() => onrecent?.(item.id)}>
              <Icon name="session" size={16} /><span class="title">{item.title}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if empty}<div class="none">No items match your search.</div>{/if}
    <div class="search">
      <input bind:this={search} bind:value={query} type="search" placeholder="Search apps and chats" aria-label="Search apps and chats" />
      <Icon name="search" size={14} />
    </div>
  </div>
  <div class="right">
    <ul>
      {#each places as item (item.id)}
        <li><button type="button" role="menuitem" class="place" onclick={() => onplace?.(item.id)}>{item.title}</button></li>
      {/each}
    </ul>
    <div class="power">
      <button type="button" class="power-btn" onclick={() => onpower?.()}><Icon name={powerLabel.startsWith('Resume') ? 'play' : 'pause'} size={14} />{powerLabel}</button>
    </div>
  </div>
</div>

<style>
  .w7-start {
    position: relative;
    box-sizing: border-box;
    width: 410px;
    height: 500px;
    display: flex;
    padding: 2px 3px 3px;
    border: 1px solid var(--w7-glass-border);
    border-radius: 6px 6px 0 0;
    background: var(--w7-glass-face);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45), 4px 4px 14px rgba(0, 0, 0, 0.55);
    font: var(--w7-font);
    user-select: none;
  }
  .tile {
    position: absolute;
    right: 40px;
    top: -26px;
    width: 62px;
    height: 62px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #e8f0fa;
    border-radius: 5px;
    background: linear-gradient(#f3f8ff, #c9ddf4);
    box-shadow: 0 0 0 1px #5d7899, 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .left {
    flex: none;
    width: 252px;
    margin: 20px 0 0 4px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #7d93b4;
    border-radius: 4px;
    padding: 6px 4px 6px;
    overflow: hidden;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .programs {
    flex: none;
  }
  .entry {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 4px 6px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    font: inherit;
    color: #000;
    text-align: left;
    cursor: default;
  }
  .entry.small {
    gap: 7px;
    padding: 3px 6px;
  }
  .entry:hover,
  .entry:focus-visible {
    outline: none;
    border-color: var(--w7-menu-hot-border);
    background: var(--w7-menu-hot-face);
  }
  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .desc {
    font-size: 11px;
    color: var(--w7-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .heading {
    margin: 8px 6px 2px;
    padding-top: 6px;
    border-top: 1px solid #d5dfe5;
    color: #3d5d8a;
    font-size: 11px;
  }
  .recent {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .none {
    padding: 10px 8px;
    color: var(--w7-text-muted);
  }
  .search {
    margin-top: auto;
    position: relative;
    padding-top: 6px;
  }
  .search :global(svg) {
    position: absolute;
    right: 8px;
    bottom: 7px;
    pointer-events: none;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    height: 23px;
    padding: 0 24px 0 6px;
    border: 1px solid var(--w7-input-border);
    border-top-color: var(--w7-input-border-top);
    border-radius: 2px;
    font: inherit;
    background: #fff;
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
  .right {
    flex: 1;
    min-width: 0;
    margin-top: 28px;
    padding: 0 6px 0 14px;
    display: flex;
    flex-direction: column;
    color: #fff;
  }
  .right ul {
    flex: 1;
  }
  .place {
    width: 100%;
    box-sizing: border-box;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    font: inherit;
    color: #fff;
    text-align: left;
    text-shadow: 0 0 3px rgba(0, 20, 60, 0.7);
    cursor: default;
  }
  .place:hover,
  .place:focus-visible {
    outline: none;
    border-color: rgba(255, 255, 255, 0.7);
    background: var(--w7-start-hover);
    color: #000;
    text-shadow: none;
  }
  .power {
    padding-bottom: 6px;
  }
  .power-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 12px;
    border: 1px solid #5a2a14;
    border-radius: 3px;
    background: linear-gradient(#f0a070, #d0602e 48%, #b84818 52%, #d86a34);
    color: #fff;
    font: inherit;
    text-shadow: 0 0 2px rgba(60, 20, 0, 0.8);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
    cursor: default;
  }
  .power-btn:hover {
    filter: brightness(1.12);
  }
  .power-btn:active {
    filter: brightness(0.9);
  }
</style>
