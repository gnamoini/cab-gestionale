import assert from "node:assert/strict";
import {
  REPORT_SECTIONS,
  filterReportSectionsByPermission,
} from "@/components/report/report-sections-config";

const all = [...REPORT_SECTIONS];
assert.equal(all.length, 9);

const noMagazzino = filterReportSectionsByPermission(all, (m) => m !== "magazzino");
assert.ok(!noMagazzino.some((s) => s.id === "magazzino_ricambi"));
assert.ok(noMagazzino.some((s) => s.id === "analisi_ai"));
assert.ok(noMagazzino.some((s) => s.id === "lavorazioni"));

const noMezzi = filterReportSectionsByPermission(all, (m) => m !== "mezzi");
assert.ok(noMezzi.some((s) => s.id === "clienti_mezzi"));

const noClientiMezzi = filterReportSectionsByPermission(all, (m) => m !== "mezzi" && m !== "lavorazioni");
assert.ok(!noClientiMezzi.some((s) => s.id === "clienti_mezzi"));

const onlyLavorazioni = filterReportSectionsByPermission(all, (m) => m === "lavorazioni");
assert.ok(onlyLavorazioni.some((s) => s.id === "clienti_mezzi"));

const onlyAi = filterReportSectionsByPermission(all, () => false);
assert.deepEqual(
  onlyAi.map((s) => s.id),
  ["analisi_ai", "analisi_incrociate"],
);

const admin = filterReportSectionsByPermission(all, () => true);
assert.equal(admin.length, 9);

console.log("report-sections-visibility.test.ts OK");
