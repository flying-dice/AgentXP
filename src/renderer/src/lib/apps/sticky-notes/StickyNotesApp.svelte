<script lang="ts">
  import type { SessionDto } from '@shared/models'
  import type { StickyColor, StickyNoteDto } from '@shared/desktop'
  import type { AppProps } from '../types'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import ToolStripDropDownButton from '../../kit/molecules/ToolStripDropDownButton.svelte'
  import type { MenuItemDef } from '../../kit/molecules/MenuItem'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import ToolStrip from '../../kit/organisms/ToolStrip.svelte'
  import { followNotes } from './followNotes'
  import { NOTE_THEME, STICKY_COLORS, noteTitle } from './noteModel'

  let { host }: AppProps<'sticky-notes'> = $props()

  let notes = $state.raw<StickyNoteDto[]>([])
  let sessions = $state.raw<SessionDto[]>([])
  let color = $state<StickyColor>('yellow')
  let selected = $state<number | null>(null)

  const desktopId = $derived(host.state.desktopId)

  $effect(() => followNotes(host.api, desktopId, (list) => (notes = list)))
  $effect(() => {
    let stale = false
    host.api.sessions.list(host.state.folder.id).then((list) => !stale && (sessions = list), () => {})
    return () => {
      stale = true
    }
  })

  const chatTitle = (id: number | null): string | undefined => sessions.find((s) => s.id === id)?.title

  async function addNote(): Promise<void> {
    const note = await host.api.notes.add(desktopId, '', color)
    selected = note.id
  }

  async function addPlan(session: SessionDto): Promise<void> {
    const note = await host.api.notes.add(desktopId, '', 'blue')
    await host.api.notes.update(note.id, { planSessionId: session.id })
    selected = note.id
  }

  const colorItems = $derived<MenuItemDef[]>(STICKY_COLORS.map((c) => ({ label: NOTE_THEME[c].label, radio: true, checked: color === c, action: () => (color = c) })))
  const planItems = $derived<MenuItemDef[]>(
    sessions.length === 0 ? [{ label: '(no chats yet)', disabled: true }] : sessions.map((s) => ({ label: s.title || 'New chat', icon: 'tasks', action: () => void addPlan(s) }))
  )
</script>

<div class="sn">
  <ToolStrip aria-label="Sticky Notes">
    <ToolStripButton icon="plus" text="New note" onclick={() => void addNote()} />
    <ToolStripDropDownButton text="Color" items={colorItems} />
    <ToolStripDropDownButton icon="tasks" text="Plan note" items={planItems} />
  </ToolStrip>
  <div class="list w7-scroll" role="list" aria-label="Notes">
    {#each notes as note (note.id)}
      <div class="row" role="listitem" class:sel={selected === note.id}>
        <button type="button" class="pick" onclick={() => (selected = note.id)}>
          <span class="swatch" style:background={NOTE_THEME[note.color].paper} style:border-color={NOTE_THEME[note.color].border}></span>
          <span class="title">{noteTitle(note, chatTitle(note.planSessionId))}</span>
          {#if note.author === 'agent'}<span class="by">Agent7</span>{/if}
        </button>
        <button type="button" class="del" aria-label="Delete note" title="Delete note" onclick={() => void host.api.notes.remove(note.id)}>×</button>
      </div>
    {:else}
      <p class="empty">There are no notes. Choose New note to stick one on the desktop.</p>
    {/each}
  </div>
  <p class="hint">Notes show on the desktop, and the agent can read and write them, only while Sticky Notes is open.</p>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text="{notes.length} note{notes.length === 1 ? '' : 's'}" spring />
  </StatusStrip>
</div>

<style>
  .sn {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
  }
  .list {
    flex: 1;
    min-height: 0;
    margin: 6px;
    overflow: auto;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .row {
    display: flex;
    align-items: center;
    border: 1px solid transparent;
  }
  .row.sel {
    border-color: var(--w7-select-border);
    background: var(--w7-select-face);
  }
  .row:hover:not(.sel) {
    border-color: var(--w7-hot-border);
    background: var(--w7-hot-face);
  }
  .pick {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: default;
  }
  .swatch {
    flex: none;
    width: 14px;
    height: 14px;
    border: 1px solid;
    box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.25);
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .by {
    color: var(--w7-text-muted);
    font-size: 11px;
  }
  .del {
    width: 22px;
    height: 20px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    font: 700 15px/16px 'Segoe UI', sans-serif;
    color: #6a6a6a;
    cursor: default;
  }
  .del:hover {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
    color: #000;
  }
  .empty {
    margin: 0;
    padding: 10px;
    color: var(--w7-text-muted);
  }
  .hint {
    flex: none;
    margin: 0;
    padding: 0 8px 6px;
    color: var(--w7-text-muted);
    font-size: 11px;
  }
</style>
