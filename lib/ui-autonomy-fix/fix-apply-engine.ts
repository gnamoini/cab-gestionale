/**
 * UI Autonomy Fix — applicazione safe patch class-level (DEV only).
 */

import { hasFlexContainmentMarker } from "@/lib/ui/global-flex-system";
import { validateFixSafety } from "@/lib/ui-autonomy-fix/fix-safety-guard";
import type { UIFix } from "@/lib/ui-autonomy-fix/fix-strategies";

export const UI_AUTONOMY_APPLIED_ATTR = "data-ui-autonomy-applied";

export type AppliedFix = {
  fix: UIFix;
  element: string;
  classesAdded: string[];
};

export type ApplyFixResult = {
  applied: AppliedFix[];
  skipped: Array<{ fix: UIFix; reason: string }>;
};

function elementDescriptor(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls =
    el instanceof HTMLElement && el.className && typeof el.className === "string"
      ? `.${el.className.split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${tag}${id}${cls}`;
}

/** Risolve elemento da descriptor linter (tag#id.class1.class2). */
export function findElementByDescriptor(root: Element, descriptor: string): HTMLElement | null {
  if (typeof HTMLElement === "undefined") return null;

  if (elementDescriptor(root) === descriptor && root instanceof HTMLElement) {
    return root;
  }

  for (const el of root.querySelectorAll("*")) {
    if (elementDescriptor(el) === descriptor && el instanceof HTMLElement) {
      return el;
    }
  }

  /* Fallback: match parziale sulle prime classi */
  const parts = descriptor.split(".");
  const tag = parts[0]?.split("#")[0] ?? "";
  const classes = parts.slice(1).filter(Boolean);

  for (const el of root.querySelectorAll(tag || "*")) {
    if (!(el instanceof HTMLElement)) continue;
    const cn = el.className;
    if (typeof cn !== "string") continue;
    if (classes.length > 0 && classes.every((c) => cn.includes(c))) {
      return el;
    }
  }

  return null;
}

/** Trova target più specifico per rule (search input, footer, etc.). */
export function resolveFixTarget(root: Element, fix: UIFix): HTMLElement | null {
  const direct = findElementByDescriptor(root, fix.target);
  if (direct) return refineTargetForRule(direct, fix);

  /* Page-level target (cross-instance) — skip */
  if (!fix.target.includes(".")) return null;

  return null;
}

function refineTargetForRule(el: HTMLElement, fix: UIFix): HTMLElement {
  switch (fix.rule) {
    case "toolbar-search-flex": {
      const input = el.querySelector("input") ?? el.closest("form")?.querySelector("input");
      if (input instanceof HTMLElement) return input.parentElement instanceof HTMLElement ? input.parentElement : input;
      return el;
    }
    case "toolbar-actions-shrink": {
      const btn = el.querySelector("button");
      if (btn?.parentElement instanceof HTMLElement) return btn.parentElement;
      return el;
    }
    case "modal-footer-alignment": {
      const footer = el.querySelector("footer") ?? el.closest("[role='dialog']")?.querySelector("footer");
      if (footer instanceof HTMLElement) return footer;
      return el;
    }
    case "modal-body-padding": {
      const body =
        el.querySelector("[data-cab-modal-scroll]") ??
        el.querySelector("[class*='layoutModalBodySafe']");
      if (body instanceof HTMLElement) return body;
      return el;
    }
    case "modal-header-padding": {
      const header = el.querySelector("header") ?? el.closest("[role='dialog']")?.querySelector("header");
      if (header instanceof HTMLElement) return header;
      return el;
    }
    case "table-header-padding": {
      const th = el.querySelector("thead th");
      if (th instanceof HTMLElement) return th;
      return el;
    }
    default:
      return el;
  }
}

function classAlreadyPresent(el: HTMLElement, cls: string): boolean {
  const cn = el.className;
  if (typeof cn !== "string") return false;
  if (cn.split(/\s+/).includes(cls)) return true;

  if (cls === "min-w-0" && hasFlexContainmentMarker(cn)) return true;
  if (cls === "flex-1" && (cn.includes("flex-1") || cn.includes("grow"))) return true;
  if (cls === "shrink-0" && (cn.includes("shrink-0") || cn.includes("flex-shrink-0"))) return true;
  if (cls === "gap-2" && /\bgap-\d+\b/.test(cn)) return true;
  if (cls === "items-center" && cn.includes("items-center")) return true;
  if (cls === "justify-end" && cn.includes("justify-end")) return true;
  if (cls === "p-4" && /\bp-\d+\b/.test(cn)) return true;
  if (cls === "py-3" && cn.includes("py-3")) return true;

  return false;
}

/** Applica classi mancanti — solo add, mai remove/replace. */
export function applyFixToElement(el: HTMLElement, fix: UIFix): string[] {
  const added: string[] = [];

  for (const cls of fix.classes) {
    if (classAlreadyPresent(el, cls)) continue;
    el.classList.add(cls);
    added.push(cls);
  }

  if (added.length > 0) {
    el.setAttribute(UI_AUTONOMY_APPLIED_ATTR, fix.rule);
  }

  return added;
}

/** Applica batch di fix con safety guard. */
export function applyFixes(
  root: Element,
  fixes: UIFix[],
  pageId: string,
): ApplyFixResult {
  const applied: AppliedFix[] = [];
  const skipped: ApplyFixResult["skipped"] = [];

  if (typeof HTMLElement === "undefined") {
    return { applied, skipped: fixes.map((f) => ({ fix: f, reason: "no dom" })) };
  }

  for (const fix of fixes) {
    const el = resolveFixTarget(root, fix);
    const safety = validateFixSafety(fix, el, pageId);

    if (!safety.allowed || !el) {
      skipped.push({ fix, reason: safety.reason ?? "element not found" });
      continue;
    }

    const classesAdded = applyFixToElement(el, fix);
    if (classesAdded.length === 0) {
      skipped.push({ fix, reason: "classes already present" });
      continue;
    }

    applied.push({
      fix,
      element: elementDescriptor(el),
      classesAdded,
    });
  }

  return { applied, skipped };
}
