/**
 * The AgentXP WinForms A2UI catalog: one zod schema per component. Used to
 * validate agent messages and to generate the description handed to agents.
 * Component names are shared with the renderer kit.
 */
import { z } from 'zod'
import type { A2uiComponent, A2uiServerMessage } from './a2ui'

/** A literal, or `{ path }` binding to a JSON pointer in the surface data model. */
const dyn = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.object({ path: z.string().describe('JSON pointer into the data model, e.g. /form/name') }).strict()])

const id = z.string().min(1)
const childId = id.describe('Id of a component in this surface')
const children = z.array(childId).describe('Ids of child components, in order')

const action = z
  .object({
    name: z.string().min(1).describe('Action name sent back to the agent, e.g. "submit"'),
    context: z.record(z.string(), z.unknown()).optional().describe('Static context; values may be {path} bindings resolved on click')
  })
  .strict()
  .describe('Sent to the agent as a new prompt when the user activates the control')

const option = z.union([z.string(), z.object({ value: z.string(), label: z.string().optional() }).strict()])
const options = dyn(z.array(option)).describe('Choices: strings or {value,label}')
const str = (d: string) => dyn(z.string()).describe(d)
const num = (d: string) => dyn(z.number()).describe(d)
const bool = (d: string) => dyn(z.boolean()).describe(d)
const iconName = z.string().optional().describe('Icon name from the kit icon set, e.g. "folder", "save"')

type Shape = Record<string, z.ZodType>
const component = <N extends string, S extends Shape>(name: N, shape: S) =>
  z.object({ id, component: z.literal(name), ...shape }).strict()

const treeNode: z.ZodType<{ id: string; text: string; icon?: string; children?: unknown[] }> = z.lazy(() =>
  z
    .object({ id: z.string(), text: z.string(), icon: z.string().optional(), children: z.array(treeNode).optional() })
    .strict()
)

const column = z.object({ key: z.string(), header: z.string(), width: z.number().optional(), type: z.enum(['text', 'number', 'checkbox']).optional() }).strict()
const row = z.record(z.string(), z.unknown())

