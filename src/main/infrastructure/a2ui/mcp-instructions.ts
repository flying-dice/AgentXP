import { A2UI_CATALOG_ID } from '@shared/a2ui'
import { describeCatalogText } from '@shared/a2ui-catalog'

export const A2UI_EXAMPLE = [
  { createSurface: { surfaceId: 'greet', catalogId: A2UI_CATALOG_ID, title: 'Greeting' } },
  {
    updateComponents: {
      surfaceId: 'greet',
      components: [
        { id: 'root', component: 'GroupBox', text: 'Who are you?', children: ['name', 'ok'] },
        { id: 'name', component: 'TextBox', value: { path: '/name' }, placeholder: 'Your name' },
        { id: 'ok', component: 'Button', text: 'OK', isDefault: true, action: { name: 'submit', context: { name: { path: '/name' } } } }
      ]
    }
  },
  { updateDataModel: { surfaceId: 'greet', path: '/name', value: '' } }
]

export const USAGE_INSTRUCTIONS = `Draw interactive Windows 7 WinForms-style UI inline in the chat with a2ui_render.
Send A2UI server messages: createSurface, updateComponents (upsert by id; the root component must have id "root"), updateDataModel (JSON-pointer path, omit path to replace the whole model) and deleteSurface.
Components form a flat list; containers reference children by id. Dynamic props accept a literal or {"path": "/pointer"} bound to the data model (inputs write back to it). Button/LinkLabel actions send {name, context} back to you as a new prompt, with bound values resolved.
Re-sending updateComponents with the same ids updates a surface in place.`

export function buildCatalogReply(): string {
  return `${USAGE_INSTRUCTIONS}\n\nComponents (* = required prop):\n${describeCatalogText()}\n\nExample messages:\n${JSON.stringify(A2UI_EXAMPLE, null, 1)}`
}
