import assert from "node:assert/strict";
import { rowToSavedKpiChart, savedKpiChartToConfigBody } from "@/lib/report/kpi-chart-config/mapper";
import type { ReportSavedKpiChartRow } from "@/lib/report/kpi-chart-config/contracts";

const row: ReportSavedKpiChartRow = {
  id: "id-1",
  user_id: "user-1",
  name: "Trend",
  config: {
    metricIds: ["lav-periodo", "lav-chiusi"],
    preset: "current_month",
    customFrom: "",
    customTo: "",
    displayMode: "indexed",
    normalization: { mode: "indexed", baseline: "first-visible-point", missing: "ignore" },
  },
  schema_version: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

const chart = rowToSavedKpiChart(row);
assert.ok(chart);
assert.equal(chart!.name, "Trend");
assert.equal(chart!.metricIds.length, 2);

const body = savedKpiChartToConfigBody(chart!);
assert.deepEqual(body.metricIds, row.config.metricIds);

console.log("mapper.test.ts OK");
