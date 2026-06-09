import { flushSync } from "react-dom";
import { flushGestionalePendingCommits } from "@/lib/ui/gestionale-form-submit-flush";
import { iosSubmitGuard } from "@/lib/forms/form-engine/ios-submit-guard";

/**
 * Flush combobox pendenti + commit batch React (SSOT pre-snapshot).
 * Usato da form submit capture e da save via button.
 */
export function prepareFormSubmit(root: HTMLElement | null | undefined): void {
  if (!root) return;
  flushGestionalePendingCommits(root);
  flushSync(() => {});
}

/**
 * Pipeline completa pre-snapshot: IME guard → flush combobox → drain React.
 * Ordine SSOT: composizione completa prima di committare testo pendente.
 */
export async function prepareFormSubmitAsync(root: HTMLElement | null | undefined): Promise<void> {
  if (root) await iosSubmitGuard(root);
  if (root) flushGestionalePendingCommits(root);
  flushSync(() => {});
}
