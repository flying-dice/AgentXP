<script lang="ts">
  import PictureBox from '$lib/kit/atoms/PictureBox.svelte'
  import { asEnum, asNumber, asString } from '../viewProps'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
</script>

<div class="picture">
  <PictureBox
    src={asString(view.src)}
    sizeMode={asEnum(view.sizeMode, ['Normal', 'StretchImage', 'Zoom', 'CenterImage'], 'Normal')}
    width={asNumber(view.width, 100)}
    height={asNumber(view.height, 100)}
    borderStyle="FixedSingle"
  />
</div>

<style>
  .picture {
    align-self: flex-start;
  }
</style>
