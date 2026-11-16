<script lang="ts">
  interface Props {
    count?: number
    open?: boolean
    onclick?: () => void
    element?: HTMLButtonElement | null
  }

  let { count = 0, open = false, onclick, element = $bindable(null) }: Props = $props()
</script>

<button
  bind:this={element}
  type="button"
  class="flag"
  class:open
  aria-label={count > 0 ? `Action Center: ${count} waiting` : 'Action Center'}
  aria-haspopup="dialog"
  aria-expanded={open}
  title="Action Center"
  {onclick}
>
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 1.5v13" stroke="#fff" stroke-width="1.6" />
    <path d="M3.8 2.6c2.2-1.2 4 1.2 6.600 0v5.600c-2.600 1.200-4.400-1.200-6.600 0z" fill="#fff" stroke="#2c3e5c" stroke-width=".7" />
  </svg>
  {#if count > 0}<span class="badge">{count}</span>{/if}
</button>

<style>
  .flag {
    position: relative;
    width: 26px;
    height: 30px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    cursor: default;
  }
  .flag:hover,
  .flag.open {
    border-color: rgba(255, 255, 255, 0.6);
    background: linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.1));
  }
  .badge {
    position: absolute;
    top: 1px;
    right: 0;
    min-width: 12px;
    height: 12px;
    padding: 0 2px;
    box-sizing: border-box;
    border-radius: 7px;
    background: radial-gradient(circle at 40% 30%, #ff8a7a, #d3261a 70%);
    border: 1px solid #fff;
    color: #fff;
    font-size: 9px;
    line-height: 10px;
    text-align: center;
  }
</style>
