/**
 * Visual Layout Linter — estrazione layout signature strutturale dal DOM.
 * Helper puri testabili senza jsdom.
 */

export type LayoutSignatureKind = "toolbar" | "table" | "modal" | "flex-group";

export type SignatureTarget = {
  kind: LayoutSignatureKind;
  descriptor: string;
  element?: Element;
};

export type ToolbarSignature = {
  type: "toolbar";
  target: string;
  gapPx: number;
  layout: "row" | "col";
  alignItems: string;
  searchFlexGrow: number | null;
  actionsShrink: boolean;
  wrapPolicy: "none" | "explicit";
};

export type TableSignature = {
  type: "table";
  target: string;
  density: "compact" | "normal" | "mixed";
  thPaddingY: number;
  thPaddingX: number;
  tdPaddingY: number;
  rowHeightPx: number | null;
  stickyHeader: boolean;
};

export type ModalSignature = {
  type: "modal";
  target: string;
  headerPaddingY: number;
  footerJustify: string;
  bodyPadding: number;
  headerAlign: string;
};

export type FlexGroupSignature = {
  type: "flex-group";
  target: string;
  justify: string;
  alignItems: string;
  hasMinW0: boolean;
  nestingDepth: number;
};

export type LayoutSignature =
  | ToolbarSignature
  | TableSignature
  | ModalSignature
  | FlexGroupSignature;

