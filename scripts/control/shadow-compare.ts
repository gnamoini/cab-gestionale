#!/usr/bin/env npx tsx
/**
 * Shadow compare — old release-gate step outcomes vs control-report.json
 * npm run control:shadow-compare -- control-report.json
 */
import fs from "node:fs";
import { LEGACY_CONTROL_MAP } from "@/lib/control/shadow-policy";

type ControlReport = {
  results: { controlId: string; outcome: string }[];
};

function main(): void {
  const reportPath = process.argv[2] ?? "control-report.json";
  if (!fs.existsSync(reportPath)) {
    console.error(`Missing ${reportPath}`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as ControlReport;
  const byId = new Map(report.results.map((r) => [r.controlId, r.outcome]));

  console.log("Shadow mapping (legacy npm → control id):");
  for (const [legacy, id] of Object.entries(LEGACY_CONTROL_MAP)) {
    const outcome = byId.get(id) ?? "missing";
    console.log(`  ${legacy} → ${id}: ${outcome}`);
  }
}

main();
