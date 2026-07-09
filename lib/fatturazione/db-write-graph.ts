import fs from "node:fs";
import path from "node:path";

const AXIS_COLUMNS = ["document_status", "payment_status", "sdi_status"] as const;

/** ponytail: one-shot migration backfill bypasses SSOT guard via set_config */
export const AXES_UPDATE_ALLOWLIST = [
  "invoice_write_status_axes",
  "apply_invoice_status_backfill",
] as const;

export type AxesUpdateViolation = {
  file: string;
  line: number;
  snippet: string;
  functionName: string | null;
};

type FnDef = { name: string; body: string; file: string; startLine: number };

function extractFunctionBodies(sql: string, file: string): FnDef[] {
  const results: FnDef[] = [];
  const re = /create\s+or\s+replace\s+function\s+public\.(\w+)\s*\([^)]*\)[\s\S]*?\$\$([\s\S]*?)\$\$/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const before = sql.slice(0, m.index);
    const startLine = before.split("\n").length;
    results.push({ name: m[1]!, body: m[2]!, file, startLine });
  }
  return results;
}

function lineHasAxisUpdate(line: string): boolean {
  const lower = line.toLowerCase();
  if (!lower.includes("update") || !lower.includes("invoices")) return false;
  return AXIS_COLUMNS.some((col) => lower.includes(col));
}

/** Last CREATE OR REPLACE per function name across migration files. */
function effectiveFunctions(migrationsDir: string): Map<string, FnDef> {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.includes("fatturazione") && f.endsWith(".sql"))
    .sort();

  const map = new Map<string, FnDef>();
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    for (const fn of extractFunctionBodies(content, file)) {
      map.set(fn.name, fn);
    }
  }
  return map;
}

export function findAxesUpdateViolations(migrationsDir: string): AxesUpdateViolation[] {
  const violations: AxesUpdateViolation[] = [];
  const fns = effectiveFunctions(migrationsDir);

  for (const fn of fns.values()) {
    if ((AXES_UPDATE_ALLOWLIST as readonly string[]).includes(fn.name)) continue;

    const lines = fn.body.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (!lineHasAxisUpdate(line)) continue;
      violations.push({
        file: fn.file,
        line: fn.startLine + i,
        snippet: line.trim(),
        functionName: fn.name,
      });
    }
  }

  return violations;
}

export function buildWriteGraphMarkdown(migrationsDir: string): string {
  const fns = effectiveFunctions(migrationsDir);
  const edges = new Set<string>();

  for (const fn of fns.values()) {
    if (fn.body.includes("invoice_write_status_axes")) {
      edges.add(`${fn.name} → invoice_write_status_axes`);
    }
    if (fn.body.includes("invoice_apply_transition")) {
      edges.add(`${fn.name} → invoice_apply_transition`);
    }
  }

  return [
    "# Fatturazione DB write graph",
    "",
    "Generato da regression test. Regola: UPDATE assi solo in `invoice_write_status_axes` (allowlist: `apply_invoice_status_backfill`).",
    "",
    ...[...edges].sort().map((e) => `- ${e}`),
    "",
  ].join("\n");
}
