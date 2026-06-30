import "server-only";

import type { ImportEntity } from "@/lib/data-import/core/types";
import type { ImportEntityPlugin } from "@/lib/data-import/core/import-plugin";
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
} from "@/lib/data-import/entities/stubs/import-stub-plugins.server";

const plugins = new Map<ImportEntity, ImportEntityPlugin>();
const slugIndex = new Map<string, ImportEntity>();

function register(plugin: ImportEntityPlugin) {
  plugins.set(plugin.id, plugin);
  slugIndex.set(plugin.routeSlug, plugin.id);
}

function bootstrap() {
  if (plugins.size > 0) return;
  register(magazzinoImportPlugin);
  register(clientiImportPlugin);
  register(listinoRicambiImportPlugin);
  register(mezziImportPlugin);
  register(preventiviImportPlugin);
  register(settingsHierarchyAttrezzaturePlugin);
  register(settingsHierarchyTelaiPlugin);
  for (const p of SETTINGS_LIST_PLUGINS) register(p);
  register(lavorazioniImportPluginStub);
  register(fattureDraftImportPluginStub);
  register(billingCustomersImportPluginStub);
  register(documentiMetadataImportPluginStub);
  register(dipendentiTimesheetImportPluginStub);
}

export function getImportPlugin(entity: ImportEntity): ImportEntityPlugin {
  bootstrap();
  const plugin = plugins.get(entity);
  if (!plugin) throw new Error(`Plugin import non registrato: ${entity}`);
  return plugin;
}

export function getImportPluginBySlug(slug: string): ImportEntityPlugin {
  bootstrap();
  const id = slugIndex.get(slug);
  if (!id) throw new Error(`Route import sconosciuta: ${slug}`);
  return getImportPlugin(id);
}

export function listImportPlugins(): ImportEntityPlugin[] {
  bootstrap();
  return [...plugins.values()];
}

export function listActiveImportPlugins(): ImportEntityPlugin[] {
  return listImportPlugins().filter((p) => p.status === "active");
}

export function entityIdFromRouteSlug(slug: string): ImportEntity | null {
  bootstrap();
  return slugIndex.get(slug) ?? null;
}

export function routeSlugForEntity(entity: ImportEntity): string {
  return getImportPlugin(entity).routeSlug;
}
