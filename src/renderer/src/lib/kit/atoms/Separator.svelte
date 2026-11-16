<script lang="ts">
  type Props = {
    orientation?: 'horizontal' | 'vertical'
    /** 'menu' draws the grey/white etched menu line, 'toolbar' the blue-grey toolbar line. */
    variant?: 'menu' | 'toolbar'
    class?: string
  }
  let { orientation = 'horizontal', variant = 'toolbar', class: className = '' }: Props = $props()
</script>

<div
  role="separator"
  aria-orientation={orientation}
  class="w7-sep {orientation} {variant} {className}"
></div>

<style>
  .w7-sep {
    flex: none;
  }
  .toolbar.vertical {
    width: 2px;
    height: 22px;
    margin: 0 4px;
    background: linear-gradient(90deg, var(--w7-etched-dark) 50%, #fff 50%);
  }
  .toolbar.horizontal {
    height: 2px;
    margin: 4px 0;
    background: linear-gradient(var(--w7-etched-dark) 50%, #fff 50%);
  }
  .menu.horizontal {
    height: 2px;
    margin: 3px 2px 3px 26px;
    background: linear-gradient(#d7d7d7 50%, #fff 50%);
  }
  .menu.vertical {
    width: 2px;
    margin: 2px 3px;
    align-self: stretch;
    background: linear-gradient(90deg, #d7d7d7 50%, #fff 50%);
  }
</style>
