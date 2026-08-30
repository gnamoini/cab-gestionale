/**
 * Overflow Root Cause Audit — DEV-only diagnosi clipping/orizzontale.
 * Enable: NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT=1
 * Export: window.__cabOverflowAudit()
 */

import { isInsideIntentionalHorizontalScroll } from "@/lib/ui/intentional-horizontal-scroll";
import {
  buildDomPath,
  buildElementSelector,
  resolveReactSourceHint,
  type ReactSourceHint,
} from "@/lib/observability/overflow-react-source";

export const OVERFLOW_AUDIT_LOG_PREFIX = "[OVERFLOW]";

export type OverflowKind = "viewport" | "main-clip" | "internal" | "min-width";

export type ViewportContext = {
  innerWidth: number;
  mainRight: number;
  mainClientWidth: number;
};

export type CssSnapshot = {
  width: string;
  minWidth: string;
  maxWidth: string;
  flexBasis: string;
  flexGrow: string;
  flexShrink: string;
  display: string;
  overflow: string;
  overflowX: string;
  position: string;
  transform: string;
  marginLeft: string;
  marginRight: string;
  boxSizing: string;
  whiteSpace: string;
  flexWrap: string;
};

export type RawOverflowHit = {
  selector: string;
  path: string;
  tag: string;
  className: string;
  id: string;
  rectLeft: number;
  rectRight: number;
  width: number;
  scrollWidth: number;
  clientWidth: number;
  viewportOverflowPx: number;
  mainClipPx: number;
  internalOverflowPx: number;
  kind: OverflowKind;
  overflowPx: number;
  intentionalScroll: boolean;
};

export type RootCulprit = RawOverflowHit & {
  css: CssSnapshot;
  explain: string;
  react: ReactSourceHint;
  shellClipVictim: boolean;
  widthConstraintScore: number;
  constraintReasons: string[];
};

export type OverflowAuditResult = {
  exportedAt: string;
  pathname: string;
  viewport: number;
  mainRight: number;
  hasDocumentOverflow: boolean;
  documentScrollWidth: number;
  documentClientWidth: number;
  rawHitCount: number;
  rootCulprits: RootCulprit[];
  intentionalScrollHits: number;
};

/** Parse CSS length to px (px only; rem/em approximated when window available). */
export function parseCssLength(value: string, rootFontSize = 16): number {
  if (!value || value === "auto" || value === "none" || value === "normal") return 0;
  const px = value.match(/^([\d.]+)px$/);
  if (px) return parseFloat(px[1]);
  const rem = value.match(/^([\d.]+)rem$/);
  if (rem) return parseFloat(rem[1]) * rootFontSize;
  const em = value.match(/^([\d.]+)em$/);
  if (em) return parseFloat(em[1]) * rootFontSize;
  return 0;
}

export function pickOverflowKind(
  viewportOverflowPx: number,
  mainClipPx: number,
  internalOverflowPx: number,
  minWidthOverflow: boolean,
): OverflowKind {
  if (viewportOverflowPx > 0) return "viewport";
  if (mainClipPx > 0) return "main-clip";
  if (minWidthOverflow) return "min-width";
  return "internal";
}

export function computeOverflowPx(
  viewportOverflowPx: number,
  mainClipPx: number,
  internalOverflowPx: number,
): number {
  return Math.max(viewportOverflowPx, mainClipPx, internalOverflowPx);
}

export type ElementMetricsInput = {
  rectLeft: number;
  rectRight: number;
  rectWidth: number;
  scrollWidth: number;
  clientWidth: number;
  minWidthPx: number;
};

export function computeElementOverflowMetrics(
  metrics: ElementMetricsInput,
  ctx: ViewportContext,
): {
  viewportOverflowPx: number;
  mainClipPx: number;
  internalOverflowPx: number;
  minWidthOverflow: boolean;
  overflowPx: number;
  kind: OverflowKind;
  hasOverflow: boolean;
} {
  const viewportOverflowPx = Math.max(0, metrics.rectRight - ctx.innerWidth - 1);
  const mainClipPx = Math.max(0, metrics.rectRight - ctx.mainRight - 1);
  const internalOverflowPx = Math.max(0, metrics.scrollWidth - metrics.clientWidth - 1);
  const minWidthOverflow = metrics.minWidthPx > metrics.clientWidth + 1;

  const hasOverflow =
    viewportOverflowPx > 0 || mainClipPx > 0 || internalOverflowPx > 0 || minWidthOverflow;

  const kind = pickOverflowKind(viewportOverflowPx, mainClipPx, internalOverflowPx, minWidthOverflow);
  const overflowPx = computeOverflowPx(viewportOverflowPx, mainClipPx, internalOverflowPx);

  return {
    viewportOverflowPx,
    mainClipPx,
    internalOverflowPx,
    minWidthOverflow,
    overflowPx,
    kind,
    hasOverflow,
  };
}

