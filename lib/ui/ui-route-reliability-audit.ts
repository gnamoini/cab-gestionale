/**
 * Static route-level UI reliability audit — flex safety + table/modal/toolbar heuristics.
 * Read-only analysis; grandfathered baseline violations are reported but not auto-fixed.
 */

import fs from "node:fs";
import path from "node:path";
import {
  flexViolationFingerprint,
  isFlexViolationBaselined,
  verifyFlexBaselineIntegrity,
  type FlexBaselineEntry,
  type FlexBaselineFile,
} from "@/lib/lint/flex-baseline-fingerprint";
import { scanFlexViolations } from "@/lib/lint/scan-flex-violations";
import { FLEX_BASELINE_PATH, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE } from "@/lib/ui/flex-system-freeze";
import { validateFlexSystemPolicy } from "@/lib/ui/flex-system-policy";
import { UI_OS_OPT_IN_PAGES } from "@/lib/ui-os/ui-os-engine";
import { getSuggestedSchema, SUGGESTED_PAGE_SCHEMAS } from "@/lib/ui-os/ui-schema";

if (!FLEX_SYSTEM_ABSOLUTE_FINAL_STATE) {
  throw new Error("ui-route-reliability-audit requires FLEX_SYSTEM_ABSOLUTE_FINAL_STATE === true");
}

export type RouteAuditKey =
  | "/report"
  | "/magazzino"
  | "/lavorazioni"
  | "/dipendenti"
  | "/dashboard"
  | "/kanban";

export type OverflowRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type RouteAuditStatus = "OK" | "WARNING" | "BLOCKED";
export type UiOsCompatibility = "OK" | "DEGRADED";

export type RouteAuditTarget = {
  route: RouteAuditKey;
  files: readonly string[];
  /** UI OS schema route key (kanban aliases /lavorazioni). */
  uiOsRoute: string;
  aliasOf?: RouteAuditKey;
};

export type RouteReliabilityReport = {
  route: RouteAuditKey;
  overflowRisk: OverflowRiskLevel;
  flexViolations: { total: number; new: number; baselined: number };
  tableRisk: number;
  modalRisk: number;
  toolbarRisk: number;
  flex1Risk: number;
  uiOsCompatibility: UiOsCompatibility;
  status: RouteAuditStatus;
  fixRecommendations: string[];
};

export type UiReliabilityScores = {
  flexStability: number;
  mobileOverflowSafety: number;
  uiOsCompatibility: number;
  overall: number;
};

export const UI_ROUTE_AUDIT_PREFIX = "[flex-system-audit]";

export const UI_ROUTE_AUDIT_TARGETS: Record<RouteAuditKey, RouteAuditTarget> = {
  "/report": {
    route: "/report",
    files: ["app/(gestionale)/report/page.tsx", "components/report/report-hub-view.tsx"],
    uiOsRoute: "/report",
  },
  "/magazzino": {
    route: "/magazzino",
    files: ["app/(gestionale)/magazzino/page.tsx", "components/gestionale/magazzino/magazzino-view.tsx"],
    uiOsRoute: "/magazzino",
  },
  "/lavorazioni": {
    route: "/lavorazioni",
    files: [
      "app/(gestionale)/lavorazioni/page.tsx",
      "components/gestionale/lavorazioni/lavorazioni-view.tsx",
      "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx",
    ],
    uiOsRoute: "/lavorazioni",
  },
  "/dipendenti": {
    route: "/dipendenti",
    files: ["app/(gestionale)/dipendenti/page.tsx", "components/gestionale/dipendenti/dipendenti-view.tsx"],
    uiOsRoute: "/dipendenti",
  },
  "/dashboard": {
    route: "/dashboard",
    files: ["app/(gestionale)/dashboard/page.tsx", "components/dashboard/dashboard-view.tsx"],
    uiOsRoute: "/dashboard",
  },
  "/kanban": {
    route: "/kanban",
    files: ["components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx"],
    uiOsRoute: "/lavorazioni",
    aliasOf: "/lavorazioni",
  },
};

export const UI_ROUTE_AUDIT_KEYS = Object.keys(UI_ROUTE_AUDIT_TARGETS) as RouteAuditKey[];

const TOOLBAR_CONTAINMENT =
  /\b(min-w-0|flex-safe|ToolbarGroup|flex-safe-row|max-w-full|ToolbarGroupPrimaryRow|toolbarGroupClass|PageToolbar|PageToolbarActions|PageToolbarResultCount|GestionalePageToolbarActions|GestionaleListSearchField)\b/;
const TOOLBAR_JSX =
  /<(PageToolbar|PageToolbarActions|PageToolbarResultCount|GestionalePageToolbarActions|GestionaleListSearchField|ToolbarGroup|MagazzinoAdvancedFilterPanel|DipendentiToolbar|TimesheetHeader)\b/;

