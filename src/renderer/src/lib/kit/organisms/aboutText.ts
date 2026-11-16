/** The line of an About box (UX-192): the program and the suite apart, so 0.1.0 is clearly the version of the suite. */
export const aboutLine = (name: string, version = ''): string => `${name}, part of Agent7.${version ? ` Agent7 version ${version}.` : ''}`
