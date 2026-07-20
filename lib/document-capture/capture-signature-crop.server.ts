import "server-only";

import { extractCaptureSignatureFieldsGeminiFallback } from "@/lib/document-capture/capture-signature-gemini-fallback.server";
import { cropSignatureRegionWithInkRetry } from "@/lib/document-capture/capture-signature-region-crop.server";
import { ingressoBlankSignatureRegionsNormalized } from "@/lib/document-capture/capture-signature-template";
import {
  padCaptureSignatureBbox,
  type CaptureSignatureFieldDraft,
} from "@/lib/document-capture/capture-signature-crop";

const SIGNATURE_FIELD_KEYS = ["firma_richiedente", "firma_addetto"] as const;

function isCapturePhotoMime(mime: string): boolean {
  return !mime.toLowerCase().includes("pdf");
}

async function cropTemplateSignature(
  input: { bytes: Uint8Array; mime: string },
  fieldKey: (typeof SIGNATURE_FIELD_KEYS)[number],
  bbox: Parameters<typeof cropSignatureRegionWithInkRetry>[0]["bbox"],
): Promise<CaptureSignatureFieldDraft | null> {
  const dataUrl = await cropSignatureRegionWithInkRetry({
    bytes: input.bytes,
    mime: input.mime,
    bbox: isCapturePhotoMime(input.mime) ? padCaptureSignatureBbox(bbox) : bbox,
  });
  if (!dataUrl) return null;
  return {
    field_key: fieldKey,
    raw_value: dataUrl,
    normalized_value: dataUrl,
    confidence: 0.55,
  };
}

/** Ritaglio bbox template blank CAB; su foto Gemini prima, poi template; su PDF template poi Gemini. */
export async function extractCaptureSignatureFields(input: {
  bytes: Uint8Array;
  mime: string;
}): Promise<CaptureSignatureFieldDraft[]> {
  const regions = ingressoBlankSignatureRegionsNormalized();
  const out: CaptureSignatureFieldDraft[] = [];
  const isPhoto = isCapturePhotoMime(input.mime);

  const missingKeys = () =>
    SIGNATURE_FIELD_KEYS.filter((key) => !out.some((row) => row.field_key === key));

  if (isPhoto) {
    out.push(
      ...(await extractCaptureSignatureFieldsGeminiFallback({
        bytes: input.bytes,
        mime: input.mime,
        missingKeys: [...SIGNATURE_FIELD_KEYS],
      })),
    );
  }

  for (const key of missingKeys()) {
    const row = await cropTemplateSignature(
      input,
      key,
      key === "firma_richiedente" ? regions.richiedente : regions.addetto,
    );
    if (row) out.push(row);
  }

  const stillMissing = missingKeys();
  if (!isPhoto && stillMissing.length > 0) {
    out.push(
      ...(await extractCaptureSignatureFieldsGeminiFallback({
        bytes: input.bytes,
        mime: input.mime,
        missingKeys: stillMissing,
      })),
    );
  }

  return out;
}
