/** Literal A2UI v0.9 message arrays, the way an agent would send them; used by the stories and their test. */
import { A2UI_CATALOG_ID, type A2uiServerMessage } from '@shared/a2ui'

type Component = Record<string, unknown> & { id: string; component: string }

const v = 'v0.9' as const

function surface(surfaceId: string, title: string, components: Component[], dataModel?: Record<string, unknown>): A2uiServerMessage[] {
  return [
    { version: v, createSurface: { surfaceId, catalogId: A2UI_CATALOG_ID, theme: { title } } },
    { version: v, updateComponents: { surfaceId, components } },
    ...(dataModel ? [{ version: v, updateDataModel: { surfaceId, value: dataModel } } satisfies A2uiServerMessage] : [])
  ]
}

const required = (path: string, message: string) => ({
  condition: { call: 'required', args: { value: { path } }, returnType: 'boolean' },
  message
})

const interpolate = (value: string) => ({ call: 'formatString', args: { value }, returnType: 'string' })

/** A settings form: two-way bindings, validation checks, string interpolation and a submit button. */
export const settingsForm = surface(
  'settings',
  'Connection settings',
  [
    { id: 'root', component: 'Panel', children: ['connection', 'auth', 'summary', 'buttons'] },
    { id: 'connection', component: 'GroupBox', text: 'Server', children: ['host-row', 'port-row', 'proto-row', 'tls'] },
    { id: 'host-row', component: 'FlowLayoutPanel', children: ['host-label', 'host'] },
    { id: 'host-label', component: 'Label', text: 'Host name:' },
    { id: 'host', component: 'TextBox', value: { path: '/host' }, placeholder: 'example.com', checks: [required('/host', 'Enter a host name.')] },
    { id: 'port-row', component: 'FlowLayoutPanel', children: ['port-label', 'port'] },
    { id: 'port-label', component: 'Label', text: 'Port:' },
    { id: 'port', component: 'NumericUpDown', value: { path: '/port' }, min: 1, max: 65535 },
    { id: 'proto-row', component: 'FlowLayoutPanel', children: ['proto-label', 'proto'] },
    { id: 'proto-label', component: 'Label', text: 'Protocol:' },
    { id: 'proto', component: 'ComboBox', options: ['stdio', { value: 'http', label: 'HTTP' }, { value: 'sse', label: 'Server-sent events' }], value: { path: '/protocol' } },
    { id: 'tls', component: 'CheckBox', text: 'Use a secure connection (TLS)', checked: { path: '/tls' } },
    { id: 'auth', component: 'GroupBox', text: 'Authentication', children: ['auth-choice', 'timeout-row'] },
    { id: 'auth-choice', component: 'RadioButtonGroup', orientation: 'horizontal', options: [{ value: 'none', label: 'None' }, { value: 'token', label: 'Token' }, { value: 'basic', label: 'Basic' }], value: { path: '/auth' } },
    { id: 'timeout-row', component: 'FlowLayoutPanel', children: ['timeout-label', 'timeout'] },
    { id: 'timeout-label', component: 'Label', text: interpolate('Timeout: ${/timeout} s') },
    { id: 'timeout', component: 'TrackBar', min: 1, max: 60, value: { path: '/timeout' } },
    { id: 'summary', component: 'Label', text: interpolate('Will connect to ${/protocol}://${/host}:${/port} (auth: ${/auth}).') },
    { id: 'buttons', component: 'FlowLayoutPanel', children: ['ok', 'cancel'] },
    {
      id: 'ok',
      component: 'Button',
      text: 'Save',
      isDefault: true,
      checks: [required('/host', 'Enter a host name.')],
      action: { event: { name: 'save_settings', context: { host: { path: '/host' }, port: { path: '/port' }, protocol: { path: '/protocol' }, tls: { path: '/tls' }, auth: { path: '/auth' }, timeout: { path: '/timeout' } } } }
    },
    { id: 'cancel', component: 'Button', text: 'Cancel', action: { event: { name: 'cancel_settings' } } }
  ],
  { host: 'api.example.com', port: 443, protocol: 'http', tls: true, auth: 'token', timeout: 30 }
)

