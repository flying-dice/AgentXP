<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements'
  import { iconMarkup, type IconName } from './icons'

  interface Props extends Omit<SVGAttributes<SVGSVGElement>, 'name'> {
    name: IconName
    /** Rendered width and height in px (the artwork is drawn on a 16px grid). */
    size?: number
    /** Accessible name. Without it the icon is decorative (aria-hidden). */
    title?: string
  }

  let { name, size = 16, title, class: className = '', ...rest }: Props = $props()

  const markup = $derived(iconMarkup(name))
</script>

<svg
  class="w7-icon {className}"
  width={size}
  height={size}
  viewBox="0 0 16 16"
  role={title ? 'img' : undefined}
  aria-label={title}
  aria-hidden={title ? undefined : 'true'}
  focusable="false"
  {...rest}
>
  {@html markup}
</svg>

<style>
  .w7-icon {
    display: inline-block;
    flex: none;
    vertical-align: middle;
    overflow: visible;
  }
</style>
