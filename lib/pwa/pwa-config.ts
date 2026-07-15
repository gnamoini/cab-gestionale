import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { THEME_CRITICAL_BG } from "@/lib/theme/cab-theme-storage";
import { resolvePwaPushClientEnabled } from "@/lib/pwa/push-enabled";

export const PWA_NAME = CAB_APP_PRODUCT_NAME;
export const PWA_SHORT_NAME = "C.A.B." as const;
export const PWA_DESCRIPTION =
  "Gestionale web per officina: magazzino ricambi, lavorazioni, ERP/CRM, report e documentale." as const;

export const PWA_LANG = "it" as const;
export const PWA_DIR = "ltr" as const;
export const PWA_START_URL = "/" as const;
export const PWA_SCOPE = "/" as const;
export const PWA_ID = "/" as const;
export const PWA_DISPLAY = "standalone" as const;
/** Chrome Android status/navigation bar — allineato a `--cab-bg-app`. */
export const PWA_THEME_COLOR = THEME_CRITICAL_BG.dark;
export const PWA_BACKGROUND_COLOR = THEME_CRITICAL_BG.dark;
/** Tile icone PWA — logo CAB su quadrato arrotondato scuro (non arancione pieno). */
export const PWA_ICON_TILE_COLOR = "#18181b" as const;
export const PWA_CATEGORIES = ["business", "productivity"] as const;
export const PWA_PREFER_RELATED_APPLICATIONS = false;

/**
 * Push Web PWA — `PWA_PUSH_ENABLED=true` oppure auto-on se `NEXT_PUBLIC_VAPID_PUBLIC_KEY` è in build.
 * Invio server richiede anche `VAPID_PRIVATE_KEY` (vedi docs/pwa-production-runbook.md).
 */
export const PWA_PUSH_ENABLED = resolvePwaPushClientEnabled();
