import "server-only";

import { extractCaptureSignatureFieldsGeminiFallback } from "@/lib/document-capture/capture-signature-gemini-fallback.server";
import { cropSignatureRegionWithInkRetry } from "@/lib/document-capture/capture-signature-region-crop.server";
import { ingressoBlankSignatureRegionsNormalized } from "@/lib/document-capture/capture-signature-template";
import type { CaptureSignatureFieldDraft } from "@/lib/document-capture/capture-signature-crop";

const SIGNATURE_FIELD_KEYS = ["firma_richiedente", "firma_addetto"] as const;

/** Ritaglio template blank CAB con ink check; fallback Gemini bbox se template fallisce. */
export async function extractCaptureSignatureFields(input: {
  bytes: Uint8Array;
  mime: string;
}): Promise<CaptureSignatureFieldDraft[]> {
  const regions = ingressoBlankSignatureRegionsNormalized();
  const out: CaptureSignatureFieldDraft[] = [];

  const richiedente = await cropSignatureRegionWithInkRetry({
    bytes: input.bytes,
    mime: input.mime,
    bbox: regions.richiedente,
  });
  if (richiedente) {
    out.push({
      field_key: "firma_richiedente",
      raw_value: richiedente,
      normalized_value: richiedente,
      confidence: 0.55,
    });
  }

  const addetto = await cropSignatureRegionWithInkRetry({
    bytes: input.bytes,
    mime: input.mime,
    bbox: regions.addetto,
  });
  if (addetto) {
    out.push({
      field_key: "firma_addetto",
      raw_value: addetto,
      normalized_value: addetto,
      confidence: 0.55,
    });
  }

  const missing = SIGNATURE_FIELD_KEYS.filter((key) => !out.some((row) => row.field_key === key));
  if (missing.length > 0) {
    const geminiRows = await extractCaptureSignatureFieldsGeminiFallback({
      bytes: input.bytes,
      mime: input.mime,
      missingKeys: missing,
    });
    out.push(...geminiRows);
  }

  return out;
}