const results = [
  { id: 't1', test: 'A2uiMessageValidator accepts a full surface', status: 'passed', ms: 12 },
  { id: 't2', test: 'rejects unknown components', status: 'passed', ms: 4 },
  { id: 't3', test: 'rejects the pre-v0.9 action shape', status: 'passed', ms: 3 },
  { id: 't4', test: 'SurfaceController applies appended messages', status: 'failed', ms: 31 },
  { id: 't5', test: 'planSync rebuilds on a changed createSurface', status: 'passed', ms: 2 },
  { id: 't6', test: 'DataGridView edits write back', status: 'skipped', ms: 0 }
]

/** A data grid of test results with a progress bar, a list view and a re-run action. */
export const testResults = surface(
  'tests',
  'Test run: 6 tests',
  [
    { id: 'root', component: 'Panel', children: ['summary', 'progress', 'tabs', 'actions'] },
    { id: 'summary', component: 'Label', text: interpolate('${/passed} passed, ${/failed} failed, ${/skipped} skipped of ${/total}') },
    { id: 'progress', component: 'ProgressBar', value: { path: '/passed' }, max: 6, state: 'error' },
    {
      id: 'tabs',
      component: 'TabControl',
      tabs: [
        { title: 'Results', child: 'grid' },
        { title: 'Failures', child: 'failures' }
      ]
    },
    {
      id: 'grid',
      component: 'DataGridView',
      columns: [
        { key: 'test', header: 'Test', width: 280, readOnly: true },
        { key: 'status', header: 'Status', width: 90, type: 'combo', options: ['passed', 'failed', 'skipped'] },
        { key: 'ms', header: 'Time (ms)', width: 80, type: 'number', readOnly: true }
      ],
      rows: { path: '/results' }
    },
    {
      id: 'failures',
      component: 'ListView',
      view: 'Details',
      columns: [{ key: 'test', header: 'Test', width: 300 }, { key: 'ms', header: 'Time (ms)', width: 80, align: 'right' }],
      rows: { path: '/failed-rows' },
      selected: { path: '/selected' }
    },
    { id: 'actions', component: 'FlowLayoutPanel', children: ['rerun', 'selected-label'] },
    { id: 'rerun', component: 'Button', text: 'Re-run failed', icon: 'refresh', action: { event: { name: 'rerun_failed', context: { selected: { path: '/selected' } } } } },
    { id: 'selected-label', component: 'Label', text: interpolate('Selected: ${/selected}') }
  ],
  { results, 'failed-rows': results.filter((r) => r.status === 'failed'), passed: 4, failed: 1, skipped: 1, total: 6, selected: [] }
)

const unifiedDiff = `diff --git a/src/shared/a2ui.ts b/src/shared/a2ui.ts
--- a/src/shared/a2ui.ts
+++ b/src/shared/a2ui.ts
@@ -1,6 +1,6 @@
-export type A2uiServerMessage =
-  | { createSurface: { surfaceId: string; catalogId: string } }
-  | { deleteSurface: { surfaceId: string } }
+import type { A2uiMessage } from '@a2ui/web_core/v0_9'
+
+export type A2uiServerMessage = A2uiMessage
 
 export const A2UI_CATALOG_ID = 'https://agentxp.dev/a2ui/catalogs/winforms/v1'
`

const sample = `export function a2uiSurfaceToMessages(surface: A2uiSurfaceDto): A2uiServerMessage[] {
  const { surfaceId } = surface
  const messages: A2uiServerMessage[] = [
    { version: 'v0.9', createSurface: { surfaceId, catalogId: surface.catalogId } }
  ]
  if (surface.components.length > 0) {
    messages.push({ version: 'v0.9', updateComponents: { surfaceId, components: surface.components } })
  }
  return messages
}`

