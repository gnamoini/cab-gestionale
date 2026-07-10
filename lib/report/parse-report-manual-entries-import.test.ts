import assert from "node:assert/strict";
import { parseReportManualEntriesMatrix } from "@/lib/report/parse-report-manual-entries-import";

const anchor = new Date("2026-07-09T12:00:00");

const matrix = [
  ["Periodo (YYYY-MM)", "Lavorazioni completate", "Note"],
  ["2024-01", 42, "Gen"],
  ["2024-02", 38, ""],
  ["2026-07", 10, "mese corrente"],
  ["bad-period", 5, ""],
];

const result = parseReportManualEntriesMatrix(matrix, anchor);
assert.equal(result.rows.length, 2);
assert.equal(result.rows[0]?.periodMonth, "2024-01-01");
assert.equal(result.rows[0]?.completedCount, 42);
assert.equal(result.rows[1]?.completedCount, 38);
assert.ok(result.errors.some((e) => e.message.includes("mese passato")));
assert.ok(result.errors.some((e) => e.message.includes("Periodo non valido")));

console.log("parse-report-manual-entries-import.test.ts OK");
