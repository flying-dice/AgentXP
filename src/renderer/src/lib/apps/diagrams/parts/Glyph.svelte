<script lang="ts">
  /** One toolbar glyph of Agent Diagrams. */
  import { GLYPHS, type GlyphName } from './glyphs'

  let { name, size = 16 }: { name: GlyphName; size?: number } = $props()
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- static markup from glyphs.ts -->
<svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">{@html GLYPHS[name]}</svg>
