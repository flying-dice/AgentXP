<script lang="ts">
  /** The Win7 Explorer address bar: a breadcrumb trail that turns into a text box when you click past it (or press F4). */
  import { tick } from 'svelte'
  import { parseVPath, type DriveDto, type VPath } from '@shared/vfs'
  import type { IconName } from '../../kit/atoms/icons'
  import Icon from '../../kit/atoms/Icon.svelte'
  import { breadcrumbs } from './explorerModel'

  interface Props {
    /** The current location; '' is Computer. */
    path: VPath | ''
    drives: DriveDto[]
    /** A crumb was clicked. */
    onnavigate?: (path: VPath | '') => void
    /** Enter in the text box. */
    onsubmit?: (text: string) => void
  }

  let { path, drives, onnavigate, onsubmit }: Props = $props()

  const crumbs = $derived(breadcrumbs(path, drives))
  const text = $derived(path === '' ? 'Computer' : path)
  const icon = $derived<IconName>(
    path === '' ? 'computer' : crumbs.length > 2 ? 'folder' : drives.find((d) => d.letter === parseVPath(path)?.drive)?.kind === 'removable' ? 'usb' : 'drive'
  )
  let editing = $state(false)
  let draft = $state('')
  let input = $state<HTMLInputElement | null>(null)

  async function edit(): Promise<void> {
    draft = text
    editing = true
    await tick()
    input?.focus()
    input?.select()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'F4' && !editing) {
      event.preventDefault()
      void edit()
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="address" data-testid="explorer-address" data-path={path} class:editing role="group" aria-label="Address" onkeydown={onKeydown}>
  <Icon name={icon} />
  {#if editing}
    <form
      class="edit"
      onsubmit={(event) => {
        event.preventDefault()
        editing = false
        onsubmit?.(draft)
      }}
    >
      <input
        bind:this={input}
        class="field"
        data-testid="explorer-address-field"
        bind:value={draft}
        aria-label="Address"
        spellcheck="false"
        onblur={() => (editing = false)}
        onkeydown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            editing = false
          }
        }}
      />
    </form>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="trail" role="presentation" onclick={(event) => event.target === event.currentTarget && void edit()}>
      {#each crumbs as crumb, i (crumb.path || 'computer')}
        {#if i > 0}<span class="sep" aria-hidden="true">&#9656;</span>{/if}
        <button type="button" class="crumb" data-testid="explorer-crumb" aria-current={i === crumbs.length - 1 ? 'location' : undefined} onclick={() => onnavigate?.(crumb.path)}>{crumb.label}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .address {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    margin: 0 4px;
    padding: 0 4px;
    background: var(--w7-window);
    border: 1px solid var(--w7-input-border);
    border-top-color: var(--w7-input-border-top);
  }
  .address.editing {
    border-color: #3399ff;
  }
  .trail {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    cursor: text;
  }
  .crumb {
    flex: none;
    height: 18px;
    padding: 0 3px;
    border: 1px solid transparent;
    background: transparent;
    font: inherit;
    cursor: default;
  }
  .crumb:hover {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .crumb:active {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
  }
  .sep {
    flex: none;
    font-size: 8px;
    color: #55627a;
    padding: 0 1px;
  }
  .edit {
    flex: 1;
    min-width: 0;
    display: flex;
  }
  .field {
    flex: 1;
    min-width: 0;
    height: 18px;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    user-select: text;
    cursor: text;
  }
</style>
