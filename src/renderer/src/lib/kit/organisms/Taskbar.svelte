<script module lang="ts">
  import type { Snippet } from 'svelte'
  import type { IconName } from '../atoms/icons'

  export interface TaskbarItem {
    id: string
    title: string
    icon?: IconName
    /** Custom icon art (28px); wins over `icon`. */
    iconSnippet?: Snippet
    /** A launcher that stays on the taskbar. Every button shows only its icon (the name is the tooltip and the accessible name). */
    pinned?: boolean
    /** A window of this app is open (pinned items without it are plain launchers). */
    running?: boolean
    /** This item's window has focus. */
    active?: boolean
    /** The window wants attention (opened behind the window in use): the button flashes orange until it is focused. */
    flashing?: boolean
    /** `data-testid` of the button. */
    testid?: string
  }
</script>

<script lang="ts">
  import Icon from '../atoms/Icon.svelte'

  interface Props {
    items?: TaskbarItem[]
    /** Time shown in the notification area; defaults to a live clock. */
    clock?: Date
    /** Tray icons or text rendered left of the clock. */
    tray?: Snippet
    startOpen?: boolean
    onstart?: () => void
    /** Click on a button; `keyboard` is true for Enter or Space (the window comes forward, it is never minimized). */
    onitemclick?: (item: TaskbarItem, via: { keyboard: boolean }) => void
    /** Right click, Menu key or Shift+F10 on a button; `x`/`y` are viewport coordinates. */
    onitemcontext?: (item: TaskbarItem, at: { x: number; y: number }) => void
    class?: string
  }

  let { items = [], clock, tray, startOpen = false, onstart, onitemclick, onitemcontext, class: className = '' }: Props = $props()

  let now = $state(new Date())
  $effect(() => {
    if (clock) return
    const id = setInterval(() => (now = new Date()), 15_000)
    return () => clearInterval(id)
  })

  const shown = $derived(clock ?? now)
  const pad = (n: number): string => String(n).padStart(2, '0')
  const time = $derived(`${pad(shown.getHours())}:${pad(shown.getMinutes())}`)
  const date = $derived(`${pad(shown.getDate())}/${pad(shown.getMonth() + 1)}/${shown.getFullYear()}`)

  let strip: HTMLDivElement | undefined = $state()
  /** Left/Right arrows move between the buttons (roving focus on a toolbar). */
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const buttons = Array.from(strip?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    event.preventDefault()
    buttons[(at + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="w7-taskbar {className}" data-testid="taskbar" role="toolbar" aria-label="Taskbar" tabindex="-1" onkeydown={onKeydown}>
  <div class="strip" bind:this={strip} data-region="taskbar">
    <button type="button" class="orb" data-testid="taskbar-start" class:open={startOpen} aria-label="Start" aria-haspopup="menu" aria-expanded={startOpen} onclick={() => onstart?.()}>
      <span class="orb-gloss"></span>
      <Icon name="agent7" size={22} />
    </button>
    {#each items as item (item.id)}
      <button
        type="button"
        class="task"
        data-testid={item.testid}
        data-window-id={item.id}
        class:pinned={item.pinned && !item.running}
        class:running={item.running}
        class:active={item.active}
        class:flashing={item.flashing && !item.active}
        data-flashing={item.flashing && !item.active ? 'true' : 'false'}
        aria-label={item.title}
        aria-pressed={item.running ? !!item.active : undefined}
        title={item.title}
        onclick={(e) => onitemclick?.(item, { keyboard: e.detail === 0 })}
        oncontextmenu={(e) => {
          e.preventDefault()
          onitemcontext?.(item, { x: e.clientX, y: e.clientY })
        }}
        onkeydown={(e) => {
          if (e.key !== 'ContextMenu' && !(e.key === 'F10' && e.shiftKey)) return
          e.preventDefault()
          const r = e.currentTarget.getBoundingClientRect()
          onitemcontext?.(item, { x: r.left, y: r.top })
        }}
      >
        {#if item.iconSnippet}{@render item.iconSnippet()}{:else if item.icon}<Icon name={item.icon} size={28} />{/if}
      </button>
    {/each}
  </div>
  <div class="tray" data-testid="taskbar-tray" data-region="tray">
    {@render tray?.()}
    <span class="clock" data-testid="taskbar-clock" role="timer" aria-label="{time} {date}">{time}<br />{date}</span>
  </div>
</div>

<style>
  .w7-taskbar {
    flex: none;
    height: 40px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px 0 6px;
    position: relative;
    isolation: isolate;
    border-top: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
    font: var(--w7-font);
    color: #000;
    user-select: none;
  }
  /* A layer, not a backdrop-filter on the bar: that would make the bar the containing block of fixed popups (the USB menu). */
  .w7-taskbar::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--w7-taskbar-face);
    backdrop-filter: var(--w7-glass-blur);
    pointer-events: none;
  }
  .strip {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .orb {
    position: relative;
    flex: none;
    width: 40px;
    height: 40px;
    margin: -3px 2px -3px 0;
    padding: 0;
    border-radius: 50%;
    border: 1px solid rgba(8, 24, 52, 0.9);
    background: radial-gradient(circle at 50% 120%, rgba(120, 220, 255, 0.95) 0, rgba(40, 130, 220, 0.9) 35%, rgba(12, 52, 112, 0.95) 75%),
      #0a2f66;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45), inset 0 -6px 10px rgba(100, 210, 255, 0.45), 0 0 6px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
  }
  .orb-gloss {
    position: absolute;
    left: 5px;
    right: 5px;
    top: 2px;
    height: 17px;
    border-radius: 50% 50% 46% 46%;
    background: linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.08));
    pointer-events: none;
  }
  .orb:hover,
  .orb.open {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6), inset 0 -6px 12px rgba(150, 235, 255, 0.85), 0 0 12px rgba(150, 220, 255, 0.95);
  }
  .orb:active {
    filter: brightness(0.9);
  }
  .task {
    position: relative;
    flex: none;
    width: 50px;
    height: 38px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 3px;
    border: 1px solid transparent;
    background: transparent;
    color: #000;
    font: inherit;
    cursor: default;
  }
  /* A running app gets the glass frame; the focused one is brighter. Pinned launchers have none until hovered. */
  .task.running {
    border-color: rgba(255, 255, 255, 0.4);
    background: var(--w7-taskbtn-face);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18), inset 0 -2px 0 rgba(160, 215, 255, 0.55);
  }
  .task.running.active {
    border-color: rgba(255, 255, 255, 0.7);
    background: linear-gradient(rgba(255, 255, 255, 0.6), rgba(210, 232, 252, 0.28) 50%, rgba(170, 210, 245, 0.3));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), inset 0 -2px 0 rgba(190, 230, 255, 0.85);
  }
  .task.flashing {
    animation: task-flash 1s steps(1, end) infinite;
  }
  @keyframes task-flash {
    0%,
    100% {
      background: linear-gradient(rgba(255, 214, 120, 0.95), rgba(255, 170, 40, 0.8) 55%, rgba(240, 140, 20, 0.75));
      border-color: #fff3c4;
    }
    50% {
      background: var(--w7-taskbtn-face);
      border-color: rgba(255, 255, 255, 0.4);
    }
  }
  .task:hover {
    border-color: rgba(255, 255, 255, 0.75);
    background: radial-gradient(ellipse at 50% 100%, rgba(190, 235, 255, 0.8), rgba(255, 255, 255, 0.18) 70%),
      linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.12));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 0 4px rgba(255, 255, 255, 0.3);
  }
  .task:active {
    background: linear-gradient(rgba(120, 160, 205, 0.6), rgba(150, 190, 235, 0.45));
  }
  /* A dotted ring in black on white, so it shows (3:1) on the light glass and on the dark one. */
  .orb:focus-visible,
  .task:focus-visible {
    outline: 1px dotted #000;
    outline-offset: -3px;
    box-shadow: 0 0 0 1px #fff, inset 0 0 0 2px rgba(255, 255, 255, 0.9);
  }
  .tray {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .clock {
    text-align: center;
    color: #fff;
    font-size: 12px;
    line-height: 1.25;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.7);
  }
</style>
