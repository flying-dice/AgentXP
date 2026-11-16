<script lang="ts">
  /**
   * The sticky notes of the desktop: drawn between the wallpaper icons and the windows. Visible only while
   * the Sticky Notes app is open (tools follow apps), like every other agent capability.
   */
  import { onDestroy, untrack } from 'svelte'
  import type { Id } from '@shared/models'
  import type { StickyNoteDto } from '@shared/desktop'
  import StickyNote from '../apps/sticky-notes/StickyNote.svelte'
  import { followNotes } from '../apps/sticky-notes/followNotes'
  import type { DesktopController } from './DesktopController.svelte'
  import { KeyedDebouncer } from './debounce'

  interface Props {
    desktop: DesktopController
  }

  let { desktop }: Props = $props()

  const TEXT_DEBOUNCE_MS = 500

  let layer: HTMLDivElement | undefined = $state()
  let notes = $state.raw<StickyNoteDto[]>([])
  const order = $state<Id[]>([])

  const open = $derived(desktop.state.windows.some((w) => w.app === 'sticky-notes'))
  const desktopId = $derived(desktop.state.desktopId)

  $effect(() => {
    if (!open || !desktopId) {
      notes = []
      return
    }
    return followNotes(desktop.api, desktopId, (list) => (notes = list))
  })

  // Plan notes follow the tasks of their chat: make sure the chat has a store.
  $effect(() => {
    for (const n of notes) if (n.planSessionId !== null) untrack(() => desktop.inbox.storeFor(n.planSessionId!))
  })

  const tasksOf = (id: Id | null) => (id === null ? [] : (desktop.inbox.stores.get(id)?.state.tasks ?? []))
  const chatTitleOf = (id: Id | null): string | undefined => (id === null ? undefined : (desktop.sessions.byId(id)?.title ?? desktop.inbox.stores.get(id)?.state.session.title))

  const area = (): { width: number; height: number } => {
    const r = layer?.getBoundingClientRect()
    return { width: r?.width ?? 1200, height: r?.height ?? 700 }
  }

  const saver = new KeyedDebouncer<Id, Partial<Pick<StickyNoteDto, 'text'>>>(TEXT_DEBOUNCE_MS, (id, patch) => void desktop.api.notes.update(id, patch).catch(() => {}))
  onDestroy(() => {
    saver.flushAll()
    saver.dispose()
  })

  function patch(note: StickyNoteDto, change: Partial<Pick<StickyNoteDto, 'text' | 'color' | 'bounds'>>): void {
    // Show the change at once; the backend echoes it through notes.changed.
    notes = notes.map((n) => (n.id === note.id ? { ...n, ...change } : n))
    if (Object.keys(change).length === 1 && 'text' in change) saver.push(note.id, { text: change.text })
    else {
      saver.flush(note.id)
      void desktop.api.notes.update(note.id, change).catch(() => {})
    }
  }

  function raise(id: Id): void {
    const at = order.indexOf(id)
    if (at >= 0) order.splice(at, 1)
    order.push(id)
  }

  const zOf = (id: Id): number => order.indexOf(id) + 1

  async function add(): Promise<void> {
    const created = await desktop.api.notes.add(desktopId, '')
    raise(created.id)
  }

  async function remove(id: Id): Promise<void> {
    saver.cancel(id)
    notes = notes.filter((n) => n.id !== id)
    await desktop.api.notes.remove(id).catch(() => {})
  }
</script>

{#if open}
  <div class="notes" data-testid="sticky-notes-layer" bind:this={layer} role="region" aria-label="Sticky notes">
    {#each notes as note (note.id)}
      <StickyNote
        {note}
        tasks={tasksOf(note.planSessionId)}
        chatTitle={chatTitleOf(note.planSessionId)}
        z={zOf(note.id)}
        {area}
        onpatch={(change) => patch(note, change)}
        onadd={() => void add()}
        onremove={() => void remove(note.id)}
        onfront={() => raise(note.id)}
      />
    {/each}
  </div>
{/if}

<style>
  .notes {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
</style>