export function captureCssSnapshot(el: Element): CssSnapshot {
  if (typeof window === "undefined") {
    return {
      width: "",
      minWidth: "",
      maxWidth: "",
      flexBasis: "",
      flexGrow: "",
      flexShrink: "",
      display: "",
      overflow: "",
      overflowX: "",
      position: "",
      transform: "",
      marginLeft: "",
      marginRight: "",
      boxSizing: "",
      whiteSpace: "",
      flexWrap: "",
    };
  }
  const cs = window.getComputedStyle(el);
  return {
    width: cs.width,
    minWidth: cs.minWidth,
    maxWidth: cs.maxWidth,
    flexBasis: cs.flexBasis,
    flexGrow: cs.flexGrow,
    flexShrink: cs.flexShrink,
    display: cs.display,
    overflow: cs.overflow,
    overflowX: cs.overflowX,
    position: cs.position,
    transform: cs.transform,
    marginLeft: cs.marginLeft,
    marginRight: cs.marginRight,
    boxSizing: cs.boxSizing,
    whiteSpace: cs.whiteSpace,
    flexWrap: cs.flexWrap,
  };
}

export type WidthConstraintResult = {
  score: number;
  reasons: string[];
};

/** Punteggio vincolo larghezza — più alto = più probabile root cause. */
export function scoreWidthConstraint(
  className: string,
  css: CssSnapshot,
  clientWidth: number,
  scrollWidth: number,
  childrenScrollSum: number,
  ctx: ViewportContext,
): WidthConstraintResult {
  const reasons: string[] = [];
  let score = 0;

  const minW = parseCssLength(css.minWidth);
  if (minW > clientWidth + 1) {
    score += 10;
    reasons.push(`min-width: ${css.minWidth}`);
  }
  if (minW > ctx.innerWidth) {
    score += 20;
    reasons.push(`min-width ${minW}px > viewport ${ctx.innerWidth}px`);
  }

  const widthPx = parseCssLength(css.width);
  if (css.width.endsWith("px") && widthPx > ctx.innerWidth) {
    score += 15;
    reasons.push(`fixed width: ${css.width}`);
  }

  if (className.includes("min-w-[") || /\bmin-w-\d/.test(className)) {
    score += 5;
    reasons.push("Tailwind min-w-* class");
  }
  if (className.includes("flex-nowrap")) {
    score += 8;
    reasons.push("flex-nowrap");
  }
  if (className.includes("whitespace-nowrap")) {
    score += 3;
    reasons.push("whitespace-nowrap");
  }
  if (className.includes("w-max")) {
    score += 5;
    reasons.push("w-max");
  }

  if (
    (css.display === "flex" || css.display === "inline-flex") &&
    css.flexWrap === "nowrap" &&
    childrenScrollSum > clientWidth + 1
  ) {
    score += 12;
    reasons.push(
      `flex nowrap: children scroll sum ${childrenScrollSum}px > container ${clientWidth}px`,
    );
  }

  if (scrollWidth > clientWidth + 1 && internalOverflowScore(css)) {
    score += 4;
    reasons.push(`scrollWidth ${scrollWidth}px > clientWidth ${clientWidth}px`);
  }

  return { score, reasons };
}

function internalOverflowScore(css: CssSnapshot): boolean {
  return css.overflowX !== "auto" && css.overflowX !== "scroll" && css.overflow !== "auto";
}

export function buildOverflowExplain(
  css: CssSnapshot,
  ctx: ViewportContext,
  overflowPx: number,
  kind: OverflowKind,
  constraintReasons: string[],
  intentionalScroll: boolean,
  shellClipVictim: boolean,
): string {
  const parts: string[] = [];

  if (constraintReasons.length > 0) {
    parts.push(constraintReasons.join("; "));
  } else if (css.minWidth && css.minWidth !== "0px" && css.minWidth !== "auto") {
    parts.push(`min-width: ${css.minWidth}`);
  }

  parts.push(`eccede di ${overflowPx.toFixed(1)}px (${kind})`);

  if (kind === "main-clip" || shellClipVictim) {
    parts.push(
      `contenuto oltre main (${ctx.mainClientWidth}px); .cab-app-shell overflow-hidden può tagliare visivamente`,
    );
  }

  if (intentionalScroll) {
    parts.push("dentro scope scroll orizzontale intenzionale");
  }

  if (css.overflowX !== "auto" && css.overflowX !== "scroll" && overflowPx > 0) {
    parts.push(`parent/container senza overflow-x attivo (${css.overflowX})`);
  }

  return parts.join(" → ");
}

