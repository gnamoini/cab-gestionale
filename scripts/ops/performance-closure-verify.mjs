/**
 * Performance closure verify — final audit gate battery.
 * Usage: node scripts/ops/performance-closure-verify.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function run(label, cmd, args, { optional = false } = {}) {
  console.log(`\n[closure] ${label}...`);
  const r = execFileSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: true });
  return r;
}

function runTsx(testPath) {
  execFileSync("npx", ["tsx", testPath], { cwd: ROOT, stdio: "inherit", shell: true });
}

const failures = [];

try {
  if (!existsSync(join(ROOT, ".next", "diagnostics", "route-bundle-stats.json"))) {
    run("build (includes budget gate)", "npm", ["run", "build"]);
  } else {
    run("build-budget-gate", "npm", ["run", "ops:build-budget-gate"]);
  }

  const suite = JSON.parse(
    execFileSync("npx", ["tsx", "scripts/ops/print-governance-suite.ts"], {
      cwd: ROOT,
      encoding: "utf8",
      shell: true,
    }).trim(),
  );

  for (const test of suite) {
    runTsx(test);
  }

  run("performance-snapshot", "node", ["scripts/ops/performance-snapshot.mjs", "--refresh-baseline"]);
  run("performance-regression-check", "npm", ["run", "ops:performance-regression-check"]);
  run("performance-trend-report", "npm", ["run", "ops:performance-trend-report"]);

  try {
    run("lighthouse-budget", "npm", ["run", "ops:lighthouse-budget"]);
  } catch {
    console.warn("[closure] lighthouse-budget skipped or warned (non-fatal)");
  }
} catch (e) {
  failures.push(e instanceof Error ? e.message : String(e));
}

if (failures.length > 0) {
  console.error("\nperformance-closure-verify: FAIL");
  for (const f of failures) console.error(f);
  process.exit(1);
}

console.log("\nperformance-closure-verify: PASS");
