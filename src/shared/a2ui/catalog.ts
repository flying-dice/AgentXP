/**
 * The AgentXP WinForms A2UI catalog (protocol v0.9).
 *
 * The component set lives in `winforms-catalog.json`, an official catalog document that web_core
 * loads with `Catalog.fromJson`. Its functions (formatString, required, regex, ...) are the basic
 * catalog's executable implementations, so the same catalog validates messages in the MCP server
 * and the main process and resolves bindings and actions in the renderer.
 */
import { Catalog, type ComponentApi, type FunctionImplementation } from '@a2ui/web_core/v0_9'
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog'
import document from './winforms-catalog.json'

export type WinformsCatalog = Catalog<ComponentApi, FunctionImplementation>

/** A2UI protocol version the catalog and the whole pipeline speak. */
export const A2UI_PROTOCOL_VERSION = 'v0.9'

export function createWinformsCatalog(): WinformsCatalog {
  const schemaOnly = Catalog.fromJson(document)
  return schemaOnly.withEntries([...schemaOnly.components.values()], [...basicCatalog.functions.values()]) as WinformsCatalog
}

/** Shared immutable instance for code that has no reason to build its own. */
export const winformsCatalog: WinformsCatalog = createWinformsCatalog()

export const A2UI_COMPONENT_NAMES: readonly string[] = [...winformsCatalog.components.keys()]

/** Union of the component names in `winforms-catalog.json`; the renderer registry must cover all of them. */
export type WinformsComponentName = keyof (typeof document)['components']
