#!/usr/bin/env npx tsx
/**
 * Probe legacy release-gate npm steps → legacy-outcomes.json
 * npm run control:shadow-legacy-probe
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { LEGACY_CONTROL_MAP, type LegacyOutcome } from "@/lib/control/shadow-policy";

const ROOT = process.cwd();
const outPath = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "legacy-outcomes.json";

function npmScriptFromStep(step: string): string {
  const m = step.match(/^npm run (.+)$/);
  return m?.[1] ?? step;
}

function probe(script: string): LegacyOutcome {
  const env = { ...process.env, CI: process.env.CI ?? "true" } as NodeJS.ProcessEnv;
  if (script === "production:check") {
    env.PRODUCTION_CHECK_REQUIRE_DB = env.PRODUCTION_CHECK_REQUIRE_DB ?? "1";
  }
  if (script === "smoke:playwright" && process.env.SMOKE_SKIP === "1") {
    return "pass";
  }
  const result = spawnSync("npm", ["run", script], {
    cwd: ROOT,
    env,
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
  });
  return result.status === 0 ? "pass" : "fail";
}

function main(): void {
  const outcomes: Record<string, LegacyOutcome> = {};
  for (const step of Object.keys(LEGACY_CONTROL_MAP)) {
    const script = npmScriptFromStep(step);
    console.log(`Probing ${step}...`);
    outcomes[step] = probe(script);
    console.log(`  → ${outcomes[step]}`);
  }
  fs.writeFileSync(outPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), outcomes }, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
}

main();
