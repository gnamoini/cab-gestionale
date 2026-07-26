/**

 * Audit SSOT layout lista tabella ↔ card — listSurface server-side, singolo mount React.

 */

import assert from "node:assert/strict";

import fs from "node:fs";

import path from "node:path";



const ROOT = process.cwd();



function read(rel: string): string {

  return fs.readFileSync(path.join(ROOT, rel), "utf8");

}



const layoutCss = read("components/gestionale/global-table/gestionale-list-layout.css");

const listSurfaceResolver = read("lib/ui/resolve-list-surface.ts");

const listSurfaceServer = read("lib/ui/resolve-list-surface.server.ts");

const globalsCss = read("app/globals-core.css");



assert.match(layoutCss, /\.gestionale-list-tier-xl/);

assert.match(layoutCss, /\.gestionale-list-container/);

assert.match(layoutCss, /container-type:\s*inline-size/);

assert.match(globalsCss, /gestionale-list-layout\.css/);

assert.match(listSurfaceResolver, /resolveListSurfaceFromRequest/);

assert.match(listSurfaceServer, /resolveListSurfaceForPage/);

assert.doesNotMatch(listSurfaceResolver, /useLayoutEffect/);

assert.doesNotMatch(listSurfaceResolver, /ResizeObserver/);



const bannedLayoutPatterns = [

  /useGestionaleListLayout/,

  /listLayout === "desktop"/,

  /listLayout === "mobile"/,

  /resolveGestionalePageLayout/,

];



const xlViews: Array<{ file: string; mustHave: RegExp[]; mustNot: RegExp[] }> = [

  {

    file: "components/gestionale/lavorazioni/lavorazioni-view.tsx",

    mustHave: [/GestionaleListPageProps/, /listSurface === "table"/, /gestionaleListTierClass/],

    mustNot: [/hidden xl:block/, /xl:hidden/, ...bannedLayoutPatterns],

  },

  {

    file: "components/gestionale/mezzi/mezzi-view.tsx",

    mustHave: [/GestionaleListPageProps/, /listSurface={listSurface}/, /gestionaleListTierClass/],

    mustNot: bannedLayoutPatterns,

  },

  {

    file: "components/gestionale/mezzi/mezzi-table.tsx",

    mustHave: [/listSurface === "table"/],

    mustNot: [/hidden xl:block/, /xl:hidden/, ...bannedLayoutPatterns],

  },

  {

    file: "components/gestionale/magazzino/magazzino-view.tsx",

    mustHave: [/GestionaleListPageProps/, /listSurface === "table"/],

    mustNot: [/hidden xl:block/, /xl:hidden/, ...bannedLayoutPatterns],

  },

  {

    file: "components/preventivi/preventivi-view.tsx",

    mustHave: [/GestionaleListPageProps/, /listSurface === "table"/, /gestionaleListTierClass/],

    mustNot: [/hidden xl:block/, /xl:hidden/, ...bannedLayoutPatterns],

  },

  {

    file: "components/lavorazioni-clienti/client-lavorazioni-view.tsx",

    mustHave: [/useClientPortalPageOrchestrator/, /listSurface/, /canRender/, /gestionaleListTierClass/],

    mustNot: [/hidden xl:block/, /xl:hidden/, ...bannedLayoutPatterns],

  },

  {

    file: "components/lavorazioni/schede/lavorazione-preventivi-hub-list.tsx",

    mustHave: [/listSurface === "table"/, /listSurface: ListSurface/],

    mustNot: [/hidden xl:block/, /xl:hidden/, ...bannedLayoutPatterns],

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

    mustNot: [/lg:hidden/, /hidden lg:block/, ...bannedLayoutPatterns],

  },

  {

    file: "components/gestionale/lavorazioni/lavorazioni-view.tsx",

    mustHave: [/LavorazioniKanbanView/],

    mustNot: [/kanbanLayoutRef/, ...bannedLayoutPatterns],

  },

  {

    file: "components/dashboard/security/security-users-table.tsx",

    mustHave: [/GestionaleListPageProps/, /listSurface === "table"/, /gestionaleListTierClass\(listTier\)/],

    mustNot: [/hidden lg:block/, /lg:hidden/, ...bannedLayoutPatterns],

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

    mustHave: [/GestionaleListPageProps/, /listSurface={listSurface}/, /gestionaleListTierClass/],

    mustNot: bannedLayoutPatterns,

  },

  {

    file: "components/gestionale/dipendenti/timesheet-table-view.tsx",

    mustHave: [/listSurface === "table"/],

    mustNot: bannedLayoutPatterns,

  },

  {

    file: "components/gestionale/dipendenti/dipendenti-inserimento-section.tsx",

    mustHave: [/listSurface === "table"/, /listSurface: ListSurface/],

    mustNot: [/hidden md:block/, /md:hidden/, ...bannedLayoutPatterns],

  },

];



for (const entry of mdViews) {

  const src = read(entry.file);

  for (const re of entry.mustHave) assert.match(src, re, `${entry.file}`);

  for (const re of entry.mustNot ?? []) assert.doesNotMatch(src, re, `${entry.file}`);

}



console.log("list-layout-ssot-audit.test.ts OK");

