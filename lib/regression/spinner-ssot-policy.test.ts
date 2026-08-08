/**
 * Policy: spinner rotativi — SSOT LoadingSpinner + animazione cab-spinner-spin.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const ANIMATE_SPIN_ALLOWLIST = new Set([
  "components/dashboard/health-score-ring-loading.tsx",
  "lib/regression/spinner-ssot-policy.test.ts",
  "e2e/smoke/03-dashboard-report.spec.ts",
  "e2e/perf/browser-page-profile.spec.ts",
]);

const DUPLICATE_BORDER_SPIN_ALLOWLIST = new Set([
  "components/design-system/loading/loading-tokens.ts",
  "lib/theme/app-boot-inline.ts",
]);

const MIGRATED_FILES = [
  "components/gestionale/upload/gestionale-image-upload-button.tsx",
  "components/gestionale/upload/gestionale-file-input.tsx",
  "components/gestionale/magazzino/magazzino-scorta-status-indicator.tsx",
  "components/gestionale/documenti/documenti-view.tsx",
] as const;

const DOCUMENTI_UPLOAD_SPINNER_PATH = "M21 12a9 9 0 0 0-9-9";

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkTsx(dirRel: string, out: string[]): void {
  const abs = path.join(ROOT, dirRel);
  if (!fs.existsSync(abs)) return;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dirRel, ent.name).replace(/\\/g, "/");
    if (ent.isDirectory()) {
      if (rel.includes("node_modules") || rel.startsWith(".next/")) continue;
      walkTsx(rel, out);
    } else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) {
      out.push(rel);
    }
  }
}

function findAnimateSpinViolations(): string[] {
  const violations: string[] = [];
  const files: string[] = [];
  for (const root of ["components", "app", "src", "lib"]) walkTsx(root, files);

  for (const rel of files) {
    if (ANIMATE_SPIN_ALLOWLIST.has(rel)) continue;
    const text = read(rel);
    if (/\banimate-spin\b/.test(text)) violations.push(rel);
  }
  return violations;
}

function findDuplicateBorderSpinViolations(): string[] {
  const violations: string[] = [];
  const files: string[] = [];
  for (const root of ["components", "app", "src"]) walkTsx(root, files);

  const pattern =
    /animate-spin[\s\S]{0,120}border-t-\[var\(--cab-primary\)\]|border-t-\[var\(--cab-primary\)\][\s\S]{0,120}animate-spin/;

  for (const rel of files) {
    if (DUPLICATE_BORDER_SPIN_ALLOWLIST.has(rel)) continue;
    const text = read(rel);
    if (pattern.test(text)) violations.push(rel);
  }
  return violations;
}

function assertMigratedFilesUseLoadingSpinner(): void {
  for (const rel of MIGRATED_FILES) {
    const text = read(rel);
    assert.match(text, /\bLoadingSpinner\b/, `${rel}: deve usare LoadingSpinner`);
    assert.doesNotMatch(text, /\banimate-spin\b/, `${rel}: animate-spin vietato post-migrazione`);
  }
}

function assertDocumentiUploadSpinnerRemoved(): void {
  const text = read("components/gestionale/documenti/documenti-view.tsx");
  assert.doesNotMatch(
    text,
    new RegExp(DOCUMENTI_UPLOAD_SPINNER_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "documenti-view: SVG upload spinner legacy deve essere rimosso",
  );
}

function assertBootSpinnerParity(): void {
  const boot = read("lib/theme/app-boot-inline.ts");
  const tokens = read("components/design-system/loading/loading-tokens.ts");

  assert.match(boot, /CAB_SPINNER_SPIN_KEYFRAMES_CSS/, "app-boot-inline: import keyframes SSOT atteso");
  assert.match(boot, /cabSpinnerRingAnimationDecl/, "app-boot-inline: animation decl SSOT attesa");
  assert.match(tokens, /cab-spinner-spin/, "loading-tokens: keyframe cab-spinner-spin atteso");
  assert.match(tokens, /LOADING_SPINNER_DURATION_MS = 1000/, "loading-tokens: durata 1000ms attesa");
  assert.match(tokens, /cabSpinnerRingAnimationDecl = `animation:\$\{CAB_SPINNER_SPIN_KEYFRAME_NAME\} \$\{LOADING_SPINNER_DURATION_MS\}ms/);
  assert.doesNotMatch(boot, /@keyframes cab-app-boot-spin/, "app-boot-inline: keyframe cab-app-boot-spin legacy rimosso");
}

function main(): void {
  const spinViolations = findAnimateSpinViolations();
  assert.equal(
    spinViolations.length,
    0,
    `animate-spin fuori allowlist: ${spinViolations.join(", ")}`,
  );

  const borderViolations = findDuplicateBorderSpinViolations();
  assert.equal(
    borderViolations.length,
    0,
    `border spinner duplicato fuori SSOT: ${borderViolations.join(", ")}`,
  );

  assertMigratedFilesUseLoadingSpinner();
  assertDocumentiUploadSpinnerRemoved();
  assertBootSpinnerParity();

  console.log("spinner-ssot-policy.test: OK");
}

main();
