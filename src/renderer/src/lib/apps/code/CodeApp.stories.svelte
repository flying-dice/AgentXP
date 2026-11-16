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

  /** A file that differs from HEAD, with a second tab. */
  const gitView = { app: 'code' as const, tabs: ['E:\\src\\index.ts', 'E:\\src\\auth\\redirect.ts'], activePath: 'E:\\src\\index.ts', visibleLines: null, selection: null, selectedChangeId: null }
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


<!-- Git status in the tree (letters, colours, folder dots, agent pencil), branch in the status bar, Git tab. -->
<Story
  name="GitStatusTree"
  asChild
  play={async ({ canvasElement }) => {
    const folders = (): HTMLElement[] => [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="code-tree-item"][data-kind="directory"] .tarrow')]
    for (let i = 0; i < 40 && folders().length === 0; i++) await new Promise((r) => setTimeout(r, 50))
    for (const name of ['docs', 'src', 'tests']) {
      const row = [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="code-tree-item"][data-kind="directory"]')].find((r) => r.textContent?.includes(name))
      row?.querySelector<HTMLElement>('.tarrow')?.click()
      await new Promise((r) => setTimeout(r, 120))
    }
  }}
>
  <AppStory app="code" width={940} height={620} view={{ ...gitView }} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>

<!-- The gutter marks and the overview ruler of a file that differs from HEAD. -->
<Story name="GutterMarks" asChild>
  <AppStory app="code" width={940} height={620} view={{ ...gitView }} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>

<!-- A click on a gutter mark opens the peek with the old and the new lines and Revert hunk / Close. -->
<Story
  name="HunkPeek"
  asChild
  play={async ({ canvasElement }) => {
    for (let i = 0; i < 40 && !canvasElement.querySelector('[data-testid="code-gutter-mark"]'); i++) await new Promise((r) => setTimeout(r, 50))
    canvasElement.querySelectorAll<HTMLElement>('[data-testid="code-gutter-mark"]')[1]?.click()
  }}
>
  <AppStory app="code" width={940} height={620} view={{ ...gitView }} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>
