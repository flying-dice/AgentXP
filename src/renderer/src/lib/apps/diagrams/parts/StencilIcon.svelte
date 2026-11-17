<script lang="ts" module>
  import { defsNodes, renderShape } from '../model/render'
  import { stencilById } from '../model/stencils'
  import { estimateMeasure } from '../model/text'
  import type { SvgNode } from '../model/svg'

  const cache = new Map<string, { nodes: SvgNode[]; w: number; h: number }>()

  /** A stencil drawn at its default size, without text (except the text stencil), cached per stencil. */
  function thumbnail(id: string): { nodes: SvgNode[]; w: number; h: number } {
    const hit = cache.get(id)
    if (hit) return hit
    const st = stencilById(id)
    if (!st) return { nodes: [], w: 1, h: 1 }
    const w = st.w
    const h = Math.min(st.h, Math.max(st.w * 1.6, 60))
    const r = renderShape({ id: `thumb-${id}`, stencil: id, x: 0, y: 0, w, h, rotation: 0, text: id === 'basic.text' ? 'Abc' : '', style: { shadow: false, ...(id === 'basic.text' ? { fontSize: Math.max(12, h * 0.6) } : {}) }, data: st.data?.defaults }, estimateMeasure, { hideText: id !== 'basic.text' })
    const out = { nodes: [...defsNodes(r.gradient ? [r.gradient] : []), r.node], w, h }
    cache.set(id, out)
    return out
  }
</script>

<script lang="ts">
  /** A small picture of a stencil, for the Shapes window. */
  import SvgNodes from './SvgNodes.svelte'

  interface Props {
    stencil: string
    size?: number
  }

  let { stencil, size = 32 }: Props = $props()

  const t = $derived(thumbnail(stencil))
  const pad = $derived(Math.max(t.w, t.h) * 0.06 + 2)
</script>

<svg width={size} height={size} viewBox="{-pad} {-pad} {t.w + pad * 2} {t.h + pad * 2}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" class="stencil-icon">
  <SvgNodes nodes={t.nodes} />
</svg>

<style>
  .stencil-icon {
    flex: none;
    overflow: visible;
  }
</style>
