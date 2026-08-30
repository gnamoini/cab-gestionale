/**
 * Route skeleton parity — ogni *PageStructure delega a route-skeletons dedicati (no PageSection generico).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MIGRATED_STRUCTURAL_ROUTES } from "@/lib/ui/migrated-structural-routes";
import { STRUCTURAL_ROUTE_PAGE_STRUCTURE } from "@/lib/ui/structural-route-skeleton-contracts";

const ROOT = process.cwd();

const PAGE_STRUCTURE_FILES: Record<string, string> = {
  DashboardPageStructure: "components/dashboard/dashboard-page-structure.tsx",
  MagazzinoPageStructure: "components/gestionale/magazzino/magazzino-page-structure.tsx",
  MezziPageStructure: "components/gestionale/mezzi/mezzi-page-structure.tsx",
  DocumentiPageStructure: "components/gestionale/documenti/documenti-page-structure.tsx",
  PreventiviPageStructure: "components/preventivi/preventivi-page-structure.tsx",
  OrdiniFornitoriPageStructure: "components/ordini-fornitori/ordini-fornitori-page-structure.tsx",
  LavorazioniPageStructure: "components/gestionale/lavorazioni/lavorazioni-page-structure.tsx",
  ReportPageStructure: "components/report/report-page-structure.tsx",
  AgendaPageStructure: "components/workshop-schedule/agenda-page-structure.tsx",
  DipendentiPageStructure: "components/gestionale/dipendenti/dipendenti-page-structure.tsx",
  FatturazionePageStructure: "components/fatturazione/fatturazione-page-structure.tsx",
  ImpostazioniPageStructure: "components/dashboard/impostazioni-page-structure.tsx",
  SicurezzaPageStructure: "components/dashboard/sicurezza-page-structure.tsx",
  ProductionReadinessPageStructure: "components/dashboard/security/production-readiness-page-structure.tsx",
  ClientiPageStructure: "components/lavorazioni-clienti/client-lavorazioni-page-structure.tsx",
  ClientDetailPageStructure: "components/lavorazioni-clienti/client-lavorazione-detail-page-structure.tsx",
  LoginPageStructure: "components/auth/login-page-structure.tsx",
};

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const routeSkeletons = read("components/design-system/loading/route-skeletons.tsx");
const structuralRouteSkeleton = read("components/design-system/loading/structural-route-skeleton.tsx");
const reportSkeleton = read("components/report/report-v2-route-skeleton.tsx");

assert.match(routeSkeletons, /ListPageRouteSkeleton/, "route-skeletons: liste ERP");
assert.match(routeSkeletons, /DipendentiRouteSkeleton/, "route-skeletons: dipendenti timesheet");
assert.match(routeSkeletons, /ImpostazioniRouteSkeleton/, "route-skeletons: impostazioni master-detail");
assert.match(reportSkeleton, /report-area-content-skeleton/, "report area narrative skeleton");
assert.match(reportSkeleton, /report-hub-route-skeleton/, "report hub skeleton");
assert.match(structuralRouteSkeleton, /ROUTE_PAGE_STRUCTURE/, "StructuralRouteSkeleton delega a PageStructure");

for (const route of MIGRATED_STRUCTURAL_ROUTES) {
  const token = STRUCTURAL_ROUTE_PAGE_STRUCTURE[route];
  const file = PAGE_STRUCTURE_FILES[token];
  assert.ok(file, `mapping file mancante: ${route} -> ${token}`);
  const src = read(file);

  if (route === "login") {
    assert.match(src, /LoginPageStructure|login-page-structure/, `${route}: login structure`);
    continue;
  }

  if (route === "report") {
    assert.match(src, /ReportV2RouteSkeleton/, `${file}: report V2 skeleton`);
    assert.doesNotMatch(src, /<PageSection/, `${file}: no PageSection generico`);
    continue;
  }

  assert.match(
    src,
    /route-skeletons|RouteSkeleton/,
    `${file}: deve delegare a route skeleton dedicato`,
  );
  assert.doesNotMatch(
    src,
    /STRUCTURAL_ROUTE_SKELETON_CONTRACTS/,
    `${file}: no contratto generico inline (usa route-skeletons)`,
  );
  assert.match(src, /scope/, `${file}: supporto scope full/content`);
}

assert.match(read("components/report/report-area-data-shell.tsx"), /scope="content"/, "report data load: content scope");

console.log("route-skeleton-parity-policy.test.ts: OK");
