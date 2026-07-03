/**
 * Smoke: ogni route ERP ha una variante skeleton dedicata nel registry.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const pageSkeleton = read("components/design-system/loading/loading-page-skeleton.tsx");
const suspense = read("components/design-system/loading/loading-suspense-fallback.tsx");

const ROUTE_VARIANTS = [
  "dashboard",
  "agenda",
  "lavorazioni",
  "magazzino",
  "mezzi",
  "documenti",
  "preventivi",
  "fatturazione",
  "dipendenti",
  "report",
  "impostazioni",
  "clienti",
  "client-detail",
  "sicurezza",
  "production-readiness",
  "login",
] as const;

for (const variant of ROUTE_VARIANTS) {
  assert.match(pageSkeleton, new RegExp(`"${variant}"`), `variante skeleton mancante: ${variant}`);
  const heightKey = variant.includes("-") ? `"${variant}"` : variant;
  assert.match(suspense, new RegExp(`${heightKey.replace(/-/g, "\\-")}:`), `altezza suspense mancante: ${variant}`);
}

const pages: Record<string, string> = {
  "app/(gestionale)/dashboard/page.tsx": "dashboard",
  "app/(gestionale)/agenda/page.tsx": "agenda",
  "app/(gestionale)/lavorazioni/page.tsx": "lavorazioni",
  "app/(gestionale)/magazzino/page.tsx": "magazzino",
  "app/(gestionale)/mezzi/page.tsx": "mezzi",
  "app/(gestionale)/documenti/page.tsx": "documenti",
  "app/(gestionale)/preventivi/page.tsx": "preventivi",
  "app/(gestionale)/fatturazione/page.tsx": "fatturazione",
  "app/(gestionale)/dipendenti/page.tsx": "dipendenti",
  "app/(gestionale)/report/page.tsx": "report",
  "app/(gestionale)/impostazioni/page.tsx": "impostazioni",
  "app/(gestionale)/lavorazioni-clienti/page.tsx": "clienti",
  "app/(gestionale)/lavorazioni-clienti/[id]/page.tsx": "client-detail",
  "app/(gestionale)/sicurezza/page.tsx": "sicurezza",
  "app/(gestionale)/sicurezza/production-readiness/page.tsx": "production-readiness",
  "app/login/page.tsx": "LoadingLoginSkeleton",
  "app/login/reset-password/page.tsx": "LoadingLoginSkeleton",
};

for (const [rel, token] of Object.entries(pages)) {
  const text = read(rel);
  assert.match(text, new RegExp(token), `pagina senza skeleton dedicato: ${rel}`);
}

console.log("loading-page-skeleton-coverage.test: OK");
