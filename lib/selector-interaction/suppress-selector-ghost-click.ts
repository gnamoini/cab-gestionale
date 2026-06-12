/** Dopo tap su opzione sheet mobile, blocca il primo click/touchend fantasma verso il layer sotto. */
export const SELECTOR_GHOST_CLICK_GUARD_MS = 500;

let armed = false;
let disarmTimer: ReturnType<typeof setTimeout> | null = null;
let cleanupListeners: (() => void) | null = null;

function disarm(): void {
  cleanupListeners?.();
  cleanupListeners = null;
  armed = false;
  if (disarmTimer) {
    clearTimeout(disarmTimer);
    disarmTimer = null;
  }
}

/**
 * Intercetta in capture il primo click/touchend/pointerup dopo chiusura bottom sheet.
 * Non blocca tap intenzionali successivi (nuova gesture).
 */
export function armSelectorGhostClickGuard(): void {
  if (typeof document === "undefined") return;

  disarm();

  armed = true;

  const blockOnce = (e: Event) => {
    if (!armed) return;
    disarm();
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
  };

  const cleanup = () => {
    document.removeEventListener("click", blockOnce, true);
    document.removeEventListener("touchend", blockOnce, true);
    document.removeEventListener("pointerup", blockOnce, true);
    cleanupListeners = null;
    armed = false;
  };

  cleanupListeners = cleanup;

  document.addEventListener("click", blockOnce, true);
  document.addEventListener("touchend", blockOnce, true);
  document.addEventListener("pointerup", blockOnce, true);

  disarmTimer = setTimeout(disarm, SELECTOR_GHOST_CLICK_GUARD_MS);
}

/** Test-only reset. */
export function __resetSelectorGhostClickGuardForTests(): void {
  disarm();
}
