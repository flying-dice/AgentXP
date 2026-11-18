<script lang="ts">
  import type { AgentInput, AgentXPApi } from '@shared/ipc'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import { choiceItems, checkMessage, commandLine, emptyAgentForm, inputFromForm, validateAgentForm, type AgentFormValues } from './agentForm'

  interface Props {
    title?: string
    initial?: AgentFormValues
    /** `makeDefault`: the box "Make this the default agent" was ticked. */
    onsubmit?: (input: AgentInput, makeDefault: boolean) => void
    /** Finds out whether the command can be started (the Test button); without it the button is not shown. */
    oncheck?: (command: string) => Promise<boolean>
    ondiscover?: AgentXPApi['agents']['discover']
    onclose?: () => void
    /** Cover the nearest positioned ancestor (a desktop window) instead of the viewport. */
    contained?: boolean
  }

  let { title = 'Add Agent', initial = emptyAgentForm(), onsubmit, oncheck, ondiscover, onclose, contained = false }: Props = $props()

  // svelte-ignore state_referenced_locally
  let form = $state<AgentFormValues>({ ...initial })
  let touched = $state(false)
  const problem = $derived(validateAgentForm(form))
  const nameHint = $derived(commandLine(form) || 'Optional. Defaults to the command.')
  let testResult = $state('')
  let testing = $state(false)
  let loading = $state(false)
  let choices = $state<Awaited<ReturnType<AgentXPApi['agents']['discover']>>>({ modes: [], models: [] })
  let choicesFor = $state('')
  let choiceMessage = $state('Load choices from the agent, or type an ACP id.')
  let messageFor = $state('')
  const launchKey = $derived(JSON.stringify([form.command, form.args, form.env]))
  const choiceStatus = $derived(messageFor === launchKey ? choiceMessage : 'Load choices from the agent, or type an ACP id.')
  const currentChoices = $derived(choicesFor === launchKey ? choices : { modes: [], models: [] })
  const modeItems = $derived(choiceItems(currentChoices.modes, form.defaultModeId))
  const modelItems = $derived(choiceItems(currentChoices.models, form.defaultModelId))

  async function loadChoices(): Promise<void> {
    if (!ondiscover || loading || problem) return
    const key = launchKey
    messageFor = key
    loading = true
    choiceMessage = 'Loading choices from the agent...'
    try {
      const result = await ondiscover(inputFromForm(form))
      if (key !== launchKey) return
      choices = result
      choicesFor = key
      choiceMessage = result.models.length || result.modes.length
        ? `Loaded ${result.models.length} models and ${result.modes.length} modes from the agent.`
        : 'The agent advertised no choices. Use Agent default or type an ACP id.'
    } catch (error) {
      if (key === launchKey) choiceMessage = `Could not load choices: ${error instanceof Error ? error.message : String(error)} You can type an ACP id.`
    } finally {
      loading = false
    }
  }

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

<Dialog testid="agents-dialog" {title} iconName="agent" width="460px" style="max-height: calc(100% - 16px)" class="agent-dialog" {contained} {onclose}>
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
      <ComboBox testid="agent-mode" items={modeItems} dropDownStyle="DropDown" bind:value={form.defaultModeId} aria-label="Start mode of new chats" />
    </LabeledField>
    <LabeledField label="Start model:" for="agent-model" labelWidth={90}>
      <ComboBox testid="agent-model" items={modelItems} dropDownStyle="DropDown" bind:value={form.defaultModelId} aria-label="Model of new chats" />
    </LabeledField>
    {#if ondiscover}
      <div class="default"><Button data-testid="agents-dialog-load-choices" disabled={loading || !!problem} onclick={loadChoices}>Load choices</Button></div>
      <div class="default" role="status" data-testid="agents-dialog-choices-status">{choiceStatus}</div>
    {/if}
    <div class="default"><CheckBox testid="agents-dialog-default" bind:checked={form.makeDefault} label="Make this the default agent for new desktops and chats" /></div>
    <div class="problem" role="alert">{touched && problem ? problem : ''}</div>
  </div>
  {#snippet buttons()}
    <DialogButtons buttons={['ok', 'cancel']} onresult={result} />
  {/snippet}
</Dialog>

<style>
  :global(.agent-dialog .content) {
    overflow-y: auto;
  }
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
  .command :global(.xp-textbox) {
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
