<script lang="ts">
  import KitPropertyGrid from '$lib/kit/organisms/PropertyGrid.svelte'
  import type { PropertyDef, PropertyType } from '$lib/kit/organisms/PropertyGrid'
  import { asArray, asBoolean, asEnum, asRecord, asString, asStringList, setterOf } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()

  const TYPES: readonly PropertyType[] = ['string', 'number', 'boolean', 'enum']
  const properties = $derived(
    asArray(view.properties).map((raw): PropertyDef => {
      const p = asRecord(raw)
      return {
        key: asString(p.key),
        name: p.name === undefined ? undefined : asString(p.name),
        category: p.category === undefined ? undefined : asString(p.category),
        type: asEnum(p.type, TYPES, 'string'),
        options: p.options === undefined ? undefined : asStringList(p.options),
        description: p.description === undefined ? undefined : asString(p.description),
        readOnly: asBoolean(p.readOnly)
      }
    })
  )
  let values = $derived(asRecord(view.values))
</script>

<div class="props">
  <KitPropertyGrid
    {properties}
    bind:values={
      () => values,
      (next) => {
        values = next
        setterOf(view, 'values')(next)
      }
    }
  />
</div>

<style>
  .props {
    display: flex;
    height: 220px;
  }
  .props > :global(*) {
    flex: 1;
    min-width: 0;
  }
</style>
