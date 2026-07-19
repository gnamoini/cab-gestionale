/**
 * Smoke: copertura skeleton — tutte le route strutturali v3.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MIGRATED_STRUCTURAL_ROUTES } from "@/lib/ui/migrated-structural-routes";
import { STRUCTURAL_ROUTE_PAGE_STRUCTURE } from "@/lib/ui/structural-route-skeleton-contracts";

const ROOT = process.cwd();

const ROUTE_LOADING: Record<string, string> = {
  magazzino: "app/(gestionale)/magazzino/loading.tsx",
  mezzi: "app/(gestionale)/mezzi/loading.tsx",
  documenti: "app/(gestionale)/documenti/loading.tsx",
  preventivi: "app/(gestionale)/preventivi/loading.tsx",
  dashboard: "app/(gestionale)/dashboard/loading.tsx",
  lavorazioni: "app/(gestionale)/lavorazioni/loading.tsx",
  report: "app/(gestionale)/report/loading.tsx",
  agenda: "app/(gestionale)/agenda/loading.tsx",
  dipendenti: "app/(gestionale)/dipendenti/loading.tsx",
  fatturazione: "app/(gestionale)/fatturazione/loading.tsx",
  impostazioni: "app/(gestionale)/impostazioni/loading.tsx",
  sicurezza: "app/(gestionale)/sicurezza/loading.tsx",
  "production-readiness": "app/(gestionale)/sicurezza/production-readiness/loading.tsx",
  clienti: "app/(gestionale)/lavorazioni-clienti/loading.tsx",
  "client-detail": "app/(gestionale)/lavorazioni-clienti/[id]/loading.tsx",
  login: "app/login/loading.tsx",
};

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const pageSkeleton = read("components/design-system/loading/loading-page-skeleton.tsx");
const suspense = read("components/design-system/loading/loading-suspense-fallback.tsx");

assert.match(pageSkeleton, /StructuralRouteSkeleton/, "route strutturali devono delegare a StructuralRouteSkeleton");

for (const route of MIGRATED_STRUCTURAL_ROUTES) {
  assert.match(pageSkeleton, new RegExp(`"${route}"`), `variante skeleton mancante: ${route}`);
  const loadingRel = ROUTE_LOADING[route];
  assert.ok(loadingRel, `loading.tsx mancante per ${route}`);
  const loading = read(loadingRel);
  const structureToken = STRUCTURAL_ROUTE_PAGE_STRUCTURE[route];
  assert.match(loading, new RegExp(structureToken), `${route}/loading.tsx deve usare ${structureToken}`);
  assert.match(loading, /mode="skeleton"/, `${route}/loading.tsx deve usare mode="skeleton"`);
}

const NON_STRUCTURAL_VARIANTS = ["default", "compact", "kanban"] as const;

for (const variant of NON_STRUCTURAL_VARIANTS) {
  assert.match(pageSkeleton, new RegExp(`"${variant}"`), `variante fallback mancante: ${variant}`);
}

for (const variant of MIGRATED_STRUCTURAL_ROUTES) {
  const heightKey = variant.includes("-") ? `"${variant}"` : variant;
  assert.match(suspense, new RegExp(`${heightKey.replace(/-/g, "\\-")}:`), `altezza suspense mancante: ${variant}`);
}

assert.match(read("app/login/reset-password/loading.tsx"), /LoginPageStructure/, "reset-password loading strutturale");

console.log("loading-page-skeleton-coverage.test: OK");
