/**
 * Static iOS / mobile Safari regression heuristics (no browser required).
 * Run: npm run ios:check
 */
import fs from "node:fs";
import path from "node:path";

type Severity = "blocker" | "warning";

type Finding = {
  severity: Severity;
  file: string;
  line: number;
  rule: string;
  message: string;
};

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "context", "lib", "src"];
const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build", "coverage"]);
const EXT = new Set([".ts", ".tsx", ".css"]);

function rel(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

function scanFile(file: string, findings: Finding[]) {
  const content = fs.readFileSync(file, "utf8");
  const r = rel(file);
  const isCss = file.endsWith(".css");

  const vhPatterns: { re: RegExp; rule: string; msg: string; severity: Severity }[] = [
    {
      re: /\b100vh\b/g,
      rule: "viewport-100vh",
      msg: "Preferire 100dvh/svh o min-h-dvh — 100vh è instabile su iOS Safari",
      severity: "warning",
    },
    {
      re: /\bh-screen\b/g,
      rule: "viewport-h-screen",
      msg: "h-screen usa 100vh — preferire min-h-dvh su layout shell",
      severity: "warning",
    },
    {
      re: /\bmin-h-screen\b/g,
      rule: "viewport-min-h-screen",
      msg: "min-h-screen usa 100vh — preferire min-h-dvh",
      severity: "warning",
    },
  ];

  for (const { re, rule, msg, severity } of vhPatterns) {
    if (content.includes("100dvh") && rule === "viewport-100vh") {
      /* allow mixed files */
    }
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (rule === "viewport-100vh" && /100dvh|100svh|100lvh/.test(m[0])) continue;
      findings.push({ severity, file: r, line: lineOf(content, m.index), rule, message: msg });
    }
  }

  if (!isCss && /\boverflow-x-auto\b/.test(content)) {
    const shellLike =
      /app-shell|page-layout|ShellCard|gestionale-kanban-board|lavorazioni-kanban-board/.test(content) ||
      /className=.*overflow-x-auto/.test(content);
    if (shellLike && !/lg:block|md:block|xl:overflow|hidden lg:|desktop/i.test(content)) {
      const idx = content.search(/overflow-x-auto/);
      findings.push({
        severity: "warning",
        file: r,
        line: lineOf(content, idx),
        rule: "overflow-x-auto-shell",
        message: "overflow-x-auto su container ampio — verificare bleed orizzontale mobile",
      });
    }
  }

  if (!isCss) {
    const inputSmall = /\b(?:input|textarea|select)[^;\n]*\btext-(?:xs|\[1[0-5]px\])/gi;
    let m: RegExpExecArray | null;
    while ((m = inputSmall.exec(content)) !== null) {
      if (/md:text-|lg:text-|dsIosInputTextSize|text-base md:/.test(content.slice(m.index, m.index + 120))) continue;
      findings.push({
        severity: "warning",
        file: r,
        line: lineOf(content, m.index),
        rule: "input-font-small",
        message: "Possibile font <16px su input — iOS zoomma al focus",
      });
    }
  }

  if (!isCss && /fixed inset-0/.test(content) && !/dsZModal|dsZDrawer|dsZModalHigh|dsZGlobalLoading|z-\[(?:5\d|[6-9]\d|[1-9]\d{2,})\]/.test(content)) {
    const idx = content.search(/fixed inset-0/);
    const slice = content.slice(idx, idx + 400);
    if (!/role="presentation"|Modal|Drawer|dialog|overlay/i.test(slice)) {
      findings.push({
        severity: "warning",
        file: r,
        line: lineOf(content, idx),
        rule: "fixed-inset-z",
        message: "fixed inset-0 senza token z-index design system — rischio overlap",
      });
    }
  }

  if (!isCss) {
    const fixedCount = (content.match(/\bfixed\b/g) ?? []).length;
    if (fixedCount >= 4 && /className/.test(content)) {
      findings.push({
        severity: "warning",
        file: r,
        line: 1,
        rule: "many-fixed",
        message: `Molti elementi fixed (${fixedCount}) — verificare stacking Safari`,
      });
    }
  }
}

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const k = `${f.file}:${f.line}:${f.rule}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function riskScore(findings: Finding[]): number {
  const blockers = findings.filter((f) => f.severity === "blocker").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  return Math.min(100, blockers * 30 + warnings * 3);
}

function main() {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) walk(full, files);
  }

  const findings: Finding[] = [];
  for (const file of files) scanFile(file, findings);

  const sorted = dedupe(findings).sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "blocker" ? -1 : 1;
    return a.file.localeCompare(b.file) || a.line - b.line;
  });

  const blockers = sorted.filter((f) => f.severity === "blocker");
  const warnings = sorted.filter((f) => f.severity === "warning");
  const score = riskScore(sorted);
  const status = blockers.length > 0 ? "FAIL" : "PASS";

  console.log("IOS MOBILE REGRESSION CHECK");
  console.log(`STATUS: ${status}`);
  console.log(`RISK SCORE: ${score}`);
  console.log("");
  console.log("BLOCKERS:");
  if (blockers.length === 0) console.log("  (none)");
  else blockers.forEach((f) => console.log(`  [${f.rule}] ${f.file}:${f.line} — ${f.message}`));
  console.log("");
  console.log("WARNINGS:");
  if (warnings.length === 0) console.log("  (none)");
  else {
    const cap = 40;
    warnings.slice(0, cap).forEach((f) => console.log(`  [${f.rule}] ${f.file}:${f.line} — ${f.message}`));
    if (warnings.length > cap) console.log(`  … +${warnings.length - cap} more`);
  }

  if (status === "FAIL") process.exit(1);
}

main();
