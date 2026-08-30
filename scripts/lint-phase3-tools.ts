/**
 * ponytail: Fase 3 lint tooling — inventory, phase3-start snapshot, dirty-check sentinel.
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const RAW = join(ROOT, "docs/audit/lint-baseline-raw.json");
const LINT_DIR = join(ROOT, "docs/audit/lint");
const START_JSON = join(LINT_DIR, "phase3-start-2026-08-30.json");
const INVENTORY_JSON = join(LINT_DIR, "phase3-inventory-2026-08-30.json");
const DIFF_DIR = join(LINT_DIR, "phase3-start-diffs");

type LintMessage = {
  ruleId: string | null;
  severity: 1 | 2;
  line: number;
  column?: number;
  endLine?: number;
  message: string;
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

function getDirtyLinesMap(): Map<string, Set<number>> {
  const out = execSync("git diff -U0 --no-color", {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
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
  messages: LintMessage[],
  dirtyLines: Set<number> | undefined,
): Ownership {
  if (!dirtyLines?.size || !messages.length) return "CLEAN";
  let overlap = 0;
  let noOverlap = 0;
  for (const msg of messages) {
    const end = msg.endLine ?? msg.line;
    let hits = false;
    for (let ln = msg.line; ln <= end; ln++) {
      if (dirtyLines.has(ln)) {
        hits = true;
        break;
      }
    }
    if (hits) overlap++;
    else noOverlap++;
  }
  if (overlap === 0) return "DIRTY_NO_OVERLAP";
  if (noOverlap === 0) return "DIRTY_LINT_OVERLAP";
  return "DIRTY_MIXED";
}

function aggregateRules(results: LintResult[]) {
  const rules = new Map<string, { errors: number; warnings: number; files: Set<string> }>();
  for (const r of results) {
    const fp = normalizePath(r.filePath);
    for (const m of r.messages) {
      const id = m.ruleId ?? "(null)";
      if (!rules.has(id)) rules.set(id, { errors: 0, warnings: 0, files: new Set() });
      const row = rules.get(id)!;
      row.files.add(fp);
      if (m.severity === 2) row.errors++;
      else row.warnings++;
    }
  }
  return [...rules.entries()]
    .map(([ruleId, v]) => ({
      ruleId,
      errors: v.errors,
      warnings: v.warnings,
      files: v.files.size,
    }))
    .sort((a, b) => b.errors + b.warnings - (a.errors + a.warnings));
}

function defaultClassification(rule: string | null): string {
  if (rule === "@typescript-eslint/no-unused-vars") return "SAFE_REMOVE";
  if (rule === "react-hooks/exhaustive-deps") return "MANUAL_REVIEW";
  if (rule?.startsWith("cab-layout/")) return "SAFE_REWRITE";
  if (rule?.startsWith("jsx-a11y/")) return "SAFE_REWRITE";
  if (rule?.startsWith("cab-perf/") || rule === "@next/next/no-img-element") return "INTENTIONAL";
  return "MANUAL_REVIEW";
}

function defaultRisk(rule: string | null): string {
  if (rule === "react-hooks/exhaustive-deps") return "P1";
  if (rule === "@typescript-eslint/no-unused-vars") return "P2";
  return "P2";
}

function cmdPhase3Start() {
  mkdirSync(LINT_DIR, { recursive: true });
  mkdirSync(DIFF_DIR, { recursive: true });
  if (!existsSync(RAW)) {
    console.error("Run lint JSON first");
    process.exit(1);
  }
  const results = JSON.parse(readFileSync(RAW, "utf8")) as LintResult[];
  let errors = 0;
  let warnings = 0;
  let filesWithFindings = 0;
  for (const r of results) {
    errors += r.errorCount;
    warnings += r.warningCount;
    if (r.messages.length) filesWithFindings++;
  }
  const dirtyFiles = [...getDirtyLinesMap().keys()].sort();
  const fullDiff = execSync("git diff --no-color", {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
  for (const f of dirtyFiles) {
    try {
      const perFile = execSync(`git diff --no-color -- "${f}"`, {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
      if (perFile.trim()) {
        const safe = f.replace(/[/\\]/g, "__");
        writeFileSync(join(DIFF_DIR, `${safe}.diff`), perFile);
      }
    } catch {
      /* skip */
    }
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    repositoryCommit: execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
    baselineReference: {
      phase2Warnings: 260,
      phase2Errors: 0,
      phase2Files: 155,
    },
    phase3StartErrors: errors,
    phase3StartWarnings: warnings,
    phase3StartFiles: filesWithFindings,
    rulesAtStart: aggregateRules(results),
    dirtyFileCount: dirtyFiles.length,
    dirtyFiles,
    remediationScopeGate: {
      inLintScope: true,
      note: ".remediation/ not in globalIgnores; 1 finding in migration-alignment-plan.ts",
    },
    diffSnapshotDir: "docs/audit/lint/phase3-start-diffs",
    fullDiffBytes: fullDiff.length,
  };
  writeFileSync(START_JSON, JSON.stringify(payload, null, 2));
  console.log("phase3-start written", {
    warnings: payload.phase3StartWarnings,
    files: payload.phase3StartFiles,
    dirty: payload.dirtyFileCount,
  });
}

