import { MessageProcessor } from '@a2ui/web_core/v0_9'
import { describe, expect, it } from 'vitest'
import { A2UI_CATALOG_ID, type A2uiSurfaceDto } from '../a2ui'
import { winformsCatalog } from './catalog'
import { a2uiSurfaceToMessages, surfaceTitle } from './messages'
import { A2uiMessageValidator } from './validation'

const dto = (extra: Partial<A2uiSurfaceDto> = {}): A2uiSurfaceDto => ({
  surfaceId: 's',
  sessionId: 1,
  title: 'Form',
  catalogId: A2UI_CATALOG_ID,
  components: [
    { id: 'root', component: 'Panel', children: ['name'] },
    { id: 'name', component: 'TextBox', value: { path: '/name' } }
  ],
  dataModel: { name: 'Ann' },
  ...extra
})

describe('a2uiSurfaceToMessages', () => {
  it('emits createSurface, updateComponents and updateDataModel', () => {
    expect(a2uiSurfaceToMessages(dto())).toEqual([
      { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID, theme: { title: 'Form' } } },
      { version: 'v0.9', updateComponents: { surfaceId: 's', components: dto().components } },
      { version: 'v0.9', updateDataModel: { surfaceId: 's', value: { name: 'Ann' } } }
    ])
  })

  it('leaves out the theme, empty components and an empty data model', () => {
    expect(a2uiSurfaceToMessages(dto({ title: null, components: [], dataModel: {} }))).toEqual([
      { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID } }
    ])
  })

  it('produces messages that validate and rebuild the surface in web_core', () => {
    const messages = a2uiSurfaceToMessages(dto())
    expect(new A2uiMessageValidator().validate(messages).ok).toBe(true)
    const processor = new MessageProcessor([winformsCatalog])
    processor.processMessages(messages)
    const surface = processor.getSurface('s')!
    expect([...surface.componentsModel.keys]).toEqual(['root', 'name'])
    expect(surface.dataModel.get('/name')).toBe('Ann')
    expect(surface.theme).toEqual({ title: 'Form' })
  })
})

describe('surfaceTitle', () => {
  it('reads theme.title', () => {
    expect(surfaceTitle({ theme: { title: 'T' } })).toBe('T')
    expect(surfaceTitle({ theme: { title: '' } })).toBeNull()
    expect(surfaceTitle({ theme: 'x' })).toBeNull()
    expect(surfaceTitle({})).toBeNull()
  })
})
