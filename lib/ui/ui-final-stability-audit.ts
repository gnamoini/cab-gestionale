/**
 * UI Final Stability Audit — governance layer over route reliability audit.
 * Read-only: classify risks, score routes, never auto-fix grandfathered baseline.
 */

import fs from "node:fs";
import path from "node:path";
import type { FlexBaselineEntry, FlexBaselineFile } from "@/lib/lint/flex-baseline-fingerprint";
import { isFlexViolationBaselined } from "@/lib/lint/flex-baseline-fingerprint";
import { scanFlexViolations } from "@/lib/lint/scan-flex-violations";
import { FLEX_BASELINE_PATH, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE } from "@/lib/ui/flex-system-freeze";
import { validateFlexSystemPolicy } from "@/lib/ui/flex-system-policy";
import {
  UI_ROUTE_AUDIT_KEYS,
  UI_ROUTE_AUDIT_TARGETS,
  auditRouteReliability,
  countGlobalNewFlexViolations,
  type OverflowRiskLevel,
  type RouteAuditKey,
  type RouteReliabilityReport,
  type UiOsCompatibility,
} from "@/lib/ui/ui-route-reliability-audit";
import { UI_OS_OPT_IN_PAGES } from "@/lib/ui-os/ui-os-engine";
import { getSuggestedSchema, SUGGESTED_PAGE_SCHEMAS } from "@/lib/ui-os/ui-schema";

if (!FLEX_SYSTEM_ABSOLUTE_FINAL_STATE) {
  throw new Error("ui-final-stability-audit requires FLEX_SYSTEM_ABSOLUTE_FINAL_STATE === true");
}

export const UI_FINAL_STABILITY_AUDIT_PREFIX = "[ui-final-stability-audit]";

export type GrandfatheredRiskId =
  | "page-header"
  | "mezzi-filters"
  | "login-form"
  | "sistema-impostazioni-modal";

export type GrandfatheredRiskRef = {
  id: GrandfatheredRiskId;
  file: string;
  routes: readonly string[];
  baselineEntryCount: number;
};

export type UiFinalRouteStatus = "OK" | "WARNING" | "DEGRADED" | "AT_RISK";

export type UiFinalSystemRecommendation =
  | "STABLE"
  | "STABLE WITH WARNINGS"
  | "NEEDS CONSOLIDATION"
  | "AT RISK";

export type UiFinalRouteScores = {
  flexSafety: number;
  overflowSafety: number;
  uiOsCompatibility: number;
  layoutStability: number;
  overall: number;
};

export type UiFinalOverflowRiskItem = {
  kind: string;
  severity: "runtime" | "theoretical";
  detail: string;
};

export type UiFinalIssueBreakdown = {
  newFlexRisks: FlexBaselineEntry[];
  baselineRisks: GrandfatheredRiskRef[];
  overflowRisks: UiFinalOverflowRiskItem[];
  uiOsMismatch: string[];
  toolbarInconsistency: number;
  layoutAnomalies: { table: number; modal: number; flex1: number };
};

export type UiFinalRouteReport = {
  route: RouteAuditKey;
  scores: UiFinalRouteScores;
  status: UiFinalRouteStatus;
  overflowRisk: OverflowRiskLevel;
  uiOsMode: UiOsCompatibility;
  issues: UiFinalIssueBreakdown;
  source: RouteReliabilityReport;
};

export type UiFinalGlobalHealth = {
  globalFlexStability: number;
  globalUiOsHealth: number;
  globalOverflowRiskScore: number;
  systemLayoutDriftScore: number;
  recommendation: UiFinalSystemRecommendation;
  globalBaselineRisks: GrandfatheredRiskRef[];
  routeCount: number;
  statusCounts: Record<UiFinalRouteStatus, number>;
};

export const GRANDFATHERED_FLEX_RISK_SOURCES: readonly {
  id: GrandfatheredRiskId;
  file: string;
  routes: readonly string[];
}[] = [
  {
    id: "page-header",
    file: "components/gestionale/page-header.tsx",
    routes: [
      "/report",
      "/magazzino",
      "/lavorazioni",
      "/dipendenti",
      "/dashboard",
      "/kanban",
      "/mezzi",
    ],
  },
  {
    id: "mezzi-filters",
    file: "components/gestionale/mezzi/mezzi-filters.tsx",
    routes: ["/mezzi"],
  },
  {
    id: "login-form",
    file: "app/login/login-form.tsx",
    routes: ["/login"],
  },
  {
    id: "sistema-impostazioni-modal",
    file: "components/dashboard/sistema-impostazioni-modal.tsx",
    routes: ["/dashboard"],
  },
] as const;

