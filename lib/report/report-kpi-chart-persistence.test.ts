import assert from "node:assert/strict";
import {
  migrateKpiChartsStorage,
  parseKpiChartsStorage,
  type SavedKpiChartConfig,
} from "@/lib/report/report-kpi-chart-persistence";

const cfg: SavedKpiChartConfig = {
  id: "c1",
  name: "Test",
  metricIds: ["lav-periodo", "lav-chiusi"],
  preset: "last_30_days",
  customFrom: "",
  customTo: "",
  displayMode: "indexed",
  normalization: { mode: "indexed", baseline: "first-visible-point", missing: "ignore" },
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const wrapped = { schemaVersion: 1 as const, configs: [cfg] };
const parsed = parseKpiChartsStorage(wrapped);
assert.ok(parsed);
assert.equal(parsed!.configs.length, 1);
assert.equal(parsed!.configs[0]!.name, "Test");

assert.equal(parseKpiChartsStorage({ schemaVersion: 2, configs: [] }), null);
assert.equal(migrateKpiChartsStorage(wrapped)?.schemaVersion, 1);

console.log("report-kpi-chart-persistence.test.ts OK");
