<script lang="ts" generics="T extends TabDef">
  import TabHeader from '../molecules/TabHeader.svelte'
  import type { TabControlProps, TabDef } from './TabControl'

  let { tabs, selected = $bindable(), panel, class: className = '', 'aria-label': ariaLabel, onchange }: TabControlProps<T> = $props()

  const uid = $props.id()
  let tablist = $state<HTMLElement | null>(null)

  const current = $derived(tabs.find((t) => t.id === selected && !t.disabled) ?? tabs.find((t) => !t.disabled))
  const enabled = $derived(tabs.filter((t) => !t.disabled))

  function select(id: string, focus = false): void {
    if (id !== selected) {
      selected = id
      onchange?.(id)
    }
    if (focus) queueMicrotask(() => tablist?.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-tab-${id}`)}`)?.focus())
  }

  function move(step: number, focus: boolean): void {
    const at = enabled.findIndex((t) => t.id === current?.id)
    const next = enabled[(at + step + enabled.length) % enabled.length]
    if (next) select(next.id, focus)
  }

  /** Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+PageUp/Down anywhere in the control. */
  function onControlKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey || event.altKey) return
    if (event.key === 'Tab') move(event.shiftKey ? -1 : 1, true)
    else if (event.key === 'PageDown') move(1, true)
    else if (event.key === 'PageUp') move(-1, true)
    else return
    event.preventDefault()
  }

  function onTabsKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey) return
    if (event.key === 'ArrowRight') move(1, true)
    else if (event.key === 'ArrowLeft') move(-1, true)
    else if (event.key === 'Home') select(enabled[0]?.id, true)
    else if (event.key === 'End') select(enabled[enabled.length - 1]?.id, true)
    else return
    event.preventDefault()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="xp-tabcontrol {className}" onkeydown={onControlKeydown}>
  <div bind:this={tablist} class="tabs" role="tablist" tabindex="-1" aria-label={ariaLabel} onkeydown={onTabsKeydown}>
    {#each tabs as tab (tab.id)}
      <TabHeader
        id="{uid}-tab-{tab.id}"
        controls="{uid}-panel-{tab.id}"
        title={tab.title}
        icon={tab.icon}
        disabled={tab.disabled}
        selected={tab.id === current?.id}
        onclick={() => select(tab.id)}
      />
    {/each}
  </div>
  {#if current}
    <div
      class="page"
      id="{uid}-panel-{current.id}"
      role="tabpanel"
      aria-labelledby="{uid}-tab-{current.id}"
      tabindex="-1"
    >
      {@render panel(current)}
    </div>
  {/if}
</div>

<style>
  .xp-tabcontrol {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .tabs {
    flex: none;
    display: flex;
    padding-left: 3px;
    outline: none;
  }
  .page {
    flex: 1;
    min-height: 0;
    min-width: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--xp-window);
    border: 1px solid var(--xp-panel-border);
    outline: none;
  }
</style>
