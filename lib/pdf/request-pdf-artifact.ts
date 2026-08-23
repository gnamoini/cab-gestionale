"use client";

import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import {
  openDeferredPopup,
  type DeferredPopupHandle,
  type PopupGuardContext,
  isDeferredPopupBlocked,
} from "@/lib/browser/popup-guard";
import { pushGestionaleToast } from "@/context/toast-context";

export type OpenPdfArtifactParams = {
  id?: string;
  lavorazioneId?: string;
  month?: string;
  employeeId?: string;
  autore?: string;
};

export function buildPdfArtifactUrl(type: PdfArtifactType, params?: OpenPdfArtifactParams): string {
  const search = new URLSearchParams();
  if (params?.id) search.set("id", params.id);
  if (params?.lavorazioneId) search.set("lavorazioneId", params.lavorazioneId);
  if (params?.month) search.set("month", params.month);
  if (params?.employeeId) search.set("employeeId", params.employeeId);
  if (params?.autore) search.set("autore", params.autore);
  const qs = search.toString();
  return qs ? `/api/pdf/artifacts/${type}?${qs}` : `/api/pdf/artifacts/${type}`;
}

function resolvePdfContext(type: PdfArtifactType): PopupGuardContext {
  if (type === "report-bundle") return "report";
  if (type.startsWith("scheda")) return "scheda";
  return "pdf";
}

function acquireDeferredPdfHandle(options: {
  url: string;
  context: PopupGuardContext;
  label?: string;
  deferredHandle?: DeferredPopupHandle | null;
}): DeferredPopupHandle | null {
  if (options.deferredHandle?.isAlive()) return options.deferredHandle;

  const deferredResult = openDeferredPopup({
    context: options.context,
    label: options.label ?? "PDF",
    retryUrl: options.url,
  });

  if (isDeferredPopupBlocked(deferredResult)) return null;
  return deferredResult;
}

/**
 * Apre un artifact PDF same-origin nella scheda pre-aperta sul click utente.
 * Naviga l'URL API direttamente (come il pulsante Riprova) — evita blob: che resta bianco.
 */
export async function openPdfStreamInNewTab(
  url: string,
  options?: {
    loadingMessage?: string;
    context?: PopupGuardContext;
    label?: string;
    artifactType?: PdfArtifactType;
    deferredHandle?: DeferredPopupHandle | null;
  },
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    pushGestionaleToast("URL del documento non valido.", "warning", 5200);
    return false;
  }

  const context =
    options?.context ??
    (options?.artifactType ? resolvePdfContext(options.artifactType) : "pdf");

  const deferred = acquireDeferredPdfHandle({
    url: trimmed,
    context,
    label: options?.label,
    deferredHandle: options?.deferredHandle,
  });
  if (!deferred) return false;

  pushGestionaleToast(options?.loadingMessage ?? "Generazione PDF in corso…", "info", 5000);

  const nav = deferred.navigate(trimmed);
  if (nav.status === "opened") return true;

  if (nav.status !== "blocked") {
    deferred.close();
    pushGestionaleToast("Generazione PDF non riuscita.", "warning", 5200);
  }

  return false;
}

/** Scarica l'artifact server-side e apre il PDF in nuova scheda (anteprima, non download forzato). */
export async function openPdfArtifact(
  type: PdfArtifactType,
  params?: OpenPdfArtifactParams,
  deferredHandle?: DeferredPopupHandle | null,
): Promise<boolean> {
  return openPdfStreamInNewTab(buildPdfArtifactUrl(type, params), {
    artifactType: type,
    context: resolvePdfContext(type),
    deferredHandle,
  });
}
