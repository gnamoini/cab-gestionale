#!/usr/bin/env npx tsx
/**
 * Run Control Plane tier — npm run control:pr | control:local | ...
 */
import fs from "node:fs";
import path from "node:path";
import { reportExitCode, runTier } from "@/lib/control/executor";
import type { ControlTier } from "@/lib/control/types";

const TIER_ALIASES: Record<string, ControlTier> = {
  local: "local",
  pr: "pr",
  staging: "staging",
  cert: "cert",
  production: "production",
  observe: "observe",
};

function parseTier(): ControlTier {
  const arg = process.argv[2]?.replace(/^--/, "") ?? process.env.CONTROL_TIER ?? "pr";
  const tier = TIER_ALIASES[arg];
  if (!tier) {
    console.error(`Unknown tier: ${arg}. Use local|pr|staging|cert|production|observe`);
    process.exit(2);
  }
  return tier;
}

function main(): void {
  const tier = parseTier();
  const attempt = Number(process.argv.find((a) => a.startsWith("--attempt="))?.split("=")[1] ?? "1");
  const outArg = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];

  console.log(`\n=== Control Plane tier: ${tier} (attempt ${attempt}) ===\n`);

  const report = runTier(tier, { attempt });
  const json = JSON.stringify(report, null, 2);

  const outPath = outArg ?? path.join(process.cwd(), "control-report.json");
  fs.writeFileSync(outPath, `${json}\n`, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
  console.log(
    `SUMMARY: pass=${report.summary.pass} fail=${report.summary.fail} unknown=${report.summary.unknown} blocked=${report.summary.blocked} blockers=${report.blockers}`,
  );
  console.log(
    `MODE: shadow=${report.controlMode.shadow} coverage=${report.controlMode.coverage} trigger=${report.controlMode.trigger}`,
  );

  for (const r of report.results) {
    if (r.outcome !== "pass") {
      console.log(`- ${r.controlId}: ${r.outcome}${r.reason ? ` (${r.reason})` : ""}`);
    }
  }

  process.exit(reportExitCode(report));
}

main();
