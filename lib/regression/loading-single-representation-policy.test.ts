/**
 * Smoke: una sola rappresentazione di loading per stato — policy skeleton.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const ALLOWED_TABLE_SKELETON_IMPORT = new Set([
  "components/design-system/loading/loading-table-skeleton.tsx",
  "components/design-system/loading/index.ts",
  "components/design-system/index.ts",
  "lib/regression/loading-design-system.test.ts",
  "lib/regression/loading-single-representation-policy.test.ts",
]);

const DIRECT_TABLE_SKELETON_IMPORT_RE =
  /from\s+["']@\/components\/design-system\/loading\/loading-table-skeleton["']|from\s+["'][./][^"']*loading-table-skeleton["']/;

const VIEW_GLOB_DIRS = [
  "components/gestionale",
  "components/preventivi",
  "components/dashboard",
  "components/lavorazioni-clienti",
  "components/report",
];

function walkTsx(dirRel: string, out: string[]): void {
  const abs = path.join(ROOT, dirRel);
  if (!fs.existsSync(abs)) return;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dirRel, ent.name).replace(/\\/g, "/");
    if (ent.isDirectory()) walkTsx(rel, out);
    else if (ent.name.endsWith(".tsx")) out.push(rel);
  }
}

function findDirectTableSkeletonImports(): string[] {
  const violations: string[] = [];
  const scanRoots = ["components", "app", "lib"];
  for (const root of scanRoots) {
    const abs = path.join(ROOT, root);
    if (!fs.existsSync(abs)) continue;
    const stack = [root];
    while (stack.length) {
      const rel = stack.pop()!;
      const dirAbs = path.join(ROOT, rel);
      for (const ent of fs.readdirSync(dirAbs, { withFileTypes: true })) {
        const child = `${rel}/${ent.name}`.replace(/\\/g, "/");
        if (ent.isDirectory()) {
          if (child.includes("node_modules")) continue;
          stack.push(child);
        } else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) {
          if (!ALLOWED_TABLE_SKELETON_IMPORT.has(child) && child.includes("design-system/loading")) continue;
          const text = fs.readFileSync(path.join(ROOT, child), "utf8");
          if (
            DIRECT_TABLE_SKELETON_IMPORT_RE.test(text) &&
            !ALLOWED_TABLE_SKELETON_IMPORT.has(child) &&
            !child.startsWith("components/design-system/loading/")
          ) {
            violations.push(child);
          }
        }
      }
    }
  }
  return violations;
}

function findViewDoubleRepresentation(): string[] {
  const violations: string[] = [];
  const files: string[] = [];
  for (const d of VIEW_GLOB_DIRS) walkTsx(d, files);
  for (const rel of files) {
    if (!/-view\.tsx$/.test(rel)) continue;
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const hasSpinner = /\bLoadingView\b|\bGlobalLoadingView\b/.test(text);
    const hasPageSkeleton = /\bLoading(?:Page|Dashboard|Report|Dipendenti|Lavorazioni|Magazzino|Mezzi|Documenti|Preventivi|Impostazioni|Kanban|ClientDetail)[\w]*Skeleton\b/.test(text);
    if (hasSpinner && hasPageSkeleton) violations.push(rel);
  }
  return violations;
}

function findAuthFormDoubleRepresentation(): string[] {
  const violations: string[] = [];
  const authFiles = ["app/login/login-form.tsx", "app/login/reset-password/reset-password-form.tsx"];
  for (const rel of authFiles) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const hasInlineSpinner = /\bGlobalLoadingView\b/.test(text);
    const hasGlobalHook = /\buseGlobalLoading\b/.test(text);
    if (hasInlineSpinner && hasGlobalHook) violations.push(rel);
  }
  return violations;
}

function main(): void {
  const tableImports = findDirectTableSkeletonImports();
  assert.equal(
    tableImports.length,
    0,
    `LoadingTableSkeleton import fuori da loading/: ${tableImports.join(", ")}`,
  );

  const doubleRep = findViewDoubleRepresentation();
  assert.equal(
    doubleRep.length,
    0,
    `LoadingView + skeleton pagina nello stesso file view: ${doubleRep.join(", ")}`,
  );

  const authDoubleRep = findAuthFormDoubleRepresentation();
  assert.equal(
    authDoubleRep.length,
    0,
    `GlobalLoadingView + useGlobalLoading nello stesso file auth: ${authDoubleRep.join(", ")}`,
  );

  const reportView = fs.readFileSync(
    path.join(ROOT, "components/gestionale/report/report-view.tsx"),
    "utf8",
  );
  assert.doesNotMatch(reportView, /loading:\s*\(\)\s*=>\s*<LoadingReportSkeleton/);

  const suspense = fs.readFileSync(
    path.join(ROOT, "components/design-system/loading/loading-suspense-fallback.tsx"),
    "utf8",
  );
  assert.match(suspense, /LoadingPageSkeleton/);

  console.log("loading-single-representation-policy.test: OK");
}

main();
