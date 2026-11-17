<script lang="ts">
  /**
   * The skills and tools that the chat of a "Run an agent" action starts with: everything that is switched on (like a plain chat),
   * a profile, a team, or the skills, MCP servers and tools that the user checks. An existing chat keeps its own.
   */
  import { type ActionCapabilitiesDto, type CapabilitiesMode } from '@shared/scheduler'
  import CheckedListBox from '../../kit/atoms/CheckedListBox.svelte'
  import ComboBox from '../../kit/atoms/ComboBox.svelte'
  import LabeledField from '../../kit/molecules/LabeledField.svelte'
  import { CAPABILITY_MODES, hiddenFromChecked, refChoices, refsFromChecked, toolChoices, withCapabilitiesMode, type CapabilityChoices } from './taskModel'

  interface Props {
    capabilities: ActionCapabilitiesDto
    /** The action sends its prompt to an existing chat: the choice does not apply. */
    existingChat: boolean
    choices: CapabilityChoices
    /** `data-testid` prefix of the fields. */
    prefix: string
  }

  let { capabilities = $bindable(), existingChat, choices, prefix }: Props = $props()

  const modeItems = CAPABILITY_MODES.map((m) => ({ value: m.value as string, label: m.label }))
  const profileItems = $derived(choices.profiles.map((p) => ({ value: String(p.id), label: p.name })))
  const teamItems = $derived(choices.teams.map((t) => ({ value: String(t.id), label: t.name })))
  const skills = $derived(refChoices(capabilities.skills, choices.skills, 'no longer installed', `${prefix}-skill`))
  const servers = $derived(refChoices(capabilities.servers, choices.servers, 'removed', `${prefix}-server`))
  const tools = $derived(toolChoices(capabilities, choices.servers, `${prefix}-tool`))
  const profile = $derived(choices.profiles.find((p) => p.id === capabilities.profileId) ?? null)
  const team = $derived(choices.teams.find((t) => t.id === capabilities.teamId) ?? null)
  const lead = $derived(team && team.memberIds.length > 0 ? (choices.profiles.find((p) => p.id === team.memberIds[0]) ?? null) : null)

  const setMode = (value: string): void => void (capabilities = withCapabilitiesMode(capabilities, value as CapabilitiesMode, choices))
  const setSkills = (checked: string[]): void => void (capabilities = { ...capabilities, skills: refsFromChecked(checked, capabilities.skills, choices.skills) })
  const setServers = (checked: string[]): void => {
    const next = { ...capabilities, servers: refsFromChecked(checked, capabilities.servers, choices.servers) }
    // Tools of a server that is no longer chosen are not hidden any more.
    capabilities = { ...next, hiddenTools: next.hiddenTools.filter((h) => next.servers.some((s) => s.id === h.serverId)) }
  }
  const setTools = (checked: string[]): void => void (capabilities = { ...capabilities, hiddenTools: hiddenFromChecked(capabilities, choices.servers, checked) })
</script>

<LabeledField label="Skills and tools:" labelWidth={90} class="top">
  <div class="caps" data-testid="{prefix}-capabilities-box">
    {#if existingChat}
      <p class="hint" data-testid="{prefix}-capabilities-existing">An existing chat keeps the skills and tools that it has. Start a new chat for every run to choose them.</p>
    {:else}
      <ComboBox testid="{prefix}-capabilities" aria-label="Skills and tools of the run" items={modeItems} value={capabilities.mode} dropDownStyle="DropDownList" onchange={setMode} />
      {#if capabilities.mode === 'inherit'}
        <p class="hint">The agent gets every skill and MCP server that is switched on in Control Center, like a chat that you start yourself.</p>
      {:else if capabilities.mode === 'profile'}
        <ComboBox
          testid="{prefix}-profile"
          aria-label="Profile"
          items={profileItems}
          value={capabilities.profileId === null ? '' : String(capabilities.profileId)}
          placeholder={profileItems.length === 0 ? 'No profiles yet' : 'Choose a profile'}
          dropDownStyle="DropDownList"
          onchange={(v) => (capabilities = { ...capabilities, profileId: v === '' ? null : Number(v) })}
        />
        <p class="hint" data-testid="{prefix}-profile-hint">
          {#if profile}
            The agent starts with the skills, MCP servers, instructions{profile.agentId !== null || profile.model ? ', agent and model' : ''} of the profile "{profile.name}".
          {:else if profileItems.length === 0}
            Add a profile in the Teams window first.
          {:else}
            The agent starts with the skills, MCP servers and instructions of the profile.
          {/if}
        </p>
      {:else if capabilities.mode === 'team'}
        <ComboBox
          testid="{prefix}-team"
          aria-label="Team"
          items={teamItems}
          value={capabilities.teamId === null ? '' : String(capabilities.teamId)}
          placeholder={teamItems.length === 0 ? 'No teams yet' : 'Choose a team'}
          dropDownStyle="DropDownList"
          onchange={(v) => (capabilities = { ...capabilities, teamId: v === '' ? null : Number(v) })}
        />
        <p class="hint" data-testid="{prefix}-team-hint">
          {#if team && lead}
            The agent runs as {lead.name}, the first member of "{team.name}", with the skills and instructions of the team.
          {:else if team}
            The team "{team.name}" has no members. Add a profile to it in the Teams window.
          {:else if teamItems.length === 0}
            Add a team in the Teams window first.
          {:else}
            The agent runs as the first member of the team, with the skills and instructions of the team.
          {/if}
        </p>
      {:else}
        <div class="lists">
          <div class="col">
            <span class="title">Skills</span>
            <CheckedListBox
              testid="{prefix}-skills"
              items={skills.items}
              checked={skills.checked}
              width="100%"
              height={84}
              label="Skills of the run"
              onitemcheck={(v, on) => setSkills(on ? [...skills.checked, String(v)] : skills.checked.filter((x) => x !== String(v)))}
            />
          </div>
          <div class="col">
            <span class="title">MCP servers</span>
            <CheckedListBox
              testid="{prefix}-servers"
              items={servers.items}
              checked={servers.checked}
              width="100%"
              height={84}
              label="MCP servers of the run"
              onitemcheck={(v, on) => setServers(on ? [...servers.checked, String(v)] : servers.checked.filter((x) => x !== String(v)))}
            />
          </div>
        </div>
        {#if tools.items.length > 0}
          <span class="title">Tools of the chosen servers (clear a tool to hide it from the agent)</span>
          <CheckedListBox
            testid="{prefix}-tools"
            items={tools.items}
            checked={tools.checked}
            width="100%"
            height={84}
            label="Tools of the run"
            onitemcheck={(v, on) => setTools(on ? [...tools.checked, String(v)] : tools.checked.filter((x) => x !== String(v)))}
          />
        {:else if capabilities.servers.length > 0}
          <p class="hint" data-testid="{prefix}-tools-hint">Each chosen server gives the agent all of its tools. Test the server in Control Center to list its tools here.</p>
        {/if}
        <p class="hint">The agent gets only what is checked. Nothing checked means no skills and no MCP servers.</p>
      {/if}
    {/if}
  </div>
</LabeledField>

<style>
  .caps {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  .hint {
    margin: 0;
    color: var(--xp-text-muted);
  }
  .lists {
    display: flex;
    gap: 8px;
  }
  .col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .title {
    font-weight: bold;
  }
</style>