function isMeasurableElement(el: unknown): el is HTMLElement {
  return (
    typeof el === "object" &&
    el !== null &&
    "scrollWidth" in el &&
    "clientWidth" in el &&
    "getBoundingClientRect" in el
  );
}

function sumChildrenScrollWidth(el: HTMLElement): number {
  let sum = 0;
  for (const child of el.children) {
    if (isMeasurableElement(child)) sum += child.scrollWidth;
  }
  return sum;
}

function rawHitFromElement(el: HTMLElement, ctx: ViewportContext): RawOverflowHit | null {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;

  const cs = window.getComputedStyle(el);
  if (cs.position === "fixed" || cs.display === "none" || cs.visibility === "hidden") return null;

  const minWidthPx = parseCssLength(cs.minWidth);
  const metrics = computeElementOverflowMetrics(
    {
      rectLeft: rect.left,
      rectRight: rect.right,
      rectWidth: rect.width,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      minWidthPx,
    },
    ctx,
  );

  if (!metrics.hasOverflow) return null;

  const intentionalScroll = isInsideIntentionalHorizontalScroll(el);

  return {
    selector: buildElementSelector(el),
    path: buildDomPath(el),
    tag: el.tagName.toLowerCase(),
    className: typeof el.className === "string" ? el.className : "",
    id: el.id,
    rectLeft: rect.left,
    rectRight: rect.right,
    width: rect.width,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    viewportOverflowPx: metrics.viewportOverflowPx,
    mainClipPx: metrics.mainClipPx,
    internalOverflowPx: metrics.internalOverflowPx,
    kind: metrics.kind,
    overflowPx: metrics.overflowPx,
    intentionalScroll,
  };
}

/** Promuove hit al primo antenato che genera la larghezza eccessiva. */
export function promoteToRootElement(
  hitEl: HTMLElement,
  main: HTMLElement,
  ctx: ViewportContext,
): { element: HTMLElement; score: number; reasons: string[] } {
  let bestEl = hitEl;
  let bestScore = 0;
  let bestReasons: string[] = [];

  let node: HTMLElement | null = hitEl;
  while (node && main.contains(node)) {
    const cn = typeof node.className === "string" ? node.className : "";
    const css = captureCssSnapshot(node);
    const { score, reasons } = scoreWidthConstraint(
      cn,
      css,
      node.clientWidth,
      node.scrollWidth,
      sumChildrenScrollWidth(node),
      ctx,
    );
    if (score > bestScore) {
      bestScore = score;
      bestEl = node;
      bestReasons = reasons;
    }
    if (node === main) break;
    node = node.parentElement;
  }

  if (bestScore === 0) {
    let candidate = hitEl;
    let current: HTMLElement | null = hitEl;
    while (
      current?.parentElement &&
      current.parentElement !== main &&
      main.contains(current.parentElement)
    ) {
      const parent: HTMLElement = current.parentElement;
      const parentRect = parent.getBoundingClientRect();
      if (parentRect.right > ctx.mainRight + 1 || parentRect.right > ctx.innerWidth + 1) {
        candidate = parent;
        current = parent;
      } else {
        break;
      }
    }
    bestEl = candidate;
  }

  return { element: bestEl, score: bestScore, reasons: bestReasons };
}

export function findRootCulpritsFromHits(
  hits: Array<{ element: HTMLElement; hit: RawOverflowHit }>,
  main: HTMLElement,
  ctx: ViewportContext,
): RootCulprit[] {
  const map = new Map<string, RootCulprit>();

  for (const { element } of hits) {
    const { element: rootEl, score, reasons } = promoteToRootElement(element, main, ctx);
    const raw = rawHitFromElement(rootEl, ctx);
    if (!raw) continue;

    const css = captureCssSnapshot(rootEl);
    const react = resolveReactSourceHint(rootEl);
    const hasDocOverflow =
      typeof document !== "undefined" &&
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const shellClipVictim =
      !hasDocOverflow && (raw.mainClipPx > 0 || raw.kind === "main-clip");

    const culprit: RootCulprit = {
      ...raw,
      css,
      explain: buildOverflowExplain(
        css,
        ctx,
        raw.overflowPx,
        raw.kind,
        reasons,
        raw.intentionalScroll,
        shellClipVictim,
      ),
      react,
      shellClipVictim,
      widthConstraintScore: score,
      constraintReasons: reasons,
    };

    const dedupeKey = `${culprit.selector}::${culprit.kind}::${culprit.react.component ?? culprit.path}`;
    const existing = map.get(dedupeKey);
    if (!existing || culprit.overflowPx > existing.overflowPx) {
      map.set(dedupeKey, culprit);
    }
  }

  return [...map.values()].sort((a, b) => b.overflowPx - a.overflowPx);
}

