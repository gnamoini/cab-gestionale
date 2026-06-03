import fs from "node:fs";
import path from "node:path";

const SCAN_ROOTS = ["app", "components", "lib", "src", "context"] as const;
const SCAN_EXT = new Set([".ts", ".tsx"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

export type CompatScanSeverity = "low" | "medium" | "high" | "critical";

export type CompatSsotScanHit = {
  file: string;
  line: number;
  ruleId: string;
  severity: CompatScanSeverity;
  message: string;
};

export type CompatSsotScanResult = {
  hits: CompatSsotScanHit[];
  scannedFiles: number;
};

const MAGAZZINO_ROW_ADAPTER_ALLOWLIST = new Set([
  "lib/magazzino/magazzino-db-ui-adapter.ts",
  "lib/magazzino/magazzino-list-cache.ts",
]);

const RESOLVE_COMPAT_ALLOWLIST_PREFIXES = ["lib/magazzino/compat/"];

const RESOLVE_COMPAT_ALLOWLIST_FILES = new Set([
  "lib/magazzino/ricambio-compat-resolver.ts",
]);

const LEGACY_COMPAT_READ_PREFIXES = [
  "lib/magazzino/compat/",
  "lib/magazzino/form.ts",
  "lib/magazzino/magazzino-meta.ts",
  "lib/magazzino/types.ts",
  "lib/magazzino/ricambio-compat-",
  "components/gestionale/magazzino/ricambio-form-fields.tsx",
  "components/gestionale/magazzino/magazzino-descrizione-sort-th.tsx",
];

const LEGACY_COMPAT_READ_FILES = new Set([
  "components/gestionale/magazzino/magazzino-view.tsx",
  "lib/gestionale-log/log-summary.ts",
  "lib/magazzino/magazzino-db-ui-adapter.ts",
  "lib/magazzino/sort-order.ts",
]);

const MAP_UI_TWO_ARG_ALLOWLIST = new Set([
  "lib/magazzino/magazzino-list-cache.ts",
]);

function normalizeRel(p: string): string {
  return p.replace(/\\/g, "/");
}

function isTestFile(rel: string): boolean {
  return rel.includes(".test.") || rel.endsWith(".test.ts") || rel.endsWith(".test.tsx");
}

function walkSourceFiles(rootDir: string, base = rootDir): string[] {
  const out: string[] = [];
  if (!fs.existsSync(rootDir)) return out;
  for (const ent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(rootDir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walkSourceFiles(full, base));
      continue;
    }
    const ext = path.extname(ent.name);
    if (!SCAN_EXT.has(ext)) continue;
    out.push(normalizeRel(path.relative(base, full)));
  }
  return out;
}

function allowedLegacyCompatRead(rel: string): boolean {
  if (isTestFile(rel)) return true;
  if (LEGACY_COMPAT_READ_FILES.has(rel)) return true;
  return LEGACY_COMPAT_READ_PREFIXES.some((p) => rel.startsWith(p) || rel.includes(p));
}

function allowedResolveCompat(rel: string): boolean {
  if (isTestFile(rel)) return true;
  if (RESOLVE_COMPAT_ALLOWLIST_FILES.has(rel)) return true;
  return RESOLVE_COMPAT_ALLOWLIST_PREFIXES.some((p) => rel.startsWith(p));
}

function lineHits(content: string, pattern: RegExp): number[] {
  const lines: number[] = [];
  const rows = content.split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    if (pattern.test(rows[i]!)) lines.push(i + 1);
  }
  return lines;
}

/** Scansione statica repository per bypass compat SSOT. */
export function scanCompatSsotCode(repoRoot = process.cwd()): CompatSsotScanResult {
  const hits: CompatSsotScanHit[] = [];
  let scannedFiles = 0;

  for (const root of SCAN_ROOTS) {
    const abs = path.join(repoRoot, root);
    for (const rel of walkSourceFiles(abs, repoRoot)) {
      if (rel.startsWith("lib/magazzino/compat/compat-ssot-scan")) continue;
      scannedFiles++;
      const content = fs.readFileSync(path.join(repoRoot, rel), "utf8");
      const rows = content.split(/\r?\n/);

      if (!MAGAZZINO_ROW_ADAPTER_ALLOWLIST.has(rel) && !isTestFile(rel)) {
        for (const line of lineHits(content, /\bmagazzinoRowToRicambioUI\s*\(/)) {
          hits.push({
            file: rel,
            line,
            ruleId: "direct-magazzino-row-adapter",
            severity: "high",
            message: "Usare mapMagazzinoRowsToUI o ricambioUiFromMagazzinoRow invece di magazzinoRowToRicambioUI diretto.",
          });
        }
      }

      if (!allowedResolveCompat(rel)) {
        for (const line of lineHits(content, /\bresolveCompatibilitaRicambio\s*\(/)) {
          hits.push({
            file: rel,
            line,
            ruleId: "direct-resolve-compat",
            severity: "medium",
            message: "Usare readCompat*ForUi() o exportCompatLabel() invece di resolveCompatibilitaRicambio diretto.",
          });
        }
      }

      if (!allowedLegacyCompatRead(rel)) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]!;
          if (!/\.compatibilitaMezzi\b/.test(row)) continue;
          if (/case\s+["']compatibilitaMezzi["']/.test(row)) continue;
          if (/readCompat\w+ForUi/.test(row)) continue;
          hits.push({
            file: rel,
            line: i + 1,
            ruleId: "legacy-compat-read",
            severity: "medium",
            message: "Accesso diretto a compatibilitaMezzi fuori allowlist — usare readCompat*ForUi().",
          });
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        if (!/\bmapMagazzinoRowsToUI\s*\(/.test(row)) continue;
        if (MAP_UI_TWO_ARG_ALLOWLIST.has(rel)) continue;
        if (isTestFile(rel)) continue;
        const open = row.indexOf("mapMagazzinoRowsToUI(");
        if (open < 0) continue;
        const slice = row.slice(open);
        const close = slice.indexOf(")");
        if (close < 0) continue;
        const args = slice.slice("mapMagazzinoRowsToUI(".length, close);
        const commaCount = (args.match(/,/g) ?? []).length;
        if (commaCount < 2) {
          hits.push({
            file: rel,
            line: i + 1,
            ruleId: "map-ui-without-liste",
            severity: "low",
            message: "mapMagazzinoRowsToUI senza mezziListe — passare liste prefs per compat SSOT.",
          });
        }
      }
    }
  }

  return { hits, scannedFiles };
}
