import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { CAB_BRAND_ORANGE } from "@/lib/theme/cab-brand-colors";
import { THEME_CRITICAL_BG } from "@/lib/theme/cab-theme-storage";

export const PWA_NAME = CAB_APP_PRODUCT_NAME;
export const PWA_SHORT_NAME = "CAB" as const;
export const PWA_DESCRIPTION =
  "Gestionale web per officina: magazzino ricambi, lavorazioni, ERP/CRM, report e documentale." as const;

export const PWA_LANG = "it" as const;
export const PWA_DIR = "ltr" as const;
export const PWA_START_URL = "/" as const;
export const PWA_SCOPE = "/" as const;
export const PWA_ID = "/" as const;
export const PWA_DISPLAY = "standalone" as const;
export const PWA_ORIENTATION = "any" as const;
export const PWA_THEME_COLOR = CAB_BRAND_ORANGE;
export const PWA_BACKGROUND_COLOR = THEME_CRITICAL_BG.dark;
/** Tile icone PWA — logo CAB su quadrato arrotondato scuro (non arancione pieno). */
export const PWA_ICON_TILE_COLOR = "#18181b" as const;
export const PWA_CATEGORIES = ["business", "productivity"] as const;
export const PWA_PREFER_RELATED_APPLICATIONS = false;

/** Feature flag push — default OFF; abilitare con `PWA_PUSH_ENABLED=true` su Vercel/Supabase. */
export const PWA_PUSH_ENABLED =
  process.env.PWA_PUSH_ENABLED?.trim().toLowerCase() === "true"
  || process.env.PWA_PUSH_ENABLED?.trim() === "1";
