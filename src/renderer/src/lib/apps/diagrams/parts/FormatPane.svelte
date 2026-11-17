<script lang="ts">
  /**
   * The Format task pane: what is selected and every property of it. Shapes: text, size and position, fill, line,
   * font and the stencil's data (class members, entity attributes, ...). Connectors: kind, routing, labels, line and
   * ends. Nothing selected: the page and the drawing.
   */
  import CheckBox from '../../../kit/atoms/CheckBox.svelte'
  import ComboBox from '../../../kit/atoms/ComboBox.svelte'
  import NumericUpDown from '../../../kit/atoms/NumericUpDown.svelte'
  import TextBox from '../../../kit/atoms/TextBox.svelte'
  import LabeledField from '../../../kit/molecules/LabeledField.svelte'
  import TaskPanel from '../../../kit/molecules/TaskPanel.svelte'
  import ToolStripColorButton from '../../../kit/molecules/ToolStripColorButton.svelte'
  import type { DiagramEditor } from '../editor.svelte'
  import { PAGE_SIZES } from '../model/document'
  import { CONNECTOR_PRESETS } from '../model/presets'
  import { connectorStyle, shapeStyle } from '../model/render'
  import { stencilOf } from '../model/stencils'
  import { FONT_FAMILIES } from '../model/style'
  import { MARKER_KINDS, type DashStyle, type ShapeStyle } from '../model/types'
  import Glyph from './Glyph.svelte'

  interface Props {
    editor: DiagramEditor
    onclose: () => void
  }

  let { editor, onclose }: Props = $props()

  const shapes = $derived(editor.selectedShapes)
  const connectors = $derived(editor.selectedConnectors)
  const shape = $derived(shapes[0] ?? null)
  const connector = $derived(connectors[0] ?? null)
  const st = $derived(shape ? shapeStyle(shape) : null)
  const cst = $derived(connector ? connectorStyle(connector) : null)
  const stencil = $derived(shape ? stencilOf(shape.stencil) : null)
  const ids = $derived(shapes.map((s) => s.id))
  const cids = $derived(connectors.map((c) => c.id))

  const DASHES: { value: DashStyle; label: string }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'dash-dot', label: 'Dash dot' }
  ]
  const WEIGHTS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6].map((w) => ({ value: String(w), label: `${w} pt` }))
  const FONTS = FONT_FAMILIES.map((f) => ({ value: f, label: f }))
  const SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].map((s) => ({ value: String(s), label: String(s) }))
  const MARKERS = MARKER_KINDS.map((m) => ({ value: m, label: m === 'none' ? 'None' : m.replace(/^erd-/, 'ERD ').replace(/-/g, ' ') }))
  const PRESETS = [{ value: '', label: '(custom)' }, ...CONNECTOR_PRESETS.map((p) => ({ value: p.id, label: `${p.group === 'General' ? '' : `${p.group}: `}${p.name}` }))]
  const ROUTINGS = [
    { value: 'orthogonal', label: 'Right angle' },
    { value: 'straight', label: 'Straight' },
    { value: 'curved', label: 'Curved' }
  ]
  const SIZES_PAGE = [{ value: 'custom', label: 'Custom' }, ...Object.entries(PAGE_SIZES).map(([id, s]) => ({ value: id, label: s.name }))]

  const style = (patch: Partial<ShapeStyle>): void => editor.styleSelection(patch as Record<string, unknown>)
  const round = (v: number): number => Math.round(v * 100) / 100

  // ---- stencil data: arrays are edited one item per line

  type DataField = { key: string; kind: 'list' | 'text' | 'flag'; label: string }
  const LABELS: Record<string, string> = { attributes: 'Attributes', operations: 'Operations', literals: 'Literals', stereotype: 'Stereotype', abstract: 'Abstract', slots: 'Slots', activities: 'Activities', guards: 'Guards', title: 'Title', details: 'Details' }
  const dataFields = $derived.by((): DataField[] => {
    if (!shape || !stencil?.data) return []
    const keys = new Set([...Object.keys(stencil.data.defaults), ...Object.keys(shape.data ?? {})])
    return [...keys].map((key) => {
      const v = shape.data?.[key] ?? stencil.data!.defaults[key]
      const kind = Array.isArray(v) ? 'list' : typeof v === 'boolean' ? 'flag' : 'text'
      return { key, kind, label: LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1) }
    })
  })

  function lineOf(v: unknown): string {
    if (typeof v === 'string') return v
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      if (typeof o['name'] === 'string') {
        const keys = [o['pk'] ? 'PK' : '', o['fk'] ? 'FK' : ''].filter(Boolean).join(',')
        return [keys, o['name'], typeof o['type'] === 'string' ? o['type'] : ''].filter(Boolean).join(' ')
      }
    }
    return JSON.stringify(v)
  }
  const dataValue = (key: string): unknown => shape?.data?.[key] ?? stencil?.data?.defaults[key]
  const listText = (key: string): string => {
    const v = dataValue(key)
    return Array.isArray(v) ? v.map(lineOf).join('\n') : ''
  }
  const setData = (key: string, value: unknown): void => editor.updateShapes(ids, { data: { [key]: value } }, 'Edit data')
