<script lang="ts">
  import MarkdownView from './MarkdownView.svelte'

  interface Props {
    /** Markdown source (readOnly) or plain text (editable). */
    value?: string
    readOnly?: boolean
    /** Render value as markdown. Only meaningful when readOnly; editing is always plain text. */
    markdown?: boolean
    placeholder?: string
    disabled?: boolean
    /** CSS height; the box scrolls beyond it. */
    height?: string
    label?: string
    onchange?: (value: string) => void
    onlink?: (href: string) => void
    class?: string
  }

  let {
    value = $bindable(''),
    readOnly = false,
    markdown = true,
    placeholder = '',
    disabled = false,
    height = '120px',
    label = 'Text',
    onchange,
    onlink,
    class: className = ''
  }: Props = $props()

  let editor: HTMLDivElement | undefined = $state()
  const showMarkdown = $derived(readOnly && markdown)

  // Keep the DOM in sync with `value` without disturbing the caret while typing.
  $effect(() => {
    if (!editor || showMarkdown) return
    if (editor.innerText.replace(/\n$/, '') !== value) editor.textContent = value
  })

  const onInput = (): void => {
    if (!editor) return
    value = editor.innerText.replace(/\n$/, '')
    onchange?.(value)
  }

  const onPaste = (event: ClipboardEvent): void => {
    event.preventDefault()
    document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '')
  }
</script>

<div class="w7-richtextbox {className}" class:disabled style:height>
  {#if showMarkdown}
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="scroll w7-scroll" tabindex="0" role="region" aria-label={label}>
      <MarkdownView source={value} {onlink} />
    </div>
  {:else}
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="scroll w7-scroll edit"
      bind:this={editor}
      contenteditable={readOnly || disabled ? 'false' : 'plaintext-only'}
      role="textbox"
      aria-multiline="true"
      aria-label={label}
      aria-readonly={readOnly}
      aria-disabled={disabled}
      aria-placeholder={placeholder || undefined}
      data-placeholder={placeholder}
      tabindex={disabled ? -1 : 0}
      spellcheck="false"
      oninput={onInput}
      onpaste={onPaste}
    ></div>
  {/if}
</div>

<style>
  .w7-richtextbox {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--w7-window);
    border: 1px solid var(--w7-input-border);
    border-top-color: var(--w7-input-border-top);
    font: var(--w7-font);
  }
  .w7-richtextbox:focus-within {
    border-color: #569de5;
    border-top-color: #569de5;
  }
  .w7-richtextbox.disabled {
    background: var(--w7-face);
    border-color: var(--w7-border-disabled);
    color: var(--w7-text-disabled);
  }
  .scroll {
    flex: 1;
    min-height: 0;
    padding: 4px 6px;
    overflow: auto;
    outline: none;
  }
  .edit {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
    cursor: text;
  }
  .edit:empty::before {
    content: attr(data-placeholder);
    color: var(--w7-text-disabled);
  }
</style>
