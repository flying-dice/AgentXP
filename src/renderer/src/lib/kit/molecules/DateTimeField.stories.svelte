<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import DateTimeField from './DateTimeField.svelte'

  const { Story } = defineMeta({
    title: 'Molecules/DateTimeField',
    component: DateTimeField,
    args: { value: '2026-11-17T09:30', disabled: false },
    argTypes: { value: { control: 'text' }, disabled: { control: 'boolean' }, onchange: { action: 'change' } }
  })
</script>

<script lang="ts">
  let when = $state('2026-12-31T23:00')
</script>

<Story name="Default" />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="Bound">
  <div style="display:flex;flex-direction:column;gap:8px;min-height:240px">
    <DateTimeField bind:value={when} />
    <div>Value: {when}</div>
  </div>
</Story>
