#!/usr/bin/env npx tsx
/**
 * Verifica artifact CI post strict smoke (Fase 1).
 * npm run control:verify-strict-artifacts -- [dir-with-artifacts]
 *
 * Atteso in dir: strict-label-validation.json, control-report.json
 * Opzionale: shadow-policy-report.json, legacy-outcomes.json
 */
import fs from "node:fs";
import path from "node:path";

type Validation = { approved: boolean; strictEnabled?: boolean; reason?: string };
type Report = {
  controlMode?: {
    shadow: string;
    coverage: string;
    trigger: string;
    strictLabelApproved: boolean;
  };
  context?: { commitSha?: string; runId?: string };
};

function main(): void {
  const dir = process.argv[2] ?? process.cwd();
  const blockers: string[] = [];

  const validationPath = path.join(dir, "strict-label-validation.json");
  const reportPath = path.join(dir, "control-report.json");

  if (!fs.existsSync(validationPath)) blockers.push("missing strict-label-validation.json");
  if (!fs.existsSync(reportPath)) blockers.push("missing control-report.json");

  if (fs.existsSync(validationPath)) {
    const v = JSON.parse(fs.readFileSync(validationPath, "utf8")) as Validation;
    if (!v.approved) blockers.push(`strict-label-validation approved=false (${v.reason ?? "?"})`);
  }

  if (fs.existsSync(reportPath)) {
    const r = JSON.parse(fs.readFileSync(reportPath, "utf8")) as Report;
    const m = r.controlMode;
    if (!m) blockers.push("control-report missing controlMode");
    else {
      if (m.shadow !== "strict") blockers.push(`controlMode.shadow=${m.shadow} (expected strict)`);
      if (m.coverage !== "strict") blockers.push(`controlMode.coverage=${m.coverage} (expected strict)`);
      if (m.trigger !== "label") blockers.push(`controlMode.trigger=${m.trigger} (expected label)`);
      if (!m.strictLabelApproved) blockers.push("controlMode.strictLabelApproved=false");
    }
  }

  const shadowPath = path.join(dir, "shadow-policy-report.json");
  if (fs.existsSync(shadowPath)) {
    const s = JSON.parse(fs.readFileSync(shadowPath, "utf8")) as { passed?: boolean };
    if (s.passed === false) blockers.push("shadow-policy-report passed=false");
  } else {
    console.log("warn: shadow-policy-report.json not in dir (optional for local verify)");
  }

  if (blockers.length) {
    console.error("control:verify-strict-artifacts — FAIL");
    for (const b of blockers) console.error(`- ${b}`);
    process.exit(1);
  }

  console.log("control:verify-strict-artifacts — PASS");
  console.log("Strict smoke artifact contract satisfied.");
}

main();
