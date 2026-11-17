/// <reference types="vite/client" />
/** The manuals of the repo's `manuals/` folder, bundled into the main process at build time (the Help window bundles the same files). */
export const bundledManuals = import.meta.glob('../../../../manuals/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
