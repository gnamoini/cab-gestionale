import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  REGRESSION_ALL,
  REGRESSION_CORE,
  REGRESSION_EXTENDED,
} from "../lib/regression/smoke-regression-lists";

const ROOT = process.cwd();

type Tier = "all" | "core" | "extended";

function resolveTier(): Tier {
  const arg = process.argv.find((a) => a.startsWith("--"));
  if (arg === "--core") return "core";
  if (arg === "--extended") return "extended";
  return "all";
}

function testsForTier(tier: Tier): readonly string[] {
  switch (tier) {
    case "core":
      return REGRESSION_CORE;
    case "extended":
      return REGRESSION_EXTENDED;
    default:
      return REGRESSION_ALL;
  }
}

function main(): void {
  const tier = resolveTier();
  const tests = testsForTier(tier);
  console.log(`smoke-regression-tests tier=${tier} (${tests.length} files)\n`);

  for (const rel of tests) {
    const file = path.join(ROOT, rel);
    console.log(`\n--- ${rel} ---\n`);
    const r = spawnSync("npx", ["tsx", file], { cwd: ROOT, shell: true, stdio: "inherit" });
    if (r.status !== 0) {
      console.error(`FAILED: ${rel}`);
      process.exit(1);
    }
  }
  console.log(`\nsmoke-regression-tests (${tier}): all OK\n`);
}

main();
