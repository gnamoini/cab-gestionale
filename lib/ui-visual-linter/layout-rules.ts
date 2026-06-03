/**
 * Visual Layout Linter — regole di coerenza + allowlist SSOT.
 * Canonical values allineati a design-system.ts / gestionale-list-table.ts.
 */

import { hasFlexContainmentMarker } from "@/lib/ui/global-flex-system";
import type {
  FlexGroupSignature,
  LayoutSignature,
  ModalSignature,
  TableSignature,
  ToolbarSignature,
} from "@/lib/ui-visual-linter/layout-signature";

export type LayoutRuleId =
  | "toolbar-gap"
  | "toolbar-search-flex"
  | "toolbar-actions-shrink"
  | "toolbar-alignment"
  | "toolbar-wrap"
  | "table-density"
  | "table-header-padding"
  | "table-sticky"
  | "modal-header-padding"
  | "modal-body-padding"
  | "modal-footer-alignment"
  | "flex-justify-between"
  | "flex-alignment-mix"
  | "flex-min-w-0"
  | "cross-instance-drift";

export type LayoutLinterIssue = {
  rule: LayoutRuleId;
  severity: "warning" | "info";
  message: string;
  target: string;
  expected?: string;
  found?: string;
  category: "toolbar" | "table" | "modal" | "spacing" | "alignment";
};

/** Canonical spacing from DS (--ds-space-sm=8px, --ds-space-md=12px, py-2=8px, py-1=4px, py-3=12px, p-4=16px). */
export const CANONICAL = {
  toolbarGapMin: 6,
  toolbarGapMax: 14,
  toolbarGapTarget: 8,
  tableThPaddingY: 8,
  tableThPaddingX: 10,
  tableTdPaddingY: 4,
  tableRowHeight: 56,
  modalHeaderPaddingY: 12,
  modalBodyPadding: 16,
  modalFooterJustify: "flex-end",
  tolerancePx: 2,
} as const;

export const VISUAL_LAYOUT_ALLOWLIST = {
  selectors: [
    ".lavorazioni-kanban-mobile",
    "[data-report-chart]",
    ".lavorazioni-scroll-scope",
    ".dashboard-widget-card",
    "[class*='recharts']",
    "[class*='lavorazioni-kanban']",
  ],
  /** Skip flex-group lint inside these scroll/table wrappers (density checked on inner table only). */
  classTokens: [
    "globalTableWrap",
    "dsSurfaceCard",
    "dsSurfaceInteractiveKpi",
    "lavorazioni-kanban",
    "recharts",
    "ReportKpiGrid",
  ],
  /** Pathname substrings where kanban layout variance is intentional. */
  pathnameSubstrings: [":kanban"],
} as const;

export function shouldSkipElement(el: Element, pageId: string): boolean {
  if (typeof HTMLElement !== "undefined" && !(el instanceof HTMLElement)) return false;
  const htmlEl = el as HTMLElement;
  const cn = typeof htmlEl.className === "string" ? htmlEl.className : "";
  if (VISUAL_LAYOUT_ALLOWLIST.classTokens.some((t) => cn.includes(t))) return true;

  for (const sel of VISUAL_LAYOUT_ALLOWLIST.selectors) {
    try {
      if (htmlEl.matches?.(sel) || htmlEl.closest?.(sel)) return true;
    } catch {
      /* invalid selector in SSR — ignore */
    }
  }

  if (VISUAL_LAYOUT_ALLOWLIST.pathnameSubstrings.some((s) => pageId.includes(s))) {
    if (cn.includes("kanban") || htmlEl.closest?.("[class*='kanban']")) return true;
  }

  return false;
}

function inRange(value: number, target: number, tolerance: number): boolean {
  return Math.abs(value - target) <= tolerance;
}

function inGapRange(gapPx: number): boolean {
  return gapPx >= CANONICAL.toolbarGapMin && gapPx <= CANONICAL.toolbarGapMax;
}

/** RULE 1 — Toolbar consistency. */
export function evaluateToolbarRules(sig: ToolbarSignature): LayoutLinterIssue[] {
  const issues: LayoutLinterIssue[] = [];

  if (sig.gapPx > 0 && !inGapRange(sig.gapPx)) {
    issues.push({
      rule: "toolbar-gap",
      severity: "warning",
      message: "toolbar gap inconsistency detected",
      target: sig.target,
      expected: `${CANONICAL.toolbarGapTarget}px (range ${CANONICAL.toolbarGapMin}-${CANONICAL.toolbarGapMax}px)`,
      found: `${sig.gapPx}px`,
      category: "toolbar",
    });
  }

  if (sig.searchFlexGrow != null && sig.searchFlexGrow <= 0) {
    issues.push({
      rule: "toolbar-search-flex",
      severity: "warning",
      message: "toolbar search should be flex-1 (flex-grow > 0)",
      target: sig.target,
      category: "toolbar",
    });
  }

  if (!sig.actionsShrink) {
    issues.push({
      rule: "toolbar-actions-shrink",
      severity: "info",
      message: "toolbar actions should use shrink-0",
      target: sig.target,
      category: "toolbar",
    });
  }

  if (sig.layout === "row" && sig.alignItems !== "center" && sig.alignItems !== "stretch") {
    issues.push({
      rule: "toolbar-alignment",
      severity: "info",
      message: "toolbar row alignment drift (expected center)",
      target: sig.target,
      found: sig.alignItems,
      expected: "center",
      category: "toolbar",
    });
  }

  return issues;
}

