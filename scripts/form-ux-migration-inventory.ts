/**
 * Inventario input raw nei form — coverage vs registry/rollout.
 * Usage: npx tsx scripts/form-ux-migration-inventory.ts [--json]
 */
import {
  scanMigrationInventory,
  summarizeInventoryCoverage,
} from "@/lib/form-ux-migration/form-ux-migration-inventory-core";

const JSON_OUT = process.argv.includes("--json");

const { scannedFiles, fields, rolloutFields } = scanMigrationInventory();
const summary = summarizeInventoryCoverage(fields);

const report = {
  scannedFiles,
  totalInputs: summary.total,
  rawInputs: summary.legacy,
  migratedOrSsot: summary.ssot + summary.hybrid + summary.shadow,
  coveragePct: summary.coveragePct,
  rolloutFields,
  inventory: fields.filter((r) => r.status === "legacy"),
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Form UX Migration Inventory");
  console.log("-----------------------------");
  console.log(`Files scanned: ${report.scannedFiles}`);
  console.log(`Inputs found: ${report.totalInputs}`);
  console.log(`Raw (unmigrated): ${report.rawInputs}`);
  console.log(`Coverage: ${report.coveragePct}%`);
  console.log(`Rollout fields: ${rolloutFields.length}`);
  if (report.inventory.length > 0) {
    console.log("\nRaw inputs (first 20):");
    for (const row of report.inventory.slice(0, 20)) {
      console.log(`  ${row.file}:${row.line} [${row.kind}] form=${row.formId ?? "?"}`);
    }
  }
}
