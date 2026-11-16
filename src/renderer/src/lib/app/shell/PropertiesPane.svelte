<script lang="ts">
  import type { AgentDto, FolderDto, SessionDto } from '@shared/models'
  import PropertyGrid from '../../kit/organisms/PropertyGrid.svelte'
  import type { PropertyDef } from '../../kit/organisms/PropertyGrid'
  import { statusLabel } from '../sessionStatus'

  interface Props {
    session: SessionDto
    folder: FolderDto | null
    agent: AgentDto | null
    ontitle?: (title: string) => void
    onmode?: (modeId: string) => void
    onmodel?: (modelId: string) => void
  }

  let { session, folder, agent, ontitle, onmode, onmodel }: Props = $props()

  const modeName = $derived(session.modes.find((m) => m.id === session.currentModeId)?.name ?? session.currentModeId ?? '')
  const modelName = $derived(session.models.find((m) => m.id === session.currentModelId)?.name ?? session.currentModelId ?? '')

  const properties = $derived<PropertyDef[]>([
    { key: 'title', name: 'Title', category: 'Session', description: 'The name of this session. Edit to rename it.' },
    { key: 'agent', name: 'Agent', category: 'Session', readOnly: true, description: 'The ACP agent that runs this session.' },
    { key: 'folder', name: 'Folder', category: 'Session', readOnly: true, description: folder?.path ?? 'The workspace folder.' },
    { key: 'acp', name: 'ACP session id', category: 'Session', readOnly: true, description: 'The session id the agent reported.' },
    { key: 'status', name: 'Status', category: 'Session', readOnly: true },
    {
      key: 'mode',
      name: 'Mode',
      category: 'Session',
      type: 'enum',
      options: session.modes.map((m) => m.name),
      readOnly: session.modes.length === 0,
      description: 'Applies to the next message in this session.'
    },
    {
      key: 'model',
      name: 'Model',
      category: 'Session',
      type: 'enum',
      options: session.models.map((m) => m.name),
      readOnly: session.models.length === 0,
      description: 'Applies to the next message in this session.'
    },
    { key: 'used', name: 'Context used', category: 'Usage', type: 'number', readOnly: true, description: 'Tokens in the context window.' },
    { key: 'size', name: 'Context size', category: 'Usage', type: 'number', readOnly: true, description: 'Size of the context window in tokens.' }
  ])

  const values = $derived<Record<string, unknown>>({
    title: session.title,
    agent: agent?.name ?? '',
    folder: folder?.path ?? '',
    acp: session.acpSessionId ?? '',
    status: statusLabel(session.status),
    mode: modeName,
    model: modelName,
    used: session.contextUsed,
    size: session.contextSize
  })

  function change(key: string, value: unknown): void {
    if (key === 'title' && typeof value === 'string' && value.trim() && value !== session.title) ontitle?.(value.trim())
    else if (key === 'mode') {
      const mode = session.modes.find((m) => m.name === value)
      if (mode && mode.id !== session.currentModeId) onmode?.(mode.id)
    } else if (key === 'model') {
      const model = session.models.find((m) => m.name === value)
      if (model && model.id !== session.currentModelId) onmodel?.(model.id)
    }
  }
</script>

<PropertyGrid class="props-grid" {properties} {values} onchange={change} aria-label="Session properties" />

<style>
  :global(.props-grid.props-grid) {
    flex: 1;
    border: 0;
  }
</style>
