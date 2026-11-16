<script module lang="ts">
  import type { Snippet } from 'svelte'
  import type { IconName } from '../atoms/icons'

  export interface TaskbarItem {
    id: string
    title: string
    icon?: IconName
    /** Custom 22px icon art; wins over `icon`. */
    iconSnippet?: Snippet
    /** Pinned buttons show only the icon. */
    pinned?: boolean
    /** A window of this app is open (pinned items without it are plain launchers). */
    running?: boolean
    /** This item's window has focus. */
    active?: boolean
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
    onitemclick?: (item: TaskbarItem) => void
    class?: string
  }

  let { items = [], clock, tray, startOpen = false, onstart, onitemclick, class: className = '' }: Props = $props()

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
<div class="w7-taskbar {className}" role="toolbar" aria-label="Taskbar" tabindex="-1" onkeydown={onKeydown}>
  <div class="strip" bind:this={strip}>
    <button type="button" class="orb" class:open={startOpen} aria-label="Start" aria-haspopup="menu" aria-expanded={startOpen} onclick={() => onstart?.()}>
      <span class="orb-gloss"></span>
      <Icon name="agent7" size={22} />
    </button>
    {#each items as item (item.id)}
      <button
        type="button"
        class="task"
        class:pinned={item.pinned && !item.running}
        class:running={item.running}
        class:active={item.active}
        aria-label={item.title}
        aria-pressed={item.running ? !!item.active : undefined}
        title={item.title}
        onclick={() => onitemclick?.(item)}
      >
        {#if item.iconSnippet}{@render item.iconSnippet()}{:else if item.icon}<Icon name={item.icon} size={item.pinned && !item.running ? 22 : 18} />{/if}
        {#if item.running && !item.pinned}<span class="label">{item.title}</span>{/if}
      </button>
    {/each}
  </div>
  <div class="tray">
    {@render tray?.()}
    <span class="clock" role="timer" aria-label="{time} {date}">{time}<br />{date}</span>
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
    background: var(--w7-taskbar-face);
    border-top: 1px solid rgba(255, 255, 255, 0.55);
    font: var(--w7-font);
    color: #000;
    user-select: none;
  }
  .strip {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .orb {
    position: relative;
    flex: none;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid #0a2a58;
    background: radial-gradient(circle at 50% 22%, #c4e8ff 0, #4a9be6 38%, #14509a 70%, #0a2f66 100%);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 0 6px rgba(120, 190, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
  }
  .orb-gloss {
    position: absolute;
    left: 6px;
    right: 6px;
    top: 2px;
    height: 14px;
    border-radius: 50%;
    background: linear-gradient(rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0));
    pointer-events: none;
  }
  .orb:hover,
  .orb.open {
    background: radial-gradient(circle at 50% 22%, #e2f4ff 0, #7bbcf5 38%, #2a70c4 70%, #0f3f80 100%);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 0 10px rgba(160, 220, 255, 0.95);
  }
  .orb:active {
    filter: brightness(0.85);
  }
  .task {
    flex: none;
    height: 34px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 9px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: linear-gradient(rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04));
    color: #000;
    font: inherit;
    cursor: default;
    overflow: hidden;
  }
  .task.pinned {
    width: 46px;
    justify-content: center;
    padding: 0;
  }
  .task.running {
    width: 130px;
    min-width: 46px;
    border-color: rgba(255, 255, 255, 0.65);
    background: var(--w7-taskbtn-face);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  }
  .task.running.active {
    border-color: rgba(255, 255, 255, 0.8);
    background: linear-gradient(rgba(255, 255, 255, 0.72), rgba(200, 228, 252, 0.45) 50%, rgba(160, 205, 245, 0.42));
  }
  .task:hover {
    border-color: rgba(255, 255, 255, 0.85);
    background: radial-gradient(ellipse at 50% 100%, rgba(190, 235, 255, 0.85), rgba(255, 255, 255, 0.28) 70%),
      linear-gradient(rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.2));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45), 0 0 4px rgba(255, 255, 255, 0.35);
  }
  .task:active {
    background: linear-gradient(rgba(120, 160, 205, 0.7), rgba(150, 190, 235, 0.55));
  }
  .orb:focus-visible,
  .task:focus-visible {
    outline: 1px dotted #fff;
    outline-offset: -3px;
  }
  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    line-height: 1.25;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.7);
  }
</style>
