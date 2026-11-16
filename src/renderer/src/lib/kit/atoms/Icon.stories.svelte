<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Icon from './Icon.svelte'
  import { iconNames } from './icons'

  const { Story } = defineMeta({
    title: 'Atoms/Icon',
    component: Icon,
    args: { name: 'folder', size: 16 },
    argTypes: {
      name: { control: 'select', options: [...iconNames] },
      size: { control: { type: 'range', min: 8, max: 64, step: 1 } },
      title: { control: 'text' }
    }
  })
</script>

<Story name="Default" />

<Story name="Gallery" parameters={{ controls: { disable: true } }}>
  {#snippet template()}
    <div class="grid">
      {#each iconNames as n (n)}
        <div class="cell">
          <Icon name={n} size={16} />
          <Icon name={n} size={32} />
          <span>{n}</span>
        </div>
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Sizes">
  {#snippet template()}
    <div class="row">
      {#each [12, 16, 24, 32, 48] as s (s)}
        <Icon name="claude" size={s} />
        <Icon name="shield" size={s} />
        <Icon name="session" size={s} />
      {/each}
    </div>
  {/snippet}
</Story>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 6px;
    padding: 8px;
    background: #fff;
    border: 1px solid #abadb3;
  }
  .cell {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px;
    border: 1px solid transparent;
  }
  .cell:hover {
    border-color: #b8d6fb;
    background: linear-gradient(#fafbfd, #ebf3fd);
  }
  .cell span {
    font-size: 11px;
    color: #444;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
</style>
