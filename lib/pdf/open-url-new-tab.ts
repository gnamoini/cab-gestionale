import { pushGestionaleToast } from "@/context/toast-context";

/**
 * Apre URL in una nuova scheda senza passare `noopener,noreferrer` come *terzo argomento*
 * di `window.open`: in Chromium ciò può far restituire `null` anche quando la scheda si apre,
 * generando falsi positivi su “popup bloccati”.
 *
 * Dopo l’apertura imposta `opener = null` sul figlio quando possibile.
 */

const DEFAULT_BLOCKED_MSG =
  "Impossibile aprire il file in una nuova scheda. Consenti i pop-up per questo sito oppure verifica che il documento sia valido.";

function scheduleBlobUrlRevoke(url: string, revokeAfterMs?: number): void {
  if (revokeAfterMs == null || revokeAfterMs <= 0 || !url.startsWith("blob:")) return;
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }, revokeAfterMs);
}

function tryOpenViaTemporaryAnchor(url: string, downloadFileName?: string): void {
  if (typeof document === "undefined") return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (downloadFileName?.trim()) {
    a.download = downloadFileName.trim();
  }
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function openUrlInNewTab(
  url: string,
  options?: {
    revokeBlobUrlAfterMs?: number;
    blockedMessage?: string;
    invalidMessage?: string;
    downloadFileName?: string;
  },
): boolean {
  if (typeof window === "undefined") return false;

  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    const msg = options?.invalidMessage ?? "URL del documento non valido.";
    pushGestionaleToast(msg, "warning");
    return false;
  }

  const revokeAfter = options?.revokeBlobUrlAfterMs;
  const downloadFileName = options?.downloadFileName?.trim();

  const scheduleRevoke = () => scheduleBlobUrlRevoke(trimmed, revokeAfter);

  const win = window.open(trimmed, "_blank");
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* cross-origin / policy */
    }
    scheduleRevoke();
    return true;
  }

  /**
   * In Chromium `window.open` può restituire `null` anche con scheda aperta: niente fallback
   * `<a target=_blank>` (genererebbe una seconda scheda). Fallback solo per download esplicito.
   */
  if (downloadFileName) {
    try {
      tryOpenViaTemporaryAnchor(trimmed, downloadFileName);
    } catch {
      /* ignore */
    }
  }

  scheduleRevoke();
  return true;
}

/** Finestra vuota per `document.write` (stampa / HTML inline). Qui `null` indica davvero blocco popup. */
export function openBlankWindowForDocumentWrite(blockedMessage?: string): Window | null {
  if (typeof window === "undefined") return null;
  const w = window.open("about:blank", "_blank");
  if (!w) {
    pushGestionaleToast(blockedMessage ?? DEFAULT_BLOCKED_MSG, "warning", 5200);
    return null;
  }
  try {
    w.opener = null;
  } catch {
    /* ignore */
  }
  return w;
}
