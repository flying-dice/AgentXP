<script lang="ts">
  import { tick } from 'svelte'
  import TextBox from './TextBox.svelte'
  import { caretForRawCount, deleteRaw, formatMask, unmask } from './MaskedTextBox'

  interface Props {
    /** Formatted text (literals included). */
    value?: string
    mask: string
    promptChar?: string
    disabled?: boolean
    readonly?: boolean
    class?: string
    style?: string
    onmaskcompleted?: (text: string) => void
  }

  let {
    value = $bindable(''),
    mask,
    promptChar = '_',
    disabled = false,
    readonly = false,
    class: className = '',
    style,
    onmaskcompleted
  }: Props = $props()

  let input = $state<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const raw = $derived(unmask(mask, value, promptChar))
  const text = $derived(formatMask(mask, raw, promptChar).text)

  async function commit(newRaw: string, rawCaret: number): Promise<void> {
    const result = formatMask(mask, newRaw, promptChar)
    const wasComplete = formatMask(mask, raw, promptChar).complete
    value = result.text
    if (input) {
      input.value = result.text
      const pos = caretForRawCount(mask, Math.min(rawCaret, result.raw.length))
      await tick()
      input.setSelectionRange(pos, pos)
    }
    if (result.complete && !wasComplete) onmaskcompleted?.(result.text)
  }

  function onInput(event: Event): void {
    const el = event.currentTarget as HTMLInputElement
    const caret = el.selectionStart ?? el.value.length
    const before = unmask(mask, el.value.slice(0, caret), promptChar).length
    void commit(unmask(mask, el.value, promptChar), before)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Backspace' && event.key !== 'Delete') return
    const el = event.currentTarget as HTMLInputElement
    event.preventDefault()
    if (readonly) return
    const start = unmask(mask, el.value.slice(0, el.selectionStart ?? 0), promptChar).length
    const end = unmask(mask, el.value.slice(0, el.selectionEnd ?? 0), promptChar).length
    const r = deleteRaw(raw, start, end, event.key === 'Backspace' ? 'backward' : 'forward')
    void commit(r.raw, r.rawCaret)
  }
</script>

<TextBox
  bind:ref={input}
  value={text}
  class={className}
  {style}
  {disabled}
  {readonly}
  oninput={onInput}
  onkeydown={onKeydown}
/>
