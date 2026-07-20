import "server-only";

import { cropNormalizedBboxToPngBuffer } from "@/lib/document-capture/capture-bbox-crop.server";
import type { CaptureSignatureBbox } from "@/lib/document-capture/capture-signature-crop";

const SIGNATURE_BBOX_Y_OFFSETS = [0, -30, 30, -60, 60] as const;

function shiftBboxY(bbox: CaptureSignatureBbox, delta: number): CaptureSignatureBbox {
  return {
    xmin: bbox.xmin,
    xmax: bbox.xmax,
    ymin: Math.max(0, bbox.ymin + delta),
    ymax: Math.min(1000, bbox.ymax + delta),
  };
}

/** Ritaglio bbox firma → PNG data URL (senza filtro inchiostro: preview + salvataggio box). */
export async function cropSignatureRegionWithInkRetry(input: {
  bytes: Uint8Array;
  mime: string;
  bbox: CaptureSignatureBbox;
  page?: number;
}): Promise<string | null> {
  for (const offset of SIGNATURE_BBOX_Y_OFFSETS) {
    const png = await cropNormalizedBboxToPngBuffer(
      input.bytes,
      shiftBboxY(input.bbox, offset),
      input.mime,
      input.page ?? 0,
    );
    if (!png?.length) continue;
    return `data:image/png;base64,${png.toString("base64")}`;
  }
  return null;
}
