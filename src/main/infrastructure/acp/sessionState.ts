import type { SessionConfigOption, SessionModeState } from '@agentclientprotocol/sdk'
import type { SessionModeDto, SessionModelDto } from '@shared/models'

export interface SessionState {
  modes: SessionModeDto[]
  models: SessionModelDto[]
  currentModeId: string | null
  currentModelId: string | null
  /** Id of the config option that selects the model, when the agent uses config options. */
  modelConfigId: string | null
}

interface SessionStateSource {
  modes?: SessionModeState | null
  configOptions?: SessionConfigOption[] | null
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)

function fromModeState(state: SessionModeState | null | undefined): Pick<SessionState, 'modes' | 'currentModeId'> {
  if (!state) return { modes: [], currentModeId: null }
  return {
    currentModeId: state.currentModeId,
    modes: state.availableModes.map((m) => ({ id: m.id, name: m.name, description: m.description ?? null }))
  }
}

/** Legacy/unstable shape: `models: { availableModels: [{ modelId, name }], currentModelId }`. */
function fromLegacyModels(raw: unknown): Pick<SessionState, 'models' | 'currentModelId'> | null {
  if (!isRecord(raw) || !isRecord(raw.models) || !Array.isArray(raw.models.availableModels)) return null
  const models = raw.models.availableModels.filter(isRecord).flatMap((m): SessionModelDto[] => {
    const id = str(m.modelId)
    return id === null ? [] : [{ id, name: str(m.name) ?? id, description: str(m.description) }]
  })
  return { models, currentModelId: str(raw.models.currentModelId) }
}

function fromConfigOptions(options: SessionConfigOption[] | null | undefined): Pick<SessionState, 'models' | 'currentModelId' | 'modelConfigId'> {
  const option = options?.find((o) => o.category === 'model' && o.type === 'select')
  if (!option || option.type !== 'select') return { models: [], currentModelId: null, modelConfigId: null }
  const flat = option.options.flatMap((entry) => ('group' in entry ? entry.options : [entry]))
  return {
    modelConfigId: option.id,
    currentModelId: option.currentValue,
    models: flat.map((o) => ({ id: o.value, name: o.name, description: o.description ?? null }))
  }
}

/** Reads modes and models from a session/new or session/load response. */
export function extractSessionState(response: SessionStateSource): SessionState {
  const modes = fromModeState(response.modes)
  const legacy = fromLegacyModels(response)
  const config = fromConfigOptions(response.configOptions)
  // Config options are the current protocol. An empty legacy list must not hide its advertised choices.
  const models = config.modelConfigId ? config : legacy ?? config
  return { ...modes, models: models.models, currentModelId: models.currentModelId, modelConfigId: config.modelConfigId }
}
