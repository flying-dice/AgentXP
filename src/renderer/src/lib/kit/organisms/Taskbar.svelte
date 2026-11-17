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
        data-accent={item.icon}
        class:pinned={item.pinned && !item.running}
        class:running={item.running}
        class:active={item.active}
        class:flashing={item.flashing && !item.active}
        data-flashing={item.flashing && !item.active ? 'true' : 'false'}
        aria-label={item.title}
        aria-pressed={item.running ? !!item.active : undefined}
        title={item.title}
        onpointermove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
        }}
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
    padding: 0 8px 0 4px;
    position: relative;
    isolation: isolate;
    font: var(--w7-font);
    color: #000;
    user-select: none;
  }
  /* The Aero glass: a layer, not a backdrop-filter on the bar (that would make the bar the containing block of fixed popups, e.g. the USB menu).
     Wallpaper blurs through a dark tint; the upper half is lighter than the lower one; a diagonal sheen crosses it; a bright hairline caps the top. */
  .w7-taskbar::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(105deg, transparent 0, rgba(255, 255, 255, 0.2) 18%, rgba(255, 255, 255, 0.04) 34%, transparent 35%, transparent 60%, rgba(255, 255, 255, 0.1) 78%, transparent 100%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.34) 0, rgba(255, 255, 255, 0.1) 48%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.18) 100%),
      var(--w7-taskbar-face);
    backdrop-filter: var(--w7-glass-blur);
    border-top: 1px solid rgba(255, 255, 255, 0.7);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      inset 0 0 0 1px rgba(0, 0, 0, 0.22),
      0 -1px 0 rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }
  .strip {
    align-self: stretch;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  /* The Start orb: a glass sphere rising above the bar, with the Agent7 squares inside. */
  .orb {
    position: relative;
    flex: none;
    width: 46px;
    height: 46px;
    align-self: flex-end;
    margin: 0 4px 0 0;
    padding: 0;
    border-radius: 50%;
    border: 0;
    background:
      radial-gradient(circle at 50% 108%, rgba(140, 240, 255, 0.95) 0, rgba(60, 170, 235, 0.75) 38%, rgba(20, 80, 160, 0) 68%),
      radial-gradient(circle at 50% 30%, #3d86d1 0, #1b4f9a 55%, #0b2c63 100%);
    box-shadow:
      0 0 0 1px rgba(2, 10, 28, 0.95),
      0 0 0 2px rgba(255, 255, 255, 0.28),
      inset 0 0 0 1px rgba(190, 235, 255, 0.55),
      inset 0 -7px 12px rgba(110, 225, 255, 0.5),
      0 2px 7px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    transition: box-shadow 0.15s, filter 0.15s;
  }
  .orb :global(svg) {
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 1px 2px rgba(0, 20, 60, 0.7));
  }
  /* Upper glare. */
  .orb-gloss {
    position: absolute;
    left: 6px;
    right: 6px;
    top: 2px;
    height: 19px;
    border-radius: 50% 50% 55% 55% / 80% 80% 40% 40%;
    background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.12));
    pointer-events: none;
  }
  /* Lower rim light. */
  .orb::after {
    content: '';
    position: absolute;
    left: 11px;
    right: 11px;
    bottom: 2px;
    height: 9px;
    border-radius: 50%;
    background: radial-gradient(ellipse at 50% 100%, rgba(200, 250, 255, 0.85), rgba(200, 250, 255, 0) 70%);
    pointer-events: none;
  }
  .orb:hover,
  .orb.open {
    filter: brightness(1.12) saturate(1.15);
    box-shadow:
      0 0 0 1px rgba(2, 10, 28, 0.95),
      0 0 0 2px rgba(255, 255, 255, 0.45),
      inset 0 0 0 1px rgba(220, 245, 255, 0.8),
      inset 0 -8px 14px rgba(150, 240, 255, 0.85),
      0 0 14px 3px rgba(120, 210, 255, 0.85);
  }
  .orb.open {
    filter: brightness(1.2) saturate(1.2);
  }
  .orb:active {
    filter: brightness(0.88);
  }
  .task {
    position: relative;
    flex: none;
    width: 52px;
    height: 38px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    color: #000;
    font: inherit;
    cursor: default;
    --glow: 120, 190, 255;
    --mx: 50%;
  }
  .task[data-accent='folder'] {
    --glow: 255, 205, 90;
  }
  .task[data-accent='claude'] {
    --glow: 255, 150, 90;
  }
  .task[data-accent='terminal'] {
    --glow: 190, 200, 215;
  }
  /* Glass button: a dark outer ring, a bright inner ring, a glossy upper half. */
  .task.running {
    border-color: rgba(8, 18, 36, 0.7);
    background:
      linear-gradient(rgba(255, 255, 255, 0.34) 0, rgba(255, 255, 255, 0.1) 49%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.14) 100%);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.4),
      inset 0 -6px 8px -4px rgba(var(--glow), 0.5);
  }
  .task.running.active {
    background:
      radial-gradient(ellipse at var(--mx) 100%, rgba(var(--glow), 0.75), rgba(var(--glow), 0) 75%),
      linear-gradient(rgba(255, 255, 255, 0.55) 0, rgba(255, 255, 255, 0.24) 49%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.3) 100%);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.65),
      inset 0 -8px 10px -4px rgba(var(--glow), 0.8);
  }
  .task.flashing {
    animation: task-flash 1s steps(1, end) infinite;
  }
  @keyframes task-flash {
    0%,
    100% {
      background: linear-gradient(rgba(255, 220, 140, 0.95), rgba(255, 170, 40, 0.8) 50%, rgba(240, 130, 10, 0.8));
      border-color: #5a3200;
      box-shadow: inset 0 0 0 1px rgba(255, 245, 200, 0.8);
    }
    50% {
      background: var(--w7-taskbtn-face);
      border-color: rgba(8, 18, 36, 0.7);
    }
  }
  /* Hover: a light follows the pointer, in the colour of the icon. */
  .task:hover {
    border-color: rgba(8, 18, 36, 0.7);
    background:
      radial-gradient(ellipse 60% 90% at var(--mx) 100%, rgba(var(--glow), 0.85), rgba(var(--glow), 0) 100%),
      linear-gradient(rgba(255, 255, 255, 0.42) 0, rgba(255, 255, 255, 0.14) 49%, rgba(255, 255, 255, 0.04) 50%, rgba(255, 255, 255, 0.16) 100%);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.55),
      0 0 6px rgba(var(--glow), 0.5);
  }
  .task:active {
    background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(var(--glow), 0.3));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3), inset 0 2px 5px rgba(0, 0, 0, 0.5);
  }
  /* A dotted ring in black on white, so it shows (3:1) on the light glass and on the dark one. */
  .orb:focus-visible,
  .task:focus-visible {
    outline: 2px dotted #000;
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
