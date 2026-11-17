<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import TeamDialog from './TeamDialog.svelte'
  import { sampleProfiles, sampleSkills } from '../../app/fakeTeams'
  import { emptyTeamForm } from './teamForms'

  const { Story } = defineMeta({
    title: 'Apps/Teams/Team dialog',
    parameters: { layout: 'fullscreen' }
  })
  const boards = [
    { id: 7, desktopId: 1, name: 'Sprint board', columns: [] },
    { id: 8, desktopId: 1, name: 'Bug triage', columns: [] }
  ]
</script>

<Story name="With a board" asChild>
  <div style="position: relative; height: 560px; background: #eee">
    <TeamDialog contained profiles={sampleProfiles} skills={sampleSkills} {boards} initial={{ ...emptyTeamForm(), name: 'Feature team', memberIds: [1, 2], boardRef: '7' }} />
  </div>
</Story>