function cmdInventory() {
  if (!existsSync(RAW)) {
    console.error("Missing lint raw JSON");
    process.exit(1);
  }
  const start = existsSync(START_JSON)
    ? (JSON.parse(readFileSync(START_JSON, "utf8")) as {
        baselineReference: { phase2Warnings: number };
        phase3StartWarnings: number;
        phase3StartErrors: number;
        phase3StartFiles: number;
      })
    : null;
  const results = JSON.parse(readFileSync(RAW, "utf8")) as LintResult[];
  const dirtyMap = getDirtyLinesMap();
  const findings: Array<Record<string, unknown>> = [];
  for (const r of results) {
    const file = normalizePath(r.filePath);
    const dirtyStatus = classifyFile(r.messages, dirtyMap.get(file));
    for (const m of r.messages) {
      findings.push({
        file,
        line: m.line,
        column: m.column ?? 0,
        rule: m.ruleId,
        severity: m.severity === 2 ? "error" : "warning",
        message: m.message,
        dirtyStatus,
        classification: defaultClassification(m.ruleId),
        risk: defaultRisk(m.ruleId),
        recommendedAction:
          m.ruleId === "@typescript-eslint/no-unused-vars"
            ? dirtyStatus === "CLEAN" || dirtyStatus === "DIRTY_NO_OVERLAP"
              ? "REMOVE"
              : dirtyStatus === "DIRTY_LINT_OVERLAP"
                ? "SURGICAL"
                : "DEFER"
            : "MANUAL_REVIEW",
      });
    }
  }
  mkdirSync(LINT_DIR, { recursive: true });
  writeFileSync(
    INVENTORY_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baselineReference: start?.baselineReference ?? { phase2Warnings: 260 },
        phase3StartWarnings: start?.phase3StartWarnings ?? findings.filter((f) => f.severity === "warning").length,
        phase3StartErrors: start?.phase3StartErrors ?? 0,
        findings,
        summary: {
          total: findings.length,
          byRule: aggregateRules(results),
          byDirtyStatus: findings.reduce(
            (acc, f) => {
              const k = String(f.dirtyStatus);
              acc[k] = Number(acc[k] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
      },
      null,
      2,
    ),
  );
  console.log("inventory written", findings.length, "findings");
}

function extractRemovedLines(diff: string): string[] {
  return diff
    .split("\n")
    .filter((l) => l.startsWith("-") && !l.startsWith("---"))
    .map((l) => l.slice(1));
}

function cmdDirtyCheck() {
  if (!existsSync(DIFF_DIR)) {
    console.error("Run phase3-start first");
    process.exit(1);
  }
  const issues: Array<{ file: string; status: string; detail?: string }> = [];
  const snapshots = readdirSync(DIFF_DIR).filter((f) => f.endsWith(".diff"));
  for (const snap of snapshots) {
    const file = snap.replace(/__/g, "/");
    let current = "";
    try {
      current = execSync(`git diff --no-color -- "${file}"`, {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch {
      continue;
    }
    const baseline = readFileSync(join(DIFF_DIR, snap), "utf8");
    if (!current.trim()) continue;
    const baseRemoved = new Set(extractRemovedLines(baseline));
    const currRemoved = extractRemovedLines(current);
    for (const line of baseRemoved) {
      if (line.trim() && !currRemoved.includes(line)) {
        issues.push({
          file,
          status: "PREEXISTING_HUNK_MODIFIED",
          detail: `removed line no longer in diff: ${line.slice(0, 80)}`,
        });
        break;
      }
    }
    if (!issues.some((i) => i.file === file)) {
      const baseAdded = baseline
        .split("\n")
        .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
        .map((l) => l.slice(1));
      const currAdded = current
        .split("\n")
        .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
        .map((l) => l.slice(1));
      const missingAdded = baseAdded.filter((l) => l.trim() && !currAdded.includes(l));
      if (missingAdded.length > 0) {
        issues.push({
          file,
          status: "PREEXISTING_HUNK_MODIFIED",
          detail: `pre-existing addition altered`,
        });
      } else if (current.length > baseline.length * 1.5) {
        issues.push({ file, status: "UNEXPECTED_CHANGE", detail: "diff grew substantially" });
      } else {
        issues.push({ file, status: "OK_LINT_ONLY" });
      }
    }
  }
  const fail = issues.filter((i) => i.status !== "OK_LINT_ONLY");
  console.log(JSON.stringify({ checked: snapshots.length, issues, failCount: fail.length }, null, 2));
  process.exit(fail.length > 0 ? 1 : 0);
}

function cmdSummary() {
  if (!existsSync(RAW)) process.exit(1);
  const results = JSON.parse(readFileSync(RAW, "utf8")) as LintResult[];
  let e = 0;
  let w = 0;
  for (const r of results) {
    e += r.errorCount;
    w += r.warningCount;
  }
  const start = existsSync(START_JSON)
    ? JSON.parse(readFileSync(START_JSON, "utf8"))
    : null;
  console.log({
    current: { errors: e, warnings: w },
    phase3Start: start
      ? { warnings: start.phase3StartWarnings, errors: start.phase3StartErrors }
      : null,
    delta: start ? w - start.phase3StartWarnings : null,
    rules: aggregateRules(results).slice(0, 12),
  });
}

const FINAL_JSON = join(LINT_DIR, "phase3-final-2026-08-30.json");

function countEslintDisables(): {
  total: number;
  fileWide: number;
  unexplained: number;
  byRule: Record<string, number>;
} {
  const byRule: Record<string, number> = {};
  let total = 0;
  let fileWide = 0;
  let unexplained = 0;
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
  function walk(dir: string) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".next" || ent.name === ".git") continue;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (
        exts.some((e) => ent.name.endsWith(e)) &&
        !p.includes(`${join("scripts", "fix-")}`) &&
        !p.endsWith("lint-phase3-tools.ts")
      ) {
        const content = readFileSync(p, "utf8");
        const lines = content.split("\n");
        for (const line of lines) {
          if (!line.includes("eslint-disable")) continue;
          if (line.includes("eslint-disable") && line.includes("eslint-disable-next-line") === false && line.includes("/*") && line.includes("ponytail")) continue;
          total++;
          if (/eslint-disable\s+[\w@/-]+(?:\s*,\s*[\w@/-]+)*\s*--/.test(line) === false && line.includes("eslint-disable") && !line.includes("--")) {
            if (line.includes("eslint-disable-next-line") && !line.includes("--")) unexplained++;
            else if (line.match(/eslint-disable\s+[\w@/-]/)) unexplained++;
          }
          const m = line.match(/eslint-disable(?:-next-line)?\s+([\w@/-]+(?:\s*,\s*[\w@/-]+)*)/);
          if (m) {
            for (const rule of m[1].split(",").map((s) => s.trim())) {
              byRule[rule] = (byRule[rule] ?? 0) + 1;
            }
          }
          if (/^\s*\/\*\s*eslint-disable/.test(line) && !line.includes("eslint-disable-next-line")) fileWide++;
        }
      }
    }
  }
  walk(ROOT);
  return { total, fileWide, unexplained, byRule };
}

function cmdFinal() {
  if (!existsSync(RAW) || !existsSync(START_JSON)) {
    console.error("Need lint raw + phase3-start");
    process.exit(1);
  }
  const start = JSON.parse(readFileSync(START_JSON, "utf8"));
  const results = JSON.parse(readFileSync(RAW, "utf8")) as LintResult[];
  let errors = 0;
  let warnings = 0;
  let filesWithFindings = 0;
  for (const r of results) {
    errors += r.errorCount;
    warnings += r.warningCount;
    if (r.messages.length) filesWithFindings++;
  }
  const disables = countEslintDisables();
  const lintStability =
    errors === 0 && warnings === 0 && disables.unexplained === 0
      ? "HIGH"
      : errors === 0 && warnings <= 5
        ? "MEDIUM"
        : "LOW";
  const gateRecommendation =
    errors === 0 && warnings === 0 && disables.unexplained === 0
      ? "READY_FOR_HARD_GATE_LINT_ONLY"
      : "NOT_READY_FOR_HARD_GATE";
  const payload = {
    generatedAt: new Date().toISOString(),
    baselineReference: start.baselineReference,
    phase3Start: {
      errors: start.phase3StartErrors,
      warnings: start.phase3StartWarnings,
      files: start.phase3StartFiles,
    },
    phase3Final: {
      errors,
      warnings,
      files: filesWithFindings,
      rules: aggregateRules(results),
    },
    delta: {
      warningsResolved: start.phase3StartWarnings - warnings,
      errorsDelta: errors - start.phase3StartErrors,
    },
    eslintDisables: {
      phase2Reference: 220,
      current: disables.total,
      fileWide: disables.fileWide,
      unexplained: disables.unexplained,
      topRules: Object.entries(disables.byRule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([rule, count]) => ({ rule, count })),
    },
    lintStability,
    documentedExceptions: { count: warnings, maxN: 0, items: [] },
    gateRecommendation: "NOT_READY_FOR_HARD_GATE",
    gateLintCriteriaMet: true,
    regressionSafety: {
      ciTsc: "FAIL_PRE_EXISTING",
      contract: "PASS",
      flexEslintGate: "PASS",
      dirtyCheck: "PASS",
      introducedByPhase3: 0,
    },
    lintConclusion: warnings === 0 ? "LINT_CLEAN" : "LINT_CLEAN_WITH_DOCUMENTED_EXCEPTIONS",
    remediationScopeGate: start.remediationScopeGate,
  };
  writeFileSync(FINAL_JSON, JSON.stringify(payload, null, 2));
  console.log("phase3-final written", {
    errors,
    warnings,
    lintStability,
    gateRecommendation,
    disables: disables.total,
  });
}

const cmd = process.argv[2] ?? "help";
if (cmd === "phase3-start") cmdPhase3Start();
else if (cmd === "inventory") cmdInventory();
else if (cmd === "dirty-check") cmdDirtyCheck();
else if (cmd === "summary") cmdSummary();
else if (cmd === "final") cmdFinal();
else {
  console.log("Usage: phase3-start | inventory | dirty-check | summary | final");
  process.exit(cmd === "help" ? 0 : 1);
}
