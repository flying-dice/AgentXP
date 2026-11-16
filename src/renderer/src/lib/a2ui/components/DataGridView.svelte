<script lang="ts">
  import KitDataGridView from '$lib/kit/organisms/DataGridView.svelte'
  import type { GridColumn, GridColumnType, GridRow } from '$lib/kit/organisms/DataGridView'
  import { asArray, asBoolean, asEnum, asNumber, asRecord, asString, setterOf } from '../viewProps'
  import { toOptions } from './options'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()

  const TYPES: readonly GridColumnType[] = ['text', 'number', 'checkbox', 'combo']
  const columns = $derived(
    asArray(view.columns).map((raw): GridColumn => {
      const c = asRecord(raw)
      return {
        key: asString(c.key),
        header: asString(c.header),
        width: asNumber(c.width),
        type: asEnum(c.type, TYPES, 'text'),
        options: c.options === undefined ? undefined : toOptions(c.options),
        readOnly: asBoolean(c.readOnly)
      }
    })
  )
  let rows = $derived(asArray(view.rows).map((r): GridRow => asRecord(r)))
</script>

<div class="grid">
  <KitDataGridView
    {columns}
    readOnly={asBoolean(view.readOnly) || !asBoolean(view.enabled, true)}
    bind:rows={
      () => rows,
      (next) => {
        rows = next
        setterOf(view, 'rows')(next)
      }
    }
  />
</div>

<style>
  .grid {
    display: flex;
    height: 190px;
  }
  .grid > :global(*) {
    flex: 1;
    min-width: 0;
  }
</style>
