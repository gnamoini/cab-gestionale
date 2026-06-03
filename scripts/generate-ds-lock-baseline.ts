/**
 * Genera ds-lock-baseline.json — grandfather violazioni esistenti.
 * Usage: npx tsx scripts/generate-ds-lock-baseline.ts [--update]
 */
import fs from "node:fs";
import path from "node:path";
import {
  validateFileContent,
  violationFingerprint,
  type DesignSystemViolation,
} from "@/lib/ui-design-system-lock/layout-contract-validator";

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, "lib/ui-design-system-lock/ds-lock-baseline.json");
const SCAN_DIRS = ["components", "app"];
const SKIP = new Set(["node_modules", ".next", "dist"]);
const EXT = new Set([".tsx", ".jsx"]);

function rel(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function collectViolations(): DesignSystemViolation[] {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  return files.flatMap((f) => validateFileContent(rel(f), fs.readFileSync(f, "utf8")));
}

function toBaselineEntries(violations: DesignSystemViolation[]) {
  const seen = new Set<string>();
  const entries: { file: string; line: number; rule: string }[] = [];

  for (const v of violations) {
    if (!v.file || !v.line) continue;
    const fp = violationFingerprint(v);
    if (seen.has(fp)) continue;
    seen.add(fp);
    entries.push({ file: v.file, line: v.line, rule: v.rule });
  }

  entries.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return entries;
}

function main(): void {
  const update = process.argv.includes("--update");
  const violations = collectViolations();
  const entries = toBaselineEntries(violations);

  const payload = { version: 1, entries };

  if (update || !fs.existsSync(BASELINE_PATH)) {
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`Wrote ${entries.length} baseline entries to ds-lock-baseline.json`);
  } else {
    const existing = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as { entries: unknown[] };
    if (entries.length > existing.entries.length) {
      console.error(
        `Baseline would grow: ${existing.entries.length} -> ${entries.length}. Run with --update to refresh.`,
      );
      process.exit(1);
    }
    console.log(`Baseline OK: ${existing.entries.length} entries (scan found ${entries.length})`);
  }
}

main();
