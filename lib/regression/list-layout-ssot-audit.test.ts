/**
 * Audit SSOT layout lista tabella ↔ card (viewport + container).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const layoutCss = read("components/gestionale/global-table/gestionale-list-layout.css");
const layoutHook = read("lib/ui/use-gestionale-list-layout.ts");
const pageLayoutResolver = read("lib/ui/resolve-gestionale-page-layout.ts");
const globalsCss = read("app/globals-core.css");

assert.match(layoutCss, /\.gestionale-list-layout-desktop/);
assert.match(layoutCss, /\.gestionale-list-mobile-only/);
assert.match(globalsCss, /gestionale-list-layout\.css/);
assert.match(layoutHook, /ResizeObserver/);
assert.match(layoutHook, /resolveGestionalePageLayout/);
assert.match(layoutHook, /useLayoutEffect/);
assert.match(layoutHook, /useGestionaleShellContentWidth/);
assert.doesNotMatch(layoutHook, /readGestionaleShellTierFromDom/);
assert.match(pageLayoutResolver, /GESTIONALE_LIST_MIN_VIEWPORT_XL/);
assert.match(pageLayoutResolver, /1280/);
assert.match(pageLayoutResolver, /1024/);

const xlViews: Array<{ file: string; mustHave: RegExp[]; mustNot: RegExp[] }> = [
  {
    file: "components/gestionale/lavorazioni/lavorazioni-view.tsx",
    mustHave: [/useGestionaleListLayout/, /listLayout === "desktop"/, /listLayout === "mobile"/],
    mustNot: [/hidden xl:block/, /xl:hidden/],
  },
  {
    file: "components/gestionale/mezzi/mezzi-view.tsx",
    mustHave: [/useGestionaleListLayout\(\{ tier: "xl" \}\)/, /listLayout={listLayout}/],
    mustNot: [],
  },
  {
    file: "components/gestionale/mezzi/mezzi-table.tsx",
    mustHave: [/listLayout === "desktop"/, /listLayout === "mobile"/],
    mustNot: [/hidden xl:block/, /xl:hidden/],
  },
  {
    file: "components/gestionale/magazzino/magazzino-view.tsx",
    mustHave: [/useGestionaleListLayout/, /listLayout === "desktop"/, /listLayout === "mobile"/],
    mustNot: [/hidden xl:block/, /xl:hidden/],
  },
  {
    file: "components/preventivi/preventivi-view.tsx",
    mustHave: [/useGestionaleListLayout/, /listLayout === "desktop"/, /listLayout === "mobile"/],
    mustNot: [/hidden xl:block/, /xl:hidden/],
  },
  {
    file: "components/lavorazioni-clienti/client-lavorazioni-view.tsx",
    mustHave: [/useClientPortalPageOrchestrator/, /listLayout={listLayout}/, /canRender/],
    mustNot: [/hidden xl:block/, /xl:hidden/, /useGestionaleListLayout/, /readGestionaleShellTierFromDom/],
  },
  {
    file: "components/lavorazioni/schede/lavorazione-preventivi-hub-list.tsx",
    mustHave: [/useGestionaleListLayout/, /listLayout === "desktop"/, /listLayout === "mobile"/],
    mustNot: [/hidden xl:block/, /xl:hidden/],
  },
];

for (const { file, mustHave, mustNot } of xlViews) {
  const src = read(file);
  for (const re of mustHave) assert.match(src, re, `${file} must match ${re}`);
  for (const re of mustNot) assert.doesNotMatch(src, re, `${file} must not match ${re}`);
}

const lgViews: Array<{
  file: string;
  mustHave?: RegExp[];
  mustNot: RegExp[];
}> = [
  {
    file: "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx",
    mustHave: [/layout === "mobile"/, /layout === "desktop"/, /layout === undefined/, /LavorazioniKanbanMobileBoard/],
    mustNot: [/lg:hidden/, /hidden lg:block/, /useGestionaleListLayout/],
  },
  {
    file: "components/gestionale/lavorazioni/lavorazioni-view.tsx",
    mustHave: [/useGestionaleListLayout/, /LavorazioniKanbanView/],
    mustNot: [/kanbanLayoutRef/, /useGestionaleListLayout\(\{ tier: "lg" \}\)/],
  },
  {
    file: "components/dashboard/security/security-users-table.tsx",
    mustHave: [/useGestionaleListLayout\(\{ tier: "lg" \}\)/, /listLayout === "desktop"/, /listLayout === "mobile"/],
    mustNot: [/hidden lg:block/, /lg:hidden/, /gestionale-list-layout-desktop/],
  },
];

for (const entry of lgViews) {
  const src = read(entry.file);
  for (const re of entry.mustHave ?? []) assert.match(src, re, `${entry.file}`);
  for (const re of entry.mustNot) assert.doesNotMatch(src, re, `${entry.file}`);
}

const mdViews: Array<{
  file: string;
  mustHave: RegExp[];
  mustNot?: RegExp[];
}> = [
  {
    file: "components/gestionale/dipendenti/dipendenti-view.tsx",
    mustHave: [/useGestionaleListLayout\(\{ tier: "md" \}\)/, /listLayout={listLayout}/],
  },
  {
    file: "components/gestionale/dipendenti/timesheet-table-view.tsx",
    mustHave: [/listLayout === "desktop"/, /listLayout === "mobile"/],
  },
  {
    file: "components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx",
    mustHave: [/gestionale-list-desktop-only/],
    mustNot: [/hidden md:block/],
  },
  {
    file: "components/gestionale/dipendenti/dipendenti-mobile-day-list.tsx",
    mustHave: [/gestionale-list-mobile-only/],
    mustNot: [/md:hidden/],
  },
  {
    file: "components/gestionale/dipendenti/dipendenti-inserimento-section.tsx",
    mustHave: [/useGestionaleListLayout\(\{ tier: "md" \}\)/, /listLayout === "desktop"/, /listLayout === "mobile"/],
    mustNot: [/hidden md:block/, /md:hidden/],
  },
];

for (const entry of mdViews) {
  const src = read(entry.file);
  for (const re of entry.mustHave) assert.match(src, re, `${entry.file}`);
  for (const re of entry.mustNot ?? []) assert.doesNotMatch(src, re, `${entry.file}`);
}

console.log("list-layout-ssot-audit.test.ts OK");
