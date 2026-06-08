import { incrementHealthCounter } from "@/lib/observability/runtime-health";

const COMPOSITION_TIMEOUT_MS = 100;

function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}

/**
 * Attende fine composizione IME su input attivo nel form (iOS / CJK).
 * Fail-open dopo timeout — non blocca il submit.
 */
export function iosSubmitGuard(root: HTMLElement): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const active = document.activeElement;
  if (!active || !root.contains(active) || !isTextInput(active)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      active.removeEventListener("compositionend", onCompositionEnd);
      resolve();
    };
    const onCompositionEnd = () => settle();

    active.addEventListener("compositionend", onCompositionEnd);
    window.setTimeout(() => {
      if (!settled) {
        incrementHealthCounter("formEngineCompositionTimeout");
        settle();
      }
    }, COMPOSITION_TIMEOUT_MS);
  });
}
