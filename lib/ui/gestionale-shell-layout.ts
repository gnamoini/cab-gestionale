/**
 * SSOT larghezza colonna contenuto e tier shell (mobile / tablet / desktop).
 * Usuario IDE: misura min tra shell, colonna flex-1, main e viewport effettivo.
 */

import { MAIN_SCROLL_LOCK_ATTR } from "@/lib/ui/scroll-lock-attrs";

export type GestionaleShellTier = "mobile" | "tablet" | "desktop";

export const GESTIONALE_SHELL_TIER_ATTR = "data-gestionale-shell-tier";

export const GESTIONALE_SHELL_CONTENT_WIDTH_VAR = "--cab-shell-content-width";

/** Larghezza host misurata (min innerWidth, doc client, shell). */
export const CAB_HOST_LAYOUT_WIDTH_VAR = "--cab-host-layout-width";

/** Larghezza utile main (clientWidth, esclude colonna scrollbar). */
export const CAB_MAIN_CONTENT_WIDTH_VAR = "--cab-main-content-width";

/** Inset colonna scrollbar main — padding header mirror, evita max-width jump. */
export const CAB_MAIN_SCROLLBAR_INSET_VAR = "--cab-main-scrollbar-inset";

export function measureElementLayoutWidth(el: {
  clientWidth: number;
  getBoundingClientRect: () => { width: number; left?: number; right?: number };
}): number {
  const client = el.clientWidth;
  const rect = el.getBoundingClientRect().width;
  if (client <= 0 && rect <= 0) return 0;
  if (client <= 0) return rect;
  if (rect <= 0) return client;
  return Math.min(client, rect);
}

/** Larghezza visibile nel viewport (preview IDE con iframe più largo del pannello). */
export function resolveElementVisibleLayoutWidth(el: HTMLElement): number {
  const layout = measureElementLayoutWidth(el);
  if (typeof window === "undefined") return layout;
  const vv = window.visualViewport;
  if (!vv) return layout;
  const rect = el.getBoundingClientRect();
  const visibleRight = Math.min(rect.right, vv.offsetLeft + vv.width);
  const visibleLeft = Math.max(rect.left, vv.offsetLeft);
  const visible = Math.max(0, visibleRight - visibleLeft);
  if (visible <= 0) return layout;
  return Math.min(layout, visible);
}

function isLayoutMeasurable(el: unknown): el is HTMLElement {
  if (typeof el !== "object" || el === null) return false;
  const node = el as { clientWidth?: unknown; getBoundingClientRect?: unknown };
  return typeof node.clientWidth === "number" && typeof node.getBoundingClientRect === "function";
}

export type ResolveHostLayoutWidthOptions = {
  shellEl?: HTMLElement | null;
};

/** Larghezza host — min tra innerWidth, visualViewport e document client (no shell: evita feedback loop CSS). */
export function resolveHostLayoutWidth(_opts: ResolveHostLayoutWidthOptions = {}): number {
  if (typeof window === "undefined") return 0;

  const inner = window.innerWidth;
  const vv = window.visualViewport?.width ?? inner;
  const docClient = document.documentElement.clientWidth;
  return Math.max(0, Math.min(inner, vv, docClient > 0 ? docClient : inner));
}

export type SyncHostLayoutWidthCssVarsOptions = {
  shellEl?: HTMLElement | null;
  mainEl?: HTMLElement | null;
};

const CSS_VAR_WRITE_THRESHOLD_PX = 2;

function setPxVarIfChanged(root: HTMLElement, name: string, px: number | null): void {
  if (px == null || px <= 0) {
    if (root.style.getPropertyValue(name)) root.style.removeProperty(name);
    return;
  }
  const next = `${Math.round(px)}px`;
  const prev = root.style.getPropertyValue(name);
  const prevNum = prev ? parseInt(prev, 10) : NaN;
  if (!Number.isNaN(prevNum) && Math.abs(prevNum - Math.round(px)) < CSS_VAR_WRITE_THRESHOLD_PX) return;
  if (prev === next) return;
  root.style.setProperty(name, next);
}

function resolveFrozenMainScrollbarInset(main: HTMLElement, measured: number): number {
  if (!main.hasAttribute(MAIN_SCROLL_LOCK_ATTR)) return measured;
  const lockedPad = parseInt(main.style.paddingInlineEnd, 10);
  if (Number.isFinite(lockedPad) && lockedPad > 0) return lockedPad;
  const prev = parseInt(
    document.documentElement.style.getPropertyValue(CAB_MAIN_SCROLLBAR_INSET_VAR),
    10,
  );
  if (Number.isFinite(prev) && prev > 0) return prev;
  return measured;
}

