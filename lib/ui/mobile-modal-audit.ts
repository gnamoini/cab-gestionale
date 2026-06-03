/**
 * Audit modali mobile — solo DEV, non blocking.
 */

import {
  CAB_MODAL_ROOT_ATTR,
  CAB_MODAL_SCROLL_ATTR,
} from "@/lib/ui/mobile-modal-behavior";

export type MobileModalFindingKind =
  | "modal-without-scroll-body"
  | "scroll-body-missing-min-h-0";

export type MobileModalFinding = {
  kind: MobileModalFindingKind;
  message: string;
  target: string;
};

const LOG_PREFIX = "[MobileModalAudit]";

function modalDescriptor(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const role = el.getAttribute("role") ?? "";
  return `${tag}${id}${role ? `[role=${role}]` : ""}`;
}

/** Modali aperti senza corpo scroll marcato. */
export function findModalsWithoutScrollBody(): Element[] {
  if (typeof document === "undefined") return [];
  const roots = document.querySelectorAll(`[${CAB_MODAL_ROOT_ATTR}]`);
  const out: Element[] = [];
  for (const root of roots) {
    if (!root.querySelector(`[${CAB_MODAL_SCROLL_ATTR}]`)) {
      out.push(root);
    }
  }
  return out;
}

export function runMobileModalAudit(): MobileModalFinding[] {
  if (process.env.NODE_ENV !== "development" || typeof document === "undefined") {
    return [];
  }

  const findings: MobileModalFinding[] = [];

  for (const root of findModalsWithoutScrollBody()) {
    findings.push({
      kind: "modal-without-scroll-body",
      message: "Modale aperta senza discendente data-cab-modal-scroll",
      target: modalDescriptor(root),
    });
  }

  for (const scroll of document.querySelectorAll(`[${CAB_MODAL_SCROLL_ATTR}]`)) {
    if (!(scroll instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(scroll);
    if (style.minHeight !== "0px" && !scroll.className.includes("min-h-0")) {
      findings.push({
        kind: "scroll-body-missing-min-h-0",
        message: "Corpo scroll modale senza min-h-0 — rischio overflow flex",
        target: modalDescriptor(scroll),
      });
    }
  }

  return findings;
}

export function emitMobileModalAuditWarnings(findings: MobileModalFinding[]): void {
  if (process.env.NODE_ENV !== "development" || findings.length === 0) return;
  console.groupCollapsed(`${LOG_PREFIX} ${findings.length} finding(s)`);
  for (const f of findings.slice(0, 12)) {
    console.warn(`[${f.kind}] ${f.message}`, f.target);
  }
  console.groupEnd();
}
