/**
 * ResponsiveLayoutAudit — rilevamento overflow/layout non responsive (solo DEV).
 * Global Flex System pass: runFlexSystemAudit / emitFlexSystemAuditWarnings.
 */

import { FLEX_CONTAINMENT_MARKERS, FLEX_SCOPE_CLASS } from "@/lib/ui/global-flex-system";
import { FLEX_AUDIT_HYDRATION_DELAY_MS } from "@/lib/ui/flex-system-policy";
import flexFreezeManifest from "@/lib/ui/flex-freeze-manifest.json";

export { FLEX_AUDIT_HYDRATION_DELAY_MS };

export type ResponsiveLayoutFindingKind =
  | "page-horizontal-overflow"
  | "element-exceeds-viewport"
  | "fixed-width-on-mobile"
  | "flex-child-missing-min-w-0"
  | "flex-system-overflow-risk";

export type ResponsiveLayoutFinding = {
  kind: ResponsiveLayoutFindingKind;
  message: string;
  /** Selettore o descrizione elemento */
  target: string;
  detail?: string;
};

const AUDIT_LOG_PREFIX = "[ResponsiveLayoutAudit]";
const FLEX_SYSTEM_AUDIT_PREFIX = "[flex-system-audit]";
const MOBILE_MAX_WIDTH = 639;

function isDevAuditEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

function elementDescriptor(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls =
    el instanceof HTMLElement && el.className && typeof el.className === "string"
      ? `.${el.className.split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${tag}${id}${cls}`;
}

/** True se la pagina ha scroll orizzontale non intenzionale. */
export function detectPageHorizontalOverflow(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document.documentElement;
  return doc.scrollWidth > doc.clientWidth + 1;
}

const HORIZONTAL_SCROLL_SCOPE_MARKERS = [
  "timesheet-presenze-grid",
  "gestionale-list-table-scope",
  "lavorazioni-scroll-scope",
  "overflow-x-auto",
];

function isInsideIntentionalHorizontalScroll(el: HTMLElement): boolean {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const cn = typeof node.className === "string" ? node.className : "";
    const markedScope = HORIZONTAL_SCROLL_SCOPE_MARKERS.some((m) => cn.includes(m));
    if (markedScope) return true;
    const style = window.getComputedStyle(node);
    const overflowX = style.overflowX;
    const overflow = style.overflow;
    const scrollsX =
      overflowX === "auto" ||
      overflowX === "scroll" ||
      overflow === "auto" ||
      overflow === "scroll";
    if (scrollsX && node.scrollWidth > node.clientWidth + 1) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

/** Elementi il cui bordo destro supera il viewport (esclusi overlay fixed fuori main). */
export function findViewportOverflowElements(limit = 12): Element[] {
  if (typeof document === "undefined") return [];
  const main = document.querySelector(".cab-app-shell main");
  if (!main) return [];

  const vw = document.documentElement.clientWidth;
  const out: Element[] = [];
  const walk = main.querySelectorAll("*");

  for (const el of walk) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest("[role='dialog'], [aria-modal='true']")) continue;
    if (isInsideIntentionalHorizontalScroll(el)) continue;
    const style = window.getComputedStyle(el);
    if (style.position === "fixed" || style.display === "none" || style.visibility === "hidden") continue;

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (rect.right > vw + 2) {
      out.push(el);
      if (out.length >= limit) break;
    }
  }

  return out;
}

const FLEX_SAFE_CLASS_MARKERS = [...FLEX_CONTAINMENT_MARKERS];

function hasFlexContainmentClass(el: HTMLElement): boolean {
  const cn = el.className;
  if (typeof cn !== "string") return false;
  return FLEX_SAFE_CLASS_MARKERS.some((m) => cn.includes(m));
}

function getFlexAuditRoot(): Element | null {
  if (typeof document === "undefined") return null;
  const main = document.querySelector(".cab-app-shell main");
  if (!main) return null;
  return main.querySelector(`.${FLEX_SCOPE_CLASS}`) ?? main;
}

