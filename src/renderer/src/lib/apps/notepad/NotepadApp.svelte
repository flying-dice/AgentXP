<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { AskChatRequest } from '@shared/desktop'
  import type { AppProps } from '../types'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import type { MenuDef, MenuItemDef } from '../../kit/molecules/MenuItem'
  import { closeItems, editItems, menuBar } from '../../kit/molecules/standardMenu'
  import ContextMenuStrip from '../../kit/organisms/ContextMenuStrip.svelte'
  import AppAbout from '../shared/AppAbout.svelte'
  import { AppHelp } from '../shared/AppHelp.svelte'
  import { ContextMenu } from '../shared/ContextMenu.svelte'
  import { askChatItems, selectionLines, textareaOps } from '../shared/contextItems'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import OpenFileDialog from '../shared/OpenFileDialog.svelte'
  import { joinVPath, vpathName, vpathParent } from '@shared/vfs'
  import { errorText } from '../shared/listing'
  import { selectionContext, useAppContext } from '../shared/appContext.svelte'
  import { ViewSync } from '../viewSync'
  import { caretPosition, offsetOfLine } from './caret'
  import FindDialog from './FindDialog.svelte'
  import { findNext } from './find'
  import SaveAsDialog from '../shared/SaveAsDialog.svelte'

  let { window: win, host, focused }: AppProps<'notepad'> = $props()

  let path = $state<string | null>(null)
  let text = $state('')
  let original = $state('')
  let caret = $state({ line: 1, col: 1 })
  let wrap = $state(false)
  let message = $state('')
  let picking = $state(false)
  let saving = $state(false)
  let finding = $state(false)
  let area = $state<HTMLTextAreaElement | null>(null)

  // svelte-ignore state_referenced_locally
  const help = new AppHelp(host, 'notepad')
  const ctx = new ContextMenu()
  const ops = textareaOps(() => area)

  const dirty = $derived(text !== original)
  let reportedDirty = false
  const sync = new ViewSync<{ path: string | null; caretLine: number }>((v) => JSON.stringify([v.path, v.caretLine]))

  function report(): void {
    const moved = sync.report({ path, caretLine: caret.line })
    if (moved || dirty !== reportedDirty) {
      reportedDirty = dirty
      host.updateView(win.id, { app: 'notepad', path, dirty, caretLine: caret.line })
    }
  }

  async function load(target: string | null, line = 1): Promise<void> {
    path = target
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
    placeCaret(line)
    updateCaret()
    report()
  }

  function placeCaret(line: number): void {
    if (!area) return
    const offset = offsetOfLine(text, line)
    area.setSelectionRange(offset, offset)
  }

  function updateCaret(): void {
    if (!area) return
    const next = caretPosition(text, area.selectionStart)
    if (next.line !== caret.line || next.col !== caret.col) {
      caret = next
      report()
    }
  }

  // The agent opens another file or moves the caret.
  $effect(() => {
    const view = win.view
    if (!sync.isExternal({ path: view.path, caretLine: view.caretLine })) return
    untrack(() => {
      if (view.path !== path) void load(view.path, view.caretLine)
      else if (view.caretLine !== caret.line) {
        placeCaret(view.caretLine)
        updateCaret()
      }
    })
  })

  $effect(() => {
    if (focused) untrack(() => area?.focus())
  })

  async function confirmDiscard(): Promise<boolean> {
    if (!dirty) return true
    const answer = await showMessageBox({
      text: `The text in ${path ? vpathName(path) : 'Untitled'} has changed.\n\nDo you want to discard the changes?`,
      caption: 'Notepad',
      buttons: 'YesNo',
      icon: 'warning'
    })
    return answer === 'yes'
  }

  async function newFile(): Promise<void> {
    if (await confirmDiscard()) await load(null)
  }

  async function openFile(): Promise<void> {
    if (await confirmDiscard()) picking = true
  }

  async function save(): Promise<void> {
    // A new file has no name yet: Save asks for one, like Save As.
    if (path === null) {
      saving = true
      return
    }
    await write(path)
  }

  async function write(target: string): Promise<void> {
    try {
      await host.api.vfs.writeFile(host.state.desktopId, target, text)
      path = target
      original = text
      message = `Saved ${vpathName(target)}`
      report()
    } catch (error) {
      await showMessageBox({ text: errorText(error), caption: 'Notepad', buttons: 'OK', icon: 'error' })
    }
  }

  /** Selects the next match of the Find box, from the end of the selection. Returns false when there is none. */
  function find(query: string, matchCase: boolean): boolean {
    if (!area) return false
    const at = findNext(text, query, area.selectionEnd, matchCase)
    if (at < 0) return false
    area.focus()
    area.setSelectionRange(at, at + query.length)
    updateCaret()
    return true
  }

  function insertTimeDate(): void {
    if (!area) return
    const stamp = new Date().toLocaleString()
    area.setRangeText(stamp, area.selectionStart, area.selectionEnd, 'end')
    text = area.value
    updateCaret()
    report()
  }

  // The chat pane knows the file and the selection.
  // svelte-ignore state_referenced_locally
  useAppContext(host, () => win.id, () => {
    const start = area?.selectionStart ?? 0
    const end = area?.selectionEnd ?? 0
    const [lo, hi] = [Math.min(start, end), Math.max(start, end)]
    return { openFile: path, unsavedChanges: dirty, line: caret.line, ...selectionContext(text.slice(lo, hi), lo === hi ? null : selectionLines(text, start, end)) }
  })

  const hasSelection = (): boolean => !!area && area.selectionStart !== area.selectionEnd

  function ask(kind: AskChatRequest['kind']): void {
    const start = area?.selectionStart ?? 0
    const end = area?.selectionEnd ?? 0
    const selected = text.slice(Math.min(start, end), Math.max(start, end))
    void host.askChat({
      app: 'notepad',
      windowId: win.id,
      kind,
      ...(selected ? { text: selected, range: selectionLines(text, start, end) } : {}),
      ...(path ? { path } : { text: selected || text })
    })
  }

  const contextItems = (): MenuItemDef[] => [
    ...editItems('notepad-ctx', ops, { hasSelection: hasSelection() }),
    ...askChatItems('notepad', { hasSelection: hasSelection(), ask })
  ]

  const menus = $derived<MenuDef[]>(
    menuBar([
      {
        label: '&File',
        items: [
          { id: 'new', label: '&New', shortcut: 'Ctrl+N', action: () => void newFile() },
          { id: 'open', label: '&Open...', shortcut: 'Ctrl+O', action: () => void openFile() },
          { id: 'save', label: '&Save', shortcut: 'Ctrl+S', disabled: path !== null && !dirty, action: () => void save() },
          { id: 'save-as', testid: 'notepad-menu-save-as', label: 'Save &As...', shortcut: 'Ctrl+Shift+S', action: () => (saving = true) },
          ...closeItems('notepad', () => void host.closeWindow(win.id), 'E&xit')
        ]
      },
      { label: '&Edit', items: [...editItems('notepad-menu', ops, { hasSelection: true }), { separator: true }, { id: 'find', testid: 'notepad-menu-find', label: '&Find...', shortcut: 'Ctrl+F', action: () => (finding = true) }, { id: 'time', label: 'Time/&Date', shortcut: 'F5', action: insertTimeDate }] },
      { label: 'F&ormat', items: [{ id: 'wrap', label: '&Word Wrap', checked: wrap, action: () => (wrap = !wrap) }] },
      help.viewMenu(win.id),
      help.menu()
    ])
  )

  /** Ctrl+N, Ctrl+O, Ctrl+F and Ctrl+Shift+S work wherever the focus is inside the focused Notepad window. */
  function onWindowKey(event: KeyboardEvent): void {
    if (!focused || picking || saving || finding || !event.ctrlKey || event.altKey) return
    const key = event.key.toLowerCase()
    if (event.shiftKey) {
      if (key !== 's') return
      event.preventDefault()
      saving = true
      return
    }
    if (key !== 'n' && key !== 'o' && key !== 'f') return
    event.preventDefault()
    if (key === 'f') finding = true
    else void (key === 'n' ? newFile() : openFile())
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'F5') {
      event.preventDefault()
      insertTimeDate()
    } else if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void save()
    } else if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'a') {
      // Edit > Select All says Ctrl+A; on macOS a text box takes Ctrl+A as "start of line", so Notepad selects all itself.
      event.preventDefault()
      ops.selectAll()
    }
  }