/** Parse CSS length to px (supports px, rem at 16px root). */
export function parsePx(value: string): number {
  const v = value.trim();
  if (!v || v === "auto" || v === "normal") return 0;
  if (v.endsWith("px")) return parseFloat(v) || 0;
  if (v.endsWith("rem")) return (parseFloat(v) || 0) * 16;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function classifyTableDensity(rowHeightPx: number | null, tdPaddingY: number): "compact" | "normal" | "mixed" {
  if (rowHeightPx == null) return tdPaddingY <= 4 ? "compact" : "normal";
  if (rowHeightPx >= 52 && rowHeightPx <= 60) return "normal";
  if (rowHeightPx < 48) return "compact";
  return "mixed";
}

export type StyleSnapshot = {
  display: string;
  flexDirection: string;
  gap: string;
  alignItems: string;
  justifyContent: string;
  flexWrap: string;
  flexGrow: string;
  flexShrink: string;
  minWidth: string;
  paddingTop: string;
  paddingBottom: string;
  paddingLeft: string;
  paddingRight: string;
  height: string;
  position: string;
};

export function styleSnapshotFromDeclaration(style: CSSStyleDeclaration): StyleSnapshot {
  return {
    display: style.display,
    flexDirection: style.flexDirection,
    gap: style.gap,
    alignItems: style.alignItems,
    justifyContent: style.justifyContent,
    flexWrap: style.flexWrap,
    flexGrow: style.flexGrow,
    flexShrink: style.flexShrink,
    minWidth: style.minWidth,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    paddingRight: style.paddingRight,
    height: style.height,
    position: style.position,
  };
}

export function extractToolbarSignatureFromStyles(
  target: string,
  rowStyle: StyleSnapshot,
  className: string,
  searchStyle: StyleSnapshot | null,
  actionsStyle: StyleSnapshot | null,
): ToolbarSignature {
  const gapPx = parsePx(rowStyle.gap);
  const isCol = rowStyle.flexDirection === "column";
  const wrapExplicit =
    rowStyle.flexWrap === "wrap" || rowStyle.flexWrap === "wrap-reverse" || className.includes("flex-wrap");

  return {
    type: "toolbar",
    target,
    gapPx,
    layout: isCol ? "col" : "row",
    alignItems: rowStyle.alignItems,
    searchFlexGrow: searchStyle ? parseFloat(searchStyle.flexGrow) || 0 : null,
    actionsShrink: actionsStyle
      ? parseFloat(actionsStyle.flexShrink) === 0 || className.includes("shrink-0")
      : true,
    wrapPolicy: wrapExplicit ? "explicit" : "none",
  };
}

export function extractTableSignatureFromStyles(
  target: string,
  thStyle: StyleSnapshot,
  tdStyle: StyleSnapshot,
  rowStyle: StyleSnapshot | null,
  stickyHeader: boolean,
): TableSignature {
  const thPaddingY = parsePx(thStyle.paddingTop);
  const thPaddingX = parsePx(thStyle.paddingLeft);
  const tdPaddingY = parsePx(tdStyle.paddingTop);
  const rowHeightPx = rowStyle ? parsePx(rowStyle.height) || null : null;

  return {
    type: "table",
    target,
    density: classifyTableDensity(rowHeightPx, tdPaddingY),
    thPaddingY,
    thPaddingX,
    tdPaddingY,
    rowHeightPx,
    stickyHeader,
  };
}

export function extractModalSignatureFromStyles(
  target: string,
  headerStyle: StyleSnapshot,
  bodyStyle: StyleSnapshot,
  footerStyle: StyleSnapshot | null,
): ModalSignature {
  const bodyPadding = Math.max(
    parsePx(bodyStyle.paddingTop),
    parsePx(bodyStyle.paddingLeft),
  );

  return {
    type: "modal",
    target,
    headerPaddingY: parsePx(headerStyle.paddingTop),
    footerJustify: footerStyle?.justifyContent ?? "flex-end",
    bodyPadding,
    headerAlign: headerStyle.alignItems,
  };
}

export function extractFlexGroupSignatureFromStyles(
  target: string,
  style: StyleSnapshot,
  className: string,
  nestingDepth: number,
): FlexGroupSignature {
  const hasMinW0 =
    style.minWidth === "0px" ||
    className.includes("min-w-0") ||
    className.includes("flex-safe") ||
    className.includes("flex-fill");

  return {
    type: "flex-group",
    target,
    justify: style.justifyContent,
    alignItems: style.alignItems,
    hasMinW0,
    nestingDepth,
  };
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

function getClassName(el: Element): string {
  if (!(el instanceof HTMLElement)) return "";
  return typeof el.className === "string" ? el.className : "";
}

function isFlexDisplay(style: CSSStyleDeclaration): boolean {
  return style.display === "flex" || style.display === "inline-flex";
}

function findSearchInput(container: HTMLElement): HTMLElement | null {
  const input = container.querySelector("input[type='search'], input[type='text']");
  if (!(input instanceof HTMLElement)) return null;
  let node: HTMLElement | null = input;
  while (node && node !== container) {
    const cls = getClassName(node);
    if (cls.includes("flex-1") || cls.includes("flex-fill") || cls.includes("flex-safe-item")) {
      return node;
    }
    node = node.parentElement;
  }
  return input;
}

function findActionsCluster(container: HTMLElement): HTMLElement | null {
  const buttons = container.querySelectorAll("button");
  if (buttons.length === 0) return null;
  const last = buttons[buttons.length - 1];
  return last?.parentElement instanceof HTMLElement ? last.parentElement : null;
}

/** Estrae signature toolbar da elemento DOM. */
export function extractToolbarSignature(el: HTMLElement): ToolbarSignature | null {
  const rows = el.querySelectorAll(".flex-safe-row, [class*='flex-safe-row']");
  const rowEl =
    rows.length > 0
      ? (rows[0] as HTMLElement)
      : el.querySelector(".flex, [class*='flex-row'], [class*='flex-col']") instanceof HTMLElement
        ? (el.querySelector(".flex, [class*='flex-row'], [class*='flex-col']") as HTMLElement)
        : el;

  if (!rowEl) return null;
  const rowStyle = styleSnapshotFromDeclaration(window.getComputedStyle(rowEl));
  if (!isFlexDisplay(window.getComputedStyle(rowEl))) return null;

  const searchEl = findSearchInput(rowEl);
  const actionsEl = findActionsCluster(rowEl);
  const searchStyle = searchEl ? styleSnapshotFromDeclaration(window.getComputedStyle(searchEl)) : null;
  const actionsStyle = actionsEl ? styleSnapshotFromDeclaration(window.getComputedStyle(actionsEl)) : null;

  return extractToolbarSignatureFromStyles(
    elementDescriptor(el),
    rowStyle,
    getClassName(rowEl),
    searchStyle,
    actionsStyle,
  );
}

/** Estrae signature table da wrapper o table element. */
export function extractTableSignature(wrapEl: HTMLElement): TableSignature | null {
  const table = wrapEl.tagName === "TABLE" ? wrapEl : wrapEl.querySelector("table");
  if (!(table instanceof HTMLElement)) return null;

  const th = table.querySelector("thead th, thead td");
  const td = table.querySelector("tbody tr:first-child td, tbody tr:first-child th");
  const tr = table.querySelector("tbody tr:first-child");
  if (!(th instanceof HTMLElement) || !(td instanceof HTMLElement)) return null;

  const thStyle = styleSnapshotFromDeclaration(window.getComputedStyle(th));
  const tdStyle = styleSnapshotFromDeclaration(window.getComputedStyle(td));
  const rowStyle =
    tr instanceof HTMLElement ? styleSnapshotFromDeclaration(window.getComputedStyle(tr)) : null;

  const thead = table.querySelector("thead");
  const stickyHeader =
    thead instanceof HTMLElement &&
    (window.getComputedStyle(thead).position === "sticky" ||
      getClassName(thead).includes("sticky"));

  return extractTableSignatureFromStyles(
    elementDescriptor(wrapEl),
    thStyle,
    tdStyle,
    rowStyle,
    stickyHeader,
  );
}

/** Estrae signature modal da dialog element. */
export function extractModalSignature(dialogEl: HTMLElement): ModalSignature | null {
  const header =
    dialogEl.querySelector("header") ??
    dialogEl.querySelector("[class*='border-b']");
  const footer =
    dialogEl.querySelector("footer") ??
    dialogEl.querySelector("[class*='border-t']:last-child");
  const body =
    dialogEl.querySelector("[data-cab-modal-scroll]") ??
    dialogEl.querySelector("[class*='layoutModalBodySafe']") ??
    dialogEl.querySelector("main, .overflow-y-auto, [class*='overflow-y-auto']");

  if (!(header instanceof HTMLElement) || !(body instanceof HTMLElement)) return null;

  const headerStyle = styleSnapshotFromDeclaration(window.getComputedStyle(header));
  const bodyStyle = styleSnapshotFromDeclaration(window.getComputedStyle(body));
  const footerStyle =
    footer instanceof HTMLElement
      ? styleSnapshotFromDeclaration(window.getComputedStyle(footer))
      : null;

  return extractModalSignatureFromStyles(
    elementDescriptor(dialogEl),
    headerStyle,
    bodyStyle,
    footerStyle,
  );
}

/** Estrae signature flex-group da container flex. */
export function extractFlexGroupSignature(el: HTMLElement, nestingDepth: number): FlexGroupSignature | null {
  const style = window.getComputedStyle(el);
  if (!isFlexDisplay(style)) return null;

  return extractFlexGroupSignatureFromStyles(
    elementDescriptor(el),
    styleSnapshotFromDeclaration(style),
    getClassName(el),
    nestingDepth,
  );
}

const TOOLBAR_MARKERS = ["dsPageToolbar", "PageToolbar", "flex-safe-row"];
const TABLE_MARKERS = ["globalTableWrap", "GestionaleListTable", "gestionale-list-table"];

export function isToolbarCandidate(el: HTMLElement): boolean {
  const cn = getClassName(el);
  return TOOLBAR_MARKERS.some((m) => cn.includes(m)) || el.closest("[class*='dsPageToolbar']") != null;
}

export function isTableCandidate(el: HTMLElement): boolean {
  const cn = getClassName(el);
  return TABLE_MARKERS.some((m) => cn.includes(m)) || el.tagName === "TABLE";
}

/** Scansiona root e raccoglie tutte le signature (max limit per tipo). */
export function collectLayoutSignatures(
  root: Element,
  options: {
    shouldSkip?: (el: Element) => boolean;
    maxPerKind?: number;
  } = {},
): LayoutSignature[] {
  if (typeof window === "undefined") return [];

  const maxPerKind = options.maxPerKind ?? 12;
  const counts: Record<LayoutSignatureKind, number> = {
    toolbar: 0,
    table: 0,
    modal: 0,
    "flex-group": 0,
  };
  const out: LayoutSignature[] = [];

  function push(sig: LayoutSignature) {
    if (counts[sig.type] >= maxPerKind) return;
    counts[sig.type]++;
    out.push(sig);
  }

  const walk = root.querySelectorAll("*");
  for (const el of walk) {
    if (!(el instanceof HTMLElement)) continue;
    if (options.shouldSkip?.(el)) continue;

    if (isToolbarCandidate(el)) {
      const sig = extractToolbarSignature(el);
      if (sig) push(sig);
      continue;
    }

    if (isTableCandidate(el)) {
      const sig = extractTableSignature(el);
      if (sig) push(sig);
    }
  }

  const dialogs = root.querySelectorAll("[role='dialog'], [data-cab-modal-root]");
  for (const dialog of dialogs) {
    if (!(dialog instanceof HTMLElement)) continue;
    if (options.shouldSkip?.(dialog)) continue;
    const sig = extractModalSignature(dialog);
    if (sig) push(sig);
  }

  let flexCount = 0;
  for (const el of walk) {
    if (!(el instanceof HTMLElement)) continue;
    if (options.shouldSkip?.(el)) continue;
    if (flexCount >= maxPerKind) break;

    const style = window.getComputedStyle(el);
    if (!isFlexDisplay(style)) continue;

    let depth = 0;
    let parent = el.parentElement;
    while (parent && parent !== root) {
      if (isFlexDisplay(window.getComputedStyle(parent))) depth++;
      parent = parent.parentElement;
    }
    if (depth > 3) continue;

    const sig = extractFlexGroupSignature(el, depth);
    if (sig) {
      push(sig);
      flexCount++;
    }
  }

  return out;
}
