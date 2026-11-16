<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { sampleState } from '../../app/fakeApi'
  import AppStory from '../AppStory.svelte'
  import { sampleChatView } from '../storyHost.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Terminal',
    parameters: { layout: 'fullscreen' }
  })

  /** Two terminals: a finished test run and a build that is still going. */
  const twoTerminals = () => {
    const state = sampleState()
    state.terminals = {
      ...state.terminals,
      term2: {
        command: 'npm run build',
        output: '> claude-code-win@1.2.0 build\n> tsc -p . && vite build\n\n\u001b[36mvite v5.4.0\u001b[0m building for production...\ntransforming (212) src/auth/redirect.ts',
        exitCode: null
      }
    }
    return state
  }
</script>

<Story name="Default" asChild>
  <AppStory app="terminal" width={700} height={360} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>

<Story name="Several terminals" asChild>
  <AppStory app="terminal" width={700} height={360} aguiState={twoTerminals} setup={(host) => host.open({ app: 'chat' }, sampleChatView())} />
</Story>

<Story name="No terminal yet" asChild>
  <AppStory app="terminal" width={700} height={280} />
</Story>
