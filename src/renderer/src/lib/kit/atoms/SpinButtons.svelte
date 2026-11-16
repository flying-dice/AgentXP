<script lang="ts">
  interface Props {
    upDisabled?: boolean
    downDisabled?: boolean
    onup: () => void
    ondown: () => void
  }

  let { upDisabled = false, downDisabled = false, onup, ondown }: Props = $props()

  let delay: ReturnType<typeof setTimeout> | undefined
  let repeat: ReturnType<typeof setInterval> | undefined

  function stop(): void {
    clearTimeout(delay)
    clearInterval(repeat)
  }

  /** Fires once, then auto-repeats while the button is held (like the Win7 spinner). */
  function press(action: () => void): void {
    action()
    stop()
    delay = setTimeout(() => (repeat = setInterval(action, 50)), 400)
  }
</script>

<svelte:window onpointerup={stop} onblur={stop} />

<span class="spin" aria-hidden="true">
  <button type="button" tabindex="-1" class="up" aria-label="Increase" disabled={upDisabled} onpointerdown={() => press(onup)}>
    <svg width="7" height="4" viewBox="0 0 7 4"><path d="M0 4L3.5 0L7 4z" fill="currentColor" /></svg>
  </button>
  <button type="button" tabindex="-1" class="down" aria-label="Decrease" disabled={downDisabled} onpointerdown={() => press(ondown)}>
    <svg width="7" height="4" viewBox="0 0 7 4"><path d="M0 0L7 0L3.5 4z" fill="currentColor" /></svg>
  </button>
</span>

<style>
  .spin {
    display: flex;
    flex-direction: column;
    flex: none;
    width: 15px;
    padding: 0;
  }
  button {
    flex: 1;
    min-height: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #8e9097;
    background: var(--w7-btn-face);
    color: #404040;
    cursor: default;
    outline: none;
  }
  .up {
    border-bottom-width: 0;
    border-top-right-radius: 1px;
  }
  .down {
    border-bottom-right-radius: 1px;
  }
  button:hover:not(:disabled) {
    border-color: var(--w7-btn-hover-border);
    background: var(--w7-btn-hover-face);
  }
  button:active:not(:disabled) {
    border-color: var(--w7-btn-active-border);
    background: var(--w7-btn-active-face);
  }
  button:disabled {
    border-color: var(--w7-border-disabled);
    background: #f4f4f4;
    color: #b0b0b0;
  }
</style>
