/**
 * Orchestratore locale del release gate (advisory / pre-push).
 * NON autorizza deploy production: solo il check GitHub Actions "release-gate"
 * su commit mergiato in main abilita production (branch protection + Vercel Deployment Protection).
 */
import { spawnSync } from "node:child_process";
import type { GateStatus } from "../lib/ci/gate-output";

const STEPS: { label: string; cmd: string; args: string[]; env?: NodeJS.ProcessEnv }[] = [
  { label: "ci:tsc", cmd: "npm", args: ["run", "ci:tsc"] },
  {
    label: "ci:build",
    cmd: "npm",
    args: ["run", "ci:build"],
    env: { ...process.env, NODE_ENV: "production" },
  },
  { label: "ux:enforce", cmd: "npm", args: ["run", "ux:enforce"] },
  { label: "ux:mobile-gate", cmd: "npm", args: ["run", "ux:mobile-gate"] },
  {
    label: "production:check",
    cmd: "npm",
    args: ["run", "production:check"],
    env: {
      ...process.env,
      PRODUCTION_CHECK_REQUIRE_DB: process.env.PRODUCTION_CHECK_REQUIRE_DB ?? "1",
      CI: process.env.CI ?? "true",
    },
  },
  { label: "smoke:structural", cmd: "npm", args: ["run", "smoke:structural"] },
  { label: "smoke:regression", cmd: "npm", args: ["run", "smoke:regression"] },
];

function smokePlaywrightSkip(): boolean {
  if (process.env.SMOKE_SKIP === "1") return true;
  const hasCreds =
    process.env.SMOKE_ADMIN_EMAIL?.trim() &&
    process.env.SMOKE_ADMIN_PASSWORD?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return !hasCreds;
}

function runStep(step: (typeof STEPS)[number]): { ok: boolean; status: GateStatus } {
  const r = spawnSync(step.cmd, step.args, {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, ...step.env },
  });
  const ok = r.status === 0;
  return { ok, status: ok ? "PASS" : "FAIL" };
}

function main() {
  console.log("RELEASE GATE — sequential checks (local advisory; does not authorize production deploy)\n");

  const results: { label: string; status: GateStatus }[] = [];

  for (const step of STEPS) {
    console.log(`\n--- Step: ${step.label} ---\n`);
    const { status } = runStep(step);
    results.push({ label: step.label, status });
    if (status === "FAIL") {
      console.error(`\n✖ Release gate stopped at: ${step.label}`);
      printFinalSummary(results);
      process.exit(1);
    }
  }

  console.log("\n--- Step: smoke:playwright ---\n");
  if (smokePlaywrightSkip()) {
    console.log("smoke:playwright SKIP — credenziali smoke o SMOKE_SKIP=1 (advisory locale)\n");
    results.push({ label: "smoke:playwright", status: "PASS" });
  } else {
    const pw = runStep({ label: "smoke:playwright", cmd: "npm", args: ["run", "smoke:playwright"] });
    results.push({ label: "smoke:playwright", status: pw.status });
    if (pw.status === "FAIL") {
      console.error("\n✖ Release gate stopped at: smoke:playwright");
      printFinalSummary(results);
      process.exit(1);
    }
  }

  printFinalSummary(results);
  process.exit(0);
}

function printFinalSummary(results: { label: string; status: GateStatus }[]): void {
  console.log("\n=== RELEASE GATE SUMMARY ===\n");
  for (const r of results) {
    console.log(`  ${r.label}: ${r.status}`);
  }
  const failed = results.filter((r) => r.status === "FAIL").length;
  const overall: GateStatus = failed === 0 ? "PASS" : "FAIL";
  console.log("");
  console.log(`STATUS: ${overall}`);
  console.log(`SUMMARY: Release gate — ${overall} (${failed} failed steps)`);
}

main();
