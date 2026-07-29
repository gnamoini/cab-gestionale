import "server-only";

import sharp from "sharp";
import type { CaptureNormalizedBbox } from "@/lib/document-capture/capture-normalized-bbox";

function isValidBbox(bbox: CaptureNormalizedBbox): boolean {
  const w = bbox.xmax - bbox.xmin;
  const h = bbox.ymax - bbox.ymin;
  return w >= 8 && h >= 8 && bbox.xmax > bbox.xmin && bbox.ymax > bbox.ymin;
}

export function sharpFromCaptureBytes(bytes: Uint8Array, mime: string, page = 0) {
  if (mime.toLowerCase().includes("pdf")) {
    return sharp(bytes, { page, density: 200 });
  }
  return sharp(bytes, { failOn: "none" }).rotate();
}

/** Ritaglio bbox normalizzato 0–1000 → PNG buffer (200 DPI su PDF). */
export async function cropNormalizedBboxToPngBuffer(
  bytes: Uint8Array,
  bbox: CaptureNormalizedBbox,
  mime: string,
  page = 0,
): Promise<Buffer | null> {
  if (!isValidBbox(bbox)) return null;
  try {
    const meta = await sharpFromCaptureBytes(bytes, mime, page).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    if (!imgW || !imgH) return null;

    const left = Math.max(0, Math.floor((bbox.xmin / 1000) * imgW));
    const top = Math.max(0, Math.floor((bbox.ymin / 1000) * imgH));
    const width = Math.min(imgW - left, Math.ceil(((bbox.xmax - bbox.xmin) / 1000) * imgW));
    const height = Math.min(imgH - top, Math.ceil(((bbox.ymax - bbox.ymin) / 1000) * imgH));
    if (width < 8 || height < 8) return null;

    const png = await sharpFromCaptureBytes(bytes, mime, page)
      .extract({ left, top, width, height })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    return png.length ? png : null;
  } catch {
    return null;
  }
}

export async function cropNormalizedBboxToPngDataUrl(
  bytes: Uint8Array,
  bbox: CaptureNormalizedBbox,
  mime: string,
  page = 0,
): Promise<string | null> {
  const png = await cropNormalizedBboxToPngBuffer(bytes, bbox, mime, page);
  if (!png) return null;
  return `data:image/png;base64,${png.toString("base64")}`;
}
