<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { AppProps } from '../types'
  import StatusStripLabel from '../../kit/molecules/StatusStripLabel.svelte'
  import type { MenuDef } from '../../kit/molecules/MenuItem'
  import MenuStrip from '../../kit/organisms/MenuStrip.svelte'
  import StatusStrip from '../../kit/organisms/StatusStrip.svelte'
  import { showMessageBox } from '../../kit/organisms/messageBox'
  import OpenFileDialog from '../shared/OpenFileDialog.svelte'
  import { baseName, parentOf } from '../paths'
  import { ViewSync } from '../viewSync'
  import { caretPosition, offsetOfLine } from './caret'

  let { window: win, host, focused }: AppProps<'notepad'> = $props()

  type Writer = (folderId: number, path: string, text: string) => Promise<void>
  /** The API has no write method yet; when the backend adds `folders.writeFile`, Save lights up. */
  // svelte-ignore state_referenced_locally
  const writeFile = (host.api.folders as unknown as { writeFile?: Writer }).writeFile?.bind(host.api.folders)

  let path = $state<string | null>(null)
  let text = $state('')
  let original = $state('')
  let caret = $state({ line: 1, col: 1 })
  let wrap = $state(false)
  let message = $state('')
  let picking = $state(false)
  let area = $state<HTMLTextAreaElement | null>(null)

  const dirty = $derived(text !== original)
  let reportedDirty = false
  const sync = new ViewSync<{ path: string | null; caretLine: number }>((v) => JSON.stringify([v.path, v.caretLine]))

  function report(): void {
    const moved = sync.mark({ path, caretLine: caret.line })
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
        text = original = await host.api.folders.readFile(host.state.folder.id, target)
        message = ''
      } catch (error) {
        text = original = ''
        message = error instanceof Error ? error.message : String(error)
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
      text: `The text in ${path ? baseName(path) : 'Untitled'} has changed.\n\nDo you want to discard the changes?`,
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
    if (!writeFile || path === null) return
    try {
      await writeFile(host.state.folder.id, path, text)
      original = text
      message = `Saved ${baseName(path)}`
      report()
    } catch (error) {
      await showMessageBox({ text: error instanceof Error ? error.message : String(error), caption: 'Notepad', buttons: 'OK', icon: 'error' })
    }
  }

  function insertTimeDate(): void {
    if (!area) return
    const stamp = new Date().toLocaleString()
    area.setRangeText(stamp, area.selectionStart, area.selectionEnd, 'end')
    text = area.value
    updateCaret()
    report()
  }

  const menus = $derived<MenuDef[]>([
    {
      label: '&File',
      items: [
        { id: 'new', label: '&New', shortcut: 'Ctrl+N', action: () => void newFile() },
        { id: 'open', label: '&Open...', shortcut: 'Ctrl+O', action: () => void openFile() },
        {
          id: 'save',
          label: writeFile ? '&Save' : '&Save (not supported yet)',
          shortcut: 'Ctrl+S',
          disabled: !writeFile || path === null || !dirty,
          action: () => void save()
        },
        { separator: true },
        { id: 'exit', label: 'E&xit', action: () => void host.closeWindow(win.id) }
      ]
    },
    {
      label: '&Edit',
      items: [
        { id: 'all', label: 'Select &All', shortcut: 'Ctrl+A', action: () => area?.select() },
        { id: 'time', label: 'Time/&Date', shortcut: 'F5', action: insertTimeDate }
      ]
    },
    { label: 'F&ormat', items: [{ id: 'wrap', label: '&Word Wrap', checked: wrap, action: () => (wrap = !wrap) }] }
  ])

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'F5') {
      event.preventDefault()
      insertTimeDate()
    } else if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void save()
    }
  }
</script>

<div class="notepad">
  <MenuStrip {menus} aria-label="Notepad menu" />
  <textarea
    class="pad w7-scroll"
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
    {onkeydown}
  ></textarea>
  <StatusStrip sizeGrip={false}>
    <StatusStripLabel text={message || (dirty ? 'Modified' : '')} spring />
    <StatusStripLabel text="Ln {caret.line}, Col {caret.col}" borders={['left']} width={120} />
  </StatusStrip>
  {#if picking}
    <OpenFileDialog
      api={host.api}
      folderId={host.state.folder.id}
      startPath={path ? parentOf(path) : ''}
      onopen={(p) => {
        picking = false
        void load(p)
      }}
      onclose={() => (picking = false)}
    />
  {/if}
</div>

<style>
  .notepad {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--w7-window);
  }
  .pad {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 2px 4px;
    border: 0;
    border-top: 1px solid #d5dfe5;
    outline: 0;
    resize: none;
    background: var(--w7-window);
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
