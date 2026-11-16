<script lang="ts">
  import type { TaskDto } from '@shared/models'
  import CheckBox from '../../kit/atoms/CheckBox.svelte'
  import ProgressBar from '../../kit/atoms/ProgressBar.svelte'

  interface Props {
    tasks: TaskDto[]
  }

  let { tasks }: Props = $props()

  const ordered = $derived([...tasks].sort((a, b) => a.position - b.position))
  const done = $derived(tasks.filter((t) => t.status === 'completed').length)
</script>

<div class="tasks">
  <div class="caption">Plan for this request</div>
  <div class="list w7-scroll" role="list" aria-label="Tasks">
    {#each ordered as task (task.id)}
      <div class="item" role="listitem" data-testid="tasks-item" data-status={task.status} class:done={task.status === 'completed'} class:active={task.status === 'in_progress'}>
        <CheckBox checked={task.status === 'completed'} readonly>
          <span class="text">{task.content}</span>
        </CheckBox>
      </div>
    {:else}
      <div class="empty">No tasks yet. The agent lists its plan here once it starts working.</div>
    {/each}
  </div>
  <div class="summary">
    <ProgressBar width="100%" value={done} max={Math.max(1, tasks.length)} label="Tasks completed" class="bar" />
    <span class="count">{done} of {tasks.length}</span>
  </div>
</div>

<style>
  .tasks {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .caption {
    flex: none;
  }
  .list {
    flex: 1;
    min-height: 0;
    padding: 2px;
    background: var(--w7-window);
    border: 1px solid var(--w7-list-border);
  }
  .item {
    display: flex;
    align-items: center;
    min-height: 22px;
    padding: 0 4px;
  }
  .done .text {
    text-decoration: line-through;
    color: var(--w7-text-muted);
  }
  .active .text {
    font-weight: 700;
  }
  .empty {
    padding: 6px;
    color: var(--w7-text-muted);
  }
  .summary {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .summary :global(.bar) {
    flex: 1;
    min-width: 0;
  }
  .count {
    min-width: 64px;
    text-align: right;
  }
</style>
