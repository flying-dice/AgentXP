<script lang="ts">
  import type { MessageIconKind } from './MessageIcon'

  interface Props {
    kind?: MessageIconKind
    size?: number
    /** Accessible name; defaults to the kind. */
    title?: string
    class?: string
  }

  let { kind = 'information', size = 32, title, class: className = '' }: Props = $props()
  const uid = $props.id()
</script>

<svg
  class="w7-message-icon {className}"
  width={size}
  height={size}
  viewBox="0 0 32 32"
  role="img"
  aria-label={title ?? kind}
>
  <defs>
    <radialGradient id="{uid}-blue" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#9fd0ff" /><stop offset=".55" stop-color="#2f7fd8" /><stop offset="1" stop-color="#14509a" /></radialGradient>
    <radialGradient id="{uid}-red" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#ffb4a6" /><stop offset=".55" stop-color="#e0412c" /><stop offset="1" stop-color="#a01808" /></radialGradient>
    <linearGradient id="{uid}-yel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a0" /><stop offset=".55" stop-color="#f7c928" /><stop offset="1" stop-color="#d89a00" /></linearGradient>
    <linearGradient id="{uid}-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient>
    <linearGradient id="{uid}-sb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb1f2" /><stop offset="1" stop-color="#1f5fb5" /></linearGradient>
    <linearGradient id="{uid}-sy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680" /><stop offset="1" stop-color="#e0a800" /></linearGradient>
  </defs>

  {#if kind === 'information' || kind === 'question'}
    <circle cx="16" cy="16" r="14" fill="url(#{uid}-blue)" stroke="#0f478f" stroke-width="1.2" />
    <ellipse cx="16" cy="9" rx="10" ry="6.5" fill="url(#{uid}-gloss)" />
    {#if kind === 'information'}
      <circle cx="16" cy="9.2" r="2.2" fill="#fff" />
      <path d="M13.2 13h5.1v9.2h2.1v2.2h-7.6v-2.2h2.1v-7h-1.7z" fill="#fff" />
    {:else}
      <path d="M11.3 12.2c0-3 2.2-4.8 5-4.8s4.9 1.6 4.9 4.3c0 1.8-1 2.8-2.2 3.7-1 .8-1.4 1.3-1.4 2.5v.6h-3.2v-.9c0-1.8.7-2.7 1.9-3.6.9-.7 1.4-1.2 1.4-2 0-.8-.6-1.4-1.5-1.4-1 0-1.6.6-1.7 1.8z" fill="#fff" />
      <rect x="14.3" y="20.2" width="3.4" height="3.4" fill="#fff" />
    {/if}
  {:else if kind === 'error'}
    <circle cx="16" cy="16" r="14" fill="url(#{uid}-red)" stroke="#8c1204" stroke-width="1.2" />
    <ellipse cx="16" cy="9" rx="10" ry="6.5" fill="url(#{uid}-gloss)" />
    <g stroke="#fff" stroke-width="4" stroke-linecap="square"><line x1="10.5" y1="10.5" x2="21.5" y2="21.5" /><line x1="21.5" y1="10.5" x2="10.5" y2="21.5" /></g>
  {:else if kind === 'warning'}
    <path d="M16 2.6 30 28.2H2z" fill="url(#{uid}-yel)" stroke="#a87400" stroke-width="1.4" stroke-linejoin="round" />
    <path d="M16 4.6 20.6 13H11.4z" fill="url(#{uid}-gloss)" opacity=".7" />
    <path d="M14.2 11h3.6l-.7 9h-2.2z" fill="#2b2b2b" />
    <rect x="14.2" y="21.6" width="3.6" height="3.4" fill="#2b2b2b" />
  {:else}
    <path d="M16 2 28 6v8.6c0 6.4-4.8 11.6-12 14.4C8.8 26.2 4 21 4 14.6V6z" fill="#fff" stroke="#164d97" stroke-width="1.2" stroke-linejoin="round" />
    <path d="M16 3.6 26.4 7v7.6H16z" fill="url(#{uid}-sy)" />
    <path d="M16 3.6 5.6 7v7.6H16z" fill="url(#{uid}-sb)" />
    <path d="M16 14.6H5.6c.4 5 3.8 9 10.4 11.6z" fill="url(#{uid}-sy)" />
    <path d="M16 14.6h10.4c-.4 5-3.8 9-10.4 11.6z" fill="url(#{uid}-sb)" />
  {/if}
</svg>

<style>
  .w7-message-icon {
    display: inline-block;
    flex: none;
  }
</style>
