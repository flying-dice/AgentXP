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

  // Gradient ids must be unique per icon instance (see `iconMarkup`).
  const uid = $props.id()
  const markup = $derived(iconMarkup(name, uid))
</script>

<svg
  class="xp-icon {className}"
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
  .xp-icon {
    display: inline-block;
    flex: none;
    vertical-align: middle;
    overflow: visible;
  }
</style>
