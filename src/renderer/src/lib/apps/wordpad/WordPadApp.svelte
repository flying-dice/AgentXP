<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { AskChatRequest } from '@shared/desktop'
  import type { AppProps } from '../types'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, editItems, menuBar } from '../../kit/molecules/standardMenu'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { askChatItems, selectionLines, textareaOps } from '../shared/contextItems'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import ToolStripButton from '../../kit/molecules/ToolStripButton.svelte'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import MarkdownView from '../../kit/organisms/MarkdownView.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import ToolStrip from '../../kit/organisms/ToolStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import { registerAppRequestHandler } from '../appRequests'
  import OpenFileDialog from '../shared/OpenFileDialog.svelte'
  import SaveAsDialog from '../shared/SaveAsDialog.svelte'
  import { joinVPath, normaliseVPath, vpathName, vpathParent } from '@shared/vfs'
  import { errorText } from '../shared/listing'
  import { selectionContext, useAppContext } from '../shared/appContext.svelte'
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
  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'wordpad')
  const ctx = new ContextMenu()

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

  function finishSaveAs(name: string): void {
    saveAs = null
    // Like WordPad on Windows: a name without an extension is saved as markdown, so File > Open lists it.
    path = joinVPath(host.state.home, 'Documents', /\.[a-z0-9]+$/i.test(name) ? name : `${name}.md`)
    void save()
  }

  function followLink(href: string): void {
    if (/^[a-z]+:/i.test(href) || href.startsWith('#')) return
    const target = joinVPath(vpathParent(path ?? '') ?? joinVPath(host.state.home, 'Documents') ?? host.state.home, href.split('#')[0])
    if (target && /\.(md|markdown|txt)$/i.test(target)) void confirmDiscard().then((ok) => (ok ? load(target) : undefined))
  }

  const newDocument = (): Promise<void> => confirmDiscard().then((ok) => (ok ? load(null) : undefined))
  const openDocument = (): Promise<void> => confirmDiscard().then((ok) => void (ok && (picking = true)))

  const textOps = textareaOps(() => area)
  /** The edit operations of the source; in read mode Copy and Select All work on the formatted document. */
  const ops = {
    ...textOps,
    copy: () => (area ? textOps.copy() : document.execCommand('copy')),
    selectAll: () => {
      if (area) return textOps.selectAll()
      if (reader) window.getSelection()?.selectAllChildren(reader)
    }
  }
  const selectedText = (): string => (area ? text.slice(Math.min(area.selectionStart, area.selectionEnd), Math.max(area.selectionStart, area.selectionEnd)) : (window.getSelection()?.toString() ?? ''))

  function ask(kind: AskChatRequest['kind'], selected: string): void {
    void host.askChat({
      app: 'wordpad',
      windowId: win.id,
      kind,
      ...(selected ? { text: selected } : {}),
      ...(area && selected ? { range: selectionLines(text, area.selectionStart, area.selectionEnd) } : {}),
      ...(path ? { path } : {})
    })
  }

  const readOnly = (): boolean => mode !== 'edit'

  // The chat pane knows the document and the selection.
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => {
    const selected = selectedText()
    return {
      openFile: path,
      mode,
      unsavedChanges: dirty,
      ...(heading ? { visibleHeading: heading } : {}),
      ...selectionContext(selected, area && selected ? selectionLines(text, area.selectionStart, area.selectionEnd) : null)
    }
  })
  const contextItems = (): MenuItemDef[] => {
    const selected = selectedText()
    const hasSelection = selected !== ''
    return [...editItems('wordpad-ctx', mode === 'edit' ? ops : { copy: ops.copy, selectAll: ops.selectAll }, { hasSelection, readOnly: readOnly() }), ...askChatItems('wordpad', { hasSelection, ask: (kind) => ask(kind, selected) })]
  }

  const menus = $derived<MenuDef[]>(
    menuBar([
      {
        label: '&File',
        items: [
          { id: 'new', testid: 'wordpad-menu-new', label: '&New', shortcut: 'Ctrl+N', action: () => void newDocument() },
          { id: 'open', testid: 'wordpad-menu-open', label: '&Open...', shortcut: 'Ctrl+O', action: () => void openDocument() },
          { id: 'save', testid: 'wordpad-menu-save', label: '&Save', shortcut: 'Ctrl+S', disabled: !dirty && path !== null, action: () => void save() },
          ...closeItems('wordpad', () => void host.closeWindow(win.id))
        ]
      },
      { label: '&Edit', items: editItems('wordpad-menu', mode === 'edit' ? ops : { copy: ops.copy, selectAll: ops.selectAll }, { hasSelection: true, readOnly: readOnly() }) },
      {
        label: '&View',
        items: [
          { id: 'read', testid: 'wordpad-menu-read', label: '&Read', radio: true, checked: mode === 'read', action: () => setMode('read') },
          { id: 'edit', testid: 'wordpad-menu-edit', label: '&Edit source', radio: true, checked: mode === 'edit', action: () => setMode('edit') },
          { separator: true },
          help.paneItem(win.id)
        ]
      },
      help.menu()
    ])
  )

  /** Ctrl+N and Ctrl+O work wherever the focus is inside the focused WordPad window. */
  function onWindowKey(event: KeyboardEvent): void {
    if (!focused || picking || !event.ctrlKey || event.altKey || event.shiftKey) return
    const key = event.key.toLowerCase()
    if (key !== 'n' && key !== 'o') return
    event.preventDefault()
    void (key === 'n' ? newDocument() : openDocument())
  }

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