</script>

<svelte:window onkeydown={onWindowKey} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="notepad" data-testid="notepad-app" oncontextmenu={(e) => ctx.show(e, contextItems())}>
  <MenuStrip {menus} aria-label="Notepad menu" />
  <textarea
    class="pad xp-scroll"
    data-testid="notepad-text"
    bind:this={area}
    bind:value={text}
    class:wrap
    aria-label="Text editor"
    spellcheck="false"
    wrap={wrap ? 'soft' : 'off'}
    oninput={() => {
      updateCaret()
      report()
    }}
    onkeyup={updateCaret}
    onclick={updateCaret}
    onselect={updateCaret}
    onkeydown={(e) => {
      ctx.key(e, contextItems)
      onkeydown(e)
    }}
  ></textarea>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel testid="notepad-status" text={message || (dirty ? 'Modified' : '')} spring />
    <StatusStripLabel text="Ln {caret.line}, Col {caret.col}" borders={['left']} width={120} />
  </StatusStrip>
  <ContextMenuStrip bind:open={ctx.open} x={ctx.x} y={ctx.y} items={ctx.items} label="Notepad" />
  <AppAbout {help} />
  {#if picking}
    <OpenFileDialog
      api={host.api}
      desktopId={host.state.desktopId}
      startPath={path ? (vpathParent(path) ?? '') : (joinVPath(host.state.home, 'Documents') ?? '')}
      onopen={(p) => {
        picking = false
        void load(p)
      }}
      onclose={() => (picking = false)}
    />
  {/if}
  {#if saving}
    <SaveAsDialog
      caption="Notepad"
      name={path ? vpathName(path) : 'Untitled.txt'}
      onsave={(name) => {
        saving = false
        const dir = path ? vpathParent(path) : joinVPath(host.state.home, 'Documents')
        const target = dir ? joinVPath(dir, name) : null
        if (target) void write(target)
      }}
      onclose={() => (saving = false)}
    />
  {/if}
  {#if finding}
    <FindDialog query={area && area.selectionStart !== area.selectionEnd ? text.slice(area.selectionStart, area.selectionEnd) : ''} onfind={find} onclose={() => ((finding = false), area?.focus())} />
  {/if}
</div>

<style>
  .notepad {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--xp-window);
  }
  .pad {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 2px 4px;
    border: 0;
    border-top: 1px solid #d0d0bf;
    outline: 0;
    resize: none;
    background: var(--xp-window);
    color: #000;
    font: 13px/1.3 'Lucida Console', Consolas, 'DejaVu Sans Mono', monospace;
    tab-size: 8;
    white-space: pre;
    overflow: auto;
    user-select: text;
    cursor: text;
  }
  .pad.wrap {
    white-space: pre-wrap;
  }
</style>
