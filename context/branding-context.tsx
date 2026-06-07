"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_CAB_BRANDING_SETTINGS,
  isBrandingCustomized,
  parseBrandingSettingsPayload,
  type CabBrandingSettings,
} from "@/lib/branding/branding-settings-model";
import { buildBrandingLogoApiUrl } from "@/lib/branding/branding-logo-upload";
import { clearBrandingLogoPdfCache } from "@/lib/branding/branding-logo-for-pdf";
import { applyBrandingToDocument } from "@/lib/theme/cab-branding-apply";
import {
  clearBrandingBootCache,
  writeBrandingBootCache,
} from "@/lib/theme/cab-branding-storage";
import { CAB_LOGO_PATH } from "@/components/gestionale/cab-logo";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

type BrandingContextValue = {
  branding: CabBrandingSettings;
  logoUrl: string;
  isCustomLogo: boolean;
  isCustomPrimary: boolean;
  syncBranding: (next: CabBrandingSettings) => void;
  resetBrandingCache: () => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function updateFavicon(logoUrl: string): void {
  if (typeof document === "undefined") return;
  for (const rel of ["icon", "apple-touch-icon"]) {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const settingsQ = useCabAppSettingsPayloadQuery({ enabled: true });
  const [localOverride, setLocalOverride] = useState<CabBrandingSettings | null>(null);

  const branding = useMemo(() => {
    if (localOverride) return localOverride;
    return settingsQ.data?.resolved.branding ?? { ...DEFAULT_CAB_BRANDING_SETTINGS };
  }, [localOverride, settingsQ.data?.resolved.branding]);

  const logoUrl = useMemo(() => {
    if (!isBrandingCustomized(branding) || !branding.logoStoragePath) return CAB_LOGO_PATH;
    return buildBrandingLogoApiUrl(branding);
  }, [branding]);

  const syncBranding = useCallback((next: CabBrandingSettings) => {
    setLocalOverride(next);
    if (isBrandingCustomized(next)) {
      writeBrandingBootCache(next);
    } else {
      clearBrandingBootCache();
    }
    applyBrandingToDocument(next);
    updateFavicon(buildBrandingLogoApiUrl(next));
    clearBrandingLogoPdfCache();
  }, []);

  const resetBrandingCache = useCallback(() => {
    setLocalOverride({ ...DEFAULT_CAB_BRANDING_SETTINGS });
    clearBrandingBootCache();
    applyBrandingToDocument(null);
    updateFavicon(CAB_LOGO_PATH);
    clearBrandingLogoPdfCache();
  }, []);

  useEffect(() => {
    applyBrandingToDocument(branding);
    updateFavicon(logoUrl);
  }, [branding, logoUrl]);

  useEffect(() => {
    if (localOverride || settingsQ.data?.resolved.branding) return;
    let cancelled = false;
    void fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        if (cancelled || !raw) return;
        const fromApi = parseBrandingSettingsPayload(raw);
        if (isBrandingCustomized(fromApi)) {
          setLocalOverride(fromApi);
          writeBrandingBootCache(fromApi);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [localOverride, settingsQ.data?.resolved.branding]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      logoUrl,
      isCustomLogo: Boolean(branding.logoStoragePath),
      isCustomPrimary: branding.primaryColor != null,
      syncBranding,
      resetBrandingCache,
    }),
    [branding, logoUrl, syncBranding, resetBrandingCache],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    return {
      branding: { ...DEFAULT_CAB_BRANDING_SETTINGS },
      logoUrl: CAB_LOGO_PATH,
      isCustomLogo: false,
      isCustomPrimary: false,
      syncBranding: () => {},
      resetBrandingCache: () => {},
    };
  }
  return ctx;
}
