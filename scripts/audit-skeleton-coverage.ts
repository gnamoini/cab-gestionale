/**
 * Audit copertura skeleton strutturale — non genera skeleton, solo mappa gap.
 */
import fs from "node:fs";
import path from "node:path";
import { MIGRATED_STRUCTURAL_ROUTES } from "@/lib/ui/migrated-structural-routes";
import {
  STRUCTURAL_ROUTE_PAGE_STRUCTURE,
} from "@/lib/ui/structural-route-skeleton-contracts";

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

function main(): void {
  const failures: string[] = [];

  for (const route of MIGRATED_STRUCTURAL_ROUTES) {
    const loadingRel = ROUTE_LOADING[route];
    const structureToken = STRUCTURAL_ROUTE_PAGE_STRUCTURE[route];
    if (!loadingRel || !structureToken) {
      failures.push(`${route}: mapping audit mancante`);
      continue;
    }

    const loadingSrc = read(loadingRel);
    const lines = [`${route.toUpperCase()}`];

    const hasPageLayout = route === "login" || /PageLayout/.test(loadingSrc);
    const hasStructure = loadingSrc.includes(structureToken) && /mode="skeleton"/.test(loadingSrc);
    const noLegacyFallback = !/LoadingSuspenseFallback/.test(loadingSrc);
    const noHeaderPulse = !/LoadingListPageShell/.test(loadingSrc);

    lines.push(`  PageLayout:           ${hasPageLayout ? "✓" : "✗"}`);
    lines.push(`  PageStructure:        ${hasStructure ? "✓" : "✗"} (${structureToken})`);
    lines.push(`  no legacy fallback:   ${noLegacyFallback ? "✓" : "✗"}`);
    lines.push(`  no header pulse:      ${noHeaderPulse ? "✓" : "✗"}`);

    console.log(lines.join("\n"));
    console.log("");

    if (!hasPageLayout || !hasStructure || !noLegacyFallback) {
      failures.push(route);
    }
  }

  if (failures.length > 0) {
    console.error(`audit:skeleton FAILED — route con gap: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log("audit:skeleton: OK");
}

main();
