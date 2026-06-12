import "server-only";

import { cache } from "react";
import { fetchBrandingLogoBytes, fetchBrandingSettingsFromDb } from "@/lib/branding/get-branding-from-server";
import { pdfImageFormatFromDataUrl } from "@/lib/branding/branding-logo-for-pdf";

export const loadBrandingLogoDataUrlServer = cache(async (): Promise<string | null> => {
  try {
    const settings = await fetchBrandingSettingsFromDb();
    const { bytes, contentType } = await fetchBrandingLogoBytes(settings);
    const b64 = Buffer.from(bytes).toString("base64");
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
});

export { pdfImageFormatFromDataUrl };
