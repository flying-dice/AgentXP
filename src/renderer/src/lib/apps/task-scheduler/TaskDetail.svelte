<script lang="ts">
  /** The detail pane under the library: the six tabs of the selected task, read only. */
  import type { SchedulerTab } from '@shared/desktop'
  import type { ScheduledTaskDto, TaskRunDto } from '@shared/scheduler'
  import Button from '../../kit/atoms/Button.svelte'
  import ListView from '../../kit/organisms/ListView.svelte'
  import type { ListColumn } from '../../kit/organisms/ListView'
  import TabControl from '../../kit/organisms/TabControl.svelte'
  import { formatDateTime } from '../shared/dates'
  import { actionRow, conditionLines, HISTORY_COLUMNS, historyRows, NO_CONDITIONS, SCHEDULER_TABS, settingLines, statusText, triggerRow, type ActionContext } from './taskModel'

  interface Props {
    task: ScheduledTaskDto
    tab: SchedulerTab
    runs: readonly TaskRunDto[]
    ctx: ActionContext
    onopenchat: (sessionId: number) => void
    onclearhistory: () => void
  }

  let { task, tab = $bindable(), runs, ctx, onopenchat, onclearhistory }: Props = $props()

  const tabs = SCHEDULER_TABS.map((t) => ({ ...t, testid: `task-scheduler-tab-${t.id}` }))
  const triggerColumns: ListColumn[] = [
    { key: 'kind', header: 'Trigger', width: 110 },
    { key: 'details', header: 'Details', minWidth: 160 },
    { key: 'status', header: 'Status', width: 70 }
  ]
  const actionColumns: ListColumn[] = [
    { key: 'action', header: 'Action', width: 100 },
    { key: 'details', header: 'Details', minWidth: 200 }
  ]
  let runSelected = $state<string[]>([])
  const chat = $derived(runs.find((r) => String(r.id) === runSelected[0])?.sessionId ?? null)
  const conditions = $derived(conditionLines(task.conditions))
</script>

<div class="detail" data-testid="task-scheduler-detail" data-task-id={task.id}>
  <TabControl {tabs} selected={tab} onchange={(id) => (tab = id as SchedulerTab)} aria-label="Task details">
    {#snippet panel(t)}
      {#if t.id === 'general'}
        <dl class="general xp-scroll" data-testid="task-scheduler-general">
          <dt>Name:</dt>
          <dd data-testid="task-scheduler-general-name">{task.name}</dd>
          <dt>Description:</dt>
          <dd class="wrap">{task.description || '(none)'}</dd>
          <dt>Status:</dt>
          <dd>{statusText(task)}</dd>
          <dt>Created:</dt>
          <dd>{formatDateTime(task.createdAt)}</dd>
          <dt>Location:</dt>
          <dd>\Task Scheduler Library</dd>
        </dl>
      {:else if t.id === 'triggers'}
        <ListView testid="task-scheduler-triggers" columns={triggerColumns} rows={task.triggers.map(triggerRow)} aria-label="Triggers" emptyText="No triggers. The task runs only when you use Run." />
      {:else if t.id === 'actions'}
        <ListView testid="task-scheduler-actions" columns={actionColumns} rows={task.actions.map((a, i) => actionRow(a, i, ctx))} aria-label="Actions" emptyText="No actions." />
      {:else if t.id === 'conditions'}
        <ul class="lines xp-scroll" data-testid="task-scheduler-conditions">
          {#each conditions as line (line)}<li>{line}</li>{:else}<li>{NO_CONDITIONS}</li>{/each}
        </ul>
      {:else if t.id === 'settings'}
        <dl class="general xp-scroll" data-testid="task-scheduler-settings">
          {#each settingLines(task.settings) as [k, v] (k)}
            <dt>{k}:</dt>
            <dd class="wrap">{v}</dd>
          {/each}
        </dl>
      {:else}
        <div class="history">
          <div class="grid">
            <ListView testid="task-scheduler-history" columns={HISTORY_COLUMNS} rows={historyRows(runs)} bind:selected={runSelected} aria-label="History" emptyText="This task has not run yet." />
          </div>
          <div class="buttons">
            <Button data-testid="task-scheduler-history-open-chat" disabled={chat === null} onclick={() => chat !== null && onopenchat(chat)}>Open chat</Button>
            <Button data-testid="task-scheduler-history-clear" disabled={runs.length === 0} onclick={onclearhistory}>Clear history</Button>
          </div>
        </div>
      {/if}
    {/snippet}
  </TabControl>
</div>

<style>
  .detail {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding-top: 2px;
  }
  .general {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-content: start;
    gap: 3px 8px;
    margin: 0;
    padding: 8px;
    overflow: auto;
    height: 100%;
    box-sizing: border-box;
  }
  dt {
    color: var(--xp-text-muted);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .wrap {
    white-space: pre-wrap;
  }
  .lines {
    margin: 0;
    padding: 8px 8px 8px 24px;
    overflow: auto;
    height: 100%;
    box-sizing: border-box;
  }
  .history {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .grid {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .grid :global(.xp-listview) {
    flex: 1;
    min-height: 0;
  }
  .buttons {
    flex: none;
    display: flex;
    gap: 6px;
    padding: 4px;
  }
</style>
