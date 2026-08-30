import fs from "node:fs";
import path from "node:path";
import { auditCompatBatch } from "@/lib/magazzino/compat/compat-consistency-auditor";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  scanCompatSsotCode,
  type CompatScanSeverity,
  type CompatSsotScanHit,
  type CompatSsotScanResult,
} from "@/lib/magazzino/compat/compat-ssot-scan";

export type CompatReadinessCategory =
  | "ssotConsistency"
  | "dataIntegrity"
  | "renameSafety"
  | "crossPageCoherence"
  | "searchReliability"
  | "cacheCorrectness"
  | "runtimeStability"
  | "legacyElimination";

export type CompatReadinessRisk = {
  severity: CompatScanSeverity;
  files: string[];
  rootCause: string;
  suggestedFix: string;
  productionRisk: string;
};

export type CompatReadinessResult = {
  globalScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  productionReadiness: "YES" | "NO" | "CONDITIONAL";
  categories: Record<CompatReadinessCategory, number>;
  topRisks: CompatReadinessRisk[];
  nonConformPages: string[];
  mustFix: string[];
  shouldFix: string[];
  niceToHave: string[];
  scan: CompatSsotScanResult;
  checkedAt: string;
};

const CATEGORY_WEIGHTS: Record<CompatReadinessCategory, number> = {
  ssotConsistency: 0.2,
  dataIntegrity: 0.15,
  renameSafety: 0.1,
  crossPageCoherence: 0.15,
  searchReliability: 0.1,
  cacheCorrectness: 0.15,
  runtimeStability: 0.1,
  legacyElimination: 0.05,
};

const AUDIT_FIXTURE_LISTE: MezziListePrefs = {
  clienti: [],
  utilizzatori: [],
  cantieri: [],
  marche: [],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
  attrezzature: [
    {
      id: "m-fiat",
      nome: "FIAT",
      modelli: [{ id: "mod-500", nome: "500" }],
    },
  ],
  telai: [],
};

const AUDIT_FIXTURE_SAMPLES = [
  {
    id: "fixture-ok",
    compatibilitaRefs: [{ tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" }],
    compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "500")],
  },
  {
    id: "fixture-mismatch",
    compatibilitaRefs: [{ tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" }],
    compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "Panda")],
  },
];

function hitsByRule(scan: CompatSsotScanResult, ruleId: string): CompatSsotScanHit[] {
  return scan.hits.filter((h) => h.ruleId === ruleId);
}

function fileExists(repoRoot: string, rel: string): boolean {
  return fs.existsSync(path.join(repoRoot, rel));
}