/** A review panel: diff, code, a confirmation message box and a free-text comment. */
export const codeReview = surface(
  'review',
  'Review: replace hand-rolled message types',
  [
    { id: 'root', component: 'Panel', children: ['intro', 'diff', 'code', 'comment-box', 'confirm'] },
    { id: 'intro', component: 'Label', text: 'The agent changed 1 file. Review the diff before applying it.' },
    { id: 'diff', component: 'DiffViewer', path: 'src/shared/a2ui.ts', diff: unifiedDiff },
    { id: 'code', component: 'CodeViewer', language: 'typescript', code: sample, highlightLines: [4, 5] },
    { id: 'comment-box', component: 'GroupBox', text: 'Comment', children: ['comment'] },
    { id: 'comment', component: 'TextBox', multiline: true, value: { path: '/comment' }, placeholder: 'Optional note for the agent' },
    {
      id: 'confirm',
      component: 'MessageBoxPanel',
      icon: 'question',
      text: 'Apply these changes to the working tree?',
      buttons: [
        { text: 'Apply', action: { event: { name: 'apply_changes', context: { comment: { path: '/comment' } } } } },
        { text: 'Discard', action: { event: { name: 'discard_changes' } } }
      ]
    }
  ],
  { comment: '' }
)

/** A tabbed project overview: property grid, tree + list in a split container, console and Markdown notes. */
export const projectOverview = surface(
  'overview',
  'Project overview',
  [
    {
      id: 'root',
      component: 'TabControl',
      tabs: [
        { title: 'Properties', child: 'props' },
        { title: 'Files', child: 'files' },
        { title: 'Build', child: 'build' },
        { title: 'Notes', child: 'notes' }
      ]
    },
    {
      id: 'props',
      component: 'PropertyGrid',
      properties: [
        { key: 'name', category: 'Project', description: 'Package name' },
        { key: 'version', category: 'Project' },
        { key: 'private', category: 'Project', type: 'boolean' },
        { key: 'license', category: 'Project', type: 'enum', options: ['MIT', 'Apache-2.0', 'ISC'] },
        { key: 'workers', category: 'Build', type: 'number', description: 'Parallel jobs' },
        { key: 'target', category: 'Build', readOnly: true }
      ],
      values: { path: '/props' }
    },
    { id: 'files', component: 'SplitContainer', orientation: 'Vertical', splitterDistance: 170, panel1: 'tree', panel2: 'list' },
    {
      id: 'tree',
      component: 'TreeView',
      selected: { path: '/folder' },
      nodes: [
        { id: 'src', text: 'src', icon: 'folder', children: [{ id: 'src/main', text: 'main', icon: 'folder' }, { id: 'src/shared', text: 'shared', icon: 'folder' }, { id: 'src/renderer', text: 'renderer', icon: 'folder' }] },
        { id: 'docs', text: 'docs', icon: 'folder' },
        { id: 'package.json', text: 'package.json', icon: 'file-code' }
      ]
    },
    {
      id: 'list',
      component: 'ListView',
      columns: [{ key: 'name', header: 'Name', width: 150 }, { key: 'size', header: 'Size', width: 70, align: 'right' }],
      rows: [
        { id: 'a2ui.ts', icon: 'file-code', name: 'a2ui.ts', size: '1.9 KB' },
        { id: 'ipc.ts', icon: 'file-code', name: 'ipc.ts', size: '8.2 KB' },
        { id: 'models.ts', icon: 'file-code', name: 'models.ts', size: '5.1 KB' },
        { id: 'README', icon: 'file-text', name: 'README', size: '0.4 KB' }
      ],
      selected: { path: '/file' }
    },
    {
      id: 'build',
      component: 'Panel',
      children: ['build-status', 'console']
    },
    { id: 'build-status', component: 'Label', text: 'electron-vite build' },
    {
      id: 'console',
      component: 'ConsoleView',
      running: true,
      text: '\u001b[36m$\u001b[0m electron-vite build\n\u001b[32m✓\u001b[0m 1208 modules transformed.\nout/main/index.js  \u001b[2m148.20 kB\u001b[0m\nout/main/a2ui-mcp.js  \u001b[2m11.04 kB\u001b[0m\n\u001b[33mwarn\u001b[0m chunk larger than 500 kB\n\u001b[31merror\u001b[0m none'
    },
    {
      id: 'notes',
      component: 'Markdown',
      text: '## Release notes\n\n* A2UI now runs on **@a2ui/web_core**\n* New `winforms-catalog.json`\n\n```ts\nconst catalog = Catalog.fromJson(document)\n```\n\nSee the [protocol docs](https://a2ui.org).'
    }
  ],
  { props: { name: 'agentxp', version: '0.1.0', private: true, license: 'MIT', workers: 4, target: 'electron45' }, folder: 'src', file: [] }
)

