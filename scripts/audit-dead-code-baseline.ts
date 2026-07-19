#!/usr/bin/env npx tsx
/**
 * Phase 0 baseline orchestrator — runs audit tooling and saves artifacts.
 * Usage: npx tsx scripts/audit-dead-code-baseline.ts [--skip-gates]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts", "audit", "dead-code-baseline");

function run(cmd: string, args: string[], logFile: string): { ok: boolean; code: number } {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    maxBuffer: 50 * 1024 * 1024,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  fs.writeFileSync(path.join(OUT, logFile), output);
  return { ok: result.status === 0, code: result.status ?? 1 };
}

function countFiles(): number {
  const result = spawnSync(
    "powershell",
    ["-Command", "(Get-ChildItem -Recurse -Include *.ts,*.tsx -Path app,components,lib,src,hooks | Measure-Object).Count"],
    { cwd: ROOT, encoding: "utf8", shell: true }
  );
  return Number.parseInt((result.stdout ?? "0").trim(), 10) || 0;
}

function main(): void {
  const skipGates = process.argv.includes("--skip-gates");
  fs.mkdirSync(OUT, { recursive: true });

  console.log("=== Dead code baseline ===");

  run("npx", ["tsx", "scripts/audit-import-graph.ts", "--out", "before"], "import-graph.log");
  run("npx", ["tsx", "scripts/audit-technical-debt-score.ts"], "debt-score.log");
  run("npx", ["knip", "--reporter", "compact"], "knip.txt");
  run("npx", ["tsx", "scripts/audit-dead-code-delta.ts", "--update-baseline"], "knip-baseline.log");
  run("npx", ["tsc", "-p", "tsconfig.audit-unused.json", "--noEmit"], "unused-ts.txt");

  if (!skipGates) {
    run("npm", ["run", "ci:tsc"], "ci-tsc.log");
  }

  run("npx", ["tsx", "scripts/supabase-audit-inventory.ts", "--json"], "supabase-inventory.json");

  const meta = {
    generatedAt: new Date().toISOString(),
    fileCount: countFiles(),
    skipGates,
  };
  fs.writeFileSync(path.join(OUT, "baseline-meta.json"), JSON.stringify(meta, null, 2));
  console.log(`Baseline written to ${OUT}`);
  console.log(JSON.stringify(meta, null, 2));
}

main();
