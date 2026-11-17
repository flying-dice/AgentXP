<script lang="ts">
  import { untrack } from 'svelte'
  import Icon from '../atoms/Icon.svelte'
  import { clickOutside } from '../actions/clickOutside'
  import { filterStartItems, moveHighlight, START_MENU_HINT, startNavItems, type StartGroup, type StartItem } from './StartMenu'

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
  /**
   * "All Programs": the folder list takes over the left column (the pinned programs and recent chats step
   * aside, as in later Windows) so it has the whole height and scrolls; "Back" returns. A search always shows
   * the matching folders alongside everything else.
   */
  let allOpen = $state(false)
  const allView = $derived(allOpen && !searching)
  const shownGroups = $derived(groups.map((g) => ({ ...g, items: filterStartItems(g.items, query) })).filter((g) => !searching || g.items.length > 0))
  const empty = $derived(searching && shownPrograms.length + shownRecent.length + shownGroups.length === 0)

  let search: HTMLInputElement | undefined = $state()
  $effect(() => search?.focus())

  // The first entry is highlighted when the menu opens and after every change of the search text; Up and Down move it
  // and Enter starts it.
  const nav = $derived(startNavItems({ programs: allView ? [] : shownPrograms, groups: shownGroups, recent: allView ? [] : shownRecent, openGroups, searching }))
  let hot = $state(0)
  const hotKey = $derived(nav[Math.min(hot, nav.length - 1)]?.key ?? null)
  $effect(() => {
    query
    untrack(() => (hot = 0))
  })
  $effect(() => {
    if (hotKey) document.getElementById(`sm-${hotKey}`)?.scrollIntoView?.({ block: 'nearest' })
  })

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (shutdownOpen) shutdownOpen = false
      else onclose?.()
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && event.target === search) {
      event.preventDefault()
      hot = moveHighlight(Math.min(hot, Math.max(nav.length - 1, 0)), nav.length, event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter' && event.target === search) {
      // A button that has the focus handles its own Enter; the search box starts the highlighted entry.
      const entry = nav.find((n) => n.key === hotKey)
      if (!entry) return
      event.preventDefault()
      if (entry.kind === 'run') onrun?.(entry.id)
      else onrecent?.(entry.id)
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="xp-start" data-testid="start-menu" role="group" tabindex="-1" aria-label="Start menu" onkeydown={onKeydown} use:clickOutside={{ handler: () => onclose?.(), ignore }}>
  <div class="header"><div class="tile" aria-hidden="true"><Icon name="agentxp" size={40} /></div><span class="user">AgentXP</span></div>
  <div class="left">
    {#if !allView}
    <ul class="programs" role="menu" aria-label="Programs">
      {#each shownPrograms as item (item.id)}
        <li role="none">
          <button type="button" role="menuitem" class="entry" class:hot={hotKey === `p:${item.id}`} data-hot={hotKey === `p:${item.id}`} id="sm-p:{item.id}" data-testid="start-menu-item-{item.id}" title={item.description} onclick={() => onrun?.(item.id)}>
            {#if item.icon}<Icon name={item.icon} size={28} />{/if}
            <span class="text"><span class="title">{item.title}</span></span>
          </button>
        </li>
      {/each}
    </ul>
    {/if}
    {#if shownGroups.length > 0 && (allOpen || searching)}
      <ul class="groups" class:fill={allView} role="menu" aria-label="Program folders" data-testid="start-menu-groups">
        {#each shownGroups as group (group.id)}
          {@const open = searching || openGroups[group.id]}
          <li role="none">
            <button type="button" role="menuitem" class="entry small" data-testid="start-menu-group-{group.id}" aria-expanded={open} onclick={() => (openGroups[group.id] = !open)}>
              <Icon name="folder" size={16} /><span class="title">{group.title}</span><span class="caret" class:open aria-hidden="true">▸</span>
            </button>
            {#if open}
              <ul class="sub" role="menu" aria-label={group.title}>
                {#each group.items as item (item.id)}
                  <li role="none">
                    <button type="button" role="menuitem" class="entry small" class:hot={hotKey === `g:${group.id}:${item.id}`} data-hot={hotKey === `g:${group.id}:${item.id}`} id="sm-g:{group.id}:{item.id}" data-testid="start-menu-item-{item.id}" onclick={() => onrun?.(item.id)}>
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
    {#if groups.length > 0 && !searching}
      <ul role="menu" aria-label="All programs">
        <li role="none">
          <button type="button" role="menuitem" class="entry all" class:back={allOpen} data-testid="start-menu-all" aria-haspopup="menu" aria-expanded={allOpen} onclick={() => (allOpen = !allOpen)}>
            {#if allOpen}<span class="tri back" aria-hidden="true"></span><span class="title">Back</span>{:else}<span class="tri" aria-hidden="true"></span><span class="title">All Programs</span>{/if}
          </button>
        </li>
      </ul>
    {/if}
    {#if shownRecent.length > 0 && !allView}
      <div class="heading">Recent chats</div>
      <ul class="recent" role="menu" aria-label="Recent chats">
        {#each shownRecent as item (item.id)}
          <li role="none">
            <button type="button" role="menuitem" class="entry small" class:hot={hotKey === `r:${item.id}`} data-hot={hotKey === `r:${item.id}`} id="sm-r:{item.id}" data-testid="start-menu-recent" data-session-id={item.id} onclick={() => onrecent?.(item.id)}>
              <Icon name="session" size={16} /><span class="title">{item.title}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if empty}<div class="none">No items match your search.</div>{/if}
    <div class="search">
      <input data-testid="start-menu-search" bind:this={search} bind:value={query} type="search" placeholder="Search programs and chats" aria-label="Search programs and chats" aria-activedescendant={hotKey ? `sm-${hotKey}` : undefined} />
      <Icon name="search" size={14} />
    </div>
    <p class="hint" data-testid="start-menu-hint">{START_MENU_HINT}</p>
  </div>
  <div class="right">
    <ul role="menu" aria-label="Places">
      {#each places as item (item.id)}
        <li role="none"><button type="button" role="menuitem" class="place" data-testid="start-menu-place-{item.id}" onclick={() => onplace?.(item.id)}>{item.title}</button></li>
      {/each}
    </ul>
  </div>
  <div class="footer">
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
              <li role="none"><button type="button" role="menuitem" data-testid="start-menu-shutdown-disconnect" onclick={() => pick(ondisconnect)}>Disconnect</button></li>
              <li role="none"><button type="button" role="menuitem" data-testid="start-menu-shutdown-switch" onclick={() => pick(onswitch)}>Switch desktop…</button></li>
              <li role="none"><button type="button" role="menuitem" data-testid="start-menu-shutdown-delete" onclick={() => pick(ondelete)}>Delete desktop…</button></li>
            </ul>
          {/if}
        </div>
      {/if}
  </div>
</div>

<style>
  /* The XP Start menu: a blue frame, a header with the user tile, a white programs column, a pale blue places column, a footer with the power buttons. */
  .xp-start {
    position: relative;
    box-sizing: border-box;
    width: 380px;
    height: 520px;
    /* Never taller than the space it is given (the desktop above the taskbar): the columns scroll instead. */
    max-height: 100%;
    min-height: 0;
    flex: 0 1 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 54px 1fr 38px;
    padding: 0;
    border: 1px solid #0831d9;
    border-radius: 8px 8px 0 0;
    overflow: hidden;
    background: var(--xp-start-header);
    box-shadow: 3px 0 6px rgba(0, 0, 0, 0.45), 0 -2px 6px rgba(0, 0, 0, 0.35);
    font: var(--xp-font);
    user-select: none;
  }
  .header {
    grid-column: 1 / 3;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 8px;
    color: #fff;
    background: linear-gradient(180deg, #1f55c6 0, #1941a5 100%);
    border-bottom: 2px solid #f09a30;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
  .user {
    font: bold 17px/1 Tahoma, 'Segoe UI', sans-serif;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.6);
  }
  .tile {
    width: 44px;
    height: 44px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    border-radius: 4px;
    background: linear-gradient(#f9fcff, #bcd5f0);
    box-shadow: 0 0 0 1px rgba(0, 20, 80, 0.5);
  }
  .left {
    grid-column: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-right: 1px solid #95bdee;
    padding: 6px 4px;
    overflow: hidden;
    min-height: 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  /*
   * The left column never overflows: when the menu is short (a small window, or All Programs and its
   * folders open), the lists shrink and scroll. The folder list gives way first, then recent chats,
   * then the pinned programs; the search box and hint always stay visible.
   */
  .programs {
    flex: 0 1 auto;
    min-height: 34px;
    overflow-y: auto;
  }
  .entry {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 3px 6px;
    border: 0;
    border-radius: 0;
    background: transparent;
    font: inherit;
    color: #000;
    text-align: left;
    cursor: default;
  }
  .entry.small {
    gap: 6px;
    padding: 2px 6px;
  }
  .entry:hover,
  .entry.hot,
  .entry:focus-visible {
    outline: none;
    background: var(--xp-highlight);
    color: #fff;
  }
  .entry:focus-visible {
    outline: 1px dotted #fff;
    outline-offset: -2px;
  }
  .all {
    margin-top: 4px;
    padding: 5px 6px;
    gap: 12px;
    justify-content: center;
    font-weight: bold;
    border-top: 1px solid #d3e5fa;
  }
  .tri {
    width: 0;
    height: 0;
    margin: 0 4px 0 2px;
    border-style: solid;
    border-width: 5px 0 5px 7px;
    border-color: transparent transparent transparent #1f8a1f;
  }
  .entry:hover .tri {
    border-left-color: #fff;
  }
  .tri.back {
    border-width: 5px 7px 5px 0;
    border-color: transparent #1f8a1f transparent transparent;
  }
  .entry:hover .tri.back {
    border-left-color: transparent;
    border-right-color: #fff;
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
  .programs .title {
    font-weight: bold;
  }
  .heading {
    margin: 6px 6px 2px;
    padding-top: 6px;
    border-top: 1px solid #d3e5fa;
    color: #6b7a90;
    font-size: 11px;
  }
  .groups {
    flex: none;
    margin-top: 4px;
    border-top: 1px solid #d3e5fa;
    padding-top: 4px;
    max-height: 190px;
    flex: 0 100 auto;
    min-height: 44px;
    overflow-y: auto;
  }
  /* All Programs view: the folder list owns the column. */
  .groups.fill {
    flex: 1 1 auto;
    max-height: none;
    margin-top: 0;
    border-top: 0;
    padding-top: 0;
  }
  .sub {
    padding-left: 18px;
  }
  .caret {
    margin-left: auto;
    font-size: 10px;
  }
  .caret.open {
    transform: rotate(90deg);
  }
  .recent {
    flex: 1 50 auto;
    min-height: 0;
    overflow-y: auto;
  }
  .none {
    padding: 10px 8px;
    color: var(--xp-text-muted);
  }
  .hint {
    flex: none;
    margin: 6px 2px 0;
    color: #3a4656;
    font-size: 11px;
    line-height: 1.3;
  }
  .search {
    flex: none;
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
    height: 22px;
    padding: 0 24px 0 6px;
    border: 1px solid var(--xp-input-border);
    font: inherit;
    background: #fff;
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
  .right {
    grid-column: 2;
    min-width: 0;
    min-height: 0;
    padding: 6px 4px;
    display: flex;
    flex-direction: column;
    background: var(--xp-start-right);
    color: #1b2a57;
    overflow: auto;
  }
  .right ul {
    flex: 1;
  }
  .place {
    width: 100%;
    box-sizing: border-box;
    padding: 5px 8px;
    border: 0;
    background: transparent;
    font: inherit;
    font-weight: bold;
    color: #1b2a57;
    text-align: left;
    cursor: default;
  }
  .place:focus-visible,
  .power-btn:focus-visible,
  .shutdown-menu button:focus-visible {
    outline: 1px dotted #fff;
    outline-offset: -3px;
  }
  .place:hover,
  .place:focus-visible {
    background: var(--xp-highlight);
    color: #fff;
  }
  .footer {
    grid-column: 1 / 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    padding: 0 10px;
    background: var(--xp-start-footer);
    border-top: 1px solid #5f8fdd;
  }
  .power,
  .shutdown {
    position: relative;
    display: flex;
    padding: 0;
  }
  .power-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 8px;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: #fff;
    font: inherit;
    cursor: default;
  }
  .power-btn.arrow {
    width: 18px;
    padding: 0;
    justify-content: center;
  }
  .shutdown-menu {
    position: absolute;
    right: 0;
    bottom: 30px;
    z-index: 1;
    min-width: 150px;
    padding: 2px;
    border: 1px solid #0831d9;
    background: #fff;
    box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.4);
  }
  .shutdown-menu button {
    width: 100%;
    padding: 4px 22px 4px 10px;
    border: 0;
    background: transparent;
    font: inherit;
    color: #000;
    text-align: left;
    cursor: default;
  }
  .shutdown-menu button:hover,
  .shutdown-menu button:focus-visible {
    outline: none;
    background: var(--xp-highlight);
    color: #fff;
  }
  .power-btn:hover {
    background: rgba(255, 255, 255, 0.22);
  }
  .power-btn:active {
    filter: brightness(0.85);
  }
</style>
