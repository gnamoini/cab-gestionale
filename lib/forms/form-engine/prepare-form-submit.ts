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

/** Flush sincrono + guard composizione IME (pipeline completa pre-snapshot). */
export async function prepareFormSubmitAsync(root: HTMLElement | null | undefined): Promise<void> {
  prepareFormSubmit(root);
  if (root) await iosSubmitGuard(root);
}
