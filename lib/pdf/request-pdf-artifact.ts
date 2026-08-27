"use client";

import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import {
  openSafePopup,
  tryOpenViaTemporaryAnchor,
  type DeferredPopupHandle,
  type PopupGuardContext,
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

function isSameOriginApiPdfUrl(url: string): boolean {
  return url.startsWith("/api/");
}

/** Come etichetta QR: anchor sync sull'API inline, poi window.open fallback. */
function openSameOriginApiPdf(
  url: string,
  context: PopupGuardContext,
  failureMessage?: string,
): boolean {
  const trimmed = url.trim();
  if (!trimmed || !isSameOriginApiPdfUrl(trimmed)) return false;

  try {
    tryOpenViaTemporaryAnchor(trimmed);
    return true;
  } catch {
    /* anchor blocked — fallback popup */
  }

  const opened = openSafePopup({ url: trimmed, context, phase: "sync" }).status === "opened";
  if (opened) return true;

  if (failureMessage) pushGestionaleToast(failureMessage, "warning", 5200);
  return false;
}

function openDeferredApiPdf(
  url: string,
  deferred: DeferredPopupHandle,
  context: PopupGuardContext,
  failureMessage?: string,
): boolean {
  if (!deferred.isAlive()) {
    deferred.close();
    return openSameOriginApiPdf(url, context, failureMessage);
  }
  const nav = deferred.navigate(url.trim());
  if (nav.status === "opened") return true;
  deferred.close();
  return openSameOriginApiPdf(url, context, failureMessage);
}

/** Sync sul click — window.open all'endpoint artifact. */
export function openPdfStreamFromUserClick(
  url: string,
  options?: {
    context?: PopupGuardContext;
    label?: string;
    loadingMessage?: string;
  },
): void {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    pushGestionaleToast("URL del documento non valido.", "warning", 5200);
    return;
  }
  const context = options?.context ?? "pdf";
  if (options?.loadingMessage) {
    pushGestionaleToast(options.loadingMessage, "info", 5000);
  }
  openSameOriginApiPdf(trimmed, context, "Generazione PDF non riuscita.");
}

export function openPdfArtifactFromUserClick(
  type: PdfArtifactType,
  params?: OpenPdfArtifactParams,
  options?: { context?: PopupGuardContext; label?: string; loadingMessage?: string },
): void {
  const url = buildPdfArtifactUrl(type, params);
  openPdfStreamFromUserClick(url, {
    context: options?.context ?? resolvePdfContext(type),
    label: options?.label,
    loadingMessage: options?.loadingMessage,
  });
}

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

  if (options?.loadingMessage) {
    pushGestionaleToast(options.loadingMessage, "info", 5000);
  }

  if (!isSameOriginApiPdfUrl(trimmed)) {
    pushGestionaleToast("URL del documento non valido.", "warning", 5200);
    return false;
  }

  if (options?.deferredHandle) {
    return openDeferredApiPdf(
      trimmed,
      options.deferredHandle,
      context,
      "Generazione PDF non riuscita.",
    );
  }

  return openSameOriginApiPdf(trimmed, context, "Generazione PDF non riuscita.");
}

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
