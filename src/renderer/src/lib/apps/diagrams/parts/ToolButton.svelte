<script lang="ts">
  /** A tool-strip button with a Diagrams glyph (the kit's ToolStripButton, so it follows the theme). */
  import ToolStripButton from '../../../kit/molecules/ToolStripButton.svelte'
  import type { IconName } from '../../../kit/atoms/icons'
  import Glyph from './Glyph.svelte'
  import type { GlyphName } from './glyphs'

  interface Props {
    glyph?: GlyphName
    icon?: IconName
    title: string
    checked?: boolean
    disabled?: boolean
    testid: string
    onclick: (event: MouseEvent) => void
  }

  let { glyph, icon, title, checked, disabled = false, testid, onclick }: Props = $props()
</script>

{#snippet g()}<Glyph name={glyph!} />{/snippet}
<ToolStripButton class="dg-tb" glyph={glyph ? g : undefined} {icon} {title} {checked} {disabled} data-testid={testid} {onclick} />
