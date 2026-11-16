<script lang="ts">
  import type { AgentInput } from '@shared/ipc'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import { COMMON_MODES, checkMessage, commandLine, emptyAgentForm, inputFromForm, validateAgentForm, type AgentFormValues } from './agentForm'

  interface Props {
    title?: string
    initial?: AgentFormValues
    /** `makeDefault`: the box "Make this the default agent" was ticked. */
    onsubmit?: (input: AgentInput, makeDefault: boolean) => void
    /** Finds out whether the command can be started (the Test button); without it the button is not shown. */
    oncheck?: (command: string) => Promise<boolean>
    onclose?: () => void
    /** Cover the nearest positioned ancestor (a desktop window) instead of the viewport. */
    contained?: boolean
  }

  let { title = 'Add Agent', initial = emptyAgentForm(), onsubmit, oncheck, onclose, contained = false }: Props = $props()

  // svelte-ignore state_referenced_locally
  let form = $state<AgentFormValues>({ ...initial })
  let touched = $state(false)
  const problem = $derived(validateAgentForm(form))
  const nameHint = $derived(commandLine(form) || 'Optional. Defaults to the command.')
  let testResult = $state('')
  let testing = $state(false)

  async function test(): Promise<void> {
    if (!oncheck) return
    if (!form.command.trim()) {
      testResult = 'Enter the program first.'
      return
    }
    testing = true
    try {
      testResult = checkMessage(form.command, await oncheck(form.command))
    } catch {
      testResult = `Could not check '${form.command.trim()}'.`
    } finally {
      testing = false
    }
  }

  function result(r: DialogResult): void {
    if (r === 'ok') {
      touched = true
      if (problem) return
      onsubmit?.(inputFromForm(form), form.makeDefault)
    }
    onclose?.()
  }
</script>

<Dialog testid="agents-dialog" {title} iconName="agent" width="460px" {contained} {onclose}>
  <div class="form">
    <LabeledField label="Name:" for="agent-name" labelWidth={90}>
      <TextBox id="agent-name" data-testid="agents-dialog-name" bind:value={form.name} placeholder={nameHint} />
    </LabeledField>
    <LabeledField label="Command:" for="agent-command" labelWidth={90}>
      <div class="command">
        <TextBox id="agent-command" data-testid="agents-dialog-command" bind:value={form.command} placeholder="Program to run, for example: node" oninput={() => (testResult = '')} />
        {#if oncheck}<Button data-testid="agents-dialog-test" disabled={testing} onclick={test}>Test</Button>{/if}
      </div>
    </LabeledField>
    <div class="result" role="status" data-testid="agents-dialog-test-result">{testResult}</div>
    <LabeledField label="Arguments:" for="agent-args" labelWidth={90}>
      <TextBox id="agent-args" data-testid="agents-dialog-args" multiline rows={4} bind:value={form.args} placeholder="One per line, for example: my-agent.js" />
    </LabeledField>
    <LabeledField label="Environment:" for="agent-env" labelWidth={90}>
      <TextBox id="agent-env" data-testid="agents-dialog-env" multiline rows={3} bind:value={form.env} placeholder="KEY=VALUE, one per line" />
    </LabeledField>
    <LabeledField label="Start mode:" for="agent-mode" labelWidth={90}>
      <ComboBox testid="agent-mode" items={COMMON_MODES} dropDownStyle="DropDown" bind:value={form.defaultModeId} aria-label="Start mode of new chats" />
    </LabeledField>
    <div class="default"><CheckBox testid="agents-dialog-default" bind:checked={form.makeDefault} label="Make this the default agent for new desktops and chats" /></div>
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
  .command {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .command :global(.w7-textbox) {
    flex: 1;
    min-width: 0;
  }
  .result {
    min-height: 16px;
    margin-top: -4px;
    padding-left: 98px;
  }
  .default {
    padding-left: 98px;
  }
  .problem {
    min-height: 16px;
    padding-left: 98px;
    color: #a00000;
  }
</style>
