<script lang="ts">
  /** What the Browser shows outside Electron (Storybook, tests): a static stand-in for the page. */
  import { BLANK, hostOf } from './address'

  interface Props {
    url: string
    loading?: boolean
  }

  let { url, loading = false }: Props = $props()

  const blank = $derived(url === BLANK)
  const example = $derived(/^https?:\/\/(www\.)?example\.com/i.test(url))
</script>

<div class="frame" class:loading aria-label="Page preview">
  {#if blank}
    <!-- the start page of the tab covers this -->
  {:else if example}
    <div class="example">
      <h1>Example Domain</h1>
      <p>This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.</p>
      <p><a href={url} onclick={(e) => e.preventDefault()}>More information...</a></p>
    </div>
  {:else}
    <div class="generic">
      <h1>{hostOf(url)}</h1>
      <p>The page appears here in Agent7. This preview is shown because Storybook runs outside Electron, where the real web view is not available.</p>
      <code>{url}</code>
    </div>
  {/if}
</div>

<style>
  .frame {
    flex: 1;
    overflow: auto;
    padding: 40px;
    background: #fff;
    color: #222;
    font: 15px/1.5 'Segoe UI', 'Noto Sans', sans-serif;
    user-select: text;
  }
  .frame.loading {
    opacity: 0.55;
  }
  .example,
  .generic {
    max-width: 600px;
    margin: 0 auto;
    padding: 30px 40px;
    background: #f0f0f2;
    border-radius: 0.5em;
  }
  h1 {
    margin: 0 0 0.6em;
    font-size: 1.6em;
  }
  p {
    margin: 0 0 1em;
  }
  a {
    color: #38488f;
    text-decoration: none;
  }
  code {
    font-family: Consolas, monospace;
    font-size: 12px;
    color: #555;
  }
</style>
