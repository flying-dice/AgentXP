<script lang="ts">
  /** The page of a load that failed, in the style of Internet Explorer 8: what happened, why, and what to try. */
  import Button from '../../kit/atoms/Button.svelte'
  import { FAILURE_HINTS, shortAddress, type LoadFailure } from './pageStatus'

  interface Props {
    failure: LoadFailure
    onrefresh: () => void
    onhelp?: () => void
  }

  let { failure, onrefresh, onhelp }: Props = $props()
</script>

<div class="error" data-testid="browser-error-page" role="alert">
  <h1 data-testid="browser-error-title">This page can't be displayed</h1>
  <p data-testid="browser-error-cause">The address '{shortAddress(failure.url)}' could not be reached. {failure.cause}</p>
  <p class="try">Try this:</p>
  <ul>
    {#each FAILURE_HINTS as hint (hint)}
      <li>{hint}</li>
    {/each}
  </ul>
  <div class="row">
    <Button data-testid="browser-error-refresh" onclick={onrefresh}>Refresh</Button>
    <button class="link" data-testid="browser-error-help" type="button" onclick={() => onhelp?.()}>Help</button>
  </div>
  <p class="technical" title="The technical name of the error">{failure.technical}</p>
</div>

<style>
  .error {
    position: absolute;
    inset: 0;
    overflow: auto;
    padding: 36px 48px;
    background: #fff;
    color: #222;
    font: 14px/1.5 'Segoe UI', 'Noto Sans', sans-serif;
    user-select: text;
  }
  h1 {
    margin: 0 0 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid #c8d4e6;
    color: #1f3f7a;
    font-size: 22px;
    font-weight: 600;
  }
  p {
    margin: 0 0 10px;
  }
  .try {
    margin-top: 16px;
    font-weight: 600;
  }
  ul {
    margin: 0 0 18px;
    padding-left: 22px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .link {
    padding: 0;
    border: 0;
    background: transparent;
    color: #1d4fa3;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .technical {
    margin-top: 24px;
    color: #7a8699;
    font-size: 12px;
  }
</style>
