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
<div class="w7-markdown {className}" bind:this={root} role="document" aria-label={label} onclick={onClick}>
  {@html html}
</div>

<style>
  .w7-markdown {
    font: var(--w7-font);
    color: var(--w7-text);
    line-height: 1.5;
    overflow-wrap: anywhere;
    user-select: text;
    cursor: auto;
  }
  .w7-markdown > :global(:first-child) {
    margin-top: 0;
  }
  .w7-markdown > :global(:last-child) {
    margin-bottom: 0;
  }
  .w7-markdown :global(p),
  .w7-markdown :global(ul),
  .w7-markdown :global(ol),
  .w7-markdown :global(blockquote),
  .w7-markdown :global(table),
  .w7-markdown :global(pre) {
    margin: 0 0 10px;
  }
  .w7-markdown :global(h1),
  .w7-markdown :global(h2),
  .w7-markdown :global(h3),
  .w7-markdown :global(h4),
  .w7-markdown :global(h5),
  .w7-markdown :global(h6) {
    margin: 14px 0 6px;
    font-weight: normal;
    color: #003399;
    line-height: 1.25;
  }
  .w7-markdown :global(h1) {
    font-size: 21px;
  }
  .w7-markdown :global(h2) {
    font-size: 17px;
  }
  .w7-markdown :global(h3) {
    font-size: 15px;
  }
  .w7-markdown :global(h4),
  .w7-markdown :global(h5),
  .w7-markdown :global(h6) {
    font-size: 12px;
    font-weight: bold;
    color: #000;
  }
  .w7-markdown :global(ul),
  .w7-markdown :global(ol) {
    padding-left: 24px;
  }
  .w7-markdown :global(ul) {
    list-style: disc;
  }
  .w7-markdown :global(ol) {
    list-style: decimal;
  }
  .w7-markdown :global(li) {
    margin: 2px 0;
  }
  .w7-markdown :global(a) {
    color: var(--w7-link);
    text-decoration: underline;
    cursor: pointer;
  }
  .w7-markdown :global(blockquote) {
    padding: 2px 12px;
    border-left: 3px solid #b5c2d6;
    color: var(--w7-text-muted);
  }
  .w7-markdown :global(hr) {
    border: 0;
    border-top: 1px solid #d5d5d5;
    border-bottom: 1px solid #fff;
    margin: 12px 0;
  }
  .w7-markdown :global(code) {
    font-family: Consolas, 'DejaVu Sans Mono', 'Liberation Mono', monospace;
    font-size: 12px;
    padding: 0 3px;
    background: #f3f3f3;
    border: 1px solid #e1e1e1;
  }
  .w7-markdown :global(pre) {
    padding: 6px 8px;
    background: #fff;
    border: 1px solid var(--w7-list-border);
    overflow: auto;
    font: var(--w7-font-mono);
  }
  .w7-markdown :global(pre code) {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    white-space: pre;
    overflow-wrap: normal;
  }
  .w7-markdown :global(table) {
    border-collapse: collapse;
  }
  .w7-markdown :global(th),
  .w7-markdown :global(td) {
    border: 1px solid #a0a0a0;
    padding: 3px 8px;
    text-align: left;
  }
  .w7-markdown :global(th) {
    background: linear-gradient(#fff, #f1f1f1 90%, #e6e6e6);
    font-weight: normal;
  }
  .w7-markdown :global(img) {
    max-width: 100%;
  }
</style>
