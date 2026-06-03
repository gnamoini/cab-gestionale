/**
 * Global table head audit — gate invariants.
 */
import assert from "node:assert/strict";
import {
  formatGlobalTableHeadAuditReport,
  scanGlobalTableHeadFileContent,
} from "@/lib/ui/global-table-head-audit";

const sampleBad = `
export function Bad() {
  return (
    <GlobalTableHead>
      <tr><th>A</th></tr>
      <GlobalTableHeadLabel label="B" />
    </GlobalTableHead>
  );
}
`;

const sampleManual = `
import { GlobalTableHeadLabel } from "@/components/gestionale/global-table";
export function Manual() {
  return (
    <table>
      <thead><tr><GlobalTableHeadLabel label="A" /></tr></thead>
    </table>
  );
}
`;

{
  const blockers = scanGlobalTableHeadFileContent("bad.tsx", sampleBad).filter((i) => i.severity === "blocker");
  assert.ok(blockers.some((b) => b.rule === "global-table-head-tr-mix"));
}

{
  const warnings = scanGlobalTableHeadFileContent("manual.tsx", sampleManual).filter((i) => i.severity === "warning");
  assert.ok(warnings.some((w) => w.rule === "manual-thead-without-global-table-head"));
}

assert.match(formatGlobalTableHeadAuditReport({ filesScanned: 1, blockers: [], warnings: [] }), /blockers: 0/);

console.log("global-table-head-audit.test.ts OK");
