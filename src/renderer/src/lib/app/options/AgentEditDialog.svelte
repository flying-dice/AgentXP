<script lang="ts">
  import type { AgentInput } from '@shared/ipc'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import { COMMON_MODES, emptyAgentForm, inputFromForm, validateAgentForm, type AgentFormValues } from './agentForm'

  interface Props {
    title?: string
    initial?: AgentFormValues
    onsubmit?: (input: AgentInput) => void
    onclose?: () => void
    /** Cover the nearest positioned ancestor (a desktop window) instead of the viewport. */
    contained?: boolean
  }

  let { title = 'Add Agent', initial = emptyAgentForm(), onsubmit, onclose, contained = false }: Props = $props()

  // svelte-ignore state_referenced_locally
  let form = $state<AgentFormValues>({ ...initial })
  let touched = $state(false)
  const problem = $derived(validateAgentForm(form))

  function result(r: DialogResult): void {
    if (r === 'ok') {
      touched = true
      if (problem) return
      onsubmit?.(inputFromForm(form))
    }
    onclose?.()
  }
</script>

<Dialog {title} iconName="agent" width="460px" {contained} {onclose}>
  <div class="form">
    <LabeledField label="Name:" for="agent-name" labelWidth={90}>
      <TextBox id="agent-name" bind:value={form.name} />
    </LabeledField>
    <LabeledField label="Command:" for="agent-command" labelWidth={90}>
      <TextBox id="agent-command" bind:value={form.command} placeholder="npx" />
    </LabeledField>
    <LabeledField label="Arguments:" for="agent-args" labelWidth={90}>
      <TextBox id="agent-args" multiline rows={4} bind:value={form.args} placeholder="One argument per line" />
    </LabeledField>
    <LabeledField label="Environment:" for="agent-env" labelWidth={90}>
      <TextBox id="agent-env" multiline rows={3} bind:value={form.env} placeholder="KEY=VALUE, one per line" />
    </LabeledField>
    <LabeledField label="Start mode:" for="agent-mode" labelWidth={90}>
      <ComboBox testid="agent-mode" items={COMMON_MODES} dropDownStyle="DropDown" bind:value={form.defaultModeId} aria-label="Start mode of new chats" />
    </LabeledField>
    <div class="problem" role="alert">{touched && problem ? problem : ''}</div>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok', 'cancel']} onresult={result} />
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .form :global(.field) {
    align-items: flex-start;
  }
  .problem {
    min-height: 16px;
    padding-left: 98px;
    color: #a00000;
  }
</style>
