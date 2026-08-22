import { canonicalSiteOriginString } from "@/lib/core/site-origin";
import { clientLavorazioniPublicUrl } from "@/lib/lavorazioni/client-portal-access";
import type { PreventivoClientePdfOptions } from "@/lib/pdf/anagrafica-pdf-fields";
import { generatePdfQrDataUrl } from "@/lib/pdf/pdf-qr";
import type { DdtDetail } from "@/lib/ddt/types";

export type DdtPdfQrTargetKind = "lavorazione" | "site";

export type DdtPdfQrTarget = {
  url: string;
  kind: DdtPdfQrTargetKind;
  caption: string;
};

export function resolveDdtLavorazioneId(detail: DdtDetail): string | null {
  const fromDoc = detail.document.lavorazione_id?.trim();
  if (fromDoc) return fromDoc;
  const link = detail.links.find((row) => row.source_type === "lavorazione");
  const fromLink = link?.source_id?.trim();
  return fromLink || null;
}

export function resolveDdtPdfQrTarget(detail: DdtDetail, siteOrigin?: string): DdtPdfQrTarget {
  const origin = (siteOrigin ?? canonicalSiteOriginString()).replace(/\/$/, "");
  const lavorazioneId = resolveDdtLavorazioneId(detail);
  if (lavorazioneId) {
    return {
      url: clientLavorazioniPublicUrl(lavorazioneId, origin),
      kind: "lavorazione",
      caption: "Portale clienti",
    };
  }
  return {
    url: origin,
    kind: "site",
    caption: formatSiteHostCaption(origin),
  };
}

function formatSiteHostCaption(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/^www\./i, "");
  } catch {
    return origin.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }
}

export type DdtPdfGenerateOptions = PreventivoClientePdfOptions & {
  qrDataUrl?: string | null;
  qrCaption?: string;
};

export async function buildDdtPdfGenerateOptions(
  detail: DdtDetail,
  clientePdf?: PreventivoClientePdfOptions,
  request?: Request,
): Promise<DdtPdfGenerateOptions> {
  const target = resolveDdtPdfQrTarget(detail, canonicalSiteOriginString(request));
  const qrDataUrl = await generatePdfQrDataUrl(target.url);
  return {
    ...clientePdf,
    qrDataUrl,
    qrCaption: target.caption,
  };
}

/** Chiave cache artifact — cambia se cambia destinazione QR. */
export function ddtPdfQrCacheKey(detail: DdtDetail): string {
  const lavorazioneId = resolveDdtLavorazioneId(detail);
  return lavorazioneId ?? "site";
}
