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
<div class="xp-taskbar {className}" data-testid="taskbar" role="toolbar" aria-label="Taskbar" tabindex="-1" onkeydown={onKeydown}>
  <div class="strip" bind:this={strip} data-region="taskbar">
    <button type="button" class="orb" data-testid="taskbar-start" class:open={startOpen} aria-label="Start" aria-haspopup="menu" aria-expanded={startOpen} onclick={() => onstart?.()}>
      <Icon name="agentxp" size={22} />
      <span class="start-text">start</span>
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
        {#if item.iconSnippet}{@render item.iconSnippet()}{:else if item.icon}<Icon name={item.icon} size={16} />{/if}
        {#if !(item.pinned && !item.running)}<span class="label">{item.title}</span>{/if}
      </button>
    {/each}
  </div>
  <div class="tray" data-testid="taskbar-tray" data-region="tray">
    {@render tray?.()}
    <span class="clock" data-testid="taskbar-clock" role="timer" aria-label="{time} {date}">{time}</span>
  </div>
</div>

<style>
  /* The XP taskbar: a Luna blue bar, a green Start button, wide task buttons with icon and title, a tray at the right. */
  .xp-taskbar {
    flex: none;
    height: 30px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0;
    position: relative;
    background: var(--xp-taskbar-face);
    font: var(--xp-font);
    color: #fff;
    user-select: none;
  }
  .strip {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 3px;
    padding-right: 6px;
  }
  .orb {
    position: relative;
    flex: none;
    width: 100px;
    height: 100%;
    margin: 0 8px 0 0;
    padding: 0 14px 0 8px;
    border: 0;
    border-radius: 0 12px 12px 0;
    background: var(--xp-start-green);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2), inset -2px 0 3px rgba(0, 0, 0, 0.35), 2px 0 3px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    color: #fff;
    cursor: default;
  }
  .start-text {
    font: italic 900 20px/1 Tahoma, 'Trebuchet MS', 'Segoe UI', sans-serif;
    letter-spacing: -0.5px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
  }
  .orb:hover {
    background: var(--xp-start-green-hover);
  }
  .orb.open,
  .orb:active {
    background: linear-gradient(180deg, #2a7a2a 0, #2f8a2f 40%, #3c963c 100%);
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.5);
  }
  .task {
    position: relative;
    flex: 0 1 160px;
    width: 160px;
    min-width: 36px;
    height: 24px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 5px;
    padding: 0 8px;
    border-radius: 2px;
    border: 1px solid transparent;
    background: transparent;
    color: #fff;
    font: inherit;
    cursor: default;
    overflow: hidden;
  }
  .task .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .task.pinned {
    flex: none;
    width: 26px;
    padding: 0;
    justify-content: center;
  }
  .task.running {
    border-color: #1e3f9a;
    background: var(--xp-taskbtn-face);
    box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.25);
  }
  .task.running.active {
    background: linear-gradient(180deg, #1e52b7 0, #1a46a0 100%);
    border-color: #0b2a78;
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.45);
    font-weight: bold;
  }
  .task.flashing {
    animation: task-flash 1s steps(1, end) infinite;
  }
  @keyframes task-flash {
    0%,
    100% {
      background: linear-gradient(#f9b84a, #e08a1a);
      border-color: #a35a00;
    }
    50% {
      background: var(--xp-taskbtn-face);
      border-color: #1e3f9a;
    }
  }
  .task:hover:not(.active) {
    background: linear-gradient(180deg, #6ba0f6 0, #4a88ee 10%, #3a78e0 100%);
    border-color: #1e3f9a;
  }
  .orb:focus-visible,
  .task:focus-visible {
    outline: 1px dotted #fff;
    outline-offset: -3px;
  }
  .tray {
    flex: none;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px 0 14px;
    border-left: 1px solid #0c3d99;
    background: var(--xp-tray-face);
    box-shadow: inset 1px 0 1px #3fb4f5;
  }
  .clock {
    text-align: right;
    color: #fff;
    font-size: 11px;
    line-height: 1.1;
    white-space: nowrap;
  }
</style>
