<script lang="ts">
  import Button from '../kit/atoms/Button.svelte'
  import Icon from '../kit/atoms/Icon.svelte'
  import { focusTrap } from '../kit/actions/focusTrap'
  import CodeViewer from '../kit/organisms/CodeViewer.svelte'
  import DiffViewer from '../kit/organisms/DiffViewer.svelte'
  import { toolArgument } from '../app/session/toolSummary'
  import { approvalQuestion, type PendingApproval } from './approval'

  interface Props {
    approval: PendingApproval
    /** Why the agent is asking ("Writing files is set to Ask in Control Centre."). */
    reason: string
    /** The chosen option id, or null to cancel the turn. */
    onanswer?: (optionId: string | null) => void
    /** Esc or "Not now": close without answering; the request stays in the Action Center. */
    onclose?: () => void
  }

  let { approval, reason, onanswer, onclose }: Props = $props()

  let details = $state(false)

  const diff = $derived(approval.toolCall?.contents.find((c) => c.kind === 'diff'))
  const argument = $derived(
    approval.toolCall ? toolArgument(approval.toolCall.kind, approval.toolCall.rawInput, approval.toolCall.locations, approval.toolCall.title) : ''
  )
  const risky = $derived(approval.toolKind === 'execute' || approval.toolKind === 'delete')
  const allow = $derived(approval.options.filter((o) => o.kind.startsWith('allow')))
  const deny = $derived(approval.options.filter((o) => o.kind.startsWith('reject')))
  const ordered = $derived([...allow, ...deny])
  const hasDetails = $derived(!!diff || !!argument)
</script>

<div class="dim" role="presentation">
  <div
    class="uac"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="uac-q"
    tabindex="-1"
    use:focusTrap
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onclose?.()
      }
    }}
  >
    <div class="band" class:risky>
      <Icon name="shield" size={32} />
      <h2 id="uac-q">{approvalQuestion(approval.title)}</h2>
    </div>
    <div class="body">
      <div class="tool">{approval.title}</div>
      <div class="from">Requested by the agent in <em>{approval.chatTitle}</em></div>
      <div class="reason">{reason}</div>
      {#if hasDetails}
        <button type="button" class="expander" aria-expanded={details} onclick={() => (details = !details)}>
          <Icon name={details ? 'chevron-up' : 'chevron-down'} size={12} />{details ? 'Hide details' : 'Show details'}
        </button>
        {#if details}
          <div class="details">
            {#if diff?.kind === 'diff'}
              <DiffViewer oldText={diff.oldText ?? ''} newText={diff.newText} fileName={diff.path} toolbar={false} maxHeight="200px" />
            {:else}
              <CodeViewer code={argument} language={approval.toolKind === 'execute' ? 'bash' : 'text'} wordWrap maxHeight="140px" label="Details" />
            {/if}
          </div>
        {/if}
      {/if}
    </div>
    <div class="bar">
      {#each ordered as option, i (option.optionId)}
        <Button isDefault={i === 0} data-autofocus={i === 0 ? '' : undefined} onclick={() => onanswer?.(option.optionId)}>{option.name}</Button>
      {/each}
      {#if ordered.length === 0}
        <Button onclick={() => onanswer?.(null)}>Cancel the action</Button>
      {/if}
      <Button onclick={() => onclose?.()}>Not now</Button>
    </div>
  </div>
</div>

<style>
  .dim {
    position: absolute;
    inset: 0;
    z-index: 200000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.58);
  }
  .uac {
    box-sizing: border-box;
    width: 480px;
    max-width: calc(100% - 32px);
    border: 1px solid #1c3a64;
    background: var(--w7-face);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 12px 40px rgba(0, 0, 0, 0.7);
    font: var(--w7-font);
    color: var(--w7-text);
    outline: none;
  }
  .band {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--w7-uac-band);
    color: #fff;
  }
  .band.risky {
    background: var(--w7-uac-band-warn);
    color: #2b1d00;
  }
  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  .body {
    padding: 14px 18px 8px;
    background: #fff;
  }
  .tool {
    font-weight: 600;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .from,
  .reason {
    margin-top: 4px;
    color: #444;
  }
  .reason {
    color: #1e395b;
  }
  .expander {
    margin: 12px 0 4px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: none;
    font: inherit;
    color: var(--w7-link);
    cursor: default;
  }
  .expander:hover {
    text-decoration: underline;
  }
  .details {
    margin: 4px 0 8px;
    display: flex;
    flex-direction: column;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 14px;
    background: var(--w7-face);
    border-top: 1px solid #dfdfdf;
  }
</style>
