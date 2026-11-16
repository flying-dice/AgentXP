/** The line of an About box (UX-192, UX-206): the program is part of Agent7, and the one version number is the version of Agent7. */
export const aboutLine = (name: string, version = ''): string => (version ? `${name} is part of Agent7 (version ${version}). It has no separate version.` : `${name} is part of Agent7.`)
