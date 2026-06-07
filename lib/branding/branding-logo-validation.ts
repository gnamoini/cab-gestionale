export const BRANDING_LOGO_MAX_BYTES = 512 * 1024;
export const BRANDING_LOGO_MAX_SIDE = 1200;
export const BRANDING_LOGO_TARGET_ASPECT = 790 / 226;

export const BRANDING_LOGO_ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

export type BrandingLogoValidationResult =
  | { ok: true; aspectWarning?: string }
  | { ok: false; error: string };

function extensionFromMime(mime: string): "png" | "webp" | "jpeg" | "svg" | null {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpeg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return null;
  }
}

export function brandingLogoExtensionFromFile(file: File): "png" | "webp" | "jpeg" | "svg" | null {
  return extensionFromMime(file.type);
}

export function validateBrandingLogoFile(file: File): BrandingLogoValidationResult {
  if (!BRANDING_LOGO_ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Formato non supportato. Usa PNG, JPEG, WebP o SVG." };
  }
  if (file.size > BRANDING_LOGO_MAX_BYTES) {
    return { ok: false, error: "Il file supera 512 KB. Riduci dimensioni o peso." };
  }
  return { ok: true };
}

export async function validateBrandingLogoDimensions(file: File): Promise<BrandingLogoValidationResult> {
  const base = validateBrandingLogoFile(file);
  if (!base.ok) return base;
  if (file.type === "image/svg+xml") return { ok: true };

  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width > BRANDING_LOGO_MAX_SIDE || bitmap.height > BRANDING_LOGO_MAX_SIDE) {
      bitmap.close();
      return {
        ok: false,
        error: `Dimensioni massime ${BRANDING_LOGO_MAX_SIDE}px per lato.`,
      };
    }
    const ratio = bitmap.width / bitmap.height;
    bitmap.close();
    const delta = Math.abs(ratio - BRANDING_LOGO_TARGET_ASPECT) / BRANDING_LOGO_TARGET_ASPECT;
    if (delta > 0.15) {
      return {
        ok: true,
        aspectWarning: "Il rapporto del logo differisce dal logo CAB originale; verrà adattato mantenendo le proporzioni.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossibile leggere l'immagine selezionata." };
  }
}

export async function prepareBrandingLogoBlob(file: File): Promise<Blob> {
  if (file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, BRANDING_LOGO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const mime = file.type === "image/webp" ? "image/webp" : "image/png";
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), mime, 0.92);
  });
}