/** Sincronizza --cab-main-content-width e --cab-main-scrollbar-inset (no host width su html). */
export function syncHostLayoutWidthCssVars(
  opts: SyncHostLayoutWidthCssVarsOptions = {},
): { hostWidth: number; mainContentWidth: number | null } {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { hostWidth: 0, mainContentWidth: null };
  }

  const hostWidth = resolveHostLayoutWidth();
  const root = document.documentElement;

  if (root.style.getPropertyValue(CAB_HOST_LAYOUT_WIDTH_VAR)) {
    root.style.removeProperty(CAB_HOST_LAYOUT_WIDTH_VAR);
  }

  const main =
    opts.mainEl ??
    (typeof document !== "undefined" ? document.querySelector("main.gestionale-scroll-y") : null);

  let mainContentWidth: number | null = null;
  if (isLayoutMeasurable(main) && main.clientWidth > 0) {
    mainContentWidth = main.clientWidth;
    setPxVarIfChanged(root, CAB_MAIN_CONTENT_WIDTH_VAR, mainContentWidth);
    const measuredInset = Math.max(0, Math.round(main.offsetWidth - main.clientWidth));
    const scrollbarInset = resolveFrozenMainScrollbarInset(main, measuredInset);
    setPxVarIfChanged(root, CAB_MAIN_SCROLLBAR_INSET_VAR, scrollbarInset > 0 ? scrollbarInset : null);
  } else {
    if (root.style.getPropertyValue(CAB_MAIN_CONTENT_WIDTH_VAR)) {
      root.style.removeProperty(CAB_MAIN_CONTENT_WIDTH_VAR);
    }
    if (root.style.getPropertyValue(CAB_MAIN_SCROLLBAR_INSET_VAR)) {
      root.style.removeProperty(CAB_MAIN_SCROLLBAR_INSET_VAR);
    }
  }

  return { hostWidth, mainContentWidth };
}

/** Viewport effettivo — preview IDE / visualViewport / host layout. */
export function resolveGestionaleShellViewportWidth(): number {
  return resolveHostLayoutWidth();
}

export type ResolveGestionaleShellContentWidthOptions = {
  shellEl?: HTMLElement | null;
  shellColEl?: HTMLElement | null;
  mainEl?: HTMLElement | null;
};

/** Larghezza utile colonna contenuto — min tra shell, colonna, main, viewport. */
export function resolveGestionaleShellContentWidth(
  opts: ResolveGestionaleShellContentWidthOptions = {},
): number {
  const hasExplicitEls = Boolean(opts.shellEl ?? opts.shellColEl ?? opts.mainEl);
  if (typeof document === "undefined" && !hasExplicitEls) return 0;

  const widths: number[] = [];

  if (typeof window !== "undefined") {
    const viewport = resolveGestionaleShellViewportWidth();
    if (viewport > 0) widths.push(viewport);
  }

  const shell =
    opts.shellEl ??
    (typeof document !== "undefined" ? document.querySelector(".cab-app-shell") : null);
  if (isLayoutMeasurable(shell)) {
    const w = resolveElementVisibleLayoutWidth(shell);
    if (w > 0) widths.push(w);
  }

  const shellCol =
    opts.shellColEl ??
    (typeof document !== "undefined" ? document.querySelector(".cab-app-shell > div.flex-1") : null);
  if (isLayoutMeasurable(shellCol)) {
    const w = resolveElementVisibleLayoutWidth(shellCol);
    if (w > 0) widths.push(w);
  }

  const main =
    opts.mainEl ??
    (typeof document !== "undefined" ? document.querySelector("main.gestionale-scroll-y") : null);
  if (isLayoutMeasurable(main)) {
    const w = resolveElementVisibleLayoutWidth(main);
    if (w > 0) widths.push(w);
  }

  if (typeof window !== "undefined") {
    const frame = window.frameElement;
    if (isLayoutMeasurable(frame)) {
      const w = resolveElementVisibleLayoutWidth(frame);
      if (w > 0) widths.push(w);
    }
  }

  if (widths.length === 0) return 0;
  return Math.max(0, Math.min(...widths));
}

export const GESTIONALE_SHELL_TABLET_MIN_WIDTH = 768;
/** Soglia desktop shell — preview IDE spesso ~1362px: sotto 1400 = layout compatto. */
export const GESTIONALE_SHELL_DESKTOP_MIN_WIDTH = 1400;

/** Tier shell — desktop solo >= 1400px (preview Cursor ~1362 resta tablet/compatto). */
export function resolveGestionaleShellTier(contentWidth: number): GestionaleShellTier {
  if (contentWidth < GESTIONALE_SHELL_TABLET_MIN_WIDTH) return "mobile";
  if (contentWidth < GESTIONALE_SHELL_DESKTOP_MIN_WIDTH) return "tablet";
  return "desktop";
}

export function gestionaleShellContentGutterClass(tier: GestionaleShellTier): string {
  return tier === "mobile" ? "px-3" : "px-5";
}

export function readGestionaleShellTierFromDom(): GestionaleShellTier | null {
  if (typeof document === "undefined") return null;
  const shell = document.querySelector(".cab-app-shell");
  if (!(shell instanceof HTMLElement)) return null;
  const tier = shell.getAttribute(GESTIONALE_SHELL_TIER_ATTR);
  if (tier === "mobile" || tier === "tablet" || tier === "desktop") return tier;
  return null;
}
