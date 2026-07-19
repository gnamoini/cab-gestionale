#!/usr/bin/env npx tsx
/**
 * knip delta gate — fail if PR introduces new unused files vs baseline.
 * Usage: npx tsx scripts/audit-dead-code-delta.ts [--update-baseline]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, "artifacts", "audit", "dead-code-baseline", "knip-baseline.json");

type KnipBaseline = {
  generatedAt: string;
  unusedFiles: string[];
};

function runKnip(): string[] {
  const result = spawnSync("npx", ["knip", "--reporter", "json"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    maxBuffer: 50 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  try {
    const parsed = JSON.parse(stdout) as { files?: string[] };
    return parsed.files ?? [];
  } catch {
    const files: string[] = [];
    const lineRe = /^Unused files?\s+\((\d+)\)/m;
    if (lineRe.test(stdout)) {
      for (const line of stdout.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("/")) {
          files.push(trimmed.replace(/^[-*]\s*/, ""));
        }
      }
    }
    return files;
  }
}

function main(): void {
  const updateBaseline = process.argv.includes("--update-baseline");
  const current = runKnip();
  const baseline: KnipBaseline = {
    generatedAt: new Date().toISOString(),
    unusedFiles: current,
  };

  if (updateBaseline || !fs.existsSync(BASELINE_PATH)) {
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
    console.log(`Baseline updated: ${current.length} unused files`);
    process.exit(0);
  }

  const prev = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as KnipBaseline;
  const prevSet = new Set(prev.unusedFiles);
  const newUnused = current.filter((f) => !prevSet.has(f));

  if (newUnused.length > 0) {
    console.error(`FAIL: ${newUnused.length} new unused file(s) introduced:`);
    for (const f of newUnused.slice(0, 20)) console.error(`  + ${f}`);
    if (newUnused.length > 20) console.error(`  ... and ${newUnused.length - 20} more`);
    process.exit(1);
  }

  console.log(`PASS: no new unused files (${current.length} total, baseline ${prev.unusedFiles.length})`);
}

main();
