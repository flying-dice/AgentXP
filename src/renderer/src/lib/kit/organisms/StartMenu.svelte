<script lang="ts">
  import Icon from '../atoms/Icon.svelte'
  import { clickOutside } from '../actions/clickOutside'
  import { filterStartItems, type StartGroup, type StartItem } from './StartMenu'

  interface Props {
    /** Left column: apps. */
    programs: StartItem[]
    /** Left column, under the line: recent chats. */
    recent?: StartItem[]
    /** Right column: places and system. */
    places: StartItem[]
    /** Folders under the programs (Accessories, System Tools); items run through `onrun`. */
    groups?: StartGroup[]
    /** Caption of the power button, e.g. "Pause agent" or "Resume agent". */
    powerLabel?: string
    query?: string
    onrun?: (id: string) => void
    onrecent?: (id: string) => void
    onplace?: (id: string) => void
    onpower?: () => void
    /** The Disconnect button (and the first item of its arrow menu). Without it the shut-down area is hidden. */
    ondisconnect?: () => void
    /** Arrow menu: show the launcher to switch to another desktop. */
    onswitch?: () => void
    /** Arrow menu: delete this desktop (the host asks first). */
    ondelete?: () => void
    onclose?: () => void
    /** Taskbar orb element: presses on it are not "outside". */
    ignore?: HTMLElement | null
  }

  let { programs, groups = [], recent = [], places, powerLabel = 'Pause agent', query = $bindable(''), onrun, onrecent, onplace, onpower, ondisconnect, onswitch, ondelete, onclose, ignore = null }: Props = $props()

  let shutdownOpen = $state(false)
  const pick = (action?: () => void): void => {
    shutdownOpen = false
    action?.()
  }

  const shownPrograms = $derived(filterStartItems(programs, query))
  const shownRecent = $derived(filterStartItems(recent, query))
  const searching = $derived(query.trim().length > 0)
  let openGroups = $state<Record<string, boolean>>({})
  /** "All Programs": shows the folders under the programs; a search always shows the matching ones. */
  let allOpen = $state(false)
  const shownGroups = $derived(groups.map((g) => ({ ...g, items: filterStartItems(g.items, query) })).filter((g) => !searching || g.items.length > 0))
  const empty = $derived(searching && shownPrograms.length + shownRecent.length + shownGroups.length === 0)

  let search: HTMLInputElement | undefined = $state()
  $effect(() => search?.focus())

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (shutdownOpen) shutdownOpen = false
      else onclose?.()
    } else if (event.key === 'Enter' && searching) {
      const first = shownPrograms[0] ?? shownGroups[0]?.items[0] ?? shownRecent[0]
      if (!first) return
      if (shownPrograms[0] || shownGroups[0]?.items[0]) onrun?.(first.id)
      else onrecent?.(first.id)
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="w7-start" data-testid="start-menu" role="menu" tabindex="-1" aria-label="Start menu" onkeydown={onKeydown} use:clickOutside={{ handler: () => onclose?.(), ignore }}>
  <div class="tile" aria-hidden="true"><Icon name="agent7" size={40} /></div>
  <div class="left">
    <ul class="programs">
      {#each shownPrograms as item (item.id)}
        <li>
          <button type="button" role="menuitem" class="entry" data-testid="start-menu-item-{item.id}" title={item.description} onclick={() => onrun?.(item.id)}>
            {#if item.icon}<Icon name={item.icon} size={32} />{/if}
            <span class="text"><span class="title">{item.title}</span></span>
          </button>
        </li>
      {/each}
    </ul>
    {#if groups.length > 0 && !searching}
      <button type="button" role="menuitem" class="entry all" data-testid="start-menu-all" aria-expanded={allOpen} onclick={() => (allOpen = !allOpen)}>
        <span class="tri" class:open={allOpen} aria-hidden="true"></span><span class="title">All Programs</span>
      </button>
    {/if}
    {#if shownGroups.length > 0 && (allOpen || searching)}
      <ul class="groups">
        {#each shownGroups as group (group.id)}
          {@const open = searching || openGroups[group.id]}
          <li>
            <button type="button" role="menuitem" class="entry small" data-testid="start-menu-group-{group.id}" aria-expanded={open} onclick={() => (openGroups[group.id] = !open)}>
              <Icon name="folder" size={16} /><span class="title">{group.title}</span><span class="caret" class:open aria-hidden="true">▸</span>
            </button>
            {#if open}
              <ul class="sub">
                {#each group.items as item (item.id)}
                  <li>
                    <button type="button" role="menuitem" class="entry small" data-testid="start-menu-item-{item.id}" onclick={() => onrun?.(item.id)}>
                      {#if item.icon}<Icon name={item.icon} size={16} />{/if}<span class="title">{item.title}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    {#if shownRecent.length > 0}
      <div class="heading">Recent chats</div>
      <ul class="recent">
        {#each shownRecent as item (item.id)}
          <li>
            <button type="button" role="menuitem" class="entry small" data-testid="start-menu-recent" data-session-id={item.id} onclick={() => onrecent?.(item.id)}>
              <Icon name="session" size={16} /><span class="title">{item.title}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if empty}<div class="none">No items match your search.</div>{/if}
    <div class="search">
      <input data-testid="start-menu-search" bind:this={search} bind:value={query} type="search" placeholder="Search programs and chats" aria-label="Search programs and chats" />
      <Icon name="search" size={14} />
    </div>
  </div>
  <div class="right">
    <ul>
      {#each places as item (item.id)}
        <li><button type="button" role="menuitem" class="place" data-testid="start-menu-place-{item.id}" onclick={() => onplace?.(item.id)}>{item.title}</button></li>
      {/each}
    </ul>
    <div class="power">
      <button type="button" class="power-btn" data-testid="start-menu-power" onclick={() => onpower?.()}><Icon name={powerLabel.startsWith('Resume') ? 'play' : 'pause'} size={14} />{powerLabel}</button>
    </div>
    {#if ondisconnect}
      <div class="shutdown">
        <button type="button" class="power-btn main" data-testid="start-menu-disconnect" title="Close this window. The agents keep running." onclick={() => pick(ondisconnect)}>Disconnect</button><button
          type="button"
          class="power-btn arrow"
          data-testid="start-menu-disconnect-arrow"
          aria-haspopup="menu"
          aria-expanded={shutdownOpen}
          aria-label="Disconnect options"
          onclick={() => (shutdownOpen = !shutdownOpen)}>▸</button
        >
        {#if shutdownOpen}
          <ul class="shutdown-menu" role="menu" data-testid="start-menu-disconnect-menu">
            <li><button type="button" role="menuitem" data-testid="start-menu-shutdown-disconnect" onclick={() => pick(ondisconnect)}>Disconnect</button></li>
            <li><button type="button" role="menuitem" data-testid="start-menu-shutdown-switch" onclick={() => pick(onswitch)}>Switch desktop…</button></li>
            <li><button type="button" role="menuitem" data-testid="start-menu-shutdown-delete" onclick={() => pick(ondelete)}>Delete desktop…</button></li>
          </ul>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .w7-start {
    position: relative;
    box-sizing: border-box;
    width: 410px;
    height: 500px;
    display: flex;
    padding: 3px;
    border: 1px solid var(--w7-glass-border);
    border-radius: 8px;
    isolation: isolate;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 2px 2px 14px rgba(0, 0, 0, 0.55);
    font: var(--w7-font);
    user-select: none;
  }
  .w7-start::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--w7-glass-face);
    backdrop-filter: var(--w7-glass-blur);
    pointer-events: none;
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
    border: 2px solid rgba(235, 244, 255, 0.95);
    border-radius: 6px;
    background: linear-gradient(#f9fcff, #bcd5f0);
    box-shadow: 0 0 0 1px rgba(20, 44, 84, 0.8), 0 2px 8px rgba(0, 0, 0, 0.45);
  }
  .left {
    flex: none;
    width: 252px;
    margin: 20px 0 0 4px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid rgba(20, 44, 84, 0.7);
    border-radius: 5px;
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
    padding: 2px 6px;
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
    border-color: #b8d6fb;
    background: linear-gradient(rgba(255, 255, 255, 0.9), rgba(214, 232, 252, 0.9));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
  }
  .all {
    margin-top: 4px;
    padding: 4px 6px;
    gap: 12px;
  }
  .tri {
    width: 0;
    height: 0;
    margin: 0 5px 0 4px;
    border-style: solid;
    border-width: 4px 0 4px 6px;
    border-color: transparent transparent transparent #000;
  }
  .tri.open {
    border-width: 6px 4px 0 4px;
    border-color: #000 transparent transparent transparent;
    margin: 2px 4px 0 3px;
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
  .heading {
    margin: 8px 6px 2px;
    padding-top: 6px;
    border-top: 1px solid #d5dfe5;
    color: #3d5d8a;
    font-size: 11px;
  }
  .groups {
    flex: none;
    margin-top: 4px;
    border-top: 1px solid #d5dfe5;
    padding-top: 4px;
    max-height: 190px;
    overflow: auto;
  }
  .sub {
    padding-left: 18px;
  }
  .caret {
    margin-left: auto;
    color: #6b7a90;
    font-size: 10px;
  }
  .caret.open {
    transform: rotate(90deg);
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
    cursor: default;
  }
  .right li + li {
    margin-top: 1px;
  }
  .place:hover,
  .place:focus-visible {
    outline: none;
    border-color: rgba(255, 255, 255, 0.55);
    background: linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.14));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
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
    border: 1px solid rgba(8, 24, 52, 0.85);
    border-radius: 3px;
    background: linear-gradient(rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08) 50%, rgba(0, 20, 60, 0.18) 52%, rgba(255, 255, 255, 0.12));
    color: #fff;
    font: inherit;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
    cursor: default;
  }
  .shutdown {
    position: relative;
    display: flex;
    padding-bottom: 8px;
  }
  .power-btn.main {
    flex: 1;
    justify-content: center;
    border-radius: 3px 0 0 3px;
  }
  .power-btn.arrow {
    width: 22px;
    padding: 0;
    justify-content: center;
    border-left-color: rgba(255, 255, 255, 0.5);
    border-radius: 0 3px 3px 0;
  }
  .shutdown-menu {
    position: absolute;
    right: 0;
    bottom: 34px;
    z-index: 1;
    min-width: 140px;
    padding: 2px;
    border: 1px solid var(--w7-menu-border, #979797);
    background: var(--w7-menu-face, #f0f0f0);
    box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.4);
  }
  .shutdown-menu button {
    width: 100%;
    padding: 4px 22px 4px 10px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
    font: inherit;
    color: #000;
    text-align: left;
    cursor: default;
  }
  .shutdown-menu button:hover,
  .shutdown-menu button:focus-visible {
    outline: none;
    border-color: var(--w7-menu-hot-border);
    background: var(--w7-menu-hot-face);
  }
  .power-btn:hover {
    background: linear-gradient(rgba(190, 235, 255, 0.6), rgba(120, 190, 240, 0.3) 50%, rgba(40, 120, 200, 0.35) 52%, rgba(150, 215, 255, 0.45));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 0 6px rgba(150, 220, 255, 0.7);
  }
  .power-btn:active {
    filter: brightness(0.85);
  }
</style>