export function scanOverflowElements(scope: Element, ctx: ViewportContext): RawOverflowHit[] {
  if (typeof window === "undefined") return [];

  const out: RawOverflowHit[] = [];
  const walk = scope.querySelectorAll("*");

  for (const el of walk) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest("[role='dialog'], [aria-modal='true'], [data-cab-modal-root]")) continue;

    const hit = rawHitFromElement(el, ctx);
    if (hit) out.push(hit);
  }

  return out;
}

function isAuditEnabled(): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_OVERFLOW_ROOT_CAUSE_AUDIT === "1";
}

export function runOverflowRootCauseAudit(pathname = ""): OverflowAuditResult {
  const empty: OverflowAuditResult = {
    exportedAt: new Date().toISOString(),
    pathname,
    viewport: 0,
    mainRight: 0,
    hasDocumentOverflow: false,
    documentScrollWidth: 0,
    documentClientWidth: 0,
    rawHitCount: 0,
    rootCulprits: [],
    intentionalScrollHits: 0,
  };

  if (!isAuditEnabled() || typeof window === "undefined" || typeof document === "undefined") {
    return empty;
  }

  const main = document.querySelector(".cab-app-shell main");
  if (!(main instanceof HTMLElement)) return empty;

  const mainRect = main.getBoundingClientRect();
  const ctx: ViewportContext = {
    innerWidth: window.innerWidth,
    mainRight: mainRect.right,
    mainClientWidth: main.clientWidth,
  };

  const rawHits: RawOverflowHit[] = [];
  const hitElements: Array<{ element: HTMLElement; hit: RawOverflowHit }> = [];

  const walk = main.querySelectorAll("*");
  for (const el of walk) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest("[role='dialog'], [aria-modal='true'], [data-cab-modal-root]")) continue;
    const hit = rawHitFromElement(el, ctx);
    if (!hit) continue;
    rawHits.push(hit);
    hitElements.push({ element: el, hit });
  }

  const rootCulprits = findRootCulpritsFromHits(hitElements, main, ctx);
  const doc = document.documentElement;

  return {
    exportedAt: new Date().toISOString(),
    pathname: pathname || window.location.pathname,
    viewport: ctx.innerWidth,
    mainRight: ctx.mainRight,
    hasDocumentOverflow: doc.scrollWidth > doc.clientWidth + 1,
    documentScrollWidth: doc.scrollWidth,
    documentClientWidth: doc.clientWidth,
    rawHitCount: rawHits.length,
    rootCulprits: rootCulprits.filter((c) => !c.intentionalScroll),
    intentionalScrollHits: rawHits.filter((h) => h.intentionalScroll).length,
  };
}

export function emitOverflowAuditLogs(result: OverflowAuditResult): void {
  if (!isAuditEnabled()) return;

  const culprits = result.rootCulprits.slice(0, 25);
  if (culprits.length === 0 && !result.hasDocumentOverflow) return;

  console.groupCollapsed(
    `${OVERFLOW_AUDIT_LOG_PREFIX} ${result.pathname} — ${culprits.length} root culprit(s), ${result.rawHitCount} raw hit(s)`,
  );

  for (const c of culprits) {
    console.warn(
      `${OVERFLOW_AUDIT_LOG_PREFIX}\n` +
        `selector: ${c.selector}\n` +
        `path: ${c.path}\n` +
        `right: ${c.rectRight.toFixed(1)}\n` +
        `viewport: ${result.viewport}\n` +
        `overflowPx: ${c.overflowPx.toFixed(1)}`,
    );
    console.log({
      tag: c.tag,
      className: c.className,
      id: c.id,
      left: c.rectLeft,
      width: c.width,
      scrollWidth: c.scrollWidth,
      clientWidth: c.clientWidth,
      mainClipPx: c.mainClipPx,
      kind: c.kind,
      component: c.react.component,
      file: c.react.file,
      explain: c.explain,
    });
  }

  if (result.hasDocumentOverflow) {
    console.warn(
      `${OVERFLOW_AUDIT_LOG_PREFIX} document scrollWidth=${result.documentScrollWidth} > clientWidth=${result.documentClientWidth}`,
    );
  }

  console.groupEnd();
}

export function exportOverflowAuditReport(pathname?: string): OverflowAuditResult {
  return runOverflowRootCauseAudit(pathname ?? (typeof window !== "undefined" ? window.location.pathname : ""));
}

declare global {
  interface Window {
    __cabOverflowAudit?: typeof exportOverflowAuditReport;
  }
}

if (typeof window !== "undefined" && isAuditEnabled()) {
  window.__cabOverflowAudit = exportOverflowAuditReport;
}
