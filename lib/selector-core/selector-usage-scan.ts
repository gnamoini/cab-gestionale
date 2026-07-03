/**
 * Usage scan import-graph + classificazione criticità per migration guardrail.
 * Eseguibile via test o script CI — non richiede runtime browser.
 */
import fs from "node:fs";
import path from "node:path";

export type UsageCriticality = "critical" | "medium" | "low";

export type SelectorUsageTarget = {
  id: string;
  domain: string;
  file: string;
  pattern: string;
  criticality: UsageCriticality;
  importCount: number;
  importers: string[];
};

const ROOT = process.cwd();

const LEGACY_COMPONENTS = [
  {
    id: "GestionaleMezzoAutocomplete",
    pattern: /GestionaleMezzoAutocomplete/,
    domain: "mezzi",
    criticality: "medium" as const,
  },
  {
    id: "SchedaIngressoIdentAutocompleteField",
    pattern: /SchedaIngressoIdentAutocompleteField/,
    domain: "schede",
    criticality: "critical" as const,
  },
  {
    id: "RicambiMagSearchPortal",
    pattern: /RicambiMagSearchPortal/,
    domain: "magazzino",
    criticality: "medium" as const,
  },
] as const;

const OPERATIONAL_SELECT_ONLY_SITES = [
  {
    id: "timesheet-filter-dipendente",
    file: "components/gestionale/dipendenti/timesheet-header.tsx",
    pattern: /selectOnly[\s\S]{0,80}Seleziona dipendente/,
    domain: "dipendenti",
    criticality: "medium" as const,
  },
  {
    id: "security-cliente-selectOnly",
    file: "components/dashboard/security-create-user-modal.tsx",
    pattern: /GlobalSettingsListSelect[\s\S]{0,80}selectOnly[\s\S]{0,80}mezzi:clienti/,
    domain: "security",
    criticality: "critical" as const,
  },
  {
    id: "security-audit-user-selectOnly",
    file: "components/dashboard/security-dashboard-view.tsx",
    pattern: /selectOnly[\s\S]{0,80}Filtra per utente/,
    domain: "security",
    criticality: "medium" as const,
  },
] as const;

const ADDETTI_PILL_SITES = [
  "components/gestionale/lavorazioni/lavorazioni-view.tsx",
  "components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx",
  "components/gestionale/lavorazioni/lavorazioni-modals.tsx",
] as const;

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkTsFiles(full, acc);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function rel(p: string): string {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function countImportsOf(pattern: RegExp, searchDirs: string[]): { count: number; importers: string[] } {
  const importers: string[] = [];
  for (const dir of searchDirs) {
    for (const file of walkTsFiles(path.join(ROOT, dir))) {
      const src = fs.readFileSync(file, "utf8");
      if (pattern.test(src) && !file.includes("legacy-selector-adapters")) {
        importers.push(rel(file));
      }
    }
  }
  return { count: importers.length, importers };
}

export function scanLegacyAutocompleteUsage(): SelectorUsageTarget[] {
  const dirs = ["components", "app"];
  return LEGACY_COMPONENTS.map((leg) => {
    const { count, importers } = countImportsOf(leg.pattern, dirs);
    return {
      id: leg.id,
      domain: leg.domain,
      file: importers[0] ?? "(no importers)",
      pattern: leg.pattern.source,
      criticality: leg.criticality,
      importCount: count,
      importers,
    };
  });
}

export function scanOperationalSelectOnlySites(): SelectorUsageTarget[] {
  return OPERATIONAL_SELECT_ONLY_SITES.map((site) => {
    const full = path.join(ROOT, site.file);
    const exists = fs.existsSync(full);
    const src = exists ? fs.readFileSync(full, "utf8") : "";
    const matched = exists && site.pattern.test(src);
    return {
      id: site.id,
      domain: site.domain,
      file: site.file,
      pattern: site.pattern.source,
      criticality: site.criticality,
      importCount: matched ? 1 : 0,
      importers: matched ? [site.file] : [],
    };
  });
}

export function scanAddettiPillUsage(): SelectorUsageTarget[] {
  const targets: SelectorUsageTarget[] = [];
  for (const file of ADDETTI_PILL_SITES) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, "utf8");
    const legacyPillAddetti =
      /GlobalFixedListPillSelect[\s\S]{0,400}addett/i.test(src) ||
      (/InlineSelectField[\s\S]{0,400}tablePillOptions\.addetto/.test(src));
    if (!legacyPillAddetti) continue;
    targets.push({
      id: `addetti-pill-${path.basename(file, path.extname(file))}`,
      domain: "addetti",
      file,
      pattern: "tablePillOptions.addetto|GlobalFixedListPillSelect+addetto",
      criticality: file.includes("lavorazioni-view") ? "critical" : "medium",
      importCount: 1,
      importers: [file],
    });
  }
  return targets;
}

export type SelectorUsageScanReport = {
  scannedAt: string;
  legacy: SelectorUsageTarget[];
  operationalSelectOnly: SelectorUsageTarget[];
  addettiPill: SelectorUsageTarget[];
  summary: {
    critical: number;
    medium: number;
    low: number;
  };
};

export function runSelectorUsageScan(): SelectorUsageScanReport {
  const legacy = scanLegacyAutocompleteUsage();
  const operationalSelectOnly = scanOperationalSelectOnlySites();
  const addettiPill = scanAddettiPillUsage();
  const all = [...legacy, ...operationalSelectOnly, ...addettiPill];
  return {
    scannedAt: new Date().toISOString(),
    legacy,
    operationalSelectOnly,
    addettiPill,
    summary: {
      critical: all.filter((t) => t.criticality === "critical" && t.importCount > 0).length,
      medium: all.filter((t) => t.criticality === "medium" && t.importCount > 0).length,
      low: all.filter((t) => t.criticality === "low" && t.importCount > 0).length,
    },
  };
}

/** Migration guardrail: max componenti per PR selector. */
export const SELECTOR_MIGRATION_MAX_COMPONENTS_PER_PR = 5;

export function assertMigrationGuardrail(changedComponentIds: string[]): void {
  if (changedComponentIds.length > SELECTOR_MIGRATION_MAX_COMPONENTS_PER_PR) {
    throw new Error(
      `migration_guardrail: troppi componenti in un PR (${changedComponentIds.length} > ${SELECTOR_MIGRATION_MAX_COMPONENTS_PER_PR}): ${changedComponentIds.join(", ")}`,
    );
  }
}
