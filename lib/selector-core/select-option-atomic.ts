/**
 * Contratto selection atomicity — ordine garantito per tap/keyboard select.
 * Orchestrato dall'interaction layer (GlobalSelect, legacy combobox).
 */

export type SelectOptionAtomicParams = {
  cancelPendingBlur: () => void;
  onChange: (value: string) => void;
  nextValue: string;
  recordRecent?: (next: string) => void;
  closeOverlaySync: () => void;
  resetInteractionState: () => void;
  restoreFocusOrAdvance?: () => void;
  flushCombobox?: () => void;
};

const state = { selectionInFlight: false };

export function isSelectionInFlight(): boolean {
  return state.selectionInFlight;
}

/**
 * Ordine garantito:
 * 1. cancelPendingBlur
 * 2. onChange (commit)
 * 3. flushCombobox (iOS)
 * 4. recordRecent
 * 5. closeOverlaySync
 * 6. resetInteractionState
 * 7. restoreFocusOrAdvance
 */
export function runSelectOptionAtomic(params: SelectOptionAtomicParams): void {
  if (state.selectionInFlight) return;

  state.selectionInFlight = true;
  try {
    params.cancelPendingBlur();
    params.onChange(params.nextValue);
    params.flushCombobox?.();
    params.recordRecent?.(params.nextValue);
    params.closeOverlaySync();
    params.resetInteractionState();
    params.restoreFocusOrAdvance?.();
  } finally {
    state.selectionInFlight = false;
  }
}

/** Blur handler guard — no-op se selezione in corso. */
export function shouldIgnoreBlurDuringSelection(): boolean {
  return state.selectionInFlight;
}

/** Test-only reset. */
export function __resetSelectOptionAtomicForTests(): void {
  state.selectionInFlight = false;
}
