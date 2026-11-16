<script lang="ts">
  import { highlightCodeBlocks, renderMarkdown } from './markdown'

  interface Props {
    source: string
    /** Called with the href when a link is activated; the default navigation is suppressed. */
    onlink?: (href: string) => void
    label?: string
    class?: string
  }

  let { source, onlink, label, class: className = '' }: Props = $props()

  let root: HTMLDivElement | undefined = $state()
  const html = $derived(renderMarkdown(source))

  $effect(() => {
    void html
    if (!root) return
    let stale = false
    void highlightCodeBlocks(root, () => stale)
    return () => {
      stale = true
    }
  })

  const onClick = (event: MouseEvent): void => {
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return
    event.preventDefault()
    const href = anchor.getAttribute('href')
    if (href && onlink) onlink(href)
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div class="xp-markdown {className}" bind:this={root} role="document" aria-label={label} onclick={onClick}>
  {@html html}
</div>

<style>
  .xp-markdown {
    font: var(--w7-font);
    color: var(--w7-text);
    line-height: 1.5;
    overflow-wrap: anywhere;
    user-select: text;
    cursor: auto;
  }
  .xp-markdown > :global(:first-child) {
    margin-top: 0;
  }
  .xp-markdown > :global(:last-child) {
    margin-bottom: 0;
  }
  .xp-markdown :global(p),
  .xp-markdown :global(ul),
  .xp-markdown :global(ol),
  .xp-markdown :global(blockquote),
  .xp-markdown :global(table),
  .xp-markdown :global(pre) {
    margin: 0 0 10px;
  }
  .xp-markdown :global(h1),
  .xp-markdown :global(h2),
  .xp-markdown :global(h3),
  .xp-markdown :global(h4),
  .xp-markdown :global(h5),
  .xp-markdown :global(h6) {
    margin: 14px 0 6px;
    font-weight: normal;
    color: #003399;
    line-height: 1.25;
  }
  .xp-markdown :global(h1) {
    font-size: 21px;
  }
  .xp-markdown :global(h2) {
    font-size: 17px;
  }
  .xp-markdown :global(h3) {
    font-size: 15px;
  }
  .xp-markdown :global(h4),
  .xp-markdown :global(h5),
  .xp-markdown :global(h6) {
    font-size: 12px;
    font-weight: bold;
    color: #000;
  }
  .xp-markdown :global(ul),
  .xp-markdown :global(ol) {
    padding-left: 24px;
  }
  .xp-markdown :global(ul) {
    list-style: disc;
  }
  .xp-markdown :global(ol) {
    list-style: decimal;
  }
  .xp-markdown :global(li) {
    margin: 2px 0;
  }
  .xp-markdown :global(a) {
    color: var(--w7-link);
    text-decoration: underline;
    cursor: pointer;
  }
  .xp-markdown :global(blockquote) {
    padding: 2px 12px;
    border-left: 3px solid #b5c2d6;
    color: var(--w7-text-muted);
  }
  .xp-markdown :global(hr) {
    border: 0;
    border-top: 1px solid #d5d5d5;
    border-bottom: 1px solid #fff;
    margin: 12px 0;
  }
  .xp-markdown :global(code) {
    font-family: Consolas, 'DejaVu Sans Mono', 'Liberation Mono', monospace;
    font-size: 12px;
    padding: 0 3px;
    background: #f3f3f3;
    border: 1px solid #e1e1e1;
  }
  .xp-markdown :global(pre) {
    padding: 6px 8px;
    background: #fff;
    border: 1px solid var(--w7-list-border);
    overflow: auto;
    font: var(--w7-font-mono);
  }
  .xp-markdown :global(pre code) {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    white-space: pre;
    overflow-wrap: normal;
  }
  .xp-markdown :global(table) {
    border-collapse: collapse;
  }
  .xp-markdown :global(th),
  .xp-markdown :global(td) {
    border: 1px solid #a0a0a0;
    padding: 3px 8px;
    text-align: left;
  }
  .xp-markdown :global(th) {
    background: linear-gradient(#fff, #f1f1f1 90%, #e6e6e6);
    font-weight: normal;
  }
  .xp-markdown :global(img) {
    max-width: 100%;
  }
</style>
