"use client";

import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
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

/** Scarica l'artifact server-side e apre il PDF in nuova scheda (anteprima, non download forzato). */
export async function openPdfArtifact(
  type: PdfArtifactType,
  params?: OpenPdfArtifactParams,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const url = buildPdfArtifactUrl(type, params);
  pushGestionaleToast("Generazione PDF in corso…", "info", 5000);

  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) {
      let message = "Generazione PDF non riuscita";
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error?.trim()) message = body.error.trim();
      } catch {
        /* risposta HTML di errore */
      }
      pushGestionaleToast(message, "warning", 5200);
      return false;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/pdf")) {
      pushGestionaleToast("Risposta PDF non valida.", "warning", 5200);
      return false;
    }

    const blob = await res.blob();
    const fileName = fileNameFromContentDisposition(res.headers.get("content-disposition"));
    const blobUrl = URL.createObjectURL(new File([blob], fileName, { type: "application/pdf" }));
    const opened = openUrlInNewTab(blobUrl, {
      revokeBlobUrlAfterMs: 120_000,
      blockedMessage: "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
    });
    if (!opened) {
      pushGestionaleToast(
        "Impossibile aprire il PDF. Consenti i pop-up per questo sito.",
        "warning",
        5200,
      );
    }
    return opened;
  } catch {
    pushGestionaleToast("Generazione PDF non riuscita.", "warning", 5200);
    return false;
  }
}
