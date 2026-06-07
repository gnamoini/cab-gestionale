import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { CAB_DEFAULT_PRIMARY } from "@/lib/theme/cab-branding-defaults";

export type CabBrandingSettings = {
  primaryColor: string | null;
  logoStoragePath: string | null;
  updatedAt?: string | null;
};

export const DEFAULT_CAB_BRANDING_SETTINGS: CabBrandingSettings = {
  primaryColor: null,
  logoStoragePath: null,
  updatedAt: null,
};

export function parseBrandingSettingsPayload(raw: unknown): CabBrandingSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CAB_BRANDING_SETTINGS };
  const o = raw as Record<string, unknown>;
  const primaryRaw = typeof o.primaryColor === "string" ? o.primaryColor : null;
  const primaryColor = primaryRaw ? normalizeHex(primaryRaw) : null;
  const logoStoragePath =
    typeof o.logoStoragePath === "string" && o.logoStoragePath.trim()
      ? o.logoStoragePath.trim()
      : null;
  const updatedAt = typeof o.updatedAt === "string" && o.updatedAt.trim() ? o.updatedAt.trim() : null;
  return { primaryColor, logoStoragePath, updatedAt };
}

export function isBrandingCustomized(settings: CabBrandingSettings | null | undefined): boolean {
  if (!settings) return false;
  return settings.primaryColor != null || settings.logoStoragePath != null;
}

export function effectivePrimaryColor(settings: CabBrandingSettings | null | undefined): string {
  return settings?.primaryColor ?? CAB_DEFAULT_PRIMARY;
}

export function brandingSettingsToPayload(settings: CabBrandingSettings): Record<string, unknown> {
  return {
    primaryColor: settings.primaryColor,
    logoStoragePath: settings.logoStoragePath,
    updatedAt: settings.updatedAt ?? new Date().toISOString(),
  };
}

export function brandingCacheVersion(settings: CabBrandingSettings | null | undefined): string {
  if (!settings?.updatedAt) return "default";
  return settings.updatedAt;
}
