let cachedLogoDataUrl: string | null | undefined;
let cachePromise: Promise<string | null> | null = null;

export function clearBrandingLogoPdfCache(): void {
  cachedLogoDataUrl = undefined;
  cachePromise = null;
}

export async function loadBrandingLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const res = await fetch("/api/branding/logo", { cache: "force-cache" });
      if (!res.ok) {
        cachedLogoDataUrl = null;
        return null;
      }
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Lettura logo non riuscita"));
        reader.readAsDataURL(blob);
      });
      cachedLogoDataUrl = dataUrl;
      return dataUrl;
    } catch {
      cachedLogoDataUrl = null;
      return null;
    } finally {
      cachePromise = null;
    }
  })();

  return cachePromise;
}

/** Formato immagine per jsPDF addImage. */
export function pdfImageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

export const CAB_LOGO_PDF_MAX_HEIGHT_MM = 10.5;

export const CAB_LOGO_PDF_ASPECT = 790 / 226;
