<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import ToolStripColorButton from './ToolStripColorButton.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/ToolStripColorButton',
    component: ToolStripColorButton,
    argTypes: { onpick: { action: 'pick' }, disabled: { control: 'boolean' } }
  })
</script>

<script lang="ts">
  let fill = $state('#ffcc00')
  let font = $state('#ff0000')
  let line = $state('none')
</script>

{#snippet bucket()}
  <svg viewBox="0 0 16 13" width="16" height="13"><path d="M3 6.5l4.5-4.5 4.5 4.5-4.5 4.5z" fill="#fff" stroke="#333" /><path d="M13 8c.8 1.1 1 1.8.4 2.3-.6.4-1.3-.1-1.4-.8 0-.5.6-1.1 1-1.5z" fill="#333" /></svg>
{/snippet}
{#snippet letter()}
  <svg viewBox="0 0 16 13" width="16" height="13"><text x="8" y="11" text-anchor="middle" font-size="12" font-weight="700" font-family="Tahoma">A</text></svg>
{/snippet}
{#snippet pen()}
  <svg viewBox="0 0 16 13" width="16" height="13"><path d="M2 11L11 2l2 2-9 9H2z" fill="#fff" stroke="#333" /></svg>
{/snippet}

<Story name="Default">
  {#snippet template()}
    <div style="display:flex;gap:2px;padding:6px;background:linear-gradient(#fafcfe,#dce6f4)">
      <ToolStripColorButton value={fill} glyph={bucket} title="Fill Color" allowNone noneLabel="No Fill" onpick={(c) => (fill = c)} />
      <ToolStripColorButton value={line} glyph={pen} title="Line Color" allowNone noneLabel="No Line" onpick={(c) => (line = c)} />
      <ToolStripColorButton value={font} glyph={letter} title="Font Color" onpick={(c) => (font = c)} />
    </div>
  {/snippet}
</Story>

<Story name="Disabled">
  {#snippet template()}
    <ToolStripColorButton value="#ff0000" glyph={letter} title="Font Color" disabled onpick={() => {}} />
  {/snippet}
</Story>
