/** Naming SSOT for multi-variant record images in Supabase `images` bucket. */

export type ImageVariantKind = "thumb" | "fullAvif" | "fullWebp" | "legacyJpeg";

export type ImageVariantPaths = {
  baseName: string;
  thumb: string;
  fullAvif: string;
  fullWebp: string;
};

const VARIANT_SUFFIX = {
  thumb: ".thumb.webp",
  fullAvif: ".full.avif",
  fullWebp: ".full.webp",
} as const;

export function buildImageVariantBaseName(timestamp: number, sanitizedStem: string): string {
  return `${timestamp}-${sanitizedStem}`;
}

export function imageVariantFileName(baseName: string, kind: Exclude<ImageVariantKind, "legacyJpeg">): string {
  return `${baseName}${VARIANT_SUFFIX[kind]}`;
}

export function imageVariantPathsForBase(prefix: string, baseName: string): ImageVariantPaths {
  const folder = prefix.replace(/\/$/, "");
  const join = (fileName: string) => `${folder}/${fileName}`;
  return {
    baseName,
    thumb: join(imageVariantFileName(baseName, "thumb")),
    fullAvif: join(imageVariantFileName(baseName, "fullAvif")),
    fullWebp: join(imageVariantFileName(baseName, "fullWebp")),
  };
}

export function isLegacyJpegImageName(name: string): boolean {
  return /\.jpe?g$/i.test(name) && !name.includes(".thumb.") && !name.includes(".full.");
}

export function isModernImageVariantName(name: string): boolean {
  return name.includes(".thumb.webp") || name.includes(".full.avif") || name.includes(".full.webp");
}

/** Group storage listing rows by logical image (modern base name or legacy jpeg stem). */
export function logicalImageBaseFromFileName(fileName: string): string | null {
  if (fileName.includes(".thumb.webp")) return fileName.replace(/\.thumb\.webp$/i, "");
  if (fileName.includes(".full.avif")) return fileName.replace(/\.full\.avif$/i, "");
  if (fileName.includes(".full.webp")) return fileName.replace(/\.full\.webp$/i, "");
  if (isLegacyJpegImageName(fileName)) return fileName.replace(/\.jpe?g$/i, "");
  return null;
}

export function allVariantPathsForLogicalBase(prefix: string, baseName: string): string[] {
  const v = imageVariantPathsForBase(prefix, baseName);
  return [v.thumb, v.fullAvif, v.fullWebp];
}