const dot = (color: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#dce9f9"/><circle cx="32" cy="32" r="22" fill="${color}" stroke="#335" /></svg>`)}`

/** The remaining controls: lists, pickers, calendar, picture, link, flow and table layouts. */
export const controls = surface(
  'controls',
  'More controls',
  [
    { id: 'root', component: 'Panel', children: ['table', 'flow', 'link'] },
    { id: 'table', component: 'TableLayoutPanel', columns: 2, columnWidths: ['50%', '50%'], children: ['list-box', 'checked-box', 'picker-group', 'calendar'] },
    { id: 'list-box', component: 'ListBox', multi: true, options: ['Alpha', 'Beta', 'Gamma', 'Delta'], selected: { path: '/list' } },
    { id: 'checked-box', component: 'CheckedListBox', options: [{ value: 'lint', label: 'Lint' }, { value: 'test', label: 'Test' }, { value: 'build', label: 'Build' }], checked: { path: '/checks' } },
    { id: 'picker-group', component: 'GroupBox', text: 'Schedule', children: ['picker', 'picked'] },
    { id: 'picker', component: 'DateTimePicker', value: { path: '/date' } },
    { id: 'picked', component: 'Label', text: interpolate('Date: ${/date}') },
    { id: 'calendar', component: 'MonthCalendar', value: { path: '/date' } },
    { id: 'flow', component: 'FlowLayoutPanel', wrap: true, children: ['picture', 'marquee', 'disabled'] },
    { id: 'picture', component: 'PictureBox', src: dot('#3b8ad9'), sizeMode: 'Zoom', width: 64, height: 64 },
    { id: 'marquee', component: 'ProgressBar', style: 'Marquee', value: 0 },
    { id: 'disabled', component: 'Button', text: 'Disabled', enabled: false, action: { event: { name: 'never' } } },
    { id: 'link', component: 'LinkLabel', text: 'Open the A2UI docs', action: { event: { name: 'open_docs', context: { url: 'https://a2ui.org' } } } }
  ],
  { list: ['Beta'], checks: ['lint', 'test'], date: '2026-11-16' }
)

/** Progressive streaming: each entry is sent in a later `updateComponents` / `updateDataModel` message. */
export const streamingBatches: A2uiServerMessage[][] = [
  [{ version: v, createSurface: { surfaceId: 'stream', catalogId: A2UI_CATALOG_ID, theme: { title: 'Build progress' } } }],
  [
    {
      version: v,
      updateComponents: {
        surfaceId: 'stream',
        components: [
          { id: 'root', component: 'Panel', children: ['label', 'bar'] },
          { id: 'label', component: 'Label', text: interpolate('Building... ${/percent}%') },
          { id: 'bar', component: 'ProgressBar', value: { path: '/percent' } }
        ]
      }
    }
  ],
  [{ version: v, updateDataModel: { surfaceId: 'stream', path: '/percent', value: 25 } }],
  [{ version: v, updateDataModel: { surfaceId: 'stream', path: '/percent', value: 70 } }],
  [
    { version: v, updateDataModel: { surfaceId: 'stream', path: '/percent', value: 100 } },
    {
      version: v,
      updateComponents: {
        surfaceId: 'stream',
        components: [
          { id: 'root', component: 'Panel', children: ['label', 'bar', 'done'] },
          { id: 'done', component: 'Button', text: 'Open output folder', icon: 'open-folder', action: { event: { name: 'open_output' } } }
        ]
      }
    }
  ]
]
