import "server-only";

import type { ImportEntity } from "@/lib/data-import/core/types";
import type { ImportEntityPlugin } from "@/lib/data-import/core/import-plugin";
import type { ImportExportPluginDefinition } from "@/lib/data-import/core/plugin-definition";
import { legacyPluginToDefinition } from "@/lib/data-import/registry/legacy-plugin-bridge.server";
import { magazzinoImportPlugin } from "@/lib/data-import/entities/magazzino/magazzino-import.plugin.server";
import { clientiImportPlugin } from "@/lib/data-import/entities/clienti/clienti-import.plugin.server";
import { listinoRicambiImportPlugin } from "@/lib/data-import/entities/listino/listino-import.plugin.server";
import { mezziImportPlugin } from "@/lib/data-import/entities/mezzi/mezzi-import.plugin.server";
import { preventiviImportPlugin } from "@/lib/data-import/entities/preventivi/preventivi-import.plugin.server";
import { SETTINGS_LIST_PLUGINS } from "@/lib/data-import/entities/settings-list/settings-list-import.plugin.server";
import {
  settingsHierarchyAttrezzaturePlugin,
  settingsHierarchyTelaiPlugin,
} from "@/lib/data-import/entities/settings-hierarchy/settings-hierarchy-import.plugin.server";
import {
  billingCustomersImportPluginStub,
  dipendentiTimesheetImportPluginStub,
  documentiMetadataImportPluginStub,
  fattureDraftImportPluginStub,
  lavorazioniImportPluginStub,
  ordiniFornitoriImportPluginStub,
} from "@/lib/data-import/entities/stubs/import-stub-plugins.server";
import { registerV3EntityProviders } from "@/lib/data-import/registry/v3-entity-providers.server";
import { ensureImportExportFrameworkBootstrapped } from "@/lib/data-import/core/framework-bootstrap.server";
import { assertCapabilityConsistency } from "@/lib/data-import/core/capability-consistency.server";

const v3Plugins = new Map<ImportEntity, ImportExportPluginDefinition>();
const legacyPlugins = new Map<ImportEntity, ImportEntityPlugin>();
const slugIndex = new Map<string, ImportEntity>();
let consistencyChecked = false;

function registerLegacy(plugin: ImportEntityPlugin) {
  legacyPlugins.set(plugin.id, plugin);
  slugIndex.set(plugin.routeSlug, plugin.id);
  const def = legacyPluginToDefinition(plugin);
  v3Plugins.set(plugin.id, def);
}

function bootstrapLegacy() {
  if (legacyPlugins.size > 0) return;
  ensureImportExportFrameworkBootstrapped();
  registerLegacy(magazzinoImportPlugin);
  registerLegacy(clientiImportPlugin);
  registerLegacy(listinoRicambiImportPlugin);
  registerLegacy(mezziImportPlugin);
  registerLegacy(preventiviImportPlugin);
  registerLegacy(settingsHierarchyAttrezzaturePlugin);
  registerLegacy(settingsHierarchyTelaiPlugin);
  for (const p of SETTINGS_LIST_PLUGINS) registerLegacy(p);
  registerLegacy(lavorazioniImportPluginStub);
  registerLegacy(fattureDraftImportPluginStub);
  registerLegacy(billingCustomersImportPluginStub);
  registerLegacy(documentiMetadataImportPluginStub);
  registerLegacy(dipendentiTimesheetImportPluginStub);
  registerLegacy(ordiniFornitoriImportPluginStub);
  registerV3EntityProviders(v3Plugins, slugIndex);
  if (!consistencyChecked) {
    assertCapabilityConsistency();
    consistencyChecked = true;
  }
}

export const ImportExportRegistry = {
  register(definition: ImportExportPluginDefinition): void {
    bootstrapLegacy();
    v3Plugins.set(definition.id, definition);
    slugIndex.set(definition.routeSlug, definition.id);
  },

  getDefinition(entity: ImportEntity): ImportExportPluginDefinition {
    bootstrapLegacy();
    const def = v3Plugins.get(entity);
    if (!def) throw new Error(`Plugin import-export non registrato: ${entity}`);
    return def;
  },

  getDefinitionBySlug(slug: string): ImportExportPluginDefinition {
    bootstrapLegacy();
    const id = slugIndex.get(slug);
    if (!id) throw new Error(`Route import-export sconosciuta: ${slug}`);
    return ImportExportRegistry.getDefinition(id);
  },

  getLegacyPlugin(entity: ImportEntity): ImportEntityPlugin {
    bootstrapLegacy();
    const p = legacyPlugins.get(entity);
    if (!p) throw new Error(`Legacy plugin non registrato: ${entity}`);
    return p;
  },

  getLegacyPluginBySlug(slug: string): ImportEntityPlugin {
    bootstrapLegacy();
    const id = slugIndex.get(slug);
    if (!id) throw new Error(`Route sconosciuta: ${slug}`);
    return ImportExportRegistry.getLegacyPlugin(id);
  },

  listDefinitions(): ImportExportPluginDefinition[] {
    bootstrapLegacy();
    return [...v3Plugins.values()];
  },

  listActiveDefinitions(): ImportExportPluginDefinition[] {
    return ImportExportRegistry.listDefinitions().filter((p) => p.status === "active");
  },

  listForPage(pageKey: string): ImportExportPluginDefinition[] {
    return ImportExportRegistry.listDefinitions().filter(
      (p) => p.pageKey === pageKey || p.uiEntry?.section === pageKey,
    );
  },

  entityFromSlug(slug: string): ImportEntity | null {
    bootstrapLegacy();
    return slugIndex.get(slug) ?? null;
  },
};

// Re-export per compat con registry.ts esistente
export function getImportPlugin(entity: ImportEntity): ImportEntityPlugin {
  return ImportExportRegistry.getLegacyPlugin(entity);
}

export function getImportPluginBySlug(slug: string): ImportEntityPlugin {
  return ImportExportRegistry.getLegacyPluginBySlug(slug);
}

export function listImportPlugins(): ImportEntityPlugin[] {
  bootstrapLegacy();
  return [...legacyPlugins.values()];
}

export function listActiveImportPlugins(): ImportEntityPlugin[] {
  return listImportPlugins().filter((p) => p.status === "active");
}

export function entityIdFromRouteSlug(slug: string): ImportEntity | null {
  return ImportExportRegistry.entityFromSlug(slug);
}

export function routeSlugForEntity(entity: ImportEntity): string {
  return ImportExportRegistry.getDefinition(entity).routeSlug;
}
