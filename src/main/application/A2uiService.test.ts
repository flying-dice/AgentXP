import { beforeEach, describe, expect, it } from 'vitest'
import { A2UI_CATALOG_ID, type A2uiClientEvent, type A2uiServerMessage } from '@shared/a2ui'
import { a2uiSurfaceToMessages } from '@shared/a2ui/messages'
import { A2uiMessageValidator } from '@shared/a2ui/validation'
import { A2uiService, type HiddenPrompter } from './A2uiService'
import { createAppFixture } from './test-helpers'

let f: ReturnType<typeof createAppFixture>
let service: A2uiService
let sent: Array<{ sessionId: number; text: string }>

beforeEach(() => {
  f = createAppFixture()
  sent = []
  const prompter: HiddenPrompter = { sendHidden: async (sessionId, text) => void sent.push({ sessionId, text }) }
  service = new A2uiService(f.repos.surfaces, f.repos.transcripts, f.repos.sessions, f.publisher, prompter)
})

const key = (): string => String(f.sessionId)
const v = 'v0.9' as const
const createSurface = (surfaceId = 's1', theme?: { title: string }): A2uiServerMessage => ({
  version: v,
  createSurface: { surfaceId, catalogId: A2UI_CATALOG_ID, ...(theme ? { theme } : {}) }
})

describe('A2uiService.apply', () => {
  it('creates a surface with a transcript entry and publishes both', async () => {
    const result = await service.apply(key(), [
      createSurface('s1', { title: 'Form' }),
      { version: v, updateComponents: { surfaceId: 's1', components: [{ id: 'root', component: 'Label', text: 'Hi' }] } },
      { version: v, updateDataModel: { surfaceId: 's1', path: '/name', value: 'Ann' } }
    ])

    expect(result).toEqual({ ok: true })
    expect(f.repos.transcripts.list(f.sessionId)).toMatchObject([{ kind: 'a2ui', surfaceId: 's1' }])
    expect(f.publisher.payloads('transcript.upserted')).toHaveLength(1)
    const surface = f.publisher.payloads('surface.changed').at(-1)
    expect(surface).toMatchObject({ surfaceId: 's1', title: 'Form', dataModel: { name: 'Ann' } })
    expect(surface?.components).toHaveLength(1)
  })

  it('rejects re-creating a surface (web_core: it already exists) and keeps one transcript entry', async () => {
    await service.apply(key(), [createSurface()])
    const again = await service.apply(key(), [createSurface()])
    expect(again).toEqual({ ok: false, errors: ['messages[0]: Surface s1 already exists.'] })
    expect(f.repos.transcripts.list(f.sessionId)).toHaveLength(1)
  })

  it('stores nothing when any message of the batch is invalid', async () => {
    const result = await service.apply(key(), [
      createSurface(),
      { version: v, updateComponents: { surfaceId: 's1', components: [{ id: 'root', component: 'Button', text: 'no action' }] } }
    ])
    expect(result.ok).toBe(false)
    expect(f.repos.surfaces.get(f.sessionId, 's1')).toBeNull()
    expect(f.repos.transcripts.list(f.sessionId)).toHaveLength(0)
  })

  it('persists surfaces that replay as valid messages (the ACTIVITY_SNAPSHOT content)', async () => {
    await service.apply(key(), [
      createSurface('s1', { title: 'Form' }),
      {
        version: v,
        updateComponents: {
          surfaceId: 's1',
          components: [
            { id: 'root', component: 'Panel', children: ['name'] },
            { id: 'name', component: 'TextBox', value: { path: '/name' } }
          ]
        }
      },
      { version: v, updateDataModel: { surfaceId: 's1', path: '/name', value: 'Ann' } }
    ])
    const replay = a2uiSurfaceToMessages(f.repos.surfaces.get(f.sessionId, 's1')!)
    expect(replay.map((m) => Object.keys(m).find((k) => k !== 'version'))).toEqual(['createSurface', 'updateComponents', 'updateDataModel'])
    expect(new A2uiMessageValidator().validate(replay).ok).toBe(true)
  })

  it('removes a data model key when the value is omitted', async () => {
    await service.apply(key(), [createSurface(), { version: v, updateDataModel: { surfaceId: 's1', value: { a: 1, b: 2 } } }])
    await service.apply(key(), [{ version: v, updateDataModel: { surfaceId: 's1', path: '/a' } }])
    expect(f.repos.surfaces.get(f.sessionId, 's1')?.dataModel).toEqual({ b: 2 })
    await service.apply(key(), [{ version: v, updateDataModel: { surfaceId: 's1' } }])
    expect(f.repos.surfaces.get(f.sessionId, 's1')?.dataModel).toEqual({})
  })

  it('removes surfaces and reports unknown ones', async () => {
    await service.apply(key(), [createSurface()])
    expect(await service.apply(key(), [{ version: v, deleteSurface: { surfaceId: 's1' } }])).toEqual({ ok: true })
    expect(f.publisher.payloads('surface.removed')).toEqual([{ sessionId: f.sessionId, surfaceId: 's1' }])

    const result = await service.apply(key(), [{ version: v, updateComponents: { surfaceId: 'nope', components: [{ id: 'root', component: 'Label', text: 'x' }] } }])
    expect(result).toEqual({ ok: false, errors: ['messages[0]: Surface not found for message: nope'] })
  })

  it('rejects unknown sessions', async () => {
    expect(await service.apply('999', [])).toMatchObject({ ok: false })
    expect(await service.apply('abc', [])).toMatchObject({ ok: false })
  })
})

describe('A2uiService.dispatch', () => {
  const event = (extra: Partial<A2uiClientEvent> = {}): A2uiClientEvent => ({
    surfaceId: 's1',
    sourceComponentId: 'ok',
    action: { name: 'submit' },
    dataModel: { name: 'Ann' },
    timestamp: '2026-01-01T00:00:00.000Z',
    ...extra
  })

  it('sends a readable line plus the JSON event to the session owning the surface', async () => {
    await service.apply(key(), [createSurface()])
    await service.dispatch(event())

    expect(sent).toHaveLength(1)
    expect(sent[0]!.sessionId).toBe(f.sessionId)
    const [line, , fenceStart, ...rest] = sent[0]!.text.split('\n')
    expect(line).toContain('"submit"')
    expect(fenceStart).toBe('```json')
    expect(JSON.parse(rest.slice(0, -1).join('\n'))).toMatchObject({ surfaceId: 's1', dataModel: { name: 'Ann' } })
  })

  it('prefers the sessionId carried by the event and fails for unknown surfaces', async () => {
    await service.dispatch(event({ sessionId: f.sessionId }))
    expect(sent[0]!.sessionId).toBe(f.sessionId)
    await expect(service.dispatch(event({ surfaceId: 'ghost' }))).rejects.toThrow('No session shows')
  })
})
