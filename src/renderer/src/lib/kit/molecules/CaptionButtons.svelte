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

<div class="xp-caption {className}" class:inactive={!active} role="group" aria-label="Window controls">
  {#if minimizeBox || maximizeBox}
    <button type="button" class="cb min" data-testid="window-minimize" aria-label="Minimize" title="Minimize" disabled={!minimizeBox} onclick={() => onminimize?.()}>
      <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true"><rect x="1.5" y="7" width="6" height="3" fill="#fff" /></svg>
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
        <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
          <g fill="none" stroke="#fff"><path d="M4 1.5h6v5.5" stroke-width="1" /><path d="M4 1.5v1.5" stroke-width="2" /></g>
          <g fill="none" stroke="#fff"><rect x="1.5" y="4.5" width="6" height="5" stroke-width="1" /><path d="M1 4.5h7" stroke-width="2" /></g>
        </svg>
      {:else}
        <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
          <g fill="none" stroke="#fff"><rect x="1.5" y="1.5" width="8" height="8" stroke-width="1" /><path d="M1 2h9" stroke-width="2" /></g>
        </svg>
      {/if}
    </button>
  {/if}
  {#if closeBox}
    <button type="button" class="cb close" data-testid="window-close" aria-label="Close" title="Close" disabled={!closeEnabled} onclick={() => onclose?.()}>
      <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
        <g stroke="#fff" stroke-width="2" stroke-linecap="square"><line x1="2" y1="2" x2="9" y2="9" /><line x1="9" y1="2" x2="2" y2="9" /></g>
      </svg>
    </button>
  {/if}
</div>

<style>
  /* Luna caption buttons: 21 px rounded squares with a white border; the close box is red. */
  .xp-caption {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-self: center;
    gap: 2px;
    margin-right: 0;
    -webkit-app-region: no-drag;
  }
  .cb {
    position: relative;
    width: 21px;
    height: 21px;
    padding: 0;
    border: 1px solid var(--xp-caption-border);
    border-radius: 3px;
    background: var(--xp-caption-face);
    box-shadow: inset 0 0 1px 1px rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    -webkit-app-region: no-drag;
  }
  .cb.close {
    background: var(--xp-caption-close-face);
  }
  .cb:hover:not(:disabled) {
    background: var(--xp-caption-hover-face);
  }
  .cb.close:hover:not(:disabled) {
    background: var(--xp-caption-close-hover-face);
  }
  .cb:active:not(:disabled) {
    filter: brightness(0.82);
  }
  .cb.close:active:not(:disabled) {
    background: var(--xp-caption-close-active-face);
    filter: none;
  }
  .cb:focus-visible {
    outline: 1px dotted #fff;
    outline-offset: -4px;
  }
  .cb:disabled {
    opacity: 0.6;
  }
  .inactive .cb:not(:hover) {
    opacity: 0.75;
  }
</style>
