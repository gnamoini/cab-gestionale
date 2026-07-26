/**
 * Static audit: skeleton loading/ non importa boundary client gestionale.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LOADING_DIR = path.join(ROOT, "components/design-system/loading");

const ALLOWED_USE_CLIENT = new Set([
  "loading-button.tsx",
  "loading-error-state.tsx",
  "loading-overlay.tsx",
  "loading-progress-bar.tsx",
  "loading-spinner.tsx",
  "loading-state-message.tsx",
  "loading-upload-progress.tsx",
  "skeleton-boundary.tsx",
  "use-delayed-loading-message.ts",
]);

const FORBIDDEN_IMPORT_PATTERNS = [
  /@\/components\/gestionale\//,
  /from\s+["']@\/context\//,
  /from\s+["']@\/src\/hooks\//,
  /from\s+["'][./][^"']*gestionale\/shell-card["']/,
];

function posix(rel: string): string {
  return rel.replace(/\\/g, "/");
}

function walkLoadingFiles(dir: string, out: string[]): void {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkLoadingFiles(abs, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(posix(path.relative(ROOT, abs)));
  }
}

function main(): void {
  const shellCard = read("components/design-system/loading/skeleton-shell-card.tsx");
  assert.doesNotMatch(shellCard, /import\s*\{[^}]*\bShellCard\b/, "skeleton-shell-card non deve importare ShellCard");

  const files: string[] = [];
  walkLoadingFiles(LOADING_DIR, files);
  const violations: string[] = [];

  for (const rel of files) {
    const base = path.basename(rel);
    const text = read(rel);

    if (text.includes('"use client"') && !ALLOWED_USE_CLIENT.has(base)) {
      violations.push(`${rel}: "use client" non consentito nel layer skeleton statico`);
    }

    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      if (pattern.test(text)) {
        violations.push(`${rel}: import vietato (${pattern})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `client-loading-boundary violations:\n${violations.join("\n")}`,
  );

  const pulse = read("lib/ui/design-system.ts");
  assert.match(pulse, /motion-safe:animate-pulse/, "dsSkeletonPulse deve usare motion-safe");
  assert.match(pulse, /motion-reduce:animate-none/, "dsSkeletonPulse deve rispettare prefers-reduced-motion");

  const docs = read("components/gestionale/media/lavorazione-official-documents-panel.tsx");
  assert.doesNotMatch(
    docs,
    /isLoading \? <LoadingFormSkeleton[\s\S]*?\.map\(/,
    "lavorazione-official-documents-panel: skeleton e contenuto non devono coesistere",
  );

  for (const rel of [
    "app/(gestionale)/dashboard/page.tsx",
    "components/gestionale/magazzino/magazzino-view.tsx",
    "components/gestionale/lavorazioni/lavorazioni-page-toolbar.tsx",
    "components/report/layout/report-toolbar.tsx",
    "components/gestionale/documenti/documenti-view.tsx",
    "components/gestionale/mezzi/mezzi-view.tsx",
    "components/preventivi/preventivi-view.tsx",
  ]) {
    assert.match(
      read(rel),
      /data-testid="page-ready-toolbar"|testId="page-ready-toolbar"|contentTestId="page-ready-toolbar"/,
      `${rel}: marker TTUI page-ready-toolbar mancante`,
    );
  }

  console.log("client-loading-boundary-policy.test.ts: OK");
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

main();
