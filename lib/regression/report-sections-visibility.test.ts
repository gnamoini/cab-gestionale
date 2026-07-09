import assert from "node:assert/strict";
import {
  REPORT_SECTIONS,
  filterReportSectionsByPermission,
} from "@/components/report/report-sections-config";

const all = [...REPORT_SECTIONS];
assert.equal(all.length, 6);

const noMagazzino = filterReportSectionsByPermission(all, (m) => m !== "magazzino");
assert.ok(!noMagazzino.some((s) => s.id === "magazzino_ricambi"));
assert.ok(noMagazzino.some((s) => s.id === "analisi_ai"));
assert.ok(noMagazzino.some((s) => s.id === "lavorazioni"));

const onlyAi = filterReportSectionsByPermission(all, () => false);
assert.deepEqual(
  onlyAi.map((s) => s.id),
  ["analisi_ai", "analisi_incrociate"],
);

const admin = filterReportSectionsByPermission(all, () => true);
assert.equal(admin.length, 6);

console.log("report-sections-visibility.test.ts OK");