<svelte:window onkeydown={onWindowKey} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="wordpad" data-testid="wordpad-app" role="application" aria-label="WordPad" tabindex="-1" onkeydown={(e) => {
    ctx.key(e, contextItems)
    onkeydown(e)
  }} oncontextmenu={(e) => ctx.show(e, contextItems())}>
  <MenuStrip {menus} aria-label="WordPad menu" />
  <ToolStrip aria-label="Formatting">
    <ToolStripButton data-testid="wordpad-mode-read" text="Read" checked={mode === 'read'} onclick={() => setMode('read')} title="Show the formatted document" />
    <ToolStripButton data-testid="wordpad-mode-edit" text="Edit" checked={mode === 'edit'} onclick={() => setMode('edit')} title="Edit the markdown source" />
    <span class="sep"></span>
    <ToolStripButton data-testid="wordpad-format-bold" text="B" class="bold" disabled={!editing} title="Bold (Ctrl+B)" aria-label="Bold" onclick={() => format((t, s, e) => wrapSelection(t, s, e, '**'))} />
    <ToolStripButton data-testid="wordpad-format-italic" text="I" class="italic" disabled={!editing} title="Italic (Ctrl+I)" aria-label="Italic" onclick={() => format((t, s, e) => wrapSelection(t, s, e, '_'))} />
    <span class="sep"></span>
    <ToolStripButton data-testid="wordpad-format-h1" text="H1" disabled={!editing} title="Heading 1" aria-label="H1 Heading 1" onclick={() => format((t, s, e) => toggleHeading(t, s, e, 1))} />
    <ToolStripButton data-testid="wordpad-format-h2" text="H2" disabled={!editing} title="Heading 2" aria-label="H2 Heading 2" onclick={() => format((t, s, e) => toggleHeading(t, s, e, 2))} />
    <span class="sep"></span>
    <ToolStripButton data-testid="wordpad-format-bullets" text="• List" disabled={!editing} title="Bulleted list" aria-label="Bulleted list" onclick={() => format(toggleBullets)} />
    <ToolStripButton data-testid="wordpad-format-numbers" text="1. List" disabled={!editing} title="Numbered list" aria-label="1. List, numbered list" onclick={() => format(toggleNumbers)} />
    <span class="sep"></span>
    <ToolStripButton data-testid="wordpad-format-code" text="Code" disabled={!editing} title="Code" aria-label="Code" onclick={() => format(toggleCode)} />
    <ToolStripButton data-testid="wordpad-format-link" text="Link" disabled={!editing} title="Insert link" aria-label="Link" onclick={() => format(insertLink)} />
  </ToolStrip>

  <div class="page">
    {#if mode === 'edit'}
      <textarea
        class="source xp-scroll"
        data-testid="wordpad-source"
        bind:this={area}
        bind:value={text}
        aria-label="Document source"
        spellcheck="false"
        oninput={updateCaret}
        onkeyup={updateCaret}
        onclick={updateCaret}
      ></textarea>
    {:else}
      <div class="reader xp-scroll" data-testid="wordpad-reader" bind:this={reader} tabindex="-1" onscroll={updateHeading} aria-label="Document">
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
  <ContextMenuStrip items={ctx.items} bind:open={ctx.open} x={ctx.x} y={ctx.y} label="WordPad" />
  <AppAbout {help} />
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
    <SaveAsDialog caption="WordPad" name={saveAs} onsave={finishSaveAs} onclose={() => (saveAs = null)} />
  {/if}
</div>

<style>
  .wordpad {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-face);
    outline: 0;
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
    color: var(--xp-text-muted);
  }
</style>
