<script lang="ts">
  /** Add or edit an MCP server: a program that is started, or a web address; with its variables and a Test button. */
  import type { McpServerInput, McpTestResultDto } from '@shared/teams'
  import Button from '../../kit/atoms/Button.svelte'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import RadioButton from '../../kit/atoms/RadioButton.svelte'
  import RadioButtonGroup from '../../kit/atoms/RadioButtonGroup.svelte'
  import TextBox from '../../kit/atoms/TextBox.svelte'
  import DialogButtons from '../../kit/molecules/DialogButtons.svelte'
  import type { DialogResult } from '../../kit/molecules/DialogButtons'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import Dialog from '../../kit/organisms/Dialog.svelte'
  import { emptyMcpForm, inputFromForm, validateMcpForm, varsLabel, type McpFormValues } from './mcpForm'

  interface Props {
    title?: string
    initial?: McpFormValues
    onsubmit?: (input: McpServerInput) => void
    /** Connects with what the form holds (the Test button); without it the button is not shown. */
    onprobe?: (input: McpServerInput) => Promise<McpTestResultDto>
    onclose?: () => void
    contained?: boolean
  }

  let { title = 'Add MCP Server', initial = emptyMcpForm(), onsubmit, onprobe, onclose, contained = false }: Props = $props()

  // svelte-ignore state_referenced_locally
  let form = $state<McpFormValues>({ ...initial, vars: initial.vars.map((v) => ({ ...v })) })
  let touched = $state(false)
  let testResult = $state('')
  let testing = $state(false)
  const problem = $derived(validateMcpForm(form))

  async function test(): Promise<void> {
    if (!onprobe) return
    if (problem) {
      testResult = problem
      return
    }
    testing = true
    testResult = 'Connecting…'
    try {
      testResult = (await onprobe(inputFromForm(form))).message
    } catch (error) {
      testResult = error instanceof Error ? error.message : String(error)
    } finally {
      testing = false
    }
  }

  const addVar = (): void => void form.vars.push({ key: '', value: '', secret: false })

  function result(r: DialogResult): void {
    if (r === 'ok') {
      touched = true
      if (problem) return
      onsubmit?.(inputFromForm(form))
    }
    onclose?.()
  }
</script>

<Dialog testid="mcp-dialog" {title} iconName="options" width="520px" {contained} {onclose}>
  <div class="form">
    <LabeledField label="Name:" for="mcp-name" labelWidth={90}>
      <TextBox id="mcp-name" data-testid="mcp-dialog-name" bind:value={form.name} placeholder="Letters and digits, for example: github" />
    </LabeledField>
    <LabeledField label="Type:" labelWidth={90}>
      <RadioButtonGroup bind:value={form.transport} orientation="horizontal" aria-label="Type of server" onchange={() => (testResult = '')}>
        <RadioButton value="stdio" label="Program" />
        <RadioButton value="http" label="Web address" />
      </RadioButtonGroup>
    </LabeledField>
    {#if form.transport === 'stdio'}
      <LabeledField label="Command:" for="mcp-command" labelWidth={90}>
        <TextBox id="mcp-command" data-testid="mcp-dialog-command" bind:value={form.command} placeholder="Program to run, for example: npx" />
      </LabeledField>
      <LabeledField label="Arguments:" for="mcp-args" labelWidth={90}>
        <TextBox id="mcp-args" data-testid="mcp-dialog-args" multiline rows={3} bind:value={form.args} placeholder="One per line" />
      </LabeledField>
    {:else}
      <LabeledField label="Address:" for="mcp-url" labelWidth={90}>
        <TextBox id="mcp-url" data-testid="mcp-dialog-url" bind:value={form.url} placeholder="https://example.com/mcp" />
      </LabeledField>
    {/if}
    <LabeledField label={varsLabel(form.transport)} labelWidth={90}>
      <div class="vars" data-testid="mcp-dialog-vars">
        {#each form.vars as variable, i (i)}
          <div class="var" data-testid="mcp-dialog-var">
            <TextBox data-testid="mcp-dialog-var-key" aria-label="Name" bind:value={variable.key} placeholder="NAME" />
            <TextBox data-testid="mcp-dialog-var-value" aria-label="Value" password={variable.secret} bind:value={variable.value} placeholder="value" />
            <CheckBox testid="mcp-dialog-var-secret" bind:checked={variable.secret} label="Secret" />
            <Button data-testid="mcp-dialog-var-remove" aria-label="Remove" onclick={() => form.vars.splice(i, 1)}>Remove</Button>
          </div>
        {/each}
        <div><Button data-testid="mcp-dialog-var-add" onclick={addVar}>Add variable</Button></div>
      </div>
    </LabeledField>
    <div class="test">
      {#if onprobe}<Button data-testid="mcp-dialog-test" disabled={testing} onclick={test}>Test connection</Button>{/if}
      <span role="status" data-testid="mcp-dialog-test-result">{testResult}</span>
    </div>
    <div class="problem" role="alert" data-testid="mcp-dialog-problem">{touched && problem ? problem : ''}</div>
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
  .vars {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .var {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .var :global(.w7-textbox) {
    flex: 1;
    min-width: 0;
  }
  .test {
    display: flex;
    gap: 8px;
    align-items: center;
    padding-left: 98px;
  }
  .problem {
    min-height: 16px;
    padding-left: 98px;
    color: #a00000;
  }
</style>
