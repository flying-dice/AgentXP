<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import CodeViewer from './CodeViewer.svelte'
  import { sampleTs } from './stories.samples'

  const { Story } = defineMeta({
    title: 'Organisms/CodeViewer',
    component: CodeViewer,
    args: { code: sampleTs, language: 'typescript', wordWrap: false, toolbar: true, startLine: 1, highlightLines: [] },
    argTypes: {
      code: { control: 'text' },
      language: { control: 'select', options: ['typescript', 'javascript', 'svelte', 'css', 'html', 'json', 'python', 'csharp', 'bash', 'text'] },
      wordWrap: { control: 'boolean' },
      toolbar: { control: 'boolean' },
      startLine: { control: 'number' },
      highlightLines: { control: 'object' },
      maxHeight: { control: 'text' }
    }
  })

  const css = `.w7-btn {
  min-width: 75px;
  height: 23px;
  border: 1px solid #707070;
  border-radius: 3px;
  background: linear-gradient(#f2f2f2 0, #cfcfcf 100%);
}
.w7-btn:hover { border-color: #3c7fb1; }`

  const cs = `using System;

namespace Demo
{
    // Greets the user.
    public class Greeter
    {
        public string Name { get; set; }
        public void Hello() => Console.WriteLine("Hello, " + Name);
    }
}`
</script>

<Story name="Default">
  {#snippet template(args)}
    <div style="width:640px;height:300px"><CodeViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="HighlightedLines" args={{ highlightLines: [5, 6, 7] }}>
  {#snippet template(args)}
    <div style="width:640px;height:300px"><CodeViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="WordWrap" args={{ wordWrap: true }}>
  {#snippet template(args)}
    <div style="width:360px;height:300px"><CodeViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="Css" args={{ code: css, language: 'css', toolbar: false }}>
  {#snippet template(args)}
    <div style="width:480px;height:170px"><CodeViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="CSharp" args={{ code: cs, language: 'csharp', toolbar: false, startLine: 98 }}>
  {#snippet template(args)}
    <div style="width:520px;height:220px"><CodeViewer {...args} /></div>
  {/snippet}
</Story>

<Story name="PlainText" args={{ code: 'No language given.\nRendered as plain text.', language: 'text', toolbar: false }}>
  {#snippet template(args)}
    <div style="width:360px;height:80px"><CodeViewer {...args} /></div>
  {/snippet}
</Story>
