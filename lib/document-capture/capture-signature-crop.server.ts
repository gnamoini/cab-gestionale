import "server-only";

import { ingressoBlankSignatureRegionsNormalized } from "@/lib/document-capture/capture-signature-template";
import type {
  CaptureSignatureBbox,
  CaptureSignatureFieldDraft,
} from "@/lib/document-capture/capture-signature-crop";
import { cropNormalizedBboxToPngDataUrl } from "@/lib/document-capture/capture-bbox-crop.server";

/** Ritaglio template blank CAB — nessuna chiamata AI. */
export async function extractCaptureSignatureFields(input: {
  bytes: Uint8Array;
  mime: string;
}): Promise<CaptureSignatureFieldDraft[]> {
  const regions = ingressoBlankSignatureRegionsNormalized();
  const out: CaptureSignatureFieldDraft[] = [];

  const richiedente = await cropNormalizedBboxToPngDataUrl(input.bytes, regions.richiedente, input.mime);
  if (richiedente) {
    out.push({
      field_key: "firma_richiedente",
      raw_value: richiedente,
      normalized_value: richiedente,
      confidence: 0.55,
    });
  }

  const addetto = await cropNormalizedBboxToPngDataUrl(input.bytes, regions.addetto, input.mime);
  if (addetto) {
    out.push({
      field_key: "firma_addetto",
      raw_value: addetto,
      normalized_value: addetto,
      confidence: 0.55,
    });
  }

  return out;
}
