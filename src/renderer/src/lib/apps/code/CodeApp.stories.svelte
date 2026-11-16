<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { sampleState } from '../../app/fakeApi'
  import AppStory from '../AppStory.svelte'
  import { sampleChatView } from '../storyHost.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Code',
    parameters: { layout: 'fullscreen' }
  })

  /** The sample session while the agent is in the middle of editing src/index.ts. */
  const editingState = () => {
    const state = sampleState()
    state.toolCalls = {
      ...state.toolCalls,
      live: { title: 'Edit src/index.ts', kind: 'edit', status: 'in_progress', rawInput: null, locations: [{ path: 'E:\\src\\index.ts', line: 1 }], contents: [] }
    }
    return state
  }
</script>

<Story name="Default" asChild>
  <AppStory
    app="code"
    width={940}
    height={620}
    setup={(host) => host.open({ app: 'chat' }, sampleChatView())}
    agent={[
      { label: 'code_open src/index.ts', view: { app: 'code', tabs: ['E:\\src\\auth\\redirect.ts', 'E:\\src\\index.ts'], activePath: 'E:\\src\\index.ts', visibleLines: null, selection: null, selectedChangeId: null } },
      { label: 'code_reveal lines 14-20', view: { app: 'code', tabs: ['E:\\src\\auth\\redirect.ts', 'E:\\src\\index.ts'], activePath: 'E:\\src\\auth\\redirect.ts', visibleLines: [14, 20], selection: null, selectedChangeId: null } },
      { label: 'code_show_diff', view: { app: 'code', tabs: ['E:\\src\\auth\\redirect.ts'], activePath: 'E:\\src\\auth\\redirect.ts', visibleLines: null, selection: null, selectedChangeId: 1 } }
    ]}
  />
</Story>

<Story name="Agent is editing" asChild>
  <AppStory
    app="code"
    width={940}
    height={620}
    aguiState={editingState}
    view={{ app: 'code', tabs: ['E:\\src\\index.ts', 'E:\\src\\auth\\redirect.ts'], activePath: 'E:\\src\\index.ts', visibleLines: null, selection: null, selectedChangeId: 1 }}
    setup={(host) => host.open({ app: 'chat' }, sampleChatView())}
  />
</Story>