</script>

{#snippet bucket()}<Glyph name="fill-color" />{/snippet}
{#snippet pen()}<Glyph name="line-color" />{/snippet}
{#snippet letter()}<Glyph name="font-color" />{/snippet}

<aside class="format" data-testid="diagrams-format" aria-label="Format">
  <header class="caption">
    <span>Format</span>
    <button type="button" class="x" aria-label="Close the Format pane" title="Close" data-testid="diagrams-format-close" onclick={onclose}>
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" stroke-width="1.6" /></svg>
    </button>
  </header>
  <div class="body xp-scroll">
    {#if shape && st && stencil}
      <TaskPanel title={shapes.length > 1 ? `${shapes.length} shapes` : stencil.name} special testid="diagrams-format-shape">
        {#if shapes.length === 1}
          <label class="block" for="diagrams-format-text">Text</label>
          <TextBox id="diagrams-format-text" data-testid="diagrams-format-text" multiline rows={3} value={shape.text} onchange={(e: Event) => editor.updateShapes(ids, { text: (e.currentTarget as HTMLTextAreaElement).value }, 'Edit text')} />
          <p class="hint">{shape.id}{shape.locked ? ' · locked' : ''}{shape.groupId ? ' · grouped' : ''}</p>
        {:else}
          <p class="hint">Changes apply to every selected shape.</p>
        {/if}
      </TaskPanel>

      {#if shapes.length === 1}
        <TaskPanel title="Size & Position" testid="diagrams-format-size">
          <div class="pair">
            <LabeledField label="X" labelWidth={14}><span class="num" data-testid="diagrams-format-x"><NumericUpDown value={round(shape.x)} min={-100000} max={100000} decimalPlaces={0} aria-label="X" onchange={(v) => editor.updateShapes(ids, { x: v }, 'Move')} /></span></LabeledField>
            <LabeledField label="Y" labelWidth={14}><span class="num" data-testid="diagrams-format-y"><NumericUpDown value={round(shape.y)} min={-100000} max={100000} decimalPlaces={0} aria-label="Y" onchange={(v) => editor.updateShapes(ids, { y: v }, 'Move')} /></span></LabeledField>
          </div>
          <div class="pair">
            <LabeledField label="W" labelWidth={14}><span class="num" data-testid="diagrams-format-w"><NumericUpDown value={round(shape.w)} min={4} max={20000} decimalPlaces={0} aria-label="Width" onchange={(v) => editor.updateShapes(ids, { w: v }, 'Resize')} /></span></LabeledField>
            <LabeledField label="H" labelWidth={14}><span class="num" data-testid="diagrams-format-h"><NumericUpDown value={round(shape.h)} min={4} max={20000} decimalPlaces={0} aria-label="Height" onchange={(v) => editor.updateShapes(ids, { h: v }, 'Resize')} /></span></LabeledField>
          </div>
          <LabeledField label="Angle" labelWidth={40}><span class="num" data-testid="diagrams-format-angle"><NumericUpDown value={shape.rotation} min={-360} max={360} step={15} aria-label="Angle" onchange={(v) => editor.updateShapes(ids, { rotation: v }, 'Rotate')} /></span></LabeledField>
          <CheckBox label="Lock position and size" checked={!!shape.locked} testid="diagrams-format-lock" onchange={(c) => editor.updateShapes(ids, { locked: c }, c ? 'Lock' : 'Unlock')} />
        </TaskPanel>
      {/if}

      <TaskPanel title="Fill & Line" testid="diagrams-format-fill">
        <div class="wells">
          <span class="well">Fill <ToolStripColorButton value={st.fill} glyph={bucket} title="Fill Color" allowNone noneLabel="No Fill" testid="diagrams-format-fill-color" onpick={(c) => style({ fill: c })} /></span>
          <span class="well">Line <ToolStripColorButton value={st.stroke} glyph={pen} title="Line Color" allowNone noneLabel="No Line" testid="diagrams-format-line-color" onpick={(c) => style({ stroke: c })} /></span>
        </div>
        <LabeledField label="Weight" labelWidth={52}><ComboBox items={WEIGHTS} value={String(st.strokeWidth)} testid="diagrams-format-weight" aria-label="Line weight" onchange={(v) => style({ strokeWidth: Number(v) })} /></LabeledField>
        <LabeledField label="Pattern" labelWidth={52}><ComboBox items={DASHES} value={st.dash} testid="diagrams-format-dash" aria-label="Line pattern" onchange={(v) => style({ dash: v as DashStyle })} /></LabeledField>
        <LabeledField label="Opacity" labelWidth={52}><span class="num"><NumericUpDown value={Math.round(st.opacity * 100)} min={0} max={100} step={10} aria-label="Opacity percent" onchange={(v) => style({ opacity: v / 100 })} /></span></LabeledField>
        <div class="flags">
          <CheckBox label="Gradient" checked={st.gradient} testid="diagrams-format-gradient" onchange={(c) => style({ gradient: c })} />
          <CheckBox label="Shadow" checked={st.shadow} testid="diagrams-format-shadow" onchange={(c) => style({ shadow: c })} />
        </div>
      </TaskPanel>

      <TaskPanel title="Text" testid="diagrams-format-font">
        <LabeledField label="Font" labelWidth={36}><ComboBox items={FONTS} value={st.fontFamily} testid="diagrams-format-font-family" aria-label="Font" onchange={(v) => style({ fontFamily: v })} /></LabeledField>
        <div class="pair">
          <LabeledField label="Size" labelWidth={36}><ComboBox items={SIZES} value={String(st.fontSize)} dropDownStyle="DropDown" testid="diagrams-format-font-size" aria-label="Font size" onchange={(v) => Number(v) > 0 && style({ fontSize: Number(v) })} /></LabeledField>
          <span class="well"><ToolStripColorButton value={st.fontColor} glyph={letter} title="Font Color" testid="diagrams-format-font-color" onpick={(c) => style({ fontColor: c })} /></span>
        </div>
        <div class="flags">
          <CheckBox label="Bold" checked={st.bold} onchange={(c) => style({ bold: c })} />
          <CheckBox label="Italic" checked={st.italic} onchange={(c) => style({ italic: c })} />
          <CheckBox label="Underline" checked={st.underline} onchange={(c) => style({ underline: c })} />
        </div>
        <LabeledField label="Align" labelWidth={36}>
          <ComboBox items={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} value={st.textAlign} aria-label="Horizontal alignment" onchange={(v) => style({ textAlign: v as ShapeStyle['textAlign'] })} />
          <ComboBox items={[{ value: 'top', label: 'Top' }, { value: 'middle', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }]} value={st.verticalAlign} aria-label="Vertical alignment" onchange={(v) => style({ verticalAlign: v as ShapeStyle['verticalAlign'] })} />
        </LabeledField>
      </TaskPanel>

      {#if shapes.length === 1 && dataFields.length}
        <TaskPanel title="Shape Data" testid="diagrams-format-data">
          {#if stencil.data}<p class="hint">{stencil.data.description}</p>{/if}
          {#each dataFields as f (f.key)}
            {#if f.kind === 'flag'}
              <CheckBox label={f.label} checked={dataValue(f.key) === true} testid="diagrams-data-{f.key}" onchange={(c) => setData(f.key, c)} />
            {:else if f.kind === 'list'}
              <label class="block" for="diagrams-data-{f.key}">{f.label} <span class="hint">(one per line)</span></label>
              <TextBox id="diagrams-data-{f.key}" data-testid="diagrams-data-{f.key}" multiline rows={4} class="mono" value={listText(f.key)} onchange={(e: Event) => setData(f.key, (e.currentTarget as HTMLTextAreaElement).value.split('\n').map((l) => l.trim()).filter(Boolean))} />
            {:else}
              <LabeledField label={f.label} labelWidth={70}><TextBox data-testid="diagrams-data-{f.key}" value={String(dataValue(f.key) ?? '')} onchange={(e: Event) => setData(f.key, (e.currentTarget as HTMLInputElement).value)} /></LabeledField>
            {/if}
          {/each}
        </TaskPanel>
      {/if}
    {:else if connector && cst}
      <TaskPanel title={connectors.length > 1 ? `${connectors.length} connectors` : 'Connector'} special testid="diagrams-format-connector">
        <LabeledField label="Kind" labelWidth={52}><ComboBox items={PRESETS} value="" testid="diagrams-format-preset" aria-label="Connector kind" onchange={(v) => v && editor.updateConnectors(cids, { preset: v }, 'Connector kind')} /></LabeledField>
        <LabeledField label="Route" labelWidth={52}><ComboBox items={ROUTINGS} value={connector.routing} testid="diagrams-format-routing" aria-label="Routing" onchange={(v) => editor.updateConnectors(cids, { routing: v as never, waypoints: [] }, 'Routing')} /></LabeledField>
        {#if connectors.length === 1}
          <LabeledField label="Label" labelWidth={52}><TextBox data-testid="diagrams-format-label" value={connector.label} onchange={(e: Event) => editor.updateConnectors(cids, { label: (e.currentTarget as HTMLInputElement).value }, 'Edit text')} /></LabeledField>
          <LabeledField label="Start" labelWidth={52}><TextBox data-testid="diagrams-format-start-label" value={connector.startLabel ?? ''} placeholder="1, 0..*" onchange={(e: Event) => editor.updateConnectors(cids, { startLabel: (e.currentTarget as HTMLInputElement).value }, 'Edit text')} /></LabeledField>
          <LabeledField label="End" labelWidth={52}><TextBox data-testid="diagrams-format-end-label" value={connector.endLabel ?? ''} placeholder="1, 0..*" onchange={(e: Event) => editor.updateConnectors(cids, { endLabel: (e.currentTarget as HTMLInputElement).value }, 'Edit text')} /></LabeledField>
          <p class="hint">{connector.id}: {'shape' in connector.from ? connector.from.shape : 'point'} → {'shape' in connector.to ? connector.to.shape : 'point'}</p>
        {/if}
      </TaskPanel>
      <TaskPanel title="Line & Ends" testid="diagrams-format-line">
        <div class="wells">
          <span class="well">Line <ToolStripColorButton value={cst.stroke} glyph={pen} title="Line Color" testid="diagrams-format-connector-color" onpick={(c) => editor.styleSelection({ stroke: c })} /></span>
          <span class="well">Text <ToolStripColorButton value={cst.fontColor} glyph={letter} title="Font Color" onpick={(c) => editor.styleSelection({ fontColor: c })} /></span>
        </div>
        <LabeledField label="Weight" labelWidth={52}><ComboBox items={WEIGHTS} value={String(cst.strokeWidth)} aria-label="Line weight" onchange={(v) => editor.styleSelection({ strokeWidth: Number(v) })} /></LabeledField>
        <LabeledField label="Pattern" labelWidth={52}><ComboBox items={DASHES} value={cst.dash} aria-label="Line pattern" onchange={(v) => editor.styleSelection({ dash: v })} /></LabeledField>
        <LabeledField label="Begin" labelWidth={52}><ComboBox items={MARKERS} value={cst.startMarker} testid="diagrams-format-start-marker" aria-label="Begin end" onchange={(v) => editor.styleSelection({ startMarker: v })} /></LabeledField>
        <LabeledField label="End" labelWidth={52}><ComboBox items={MARKERS} value={cst.endMarker} testid="diagrams-format-end-marker" aria-label="End" onchange={(v) => editor.styleSelection({ endMarker: v })} /></LabeledField>
        <LabeledField label="Text size" labelWidth={52}><ComboBox items={SIZES} value={String(cst.fontSize)} aria-label="Text size" onchange={(v) => editor.styleSelection({ fontSize: Number(v) })} /></LabeledField>
        <CheckBox label="Rounded corners" checked={cst.rounded} onchange={(c) => editor.styleSelection({ rounded: c })} />
      </TaskPanel>
    {:else}
      {@const p = editor.page}
      {@const sizeId = Object.entries(PAGE_SIZES).find(([, s]) => s.width === p.width && s.height === p.height)?.[0] ?? 'custom'}
      <TaskPanel title="Page" special testid="diagrams-format-page">
        <LabeledField label="Name" labelWidth={52}><TextBox data-testid="diagrams-format-page-name" value={p.name} onchange={(e: Event) => editor.renamePage(editor.pageIndex, (e.currentTarget as HTMLInputElement).value)} /></LabeledField>
        <LabeledField label="Size" labelWidth={52}><ComboBox items={SIZES_PAGE} value={sizeId} testid="diagrams-format-page-size" aria-label="Page size" onchange={(v) => v !== 'custom' && editor.updatePage({ width: PAGE_SIZES[v as keyof typeof PAGE_SIZES].width, height: PAGE_SIZES[v as keyof typeof PAGE_SIZES].height })} /></LabeledField>
        <div class="pair">
          <LabeledField label="W" labelWidth={14}><span class="num"><NumericUpDown value={p.width} min={100} max={20000} step={10} aria-label="Page width" onchange={(v) => editor.updatePage({ width: v })} /></span></LabeledField>
          <LabeledField label="H" labelWidth={14}><span class="num"><NumericUpDown value={p.height} min={100} max={20000} step={10} aria-label="Page height" onchange={(v) => editor.updatePage({ height: v })} /></span></LabeledField>
        </div>
        <CheckBox label="Grow the page to fit the drawing" checked={p.autoSize} testid="diagrams-format-autosize" onchange={(c) => editor.updatePage({ autoSize: c })} />
        <div class="wells">
          <span class="well">Background <ToolStripColorButton value={p.background} glyph={bucket} title="Page Color" testid="diagrams-format-page-color" onpick={(c) => c !== 'none' && editor.updatePage({ background: c })} /></span>
        </div>
        <LabeledField label="Grid" labelWidth={52}><span class="num"><NumericUpDown value={p.gridSize} min={2} max={200} step={5} aria-label="Grid size" onchange={(v) => editor.updatePage({ gridSize: v })} /></span></LabeledField>
        <CheckBox label="Show the grid on this page" checked={p.showGrid} onchange={(c) => editor.updatePage({ showGrid: c })} />
      </TaskPanel>
      <TaskPanel title="Drawing" testid="diagrams-format-drawing">
        <LabeledField label="Title" labelWidth={52}><TextBox data-testid="diagrams-format-title" value={editor.doc.title} onchange={(e: Event) => editor.setTitle((e.currentTarget as HTMLInputElement).value)} /></LabeledField>
        <p class="hint">{editor.doc.pages.length} page{editor.doc.pages.length === 1 ? '' : 's'} · {p.shapes.length} shape{p.shapes.length === 1 ? '' : 's'} and {p.connectors.length} connector{p.connectors.length === 1 ? '' : 's'} on this page</p>
        <p class="hint">Select a shape or a connector to format it. Drag shapes from the Shapes window; drag from a shape's blue connection points to connect it.</p>
      </TaskPanel>
    {/if}
  </div>
</aside>

<style>
  .format {
    flex: none;
    width: 236px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #7a96c8;
    background: linear-gradient(#7ba2e7, #6375d6);
  }
  .caption {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 20px;
    padding: 0 3px 0 6px;
    background: linear-gradient(#f4f7fc, #d5dfef);
    border-bottom: 1px solid #8ea6c6;
    color: #1c2f4a;
    font-weight: 700;
  }
  .x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    color: #1c2f4a;
  }
  .x:hover {
    border-color: var(--xp-toolbar-hover-border);
    background: var(--xp-toolbar-hover-face);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 10px 10px 0;
  }
  .body :global(.xp-taskpanel .body) {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .block {
    font-weight: 600;
  }
  .hint {
    margin: 0;
    color: #3c4f6e;
    font-size: 11px;
    font-weight: 400;
  }
  .pair {
    display: flex;
    gap: 8px;
  }
  .pair > :global(*) {
    flex: 1;
    min-width: 0;
  }
  .num {
    display: inline-flex;
    width: 100%;
  }
  .num :global(> *) {
    width: 100%;
  }
  .wells {
    display: flex;
    gap: 12px;
  }
  .well {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .flags {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
  }
  .body :global(.mono) {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 11px;
  }
</style>
