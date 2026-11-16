<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { SessionModeDto } from '@shared/models'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import ToolStripDropDownButton from '../../kit/molecules/ToolStripDropDownButton.svelte'
  import AttachmentChip from './AttachmentChip.svelte'
  import { modeButtonText, modeMenuItems } from './modeMenu'

  interface Props {
    agentName: string
    running?: boolean
    modes?: readonly SessionModeDto[]
    modeId?: string | null
    /** The file open in the editor; "Include open file" attaches it. */
    openFilePath?: string | null
    /**
     * Called with the text and the absolute paths of the attachments. The box is cleared at once; when the call
     * resolves false (the message did not go through) the draft comes back, unless the user already typed something new.
     */
    onsend?: (text: string, attachments: string[]) => void | Promise<boolean | void>
    oncancel?: () => void
    onmode?: (modeId: string) => void
    /** Native file picker; resolves to absolute paths (empty when cancelled). */
    pickFiles?: () => Promise<string[]>
    /**
     * Fills the box (and focuses it) when `id` is one the box has not applied yet; without `text` it only focuses.
     * The host (the chat pane: "Ask chat...", Ctrl+Shift+C) is told through `onprefilled`, so a remount does not apply it twice.
     */
    prefill?: { id: number; text?: string } | null
    onprefilled?: (id: number) => void
    /** A short box for short exchanges (the chat pane of an app window). */
    dense?: boolean
    /** The agent is still starting: typing is fine, a sent message waits for it. */
    starting?: boolean
    /** The desktop's "Ask before every action" state; the Mode menu has an entry for it when `onaskfirst` is given. */
    askFirst?: boolean
    onaskfirst?: (on: boolean) => void
  }

  let {
    agentName,
    running = false,
    modes = [],
    modeId = null,
    openFilePath = null,
    onsend,
    oncancel,
    onmode,
    pickFiles,
    prefill = null,
    onprefilled,
    dense = false,
    starting = false,
    askFirst = false,
    onaskfirst
  }: Props = $props()

  let draft = $state('')
  let attached = $state<string[]>([])
  let includeFile = $state(true)
  let input = $state<HTMLInputElement | HTMLTextAreaElement | null>(null)

  let appliedPrefill = 0
  $effect(() => {
    const request = prefill
    if (!request || request.id === appliedPrefill) return
    appliedPrefill = request.id
    untrack(() => {
      if (request.text !== undefined) draft = request.text
      void tick().then(() => {
        input?.focus()
        if (request.text !== undefined) input?.setSelectionRange(draft.length, draft.length)
        onprefilled?.(request.id)
      })
    })
  })

  const canSend = $derived(!running && (draft.trim() !== '' || attached.length > 0))
  /** Why Send is off, as the tooltip of the button (null when it is on). */
  const sendReason = $derived(
    canSend ? null : running ? 'The agent is working. Wait for the reply, or click Stop.' : 'Type a message first.'
  )
  const modeItems = $derived(
    modeMenuItems({ modes, modeId, onmode: (id) => onmode?.(id), askFirst, ...(onaskfirst ? { onaskfirst } : {}) })
  )

  function send(): void {
    if (!canSend) return
    const files = includeFile && openFilePath && !attached.includes(openFilePath) ? [...attached, openFilePath] : attached
    const text = draft
    const kept = [...attached]
    const result = onsend?.(text, [...files])
    draft = ''
    attached = []
    input?.focus()
    // A send that did not go through gives the draft back (the user may have started something new meanwhile).
    void Promise.resolve(result).then((sent) => {
      if (sent !== false || draft !== '') return
      draft = text
      attached = kept
    })
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
    event.preventDefault()
    send()
  }

  let root = $state<HTMLElement | null>(null)

  /** Alt+M anywhere in the window puts the caret in the message box. */
  $effect(() => {
    const scope = root?.closest<HTMLElement>('[data-window-id]') ?? root?.parentElement
    if (!scope) return
    const onKey = (event: KeyboardEvent): void => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== 'm') return
      event.preventDefault()
      input?.focus()
    }
    scope.addEventListener('keydown', onKey)
    return () => scope.removeEventListener('keydown', onKey)
  })

  async function attach(): Promise<void> {
    const paths = (await pickFiles?.()) ?? []
    attached = [...attached, ...paths.filter((p) => !attached.includes(p))]
  }
</script>

<div class="composer" class:dense data-testid="chat-composer" bind:this={root}>
  <label class="prompt" for="composer-input" title="Message to {agentName}">
    <span class="mnemonic"><u>M</u>essage:</span> <span class="hint">(Enter to send, Shift+Enter for a new line)</span>
  </label>
  {#if starting}
    <div class="starting" role="status" data-testid="chat-starting">Starting the agent... Your message will be sent when the agent is ready.</div>
  {/if}
  {#if attached.length > 0}
    <div class="chips" aria-label="Attachments">
      {#each attached as path (path)}
        <AttachmentChip {path} onremove={() => (attached = attached.filter((p) => p !== path))} />
      {/each}
    </div>
  {/if}
  <TextBox id="composer-input" data-testid="chat-composer-input" class="input" multiline bind:ref={input} bind:value={draft} onkeydown={onKeydown} />
  <div class="bar">
    {#if modes.length > 0 || onaskfirst}
      <ToolStripDropDownButton text={modeButtonText(modes, modeId)} items={modeItems} testid="chat-mode" title="Mode: what the agent may do" />
    {/if}
    <span class="include" title={openFilePath ? 'Adds the file that is open in Code to your message.' : 'No file is open'}>
      <CheckBox label="Include open file" bind:checked={includeFile} disabled={!openFilePath} testid="chat-include-file" />
    </span>
    <span class="spacer"></span>
    <Button data-testid="chat-attach" onclick={attach}>Attach…</Button>
    <span title="Stop this step. The chat stays and you can send another message."><Button data-testid="chat-stop" disabled={!running} onclick={() => oncancel?.()}>Stop</Button></span>
    <span title={sendReason ?? (starting ? 'Your message will be sent when the agent is ready.' : 'Send the message (Enter)')}><Button data-testid="chat-send" isDefault disabled={!canSend} onclick={send}>Send</Button></span>
  </div>
</div>

<style>
  .composer {
    flex: none;
    margin-top: 4px;
    padding: 6px;
    background: linear-gradient(#f7f9fc, #e8eef7);
    border: 1px solid #9aa9bf;
  }
  .prompt {
    display: block;
    margin-bottom: 3px;
  }
  .hint {
    color: #444;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 4px;
  }
  .composer.dense {
    margin-top: 2px;
    padding: 4px;
  }
  .composer.dense .prompt {
    margin-bottom: 2px;
  }
  .composer.dense .hint {
    display: none;
  }
  .composer.dense :global(.input) {
    height: 44px;
  }
  .composer :global(.input) {
    display: block;
    width: 100%;
    height: 58px;
    padding: 4px 6px;
    font-size: 13px;
    line-height: 1.4;
    user-select: text;
  }
  .bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    margin-top: 6px;
  }
  .include {
    white-space: nowrap;
  }
  .starting {
    margin-bottom: 4px;
    padding: 2px 6px;
    color: #1e3287;
    background: #eef4fc;
    border: 1px solid #b8cbe6;
  }
  .spacer {
    flex: 1;
  }
</style>
