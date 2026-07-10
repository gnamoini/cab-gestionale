#!/usr/bin/env npx tsx
/**
 * Shadow policy evaluation — legacy vs control-report.json
 * npm run control:shadow-policy [-- --strict] [--legacy=legacy-outcomes.json] [--report=control-report.json]
 */
import fs from "node:fs";
import path from "node:path";
import {
  evaluateShadowPolicy,
  evaluateShadowPolicyStrict,
  type ShadowPolicyReport,
} from "@/lib/control/shadow-policy";
import type { ControlOutcome } from "@/lib/control/types";

const HISTORY_FILE = "shadow-policy-history.json";

type ControlReport = {
  context: { runId: string; timestamp: string };
  results: { controlId: string; outcome: ControlOutcome; durationMs?: number }[];
};

type LegacyFile = { outcomes: Record<string, "pass" | "fail"> };

function loadHistory(): { greenStreak: number; baselineDurationP95Ms?: number } {
  if (!fs.existsSync(HISTORY_FILE)) return { greenStreak: 0 };
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) as {
      greenStreak?: number;
      baselineDurationP95Ms?: number;
    };
    return { greenStreak: data.greenStreak ?? 0, baselineDurationP95Ms: data.baselineDurationP95Ms };
  } catch {
    return { greenStreak: 0 };
  }
}

function saveHistory(report: ShadowPolicyReport, baselineDurationP95Ms?: number): void {
  const durations = report.comparisons.length
    ? []
    : [];
  void durations;
  const p95 =
    report.durationRegressionRatio && baselineDurationP95Ms
      ? baselineDurationP95Ms
      : baselineDurationP95Ms;
  fs.writeFileSync(
    HISTORY_FILE,
    `${JSON.stringify(
      {
        lastRunId: report.runId,
        greenStreak: report.consecutiveGreen,
        baselineDurationP95Ms: p95 ?? baselineDurationP95Ms,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
}

function main(): void {
  const strict =
    process.argv.includes("--strict") || process.env.CONTROL_SHADOW_STRICT === "1";
  const reportPath =
    process.argv.find((a) => a.startsWith("--report="))?.split("=")[1] ?? "control-report.json";
  const legacyPath =
    process.argv.find((a) => a.startsWith("--legacy="))?.split("=")[1] ?? "legacy-outcomes.json";
  const outPath =
    process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "shadow-policy-report.json";

  if (!fs.existsSync(reportPath)) {
    console.error(`Missing ${reportPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(legacyPath)) {
    console.error(`Missing ${legacyPath} — run control:shadow-legacy-probe first`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as ControlReport;
  const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8")) as LegacyFile;
  const history = loadHistory();

  let result = evaluateShadowPolicy({
    runId: report.context.runId,
    timestamp: report.context.timestamp,
    legacyOutcomes: legacy.outcomes,
    controlResults: report.results,
    priorGreenStreak: history.greenStreak,
    baselineDurationP95Ms: history.baselineDurationP95Ms,
  });

  if (strict) result = evaluateShadowPolicyStrict(result);

  result.advisory = !strict;
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
  saveHistory(result, history.baselineDurationP95Ms);

  console.log(`Shadow policy ${result.passed ? "PASS" : "FAIL"} (${strict ? "strict" : "advisory"})`);
  console.log(`  consecutiveGreen=${result.consecutiveGreen} unexpectedNewFailures=${result.unexpectedNewFailures}`);
  console.log(`  coverage=${(result.mappedControlCoverage * 100).toFixed(1)}%`);
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);

  if (strict && !result.passed) {
    for (const v of result.violations) console.error(`- [${v.code}] ${v.message}`);
    process.exit(1);
  }
}

main();
