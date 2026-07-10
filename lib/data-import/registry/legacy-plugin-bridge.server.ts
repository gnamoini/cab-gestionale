import "server-only";

import type { ImportEntityPlugin } from "@/lib/data-import/core/import-plugin";
import type { ImportExportPluginDefinition } from "@/lib/data-import/core/plugin-definition";
import { legacyFieldToExportField } from "@/lib/data-import/core/field-schema";

const DEFAULT_PLUGIN_VERSION = "1.0.0";
const DEFAULT_TEMPLATE_VERSION = "1.0";

/** Bridge legacy ImportEntityPlugin → v3 ImportExportPluginDefinition. */
export function legacyPluginToDefinition(plugin: ImportEntityPlugin): ImportExportPluginDefinition {
  const pageKey =
    plugin.permission.kind === "module" ? plugin.permission.module : undefined;

  return {
    id: plugin.id,
    routeSlug: plugin.routeSlug,
    label: plugin.label,
    status: plugin.status,
    pageKey,
    pluginVersion: `${plugin.routeSlug}-import@${DEFAULT_PLUGIN_VERSION}`,
    templateVersion: DEFAULT_TEMPLATE_VERSION,
    fields: plugin.fields.map(legacyFieldToExportField),
    permission: plugin.permission,
    templateFilename: plugin.templateFilename,
    templateSheetName: plugin.templateSheetName,
    dataSources: ["spreadsheet"],
    exportSinks: plugin.exportEnabled ? ["xlsx", "csv"] : [],
    matchKeys: [{ field: "id", priority: 0 }],
    mergePolicy: { default: "PATCH" },
    recoveryProvider: plugin.status === "active" ? { capability: "CREATE_ONLY" } : { capability: "NONE" },
    conflictProvider: {
      concurrencyField: "updated_at",
      check(row, current) {
        const exported = row.updated_at;
        const live = current?.updated_at;
        if (!exported || !live) return { conflict: false };
        if (String(exported) !== String(live)) {
          return { conflict: true, message: "Record modificato dopo l'export." };
        }
        return { conflict: false };
      },
    },
    uiEntry: plugin.uiEntry,
  };
}
