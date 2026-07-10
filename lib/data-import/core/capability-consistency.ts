import type { ImportEntity } from "@/lib/data-import/core/types";
import type { ImportStrategy } from "@/lib/data-import/core/import-plugin";
import {
  IMPORT_ENTITY_CAPABILITIES,
  type ImportWriteMode,
} from "@/lib/data-import/import-capabilities";

export const WRITE_MODE_STRATEGIES: Record<ImportWriteMode, ImportStrategy[]> = {
  none: [],
  insert: ["initial"],
  update: ["incremental"],
  upsert: ["initial", "incremental", "sync", "replace"],
  merge: ["merge", "initial"],
};

const RECOVERY_TABLE_ENTITIES = new Set<ImportEntity>(["mezzi", "magazzino_ricambi"]);

export type CapabilityConsistencyPlugin = {
  id: ImportEntity;
  status: "active" | "stub";
  supportedStrategies: ImportStrategy[];
};

/** Framework compiler — fallisce CI se capability incoerenti con registry. */
export function assertCapabilityConsistencyForPlugins(
  plugins: CapabilityConsistencyPlugin[],
  hasSnapshotProvider: (entity: ImportEntity) => boolean,
): void {
  const errors: string[] = [];

  for (const plugin of plugins) {
    const cap = IMPORT_ENTITY_CAPABILITIES[plugin.id];
    if (!cap) {
      errors.push(`Capability mancante per entity registrata: ${plugin.id}`);
      continue;
    }

    if (cap.importExcel === "active" && cap.importWriteMode === "none") {
      errors.push(`${plugin.id}: importExcel active ma importWriteMode none`);
    }
    if (cap.importExcel === "active" && plugin.status === "stub") {
      errors.push(`${plugin.id}: importExcel active ma legacy status stub`);
    }
    if (cap.importExcel === "export_only" && plugin.status === "active") {
      errors.push(`${plugin.id}: importExcel export_only ma legacy status active`);
    }

    const allowed = WRITE_MODE_STRATEGIES[cap.importWriteMode];
    if (cap.importWriteMode !== "none" && cap.importExcel === "active") {
      const overlap = plugin.supportedStrategies.some((s) => allowed.includes(s));
      if (!overlap) {
        errors.push(
          `${plugin.id}: importWriteMode ${cap.importWriteMode} non compatibile con strategies ${plugin.supportedStrategies.join(",")}`,
        );
      }
    }

    if (cap.exportModes.length > 0) {
      if (!hasSnapshotProvider(plugin.id) && cap.exportModes.some((m) => m !== "template")) {
        errors.push(`${plugin.id}: exportModes senza snapshotProvider`);
      }
    }

    if (cap.recovery === "CREATE_ONLY" && !RECOVERY_TABLE_ENTITIES.has(plugin.id)) {
      if (cap.importExcel === "active") {
        errors.push(`${plugin.id}: CREATE_ONLY senza recovery table mapping`);
      }
    }

    if (cap.aiImport.enabled && !cap.aiImport.provider) {
      errors.push(`${plugin.id}: aiImport enabled senza provider`);
    }
  }

  if (errors.length) {
    throw new Error(`assertCapabilityConsistency failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}
