<script lang="ts">
  import type { SessionModeDto } from '@shared/models'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import AttachmentChip from './AttachmentChip.svelte'

  interface Props {
    agentName: string
    running?: boolean
    modes?: readonly SessionModeDto[]
    modeId?: string | null
    /** The file open in the editor; "Include open file" attaches it. */
    openFilePath?: string | null
    /** Called with the text and the absolute paths of the attachments. */
    onsend?: (text: string, attachments: string[]) => void
    oncancel?: () => void
    onmode?: (modeId: string) => void
    /** Native file picker; resolves to absolute paths (empty when cancelled). */
    pickFiles?: () => Promise<string[]>
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
    pickFiles
  }: Props = $props()

  let draft = $state('')
  let attached = $state<string[]>([])
  let includeFile = $state(true)
  let input = $state<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const canSend = $derived(!running && (draft.trim() !== '' || attached.length > 0))
  const modeItems = $derived(modes.map((m) => ({ value: m.id, label: m.name })))

  function send(): void {
    if (!canSend) return
    const files = includeFile && openFilePath && !attached.includes(openFilePath) ? [...attached, openFilePath] : attached
    onsend?.(draft, [...files])
    draft = ''
    attached = []
    input?.focus()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
    event.preventDefault()
    send()
  }

  async function attach(): Promise<void> {
    const paths = (await pickFiles?.()) ?? []
    attached = [...attached, ...paths.filter((p) => !attached.includes(p))]
  }
</script>

<div class="composer">
  <label class="prompt" for="composer-input">
    Message to {agentName} <span class="hint">(Enter to send, Shift+Enter for a new line)</span>
  </label>
  {#if attached.length > 0}
    <div class="chips" aria-label="Attachments">
      {#each attached as path (path)}
        <AttachmentChip {path} onremove={() => (attached = attached.filter((p) => p !== path))} />
      {/each}
    </div>
  {/if}
  <TextBox id="composer-input" class="input" multiline bind:ref={input} bind:value={draft} onkeydown={onKeydown} />
  <div class="bar">
    {#if modeItems.length > 0}
      <label for="composer-mode">Mode:</label>
      <ComboBox
        items={modeItems}
        value={modeId ?? ''}
        style="width: 170px"
        aria-label="Mode"
        onchange={(id) => onmode?.(id)}
      />
    {/if}
    <CheckBox label="Include open file" bind:checked={includeFile} disabled={!openFilePath} class="include" />
    <span class="spacer"></span>
    <Button onclick={attach}>Attach…</Button>
    <Button disabled={!running} onclick={() => oncancel?.()}>Stop</Button>
    <Button isDefault disabled={!canSend} onclick={send}>Send</Button>
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
    gap: 10px;
    margin-top: 6px;
  }
  .bar :global(.include) {
    max-width: 78px;
  }
  .spacer {
    flex: 1;
  }
</style>
