<script lang="ts">
  /** The inline box under a line where the user writes a comment (or a reply). */
  import { REVIEW_SEVERITIES, SEVERITY_LABELS, type ReviewSeverity } from '@shared/review'
  import Button from '../../kit/atoms/Button.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'

  interface Props {
    /** Shown above the box, e.g. `src/a.ts:12`. */
    label?: string
    /** A reply has no severity of its own. */
    severity?: boolean
    submitText?: string
    onsubmit: (body: string, severity: ReviewSeverity) => void
    oncancel: () => void
  }

  let { label = '', severity: withSeverity = true, submitText = 'Comment', onsubmit, oncancel }: Props = $props()

  let body = $state('')
  let level = $state<ReviewSeverity>('minor')
  let box = $state<HTMLInputElement | HTMLTextAreaElement | null>(null)

  $effect(() => {
    box?.focus()
  })

  const submit = (): void => {
    const text = body.trim()
    if (text) onsubmit(text, level)
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      oncancel()
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      submit()
    }
  }
</script>

<div class="composer" data-testid="review-compose" role="group" aria-label="Write a comment" {onkeydown}>
  {#if label}<div class="where">{label}</div>{/if}
  <TextBox multiline rows={3} bind:value={body} bind:ref={box} placeholder="Leave a comment (Ctrl+Enter to post)" aria-label="Comment" data-testid="review-compose-input" />
  <div class="row">
    {#if withSeverity}
      <span>Severity:</span>
      <ComboBox
        aria-label="Severity"
        testid="review-compose-severity"
        items={REVIEW_SEVERITIES.map((s) => ({ value: s, label: SEVERITY_LABELS[s] }))}
        value={level}
        onchange={(v) => (level = v as ReviewSeverity)}
        style="width:90px"
      />
    {/if}
    <span class="spring"></span>
    <Button data-testid="review-compose-submit" isDefault disabled={!body.trim()} onclick={submit}>{submitText}</Button>
    <Button data-testid="review-compose-cancel" onclick={oncancel}>Cancel</Button>
  </div>
</div>

<style>
  .composer {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    background: var(--w7-face);
    border: 1px solid var(--w7-panel-border);
    font: var(--w7-font);
  }
  .where {
    color: var(--w7-text-muted);
    font-family: var(--w7-font-mono);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .spring {
    flex: 1;
  }
</style>