const schemas = {
  // Layout
  Panel: component('Panel', {
    children,
    borderStyle: z.enum(['None', 'FixedSingle', 'Fixed3D']).optional().describe('Border style (default None)'),
    autoScroll: z.boolean().optional().describe('Show scrollbars when content overflows')
  }),
  FlowLayoutPanel: component('FlowLayoutPanel', {
    children,
    flowDirection: z.enum(['LeftToRight', 'TopDown']).optional().describe('Flow direction (default LeftToRight)'),
    wrap: z.boolean().optional().describe('Wrap children to the next row/column'),
    gap: z.number().optional().describe('Gap between children in px')
  }),
  TableLayoutPanel: component('TableLayoutPanel', {
    children,
    columns: z.number().int().min(1).describe('Number of columns; children fill row by row'),
    columnWidths: z.array(z.union([z.number(), z.string()])).optional().describe('Per column: px number, "auto", or percent like "50%"')
  }),
  GroupBox: component('GroupBox', { text: str('Caption'), children }),
  TabControl: component('TabControl', {
    tabs: z.array(z.object({ title: z.string(), child: childId }).strict()).describe('Tab pages; each shows one child component')
  }),
  SplitContainer: component('SplitContainer', {
    orientation: z.enum(['Horizontal', 'Vertical']).optional().describe('Vertical = side-by-side panels'),
    panel1: childId,
    panel2: childId,
    splitterDistance: z.number().optional().describe('Size of panel1 in px')
  }),
  // Controls
  Label: component('Label', { text: str('Text to display') }),
  LinkLabel: component('LinkLabel', { text: str('Link text'), action }),
  Button: component('Button', {
    text: str('Caption'),
    icon: iconName,
    isDefault: z.boolean().optional().describe('Default button (accent border, Enter key)'),
    action
  }),
  CheckBox: component('CheckBox', { text: str('Caption'), checked: bool('Checked state; bind with {path}') }),
  RadioButtonGroup: component('RadioButtonGroup', {
    options,
    value: str('Selected option value; bind with {path}')
  }),
  TextBox: component('TextBox', {
    value: str('Text; bind with {path} for two-way editing'),
    multiline: z.boolean().optional(),
    placeholder: z.string().optional(),
    password: z.boolean().optional().describe('Mask the input')
  }),
  NumericUpDown: component('NumericUpDown', {
    value: num('Number; bind with {path}'),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional().describe('Increment (default 1)')
  }),
  ComboBox: component('ComboBox', { options, value: str('Selected option value; bind with {path}') }),
  ListBox: component('ListBox', {
    options,
    selected: dyn(z.union([z.string(), z.array(z.string())])).describe('Selected value (string) or values (array when multi); bind with {path}'),
    multi: z.boolean().optional().describe('Allow multiple selection')
  }),
  CheckedListBox: component('CheckedListBox', {
    options,
    checked: dyn(z.array(z.string())).describe('Checked option values; bind with {path}')
  }),
  ProgressBar: component('ProgressBar', {
    value: num('Current value'),
    max: z.number().optional().describe('Maximum (default 100)'),
    style: z.enum(['Continuous', 'Marquee']).optional(),
    state: z.enum(['normal', 'paused', 'error']).optional().describe('Green / yellow / red bar')
  }),
  TrackBar: component('TrackBar', {
    value: num('Slider value; bind with {path}'),
    min: z.number().optional(),
    max: z.number().optional()
  }),
  DateTimePicker: component('DateTimePicker', {
    value: str('ISO 8601 date/time; bind with {path}'),
    format: z.enum(['Long', 'Short', 'Time']).optional()
  }),
  MonthCalendar: component('MonthCalendar', { value: str('ISO 8601 date (YYYY-MM-DD); bind with {path}') }),
  PictureBox: component('PictureBox', {
    src: str('Image URL or data: URI'),
    sizeMode: z.enum(['Normal', 'StretchImage', 'Zoom', 'CenterImage']).optional()
  }),
  TreeView: component('TreeView', {
    nodes: dyn(z.array(treeNode)).describe('Tree: {id,text,icon?,children?}[]'),
    selected: str('Selected node id; bind with {path}')
  }),
  ListView: component('ListView', {
    columns: z.array(z.object({ key: z.string(), header: z.string(), width: z.number().optional() }).strict()).optional().describe('Columns (Details view)'),
    rows: dyn(z.array(row)).describe('Rows: objects keyed by column key; optional "id" and "icon"'),
    view: z.enum(['Details', 'List', 'LargeIcon']).optional(),
    selected: str('Selected row id; bind with {path}')
  }),
  DataGridView: component('DataGridView', {
    columns: z.array(column).describe('Column definitions'),
    rows: dyn(z.array(row)).describe('Row objects keyed by column key; bind with {path} for editing'),
    readOnly: z.boolean().optional()
  }),
  PropertyGrid: component('PropertyGrid', {
    properties: dyn(
      z.array(
        z
          .object({
            category: z.string(),
            name: z.string(),
            value: z.unknown(),
            type: z.enum(['text', 'number', 'boolean', 'choice']).optional().describe('Editor type (default text)')
          })
          .strict()
      )
    ).describe('Property rows grouped by category; bind with {path}')
  }),
  CodeViewer: component('CodeViewer', {
    code: str('Source code'),
    language: z.string().optional().describe('Language id, e.g. "typescript"'),
    lineNumbers: z.boolean().optional(),
    highlightLines: z.array(z.number().int()).optional().describe('1-based line numbers to highlight')
  }),
  DiffViewer: component('DiffViewer', {
    path: z.string().optional().describe('File path shown in the header'),
    oldText: z.string().optional().describe('Original text (with newText)'),
    newText: z.string().optional().describe('Modified text (with oldText)'),
    diff: z.string().optional().describe('Unified diff text, as an alternative to oldText/newText')
  }).refine((c) => c.diff !== undefined || (c.oldText !== undefined && c.newText !== undefined), {
    message: 'DiffViewer needs either "diff" or both "oldText" and "newText"'
  }),
  ConsoleView: component('ConsoleView', { text: str('Monospace console output') }),
  Markdown: component('Markdown', { text: str('Markdown source') }),
  MessageBoxPanel: component('MessageBoxPanel', {
    icon: z.enum(['info', 'warning', 'error', 'question']).optional(),
    text: str('Message'),
    buttons: z.array(z.object({ text: z.string(), action }).strict()).describe('Buttons, each firing an action')
  })
} as const

export type A2uiComponentName = keyof typeof schemas
export const A2UI_COMPONENT_NAMES = Object.keys(schemas) as A2uiComponentName[]

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] }

const formatIssues = (error: z.ZodError, prefix = ''): string[] =>
  error.issues.map((i) => `${prefix}${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`)

/** Validate one component against its catalog schema. */
export function validateComponent(input: unknown): ValidationResult<A2uiComponent> {
  const name = typeof input === 'object' && input !== null ? (input as Record<string, unknown>).component : undefined
  if (typeof name !== 'string') return { ok: false, errors: ['component: missing "component" name'] }
  if (!(A2UI_COMPONENT_NAMES as string[]).includes(name))
    return { ok: false, errors: [`component: unknown "${name}". Known: ${A2UI_COMPONENT_NAMES.join(', ')}`] }
  const result = schemas[name as A2uiComponentName].safeParse(input)
  return result.success ? { ok: true, value: result.data as A2uiComponent } : { ok: false, errors: formatIssues(result.error) }
}

