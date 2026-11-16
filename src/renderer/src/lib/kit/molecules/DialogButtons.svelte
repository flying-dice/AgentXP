<script lang="ts">
  import Button from '../atoms/Button.svelte'
  import { cancelResultFor, dialogResultLabel, type DialogButtonSpec, type DialogResult } from './DialogButtons'

  interface Props {
    /** Buttons left to right. Plain results use the standard captions. */
    buttons?: (DialogResult | DialogButtonSpec)[]
    /** Result of the AcceptButton (Enter). Defaults to the first button. */
    acceptButton?: DialogResult
    /** Result of the CancelButton (Esc). Defaults per Windows rules. Pass 'none' to disable Esc. */
    cancelButton?: DialogResult
    onresult?: (result: DialogResult) => void
    class?: string
  }

  let { buttons = ['ok', 'cancel'], acceptButton, cancelButton, onresult, class: className = '' }: Props = $props()

  const specs = $derived(buttons.map((b): DialogButtonSpec => (typeof b === 'string' ? { result: b } : b)))
  const accept = $derived(acceptButton ?? specs[0]?.result)
  const cancel = $derived(cancelButton ?? cancelResultFor(specs.map((s) => s.result)))

  let root: HTMLDivElement | undefined = $state()

  /** Enter / Esc act on the whole form, like WinForms AcceptButton / CancelButton. */
  $effect(() => {
    const scope = root?.closest<HTMLElement>('[data-w7-form]') ?? root?.parentElement
    if (!scope) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return
      if (event.key === 'Escape' && cancel && cancel !== 'none') {
        event.preventDefault()
        onresult?.(cancel)
      } else if (event.key === 'Enter' && accept) {
        const target = event.target as HTMLElement
        if (target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        if (specs.find((s) => s.result === accept)?.disabled) return
        event.preventDefault()
        onresult?.(accept)
      }
    }
    scope.addEventListener('keydown', onKey)
    return () => scope.removeEventListener('keydown', onKey)
  })
</script>

<div class="xp-dialog-buttons {className}" bind:this={root}>
  {#each specs as spec (spec.result)}
    <Button
      isDefault={spec.result === accept}
      disabled={spec.disabled}
      data-autofocus={spec.result === accept ? '' : undefined}
      onclick={() => onresult?.(spec.result)}
    >
      {spec.label ?? dialogResultLabel(spec.result)}
    </Button>
  {/each}
</div>

<style>
  .xp-dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
</style>
