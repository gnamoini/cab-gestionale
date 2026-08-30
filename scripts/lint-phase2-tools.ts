/**
 * ponytail: one-off Fase 2 lint tooling — ownership map + baseline aggregation.
 * Upgrade path: delete after lint debt cleared.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const RAW = join(ROOT, "docs/audit/lint-baseline-raw.json");

type LintMessage = {
  ruleId: string | null;
  severity: 1 | 2;
  line: number;
  endLine?: number;
  message: string;
  fix?: { range: [number, number]; text: string };
};

type LintResult = {
  filePath: string;
  messages: LintMessage[];
  errorCount: number;
  warningCount: number;
};

type Ownership = "CLEAN" | "DIRTY_NO_OVERLAP" | "DIRTY_LINT_OVERLAP" | "DIRTY_MIXED";

function normalizePath(p: string): string {
  const norm = p.replace(/\\/g, "/");
  const root = ROOT.replace(/\\/g, "/");
  if (norm.startsWith(root + "/")) return norm.slice(root.length + 1);
  return norm.replace(/^\.\//, "");
}

function getDirtyFiles(): Map<string, Set<number>> {
  const out = execSync("git diff -U0 --no-color", {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  const map = new Map<string, Set<number>>();
  let currentFile: string | null = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("+++ b/")) {
      currentFile = normalizePath(line.slice(6));
      if (!map.has(currentFile)) map.set(currentFile, new Set());
      continue;
    }
    if (!currentFile || !line.startsWith("@@")) continue;
    const m = line.match(/\+(\d+)(?:,(\d+))?/);
    if (!m) continue;
    const start = Number(m[1]);
    const count = m[2] ? Number(m[2]) : 1;
    const lines = map.get(currentFile)!;
    for (let i = start; i < start + count; i++) lines.add(i);
  }
  return map;
}

function classifyFile(
  filePath: string,
  messages: LintMessage[],
  dirtyLines: Set<number> | undefined,
): Ownership {
  if (!dirtyLines || dirtyLines.size === 0) return "CLEAN";
  if (messages.length === 0) return "CLEAN";

  let overlap = 0;
  let noOverlap = 0;
  for (const msg of messages) {
    const end = msg.endLine ?? msg.line;
    let hitsDirty = false;
    for (let ln = msg.line; ln <= end; ln++) {
      if (dirtyLines.has(ln)) {
        hitsDirty = true;
        break;
      }
    }
    if (hitsDirty) overlap++;
    else noOverlap++;
  }

  if (overlap === 0) return "DIRTY_NO_OVERLAP";
  if (noOverlap === 0) return "DIRTY_LINT_OVERLAP";
  return "DIRTY_MIXED";
}

function aggregateRules(results: LintResult[]) {
  const rules = new Map<
    string,
    { errors: number; warnings: number; files: Set<string>; fixable: number }
  >();
  for (const r of results) {
    const fp = normalizePath(r.filePath);
    for (const m of r.messages) {
      const id = m.ruleId ?? "(null)";
      if (!rules.has(id))
        rules.set(id, { errors: 0, warnings: 0, files: new Set(), fixable: 0 });
      const row = rules.get(id)!;
      row.files.add(fp);
      if (m.severity === 2) row.errors++;
      else row.warnings++;
      if (m.fix) row.fixable++;
    }
  }
  return [...rules.entries()]
    .map(([ruleId, v]) => ({
      ruleId,
      errors: v.errors,
      warnings: v.warnings,
      files: v.files.size,
      fixable: v.fixable,
    }))
    .sort((a, b) => b.errors + b.warnings - (a.errors + a.warnings));
}

function main() {
  const cmd = process.argv[2] ?? "all";
  if (!existsSync(RAW)) {
    console.error("Missing", RAW, "— run: npm run lint -- --format json -o docs/audit/lint-baseline-raw.json");
    process.exit(1);
  }

  const results = JSON.parse(readFileSync(RAW, "utf8")) as LintResult[];
  const dirtyMap = getDirtyFiles();

  let totalErrors = 0;
  let totalWarnings = 0;
  const ownershipEntries: Array<{
    file: string;
    ownership: Ownership;
    errors: number;
    warnings: number;
    findingLines: number[];
  }> = [];

  for (const r of results) {
    const fp = normalizePath(r.filePath);
    totalErrors += r.errorCount;
    totalWarnings += r.warningCount;
    const ownership = classifyFile(fp, r.messages, dirtyMap.get(fp));
    ownershipEntries.push({
      file: fp,
      ownership,
      errors: r.errorCount,
      warnings: r.warningCount,
      findingLines: [...new Set(r.messages.map((m) => m.line))].sort((a, b) => a - b),
    });
  }

  const rulesBefore = aggregateRules(results);
  const ownershipSummary = {
    CLEAN: 0,
    DIRTY_NO_OVERLAP: 0,
    DIRTY_LINT_OVERLAP: 0,
    DIRTY_MIXED: 0,
  } as Record<Ownership, number>;
  for (const e of ownershipEntries) ownershipSummary[e.ownership]++;

  if (cmd === "ownership" || cmd === "all") {
    writeFileSync(
      join(ROOT, "docs/audit/lint-file-ownership-2026-08-29.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          dirtyFileCount: dirtyMap.size,
          summary: ownershipSummary,
          files: ownershipEntries.sort((a, b) => a.file.localeCompare(b.file)),
        },
        null,
        2,
      ),
    );
    console.log("ownership map written", ownershipSummary);
  }

  if (cmd === "baseline" || cmd === "all") {
    const baselinePath = join(ROOT, "docs/audit/lint-baseline-2026-08-29.json");
    const existing = existsSync(baselinePath)
      ? (JSON.parse(readFileSync(baselinePath, "utf8")) as Record<string, unknown>)
      : {};
    writeFileSync(
      baselinePath,
      JSON.stringify(
        {
          ...existing,
          generatedAt: new Date().toISOString(),
          commit: execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
          errorsBefore: totalErrors,
          warningsBefore: totalWarnings,
          filesWithFindings: results.filter((r) => r.messages.length > 0).length,
          rulesBefore,
          ownershipSummary,
        },
        null,
        2,
      ),
    );
    console.log("baseline written", { totalErrors, totalWarnings, rules: rulesBefore.length });
  }

  if (cmd === "clean-list") {
    const clean = ownershipEntries
      .filter((e) => e.ownership === "CLEAN" && (e.errors > 0 || e.warnings > 0))
      .map((e) => e.file);
    process.stdout.write(clean.join("\n"));
  }

  if (cmd === "fix-clean") {
    const clean = ownershipEntries
      .filter((e) => e.ownership === "CLEAN" && (e.errors > 0 || e.warnings > 0))
      .map((e) => join(ROOT, e.file));
    if (clean.length === 0) {
      console.log("no clean files to fix");
      return;
    }
    const batch = 40;
    for (let i = 0; i < clean.length; i += batch) {
      const slice = clean.slice(i, i + batch);
      execSync(`npx eslint --fix ${slice.map((p) => `"${p}"`).join(" ")}`, {
        cwd: ROOT,
        stdio: "inherit",
        shell: process.platform === "win32" ? process.env.COMSPEC ?? "cmd.exe" : "/bin/sh",
      });
    }
    console.log("fixed", clean.length, "clean files");
  }
}

main();
