/**
 * UI Autonomy Fix — safety layer.
 * Blocca fix che alterano struttura DOM o rischio UX drift elevato.
 */

import { VISUAL_LAYOUT_ALLOWLIST } from "@/lib/ui-visual-linter/layout-rules";
import type { UIFix } from "@/lib/ui-autonomy-fix/fix-strategies";

export type FixRiskLevel = "low" | "medium" | "high";

export type FixSafetyResult = {
  allowed: boolean;
  reason?: string;
};

const BLOCKED_TAG_NAMES = new Set(["TABLE", "THEAD", "TBODY", "TR", "TD", "TH"]);

/** Classi vietate — potrebbero alterare layout hierarchy o comportamento. */
const BLOCKED_CLASS_TOKENS = [
  "hidden",
  "fixed",
  "absolute",
  "sticky",
  "grid-cols",
  "flex-col",
  "flex-row",
  "w-full",
  "h-full",
  "overflow-hidden",
  "z-",
] as const;

export function isDevFixEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isElementAllowlisted(el: Element, pageId: string): boolean {
  if (typeof HTMLElement === "undefined") return false;
  const htmlEl = el as HTMLElement;
  const cn = typeof htmlEl.className === "string" ? htmlEl.className : "";

  if (VISUAL_LAYOUT_ALLOWLIST.classTokens.some((t) => cn.includes(t))) return true;

  for (const sel of VISUAL_LAYOUT_ALLOWLIST.selectors) {
    try {
      if (htmlEl.matches?.(sel) || htmlEl.closest?.(sel)) return true;
    } catch {
      /* ignore */
    }
  }

  if (VISUAL_LAYOUT_ALLOWLIST.pathnameSubstrings.some((s) => pageId.includes(s))) {
    if (cn.includes("kanban") || htmlEl.closest?.("[class*='kanban']")) return true;
  }

  return false;
}

export function wouldAlterDomStructure(_fix: UIFix, _el: Element): boolean {
  /* Solo add-class ammesso — mai structural actions in questo engine. */
  return _fix.action !== "add-class" &&
    _fix.action !== "fix-flex" &&
    _fix.action !== "align-adjust" &&
    _fix.action !== "normalize-spacing";
}

export function assessFixRisk(fix: UIFix): FixRiskLevel {
  return fix.risk;
}

/** Valuta se un fix può essere applicato in sicurezza. */
export function validateFixSafety(
  fix: UIFix,
  el: Element | null,
  pageId: string,
): FixSafetyResult {
  if (!fix.safe) {
    return { allowed: false, reason: "fix marked unsafe" };
  }

  if (fix.risk === "high") {
    return { allowed: false, reason: "high severity — flagged only" };
  }

  if (!isDevFixEnabled()) {
    return { allowed: false, reason: "not development" };
  }

  if (!el || typeof HTMLElement === "undefined" || !(el instanceof HTMLElement)) {
    return { allowed: false, reason: "element not found" };
  }

  if (isElementAllowlisted(el, pageId)) {
    return { allowed: false, reason: "allowlisted element" };
  }

  if (BLOCKED_TAG_NAMES.has(el.tagName)) {
    return { allowed: false, reason: "structural table element" };
  }

  if (el.getAttribute("role") === "dialog" && fix.action === "normalize-spacing") {
    /* modal shell — spacing fix ok on header/footer/body children only */
  }

  for (const token of fix.classes ?? []) {
    if (BLOCKED_CLASS_TOKENS.some((b) => token.includes(b))) {
      return { allowed: false, reason: `blocked class token: ${token}` };
    }
  }

  if (el.childElementCount === 0 && fix.action === "align-adjust") {
    return { allowed: false, reason: "align-adjust requires children" };
  }

  return { allowed: true };
}

/** True se il fix altererebbe la gerarchia (solo class-level = false). */
export function wouldChangeLayoutHierarchy(_fix: UIFix): boolean {
  return false;
}