const TABLE_USAGE = /<table\b|<Table\b|\bhtmlTable\b/;
const TABLE_SAFE =
  /globalTableWrap|GestionaleListTable|overflow-x-auto[\s\S]{0,120}min-w-0|min-w-0[\s\S]{0,120}overflow-x-auto/;

const MODAL_TRIGGER =
  /\b(Modal|Dialog|modalBackdrop|role="dialog"|GestionaleModal|dsModalBackdrop|dsLavorazioniModalLayer)\b/;
const MODAL_SAFE =
  /dsModalPanel|GestionaleModalShell|min-w-0 max-w-full|dsLavorazioniModalDialog|gestionaleModalBodyFlexClass/;

const FLEX1_ALLOWLIST = [
  { file: "components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx", pattern: /lg:flex-1/ },
] as const;

function normalizeRelPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function readRouteFile(root: string, relPath: string): string {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) return "";
  return fs.readFileSync(full, "utf8");
}

function loadBaseline(root: string): FlexBaselineFile {
  const baselinePath = path.join(root, FLEX_BASELINE_PATH);
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as FlexBaselineFile;
  const integrity = verifyFlexBaselineIntegrity(baseline);
  if (!integrity.valid) {
    throw new Error(`baseline integrity: ${integrity.errors.join("; ")}`);
  }
  return baseline;
}

function splitRouteFlexViolations(
  entries: FlexBaselineEntry[],
  fileSet: Set<string>,
  baseline: FlexBaselineFile,
): { total: number; new: number; baselined: number; newEntries: FlexBaselineEntry[] } {
  const inRoute = entries.filter((e) => fileSet.has(normalizeRelPath(e.file)));
  const newEntries = inRoute.filter((e) => !isFlexViolationBaselined(e, baseline));
  const baselined = inRoute.length - newEntries.length;
  return { total: inRoute.length, new: newEntries.length, baselined, newEntries };
}

function isToolbarLayoutLine(line: string): boolean {
  if (/^\s*import\b/.test(line)) return false;
  if (/\.filter\s*\(/.test(line) && !TOOLBAR_JSX.test(line)) return false;
  if (
    /\b(searchParams|searchInput|searchApplied|setSearch|useSearchParams)\b/.test(line) &&
    !/className=/.test(line) &&
    !TOOLBAR_JSX.test(line)
  ) {
    return false;
  }
  if (TOOLBAR_JSX.test(line)) return true;
  return /className=[^>]*\b(toolbar|Toolbar|filter-row|search-field|mezzi-filters)\b/.test(line);
}

function countToolbarRisk(content: string): number {
  let count = 0;
  for (const line of content.split("\n")) {
    if (!isToolbarLayoutLine(line)) continue;
    if (TOOLBAR_CONTAINMENT.test(line)) continue;
    count++;
  }
  return count;
}

function countTableRisk(content: string): number {
  const lines = content.split("\n");
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!TABLE_USAGE.test(lines[i])) continue;
    const window = lines.slice(Math.max(0, i - 4), i + 5).join("\n");
    if (TABLE_SAFE.test(window)) continue;
    count++;
  }
  return count;
}

function countModalRisk(content: string): number {
  const lines = content.split("\n");
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*import\b/.test(line)) continue;
    if (!MODAL_TRIGGER.test(line)) continue;
    const window = lines.slice(Math.max(0, i - 3), i + 6).join("\n");
    if (MODAL_SAFE.test(window)) continue;
    count++;
  }
  return count;
}

