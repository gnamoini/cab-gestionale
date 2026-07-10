#!/usr/bin/env npx tsx
/**
 * Fase 0 — Cutover preflight (locale).
 * npm run control:cutover-preflight
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

const REQUIRED_WORKFLOWS = [
  ".github/workflows/control-pr.yml",
  ".github/workflows/release-gate.yml",
  ".github/workflows/control-cert.yml",
] as const;

const REQUIRED_SCRIPTS = [
  "control:review",
  "control:parity",
  "control:shadow-report",
  "control:duration:baseline",
  "control:validate-strict-label",
  "control:print-control-mode",
] as const;

function run(cmd: string, args: string[]): boolean {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: true, stdio: "pipe" });
  if (r.status !== 0) {
    const tail = `${r.stdout ?? ""}\n${r.stderr ?? ""}`.trim().slice(-400);
    console.error(`FAIL: ${cmd} ${args.join(" ")}\n${tail}`);
    return false;
  }
  return true;
}

function checkWorkflows(): boolean {
  let ok = true;
  for (const wf of REQUIRED_WORKFLOWS) {
    if (!fs.existsSync(path.join(ROOT, wf))) {
      console.error(`missing workflow: ${wf}`);
      ok = false;
    }
  }
  const shadowJob = fs.readFileSync(path.join(ROOT, ".github/workflows/release-gate.yml"), "utf8");
  if (!shadowJob.includes("control-pr-shadow:")) {
    console.error("release-gate.yml missing control-pr-shadow job (not a separate workflow)");
    ok = false;
  }
  const controlPr = fs.readFileSync(path.join(ROOT, ".github/workflows/control-pr.yml"), "utf8");
  for (const needle of ["validate-strict-label", "control:pr", "Upload control report"]) {
    if (!controlPr.includes(needle)) {
      console.error(`control-pr.yml missing: ${needle}`);
      ok = false;
    }
  }
  return ok;
}

function checkPackageScripts(): boolean {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  let ok = true;
  for (const s of REQUIRED_SCRIPTS) {
    if (!pkg.scripts?.[s]) {
      console.error(`missing npm script: ${s}`);
      ok = false;
    }
  }
  return ok;
}

function main(): void {
  const results: Record<string, "PASS" | "FAIL"> = {
    architecture: "FAIL",
    tooling: "FAIL",
    workflows: "FAIL",
    ready_for_strict_smoke: "FAIL",
  };

  const archOk =
    run("npm", ["run", "control:review"]) &&
    run("npm", ["run", "control:parity"]) &&
    run("npx", ["tsx", "lib/control/regression-classification.test.ts"]) &&
    run("npx", ["tsx", "lib/control/control-owner.test.ts"]) &&
    run("npx", ["tsx", "lib/control/shadow-correlation.test.ts"]) &&
    run("npx", ["tsx", "lib/control/strict-path-local.test.ts"]);
  results.architecture = archOk ? "PASS" : "FAIL";

  results.tooling = checkPackageScripts() ? "PASS" : "FAIL";
  results.workflows = checkWorkflows() ? "PASS" : "FAIL";
  results.ready_for_strict_smoke =
    results.architecture === "PASS" && results.workflows === "PASS" ? "PASS" : "FAIL";

  console.log("");
  console.log("CONTROL_PLANE_PREFLIGHT:");
  for (const [k, v] of Object.entries(results)) {
    console.log(`- ${k}: ${v}`);
  }

  const allPass = Object.values(results).every((v) => v === "PASS");
  process.exit(allPass ? 0 : 1);
}

main();
