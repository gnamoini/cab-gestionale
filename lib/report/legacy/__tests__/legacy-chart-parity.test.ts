import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LEGACY_CHART_MIGRATION_MATRIX,
  listMigratedChartIds,
} from "@/lib/report/legacy/legacy-chart-migration-matrix";

const migratedIds = listMigratedChartIds();
assert.ok(migratedIds.includes("lav-ingressi-chiusure"));
assert.ok(migratedIds.includes("cross-catena-valore"));

for (const entry of LEGACY_CHART_MIGRATION_MATRIX) {
  assert.notEqual(entry.status, "BLOCKED", `${entry.id} must not be BLOCKED after P9`);
}

const lavorazioniArea = readFileSync(
  join(process.cwd(), "components/report/areas/report-area-lavorazioni-view.tsx"),
  "utf8",
);
assert.match(lavorazioniArea, /report-area-lavorazioni/);

console.log("legacy-chart-parity.test.ts OK");
