<script lang="ts">
  interface Props {
    /** Absolute path of the attached file. */
    path: string
    onremove?: () => void
  }

  let { path, onremove }: Props = $props()
  const name = $derived(path.split(/[\\/]/).pop() || path)
</script>

<span class="chip" title={path}>
  <span class="name">{name}</span>
  <button class="remove" type="button" aria-label="Remove {name}" onclick={onremove}>
    <svg width="7" height="7" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" stroke-width="1.6" /></svg>
  </button>
</span>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 220px;
    height: 19px;
    padding: 0 2px 0 6px;
    border: 1px solid var(--xp-select-border);
    background: var(--xp-select-face);
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .remove {
    flex: none;
    width: 15px;
    height: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid transparent;
    background: none;
    color: #444;
  }
  .remove:hover {
    border-color: var(--xp-btn-hover-border);
    background: var(--xp-btn-hover-face);
  }
  .remove:active {
    border-color: var(--xp-btn-active-border);
    background: var(--xp-btn-active-face);
  }
</style>