function countFlex1OverflowRisk(
  relFile: string,
  content: string,
  baselinedLineKeys: Set<string>,
): number {
  const lines = content.split("\n");
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineKey = `${normalizeRelPath(relFile)}:${i + 1}`;
    if (baselinedLineKeys.has(lineKey)) continue;
    if (!/\bflex-1\b/.test(line) || !/className=/.test(line)) continue;
    if (FLEX1_ALLOWLIST.some((a) => relFile === a.file && a.pattern.test(line))) continue;
    const m = line.match(/className=(?:"([^"]*)"|`([^`]*)`|\{[`"']([^`"']*)[`"']\})/);
    const cls = m?.[1] ?? m?.[2] ?? m?.[3] ?? "";
    if (/\bflex-1\b/.test(cls) && !/\bmin-w-0\b|\bflex-fill\b|\bflex-fill-safe\b/.test(cls)) {
      count++;
    }
  }
  return count;
}

function resolveUiOsCompatibility(target: RouteAuditTarget, root: string): UiOsCompatibility {
  if (target.aliasOf) {
    return resolveUiOsCompatibility(UI_ROUTE_AUDIT_TARGETS[target.aliasOf], root);
  }

  const pageFile = target.files.find((f) => f.includes("/page.tsx"));
  const pageContent = pageFile ? readRouteFile(root, pageFile) : "";
  const hasAdapter = /UIPageAdapter/.test(pageContent);
  const schemaKey = target.uiOsRoute;
  const hasSchema = schemaKey in SUGGESTED_PAGE_SCHEMAS;
  const optIn = schemaKey in UI_OS_OPT_IN_PAGES;
  const schema = getSuggestedSchema(schemaKey);
  const flexSafe = validateFlexSystemPolicy(schema).safe;

  if (hasAdapter && hasSchema && optIn && flexSafe) return "OK";
  return "DEGRADED";
}

function resolveOverflowRisk(
  flex: { new: number; baselined: number },
  tableRisk: number,
  modalRisk: number,
  toolbarRisk: number,
): OverflowRiskLevel {
  if (flex.new > 0) return "HIGH";
  const heuristicTotal = tableRisk + modalRisk + toolbarRisk;
  if (flex.baselined > 0 || heuristicTotal > 0) return "MEDIUM";
  return "LOW";
}

function resolveStatus(flexNew: number, flexBaselined: number, heuristicTotal: number): RouteAuditStatus {
  if (flexNew > 0) return "BLOCKED";
  if (flexBaselined > 0 || heuristicTotal > 0) return "WARNING";
  return "OK";
}

function buildFixRecommendations(
  flexNew: FlexBaselineEntry[],
  tableRisk: number,
  modalRisk: number,
  toolbarRisk: number,
  flexBaselined: number,
): string[] {
  const out: string[] = [];
  for (const v of flexNew) {
    out.push(`Fix new flex violation at ${v.file}:${v.line} — add min-w-0 / flex-safe containment (${v.reason})`);
  }
  if (tableRisk > 0) {
    out.push("Wrap tables with globalTableWrap or GestionaleListTable + overflow-x-auto min-w-0");
  }
  if (modalRisk > 0) {
    out.push("Use dsModalPanel / GestionaleModalShell with min-w-0 max-w-full for modals");
  }
  if (toolbarRisk > 0) {
    out.push("Add toolbar containment (ToolbarGroup, min-w-0, flex-safe-row) to filter/search rows");
  }
  if (out.length === 0 && flexBaselined > 0) {
    out.push("(none — grandfathered risks documented globally)");
  }
  if (out.length === 0) {
    out.push("(none)");
  }
  return out;
}

function analyzeRouteFiles(
  target: RouteAuditTarget,
  root: string,
  baselinedLineKeys: Set<string>,
): { tableRisk: number; modalRisk: number; toolbarRisk: number; flex1Risk: number } {
  let tableRisk = 0;
  let modalRisk = 0;
  let toolbarRisk = 0;
  let flex1Risk = 0;

  for (const rel of target.files) {
    const content = readRouteFile(root, rel);
    if (!content) continue;
    tableRisk += countTableRisk(content);
    modalRisk += countModalRisk(content);
    toolbarRisk += countToolbarRisk(content);
    flex1Risk += countFlex1OverflowRisk(rel, content, baselinedLineKeys);
  }

  return { tableRisk, modalRisk, toolbarRisk, flex1Risk };
}

export function auditRouteReliability(route: RouteAuditKey, root = process.cwd()): RouteReliabilityReport {
  const target = UI_ROUTE_AUDIT_TARGETS[route];
  const baseline = loadBaseline(root);
  const allViolations = scanFlexViolations(root);
  const fileSet = new Set(target.files.map(normalizeRelPath));
  const flex = splitRouteFlexViolations(allViolations, fileSet, baseline);

  const baselinedLineKeys = new Set<string>();
  for (const e of allViolations) {
    if (!fileSet.has(normalizeRelPath(e.file))) continue;
    if (isFlexViolationBaselined(e, baseline)) {
      baselinedLineKeys.add(`${normalizeRelPath(e.file)}:${e.line}`);
    }
  }

  const heuristics = analyzeRouteFiles(target, root, baselinedLineKeys);
  const heuristicTotal = heuristics.tableRisk + heuristics.modalRisk + heuristics.toolbarRisk;
  const uiOsCompatibility = resolveUiOsCompatibility(target, root);

  return {
    route,
    overflowRisk: resolveOverflowRisk(flex, heuristics.tableRisk, heuristics.modalRisk, heuristics.toolbarRisk),
    flexViolations: { total: flex.total, new: flex.new, baselined: flex.baselined },
    tableRisk: heuristics.tableRisk,
    modalRisk: heuristics.modalRisk,
    toolbarRisk: heuristics.toolbarRisk,
    flex1Risk: heuristics.flex1Risk,
    uiOsCompatibility,
    status: resolveStatus(flex.new, flex.baselined, heuristicTotal),
    fixRecommendations: buildFixRecommendations(
      flex.newEntries,
      heuristics.tableRisk,
      heuristics.modalRisk,
      heuristics.toolbarRisk,
      flex.baselined,
    ),
  };
}

export function auditAllTargetRoutes(root = process.cwd()): RouteReliabilityReport[] {
  return UI_ROUTE_AUDIT_KEYS.map((route) => auditRouteReliability(route, root));
}

export function computeFlexStabilityScore(reports: RouteReliabilityReport[]): number {
  const totalNew = reports.reduce((sum, r) => sum + r.flexViolations.new, 0);
  return Math.max(0, 100 - totalNew * 25);
}

export function computeMobileOverflowSafetyScore(
  reports: RouteReliabilityReport[],
  root = process.cwd(),
): number {
  let penalty = 0;
  for (const target of Object.values(UI_ROUTE_AUDIT_TARGETS)) {
    const baseline = loadBaseline(root);
    const baselinedLineKeys = new Set<string>();
    const fileSet = new Set(target.files.map(normalizeRelPath));
    for (const e of scanFlexViolations(root)) {
      if (!fileSet.has(normalizeRelPath(e.file))) continue;
      if (isFlexViolationBaselined(e, baseline)) {
        baselinedLineKeys.add(`${normalizeRelPath(e.file)}:${e.line}`);
      }
    }
    const h = analyzeRouteFiles(target, root, baselinedLineKeys);
    penalty += h.tableRisk * 5;
    penalty += h.modalRisk * 3;
    penalty += h.toolbarRisk * 2;
    penalty += h.flex1Risk * 10;
  }
  return Math.max(0, 100 - penalty);
}

export function computeUiOsCompatibilityScore(reports: RouteReliabilityReport[]): number {
  if (reports.length === 0) return 100;
  const total = reports.reduce(
    (sum, r) => sum + (r.uiOsCompatibility === "OK" ? 100 : 70),
    0,
  );
  return Math.round(total / reports.length);
}

export function computeOverallUiReliabilityScore(scores: UiReliabilityScores): number {
  return Math.round((scores.flexStability + scores.mobileOverflowSafety + scores.uiOsCompatibility) / 3);
}

export function computeUiReliabilityScores(
  reports: RouteReliabilityReport[],
  root = process.cwd(),
): UiReliabilityScores {
  const flexStability = computeFlexStabilityScore(reports);
  const mobileOverflowSafety = computeMobileOverflowSafetyScore(reports, root);
  const uiOsCompatibility = computeUiOsCompatibilityScore(reports);
  const scores: UiReliabilityScores = {
    flexStability,
    mobileOverflowSafety,
    uiOsCompatibility,
    overall: 0,
  };
  scores.overall = computeOverallUiReliabilityScore(scores);
  return scores;
}

export function formatRouteReliabilityReport(report: RouteReliabilityReport): string {
  const lines = [
    UI_ROUTE_AUDIT_PREFIX,
    `route: ${report.route}`,
    `overflow-risk: ${report.overflowRisk}`,
    `flex-violations: ${report.flexViolations.total} (new: ${report.flexViolations.new}, baselined: ${report.flexViolations.baselined})`,
    `table-risk: ${report.tableRisk}`,
    `modal-risk: ${report.modalRisk}`,
    `toolbar-risk: ${report.toolbarRisk}`,
    `ui-os-compatibility: ${report.uiOsCompatibility}`,
    `status: ${report.status}`,
    "fix-recommendation:",
  ];
  for (const rec of report.fixRecommendations) {
    lines.push(`  - ${rec}`);
  }
  return lines.join("\n");
}

export function formatUiReliabilityScoreSummary(scores: UiReliabilityScores): string {
  return [
    `UI Flex Stability Score: ${scores.flexStability}/100`,
    `Mobile Overflow Safety Score: ${scores.mobileOverflowSafety}/100`,
    `UI OS Compatibility Score: ${scores.uiOsCompatibility}/100`,
    `Overall UI Reliability Score: ${scores.overall}/100`,
  ].join("\n");
}

export function countGlobalNewFlexViolations(root = process.cwd()): number {
  const baseline = loadBaseline(root);
  return scanFlexViolations(root).filter((e) => !isFlexViolationBaselined(e, baseline)).length;
}

/** Stable fingerprint for regression tests — excludes volatile modal/toolbar heuristic counts. */
export function routeAuditStabilityFingerprint(report: RouteReliabilityReport): string {
  return [
    report.route,
    report.overflowRisk,
    report.flexViolations.total,
    report.flexViolations.new,
    report.flexViolations.baselined,
    report.uiOsCompatibility,
    report.status,
  ].join("|");
}
