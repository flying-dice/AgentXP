<script module lang="ts">
  export type WindowState = 'Normal' | 'Maximized'
</script>

<script lang="ts">

  interface Props {
    windowState?: WindowState
    /** False dims the buttons like an inactive window. */
    active?: boolean
    minimizeBox?: boolean
    maximizeBox?: boolean
    closeBox?: boolean
    /** False greys out the close box (a non-closable modal). */
    closeEnabled?: boolean
    onminimize?: () => void
    onmaximize?: () => void
    onrestore?: () => void
    onclose?: () => void
    class?: string
  }

  let {
    windowState = 'Normal',
    active = true,
    minimizeBox = true,
    maximizeBox = true,
    closeBox = true,
    closeEnabled = true,
    onminimize,
    onmaximize,
    onrestore,
    onclose,
    class: className = ''
  }: Props = $props()

  const maximized = $derived(windowState === 'Maximized')
  const toggle = (): void => (maximized ? onrestore?.() : onmaximize?.())
</script>

<div class="w7-caption {className}" class:inactive={!active} role="group" aria-label="Window controls">
  {#if minimizeBox || maximizeBox}
    <button type="button" class="cb min" data-testid="window-minimize" aria-label="Minimize" title="Minimize" disabled={!minimizeBox} onclick={() => onminimize?.()}>
      <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true"><rect x="1" y="5" width="8" height="2.2" fill="#fff" stroke="#3a4f6e" stroke-width=".8" /></svg>
    </button>
    <button
      type="button"
      class="cb max"
      data-testid="window-maximize"
      aria-label={maximized ? 'Restore Down' : 'Maximize'}
      title={maximized ? 'Restore Down' : 'Maximize'}
      disabled={!maximizeBox}
      onclick={toggle}
    >
      {#if maximized}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <g fill="none" stroke="#3a4f6e" stroke-width="1.4"><rect x="3.2" y="1" width="5.8" height="5" /><rect x="1" y="3.6" width="5.8" height="5.4" fill="#c3d4ea" /></g>
          <rect x="1" y="3.6" width="5.8" height="1.6" fill="#fff" stroke="#3a4f6e" stroke-width=".5" />
        </svg>
      {:else}
        <svg width="10" height="9" viewBox="0 0 10 9" aria-hidden="true">
          <rect x="1" y="1" width="8" height="7" fill="none" stroke="#3a4f6e" stroke-width="1.6" />
          <rect x="1" y="1" width="8" height="2" fill="#fff" stroke="#3a4f6e" stroke-width=".6" />
        </svg>
      {/if}
    </button>
  {/if}
  {#if closeBox}
    <button type="button" class="cb close" data-testid="window-close" aria-label="Close" title="Close" disabled={!closeEnabled} onclick={() => onclose?.()}>
      <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true">
        <g stroke="#5a1710" stroke-width="3.4" stroke-linecap="square"><line x1="2" y1="1.5" x2="10" y2="8.5" /><line x1="10" y1="1.5" x2="2" y2="8.5" /></g>
        <g stroke="#fff" stroke-width="2" stroke-linecap="square"><line x1="2" y1="1.5" x2="10" y2="8.5" /><line x1="10" y1="1.5" x2="2" y2="8.5" /></g>
      </svg>
    </button>
  {/if}
</div>

<style>
  .w7-caption {
    display: inline-flex;
    align-self: flex-start;
    margin-top: -1px;
    border: 1px solid var(--w7-caption-border);
    border-top: 0;
    border-radius: 0 0 5px 5px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    -webkit-app-region: no-drag;
  }
  .cb {
    width: 29px;
    height: 19px;
    padding: 0;
    border: 0;
    border-right: 1px solid var(--w7-caption-border);
    background: var(--w7-caption-face);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    -webkit-app-region: no-drag;
  }
  .cb.close {
    width: 47px;
    border-right: 0;
    background: var(--w7-caption-close-face);
  }
  .cb:hover:not(:disabled) {
    background: var(--w7-caption-hover-face);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
  }
  .cb.close:hover:not(:disabled) {
    background: var(--w7-caption-close-hover-face);
  }
  .cb:active:not(:disabled) {
    filter: brightness(0.82);
  }
  .cb.close:active:not(:disabled) {
    background: var(--w7-caption-close-active-face);
    filter: none;
  }
  .cb:focus-visible {
    outline: var(--w7-focus-outline);
    outline-offset: -3px;
  }
  .cb:disabled {
    opacity: 0.55;
  }
  .inactive .cb:not(:hover) {
    opacity: 0.7;
  }
  .inactive .cb.close:not(:hover) {
    background: linear-gradient(#e6cfcb 0, #cf9d96 48%, #bf7a71 50%, #cfa098 100%);
  }
</style>
