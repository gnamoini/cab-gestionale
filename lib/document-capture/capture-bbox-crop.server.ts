import "server-only";

import sharp from "sharp";
import type { CaptureNormalizedBbox } from "@/lib/document-capture/capture-normalized-bbox";
import {
  CapturePageRasterCache,
  sharpFromCaptureBytes,
} from "@/lib/document-capture/capture-page-raster-cache.server";
import type { AnalyzeTraceEmitter } from "@/lib/document-capture/pipeline/analyze-trace-emitter";

function isValidBbox(bbox: CaptureNormalizedBbox): boolean {
  const w = bbox.xmax - bbox.xmin;
  const h = bbox.ymax - bbox.ymin;
  return w >= 8 && h >= 8 && bbox.xmax > bbox.xmin && bbox.ymax > bbox.ymin;
}

export { sharpFromCaptureBytes };

function bboxToPixels(
  bbox: CaptureNormalizedBbox,
  imgW: number,
  imgH: number,
): { left: number; top: number; width: number; height: number } | null {
  const left = Math.max(0, Math.floor((bbox.xmin / 1000) * imgW));
  const top = Math.max(0, Math.floor((bbox.ymin / 1000) * imgH));
  const width = Math.min(imgW - left, Math.ceil(((bbox.xmax - bbox.xmin) / 1000) * imgW));
  const height = Math.min(imgH - top, Math.ceil(((bbox.ymax - bbox.ymin) / 1000) * imgH));
  if (width < 8 || height < 8) return null;
  return { left, top, width, height };
}

async function cropFromRaster(
  raster: { width: number; height: number; raw: Buffer },
  bbox: CaptureNormalizedBbox,
): Promise<Buffer | null> {
  const rect = bboxToPixels(bbox, raster.width, raster.height);
  if (!rect) return null;
  try {
    const png = await sharp(raster.raw, {
      raw: { width: raster.width, height: raster.height, channels: 4 },
    })
      .extract(rect)
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    return png.length ? png : null;
  } catch {
    return null;
  }
}

/** Ritaglio bbox normalizzato 0–1000 → PNG buffer (200 DPI su PDF). */
export async function cropNormalizedBboxToPngBuffer(
  bytes: Uint8Array,
  bbox: CaptureNormalizedBbox,
  mime: string,
  page = 0,
  options?: { rasterCache?: CapturePageRasterCache; trace?: AnalyzeTraceEmitter },
): Promise<Buffer | null> {
  if (!isValidBbox(bbox)) return null;
  const cache = options?.rasterCache;
  const trace = options?.trace;

  try {
    if (cache) {
      trace?.emit("PDF_RENDER_START", "ok");
      const raster = await cache.getPageRaster(bytes, mime, page);
      if (!raster) return null;
      trace?.emit("PDF_RENDER_OK", "ok", { fieldCount: raster.width });
      trace?.emit("OCR_CROP_START", "ok");
      const png = await cropFromRaster(raster, bbox);
      if (png) trace?.emit("OCR_CROP_OK", "ok");
      return png;
    }

    const meta = await sharpFromCaptureBytes(bytes, mime, page).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    if (!imgW || !imgH) return null;

    const rect = bboxToPixels(bbox, imgW, imgH);
    if (!rect) return null;

    const png = await sharpFromCaptureBytes(bytes, mime, page)
      .extract(rect)
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
  options?: { rasterCache?: CapturePageRasterCache; trace?: AnalyzeTraceEmitter },
): Promise<string | null> {
  const png = await cropNormalizedBboxToPngBuffer(bytes, bbox, mime, page, options);
  if (!png) return null;
  return `data:image/png;base64,${png.toString("base64")}`;
}
