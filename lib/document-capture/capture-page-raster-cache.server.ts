import "server-only";

import sharp from "sharp";

function sharpFromCaptureBytes(bytes: Uint8Array, mime: string, page = 0) {
  if (mime.toLowerCase().includes("pdf")) {
    return sharp(bytes, { page, density: 200 });
  }
  return sharp(bytes, { failOn: "none" }).rotate();
}

export type CapturePageRaster = {
  width: number;
  height: number;
  /** Raw RGBA buffer from sharp — one full-page raster at 200 DPI. */
  raw: Buffer;
};

/** ponytail: per-request cache — max 3 pagine tipiche; evita N× raster sharp per bbox OCR. */
export class CapturePageRasterCache {
  private readonly cache = new Map<string, Promise<CapturePageRaster | null>>();

  private key(bytes: Uint8Array, mime: string, page: number): string {
    return `${bytes.byteLength}:${bytes.byteOffset}:${mime}:${page}`;
  }

  async getPageRaster(bytes: Uint8Array, mime: string, page = 0): Promise<CapturePageRaster | null> {
    const cacheKey = this.key(bytes, mime, page);
    let pending = this.cache.get(cacheKey);
    if (!pending) {
      pending = this.rasterize(bytes, mime, page);
      this.cache.set(cacheKey, pending);
    }
    return pending;
  }

  private async rasterize(bytes: Uint8Array, mime: string, page: number): Promise<CapturePageRaster | null> {
    try {
      const { data, info } = await sharpFromCaptureBytes(bytes, mime, page)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const width = info.width ?? 0;
      const height = info.height ?? 0;
      if (!width || !height) return null;
      return { width, height, raw: data };
    } catch {
      return null;
    }
  }
}

export { sharpFromCaptureBytes };