/** Flex figli con flex-1/grow senza min-width:0 (campione limitato, scoped a gestionale-responsive-core). */
export function findUnsafeFlexChildren(limit = 8): Element[] {
  const scope = getFlexAuditRoot();
  if (!scope) return [];

  const out: Element[] = [];
  const flexContainers = scope.querySelectorAll(".flex, .flex-safe, .flex-safe-row, [class*='flex-']");

  for (const container of flexContainers) {
    if (!(container instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(container);
    if (style.display !== "flex" && style.display !== "inline-flex") continue;

    for (const child of container.children) {
      if (!(child instanceof HTMLElement)) continue;
      const childStyle = window.getComputedStyle(child);
      const flexGrow = parseFloat(childStyle.flexGrow);
      const flex = childStyle.flex;
      const grows = flexGrow > 0 || (flex !== "none" && flex.includes("1"));
      if (!grows) continue;
      if (childStyle.minWidth !== "0px" && !hasFlexContainmentClass(child)) {
        out.push(child);
        if (out.length >= limit) break;
      }
    }
    if (out.length >= limit) break;
  }

  return out;
}

/** Width fissa in px o rem oltre viewport su mobile. */
export function findFixedWidthOnMobile(limit = 6): Element[] {
  if (typeof window === "undefined" || window.innerWidth > MOBILE_MAX_WIDTH) return [];
  const main = document.querySelector(".cab-app-shell main");
  if (!main) return [];

  const vw = window.innerWidth;
  const out: Element[] = [];

  for (const el of main.querySelectorAll("*")) {
    if (!(el instanceof HTMLElement)) continue;
    const w = el.getBoundingClientRect().width;
    if (w > vw + 2 && w > 320) {
      const style = window.getComputedStyle(el);
      const width = style.width;
      if (/^\d+(\.\d+)?px$/.test(width) && parseFloat(width) > vw) {
        out.push(el);
        if (out.length >= limit) break;
      }
    }
  }

  return out;
}

export type ResponsiveLayoutAuditResult = {
  pathname: string;
  hasPageOverflow: boolean;
  findings: ResponsiveLayoutFinding[];
};

/** Esegue audit completo e restituisce findings (DEV only). */
export function runResponsiveLayoutAudit(pathname = ""): ResponsiveLayoutAuditResult {
  const empty: ResponsiveLayoutAuditResult = {
    pathname,
    hasPageOverflow: false,
    findings: [],
  };

  if (!isDevAuditEnabled() || typeof window === "undefined") return empty;

  const findings: ResponsiveLayoutFinding[] = [];
  const hasPageOverflow = detectPageHorizontalOverflow();

  if (hasPageOverflow) {
    findings.push({
      kind: "page-horizontal-overflow",
      message: "Scroll orizzontale rilevato sulla pagina",
      target: "document.documentElement",
      detail: `scrollWidth=${document.documentElement.scrollWidth} clientWidth=${document.documentElement.clientWidth}`,
    });
  }

  for (const el of findViewportOverflowElements()) {
    findings.push({
      kind: "element-exceeds-viewport",
      message: "Elemento supera il bordo destro del viewport",
      target: elementDescriptor(el),
      detail: `right=${el.getBoundingClientRect().right.toFixed(1)} vw=${document.documentElement.clientWidth}`,
    });
  }

  for (const el of findUnsafeFlexChildren()) {
    findings.push({
      kind: "flex-child-missing-min-w-0",
      message: "Figlio flex grow senza min-w-0 — rischio overflow",
      target: elementDescriptor(el),
    });
  }

  for (const el of findFixedWidthOnMobile()) {
    findings.push({
      kind: "fixed-width-on-mobile",
      message: "Larghezza fissa supera viewport su mobile",
      target: elementDescriptor(el),
      detail: `width=${window.getComputedStyle(el).width}`,
    });
  }

  return { pathname, hasPageOverflow, findings };
}

/** Logga findings in console (DEV only, non blocking). */
export function emitResponsiveLayoutAuditWarnings(result: ResponsiveLayoutAuditResult): void {
  if (!isDevAuditEnabled() || result.findings.length === 0) return;

  const grouped = result.findings.slice(0, 20);
  console.groupCollapsed(
    `${AUDIT_LOG_PREFIX} ${result.pathname || "(unknown)"} — ${grouped.length} finding(s)`,
  );
  for (const f of grouped) {
    console.warn(`[${f.kind}] ${f.message}`, f.target, f.detail ?? "");
  }
  console.groupEnd();
}

export type FlexSystemAuditResult = {
  pathname: string;
  hasPageOverflow: boolean;
  findings: ResponsiveLayoutFinding[];
};

function dedupeFindings(findings: ResponsiveLayoutFinding[]): ResponsiveLayoutFinding[] {
  const seen = new Set<string>();
  const out: ResponsiveLayoutFinding[] = [];
  for (const f of findings) {
    const key = `${f.kind}::${f.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

/** Global Flex System audit pass (DEV only, scoped to .gestionale-responsive-core). */
export function runFlexSystemAudit(pathname = ""): FlexSystemAuditResult {
  const empty: FlexSystemAuditResult = {
    pathname,
    hasPageOverflow: false,
    findings: [],
  };

  if (!isDevAuditEnabled() || typeof window === "undefined") return empty;
  if (!getFlexAuditRoot()) return empty;

  const findings: ResponsiveLayoutFinding[] = [];
  const hasPageOverflow = detectPageHorizontalOverflow();

  if (hasPageOverflow) {
    findings.push({
      kind: "flex-system-overflow-risk",
      message: "Root horizontal scroll — flex containment breach",
      target: "document.documentElement",
      detail: `scrollWidth=${document.documentElement.scrollWidth} clientWidth=${document.documentElement.clientWidth}`,
    });
  }

  for (const el of findUnsafeFlexChildren()) {
    findings.push({
      kind: "flex-system-overflow-risk",
      message: "Flex child grow without min-width containment",
      target: elementDescriptor(el),
    });
  }

  return {
    pathname,
    hasPageOverflow,
    findings: dedupeFindings(findings),
  };
}

export type FlexSystemAuditStats = {
  baselineAllowed: number;
  runtimeUnsafe: number;
};

export type FlexSystemAuditStatus = "OK" | "WARNING" | "BLOCKED";

export type FlexSystemAuditReport = {
  route: string;
  mode: "hard-lock";
  baselineLabel: string;
  newViolations: number;
  status: FlexSystemAuditStatus;
};

/** Resolve observability status — never blocks UI render. */
export function resolveFlexSystemAuditStatus(input: {
  runtimeUnsafe: number;
  hasPageOverflow: boolean;
}): FlexSystemAuditStatus {
  if (input.hasPageOverflow) return "BLOCKED";
  if (input.runtimeUnsafe > 0) return "WARNING";
  return "OK";
}

export function buildFlexSystemAuditReport(
  result: FlexSystemAuditResult,
  stats?: Partial<FlexSystemAuditStats>,
): FlexSystemAuditReport {
  const entryCount = stats?.baselineAllowed ?? flexFreezeManifest.baselineEntryCount;
  const runtimeUnsafe =
    stats?.runtimeUnsafe ??
    result.findings.filter((f) => f.kind === "flex-system-overflow-risk").length;

  return {
    route: result.pathname || "(unknown)",
    mode: "hard-lock",
    baselineLabel: `frozen (${entryCount} entries)`,
    newViolations: 0,
    status: resolveFlexSystemAuditStatus({
      runtimeUnsafe,
      hasPageOverflow: result.hasPageOverflow,
    }),
  };
}

/** Logga flex-system audit strutturato (DEV only, observer — no UI block). */
export function emitFlexSystemAuditWarnings(
  result: FlexSystemAuditResult,
  stats?: Partial<FlexSystemAuditStats>,
): void {
  if (!isDevAuditEnabled()) return;

  const report = buildFlexSystemAuditReport(result, stats);

  console.info(
    `${FLEX_SYSTEM_AUDIT_PREFIX}\n` +
      `route: ${report.route}\n` +
      `mode: ${report.mode}\n` +
      `baseline: ${report.baselineLabel}\n` +
      `new-violations: ${report.newViolations}\n` +
      `status: ${report.status}`,
  );

  if (result.findings.length === 0) return;

  const grouped = result.findings.slice(0, 20);
  console.groupCollapsed(
    `${FLEX_SYSTEM_AUDIT_PREFIX} ${report.route} — ${grouped.length} risk detail(s)`,
  );
  for (const f of grouped) {
    console.warn(`${FLEX_SYSTEM_AUDIT_PREFIX} risk detected`, f.message, f.target, f.detail ?? "");
  }
  console.groupEnd();
}
