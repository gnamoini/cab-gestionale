import fs from "node:fs";
import path from "node:path";
import { exitWithGate, printGateResult } from "../lib/ci/gate-output";

const GATE_NAME = "UX enforcement";

const ROOT = process.cwd();
const ALLOWED_USE_TOAST = new Set([
  "context/toast-context.tsx",
  "context/upload-feedback-context.tsx",
  "src/hooks/use-gestionale-toast.ts",
  "src/components/gestionale-realtime-bridge.tsx",
  "src/components/gestionale-notifications-bridge.tsx",
  "src/providers/query-provider.tsx",
  "src/lib/ux/interaction-enforcement.ts",
]);

const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build"]);
const EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

type Violation = { file: string; line: number; message: string };

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return file.replace(ROOT + path.sep, "").replace(/\\/g, "/");
}

function scanFile(file: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const fileRel = rel(file);

  lines.forEach((line, idx) => {
    const n = idx + 1;
    if (line.includes("window.alert(")) {
      violations.push({ file: fileRel, line: n, message: "window.alert vietato (usa useGestionaleToast)." });
    }
    if (line.includes("window.confirm(")) {
      violations.push({ file: fileRel, line: n, message: "window.confirm vietato (usa useGestionaleConfirm)." });
    }
    if (line.includes("window.prompt(")) {
      violations.push({ file: fileRel, line: n, message: "window.prompt vietato (usa UI/gestionale toast)." });
    }
    if (/\buseToast\s*\(/.test(line) && !ALLOWED_USE_TOAST.has(fileRel)) {
      violations.push({ file: fileRel, line: n, message: "useToast diretto vietato (usa useGestionaleToast)." });
    }
  });

  return violations;
}

/** Avvisi non bloccanti — standard header liste. */
function scanListTableHeadWarnings(file: string): string[] {
  const fileRel = rel(file);
  if (!/-view\.tsx$/.test(fileRel)) return [];
  if (!fileRel.startsWith("components/")) return [];
  const content = fs.readFileSync(file, "utf8");
  if (!/\bdsTableHead\b/.test(content) && !/\bdsTableHeadCell\b/.test(content)) return [];
  return [`${fileRel}: usa GlobalTableHead / GlobalTableSortTh invece di dsTableHead* (standard Lavorazioni).`];
}

function main() {
  const files = ["app", "components", "context", "lib", "src"].flatMap((d) => walk(path.join(ROOT, d)));
  const violations = files.flatMap(scanFile);
  const tableWarnings = files.flatMap(scanListTableHeadWarnings);

  const blockers = violations.map((v) => `${v.file}:${v.line} ${v.message}`);
  const status = blockers.length === 0 ? "PASS" : "FAIL";

  printGateResult({ name: GATE_NAME, status, blockers, warnings: tableWarnings });
  exitWithGate(status);
}

main();
