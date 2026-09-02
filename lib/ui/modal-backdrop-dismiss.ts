/** Stato gesto backdrop modale: chiusura solo se pointerdown e pointerup sono sulla backdrop. */
export type ModalBackdropDismissState = {
  pressedOnBackdrop: boolean;
};

export function createModalBackdropDismissState(): ModalBackdropDismissState {
  return { pressedOnBackdrop: false };
}

export function onModalBackdropPointerDown(
  state: ModalBackdropDismissState,
  target: unknown,
  currentTarget: unknown,
): void {
  if (target === currentTarget) {
    state.pressedOnBackdrop = true;
  }
}

/** @returns true se il gesto deve chiudere la modale */
export function onModalBackdropPointerUp(
  state: ModalBackdropDismissState,
  target: unknown,
  currentTarget: unknown,
): boolean {
  const shouldClose = state.pressedOnBackdrop && target === currentTarget;
  state.pressedOnBackdrop = false;
  return shouldClose;
}

export function onModalDialogPointerDown(state: ModalBackdropDismissState): void {
  state.pressedOnBackdrop = false;
}

export function resetModalBackdropDismissState(state: ModalBackdropDismissState): void {
  state.pressedOnBackdrop = false;
}
