<script lang="ts">
  type Props = {
    src?: string
    alt?: string
    sizeMode?: 'Normal' | 'StretchImage' | 'Zoom' | 'CenterImage' | 'AutoSize'
    borderStyle?: 'None' | 'FixedSingle' | 'Fixed3D'
    width?: number
    height?: number
    class?: string
  }
  let {
    src = '',
    alt = '',
    sizeMode = 'Normal',
    borderStyle = 'None',
    width = 100,
    height = 100,
    class: className = ''
  }: Props = $props()

  const fit = $derived(
    sizeMode === 'StretchImage' ? 'fill' : sizeMode === 'Zoom' ? 'contain' : 'none'
  )
  const centered = $derived(sizeMode === 'CenterImage' || sizeMode === 'Zoom' || sizeMode === 'StretchImage')
  const boxStyle = $derived(
    sizeMode === 'AutoSize' ? '' : `width:${width}px;height:${height}px;`
  )
</script>

<div class="xp-picturebox {borderStyle} {className}" style={boxStyle} class:auto={sizeMode === 'AutoSize'}>
  {#if src}
    <img
      {src}
      {alt}
      draggable="false"
      class:centered
      class:stretch={sizeMode === 'StretchImage' || sizeMode === 'Zoom'}
      style="object-fit:{fit}"
    />
  {/if}
</div>

<style>
  .xp-picturebox {
    position: relative;
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
    background: transparent;
  }
  .auto {
    overflow: visible;
  }
  img {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
  }
  .auto img {
    position: static;
  }
  img.centered:not(.stretch) {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  img.stretch {
    width: 100%;
    height: 100%;
  }
  .FixedSingle {
    border: 1px solid var(--w7-panel-border);
  }
  .Fixed3D {
    border: 2px solid;
    border-color: #a0a0a0 #fff #fff #a0a0a0;
    box-shadow: inset 1px 1px 0 #696969, inset -1px -1px 0 #e3e3e3;
  }
</style>