const surfaceId = z.string().min(1)
const messageSchema = z.union([
  z.object({ createSurface: z.object({ surfaceId, catalogId: z.string().optional(), title: z.string().optional() }).strict() }),
  z.object({ updateComponents: z.object({ surfaceId, components: z.array(z.unknown()) }).strict() }),
  z.object({ updateDataModel: z.object({ surfaceId, path: z.string().optional(), value: z.unknown() }).strict() }),
  z.object({ deleteSurface: z.object({ surfaceId }).strict() })
])

/** Validate a server message including each component of updateComponents. `version` is accepted and dropped. */
export function validateServerMessage(input: unknown): ValidationResult<A2uiServerMessage> {
  if (typeof input !== 'object' || input === null) return { ok: false, errors: ['message must be an object'] }
  const { version: _version, ...rest } = input as Record<string, unknown>
  const parsed = messageSchema.safeParse(rest)
  if (!parsed.success)
    return { ok: false, errors: ['expected exactly one of createSurface, updateComponents, updateDataModel, deleteSurface with valid fields'] }
  if ('updateComponents' in parsed.data) {
    const errors: string[] = []
    const components: A2uiComponent[] = []
    parsed.data.updateComponents.components.forEach((c, i) => {
      const r = validateComponent(c)
      if (r.ok) components.push(r.value)
      else {
        const cid = (c as { id?: unknown } | null)?.id
        errors.push(...r.errors.map((e) => `components[${i}]${typeof cid === 'string' ? ` (${cid})` : ''}: ${e}`))
      }
    })
    if (errors.length) return { ok: false, errors }
    return { ok: true, value: { updateComponents: { surfaceId: parsed.data.updateComponents.surfaceId, components } } }
  }
  return { ok: true, value: parsed.data as A2uiServerMessage }
}

/** Validate a batch; all-or-nothing, errors prefixed with the message index. */
export function validateServerMessages(input: unknown): ValidationResult<A2uiServerMessage[]> {
  if (!Array.isArray(input)) return { ok: false, errors: ['messages must be an array'] }
  const out: A2uiServerMessage[] = []
  const errors: string[] = []
  input.forEach((m, i) => {
    const r = validateServerMessage(m)
    if (r.ok) out.push(r.value)
    else errors.push(...r.errors.map((e) => `messages[${i}]: ${e}`))
  })
  return errors.length ? { ok: false, errors } : { ok: true, value: out }
}

type JsonSchema = {
  type?: string | string[]
  enum?: unknown[]
  const?: unknown
  anyOf?: JsonSchema[]
  items?: JsonSchema
  properties?: Record<string, JsonSchema>
  required?: string[]
  description?: string
  $ref?: string
}

/** Compact one-line type notation of a JSON schema node. */
function typeOf(s: JsonSchema): string {
  if (s.const !== undefined) return JSON.stringify(s.const)
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join('|')
  if (s.anyOf) {
    const parts = s.anyOf.map(typeOf)
    return [...new Set(parts)].join(' | ')
  }
  if (s.type === 'array') return `${s.items ? typeOf(s.items) : 'any'}[]`
  if (s.type === 'object' && s.properties)
    return `{${Object.entries(s.properties)
      .map(([k, v]) => `${k}${s.required?.includes(k) ? '' : '?'}: ${typeOf(v)}`)
      .join(', ')}}`
  if (s.type === 'object') return 'object'
  if ($refOnly(s)) return 'node'
  return Array.isArray(s.type) ? s.type.join('|') : (s.type ?? 'any')
}
const $refOnly = (s: JsonSchema) => s.$ref !== undefined

export interface CatalogPropDescription {
  type: string
  required: boolean
  description?: string
}

export function describeComponent(name: A2uiComponentName): Record<string, CatalogPropDescription> {
  const js = z.toJSONSchema(schemas[name], { io: 'input', unrepresentable: 'any', target: 'draft-7' }) as JsonSchema
  const out: Record<string, CatalogPropDescription> = {}
  for (const [prop, s] of Object.entries(js.properties ?? {})) {
    if (prop === 'id' || prop === 'component') continue
    out[prop] = { type: typeOf(s), required: js.required?.includes(prop) ?? false, ...(s.description ? { description: s.description } : {}) }
  }
  return out
}

/** Compact catalog description (JSON-serialisable) for the agent. */
export function describeCatalog(): Record<A2uiComponentName, Record<string, CatalogPropDescription>> {
  return Object.fromEntries(A2UI_COMPONENT_NAMES.map((n) => [n, describeComponent(n)])) as Record<
    A2uiComponentName,
    Record<string, CatalogPropDescription>
  >
}

/** Plain-text rendering of `describeCatalog()`, one line per component; `*` marks required props. */
export function describeCatalogText(): string {
  return A2UI_COMPONENT_NAMES.map((n) => {
    const props = Object.entries(describeComponent(n))
      .map(([p, d]) => `${p}${d.required ? '*' : ''}: ${d.type}${d.description ? ` (${d.description})` : ''}`)
      .join('; ')
    return `- ${n}: ${props}`
  }).join('\n')
}
