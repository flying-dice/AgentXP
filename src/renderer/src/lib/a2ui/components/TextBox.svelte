<script lang="ts">
  import TextBox from '$lib/kit/atoms/TextBox.svelte'
  import { asBoolean, asString, asStringList, setterOf } from '../viewProps'
  import Validated from './Validated.svelte'
  import type { A2uiComponentProps } from './types'

  let { view }: A2uiComponentProps = $props()
  let text = $derived(asString(view.value))
  const errors = $derived(asStringList(view.validationErrors))
  const hint = $derived(asString(view.placeholder))
  const example = $derived(hint && !/^(example|e\.g\.)/i.test(hint) ? `Example: ${hint}` : hint)
</script>

<Validated {errors}>
  <!-- A hint is not typed text: grey, italic and introduced by "Example:". -->
  <div class="field">
  <TextBox
    data-testid="a2ui-textbox"
    multiline={asBoolean(view.multiline)}
    password={asBoolean(view.password)}
    placeholder={example || undefined}
    disabled={!asBoolean(view.enabled, true)}
    aria-invalid={errors.length > 0}
    bind:value={
      () => text,
      (v) => {
        text = v
        setterOf(view, 'value')(v)
      }
    }
  />
  </div>
</Validated>

<style>
  .field {
    display: contents;
  }
  .field :global(input::placeholder),
  .field :global(textarea::placeholder) {
    color: #7b8088;
    font-style: italic;
    opacity: 1;
  }
</style>
