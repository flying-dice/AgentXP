import { beforeEach, describe, expect, it } from 'vitest'
import { A2UI_CATALOG_ID, type A2uiClientEvent } from '@shared/a2ui'
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

describe('A2uiService.apply', () => {
  it('creates a surface with a transcript entry and publishes both', async () => {
    const result = await service.apply(key(), [
      { createSurface: { surfaceId: 's1', catalogId: A2UI_CATALOG_ID, title: 'Form' } },
      { updateComponents: { surfaceId: 's1', components: [{ id: 'root', component: 'Label', text: 'Hi' }] } },
      { updateDataModel: { surfaceId: 's1', path: '/name', value: 'Ann' } }
    ])

    expect(result).toEqual({ ok: true })
    expect(f.repos.transcripts.list(f.sessionId)).toMatchObject([{ kind: 'a2ui', surfaceId: 's1' }])
    expect(f.publisher.payloads('transcript.upserted')).toHaveLength(1)
    const surface = f.publisher.payloads('surface.changed').at(-1)
    expect(surface).toMatchObject({ surfaceId: 's1', title: 'Form', dataModel: { name: 'Ann' } })
    expect(surface?.components).toHaveLength(1)
  })

  it('does not add a second transcript entry when a surface is re-created', async () => {
    const create = { createSurface: { surfaceId: 's1', catalogId: A2UI_CATALOG_ID } }
    await service.apply(key(), [create])
    await service.apply(key(), [create])
    expect(f.repos.transcripts.list(f.sessionId)).toHaveLength(1)
  })

  it('removes surfaces and reports unknown ones', async () => {
    await service.apply(key(), [{ createSurface: { surfaceId: 's1', catalogId: A2UI_CATALOG_ID } }])
    expect(await service.apply(key(), [{ deleteSurface: { surfaceId: 's1' } }])).toEqual({ ok: true })
    expect(f.publisher.payloads('surface.removed')).toEqual([{ sessionId: f.sessionId, surfaceId: 's1' }])

    const result = await service.apply(key(), [{ updateComponents: { surfaceId: 'nope', components: [] } }])
    expect(result).toEqual({ ok: false, errors: ['unknown surface: nope'] })
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
    await service.apply(key(), [{ createSurface: { surfaceId: 's1', catalogId: A2UI_CATALOG_ID } }])
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
