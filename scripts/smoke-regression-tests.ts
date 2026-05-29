import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const TESTS = [
  "lib/regression/rbac-route-matrix.test.ts",
  "lib/regression/truth-invalidation.test.ts",
  "lib/regression/report-kpi-bundle.test.ts",
  "lib/production/production-readiness.test.ts",
  "lib/ops/validate-production-env.test.ts",
  "scripts/ops-env-check.ts",
];

function main(): void {
  for (const rel of TESTS) {
    const file = path.join(ROOT, rel);
    console.log(`\n--- ${rel} ---\n`);
    const r = spawnSync("npx", ["tsx", file], { cwd: ROOT, shell: true, stdio: "inherit" });
    if (r.status !== 0) {
      console.error(`FAILED: ${rel}`);
      process.exit(1);
    }
  }
  console.log("\nsmoke-regression-tests: all OK\n");
}

main();