const GESTIONALE_AUDIT_ROUTES: readonly RouteAuditKey[] = [
  "/report",
  "/magazzino",
  "/lavorazioni",
  "/dipendenti",
  "/dashboard",
  "/kanban",
];

const OVERALL_WEIGHTS = {
  flexSafety: 0.35,
  overflowSafety: 0.3,
  layoutStability: 0.2,
  uiOsCompatibility: 0.15,
} as const;

function loadBaselineEntries(root: string): FlexBaselineEntry[] {
  const baselinePath = path.join(root, FLEX_BASELINE_PATH);
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as { entries: FlexBaselineEntry[] };
  return baseline.entries;
}

function countBaselineEntriesForFile(file: string, entries: FlexBaselineEntry[]): number {
  const normalized = file.replace(/\\/g, "/");
  return entries.filter((e) => e.file.replace(/\\/g, "/") === normalized).length;
}

export function buildGrandfatheredRiskRefs(root = process.cwd()): GrandfatheredRiskRef[] {
  const entries = loadBaselineEntries(root);
  return GRANDFATHERED_FLEX_RISK_SOURCES.map((source) => ({
    id: source.id,
    file: source.file,
    routes: source.routes,
    baselineEntryCount: countBaselineEntriesForFile(source.file, entries),
  }));
}

export function getBaselineRisksForRoute(
  route: RouteAuditKey,
  refs = buildGrandfatheredRiskRefs(),
): GrandfatheredRiskRef[] {
  return refs.filter((ref) => {
    if (ref.id === "page-header" && GESTIONALE_AUDIT_ROUTES.includes(route)) return true;
    return ref.routes.includes(route);
  });
}

export function getGlobalInformationalBaselineRisks(
  refs = buildGrandfatheredRiskRefs(),
): GrandfatheredRiskRef[] {
  return refs.filter((ref) => ref.routes.some((r) => r === "/mezzi" || r === "/login"));
}

function computeFlexSafetyScore(report: RouteReliabilityReport): number {
  return Math.max(0, 100 - report.flexViolations.new * 25);
}

function computeOverflowSafetyScore(report: RouteReliabilityReport): number {
  let penalty = 0;
  penalty += report.flexViolations.new * 25;
  penalty += report.flex1Risk * 10;
  penalty += report.tableRisk * 5;
  penalty += report.modalRisk * 4;
  penalty += report.toolbarRisk * 2;
  if (report.overflowRisk === "HIGH") penalty += 50;
  if (report.overflowRisk === "MEDIUM") penalty += 15;
  return Math.max(0, 100 - penalty);
}

function computeUiOsCompatibilityScore(report: RouteReliabilityReport): number {
  return report.uiOsCompatibility === "OK" ? 100 : 70;
}

function computeLayoutStabilityScore(report: RouteReliabilityReport): number {
  const penalty =
    report.tableRisk * 8 +
    report.modalRisk * 6 +
    report.toolbarRisk * 3 +
    report.flex1Risk * 12;
  return Math.max(0, 100 - penalty);
}

function computeOverallUiStabilityScore(scores: Omit<UiFinalRouteScores, "overall">): number {
  const weighted =
    scores.flexSafety * OVERALL_WEIGHTS.flexSafety +
    scores.overflowSafety * OVERALL_WEIGHTS.overflowSafety +
    scores.layoutStability * OVERALL_WEIGHTS.layoutStability +
    scores.uiOsCompatibility * OVERALL_WEIGHTS.uiOsCompatibility;
  return Math.round(weighted);
}

function resolveUiFinalRouteStatus(report: RouteReliabilityReport): UiFinalRouteStatus {
  if (report.flexViolations.new > 0 || report.overflowRisk === "HIGH") return "AT_RISK";
  if (report.uiOsCompatibility === "DEGRADED") return "DEGRADED";
  if (
    report.flexViolations.baselined > 0 ||
    report.tableRisk > 0 ||
    report.modalRisk > 0 ||
    report.toolbarRisk > 0 ||
    report.flex1Risk > 0 ||
    report.overflowRisk === "MEDIUM"
  ) {
    return "WARNING";
  }
  return "OK";
}

