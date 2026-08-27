import { pushGestionaleToast } from "@/context/toast-context";
import {
  navigateBlobPdfInPopupWindow,
  openBlankPopupWindow,
  openSafePopup,
  tryOpenViaTemporaryAnchor,
  type DeferredPopupHandle,
  type PopupGuardContext,
} from "@/lib/browser/popup-guard";

const DEFAULT_BLOCKED_MSG =
  "Impossibile aprire il file in una nuova scheda. Verifica che il documento sia valido o riprova.";

const DEFERRED_NAVIGATE_FAILED_MSG =
  "Non è stato possibile aprire il documento nella nuova scheda. Riprova.";

function scheduleLocalBlobRevoke(url: string, revokeAfterMs?: number): void {
  if (!url.startsWith("blob:") || typeof window === "undefined") return;
  window.setTimeout(() => URL.revokeObjectURL(url), revokeAfterMs ?? 120_000);
}

function tryOpenViaAnchorFirst(
  url: string,
  downloadFileName?: string,
  revokeAfterMs?: number,
): boolean {
  try {
    tryOpenViaTemporaryAnchor(url, downloadFileName);
    scheduleLocalBlobRevoke(url, revokeAfterMs);
    return true;
  } catch {
    return false;
  }
}

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
  const label = options?.label ?? "PDF";

  if (options?.deferredHandle) {
    const aliveBefore = options.deferredHandle.isAlive();

    let openedInDeferred = false;
    if (aliveBefore) {
      const result = options.deferredHandle.navigate(trimmed, { revokeBlobUrlAfterMs: revokeAfter });
      if (result.status === "opened") {
        openedInDeferred = true;
      } else if (trimmed.startsWith("blob:")) {
        const win = options.deferredHandle.getWindow();
        if (win && navigateBlobPdfInPopupWindow(win, trimmed, label, revokeAfter)) {
          openedInDeferred = true;
        }
      }
    }

    if (openedInDeferred) return true;

    options.deferredHandle.close();

    // ponytail: mai openSafePopup dopo deferred — anchor fallback
    if (trimmed.startsWith("blob:") || trimmed.startsWith("/api/")) {
      if (tryOpenViaAnchorFirst(trimmed, downloadFileName, revokeAfter)) return true;
    } else if (downloadFileName) {
      if (tryOpenViaAnchorFirst(trimmed, downloadFileName, revokeAfter)) return true;
    }

    const msg = options?.blockedMessage ?? DEFERRED_NAVIGATE_FAILED_MSG;
    pushGestionaleToast(msg, "warning", 5200);
    return false;
  }

  // ponytail: sync click — anchor prima di popup (no about:blank)
  if (trimmed.startsWith("/api/") || trimmed.startsWith("blob:")) {
    if (tryOpenViaAnchorFirst(trimmed, downloadFileName, revokeAfter)) return true;
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
