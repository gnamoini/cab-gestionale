import { pushGestionaleToast } from "@/context/toast-context";
import {
  openBlankPopupWindow,
  openSafePopup,
  tryOpenViaTemporaryAnchor,
  type DeferredPopupHandle,
  type PopupGuardContext,
} from "@/lib/browser/popup-guard";

const DEFAULT_BLOCKED_MSG =
  "Impossibile aprire il file in una nuova scheda. Consenti i pop-up per questo sito oppure verifica che il documento sia valido.";

export type OpenUrlInNewTabOptions = {
  revokeBlobUrlAfterMs?: number;
  blockedMessage?: string;
  invalidMessage?: string;
  downloadFileName?: string;
  context?: PopupGuardContext;
  label?: string;
  /** Handle pre-aperto sul click utente (flussi async). */
  deferredHandle?: DeferredPopupHandle | null;
};

export function openUrlInNewTab(url: string, options?: OpenUrlInNewTabOptions): boolean {
  if (typeof window === "undefined") return false;

  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    const msg = options?.invalidMessage ?? "URL del documento non valido.";
    pushGestionaleToast(msg, "warning");
    return false;
  }

  const context = options?.context ?? "pdf";
  const revokeAfter = options?.revokeBlobUrlAfterMs;
  const downloadFileName = options?.downloadFileName?.trim();

  if (options?.deferredHandle?.isAlive()) {
    const result = options.deferredHandle.navigate(trimmed, { revokeBlobUrlAfterMs: revokeAfter });
    return result.status === "opened";
  }

  const result = openSafePopup({
    url: trimmed,
    context,
    label: options?.label,
    revokeBlobUrlAfterMs: revokeAfter,
    phase: "sync",
  });

  if (result.status === "opened") return true;

  if (downloadFileName) {
    try {
      tryOpenViaTemporaryAnchor(trimmed, downloadFileName);
      return true;
    } catch {
      /* ignore */
    }
  }

  if (result.status === "blocked" && options?.blockedMessage) {
    pushGestionaleToast(options.blockedMessage, "warning", 5200);
  }

  return false;
}

/** Finestra vuota per `document.write` (stampa / HTML inline). */
export function openBlankWindowForDocumentWrite(
  blockedMessage?: string,
  options?: { context?: PopupGuardContext; label?: string },
): Window | null {
  if (typeof window === "undefined") return null;

  const popup = openBlankPopupWindow({
    context: options?.context ?? "print",
    label: options?.label ?? "stampa",
  });

  if (!popup) {
    pushGestionaleToast(blockedMessage ?? DEFAULT_BLOCKED_MSG, "warning", 5200);
    return null;
  }

  return popup;
}
