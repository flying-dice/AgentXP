<script lang="ts">
  /** The one-line note next to a button that is off ("Select a chat first"). It keeps its line when empty, so nothing moves. */
  interface Props {
    reason?: string | null
    testid?: string
  }

  let { reason = null, testid }: Props = $props()
</script>

<span class="w7-reason" role="status" data-testid={testid} data-on={reason ? 'true' : 'false'}>{reason ?? ''}</span>

<style>
  .w7-reason {
    display: block;
    min-height: 1.3em;
    color: var(--w7-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
