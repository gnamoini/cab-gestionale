import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchBrandingLogoBytes, fetchBrandingSettingsFromDb } from "@/lib/branding/get-branding-from-server";

let cachedLabelLogoDataUrl: string | null | undefined;

export async function loadLabelLogoDataUrl(): Promise<string | null> {
  if (cachedLabelLogoDataUrl !== undefined) return cachedLabelLogoDataUrl;
  try {
    const settings = await fetchBrandingSettingsFromDb();
    const { bytes, contentType } = await fetchBrandingLogoBytes(settings);
    cachedLabelLogoDataUrl = `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    try {
      const bytes = await readFile(path.join(process.cwd(), "public", "cab-logo.png"));
      cachedLabelLogoDataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
    } catch {
      cachedLabelLogoDataUrl = null;
    }
  }
  return cachedLabelLogoDataUrl;
}
