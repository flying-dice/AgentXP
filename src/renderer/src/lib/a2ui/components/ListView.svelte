<script lang="ts">
  import KitListView from '$lib/kit/organisms/ListView.svelte'
  import type { ListColumn, ListRow } from '$lib/kit/organisms/ListView'
  import { asArray, asBoolean, asEnum, asNumber, asRecord, asString, asStringList, setterOf } from '../viewProps'
  import { toIcon } from './options'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()

  const columns = $derived(
    asArray(view.columns).map((raw): ListColumn => {
      const c = asRecord(raw)
      return {
        key: asString(c.key),
        header: asString(c.header),
        width: asNumber(c.width),
        align: asEnum(c.align, ['left', 'right', 'center'], 'left'),
        sortable: asBoolean(c.sortable, true)
      }
    })
  )
  const rows = $derived(asArray(view.rows).map((raw, i): ListRow => ({ ...asRecord(raw), id: asString(asRecord(raw).id, String(i)), icon: toIcon(asRecord(raw).icon) })))
  let selected = $derived(asStringList(view.selected))
</script>

<div class="list">
  <KitListView
    view={asEnum(view.view, ['Details', 'List', 'SmallIcon', 'LargeIcon'], 'Details')}
    {columns}
    {rows}
    multiSelect={asBoolean(view.multiSelect)}
    bind:selected={
      () => selected,
      (ids) => {
        selected = ids
        setterOf(view, 'selected')(ids)
      }
    }
  />
</div>

<style>
  .list {
    display: flex;
    height: 160px;
  }
  .list > :global(*) {
    flex: 1;
    min-width: 0;
  }
</style>
