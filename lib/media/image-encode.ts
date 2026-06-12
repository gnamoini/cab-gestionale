/** Client-side image encode helpers (canvas) — WebP/AVIF variants at upload. */

export const IMAGE_ENCODE_LIMITS = {
  thumbMaxSide: 256,
  fullMaxSide: 1200,
  thumbQuality: 0.72,
  fullWebpQuality: 0.78,
  fullAvifQuality: 0.75,
} as const;

export type EncodedImageVariant = {
  blob: Blob;
  contentType: string;
  width: number;
  height: number;
};

export type EncodedImageSet = {
  thumb: EncodedImageVariant;
  fullWebp: EncodedImageVariant;
  fullAvif: EncodedImageVariant | null;
};

function scaleToMaxSide(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasEncode(
  source: ImageBitmap,
  width: number,
  height: number,
  mime: string,
  quality?: number,
): Promise<EncodedImageVariant | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
  if (!blob) return null;
  return { blob, contentType: mime, width, height };
}

async function tryEncodeAvif(
  source: ImageBitmap,
  width: number,
  height: number,
): Promise<EncodedImageVariant | null> {
  if (typeof createImageBitmap === "undefined") return null;
  try {
    return await canvasEncode(source, width, height, "image/avif", IMAGE_ENCODE_LIMITS.fullAvifQuality);
  } catch {
    return null;
  }
}

/** Encode thumb WebP + full WebP + optional full AVIF from a source file. */
export async function encodeImageVariantsFromFile(file: File): Promise<EncodedImageSet> {
  if (!file.type.startsWith("image/")) throw new Error("Seleziona un file immagine.");
  const bitmap = await createImageBitmap(file);
  try {
    const thumbSize = scaleToMaxSide(bitmap.width, bitmap.height, IMAGE_ENCODE_LIMITS.thumbMaxSide);
    const fullSize = scaleToMaxSide(bitmap.width, bitmap.height, IMAGE_ENCODE_LIMITS.fullMaxSide);

    const thumb = await canvasEncode(
      bitmap,
      thumbSize.width,
      thumbSize.height,
      "image/webp",
      IMAGE_ENCODE_LIMITS.thumbQuality,
    );
    const fullWebp = await canvasEncode(
      bitmap,
      fullSize.width,
      fullSize.height,
      "image/webp",
      IMAGE_ENCODE_LIMITS.fullWebpQuality,
    );
    if (!thumb || !fullWebp) throw new Error("Impossibile codificare l'immagine.");

    const fullAvif = await tryEncodeAvif(bitmap, fullSize.width, fullSize.height);

    return { thumb, fullWebp, fullAvif };
  } finally {
    bitmap.close();
  }
}
