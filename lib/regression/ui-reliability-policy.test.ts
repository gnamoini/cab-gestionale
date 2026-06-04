/**
 * UI Reliability Layer — policy token + anti-pattern static scan.
 *
 * Complementa flex-containment-policy.test.ts con regole table/modal/mobile/SSR.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsx(p, out);
    else if (/\.tsx$/.test(ent.name)) out.push(p);
  }
  return out;
}

const globalsCss = read("app/globals.css");
const globalTable = read("lib/ui/global-table.ts");
const designSystem = read("lib/ui/design-system.ts");
const modalBody = read("lib/ui/modal-max-width-class.ts");
const pageLayout = read("components/design-system/page-layout.tsx");

// --- Global CSS utilities ---
assert.match(globalsCss, /\.flex-safe\s*\{/);
assert.match(globalsCss, /\.flex-fill,\s*\n?\s*\.flex-fill-safe\s*\{/);
assert.match(globalsCss, /\.text-safe\s*\{/);

assert.match(globalsCss, /\.flex-fill-safe\s*\{/);

// --- Scoped min-width containment (NO global flex-wrap) ---
assert.match(globalsCss, /gestionale-responsive-core \.flex > \*/);
assert.doesNotMatch(globalsCss, /gestionale-responsive-core[\s\S]*flex-wrap:\s*wrap/);

// --- Table layer ---
assert.match(globalTable, /globalTableWrap[\s\S]*min-w-0[\s\S]*overflow-x-auto/);
assert.match(globalTable, /globalTableTdBody[\s\S]*min-w-0/);
assert.match(globalTable, /globalTableTheadClass[\s\S]*min-w-0/);

// --- Modal layer ---
assert.match(designSystem, /dsModalPanel[\s\S]*min-w-0 max-w-full overflow-x-hidden/);
assert.match(designSystem, /dsLavorazioniModalDialog[\s\S]*min-w-0 max-w-full overflow-x-hidden/);
assert.match(modalBody, /gestionaleModalBodyFlexClass[\s\S]*min-w-0[\s\S]*flex-col/);

// --- Page layout deterministic (CSS tokens, no window sync) ---
assert.match(pageLayout, /layoutPageRoot/);
assert.match(pageLayout, /dsStackPage/);
assert.doesNotMatch(pageLayout, /useLayoutEffect|window\.innerWidth|matchMedia/);

// --- SSR/hydration: app-shell layout tokens CSS-only (no width sync in render) ---
const appShell = read("components/gestionale/app-shell.tsx");
assert.match(appShell, /layoutResponsiveCoreScope/);
assert.match(appShell, /gestionale-scroll-y/);
assert.match(appShell, /dsGestionaleContentShellRow/);
assert.match(appShell, /dsGestionaleContentRail/);
assert.match(appShell, /dsGestionaleContentGutter/);
assert.match(appShell, /cab-gestionale-scroll-gutter-mirror/);
assert.match(
  appShell,
  /cab-gestionale-scroll-gutter-mirror[\s\S]*>\s*\n\s*<div[\s\S]*dsGestionaleContentGutter/,
  "gutter mirror must wrap padded shell row, not share one element with padding",
);
assert.doesNotMatch(
  designSystem,
  /dsGestionaleContentRail = `[^`]*\bpx-/,
  "content rail must not include horizontal padding (scrollbar flush to column edge)",
);

// --- Flex anti-pattern: files with flex-1 must have containment in same line ---
const flex1Violations: string[] = [];
const FLEX1_ALLOWLIST = [
  { file: "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx", pattern: /lg:flex-1/ },
];

for (const file of walkTsx(path.join(ROOT, "components"))) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bflex-1\b/.test(line) || !/className=/.test(line)) continue;
    if (FLEX1_ALLOWLIST.some((a) => rel === a.file && a.pattern.test(line))) continue;
    const m = line.match(/className=(?:"([^"]*)"|`([^`]*)`|\{[`"']([^`"']*)[`"']\})/);
    const cls = m?.[1] ?? m?.[2] ?? m?.[3] ?? "";
    if (/\bflex-1\b/.test(cls) && !/\bmin-w-0\b|\bflex-fill\b|\bflex-fill-safe\b/.test(cls)) {
      flex1Violations.push(`${rel}:${i + 1}`);
    }
  }
}

assert.equal(flex1Violations.length, 0, `flex-1 without containment: ${flex1Violations.join(", ")}`);

console.log("ui-reliability-policy.test.ts OK");
