/**
 * Orchestratore locale del release gate (advisory / pre-push).
 * NON autorizza deploy production: solo il check GitHub Actions "release-gate"
 * su commit mergiato in main abilita production (branch protection + Vercel Deployment Protection).
 */
import { spawnSync } from "node:child_process";
import type { GateStatus } from "../lib/ci/gate-output";

type StepStatus = GateStatus | "SKIP";

const STEPS: { label: string; cmd: string; args: string[]; env?: NodeJS.ProcessEnv; optional?: boolean }[] = [
  { label: "ci:tsc", cmd: "npm", args: ["run", "ci:tsc"] },
  {
    label: "ci:build",
    cmd: "npm",
    args: ["run", "ci:build"],
    env: { ...process.env, NODE_ENV: "production" },
  },
  { label: "ux:enforce", cmd: "npm", args: ["run", "ux:enforce"] },
  { label: "ux:mobile-gate", cmd: "npm", args: ["run", "ux:mobile-gate"] },
  { label: "ios:check", cmd: "npm", args: ["run", "ios:check"] },
  {
    label: "verify-supabase-secrets",
    cmd: "node",
    args: ["-e", "process.exit(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 0 : 1)"],
    optional: true,
  },
  {
    label: "verify-supabase-connection",
    cmd: "npx",
    args: ["tsx", "scripts/verify-supabase-ci-env.ts"],
    optional: true,
  },
  {
    label: "production:check",
    cmd: "npm",
    args: ["run", "production:check"],
    env: {
      ...process.env,
      PRODUCTION_CHECK_REQUIRE_DB: process.env.PRODUCTION_CHECK_REQUIRE_DB ?? "1",
      CI: process.env.CI ?? "true",
    },
    optional: true,
  },
  {
    label: "ci:supabase:publication",
    cmd: "npm",
    args: ["run", "ci:supabase:publication"],
    env: {
      ...process.env,
      PUBLICATION_CHECK_STRICT: process.env.PUBLICATION_CHECK_STRICT ?? "0",
    },
    optional: true,
  },
  { label: "smoke:structural", cmd: "npm", args: ["run", "smoke:structural"] },
  { label: "smoke:regression:core", cmd: "npm", args: ["run", "smoke:regression:core"] },
  { label: "flex:eslint:gate", cmd: "npm", args: ["run", "flex:eslint:gate"] },
  { label: "flex:freeze:gate", cmd: "npm", args: ["run", "flex:freeze:gate"] },
];

function hasSupabaseSecrets(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

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

  const results: { label: string; status: StepStatus }[] = [];

  for (const step of STEPS) {
    if (step.optional && !hasSupabaseSecrets() && step.label.startsWith("verify-supabase")) {
      console.log(`\n--- Step: ${step.label} ---\n`);
      console.log(`${step.label} SKIP — Supabase secrets assenti (locale advisory)\n`);
      results.push({ label: step.label, status: "SKIP" });
      continue;
    }
    if (step.optional && step.label === "production:check" && !hasSupabaseSecrets()) {
      console.log(`\n--- Step: ${step.label} ---\n`);
      console.log(`${step.label} SKIP — Supabase secrets assenti (imposta PRODUCTION_CHECK_REQUIRE_DB=0 o esporta env)\n`);
      results.push({ label: step.label, status: "SKIP" });
      continue;
    }
    if (step.optional && step.label === "ci:supabase:publication" && !hasSupabaseSecrets()) {
      console.log(`\n--- Step: ${step.label} ---\n`);
      console.log(`${step.label} SKIP — Supabase secrets assenti\n`);
      results.push({ label: step.label, status: "SKIP" });
      continue;
    }

    console.log(`\n--- Step: ${step.label} ---\n`);
    const { status } = runStep(step);
    results.push({ label: step.label, status });
    if (status === "FAIL") {
      console.error(`\n✖ Release gate stopped at: ${step.label}`);
      printFinalSummary(results);
      process.exit(1);
    }
  }

  const playwrightSteps = [
    { label: "smoke:playwright", args: ["run", "smoke:playwright"] as const },
    { label: "smoke:playwright:ios-smoke", args: ["run", "smoke:playwright:ios-smoke"] as const },
    { label: "smoke:playwright:ricambio:smoke", args: ["run", "smoke:playwright:ricambio:smoke"] as const },
  ];

  for (const pwStep of playwrightSteps) {
    console.log(`\n--- Step: ${pwStep.label} ---\n`);
    if (smokePlaywrightSkip()) {
      console.log(`${pwStep.label} SKIP — credenziali smoke o SMOKE_SKIP=1 (non equivale a CI GitHub)\n`);
      results.push({ label: pwStep.label, status: "SKIP" });
      continue;
    }
    const pw = runStep({ label: pwStep.label, cmd: "npm", args: [...pwStep.args] });
    results.push({ label: pwStep.label, status: pw.status });
    if (pw.status === "FAIL") {
      console.error(`\n✖ Release gate stopped at: ${pwStep.label}`);
      printFinalSummary(results);
      process.exit(1);
    }
  }

  printFinalSummary(results);
  process.exit(0);
}

function printFinalSummary(results: { label: string; status: StepStatus }[]): void {
  console.log("\n=== RELEASE GATE SUMMARY ===\n");
  for (const r of results) {
    console.log(`  ${r.label}: ${r.status}`);
  }
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  const overall: GateStatus = failed === 0 ? "PASS" : "FAIL";
  console.log("");
  console.log(`STATUS: ${overall}`);
  console.log(
    `SUMMARY: Release gate — ${overall} (${failed} failed, ${skipped} skipped; CI GitHub è autorità deploy)`,
  );
}

main();
