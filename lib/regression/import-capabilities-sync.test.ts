import assert from "node:assert/strict";
import { assertCapabilityConsistencyForPlugins } from "@/lib/data-import/core/capability-consistency";
import {
  IMPORT_ENTITY_CAPABILITIES,
  isImportExcelActive,
  isImportExcelExportOnly,
} from "@/lib/data-import/import-capabilities";
import {
  IMPORT_PLUGIN_CATALOG,
  V3_SNAPSHOT_ENTITIES,
} from "@/lib/data-import/registry/import-plugin-catalog";

assert.equal(isImportExcelActive("mezzi"), true);
assert.equal(isImportExcelExportOnly("lavorazioni"), true);
assert.equal(isImportExcelExportOnly("ordini_fornitori"), true);
assert.equal(IMPORT_ENTITY_CAPABILITIES.mezzi.importWriteMode, "upsert");
assert.equal(IMPORT_ENTITY_CAPABILITIES.lavorazioni.importWriteMode, "none");

assert.doesNotThrow(() =>
  assertCapabilityConsistencyForPlugins(IMPORT_PLUGIN_CATALOG, (entity) =>
    V3_SNAPSHOT_ENTITIES.has(entity),
  ),
);

console.log("import-capabilities-sync.test.ts OK");
