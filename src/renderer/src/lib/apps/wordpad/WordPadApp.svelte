<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { AppProps } from '../types'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import type { MenuItemDef } from '../../kit/molecules/MenuItem'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import MarkdownView from '../../kit/organisms/MarkdownView.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import ToolStrip from '../../kit/organisms/ToolStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { registerAppRequestHandler } from '../appRequests'
  import OpenFileDialog from '../shared/OpenFileDialog.svelte'
  import { joinVPath, normaliseVPath, vpathName, vpathParent } from '@shared/vfs'
  import { errorText } from '../shared/listing'
  import { ViewSync } from '../viewSync'
  import { headingAtLine, insertLink, lineOf, toggleBullets, toggleCode, toggleHeading, toggleNumbers, wrapSelection, type Edit } from './markdownEdit'

  let { window: win, host, focused }: AppProps<'wordpad'> = $props()

  let path = $state<string | null>(null)
  let text = $state('')
  let original = $state('')
  // svelte-ignore state_referenced_locally
  let mode = $state<'read' | 'edit'>(win.view.mode)
  let message = $state('')
  let picking = $state(false)
  let saveAs = $state<string | null>(null)
  let area = $state<HTMLTextAreaElement | null>(null)
  let reader = $state<HTMLDivElement | null>(null)
  let heading = $state<string | null>(null)
  let caretLine = $state(1)
  let menuOpen = $state(false)
  let menuX = $state(0)
  let menuY = $state(0)

  const dirty = $derived(text !== original)
  const sync = new ViewSync<{ path: string | null; mode: string }>((v) => JSON.stringify([v.path, v.mode]))
  let lastReport = ''

  function report(): void {
    const view = { app: 'wordpad' as const, path, mode, dirty, visibleHeading: heading }
    const key = JSON.stringify([path, mode, dirty, heading])
    sync.mark({ path, mode })
    if (key === lastReport) return
    lastReport = key
    host.updateView(win.id, view)
  }

  async function load(target: string | null): Promise<void> {
    path = target
    heading = null
    if (target === null) {
      text = original = ''
      message = ''
    } else {
      try {
        text = original = await host.api.vfs.readFile(host.state.desktopId, target)
        message = ''
      } catch (error) {
        text = original = ''
        message = errorText(error)
      }
    }
    await tick()
    updateHeading()
    report()
  }

  // The agent opens another file or switches the mode.
  $effect(() => {
    const view = win.view
    if (!sync.isExternal({ path: view.path, mode: view.mode })) return
    untrack(() => {
      if (view.path !== path) void load(view.path)
      if (view.mode !== mode) setMode(view.mode)
    })
  })

  $effect(() => {
    void [dirty, heading, mode, path]
    untrack(report)
  })

  $effect(() => {
    if (focused) untrack(() => (mode === 'edit' ? area : reader)?.focus())
  })

  async function handle(method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case 'read':
        return { path, text, mode, dirty }
      case 'open': {
        const target = (params as { path?: unknown } | null)?.path
        if (typeof target !== 'string') throw new Error('params.path must be a string')
        const vpath = normaliseVPath(target)
        if (!vpath) throw new Error('params.path must be an absolute path such as E:\\README.md')
        await load(vpath)
        return { ok: true }
      }
      case 'write': {
        const next = (params as { text?: unknown } | null)?.text
        if (typeof next !== 'string') throw new Error('params.text must be a string')
        text = next
        return { ok: true, length: next.length }
      }
      default:
        throw new Error(`WordPad does not know "${method}". Use read, open or write.`)
    }
  }
  $effect(() => registerAppRequestHandler(win.id, handle))

  function updateHeading(): void {
    if (mode === 'edit') {
      heading = headingAtLine(text, caretLine)
      return
    }
    if (!reader) return
    const top = reader.scrollTop + 8
    const base = reader.getBoundingClientRect().top - reader.scrollTop
    let found: string | null = null
    for (const h of reader.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')) {
      if (h.getBoundingClientRect().top - base <= top) found = h.textContent?.trim() ?? null
      else break
    }
    heading = found
  }

  function setMode(next: 'read' | 'edit'): void {
    mode = next
    void tick().then(() => {
      if (next === 'edit') area?.focus()
      updateHeading()
    })
  }

  function format(fn: (t: string, s: number, e: number) => Edit): void {
    if (!area || mode !== 'edit') return
    const edit = fn(text, area.selectionStart, area.selectionEnd)
    text = edit.text
    void tick().then(() => {
      area?.focus()
      area?.setSelectionRange(edit.start, edit.end)
      updateCaret()
    })
  }

  function updateCaret(): void {
    if (!area) return
    const line = lineOf(text, area.selectionStart)
    if (line !== caretLine) {
      caretLine = line
      updateHeading()
    }
  }

  async function confirmDiscard(): Promise<boolean> {
    if (!dirty) return true
    const answer = await showMessageBox({ text: `The text in ${path ? vpathName(path) : 'the document'} has changed.\n\nDo you want to discard the changes?`, caption: 'WordPad', buttons: 'YesNo', icon: 'warning' })
    return answer === 'yes'
  }

  async function save(): Promise<void> {
    if (path === null) {
      saveAs = 'Document.md'
      return
    }
    try {
      await host.api.vfs.writeFile(host.state.desktopId, path, text)
      original = text
      message = `Saved ${vpathName(path)}`
    } catch (error) {
      await showMessageBox({ text: errorText(error), caption: 'WordPad', buttons: 'OK', icon: 'error' })
    }
  }

  async function finishSaveAs(result: DialogResult): Promise<void> {
    const name = saveAs?.trim() ?? ''
    if (result !== 'ok') {
      saveAs = null
      return
    }
    if (!name || /[\\/:*?"<>|]/.test(name)) {
      await showMessageBox({ text: 'The file name is not valid.', caption: 'WordPad', buttons: 'OK', icon: 'error' })
      return
    }
    saveAs = null
    path = joinVPath(host.state.home, 'Documents', name)
    await save()
  }

  function followLink(href: string): void {
    if (/^[a-z]+:/i.test(href) || href.startsWith('#')) return
    const target = joinVPath(vpathParent(path ?? '') ?? joinVPath(host.state.home, 'Documents') ?? host.state.home, href.split('#')[0])
    if (target && /\.(md|markdown|txt)$/i.test(target)) void confirmDiscard().then((ok) => (ok ? load(target) : undefined))
  }

  const menu = $derived<MenuItemDef[]>([
    { label: '&New', shortcut: 'Ctrl+N', action: () => void confirmDiscard().then((ok) => (ok ? load(null) : undefined)) },
    { label: '&Open...', shortcut: 'Ctrl+O', action: () => void confirmDiscard().then((ok) => void (ok && (picking = true))) },
    { label: '&Save', shortcut: 'Ctrl+S', disabled: !dirty && path !== null, action: () => void save() },
    { separator: true },
    { label: 'E&xit', action: () => void host.closeWindow(win.id) }
  ])

  function onkeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey) return
    const key = event.key.toLowerCase()
    if (key === 's') {
      event.preventDefault()
      void save()
    } else if (key === 'b' && mode === 'edit') {
      event.preventDefault()
      format((t, s, e) => wrapSelection(t, s, e, '**'))
    } else if (key === 'i' && mode === 'edit') {
      event.preventDefault()
      format((t, s, e) => wrapSelection(t, s, e, '_'))
    }
  }

  const words = $derived(text.trim() === '' ? 0 : text.trim().split(/\s+/).length)
  const editing = $derived(mode === 'edit')
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="wordpad" role="application" aria-label="WordPad" tabindex="-1" {onkeydown}>
  <div class="tabs">
    <button
      type="button"
      class="appbtn"
      onclick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        menuX = r.left
        menuY = r.bottom
        menuOpen = true
      }}>WordPad</button
    >
    <span class="tab on">Home</span>
  </div>
  <ToolStrip aria-label="Formatting">
    <ToolStripButton text="Read" checked={mode === 'read'} onclick={() => setMode('read')} title="Show the formatted document" />
    <ToolStripButton text="Edit" checked={mode === 'edit'} onclick={() => setMode('edit')} title="Edit the markdown source" />
    <span class="sep"></span>
    <ToolStripButton text="B" class="bold" disabled={!editing} title="Bold (Ctrl+B)" aria-label="Bold" onclick={() => format((t, s, e) => wrapSelection(t, s, e, '**'))} />
    <ToolStripButton text="I" class="italic" disabled={!editing} title="Italic (Ctrl+I)" aria-label="Italic" onclick={() => format((t, s, e) => wrapSelection(t, s, e, '_'))} />
    <span class="sep"></span>
    <ToolStripButton text="H1" disabled={!editing} title="Heading 1" aria-label="Heading 1" onclick={() => format((t, s, e) => toggleHeading(t, s, e, 1))} />
    <ToolStripButton text="H2" disabled={!editing} title="Heading 2" aria-label="Heading 2" onclick={() => format((t, s, e) => toggleHeading(t, s, e, 2))} />
    <span class="sep"></span>
    <ToolStripButton text="• List" disabled={!editing} title="Bulleted list" aria-label="Bulleted list" onclick={() => format(toggleBullets)} />
    <ToolStripButton text="1. List" disabled={!editing} title="Numbered list" aria-label="Numbered list" onclick={() => format(toggleNumbers)} />
    <span class="sep"></span>
    <ToolStripButton text="Code" disabled={!editing} title="Code" aria-label="Code" onclick={() => format(toggleCode)} />
    <ToolStripButton text="Link" disabled={!editing} title="Insert link" aria-label="Link" onclick={() => format(insertLink)} />
  </ToolStrip>

  <div class="page">
    {#if mode === 'edit'}
      <textarea
        class="source w7-scroll"
        bind:this={area}
        bind:value={text}
        aria-label="Document source"
        spellcheck="false"
        oninput={updateCaret}
        onkeyup={updateCaret}
        onclick={updateCaret}
      ></textarea>
    {:else}
      <div class="reader w7-scroll" bind:this={reader} tabindex="-1" onscroll={updateHeading} aria-label="Document">
        {#if text.trim() === ''}
          <p class="empty">{message || 'This document is empty. Choose Edit to start writing, or File > Open.'}</p>
        {:else}
          <MarkdownView source={text} onlink={followLink} label={path ? vpathName(path) : 'Document'} />
        {/if}
      </div>
    {/if}
  </div>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={message || (dirty ? 'Modified' : (path ?? 'New document'))} spring />
    <StatusStripLabel text="{words} word{words === 1 ? '' : 's'}" borders={['left']} width={90} />
    <StatusStripLabel text={heading ? `§ ${heading}` : ''} borders={['left']} width={170} />
  </StatusStrip>
  <ContextMenuStrip items={menu} bind:open={menuOpen} x={menuX} y={menuY} label="WordPad menu" />
  {#if picking}
    <OpenFileDialog
      api={host.api}
      desktopId={host.state.desktopId}
      startPath={path ? (vpathParent(path) ?? '') : (joinVPath(host.state.home, 'Documents') ?? '')}
      extensions={['md', 'markdown', 'txt']}
      onopen={(p) => {
        picking = false
        void load(p)
      }}
      onclose={() => (picking = false)}
    />
  {/if}
  {#if saveAs !== null}
    <Dialog title="Save as" iconName="save" width="340px" contained onclose={() => (saveAs = null)}>
      <div class="saveas">
        <label for="wp-name">File name:</label>
        <TextBox id="wp-name" bind:value={saveAs} onkeydown={(e) => e.key === 'Enter' && void finishSaveAs('ok')} />
      </div>
      {#snippet buttons()}
        <DialogButtons buttons={['ok', 'cancel']} onresult={(r) => void finishSaveAs(r)} />
      {/snippet}
    </Dialog>
  {/if}
</div>

<style>
  .wordpad {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-face);
    outline: 0;
  }
  .tabs {
    flex: none;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 24px;
    padding: 0 4px;
    background: linear-gradient(#f7faff, #dfe9f6);
  }
  .appbtn {
    align-self: center;
    height: 19px;
    margin-right: 6px;
    padding: 0 14px;
    border: 1px solid #1e4f8a;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(#5b9be0, #2a6cc0 48%, #1f5cae 50%, #3d86d8);
    color: #fff;
    font: inherit;
    font-weight: 600;
    text-shadow: 0 0 2px rgba(0, 30, 80, 0.6);
    cursor: default;
  }
  .appbtn:hover {
    filter: brightness(1.12);
  }
  .tab {
    padding: 2px 12px 3px;
    color: #1e3287;
  }
  .tab.on {
    border: 1px solid #a5b9d5;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(#fdfeff, #e6eef9);
  }
  .sep {
    width: 1px;
    height: 18px;
    margin: 0 4px;
    background: #b5c2d6;
  }
  :global(.tb.bold) {
    font-weight: 700;
  }
  :global(.tb.italic) {
    font-style: italic;
  }
  .page {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 6px;
    background: #aab8cc;
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.35);
  }
  .source,
  .reader {
    flex: 1;
    min-width: 0;
    min-height: 0;
    margin: 0;
    border: 1px solid #7d8ea8;
    background: #fff;
    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.35);
    overflow: auto;
    outline: 0;
  }
  .source {
    padding: 10px 14px;
    resize: none;
    color: #000;
    font: 13px/1.45 'Lucida Console', Consolas, 'DejaVu Sans Mono', monospace;
    tab-size: 4;
    user-select: text;
    cursor: text;
  }
  .reader {
    padding: 10px 18px;
  }
  .empty {
    color: var(--w7-text-muted);
  }
  .saveas {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
  }
</style>
