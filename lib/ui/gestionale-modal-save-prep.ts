import { prepareFormSubmit } from "@/lib/forms/form-engine/prepare-form-submit";
import { CAB_MODAL_ROOT_ATTR } from "@/lib/ui/mobile-modal-behavior";

/** Risolve il root del modal (`data-cab-modal-root`) a partire da un elemento interno. */
export function resolveGestionaleModalRoot(from: HTMLElement): HTMLElement {
  return from.closest(`[${CAB_MODAL_ROOT_ATTR}]`) ?? from;
}

/**
 * Flush combobox pendenti + flushSync React prima di un save via button (non form submit).
 * Usare all'inizio di handler `onClick` Salva nei modal senza `<form type="submit">`.
 */
export function prepareGestionaleModalSave(root: HTMLElement | null | undefined): void {
  prepareFormSubmit(root);
}

/** Variante che risolve il modal root da un elemento figlio (es. pulsante Salva). */
export function prepareGestionaleModalSaveFrom(from: HTMLElement | null | undefined): void {
  if (!from) return;
  prepareGestionaleModalSave(resolveGestionaleModalRoot(from));
}