function readPageContent(route: RouteAuditKey, root: string): string {
  const target = UI_ROUTE_AUDIT_TARGETS[route];
  const pageFile = target.files.find((f) => f.includes("/page.tsx"));
  if (!pageFile) {
    if (target.aliasOf) {
      const parentPage = UI_ROUTE_AUDIT_TARGETS[target.aliasOf].files.find((f) => f.includes("/page.tsx"));
      return parentPage ? fs.readFileSync(path.join(root, parentPage), "utf8") : "";
    }
    return "";
  }
  const full = path.join(root, pageFile);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function buildUiOsMismatchReasons(route: RouteAuditKey, root: string): string[] {
  const target = UI_ROUTE_AUDIT_TARGETS[route];
  const effectiveRoute = target.aliasOf ?? route;
  const uiOsRoute = target.uiOsRoute;
  const pageContent = readPageContent(route, root);
  const reasons: string[] = [];

  if (!/UIPageAdapter/.test(pageContent)) {
    reasons.push("no UIPageAdapter on page entry");
  }
  if (!(uiOsRoute in SUGGESTED_PAGE_SCHEMAS)) {
    reasons.push(`no schema in SUGGESTED_PAGE_SCHEMAS for ${uiOsRoute}`);
  }
  if (!(uiOsRoute in UI_OS_OPT_IN_PAGES)) {
    reasons.push(`not in UI_OS_OPT_IN_PAGES (${uiOsRoute})`);
  }
  const schema = getSuggestedSchema(uiOsRoute);
  const flexPolicy = validateFlexSystemPolicy(schema);
  if (!flexPolicy.safe) {
    reasons.push(`validateFlexSystemPolicy unsafe: ${flexPolicy.errors.join("; ")}`);
  }
  if (target.aliasOf) {
    reasons.push(`audited via alias of ${target.aliasOf} (effective route: ${effectiveRoute})`);
  }

  return reasons;
}

function getNewFlexEntriesForRoute(route: RouteAuditKey, root: string): FlexBaselineEntry[] {
  const baselinePath = path.join(root, FLEX_BASELINE_PATH);
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as FlexBaselineFile;
  const fileSet = new Set(UI_ROUTE_AUDIT_TARGETS[route].files.map((f) => f.replace(/\\/g, "/")));
  return scanFlexViolations(root).filter(
    (e) =>
      fileSet.has(e.file.replace(/\\/g, "/")) &&
      !isFlexViolationBaselined(e, baseline),
  );
}

function buildOverflowRiskItems(
  report: RouteReliabilityReport,
  newFlexRisks: FlexBaselineEntry[],
): UiFinalOverflowRiskItem[] {
  const items: UiFinalOverflowRiskItem[] = [];

  for (const entry of newFlexRisks) {
    items.push({
      kind: "flex-new",
      severity: "runtime",
      detail: `${entry.file}:${entry.line} [${entry.reason}]`,
    });
  }

  if (report.flex1Risk > 0) {
    items.push({
      kind: "flex-1-without-containment",
      severity: "runtime",
      detail: `${report.flex1Risk} occurrence(s) in route files (non-baselined)`,
    });
  }
  if (report.tableRisk > 0) {
    items.push({
      kind: "table-wrapper",
      severity: "runtime",
      detail: `${report.tableRisk} raw table usage without globalTableWrap/GestionaleListTable heuristic`,
    });
  }
  if (report.modalRisk > 0) {
    items.push({
      kind: "modal-containment",
      severity: "runtime",
      detail: `${report.modalRisk} modal/dialog without dsModalPanel/GestionaleModalShell heuristic`,
    });
  }
  if (report.overflowRisk === "HIGH") {
    items.push({
      kind: "overflow-tier",
      severity: "runtime",
      detail: "overflow-risk HIGH — new flex violations or critical instability",
    });
  }
  if (report.overflowRisk === "MEDIUM") {
    items.push({
      kind: "overflow-tier",
      severity: "theoretical",
      detail: "overflow-risk MEDIUM — baselined or heuristic signals present",
    });
  }
  if (report.toolbarRisk > 0) {
    items.push({
      kind: "toolbar-containment",
      severity: "theoretical",
      detail: `${report.toolbarRisk} toolbar/filter/search line(s) without containment markers`,
    });
  }

  return items;
}

function buildIssueBreakdown(
  route: RouteAuditKey,
  report: RouteReliabilityReport,
  root: string,
  grandfatheredRefs: GrandfatheredRiskRef[],
): UiFinalIssueBreakdown {
  const newFlexRisks = getNewFlexEntriesForRoute(route, root);
  const uiOsMismatch =
    report.uiOsCompatibility === "DEGRADED" ? buildUiOsMismatchReasons(route, root) : [];

  return {
    newFlexRisks,
    baselineRisks: getBaselineRisksForRoute(route, grandfatheredRefs),
    overflowRisks: buildOverflowRiskItems(report, newFlexRisks),
    uiOsMismatch,
    toolbarInconsistency: report.toolbarRisk,
    layoutAnomalies: {
      table: report.tableRisk,
      modal: report.modalRisk,
      flex1: report.flex1Risk,
    },
  };
}

export function auditUiFinalStability(route: RouteAuditKey, root = process.cwd()): UiFinalRouteReport {
  const source = auditRouteReliability(route, root);
  const grandfatheredRefs = buildGrandfatheredRiskRefs(root);

  const flexSafety = computeFlexSafetyScore(source);
  const overflowSafety = computeOverflowSafetyScore(source);
  const uiOsCompatibility = computeUiOsCompatibilityScore(source);
  const layoutStability = computeLayoutStabilityScore(source);
  const partialScores = { flexSafety, overflowSafety, uiOsCompatibility, layoutStability };
  const overall = computeOverallUiStabilityScore(partialScores);
  const issues = buildIssueBreakdown(route, source, root, grandfatheredRefs);

  return {
    route,
    scores: { ...partialScores, overall },
    status: resolveUiFinalRouteStatus(source),
    overflowRisk: source.overflowRisk,
    uiOsMode: source.uiOsCompatibility,
    issues,
    source,
  };
}

export function auditAllUiFinalStability(root = process.cwd()): UiFinalRouteReport[] {
  return UI_ROUTE_AUDIT_KEYS.map((route) => auditUiFinalStability(route, root));
}

export function computeGlobalUiFinalHealth(
  reports: UiFinalRouteReport[] = auditAllUiFinalStability(),
  root = process.cwd(),
): UiFinalGlobalHealth {
  const statusCounts: Record<UiFinalRouteStatus, number> = {
    OK: 0,
    WARNING: 0,
    DEGRADED: 0,
    AT_RISK: 0,
  };

  for (const report of reports) {
    statusCounts[report.status]++;
  }

  const globalFlexStability = Math.round(
    reports.reduce((sum, r) => sum + r.scores.flexSafety, 0) / reports.length,
  );
  const globalUiOsHealth = Math.round(
    reports.reduce((sum, r) => sum + r.scores.uiOsCompatibility, 0) / reports.length,
  );
  const globalOverflowRiskScore = Math.round(
    reports.reduce((sum, r) => sum + r.scores.overflowSafety, 0) / reports.length,
  );
  const systemLayoutDriftScore = Math.round(
    reports.reduce((sum, r) => sum + r.scores.layoutStability, 0) / reports.length,
  );

  const globalNew = countGlobalNewFlexViolations(root);
  let recommendation: UiFinalSystemRecommendation = "STABLE";

  if (globalNew > 0 || statusCounts.AT_RISK > 0) {
    recommendation = "AT RISK";
  } else if (statusCounts.DEGRADED >= 2 || statusCounts.WARNING >= 3) {
    recommendation = "NEEDS CONSOLIDATION";
  } else if (statusCounts.WARNING > 0 || statusCounts.DEGRADED > 0) {
    recommendation = "STABLE WITH WARNINGS";
  }

  return {
    globalFlexStability,
    globalUiOsHealth,
    globalOverflowRiskScore,
    systemLayoutDriftScore,
    recommendation,
    globalBaselineRisks: getGlobalInformationalBaselineRisks(buildGrandfatheredRiskRefs(root)),
    routeCount: reports.length,
    statusCounts,
  };
}

export function uiFinalRouteScoreFingerprint(report: UiFinalRouteReport): string {
  return [
    report.route,
    report.scores.flexSafety,
    report.scores.overflowSafety,
    report.scores.uiOsCompatibility,
    report.scores.layoutStability,
    report.scores.overall,
    report.status,
  ].join("|");
}

function padCell(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

export function formatUiFinalStabilityTable(reports: UiFinalRouteReport[]): string {
  const header = [
    "| Route",
    "Flex",
    "Overflow",
    "UI OS",
    "Layout",
    "Overall",
    "Status |",
  ].join(" | ");
  const divider = [
    "|--------",
    "------",
    "---------",
    "-------",
    "--------",
    "---------",
    "--------|",
  ].join("|");

  const rows = reports.map((r) => {
    const route = padCell(r.route, 12);
    const flex = padCell(String(r.scores.flexSafety), 4);
    const overflow = padCell(String(r.scores.overflowSafety), 7);
    const uiOs = padCell(String(r.scores.uiOsCompatibility), 5);
    const layout = padCell(String(r.scores.layoutStability), 6);
    const overall = padCell(String(r.scores.overall), 7);
    const status = padCell(r.status, 8);
    return `| ${route} | ${flex} | ${overflow} | ${uiOs} | ${layout} | ${overall} | ${status} |`;
  });

  return [header, divider, ...rows].join("\n");
}

export function formatUiFinalIssueBreakdown(report: UiFinalRouteReport): string {
  const lines: string[] = [`${UI_FINAL_STABILITY_AUDIT_PREFIX} route: ${report.route}`];

  const hasIssues =
    report.issues.newFlexRisks.length > 0 ||
    report.issues.baselineRisks.some((b) => b.baselineEntryCount > 0) ||
    report.issues.overflowRisks.length > 0 ||
    report.issues.uiOsMismatch.length > 0 ||
    report.issues.toolbarInconsistency > 0 ||
    report.issues.layoutAnomalies.table > 0 ||
    report.issues.layoutAnomalies.modal > 0 ||
    report.issues.layoutAnomalies.flex1 > 0;

  if (!hasIssues) return "";

  lines.push("issue-breakdown:");

  if (report.issues.newFlexRisks.length > 0) {
    lines.push("  new-flex-risks:");
    for (const v of report.issues.newFlexRisks) {
      lines.push(`    - ${v.file}:${v.line} [${v.reason}]`);
    }
  }

  const baseline = report.issues.baselineRisks.filter((b) => b.baselineEntryCount > 0);
  if (baseline.length > 0) {
    lines.push("  baseline-risks (grandfathered, informational):");
    for (const b of baseline) {
      lines.push(`    - ${b.id} (${b.file}) — ${b.baselineEntryCount} frozen entry/entries`);
    }
  }

  if (report.issues.overflowRisks.length > 0) {
    lines.push("  overflow-risks:");
    for (const item of report.issues.overflowRisks) {
      lines.push(`    - [${item.severity}] ${item.kind}: ${item.detail}`);
    }
  }

  if (report.issues.uiOsMismatch.length > 0) {
    lines.push("  ui-os-mismatch:");
    for (const reason of report.issues.uiOsMismatch) {
      lines.push(`    - ${reason}`);
    }
  }

  if (report.issues.toolbarInconsistency > 0) {
    lines.push(`  toolbar-inconsistency: ${report.issues.toolbarInconsistency}`);
  }

  const { table, modal, flex1 } = report.issues.layoutAnomalies;
  if (table > 0 || modal > 0 || flex1 > 0) {
    lines.push(`  layout-anomalies: table=${table}, modal=${modal}, flex1=${flex1}`);
  }

  return lines.join("\n");
}

export function formatUiFinalSystemHealth(health: UiFinalGlobalHealth): string {
  const lines = [
    `Global Flex Stability Score: ${health.globalFlexStability}/100`,
    `Global UI OS Health Score: ${health.globalUiOsHealth}/100`,
    `Global Overflow Risk Score: ${health.globalOverflowRiskScore}/100`,
    `System-wide Layout Drift Score: ${health.systemLayoutDriftScore}/100`,
    `Final Recommendation: ${health.recommendation}`,
  ];

  if (health.globalBaselineRisks.length > 0) {
    lines.push("global-baseline-risks (informational):");
    for (const ref of health.globalBaselineRisks) {
      lines.push(`  - ${ref.id} (${ref.file}) — routes: ${ref.routes.join(", ")}`);
    }
  }

  return lines.join("\n");
}

export function formatUiFinalStabilityAudit(
  reports: UiFinalRouteReport[] = auditAllUiFinalStability(),
  health: UiFinalGlobalHealth = computeGlobalUiFinalHealth(reports),
): string {
  const sections = [
    formatUiFinalStabilityTable(reports),
    "",
    ...reports
      .map((r) => formatUiFinalIssueBreakdown(r))
      .filter(Boolean),
    "",
    formatUiFinalSystemHealth(health),
  ];
  return sections.filter((s, i) => s !== "" || i === 1).join("\n");
}
