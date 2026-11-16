<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import MonthCalendar from './MonthCalendar.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/MonthCalendar',
    component: MonthCalendar,
    argTypes: {
      firstDayOfWeek: { control: 'inline-radio', options: [0, 1] },
      showToday: { control: 'boolean' },
      disabled: { control: 'boolean' }
    },
    args: { firstDayOfWeek: 0, showToday: true, disabled: false }
  })
</script>

<script lang="ts">
  let picked = $state(new Date(2026, 10, 18))
  const min = new Date(2026, 10, 5)
  const max = new Date(2026, 10, 25)
</script>

<Story name="Default" />
<Story name="Monday first" args={{ firstDayOfWeek: 1 }} />
<Story name="Disabled" args={{ disabled: true }} />
<Story name="Without today footer" args={{ showToday: false }} />

<Story name="Min and max">
  <MonthCalendar value={new Date(2026, 10, 18)} {min} {max} />
</Story>

<Story name="Bound">
  <div style="display:flex;gap:12px;align-items:flex-start">
    <MonthCalendar bind:value={picked} />
    <div>Selected: {picked.toDateString()}</div>
  </div>
</Story>
