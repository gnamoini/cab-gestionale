/**
 * Gestionale shell CSS — wiring contract + optional post-build artifact audit.
 *
 * SSOT split:
 * - globals-core.css → app/layout.tsx (all routes)
 * - globals-gestionale-shell.css → app/(gestionale)/layout.tsx only
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkCssFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkCssFiles(p, out);
    else if (ent.name.endsWith(".css")) out.push(p);
  }
  return out;
}

const gestionaleLayout = read("app/(gestionale)/layout.tsx");
const rootLayout = read("app/layout.tsx");
const globalsCss = read("app/globals.css");
const globalsCoreCss = read("app/globals-core.css");
const globalsShellCss = read("app/globals-gestionale-shell.css");

// --- Source wiring (always enforced) ---
assert.match(gestionaleLayout, /import\s+["']\.\.\/globals-gestionale-shell\.css["']/);
const shellImportIdx = gestionaleLayout.search(/globals-gestionale-shell\.css/);
const firstComponentImportIdx = gestionaleLayout.search(/from\s+["']@\/components/);
assert.ok(
  shellImportIdx >= 0 && (firstComponentImportIdx < 0 || shellImportIdx < firstComponentImportIdx),
  "globals-gestionale-shell.css must be imported before components",
);

assert.match(rootLayout, /import\s+["']\.\/globals-core\.css["']/);
assert.doesNotMatch(rootLayout, /globals-gestionale-shell/);
assert.match(globalsCss, /@import\s+["']\.\/globals-core\.css["']/);
assert.doesNotMatch(globalsCss, /globals-gestionale-shell/);

// --- Split contract: which rules live where ---
assert.match(globalsCoreCss, /@import\s+["']tailwindcss["']/);
assert.match(globalsCoreCss, /\.flex-safe\s*\{/);
assert.match(globalsCoreCss, /--cab-scroll-lock-gap/);

assert.match(globalsShellCss, /\.cab-sidebar-nav-row/);
assert.match(globalsShellCss, /\.cab-page-toolbar-surface/);
assert.match(globalsShellCss, /\.cab-shell-card/);
assert.match(globalsShellCss, /html:has\(\.cab-app-shell\)/);

// --- Post-build audit (when .next exists) ---
const nextCssDirs = [
  path.join(ROOT, ".next", "static", "css"),
  path.join(ROOT, ".next", "static", "chunks"),
  path.join(ROOT, ".next", "build"),
];
const cssArtifacts: string[] = [];
for (const dir of nextCssDirs) {
  cssArtifacts.push(...walkCssFiles(dir));
}

if (fs.existsSync(path.join(ROOT, ".next"))) {
  assert.ok(cssArtifacts.length > 0, ".next present but no CSS artifacts found under static/css|chunks|build");

  const combinedCss = cssArtifacts.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  assert.match(combinedCss, /\.cab-sidebar-nav-row/, "build output missing sidebar shell CSS");
  assert.match(
    combinedCss,
    /\.cab-page-toolbar-surface/,
    "build output missing toolbar shell CSS",
  );

  const shellMarkerCount = (combinedCss.match(/\.cab-sidebar-nav-row--active/g) ?? []).length;
  assert.ok(shellMarkerCount >= 1, "shell active-state rules not found in build CSS");

  // ponytail: coarse duplicate check — same unique selector in many chunks is OK; flag extreme duplication
  const toolbarSurfaceCount = (combinedCss.match(/\.cab-page-toolbar-surface::before/g) ?? []).length;
  assert.ok(
    toolbarSurfaceCount <= cssArtifacts.length * 2,
    `possible duplicate shell CSS load: toolbar surface rule count=${toolbarSurfaceCount}`,
  );
} else {
  console.log("gestionale-shell-css-wiring-policy: .next absent — post-build CSS audit skipped");
}

console.log("gestionale-shell-css-wiring-policy.test.ts OK");
