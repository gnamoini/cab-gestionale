import type { CabBrandingSettings } from "@/lib/branding/branding-settings-model";
import { DEFAULT_CAB_BRANDING_SETTINGS, parseBrandingSettingsPayload } from "@/lib/branding/branding-settings-model";
import { CAB_BRANDING_STORAGE_KEY } from "@/lib/theme/cab-branding-defaults";

export function readBrandingBootCache(): CabBrandingSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CAB_BRANDING_STORAGE_KEY);
    if (!raw) return null;
    return parseBrandingSettingsPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeBrandingBootCache(settings: CabBrandingSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAB_BRANDING_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* quota / private mode */
  }
}

export function clearBrandingBootCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CAB_BRANDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function resolveBootBrandingSettings(): CabBrandingSettings {
  return readBrandingBootCache() ?? { ...DEFAULT_CAB_BRANDING_SETTINGS };
}
