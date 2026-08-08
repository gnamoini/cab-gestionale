"use client";

import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { openDeferredPopup, type PopupGuardContext, isDeferredPopupBlocked } from "@/lib/browser/popup-guard";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { pushGestionaleToast } from "@/context/toast-context";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";

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

function fileNameFromContentDisposition(header: string | null, fallback = "documento.pdf"): string {
  if (!header) return fallback;
  const utf8 = /filename\*=UTF-8''([^;\s]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]).trim() || fallback;
    } catch {
      return utf8[1].trim() || fallback;
    }
  }
  const ascii = /filename="([^"]+)"/i.exec(header);
  return ascii?.[1]?.trim() || fallback;
}

function resolvePdfContext(type: PdfArtifactType): PopupGuardContext {
  if (type === "report-bundle") return "report";
  if (type.startsWith("scheda")) return "scheda";
  return "pdf";
}

/** Scarica PDF da URL same-origin e apre anteprima in nuova scheda. */
export async function openPdfStreamInNewTab(
  url: string,
  options?: {
    loadingMessage?: string;
    context?: PopupGuardContext;
    label?: string;
    artifactType?: PdfArtifactType;
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

  const deferredResult = openDeferredPopup({
    context,
    label: options?.label ?? "PDF",
    retryUrl: trimmed,
  });

  if (isDeferredPopupBlocked(deferredResult)) return false;
  const deferred = deferredResult;

  pushGestionaleToast(options?.loadingMessage ?? "Generazione PDF in corso…", "info", 5000);

  try {
    const res = await fetch(trimmed, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) {
      deferred.close();
      let message = "Generazione PDF non riuscita";
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error?.trim()) message = body.error.trim();
      } catch {
        /* risposta HTML di errore */
      }
      trackRuntimeEvent(RuntimeEvents.pdfGenerationFailed, { context, phase: "navigate" });
      pushGestionaleToast(message, "warning", 5200);
      return false;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/pdf")) {
      deferred.close();
      trackRuntimeEvent(RuntimeEvents.pdfGenerationFailed, { context, phase: "navigate" });
      pushGestionaleToast("Risposta PDF non valida.", "warning", 5200);
      return false;
    }

    const blob = await res.blob();
    const fileName = fileNameFromContentDisposition(res.headers.get("content-disposition"));
    const blobUrl = URL.createObjectURL(new File([blob], fileName, { type: "application/pdf" }));
    return openUrlInNewTab(blobUrl, {
      revokeBlobUrlAfterMs: 120_000,
      context,
      label: options?.label,
      deferredHandle: deferred,
    });
  } catch {
    deferred.close();
    trackRuntimeEvent(RuntimeEvents.pdfNetworkError, { context, phase: "navigate" });
    pushGestionaleToast("Generazione PDF non riuscita.", "warning", 5200);
    return false;
  }
}

/** Scarica l'artifact server-side e apre il PDF in nuova scheda (anteprima, non download forzato). */
export async function openPdfArtifact(
  type: PdfArtifactType,
  params?: OpenPdfArtifactParams,
): Promise<boolean> {
  return openPdfStreamInNewTab(buildPdfArtifactUrl(type, params), {
    artifactType: type,
    context: resolvePdfContext(type),
  });
}
