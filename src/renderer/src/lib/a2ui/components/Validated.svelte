<script lang="ts">
  import type { Snippet } from 'svelte'
  import ErrorProvider from '$lib/kit/atoms/ErrorProvider.svelte'

  /** A control followed by the ErrorProvider icon showing the failed `checks` messages. */
  let { errors = [], children }: { errors?: string[]; children: Snippet } = $props()
</script>

<div class="validated">
  <div class="control">{@render children()}</div>
  <ErrorProvider message={errors.join('\n')} />
</div>

<style>
  .validated {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .control {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
  }
</style>
