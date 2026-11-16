<script lang="ts">
  /** Win7-style placeholder for a component the renderer has no wrapper for. */
  let { name, reason = 'not available in this renderer' }: { name: string; reason?: string } = $props()
</script>

<div class="unknown" role="note" title="{name}: {reason}">
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5 15 14H1z" fill="#ffe27a" stroke="#a37d00" stroke-linejoin="round" />
    <path d="M8 6v4" stroke="#5c4500" stroke-width="1.6" />
    <circle cx="8" cy="11.8" r=".9" fill="#5c4500" />
  </svg>
  <span><b>{name}</b> {reason}</span>
</div>

<style>
  .unknown {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px 3px 5px;
    border: 1px solid #c9b46a;
    background: linear-gradient(#fffbe8, #f6edc4);
    color: var(--xp-text);
    font: var(--xp-font);
  }
</style>
