import assert from "node:assert/strict";
import { buildDipendentiPdfDownloadFileName } from "@/lib/dipendenti/dipendenti-pdf-filename";

assert.match(
  buildDipendentiPdfDownloadFileName({ monthKey: "2026-05", kind: "aziendale" }),
  /^timesheet_aziendale_.*\.pdf$/,
);

assert.equal(
  buildDipendentiPdfDownloadFileName({
    monthKey: "2026-05",
    kind: "dipendente",
    employeeName: "Mario Rossi",
  }),
  "timesheet_dipendente_Mario_Rossi_202605.pdf",
);

console.log("dipendenti-pdf-filename.test.ts OK");
