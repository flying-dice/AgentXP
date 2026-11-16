import { A2UI_CATALOG_ID, type A2uiServerMessage } from '@shared/a2ui'
import { winformsCatalog, type WinformsCatalog } from '@shared/a2ui/catalog'
import { A2UI_VERSION } from '@shared/a2ui/messages'

export const A2UI_EXAMPLE: A2uiServerMessage[] = [
  { version: A2UI_VERSION, createSurface: { surfaceId: 'greet', catalogId: A2UI_CATALOG_ID, theme: { title: 'Greeting' } } },
  {
    version: A2UI_VERSION,
    updateComponents: {
      surfaceId: 'greet',
      components: [
        { id: 'root', component: 'GroupBox', text: 'Who are you?', children: ['name', 'hello', 'ok'] },
        { id: 'name', component: 'TextBox', value: { path: '/name' }, placeholder: 'Your name' },
        { id: 'hello', component: 'Label', text: { call: 'formatString', args: { value: 'Hello ${/name}!' }, returnType: 'string' } },
        {
          id: 'ok',
          component: 'Button',
          text: 'OK',
          isDefault: true,
          action: { event: { name: 'submit', context: { name: { path: '/name' } } } }
        }
      ]
    }
  },
  { version: A2UI_VERSION, updateDataModel: { surfaceId: 'greet', path: '/name', value: '' } }
]

/**
 * What `a2ui_catalog` returns: the catalog's own instructions, its catalog document as generated
 * by web_core (`catalog.toJson()`: JSON Schema per component and function) and an example.
 */
export function buildCatalogReply(catalog: WinformsCatalog = winformsCatalog): string {
  const { instructions, ...document } = catalog.toJson()
  return [
    String(instructions ?? ''),
    'Catalog document (JSON Schema; the properties of each component are under components.<Name>, shared types under $defs):',
    JSON.stringify(document),
    `Example messages:\n${JSON.stringify(A2UI_EXAMPLE, null, 1)}`
  ].join('\n\n')
}
