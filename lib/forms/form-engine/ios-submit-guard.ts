import { incrementHealthCounter } from "@/lib/observability/runtime-health";

const COMPOSITION_TIMEOUT_MS = 100;

export const IOS_SUBMIT_GUARD_TARGET_ATTR = "data-gestionale-ios-submit-guard-target";

function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}

/** Risolve il controllo testuale da guardare (focus attivo, combobox aperto, ultimo focus nel form). */
function resolveGuardTarget(root: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
  const active = document.activeElement;
  if (active && root.contains(active) && isTextInput(active)) {
    return active;
  }
  const expandedCombobox = root.querySelector<HTMLInputElement>(
    'input[role="combobox"][aria-expanded="true"]',
  );
  if (expandedCombobox) return expandedCombobox;
  const lastFocused = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[${IOS_SUBMIT_GUARD_TARGET_ATTR}="true"]`,
  );
  if (lastFocused && root.contains(lastFocused)) return lastFocused;
  return null;
}

function waitCompositionEnd(target: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      target.removeEventListener("compositionend", onCompositionEnd);
      resolve();
    };
    const onCompositionEnd = () => settle();

    target.addEventListener("compositionend", onCompositionEnd);
    window.setTimeout(() => {
      if (!settled) {
        incrementHealthCounter("formEngineCompositionTimeout");
        settle();
      }
    }, COMPOSITION_TIMEOUT_MS);
  });
}

/**
 * Attende fine composizione IME su input attivo nel form (iOS / CJK).
 * Fail-open dopo timeout — non blocca il submit.
 */
export function iosSubmitGuard(root: HTMLElement): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const target = resolveGuardTarget(root);
  if (!target) return Promise.resolve();

  return waitCompositionEnd(target);
}