/** RULE 2 — Table consistency. */
export function evaluateTableRules(sig: TableSignature): LayoutLinterIssue[] {
  const issues: LayoutLinterIssue[] = [];
  const t = CANONICAL.tolerancePx;

  if (sig.density === "mixed") {
    issues.push({
      rule: "table-density",
      severity: "warning",
      message: "table density mismatch (mixed compact/normal)",
      target: sig.target,
      category: "table",
    });
  }

  if (
    sig.thPaddingY > 0 &&
    !inRange(sig.thPaddingY, CANONICAL.tableThPaddingY, t + 2)
  ) {
    issues.push({
      rule: "table-header-padding",
      severity: "warning",
      message: "table header padding Y drift",
      target: sig.target,
      expected: `${CANONICAL.tableThPaddingY}px`,
      found: `${sig.thPaddingY}px`,
      category: "table",
    });
  }

  if (
    sig.rowHeightPx != null &&
    sig.rowHeightPx > 0 &&
    !inRange(sig.rowHeightPx, CANONICAL.tableRowHeight, 6)
  ) {
    issues.push({
      rule: "table-density",
      severity: "info",
      message: "table row height drift from h-14 (56px)",
      target: sig.target,
      expected: `${CANONICAL.tableRowHeight}px`,
      found: `${sig.rowHeightPx}px`,
      category: "table",
    });
  }

  return issues;
}

/** RULE 3 — Modal consistency. */
export function evaluateModalRules(sig: ModalSignature): LayoutLinterIssue[] {
  const issues: LayoutLinterIssue[] = [];
  const t = CANONICAL.tolerancePx;

  if (
    sig.headerPaddingY > 0 &&
    !inRange(sig.headerPaddingY, CANONICAL.modalHeaderPaddingY, t + 2)
  ) {
    issues.push({
      rule: "modal-header-padding",
      severity: "warning",
      message: "modal header padding drift",
      target: sig.target,
      expected: `${CANONICAL.modalHeaderPaddingY}px`,
      found: `${sig.headerPaddingY}px`,
      category: "modal",
    });
  }

  if (
    sig.bodyPadding > 0 &&
    !inRange(sig.bodyPadding, CANONICAL.modalBodyPadding, t + 2)
  ) {
    issues.push({
      rule: "modal-body-padding",
      severity: "warning",
      message: "modal body padding drift",
      target: sig.target,
      expected: `${CANONICAL.modalBodyPadding}px`,
      found: `${sig.bodyPadding}px`,
      category: "modal",
    });
  }

  const allowedFooter = ["flex-end", "space-between", "end"];
  if (
    sig.footerJustify &&
    !allowedFooter.some((a) => sig.footerJustify.includes(a.replace("flex-", "")))
  ) {
    issues.push({
      rule: "modal-footer-alignment",
      severity: "info",
      message: "modal footer alignment drift",
      target: sig.target,
      expected: CANONICAL.modalFooterJustify,
      found: sig.footerJustify,
      category: "modal",
    });
  }

  return issues;
}

/** RULE 4 — Flex alignment drift. */
export function evaluateFlexGroupRules(sig: FlexGroupSignature, className: string): LayoutLinterIssue[] {
  const issues: LayoutLinterIssue[] = [];

  if (
    sig.justify === "space-between" &&
    !className.includes("justify-between") &&
    sig.nestingDepth > 1
  ) {
    issues.push({
      rule: "flex-justify-between",
      severity: "info",
      message: "nested flex uses justify-between (potential alignment drift)",
      target: sig.target,
      category: "alignment",
    });
  }

  if (
    sig.alignItems === "baseline" &&
    className.includes("items-center")
  ) {
    issues.push({
      rule: "flex-alignment-mix",
      severity: "info",
      message: "center + baseline alignment mixed in flex group",
      target: sig.target,
      category: "alignment",
    });
  }

  if (sig.nestingDepth >= 2 && !sig.hasMinW0 && !hasFlexContainmentMarker(className)) {
    issues.push({
      rule: "flex-min-w-0",
      severity: "warning",
      message: "nested flex without min-w-0 containment",
      target: sig.target,
      category: "alignment",
    });
  }

  return issues;
}

/** Applica tutte le regole su una singola signature. */
export function evaluateSignatureRules(sig: LayoutSignature, className = ""): LayoutLinterIssue[] {
  switch (sig.type) {
    case "toolbar":
      return evaluateToolbarRules(sig);
    case "table":
      return evaluateTableRules(sig);
    case "modal":
      return evaluateModalRules(sig);
    case "flex-group":
      return evaluateFlexGroupRules(sig, className);
    default:
      return [];
  }
}
