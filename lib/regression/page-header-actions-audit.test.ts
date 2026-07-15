/**
 * Header actions audit — PageActionMenu SSOT.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const TARGETS = [
  "components/gestionale/mezzi/mezzi-view.tsx",
  "components/gestionale/magazzino/magazzino-view.tsx",
  "components/gestionale/documenti/documenti-view.tsx",
  "components/preventivi/preventivi-view.tsx",
  "components/ordini-fornitori/ordini-fornitori-view.tsx",
  "components/fatturazione/fatturazione-view.tsx",
  "components/fatturazione/fatturazione-fatture-section.tsx",
  "components/lavorazioni-clienti/client-lavorazioni-view.tsx",
  "components/gestionale/dipendenti/dipendenti-view.tsx",
  "components/dashboard/settings/settings-workspace-shell.tsx",
  "components/report/layout/report-toolbar.tsx",
  "components/lavorazioni-clienti/client-lavorazione-detail-view.tsx",
  "components/dashboard/security/production-readiness-view.tsx",
  "components/dashboard/dashboard-view.tsx",
  "components/gestionale/lavorazioni/lavorazioni-page-toolbar.tsx",
];

const offenders: string[] = [];

for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, "utf8");
  if (src.includes("GestionalePageToolbarActions")) {
    offenders.push(`${rel}: GestionalePageToolbarActions`);
  }
  if (src.includes("primaryAction=") && src.includes("PageToolbar")) {
    offenders.push(`${rel}: PageToolbar primaryAction`);
  }
}

assert.equal(
  offenders.length,
  0,
  `Page header/toolbar legacy actions:\n${offenders.join("\n")}`,
);

console.log("page-header-actions-audit.test.ts OK");
