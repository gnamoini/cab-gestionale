import assert from "node:assert/strict";
import { canAutoImportLocal } from "@/lib/report/kpi-chart-config/migration";
import type { SavedKpiChart } from "@/lib/report/kpi-chart-config/contracts";

const sample: SavedKpiChart = {
  id: "a",
  name: "Test",
  metricIds: ["lav-periodo", "lav-chiusi"],
  preset: "last_30_days",
  customFrom: "",
  customTo: "",
  displayMode: "indexed",
  normalization: { mode: "indexed", baseline: "first-visible-point", missing: "ignore" },
  schemaVersion: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

assert.equal(canAutoImportLocal(0, [sample]), true);
assert.equal(canAutoImportLocal(0, []), false);
assert.equal(canAutoImportLocal(1, [sample]), false);

console.log("migration.test.ts OK");
