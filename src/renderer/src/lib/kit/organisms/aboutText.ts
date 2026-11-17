/** The line of an About box (UX-192, UX-206): the program is part of AgentXP, and the one version number is the version of AgentXP. */
export const aboutLine = (name: string, version = ''): string => (version ? `${name} is part of AgentXP (version ${version}). It has no separate version.` : `${name} is part of AgentXP.`)
