<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { settingsForm, testResults } from '../../a2ui/A2uiSurface.fixtures'
  import { surfaceTurn } from '../../app/session/session.fixtures'
  import AppStory from '../AppStory.svelte'

  const { Story } = defineMeta({
    title: 'Apps/Surface',
    parameters: { layout: 'fullscreen' }
  })

  const view = (title: string) => ({ app: 'surface' as const, sessionId: 1, surfaceId: 'tests', title })
</script>

<Story name="TestResults" asChild>
  <AppStory app="surface" view={view('Test run: 6 tests')} width={640} height={440} aguiMessages={() => surfaceTurn('window', false, testResults).messages} />
</Story>

<Story name="SettingsForm" asChild>
  <AppStory app="surface" view={view('Settings')} width={520} height={420} aguiMessages={() => surfaceTurn('window', false, settingsForm).messages} />
</Story>

<Story name="Deleted" asChild>
  <AppStory app="surface" view={{ app: 'surface', sessionId: 1, surfaceId: 'gone', title: 'Agent window' }} width={420} height={240} />
</Story>
