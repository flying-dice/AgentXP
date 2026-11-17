<script lang="ts">
  import Button from '../kit/atoms/Button.svelte'
  import Icon from '../kit/atoms/Icon.svelte'
  import { focusTrap } from '../kit/actions/focusTrap'
  import ApprovalDetail from '../app/session/ApprovalDetail.svelte'
  import { AltHeld, moveBetweenAnswers } from '../app/session/answerKeys.svelte'
  import CommandLink from '../app/session/CommandLink.svelte'
  import { KEY_HINT, accessKeyIndex, decisionForKey } from '../app/session/permissionOptions'
  import { approvalQuestion, optionDescription, type PendingApproval } from './approval'

  interface Props {
    approval: PendingApproval
    /** Why the agent is asking ("Writing files is set to Ask in Control Center."); shown after "Reason:". */
    reason: string
    /** The chosen option id, or null to cancel the turn. */
    onanswer?: (optionId: string | null) => void
    /** "1 of 2 waiting" when more than one request waits; null when this is the only one. */
    queueText?: string | null
    /** Esc or "Not now": close without answering; the request stays in the Action Center. */
    onclose?: () => void
  }

  let { approval, reason, queueText = null, onanswer, onclose }: Props = $props()

  const risky = $derived(approval.toolKind === 'execute' || approval.toolKind === 'delete')
  const allow = $derived(approval.options.filter((o) => o.kind.startsWith('allow')))
  const deny = $derived(approval.options.filter((o) => o.kind.startsWith('reject')))
  const ordered = $derived([...allow, ...deny])
  const alt = new AltHeld()

  /** Alt+A takes the first Allow answer, Alt+D the first refusal; Left and Right move between the answers. */
  function onkeydown(event: KeyboardEvent): void {
    alt.keydown(event)
    if (event.key === 'Escape') {
      event.stopPropagation()
      onclose?.()
      return
    }
    const decision = decisionForKey(event)
    const option = decision === 'allow' ? allow[0] : decision === 'deny' ? deny[0] : undefined
    if (option) {
      event.preventDefault()
      event.stopPropagation()
      onanswer?.(option.optionId)
    } else moveBetweenAnswers(event)
  }
</script>

<div class="dim" role="presentation" data-testid="uac-dim">
  <div
    class="uac"
    data-testid="uac-dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="uac-q"
    tabindex="-1"
    use:focusTrap
    {onkeydown}
    onkeyup={alt.keyup}
    onfocusout={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) alt.reset()
    }}
  >
    <div class="band" class:risky>
      <Icon name="shield" size={32} />
      <h2 id="uac-q" data-testid="uac-question">{approvalQuestion(approval)}</h2>
    </div>
    <div class="body">
      <div class="from" data-testid="uac-from">Requested by the agent in <em>{approval.chatTitle}</em></div>
      <div class="reason" data-testid="uac-reason">Reason: {reason}</div>
      {#if queueText}<div class="queue" data-testid="uac-queue">{queueText}</div>{/if}
      <ApprovalDetail toolCall={approval.toolCall} testid="uac" note={false} />
    </div>
    <div class="links" data-answers role="group" aria-label="Your answer">
      {#each ordered as option (option.optionId)}
        {@const decision = option.kind.startsWith('allow') ? 'allow' : 'deny'}
        {@const first = option === allow[0] || option === deny[0]}
        <CommandLink
          kind={decision}
          compact
          testid={option === allow[0] ? 'uac-allow' : `uac-option-${option.optionId}`}
          title={option.name}
          keyIndex={first ? accessKeyIndex(option.name, decision) : -1}
          showKey={alt.held}
          description={optionDescription(option.kind)}
          autofocus={option === deny[0]}
          onclick={() => onanswer?.(option.optionId)}
        />
      {/each}
      {#if ordered.length > 0}<p class="hint" data-testid="uac-hint">{KEY_HINT}</p>{/if}
    </div>
    <div class="bar">
      {#if ordered.length === 0}
        <Button data-testid="uac-cancel-action" data-autofocus onclick={() => onanswer?.(null)}>Cancel the action</Button>
      {/if}
      <Button data-testid="uac-not-now" onclick={() => onclose?.()}>Not now</Button>
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
    width: 520px;
    max-width: calc(100% - 32px);
    max-height: calc(100% - 24px);
    overflow-y: auto;
    border: 1px solid #1c3a64;
    background: var(--xp-face);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 12px 40px rgba(0, 0, 0, 0.7);
    font: var(--xp-font);
    color: var(--xp-text);
    outline: none;
  }
  .band {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--xp-uac-band);
    color: #fff;
  }
  .band.risky {
    background: var(--xp-uac-band-warn);
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
  .from,
  .reason {
    color: #444;
  }
  .reason {
    margin-top: 4px;
    color: #1e395b;
  }
  /* The answers and the key hint share one row, so the hint is never below the fold (UX-139). */
  .links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    padding: 4px 12px 8px;
    background: #fff;
  }
  .queue {
    margin-bottom: 4px;
    color: var(--xp-text-muted);
    font-size: 12px;
  }
  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--xp-text-muted);
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 14px;
    background: var(--xp-face);
    border-top: 1px solid #dfdfdf;
  }
</style>
