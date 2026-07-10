import "server-only";

import type { ImportEntity } from "@/lib/data-import/core/types";
import { assertCapabilityConsistencyForPlugins } from "@/lib/data-import/core/capability-consistency";
import { listImportPlugins } from "@/lib/data-import/registry/import-export-registry";
import { ImportExportRegistry } from "@/lib/data-import/registry/import-export-registry";

/** Framework compiler — fallisce CI se capability incoerenti con registry. */
export function assertCapabilityConsistency(): void {
  assertCapabilityConsistencyForPlugins(
    listImportPlugins().map((p) => ({
      id: p.id,
      status: p.status,
      supportedStrategies: p.supportedStrategies,
    })),
    (entity: ImportEntity) => {
      try {
        return Boolean(ImportExportRegistry.getDefinition(entity).snapshotProvider);
      } catch {
        return false;
      }
    },
  );
}

export { WRITE_MODE_STRATEGIES } from "@/lib/data-import/core/capability-consistency";
