<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import MaskedTextBox from './MaskedTextBox.svelte'

  const { Story } = defineMeta({
    title: 'Atoms/MaskedTextBox',
    component: MaskedTextBox,
    args: { mask: '(000) 000-0000', value: '', promptChar: '_', disabled: false, readonly: false },
    argTypes: {
      mask: { control: 'text', description: '0 digit, 9 optional digit, L letter, A letter/digit' },
      value: { control: 'text' },
      promptChar: { control: 'text' },
      disabled: { control: 'boolean' },
      readonly: { control: 'boolean' },
      onmaskcompleted: { action: 'maskCompleted' }
    }
  })
</script>

<Story name="Phone" />

<Story name="Date" args={{ mask: '00/00/0000' }} />

<Story name="Time" args={{ mask: '00:00', value: '1230' }} />

<Story name="LicenseKey" args={{ mask: 'AAAAA-AAAAA-AAAAA' }} />

<Story name="PostalCode" args={{ mask: 'L0L 0L0', promptChar: '#' }} />

<Story name="OptionalDigits" args={{ mask: '999-0000' }} />

<Story name="Disabled" args={{ disabled: true, value: '5551234567' }} />