function fileContains(repoRoot: string, rel: string, needle: string): boolean {
  if (!fileExists(repoRoot, rel)) return false;
  return fs.readFileSync(path.join(repoRoot, rel), "utf8").includes(needle);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildTopRisks(scan: CompatSsotScanResult): CompatReadinessRisk[] {
  const byRule = new Map<string, CompatSsotScanHit[]>();
  for (const hit of scan.hits) {
    const list = byRule.get(hit.ruleId) ?? [];
    list.push(hit);
    byRule.set(hit.ruleId, list);
  }

  const risks: CompatReadinessRisk[] = [];
  for (const [ruleId, group] of byRule) {
    const maxSeverity = group.reduce<CompatScanSeverity>((acc, h) => {
      const order = { low: 0, medium: 1, high: 2, critical: 3 };
      return order[h.severity] > order[acc] ? h.severity : acc;
    }, "low");

    const meta: Record<string, Omit<CompatReadinessRisk, "severity" | "files">> = {
      "direct-magazzino-row-adapter": {
        rootCause: "Adapter DB→UI chiamato senza sanitize batch.",
        suggestedFix: "Usare ricambioUiFromMagazzinoRow o mapMagazzinoRowsToUI.",
        productionRisk: "Drift refs/legacy in cache UI dopo mutate.",
      },
      "direct-resolve-compat": {
        rootCause: "Resolver SSOT bypassato in componente/servizio.",
        suggestedFix: "Sostituire con readCompatLabelsForUi / readCompatDisplayForUi.",
        productionRisk: "Display/search incoerente tra pagine.",
      },
      "legacy-compat-read": {
        rootCause: "Lettura diretta meta.compatibilitaMezzi.",
        suggestedFix: "Usare readCompat*ForUi() o normalizedSearchIndex().",
        productionRisk: "Label stale dopo rename marca/modello.",
      },
      "map-ui-without-liste": {
        rootCause: "mapMagazzinoRowsToUI senza mezziListe.",
        suggestedFix: "Passare settings mezziListe da useCabAppSettingsPayloadQuery.",
        productionRisk: "Compat orphan non risolti in path secondari.",
      },
    };

    const m = meta[ruleId] ?? {
      rootCause: "Violazione regola SSOT compat.",
      suggestedFix: "Allineare al layer compat in lib/magazzino/compat/.",
      productionRisk: "Possibile drift cross-page.",
    };

    risks.push({
      severity: maxSeverity,
      files: [...new Set(group.map((g) => g.file))],
      ...m,
    });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return risks.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 10);
}

function nonConformPagesFromScan(scan: CompatSsotScanResult): string[] {
  const pages = new Set<string>();
  for (const hit of scan.hits) {
    if (hit.file.startsWith("components/gestionale/magazzino/")) {
      pages.add("Magazzino");
    } else if (hit.file.includes("view-aggregation") || hit.file.includes("dashboard")) {
      pages.add("Dashboard KPI");
    } else if (hit.file.includes("report/")) {
      pages.add("Report");
    } else if (hit.file.includes("scorta-adjust")) {
      pages.add("Magazzino (scorta sync)");
    }
  }
  return [...pages];
}

/** Report readiness compat SSOT (static scan + fixture audit + wiring checks). */
export function buildCompatReadinessReport(repoRoot = process.cwd()): CompatReadinessResult {
  const scan = scanCompatSsotCode(repoRoot);
  const criticalCount = scan.hits.filter((h) => h.severity === "critical").length;
  const highCount = scan.hits.filter((h) => h.severity === "high").length;

  const batchAudit = auditCompatBatch(AUDIT_FIXTURE_SAMPLES, AUDIT_FIXTURE_LISTE);
  const auditorHighIssues = batchAudit.filter((r) => r.status === "warn").length;

  const writeGateWired = fileContains(repoRoot, "lib/magazzino/magazzino-meta.ts", "writeCompatibilitaRicambio");
  const renameGuardPresent = fileExists(repoRoot, "lib/magazzino/compat/compat-rename-guard.ts");
  const searchWired = fileContains(
    repoRoot,
    "lib/magazzino/magazzino-list-ui-filters.ts",
    "normalizedSearchIndex",
  );
  const cacheSanitizeWired = fileContains(
    repoRoot,
    "lib/magazzino/magazzino-list-cache.ts",
    "sanitizeCompatRicambioUiBatch",
  );
  const hookAuditWired =
    fileContains(repoRoot, "src/hooks/gestionale/use-entity-list-queries.ts", "scheduleCompatBackgroundAudit") &&
    fileContains(repoRoot, "lib/report/use-report-live-data.ts", "scheduleCompatBackgroundAudit");
  const singleRowHelper = fileContains(repoRoot, "lib/magazzino/magazzino-list-cache.ts", "ricambioUiFromMagazzinoRow");

  let ssotConsistency = 100;
  ssotConsistency -= criticalCount * 25 + highCount * 15;
  ssotConsistency -= hitsByRule(scan, "direct-resolve-compat").length * 8;
  ssotConsistency -= hitsByRule(scan, "legacy-compat-read").length * 5;

  let dataIntegrity = 100;
  if (!writeGateWired) dataIntegrity -= 30;
  if (auditorHighIssues > 0) dataIntegrity -= 10;

  let renameSafety = renameGuardPresent ? 95 : 70;
  if (!fileContains(repoRoot, "src/services/settings-rename-propagation.service.ts", "auditCompatConsistency")) {
    renameSafety -= 5;
  }

  let crossPageCoherence = 100;
  crossPageCoherence -= hitsByRule(scan, "direct-magazzino-row-adapter").length * 20;
  crossPageCoherence -= hitsByRule(scan, "direct-resolve-compat").length * 10;

  const searchReliability = searchWired ? 95 : 60;

  let cacheCorrectness = cacheSanitizeWired && singleRowHelper ? 95 : 75;
  cacheCorrectness -= hitsByRule(scan, "map-ui-without-liste").length * 8;
  cacheCorrectness -= hitsByRule(scan, "direct-magazzino-row-adapter").length * 10;

  let runtimeStability = hookAuditWired ? 92 : 75;
  if (!fileExists(repoRoot, "lib/magazzino/compat/compat-runtime-sanitize.ts")) runtimeStability -= 15;

  let legacyElimination = 90;
  legacyElimination -= hitsByRule(scan, "legacy-compat-read").length * 4;

  const categories: Record<CompatReadinessCategory, number> = {
    ssotConsistency: clampScore(ssotConsistency),
    dataIntegrity: clampScore(dataIntegrity),
    renameSafety: clampScore(renameSafety),
    crossPageCoherence: clampScore(crossPageCoherence),
    searchReliability: clampScore(searchReliability),
    cacheCorrectness: clampScore(cacheCorrectness),
    runtimeStability: clampScore(runtimeStability),
    legacyElimination: clampScore(legacyElimination),
  };

  let globalScore = 0;
  for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS) as [CompatReadinessCategory, number][]) {
    globalScore += categories[cat] * weight;
  }
  globalScore = clampScore(globalScore);

  const topRisks = buildTopRisks(scan);
  const nonConformPages = nonConformPagesFromScan(scan);

  const mustFix: string[] = [];
  const shouldFix: string[] = [];
  const niceToHave: string[] = [];

  if (hitsByRule(scan, "direct-magazzino-row-adapter").length > 0) {
    mustFix.push("Eliminare magazzinoRowToRicambioUI fuori adapter/cache.");
  }
  if (hitsByRule(scan, "map-ui-without-liste").length > 0) {
    mustFix.push("Passare mezziListe a tutti i mapMagazzinoRowsToUI.");
  }
  if (hitsByRule(scan, "direct-resolve-compat").length > 0) {
    mustFix.push("Sostituire resolveCompatibilitaRicambio diretto con readCompat*ForUi.");
  }
  if (!writeGateWired) mustFix.push("Write gate non cablato in magazzino-meta.");
  if (!cacheSanitizeWired || !singleRowHelper) mustFix.push("Cache SSOT incompleta (sanitize / ricambioUiFromMagazzinoRow).");

  if (hitsByRule(scan, "legacy-compat-read").length > 0) {
    shouldFix.push("Ridurre accessi diretti a compatibilitaMezzi fuori allowlist.");
  }
  if (!fileContains(repoRoot, "lib/magazzino/compat/compat-export-label.ts", "exportCompatLabel")) {
    shouldFix.push("exportCompatLabel pronto ma non ancora usato negli export.");
  }

  niceToHave.push("Abilitare COMPAT_AUTO_REPAIR=1 solo in staging.");
  niceToHave.push("Aggiungere step advisory compat-ssot-audit in release-gate locale.");

  let riskLevel: CompatReadinessResult["riskLevel"] = "LOW";
  if (criticalCount > 0 || highCount > 2 || globalScore < 85) riskLevel = "HIGH";
  else if (highCount > 0 || globalScore < 92) riskLevel = "MEDIUM";

  let productionReadiness: CompatReadinessResult["productionReadiness"] = "YES";
  if (criticalCount > 0 || globalScore < 85) productionReadiness = "NO";
  else if (highCount > 0 || globalScore < 92 || mustFix.length > 0) productionReadiness = "CONDITIONAL";

  if (mustFix.length === 0 && globalScore >= 92 && criticalCount === 0 && highCount === 0) {
    productionReadiness = "YES";
  }

  return {
    globalScore,
    riskLevel,
    productionReadiness,
    categories,
    topRisks,
    nonConformPages,
    mustFix,
    shouldFix,
    niceToHave,
    scan,
    checkedAt: new Date().toISOString(),
  };
}

export const COMPAT_READINESS_SCORE_THRESHOLD = 90;
