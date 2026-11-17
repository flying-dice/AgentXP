<script lang="ts">
  import type { AppWindowState } from '@shared/desktop'

  let { window: w }: { window: AppWindowState } = $props()
</script>

<div class="unknown">
  <strong>{w.title}</strong>
  <p>The app "{w.app}" is not installed on this desktop.</p>
</div>

<style>
  .unknown {
    flex: 1;
    padding: 16px;
    background: var(--xp-window);
    color: var(--xp-text);
  }
  p {
    margin: 6px 0 0;
    color: var(--xp-text-muted);
  }
</style>
