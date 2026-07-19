/**
 * Parità loading.tsx ↔ *PageStructure della view.
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

for (const route of MIGRATED_STRUCTURAL_ROUTES) {
  const token = STRUCTURAL_ROUTE_PAGE_STRUCTURE[route];
  const loadingRel = ROUTE_LOADING[route];
  assert.ok(token, `mapping mancante: ${route}`);
  assert.ok(loadingRel, `loading path mancante: ${route}`);
  const loading = read(loadingRel);
  assert.match(loading, new RegExp(token), `${route}/loading.tsx deve importare ${token}`);
  assert.match(loading, /mode="skeleton"/, `${route}/loading.tsx deve usare mode="skeleton"`);
}

const pageSection = read("components/design-system/layout/page-section.tsx");
assert.match(pageSection, /StructuralSkeletonRenderer/, "PageSection delega al renderer SSOT");
assert.match(pageSection, /skeleton:/, "PageSection richiede Skeleton Contract");
assert.match(
  pageSection,
  /skeleton\.kind === "stack"/,
  "PageSection stack: niente min-height esterno in content (parity skeleton renderer)",
);

console.log("skeleton-parity.test: OK");
