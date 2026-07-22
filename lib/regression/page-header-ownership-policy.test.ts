/**
 * LEVEL 2: view lazy non devono ripetere PageHeader/PageLayout con titolo route
 * quando page.tsx espone già PageLayout.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES } from "./loading-transition-fallback-allowlist";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

const ROOT = process.cwd();

/** View collegate a route con PageLayout in page.tsx — no PageHeader title duplicato. */
const ROUTE_VIEW_OWNERSHIP: Record<string, string> = {
  "app/(gestionale)/dashboard/page.tsx": "components/dashboard/dashboard-view.tsx",
  "app/(gestionale)/magazzino/page.tsx": "components/gestionale/magazzino/magazzino-view.tsx",
  "app/(gestionale)/magazzino/carichi/page.tsx": "components/gestionale/magazzino/carichi/receiving-list-view.tsx",
  "app/(gestionale)/mezzi/page.tsx": "components/gestionale/mezzi/mezzi-view.tsx",
  "app/(gestionale)/documenti/page.tsx": "components/gestionale/documenti/documenti-view.tsx",
  "app/(gestionale)/preventivi/page.tsx": "components/preventivi/preventivi-view.tsx",
  "app/(gestionale)/dipendenti/page.tsx": "components/gestionale/dipendenti/dipendenti-view.tsx",
  "app/(gestionale)/fatturazione/page.tsx": "components/fatturazione/fatturazione-view.tsx",
  "app/(gestionale)/agenda/page.tsx": "components/workshop-schedule/agenda-officina-view.tsx",
  "app/(gestionale)/lavorazioni/page.tsx": "components/gestionale/lavorazioni/lavorazioni-page-toolbar.tsx",
  "app/(gestionale)/lavorazioni-clienti/page.tsx": "components/lavorazioni-clienti/client-lavorazioni-view.tsx",
  "app/(gestionale)/report/page.tsx": "components/report/layout/report-toolbar.tsx",
  "app/(gestionale)/sicurezza/page.tsx": "components/dashboard/security-dashboard-view.tsx",
  "app/(gestionale)/sicurezza/production-readiness/page.tsx":
    "components/dashboard/security/production-readiness-view.tsx",
  "app/(gestionale)/impostazioni/page.tsx": "components/dashboard/settings/settings-workspace-shell.tsx",
};

const PAGE_TITLE_VARIANT: Record<string, keyof typeof STRUCTURAL_ROUTE_PAGE_TITLES> = {
  "app/(gestionale)/dashboard/page.tsx": "dashboard",
  "app/(gestionale)/magazzino/page.tsx": "magazzino",
  "app/(gestionale)/magazzino/carichi/page.tsx": "magazzino",
  "app/(gestionale)/mezzi/page.tsx": "mezzi",
  "app/(gestionale)/documenti/page.tsx": "documenti",
  "app/(gestionale)/preventivi/page.tsx": "preventivi",
  "app/(gestionale)/dipendenti/page.tsx": "dipendenti",
  "app/(gestionale)/fatturazione/page.tsx": "fatturazione",
  "app/(gestionale)/agenda/page.tsx": "agenda",
  "app/(gestionale)/lavorazioni/page.tsx": "lavorazioni",
  "app/(gestionale)/lavorazioni-clienti/page.tsx": "clienti",
  "app/(gestionale)/report/page.tsx": "report",
  "app/(gestionale)/sicurezza/page.tsx": "sicurezza",
  "app/(gestionale)/sicurezza/production-readiness/page.tsx": "production-readiness",
  "app/(gestionale)/impostazioni/page.tsx": "impostazioni",
};

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const violations: string[] = [];

for (const pageRel of PAGE_LAYOUT_OUTSIDE_SUSPENSE_ROUTES) {
  const viewRel = ROUTE_VIEW_OWNERSHIP[pageRel];
  if (!viewRel || !fs.existsSync(path.join(ROOT, viewRel))) continue;

  const variant = PAGE_TITLE_VARIANT[pageRel];
  const title = variant ? STRUCTURAL_ROUTE_PAGE_TITLES[variant] : null;
  if (!title) continue;

  const viewSrc = read(viewRel);
  const titlePattern = new RegExp(
    `<PageHeader[\\s\\S]*?title=["']${escapeRegExp(title)}["']`,
    "m",
  );
  if (titlePattern.test(viewSrc)) {
    violations.push(`${viewRel}: PageHeader title="${title}" duplica PageLayout in ${pageRel}`);
  }

  const pageLayoutPattern = new RegExp(
    `<PageLayout[\\s\\S]*?title=["']${escapeRegExp(title)}["']`,
    "m",
  );
  if (pageLayoutPattern.test(viewSrc)) {
    violations.push(`${viewRel}: PageLayout title="${title}" duplica shell in ${pageRel}`);
  }
}

assert.equal(
  violations.length,
  0,
  `page-header-ownership violations:\n${violations.join("\n")}`,
);

console.log("page-header-ownership-policy.test.ts: OK");
